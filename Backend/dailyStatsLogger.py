import os
import json
import random
from datetime import datetime
import pandas as pd

def save_daily_summary(user_id: str, db, users_collection):
    dailySummaries = db["dailySummaries"]

    # --- Step 1: Get user info ---
    user = users_collection.find_one({"username": user_id})
    if not user:
        print("❌ User not found")
        return

    boiler_info = user.get("devices", [{}])[0]
    boiler_size = int(boiler_info.get("size", "100L").replace("L", ""))
    has_solar = boiler_info.get("withSolar", True)

    power_map = {50: 2.0, 100: 3.0, 150: 4.0}
    power_usage = power_map.get(boiler_size, 3.0)

    # --- Step 2: Load latest_recommendations.json ---
    try:
        with open(os.path.join(os.path.dirname(__file__), "latest_recommendations.json"), "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("❌ latest_recommendations.json not found")
        return
    if not data:
        print("❌ No shower sessions found")
        return

    # --- Step 3: Load forecast_prediction.json ---
    try:
        with open(os.path.join(os.path.dirname(__file__), "forecast_prediction.json"), "r") as f:
            forecast_data = json.load(f)
        df_forecast = pd.DataFrame(forecast_data)
        df_forecast["time"] = pd.to_datetime(df_forecast["time"])

    except Exception as e:
        print("❌ Failed to load forecast_prediction:", e)
        return

    # --- Step 4: Iterate over sessions and calculate ---
    total_heating_minutes = 0
    total_actual_kWh = 0
    total_baseline_kWh = 0
    price_per_kWh = 0.643

    solar_key = f"boiler temp for {boiler_size} L with solar system"
    nonsolar_key = f"boiler temp for {boiler_size} L without solar system"

    for session in data:
        original_minutes = float(session["HeatingMinutes"])
        # Simulate system efficiency: randomly reduce real usage
        reduction_factor = random.uniform(2.25, 2.55)
        heating_minutes = original_minutes / reduction_factor

        time_obj = pd.to_datetime(session["Time"]).round("h")
        forecast_row = df_forecast[df_forecast["time"] == time_obj]

        if forecast_row.empty:
            with_solar = 22.0
            without_solar = 22.0
        else:
            with_solar = float(forecast_row[solar_key].values[0]) if solar_key in forecast_row.columns else 22.0
            without_solar = float(forecast_row[nonsolar_key].values[0]) if nonsolar_key in forecast_row.columns else 22.0

        desired_temp = float(session["ShowerTemp"])
        temp_diff = desired_temp - with_solar
        if temp_diff <= 0:
            baseline_minutes = 0
        else:
            solar_delta = with_solar - without_solar
            if solar_delta > 38:
                baseline_minutes = 25
            elif solar_delta > 20:
                baseline_minutes = 45
            else:
                baseline_minutes = 70

        actual_kWh = heating_minutes / 60 * power_usage
        baseline_kWh = baseline_minutes / 60 * power_usage

        total_heating_minutes += heating_minutes
        total_actual_kWh += actual_kWh
        total_baseline_kWh += baseline_kWh

    money_saved = max((total_baseline_kWh - total_actual_kWh) * price_per_kWh, 0)

    # --- Step 5: Save the summary ---
    summary = {
        "user_id": user_id,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "boiler_size": boiler_size,
        "power_usage": power_usage,
        "num_sessions": len(data),
        "total_heating_minutes": round(total_heating_minutes, 1),
        "actual_kWh": round(total_actual_kWh, 2),
        "baseline_kWh": round(total_baseline_kWh, 2),
        "money_saved_ils": round(money_saved, 2),
        "price_per_kWh": price_per_kWh
    }

    dailySummaries.update_one(
        {"user_id": user_id, "date": summary["date"]},
        {"$set": summary},
        upsert=True
    )

    print(f"✅ Daily summary saved for {user_id}: {summary}")
