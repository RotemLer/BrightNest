from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime
import pandas as pd
import sys
import os
import json
import time
import threading
import requests

from Backend.userRoutes import userApi, users_collection  # ← החזרת גם את userApi המלא
from DVCS.Boiler import BoilerManager

sys.path.append(os.path.abspath(os.path.dirname(__file__)))  #MUST! DO NOT REMOVE! FOR SERVER USE
from UTILS.weatherAPIRequest import get_forecast_dataframe_for_model

from pymongo import MongoClient
from bson.objectid import ObjectId
import jwt
import datetime as dt


import jwt
from flask import request

def get_user_id_from_token(request):
    token = request.headers.get('Authorization', '').replace("Bearer ", "")
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        return payload.get("user_id")
    except:
        return None




# === Flask App Initialization ===
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_super_secret_key_here'

CORS(app,
     supports_credentials=True,
     origins=["http://localhost:3000"],
     methods=["GET", "POST", "PUT", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"]
)

app.register_blueprint(userApi)  # ← החזרת ה-Blueprint של היוזרים

# === Caching for OpenMeteo ===
cached_forecast = None
cached_location = None
last_fetch_time = None


boiler = None


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

        if (cached_forecast is not None and
                cached_location == (latitude, longitude) and
                last_fetch_time is not None and
                now.date() == last_fetch_time.date()):
            return jsonify({
                "location": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "requested_at": now.isoformat() + "Z",
                    "cached": True
                },
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
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "requested_at": now.isoformat() + "Z",
                "cached": False
            },
            "forecast": forecast_data
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# === Boiler Schedule Endpoint ===
@app.route("/boiler/schedule", methods=["POST"])
def receive_schedule_and_respond():
    global boiler
    user_id = get_user_id_from_token(request)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        data = request.get_json()
        schedule_data = data.get("schedule", [])
        capacity = int(data.get("boilerSize", 100))
        has_solar = bool(data.get("hasSolar", True))

        schedule = {}
        for item in schedule_data:
            dt = datetime.fromisoformat(item["datetime"])
            schedule[dt] = {
                "shower_temp": float(item.get("preferredTemp", 38.0)),
                "users": 1
            }

        boiler = BoilerManager(name=f"Boiler_{user_id}", capacity_liters=capacity, has_solar=has_solar)
        df = boiler.simulate_day_usage_with_custom_temps(schedule, export_csv=False)
        df["Time"] = df["Time"].astype(str)

        # שומר קובץ נפרד לפי מזהה המשתמש
        with open(f"recommendations_{user_id}.json", "w") as f:
            json.dump(df.to_dict(orient="records"), f)

        return jsonify(df.to_dict(orient="records"))
    except Exception as e:
        print("❌ Error:", e)
        return jsonify({"error": str(e)}), 500


# === Boiler Recommendations Endpoint ===
@app.route("/boiler/recommendations", methods=["GET"])
def get_latest_recommendations():
    user_id = get_user_id_from_token(request)
    if not user_id:
        return jsonify({"error": "Unauthorized"}), 401

    path = f"recommendations_{user_id}.json"
    if os.path.exists(path):
        with open(path, "r") as f:
            data = json.load(f)
        return jsonify(data)
    else:
        return jsonify([])


# === Login Simulation Endpoint ===
@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("username")
    password = data.get("password")

    user = users_collection.find_one({"email": email, "password": password})
    if not user:
        return jsonify({"error": "פרטי התחברות שגויים"}), 401

    payload = {
        "user_id": str(user["_id"]),
        "exp": dt.datetime.utcnow() + dt.timedelta(days=1)
    }
    token = jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")

    try:
        print("🔁 Triggering schedule calculation on login")
        requests.post("http://127.0.0.1:5000/boiler/schedule")
    except Exception as e:
        print("⚠️ Failed to trigger boiler schedule on login:", e)

    return jsonify({"message": "התחברת בהצלחה", "token": token})


@app.route('/boiler/heat', methods=['POST'])
def trigger_boiler_heating():
    global boiler
    if boiler is None:
        return jsonify({"error": "Boiler not initialized yet"}), 400

    data = request.get_json()
    duration = float(data.get("duration_minutes"))
    start_temp = float(data.get("start_temperature"))

    print(f"🔥 הדוד מופעל ל-{duration} דקות, מטמפ' התחלתית {start_temp}°C")
    result = boiler.heat(duration, start_temp)

    return jsonify({"status": "started", "final_temp": result})


# === Background Job: Daily Forecast at Midnight ===
def run_nightly_schedule():
    def job():
        while True:
            now = datetime.now()
            if now.hour == 0 and now.minute == 0:
                try:
                    print("\U0001f319 Midnight run: calculating recommendations")
                    response = requests.post("http://127.0.0.1:5000/boiler/schedule")
                    print("\u2705 Response:", response.status_code)
                except Exception as e:
                    print("\u274c Midnight job failed:", e)
            time.sleep(12000)

    thread = threading.Thread(target=job, daemon=True)
    thread.start()

# === Start Everything ===
if __name__ == "__main__":
    run_nightly_schedule()
    app.run(debug=True, port=5000)