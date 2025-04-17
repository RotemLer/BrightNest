from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import pandas as pd
import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from UTILS.weatherAPIRequest import get_forecast_dataframe_for_model

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return "Welcome to the Open-Meteo Forecast API!"

@app.route("/openmeteo/<lat>/<lon>")
def get_forecast(lat, lon):
    try:
        latitude = float(lat)
        longitude = float(lon)

        # Load full 96-hour forecast
        forecast_df, X_input = get_forecast_dataframe_for_model(latitude, longitude, hours_ahead=96)
        full_df = pd.concat([forecast_df, X_input], axis=1)
        full_df["date"] = pd.to_datetime(full_df["date"])

        # === Get the first row (first forecast hour available)
        first_row = full_df.head(1)

        # === Get 13:00 rows for next 3 days
        rows_13pm = []
        base_time = full_df["date"].min()  # Use forecast time as reference

        for i in range(1, 4):
            target = (base_time + timedelta(days=i)).replace(hour=13, minute=0, second=0, microsecond=0)
            match = full_df[
                (full_df["date"].dt.date == target.date()) &
                (full_df["date"].dt.hour == 13)
            ]
            if not match.empty:
                rows_13pm.append(match)

        # Combine rows
        selected_rows = [first_row] + rows_13pm
        result_df = pd.concat(selected_rows).reset_index(drop=True)

        # === Convert to JSON-safe output
        forecast_data = result_df.fillna(0).to_dict(orient="records")

        return jsonify({
            "location": {
                "latitude": latitude,
                "longitude": longitude,
                "requested_at": datetime.utcnow().isoformat() + "Z"
            },
            "forecast": forecast_data
        })

    except Exception as e:
        print("❌ Backend Error:", e)
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
