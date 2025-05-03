import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta
import os
import UTILS.weatherAPIRequest as weather
from DVCS.Device import Device


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

    def heat(self, degrees: float):
        if self.status:
            self.temperature += degrees
            print(f"{self.name} heated by {degrees}°C to {self.temperature:.1f}°C.")
        else:
            print(f"{self.name} is OFF. Can't heat.")

    def get_temperature(self):
        return self.temperature

    def __str__(self):
        solar = "with solar" if self.has_solar else "without solar"
        return f"Boiler '{self.name}' ({self.capacity_liters}L, {solar}) - {self.get_status()}, {self.temperature:.1f}°C"

    def CalcHeatingTime(self):
        l_forecast, l_input = weather.get_forecast_dataframe_for_model(
            lat=32.0853, lon=34.7818, hours_ahead=48
        )

        if l_input.shape[0] < 6:
            print("❗ Not enough data for a 6-hour sequence.")
            return None

        # === ✅ Add seasonal and hourly features from datetime ===
        if "date" in l_forecast.columns:
            l_input["month"] = l_forecast["date"].dt.month
            l_input["dayofyear"] = l_forecast["date"].dt.dayofyear
            l_input["hour"] = l_forecast["date"].dt.hour

            l_input["month_sin"] = np.sin(2 * np.pi * l_input["month"] / 12)
            l_input["month_cos"] = np.cos(2 * np.pi * l_input["month"] / 12)
            l_input["day_sin"] = np.sin(2 * np.pi * l_input["dayofyear"] / 365)
            l_input["day_cos"] = np.cos(2 * np.pi * l_input["dayofyear"] / 365)
            l_input["hour_sin"] = np.sin(2 * np.pi * l_input["hour"] / 24)
            l_input["hour_cos"] = np.cos(2 * np.pi * l_input["hour"] / 24)
        else:
            print("❌ Forecast data missing 'date' column.")
            return None

        # === Ensure all expected features exist ===
        for col in self.expected_features:
            if col not in l_input.columns:
                print(f"⚠️ Missing feature: {col} — filling with 0")
                l_input[col] = 0.0

        # === Select and scale input ===
        l_input = l_input[self.expected_features].astype(np.float32)

        forecast_temps, time_stamps = [], []
        for i in range(len(l_input) - 5):
            sequence = l_input.iloc[i:i + 6]
            X = np.expand_dims(self.scaler_x.transform(sequence), axis=0)
            y_pred_scaled = self.model.predict(X, verbose=0)
            y_pred = self.scaler_y.inverse_transform(y_pred_scaled)[0]
            forecast_temps.append(y_pred)
            time_stamps.append(l_forecast["date"].iloc[i])

        df_result = pd.DataFrame(forecast_temps, columns=self.target_columns)
        df_result.insert(0, "time", time_stamps)
        self.last_forecast_df = df_result

        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        df_result.to_csv(f"boiler_forecast_{timestamp}.csv", index=False)
        print(f"✅ Full forecast saved to boiler_forecast_{timestamp}.csv")
        return df_result

    def simulate_day_usage_with_custom_temps(self, schedule: dict, cold_temp: float = 20.0,
                                             liters_per_shower: float = 40.0,
                                             export_csv: bool = True,
                                             filename: str = "daily_usage_log_custom_temp.csv"):
        if self.last_forecast_df is None:
            print("❌ No forecast data available. Please run CalcHeatingTime() first.")
            return

        df = self.last_forecast_df.copy()
        df["time"] = pd.to_datetime(df["time"]).dt.tz_localize(None)
        key = f"boiler temp for {self.capacity_liters} L {'with' if self.has_solar else 'without'} solar system"
        effective_volume = self.capacity_liters * (0.7 if self.has_solar else 1.0)

        log = []
        print(f"\n📅 Simulating daily usage with per-user temperatures: {schedule}")

        for time_str, details in schedule.items():
            try:
                num_users = details.get("users", 1)
                shower_temp = details.get("shower_temp", 40.0)
                target_time = pd.to_datetime(df["time"].dt.strftime("%Y-%m-%d")[0] + " " + time_str)
            except Exception as e:
                print(f"❌ Error in schedule format at {time_str}: {e}")
                continue

            row = df.iloc[(df["time"] - target_time).abs().argsort()[:1]]
            forecast_temp = row[key].iloc[0]
            time_actual = row["time"].iloc[0]

            needed_liters = num_users * liters_per_shower * 1.1  # Add 10% safety margin

            if forecast_temp < shower_temp:
                usable_liters = 0
                delta_temp = max(0, shower_temp - forecast_temp)  # ✅ עדכון חשוב כאן
                mass_kg = self.capacity_liters
                specific_heat = 4.186
                power_kj_per_min = self.power_usage * 1000 / 60
                energy_needed_kj = mass_kg * specific_heat * delta_temp
                heating_minutes = energy_needed_kj / power_kj_per_min
                start_heating_time = time_actual - pd.Timedelta(minutes=heating_minutes)
                status = f"Forecast too cold | Start heating at: {start_heating_time.strftime('%H:%M')} (~{heating_minutes:.1f} min)"
            else:
                usable_liters = effective_volume * (forecast_temp - cold_temp) / (shower_temp - cold_temp)

                if usable_liters >= needed_liters:
                    status = "Sufficient - no heating"
                    effective_volume -= needed_liters
                else:
                    delta_temp = max(0, shower_temp - forecast_temp)
                    mass_kg = self.capacity_liters
                    specific_heat = 4.186
                    power_kj_per_min = self.power_usage * 1000 / 60
                    energy_needed_kj = mass_kg * specific_heat * delta_temp
                    heating_minutes = energy_needed_kj / power_kj_per_min
                    start_heating_time = time_actual - pd.Timedelta(minutes=heating_minutes)
                    status = f"Insufficient - heating needed | Start heating at: {start_heating_time.strftime('%H:%M')} (~{heating_minutes:.1f} min)"
                    effective_volume = self.capacity_liters * (0.7 if self.has_solar else 1.0)

            log.append({
                "Time": time_actual.strftime("%Y-%m-%d %H:%M"),
                "Users": num_users,
                "ShowerTemp": shower_temp,
                "ForecastTemp": forecast_temp,
                "UsableLiters": usable_liters,
                "NeededLiters": needed_liters,
                "Status": status
            })

        log_df = pd.DataFrame(log)
        if export_csv:
            output_path = os.path.join(os.getcwd(), filename)
            log_df.to_csv(output_path, index=False)
            print(f"\n📄 Usage log exported to: {output_path}")

        return log_df