from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime
import pandas as pd
import sys
import os
from UTILS.weatherAPIRequest import get_forecast_dataframe_for_model
from Backend.userRoutes import userApi


# Setup paths
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_super_secret_key_here'
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

app.register_blueprint(userApi)


# === Caching global variables
cached_forecast = None
cached_location = None
last_fetch_time = None

@app.route("/")
def home():
    return "Welcome to the Open-Meteo Forecast API!"

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    print("💥 UNCAUGHT ERROR:", str(e))
    print(traceback.format_exc())
    return jsonify(error=str(e)), 500

@app.route("/openmeteo/<lat>/<lon>")
def get_forecast(lat, lon):
    print("📥 get_forecast endpoint called")
    global cached_forecast, cached_location, last_fetch_time

    try:
        latitude = float(lat)
        longitude = float(lon)
        now = datetime.utcnow()

        if (cached_forecast is not None and
            cached_location == (latitude, longitude) and
            last_fetch_time is not None and
             now.date() == last_fetch_time.date()):
            print("✅ Using cached forecast.")
            return jsonify({
                "location": {
                    "latitude": latitude,
                    "longitude": longitude,
                    "requested_at": now.isoformat() + "Z",
                    "cached": True
                },
                "forecast": cached_forecast or []  # <-- THIS SMALL CHANGE
            })

        forecast_df, X_input = get_forecast_dataframe_for_model(latitude, longitude, hours_ahead=96)
        full_df = pd.concat([forecast_df, X_input], axis=1)
        full_df["date"] = pd.to_datetime(full_df["date"])
        result_df = full_df.reset_index(drop=True)
        result_df["date"] = result_df["date"].astype(str)
        forecast_data = result_df.fillna(0).to_dict(orient="records")
        print("🛠 Forecast data sample:", forecast_data[:1])

        cached_forecast = forecast_data
        cached_location = (latitude, longitude)
        last_fetch_time = now

        print("🌐 Fetched new forecast.")

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
        print("❌ Backend Error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
