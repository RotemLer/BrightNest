# ==== Imports ====
import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta
import os
import matplotlib.pyplot as plt
import UTILS.weatherAPIRequest as weather
from DVCS.Device import Device

# ==== Boiler Initialization ====
class Boiler(Device):
    def __init__(self, name: str, capacity_liters: int, power_usage: float = None, has_solar: bool = True):
        if power_usage is None:
            power_map = {50: 2.0, 100: 3.0, 150: 4.0}
            power_usage = power_map.get(capacity_liters, 3.0)

        super().__init__(name, power_usage)
        self.capacity_liters = capacity_liters
        self.has_solar = has_solar
        self.temperature = 25
        self.last_forecast_df = None

        self.model = load_model("boiler_temperature_multitarget_lstm6h.h5", compile=False)
        self.scaler_x = joblib.load("scaler_x.save")
        self.scaler_y = joblib.load("scaler_y.save")
        self.expected_features = list(self.scaler_x.feature_names_in_)

        self.target_columns = [
            "boiler temp for 50 L with solar system",
            "boiler temp for 50 L without solar system",
            "boiler temp for 100 L with solar system",
            "boiler temp for 100 L without solar system",
            "boiler temp for 150 L with solar system",
            "boiler temp for 150 L without solar system"
        ]

    def heat(self, duration_minutes: float, efficiency: float = 0.9):
        """
        Heat the boiler water for a specified time based on physical principles.

        Q = P × t × η
        ΔT = Q / (m × c)

        Where:
            - P: Power in kW
            - t: time in minutes
            - η: efficiency (default 90%)
            - m: mass of water (kg)
            - c: specific heat capacity of water (4.186 kJ/kg°C)
        """
        if not self.status:
            print(f"{self.name} is OFF. Can't heat.")
            return

        mass_kg = self.capacity_liters  # 1L = 1kg for water
        c = 4.186  # kJ/kg°C
        power_kj_per_min = self.power_usage * 1000 / 60  # convert kW to kJ/min
        Q = power_kj_per_min * duration_minutes * efficiency
        delta_T = Q / (mass_kg * c)

        self.temperature += delta_T
        print(
            f"{self.name} heated for {duration_minutes:.1f} min → ΔT = {delta_T:.2f}°C → New temp = {self.temperature:.1f}°C")

    def get_temperature(self):
        return self.temperature

    def _str_(self):
        solar = "with solar" if self.has_solar else "without solar"
        return f"Boiler '{self.name}' ({self.capacity_liters}L, {solar}) - {self.get_status()}, {self.temperature:.1f}°C"

    def predict_temp_at(self, time: pd.Timestamp):
        if self.last_forecast_df is None:
            self.CalcHeatingTime()

        df = self.last_forecast_df.copy()
        df["time"] = pd.to_datetime(df["time"]).dt.tz_localize(None)
        key = f"boiler temp for {self.capacity_liters} L {'with' if self.has_solar else 'without'} solar system"

        closest_row = df.iloc[(df["time"] - time).abs().argsort()[:1]]
        return float(closest_row[key].iloc[0])
    def monitor_real_time_usage(self, schedule: dict, cold_temp=20.0, liters_per_shower=40.0, interval_sec=60):
        from time import sleep
        print("\n🚿 Starting real-time boiler control loop...")
        effective_volume = self.capacity_liters * (0.7 if self.has_solar else 1.0)
        self.last_known_temp = self.get_temperature()

        processed_schedule = {}
        for time_str, details in schedule.items():
            full_time = datetime.now().replace(hour=int(time_str.split(":")[0]), minute=int(time_str.split(":")[1]), second=0, microsecond=0)
            processed_schedule[full_time] = {
                "users": details.get("users", 1),
                "shower_temp": details.get("shower_temp", 40.0),
                "finished": False
            }

        while True:
            now = datetime.now().replace(second=0, microsecond=0)
            if self.last_forecast_df is None or now > self.last_forecast_df["time"].max():
                self.CalcHeatingTime()

            for t, info in processed_schedule.items():
                if not info["finished"] and now >= t:
                    desired_temp = info["shower_temp"]
                    num_users = info["users"]
                    needed_liters = num_users * liters_per_shower * 1.1
                    forecast_temp = self.predict_temp_at(t)
                    usable_liters = effective_volume * (forecast_temp - cold_temp) / (desired_temp - cold_temp)

                    if usable_liters >= needed_liters:
                        print(f"✅ {t.strftime('%H:%M')} - Shower OK: {num_users} users, forecast={forecast_temp:.1f}°C")
                        effective_volume -= needed_liters
                        mixed_temp = (effective_volume * forecast_temp + needed_liters * cold_temp) / (effective_volume + needed_liters)
                        self.last_known_temp = mixed_temp
                    else:
                        delta_T = desired_temp - forecast_temp
                        energy_kj = self.capacity_liters * 4.186 * delta_T
                        power_kj_per_min = self.power_usage * 1000 / 60
                        heating_time_min = energy_kj / power_kj_per_min
                        print(f"🔥 {t.strftime('%H:%M')} - Not enough hot water. Start heating ~{heating_time_min:.1f} min before.")

                    info["finished"] = True

            sleep(interval_sec)

    def simulate_hourly_feedback_loop(self, schedule: dict, hours: int = 24, cold_temp=20.0, liters_per_shower=40.0):
        print("\n🧠 Starting hourly feedback loop simulation...")

        forecast_df, l_input = weather.get_forecast_dataframe_for_model(lat=32.0853, lon=34.7818, hours_ahead=hours)
        if l_input.shape[0] < 6:
            print("❗ Not enough data for a 6-hour sequence.")
            return None

        l_input["month"] = forecast_df["date"].dt.month
        l_input["dayofyear"] = forecast_df["date"].dt.dayofyear
        l_input["hour"] = forecast_df["date"].dt.hour
        l_input["month_sin"] = np.sin(2 * np.pi * l_input["month"] / 12)
        l_input["month_cos"] = np.cos(2 * np.pi * l_input["month"] / 12)
        l_input["day_sin"] = np.sin(2 * np.pi * l_input["dayofyear"] / 365)
        l_input["day_cos"] = np.cos(2 * np.pi * l_input["dayofyear"] / 365)
        l_input["hour_sin"] = np.sin(2 * np.pi * l_input["hour"] / 24)
        l_input["hour_cos"] = np.cos(2 * np.pi * l_input["hour"] / 24)

        for col in self.expected_features:
            if col not in l_input.columns:
                l_input[col] = 0.0

        key = f"boiler temp for {self.capacity_liters} L {'with' if self.has_solar else 'without'} solar system"
        effective_volume = self.capacity_liters * (0.7 if self.has_solar else 1.0)

        self.last_known_temp = None
        start_time = forecast_df["date"].iloc[0]

        results = []

        for i in range(hours):
            current_time = start_time + timedelta(hours=i)
            if i + 6 > len(l_input):
                break

            window = l_input.iloc[i:i + 6].copy()

            if self.last_known_temp is not None:
                l_input.at[window.index[-1], key] = self.last_known_temp

            X = np.expand_dims(self.scaler_x.transform(window[self.expected_features].astype(np.float32)), axis=0)
            y_pred_scaled = self.model.predict(X, verbose=0)
            y_pred = self.scaler_y.inverse_transform(y_pred_scaled)[0]
            temp_pred = y_pred[self.target_columns.index(key)]
            self.last_known_temp = temp_pred

            hour_str = current_time.strftime("%H:%M")
            status = "No shower"

            if hour_str in schedule:
                user_info = schedule[hour_str]
                desired_temp = user_info.get("shower_temp", 40.0)
                num_users = user_info.get("users", 1)
                needed_liters = num_users * liters_per_shower * 1.1

                usable_liters = effective_volume * (temp_pred - cold_temp) / (desired_temp - cold_temp)
                if usable_liters >= needed_liters:
                    effective_volume -= needed_liters
                    status = f"Shower OK ({num_users} users)"

                    hot_liters = effective_volume
                    cold_liters = needed_liters
                    mixed_temp = (hot_liters * temp_pred + cold_liters * cold_temp) / (hot_liters + cold_liters)
                    self.last_known_temp = mixed_temp
                    effective_volume = hot_liters
                else:
                    status = f"Not enough hot water"

            results.append({
                "Time": current_time.strftime("%Y-%m-%d %H:%M"),
                "PredictedTemp": round(temp_pred, 2),
                "EffectiveVolume": round(effective_volume, 1),
                "Status": status
            })

        df_result = pd.DataFrame(results)
        df_result.to_csv("hourly_feedback_simulation.csv", index=False)
        print("✅ Hourly feedback simulation saved to hourly_feedback_simulation.csv")
        return df_result
