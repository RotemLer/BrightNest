from DVCS.BoilerManager import BoilerManager
import UTILS.weatherAPIRequest as weather
from datetime import datetime
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def main():
    # אתחול הדוד
    boiler = BoilerManager(name="Smart Boiler", capacity_liters=50, has_solar=True)
    boiler.turn_on()
    print(f"✅ Boiler initialized: {boiler}")

    # שליפת תחזית + טבלת קלט לחיזוי
    forecast_df, X_input = weather.get_forecast_dataframe_for_model(
        lat=32.0853, lon=34.7818, hours_ahead=24
    )

    # לוח זמנים של מקלחות לדוגמה
    shower_schedule = {
        f"{hour:02d}:00": {
            "users": np.random.randint(1, 3),
            "shower_temp": np.random.choice([38.0, 40.0, 42.0])
        }
        for hour in range(6, 23, 2)
    }

    print("\n🧼 Shower Schedule:")
    for time_str, info in shower_schedule.items():
        print(f"  - {time_str}: {info['users']} user(s) at {info['shower_temp']}°C")

    # הדמיה של 24 שעות עם משוב דינמי
    df_results = boiler.simulate_hourly_feedback_loop(schedule=shower_schedule)

    if df_results is not None:
        csv_path = "simulated_boiler_day.csv"
        df_results.to_csv(csv_path, index=False)
        print(f"📁 Saved simulation results to {csv_path}")

        # ציור גרף
        times = pd.to_datetime(df_results["Time"])
        temps = df_results["PredictedTemp"]
        volumes = df_results["EffectiveVolume"]
        status = df_results["Status"]

        fig, ax1 = plt.subplots(figsize=(13, 6))
        ax1.set_xlabel("Time")
        ax1.set_ylabel("Temperature (°C)", color="tab:blue")
        ax1.plot(times, temps, label="Boiler Temp", color="tab:blue", marker='o')
        ax1.tick_params(axis='y', labelcolor="tab:blue")
        ax1.grid(True)

        ax2 = ax1.twinx()
        ax2.set_ylabel("Effective Volume (L)", color="tab:orange")
        ax2.plot(times, volumes, label="Effective Volume", color="tab:orange", linestyle="--", marker='x')
        ax2.tick_params(axis='y', labelcolor="tab:orange")

        for i, txt in enumerate(status):
            if "Shower OK" in txt:
                ax1.scatter(times[i], temps[i], color="green", label="Shower OK" if i == 0 else "", marker='^', s=100)
            elif "Not enough" in txt:
                ax1.scatter(times[i], temps[i], color="red", label="Not Enough Hot Water" if i == 0 else "", marker='v', s=100)

        fig.legend(loc="upper left", bbox_to_anchor=(0.1, 0.95))
        plt.title("Boiler Temperature and Usage Over Time")
        fig.tight_layout()
        plt.savefig("boiler_simulation_plot.png")
        plt.show()
        print("📊 Graph saved as boiler_simulation_plot.png")

    boiler.turn_off()
    print("🛑 Boiler turned off.")

def run_model_func(weather_df: pd.DataFrame, boiler) -> list[float]:
    """
    Converts weather_df to scaled input for LSTM model and predicts next N boiler temperatures.

    Args:
        weather_df (pd.DataFrame): includes at least 6 שעות של תחזית עם פיצ'רים
        boiler (BoilerManager): instance with model, scalers and config

    Returns:
        list[float]: forecasted boiler temperatures for each hour ahead
    """
    df = weather_df.copy()

    # === יצירת פיצ'רים עונתיים
    df["month"] = df["date"].dt.month
    df["dayofyear"] = df["date"].dt.dayofyear
    df["hour"] = df["date"].dt.hour

    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    df["day_sin"] = np.sin(2 * np.pi * df["dayofyear"] / 365)
    df["day_cos"] = np.cos(2 * np.pi * df["dayofyear"] / 365)
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

    # === הוספת עמודות חום קודמות כברירת מחדל (0)
    for col in boiler.expected_features:
        if col.startswith("prev_boiler_temp") and col not in df.columns:
            df[col] = boiler.get_temperature()

    # === השלמת עמודות חסרות
    for col in boiler.expected_features:
        if col not in df.columns:
            df[col] = 0.0

    # === שמירה לשימוש עתידי
    boiler.last_forecast_df = df.copy()

    # === הכנת רצפים בגודל 6
    seq_len = 6
    df = df.sort_values("date").reset_index(drop=True)
    if len(df) < seq_len:
        raise ValueError("Not enough data for LSTM sequence")

    input_seq = df[boiler.expected_features].astype(np.float32).iloc[:seq_len]
    X = np.expand_dims(boiler.scaler_x.transform(input_seq), axis=0)

    y_pred_scaled = boiler.model.predict(X, verbose=0)
    y_pred = boiler.scaler_y.inverse_transform(y_pred_scaled)[0]

    # החזרת תחזית לפי סוג הדוד
    key = f"boiler temp for {boiler.capacity_liters} L {'with' if boiler.has_solar else 'without'} solar system"
    idx = boiler.target_columns.index(key)
    return [y_pred[idx]] * 24  # נחזיר תחזית קבועה ל־24 שעות קדימה לצורך פשטות

if __name__ == "__main__":
    main()
