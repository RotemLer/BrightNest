from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from datetime import datetime
import pandas as pd
import sys
import os
import json
import time
import threading
import requests
from flask_jwt_extended import JWTManager, create_access_token
from Backend.userRoutes import userApi, users_collection, token_required
from DVCS.Boiler import BoilerManager
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from UTILS.weatherAPIRequest import get_forecast_dataframe_for_model
from flask_jwt_extended import jwt_required
from Backend.userRoutes import db, users_collection
from flask import g
from Backend.dailyStatsLogger import save_daily_summary



from UTILS.emailSender import send_alert_to_logged_in_user
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
     supports_credentials=True,
     origins=["http://localhost:3000"],
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
boiler = BoilerManager(name="UserBoiler", capacity_liters=100, has_solar=True)

# === Cache for Weather Forecast ===
cached_forecast = None
cached_location = None
last_fetch_time = None


from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity

@app.before_request
def load_user_into_g():
    try:
        verify_jwt_in_request(optional=True)  # ✅ FIX: wrap with this!
        identity = get_jwt_identity()
        if identity:
            g.user = {"_id": identity}
    except Exception as e:
        # Optional: log or silently ignore to avoid crashing CORS preflight/etc.
        g.user = None


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
        cached_location = (latitude, longitude)
        last_fetch_time = now

        return jsonify({
            "location": {"latitude": latitude, "longitude": longitude, "requested_at": now.isoformat() + "Z", "cached": False},
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
    return jsonify({"status": "on" if boiler.status else "off"}), 200

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
    data = request.get_json()
    used_liters = float(data.get("used_liters", 40))
    cold_temp = float(data.get("cold_temp", 22))
    new_temp = boiler.cool(current_temp=boiler.get_temperature(), used_liters=used_liters, cold_water_temp=cold_temp)
    return jsonify({"new_temperature": new_temp}), 200


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
        requests.post("http://127.0.0.1:5000/boiler/schedule")
    except Exception as e:
        print("⚠️ Failed to trigger boiler schedule on login:", e)

    return jsonify({"message": "התחברת בהצלחה", "token": access_token})


@app.route("/boiler/schedule", methods=["POST"])
@jwt_required()
def receive_schedule_and_respond():
    try:
        data = request.get_json()
        schedule_data = data.get("schedule", [])
        capacity = int(data.get("boilerSize", 100))
        has_solar = bool(data.get("hasSolar", True))
        schedule = {
            datetime.fromisoformat(item["datetime"]): {
                "shower_temp": float(item.get("preferredTemp", 38.0)),
                "users": 1,
                "name": item.get("name", "משתמש")
            }
            for item in schedule_data
        }

        boiler = BoilerManager(name="UserBoiler", capacity_liters=capacity, has_solar=has_solar)
        df = boiler.simulate_day_usage_with_custom_temps(schedule, export_csv=False)
        df["Time"] = df["Time"].astype(str)
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


@app.route("/trigger-email", methods=["POST"])
def trigger_email():
    data = request.get_json()

    user_email = data.get("email")
    subject = data.get("subject")
    message = data.get("message")
    name = data.get("name")  # 🔁 NEW

    if not user_email or not subject or not message:
        return jsonify({"error": "Missing required fields"}), 400

    print(f"📤 Triggering email to: {user_email}")
    send_alert_to_logged_in_user(subject=subject, message=message, name=name)  # ✅ Pass name

    return jsonify({"message": "Email sent (via internal request)"}), 200


@app.route('/boiler/stats/save-daily', methods=['GET'])
@jwt_required()
def save_today_summary():
    user_id = get_jwt_identity()  # ✅ now working
    save_daily_summary(user_id, db, users_collection)
    return jsonify({"message": f"Daily summary saved for {user_id}"}), 200




def run_nightly_schedule():
    def job():
        while True:
            now = datetime.now()
            if now.hour == 0 and now.minute == 0:
                try:
                    requests.post("http://127.0.0.1:5000/boiler/schedule")
                except Exception as e:
                    print("❌ Midnight job failed:", e)
            time.sleep(60)
    threading.Thread(target=job, daemon=True).start()


if __name__ == "__main__":
    run_nightly_schedule()
    app.run(debug=True, port=5000)


