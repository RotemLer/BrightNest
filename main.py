from DVCS.BoilerManager import BoilerManager
import UTILS.weatherAPIRequest as weather
from datetime import datetime
import matplotlib.pyplot as plt
import pandas as pd

def main():
    # אתחול הדוד
    boiler = BoilerManager(name="Smart Boiler", capacity_liters=50, has_solar=True)
    boiler.turn_on()
    print("✅ Boiler initialized")

    # שליפת תחזית מזג אוויר
    forecast_df, _ = weather.get_forecast_dataframe_for_model(
        lat=32.0853, lon=34.7818, hours_ahead=24
    )

    # חיזוי טמפרטורת הדוד ל־6 שעות קדימה
    predicted_temps = boiler.forecast_6h(forecast_df)

    # הדפסת תחזית
    now = datetime.now()
    for i, temp in enumerate(predicted_temps):
        hour = (now + pd.Timedelta(hours=i + 1)).strftime('%H:%M')
        print(f"🕒 {hour} → 🌡️ {temp:.2f}°C")

    # ציור גרף
    times = [now + pd.Timedelta(hours=i + 1) for i in range(len(predicted_temps))]
    plt.figure(figsize=(10, 5))
    plt.plot(times, predicted_temps, marker='o', label="Forecasted Boiler Temp")
    plt.xlabel("Time")
    plt.ylabel("Temperature (°C)")
    plt.title("6-Hour Boiler Temperature Forecast")
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.savefig("6h_forecast_plot.png")
    plt.show()
    print("📊 Forecast plot saved as 6h_forecast_plot.png")

    boiler.turn_off()
    print("🛑 Boiler turned off.")

if __name__ == "__main__":
    main()
