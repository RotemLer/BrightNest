from contextlib import nullcontext
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import pandas as pd
import sys
import os
import time
import threading
import requests
from flask_jwt_extended import JWTManager, create_access_token
from torch.profiler import schedule

from Backend.userRoutes import userApi, users_collection

from flask_jwt_extended import JWTManager, create_access_token,jwt_required
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from DVCS.Boiler import BoilerManager

from UTILS.weatherAPIRequest import get_forecast_dataframe_for_model
if os.environ.get("RENDER") == "true":
    BACKEND_URL = "https://brightnest.onrender.com"
else:
    BACKEND_URL = "http://127.0.0.1:5000"

# === Flask App Initialization ===
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_super_secret_key_here'

# ✅ JWT CONFIGURATION
app.config["JWT_SECRET_KEY"] = "your_super_secret_key_here"
jwt = JWTManager(app)
app.config["JWT_SECRET_KEY"] = app.config["SECRET_KEY"]
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_HEADER_NAME"] = "Authorization"
app.config["JWT_HEADER_TYPE"] = "Bearer"
jwt = JWTManager(app)

# ✅ CORS CONFIGURATION
CORS(app,
     resources={r"/*": {"origins": [
         "http://localhost:3000",
         "https://brightnest-ui.onrender.com",
         "https://brightnest.onrender.com"
     ]}},
     supports_credentials=True,
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET", "POST", "PUT", "OPTIONS", "DELETE"])
# ✅ Handle OPTIONS (preflight)
@app.before_request
def handle_options():
    if request.method == 'OPTIONS':
        return '', 200

# === Register Blueprints ===
app.register_blueprint(userApi)

# === Global Boiler Instance ===
boiler = BoilerManager(name="general", capacity_liters=100, has_solar=True)

# === Cache for Weather Forecast ===
cached_forecast = None
cached_location = None
last_fetch_time = None

static_lat=0.0
static_lon=0.0

static_new_temp = None
static_inject_until = None

@app.route("/")
def home():
    return "Welcome to the Open-Meteo Forecast API!"

@app.route("/openmeteo/<lat>/<lon>")
def get_forecast(lat, lon):
    global cached_forecast, cached_location, last_fetch_time
    try:
        latitude = float(lat)
        longitude = float(lon)
        now = datetime.utcnow()

        static_lat = latitude
        static_lon = longitude

        if (cached_forecast and cached_location == (latitude, longitude) and
            last_fetch_time and now.date() == last_fetch_time.date()):
            return jsonify({
                "location": {"latitude": latitude, "longitude": longitude, "requested_at": now.isoformat() + "Z", "cached": True},
                "forecast": cached_forecast
            })


        forecast_df, X_input = get_forecast_dataframe_for_model(latitude, longitude, hours_ahead=96)
        full_df = pd.concat([forecast_df, X_input], axis=1)
        full_df["date"] = pd.to_datetime(full_df["date"]).astype(str)
        forecast_data = full_df.reset_index(drop=True).fillna(0).to_dict(orient="records")

        cached_forecast = forecast_data
        cached_location = (static_lat, static_lon)
        last_fetch_time = now

        return jsonify({
            "location": {"latitude":static_lat, "longitude":static_lon, "requested_at": now.isoformat() + "Z", "cached": False},
            "forecast": forecast_data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/boiler/status", methods=["POST"])
@jwt_required()
def update_boiler_status():
    global boiler
    try:
        data = request.get_json() or {}
        new_status = data.get("status")
        if new_status not in ["on", "off"]:
            return jsonify({"error": "Invalid status value"}), 400
        boiler.status = (new_status == "on")
        print("boiler status: ", boiler.status)
        return jsonify({"status": "on" if boiler.status else "off"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/boiler/status", methods=["GET"])
@jwt_required()
def get_boiler_status():
    return jsonify({
        "status": "on" if boiler.status else "off",
        "temperature": boiler.get_temperature()  # ✅ מחזיר מהסקיילר אם יש
    }), 200

@app.route("/boiler/temperature", methods=["GET"])
@jwt_required()
def get_boiler_temperature():
    return jsonify({"temperature": boiler.get_temperature()}), 200

@app.route("/boiler/heat", methods=["POST"])
@jwt_required()
def heat_boiler():
    data = request.get_json()
    duration = float(data.get("duration", 30))
    start_temp = float(data.get("start_temp", boiler.get_temperature()))
    if not boiler.status:
        return jsonify({"error": "Boiler is off"}), 400
    final_temp = boiler.heat(duration_minutes=duration, start_temperature=start_temp)
    return jsonify({"new_temperature": final_temp}), 200

@app.route("/boiler/cool", methods=["POST"])
@jwt_required()
def cool_boiler():
    global static_new_temp, static_inject_until
    user = get_jwt_identity()
    data = request.get_json()

    used_liters = data.get("used_liters", 40.0)
    cold_temp = data.get("cold_temp", 22.0)
    schedule_data = data.get("schedule", {})

    # ✅ ממירים את המפתחות של schedule לתאריכים
    try:
        schedule = {
            datetime.fromisoformat(k): v for k, v in schedule_data.items()
        }
    except Exception as e:
        return jsonify({"error": f"Invalid schedule format: {e}"}), 400

    # ✅ ודא שקיימות קואורדינטות
    lat = data.get("lat")
    lon = data.get("lon")

    if lat is None or lon is None:
        return jsonify({"error": "Missing lat/lon coordinates"}), 400

    # ✅ טמפרטורה נוכחית מהדוד (אם לא קיימת – ברירת מחדל)
    current_temp = boiler.get_temperature() or 25.0
    print(f"cool route - current temp:  {current_temp}")


    # 🧊 קירור הדוד ועדכון
    static_new_temp, static_inject_until = boiler.cool(
        schedule = schedule_data,
        current_temp=current_temp,
        used_liters=used_liters,
        cold_water_temp=cold_temp,
        lat=lat,
        lon=lon
    )

    print(f"cool route - static_inject_until:  {static_inject_until}")
    print(f"cool route - static_new_temp:  {static_new_temp}")

    boiler.last_inject_until = static_inject_until
    boiler.last_static_temp = static_new_temp
    # 🔁 הרצת סימולציית תחזית עם הטמפ׳ החדשה (משולב inject)
    boiler.simulate_day_usage_with_custom_temps(
        schedule=schedule,
        lat=lat,
        lon=lon,
        cold_temp=cold_temp,
        liters_per_shower=used_liters,
        export_csv=True,
    )

    return jsonify({
        "message": "Boiler cooled and simulation continued",
        "new_temperature": static_new_temp
    })




@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("username")
    password = data.get("password")

    user = users_collection.find_one({"email": email, "password": password})
    if not user:
        return jsonify({"error": "פרטי התחברות שגויים"}), 401

    access_token = create_access_token(identity=str(user["_id"]))

    try:
        print("🔁 Triggering schedule calculation on login")
        requests.post(f"{BACKEND_URL}/boiler/schedule")
    except Exception as e:
        print("⚠️ Failed to trigger boiler schedule on login:", e)

    return jsonify({"message": "התחברת בהצלחה", "token": access_token})

@app.route("/boiler/schedule", methods=["POST"])
def receive_schedule_and_respond():
    try:
        data = request.get_json()
        lat = float(data.get("lat", 31.25))  # ברירת מחדל = באר שבע
        lon = float(data.get("lon", 34.79))  # ברירת מחדל = באר שבע
        print(f"📍 קיבלתי מיקום מהמשתמש: lat={lat}, lon={lon}")
        schedule_data = data.get("schedule", {})
        capacity = int(data.get("boilerSize", 100))
        has_solar = bool(data.get("hasSolar", True))
        schedule = {
            datetime.fromisoformat(item["datetime"]): {
                "shower_temp": float(item.get("preferredTemp", 38.0)),
                "users": 1
            } for item in schedule_data
        }
        print(f"📍schedule_data {schedule_data}")

        if boiler.name == "general":
            boiler.name = "UserBoiler"
            boiler.capacity_liters = capacity
            boiler.has_solar = has_solar
        print(f"inject temp in schedule {static_new_temp}")
        print(f"inject until in schedule {static_inject_until}")
        boiler.last_inject_until = static_inject_until
        boiler.last_static_temp = static_new_temp
        df = boiler.simulate_day_usage_with_custom_temps(schedule=schedule, lat=lat, lon=lon, export_csv=False)
        print("after simulate")

        ##
        boiler.temperature = boiler.load_forecasted_temp_from_prediction_file(
            capacity_liters=boiler.capacity_liters,
            has_solar=boiler.has_solar
        )
        print(f"📦 התחזית העדכנית לדוד: {boiler.temperature}°C")

        ##

        df["Time"] = df["Time"].astype(str)
        print("g")
        with open("latest_recommendations.json", "w") as f:
            json.dump(df.to_dict(orient="records"), f)
        return jsonify(df.to_dict(orient="records"))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/boiler/recommendations", methods=["GET"])
def get_latest_recommendations():
    try:
        if os.path.exists("latest_recommendations.json"):
            with open("latest_recommendations.json", "r") as f:
                data = json.load(f)
            return jsonify(data)
        return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/boiler/forecast", methods=["GET"])
def get_forecast_prediction():
    try:
        path = os.path.join(os.getcwd(), "forecast_prediction.json")
        if os.path.exists(path):
            with open(path, "r") as f:
                return jsonify(json.load(f))
        return jsonify([])

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def run_nightly_schedule():
    def job():
        while True:
            now = datetime.now()
            if now.hour == 0 and now.minute == 0:
                try:
                    requests.post(f"{BACKEND_URL}/boiler/schedule")
                except Exception as e:
                    print("❌ Midnight job failed:", e)
            time.sleep(60)
    threading.Thread(target=job, daemon=True).start()

if __name__ == "__main__":
    run_nightly_schedule()
    app.run(debug=True, port=5000)