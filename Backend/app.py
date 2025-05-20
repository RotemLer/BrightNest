from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime
from Backend.userRoutes import userApi
import pandas as pd
import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from UTILS.weatherAPIRequest import get_forecast_dataframe_for_model

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your_super_secret_key_here'


CORS(app,
     supports_credentials=True,
     origins=["http://localhost:3000"],
     methods=["GET", "POST", "PUT", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"]
)

app.register_blueprint(userApi)

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

if __name__ == "__main__":
    app.run(debug=True, port=5000)