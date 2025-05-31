from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
from datetime import datetime
import pandas as pd
import sys
import os
import json
import time
import threading
import requests

from Backend.userRoutes import userApi, users_collection
from DVCS.Boiler import BoilerManager
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from UTILS.weatherAPIRequest import get_forecast_dataframe_for_model
from flask_jwt_extended import jwt_required, get_jwt_identity

from pymongo import MongoClient
from bson.objectid import ObjectId
import jwt
import datetime as dt

# === Flask App Initialization ===
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_super_secret_key_here'

CORS(app,
     supports_credentials=True,
     origins=["http://localhost:3000"],
     methods=["GET", "POST", "PUT", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"]
)

app.register_blueprint(userApi)

# === הגדרת דוד גלובלית ===
boiler = BoilerManager(name="UserBoiler", capacity_liters=100, has_solar=True)

# === Caching for OpenMeteo ===
cached_forecast = None
cached_location = None
last_fetch_time = None

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

@app.route("/boiler/schedule", methods=["POST"])
def receive_schedule_and_respond():
    try:
        data = request.get_json()
        schedule_data = data.get("schedule", [])
        capacity = int(data.get("boilerSize", 100))
        has_solar = bool(data.get("hasSolar", True))

        print("📥 קיבלתי בקשה לחישוב:")
        print(json.dumps(data, indent=2, ensure_ascii=False))

        schedule = {}
        for item in schedule_data:
            dt = datetime.fromisoformat(item["datetime"])
            schedule[dt] = {
                "shower_temp": float(item.get("preferredTemp", 38.0)),
                "users": 1
            }

        boiler = BoilerManager(name="UserBoiler", capacity_liters=capacity, has_solar=has_solar)
        df = boiler.simulate_day_usage_with_custom_temps(schedule, export_csv=False)
        df["Time"] = df["Time"].astype(str)

        with open("latest_recommendations.json", "w") as f:
            json.dump(df.to_dict(orient="records"), f)

        return jsonify(df.to_dict(orient="records"))
    except Exception as e:
        print(f"❌ Error:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/boiler/recommendations", methods=["GET"])
def get_latest_recommendations():
    try:
        if os.path.exists("latest_recommendations.json"):
            with open("latest_recommendations.json", "r") as f:
                data = json.load(f)
            return jsonify(data)
        else:
            return jsonify([])
    except Exception as e:
        print(f"❌ Error reading recommendations:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/boiler/forecast", methods=["GET"])
def get_forecast_prediction():
    try:
        forecast_path = os.path.join(os.getcwd(), "forecast_prediction.json")
        if os.path.exists(forecast_path):
            with open(forecast_path, "r") as f:
                data = json.load(f)
            return jsonify(data)
        else:
            return jsonify([])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route("/boiler/status", methods=["POST", "OPTIONS"])
@cross_origin(origin='http://localhost:3000', supports_credentials=True)
@jwt_required()
def update_boiler_status():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    data = request.get_json() or {}
    new_status = data.get("status")

    if new_status not in ["on", "off"]:
        return jsonify({"error": "Invalid status value"}), 400

    # עדכון סטטוס הדוד
    boiler.status = True if new_status == "on" else False

    print(f"📥 סטטוס הדוד עודכן ל: {boiler.status}")

    return jsonify({
        "status": "on" if boiler.status else "off"
    }),200

@app.route("/boiler/toggle", methods=["POST"])
@cross_origin(origin='http://localhost:3000', supports_credentials=True)
@jwt_required()
def toggle_boiler():
    try:
        data = request.get_json()
        turn_on = data.get("turn_on", False)

        boiler.status = turn_on
        print(f"✅ Boiler turned {'ON' if turn_on else 'OFF'} by user request.")

        return jsonify({
            "message": "Boiler status updated.",
            "status": "on" if boiler.status else "off"
        }), 200
    except Exception as e:
        print(f"❌ Error toggling boiler:", e)
        return jsonify({"error": "Server error while toggling boiler."}), 500

def run_nightly_schedule():
    def job():
        while True:
            now = datetime.now()
            if now.hour == 0 and now.minute == 0:
                try:
                    print("🌙 Midnight run: calculating recommendations")
                    response = requests.post("http://127.0.0.1:5000/boiler/schedule")
                    print("✅ Response:", response.status_code)
                except Exception as e:
                    print("❌ Midnight job failed:", e)
            time.sleep(60)

    thread = threading.Thread(target=job, daemon=True)
    thread.start()

if __name__ == "__main__":
    run_nightly_schedule()
    app.run(debug=True, port=5000)
