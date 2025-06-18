# ==== Imports ====
import json

import joblib
import pytz
from sympy.physics.units import temperature
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta
import UTILS.weatherAPIRequest as weather
from DVCS.Device import Device
import numpy as np
import os
import pandas as pd
from datetime import datetime


# Constants
BOILER_SIZES = [50, 100, 150]
MAX_TEMP_NO_SOLAR = 50
chunk_size = 100000

# Physical constants
WATER_DENSITY = 1  # kg/L
WATER_HEAT_CAPACITY = 4.18  # kJ/kg°C
SOLAR_EFFICIENCY = 0.70
COLLECTOR_AREA = 3.0  # m²
INSULATION_K = 0.035
INSULATION_THICKNESS = 0.05  # m
MIN_EFFECTIVE_RADIATION = 100
MAX_COOLING_PER_HOUR = 0.8

# Efficiency by boiler size
COLLECTOR_EFFICIENCY_PER_SIZE = {
    50: 1.0,
    100: 0.85,
    150: 0.75
}



# ==== Boiler Initialization ====
class BoilerManager(Device):
    def __init__(self, name: str, capacity_liters: int, has_solar: bool = True, power_usage: float = None):
        if power_usage is None:
            power_map = {50: 2.0, 100: 3.0, 150: 4.0}
            power_usage = power_map.get(capacity_liters, 3.0)

        super().__init__(name, power_usage)
        self.capacity_liters = capacity_liters
        self.has_solar = has_solar
        self.temperature = 25

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
        self.lat = None
        self.lon = None

        self.natural_heating_forecast = {}
        self.last_static_temp = None
        self.last_inject_until = None


    def update_boiler_temperature(self, new_temp: float):
        self.temperature = round(new_temp, 2)
        scale_path = "scale_temperature_list.save"
        scale = joblib.load(scale_path) if os.path.exists(scale_path) else []
        scale.append(self.temperature)
        if len(scale) > 24:
            scale.pop(0)
        joblib.dump(scale, scale_path)

        try:
            csv_path = "last_6_hours_weather.csv"
            # === Fallback: create CSV if it doesn't exist
            if not os.path.exists(csv_path):
                print("📄 Creating last_6_hours_weather.csv from live forecast...")
                try:
                    from UTILS import weatherAPIRequest as weather
                    forecast_df, input_df = weather.get_forecast_dataframe_for_model(
                        lat=self.lat,
                        lon=self.lon,
                        hours_ahead=6
                    )
                    combined = forecast_df.copy()
                    for col in input_df.columns:
                        combined[col] = input_df[col]
                    combined.to_csv(csv_path, index=False)
                    print("✅ Forecast CSV created.")
                except Exception as e:
                    print(f"❌ Failed to create forecast CSV: {e}")
                    return  # לא נמשיך עם העדכון

            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                idx = df.index[-1]
                update_map = {
                    (50, True): "prev_boiler_temp_50_solar",
                    (50, False): "prev_boiler_temp_50_no_solar",
                    (100, True): "prev_boiler_temp_100_solar",
                    (100, False): "prev_boiler_temp_100_no_solar",
                    (150, True): "prev_boiler_temp_150_solar",
                    (150, False): "prev_boiler_temp_150_no_solar",
                }
                key = (self.capacity_liters, self.has_solar)
                column = update_map.get(key)
                if column and column in df.columns:
                    df.loc[idx, column] = self.temperature
                    df.to_csv(csv_path, index=False)
                    print(f"✅ Updated {column} in real-time CSV.")
                else:
                    print(f"⚠ Column for {key} not found in CSV.")
        except Exception as e:
            print(f"⚠ Failed to update CSV with real-time temp: {e}")

    def heat(self, duration_minutes: float, start_temperature: float):
        """
        Heat the boiler water for a given duration. Does NOT calculate duration – that should be done in calc_turn_on_boiler().

        Args:
            duration_minutes (float): how long to heat (already pre-computed)
            start_temperature (float): current boiler temperature before heating
        """
        if not self.status:
            print(f"{self.name} is OFF. Can't heat.")
            return

        MAX_TEMP = 68.0
        mass_kg = self.capacity_liters
        c = 4.186  # kJ/kg°C
        power_kj_per_min = self.power_usage * 1000 / 60
        efficiency = 0.9  # or move to self property

        current_temp = start_temperature
        remaining_time = duration_minutes

        # Load or initialize scale
        scale_path = "scale_temperature_list.save"
        if os.path.exists(scale_path):
            scale = joblib.load(scale_path)
        else:
            scale = []

        # Heating loop
        while remaining_time > 0 and current_temp < MAX_TEMP:
            step = min(60, remaining_time)
            Q = power_kj_per_min * step * efficiency
            delta_T = Q / (mass_kg * c)
            current_temp = min(current_temp + delta_T, MAX_TEMP)
            remaining_time -= step

            scale.append(round(current_temp, 2))
            if len(scale) > 24:
                scale.pop(0)

            print(f"{self.name}: +{step:.0f} min → ΔT = {delta_T:.2f}°C → Temp = {current_temp:.1f}°C")

        joblib.dump(scale, scale_path)
        self.temperature = current_temp

        # Update CSV for real-time models
        try:
            csv_path = "last_6_hours_weather.csv"
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                idx = df.index[-1]

                update_map = {
                    (50, True): "prev_boiler_temp_50_solar",
                    (50, False): "prev_boiler_temp_50_no_solar",
                    (100, True): "prev_boiler_temp_100_solar",
                    (100, False): "prev_boiler_temp_100_no_solar",
                    (150, True): "prev_boiler_temp_150_solar",
                    (150, False): "prev_boiler_temp_150_no_solar",
                }

                key = (self.capacity_liters, self.has_solar)
                column = update_map.get(key)

                if column and column in df.columns:
                    df.loc[idx, column] = round(current_temp, 2)
                    df.to_csv(csv_path, index=False)
                    print(f"✅ Updated {column} in real-time CSV.")
                else:
                    print(f"⚠ Column for {key} not found in CSV.")
        except Exception as e:
            print(f"⚠ Failed to update CSV with real-time temp: {e}")

        return current_temp

    def get_temperature(self):
        print(f"in boiler - het temperature = {self.temperature}")
        return self.temperature

    def str(self):
        solar = "with solar" if self.has_solar else "without solar"
        return f"Boiler '{self.name}' ({self.capacity_liters}L, {solar}) - {self.get_status()}, {self.temperature:.1f}°C"

    def boiler_manager(self, scheduled_shower_time: datetime):

        return 0

    def cool(self, schedule: dict, current_temp: float, lat: float, lon: float,
             used_liters: float = 40.0, cold_water_temp: float = 22.0,
             recompute_forecast: bool = True, inject_hours: int = 6):

        self.lat = lat
        self.lon = lon
        total_liters = self.capacity_liters

        # דגם עירוב חלקי – מדמה את העובדה שלא כל המים מתערבבים
        mixing_factor = 0.6  # אפשר לשנות ל־0.5 או 0.7 לפי בדיקות אמפיריות
        effective_liters = used_liters * mixing_factor
        remaining_liters = total_liters - effective_liters
        if remaining_liters < 0:
            print("⚠ Used more water than boiler capacity.")
            remaining_liters = 0

        new_temp = ((remaining_liters * current_temp) + (effective_liters * cold_water_temp)) / total_liters
        new_temp = round(new_temp, 2)
        print(f"🧊 Cooling: used {used_liters}L (effective: {effective_liters}L) → new temp = {new_temp}°C")

        self.update_boiler_temperature(new_temp)

        # שמירת זמן סיום מקלחת
        with open("shower_end_time.save", "w") as f:
            f.write(pd.Timestamp.now().isoformat())

        if recompute_forecast:
            jerusalem = pytz.timezone("Asia/Jerusalem")
            inject_until = jerusalem.localize(datetime.now()) + timedelta(hours=inject_hours)
            try:
                print(f"🔁 Re-running forecast with injected temp ({new_temp}°C) for {inject_hours} hours")
                self.simulate_day_usage_with_custom_temps(
                    schedule=schedule,
                    lat=self.lat,
                    lon=self.lon,
                    export_csv=True,
                )
            except Exception as e:
                print(f"❌ Error during forecast update after cooling: {e}")


        return new_temp, inject_until

    def calc_start_heating_time(
            self,
            forecast_df: pd.DataFrame,
            boiler_key: str,
            target_time: datetime,
            target_temp: float
    ):
        """
        Calculates the earliest time to start heating in order to reach a target boiler temperature
        by the specified target_time (e.g., shower time). If heating is unnecessary (already hot enough),
        returns None and the forecasted temperature.

        Returns:
            (datetime | None, float | None):
                - datetime to begin heating (or None if not required / not possible)
                - forecasted boiler temp at that time
        """
        c = 4.186  # Specific heat capacity of water (kJ/kg°C)
        mass_kg = self.capacity_liters
        power_kj_per_min = self.power_usage * 1000 / 60  # kW to kJ/min
        efficiency = 0.9  # Heating efficiency

        # Filter forecast only for times before the shower
        relevant_forecast = forecast_df[
            (forecast_df["time"] <= target_time)
        ].sort_values("time", ascending=False)

        for _, row in relevant_forecast.iterrows():
            forecast_time = row["time"]
            temp_now = row[boiler_key]

            delta_T = target_temp - temp_now

            if delta_T <= 0:
                # Already hot enough – no heating required
                return None, temp_now

            # Compute energy and time required to heat from temp_now to target_temp
            energy_needed_kj = mass_kg * c * delta_T
            time_needed_minutes = energy_needed_kj / (power_kj_per_min * efficiency)

            heating_start_time = target_time - timedelta(minutes=time_needed_minutes)

            # Check if there is enough time before the forecast_time to heat
            if heating_start_time >= forecast_time:
                return heating_start_time, temp_now

        # No time window in the forecast allows to reach target temperature
        return None, None

    def simulate_day_usage_with_custom_temps(self, schedule: dict,
                                             lat: float, lon: float,
                                             cold_temp: float = 20.0,
                                             liters_per_shower: float = 40.0,
                                             export_csv: bool = True,
                                             filename: str = "daily_usage_log_custom_temp.csv",
                                             save_forecast_json: bool = True):

        l_forecast, l_input = weather.get_forecast_dataframe_for_model(
            lat=lat, lon=lon, hours_ahead=48
        )

        if l_input.shape[0] < 6:
            print("❗ Not enough data for a 6-hour sequence.")
            return

        if "date" not in l_forecast.columns:
            print("❌ Forecast data missing 'date' column.")
            return

        # Time features
        l_input["month"] = l_forecast["date"].dt.month
        l_input["dayofyear"] = l_forecast["date"].dt.dayofyear
        l_input["hour"] = l_forecast["date"].dt.hour
        l_input["month_sin"] = np.sin(2 * np.pi * l_input["month"] / 12)
        l_input["month_cos"] = np.cos(2 * np.pi * l_input["month"] / 12)
        l_input["day_sin"] = np.sin(2 * np.pi * l_input["dayofyear"] / 365)
        l_input["day_cos"] = np.cos(2 * np.pi * l_input["dayofyear"] / 365)
        l_input["hour_sin"] = np.sin(2 * np.pi * l_input["hour"] / 24)
        l_input["hour_cos"] = np.cos(2 * np.pi * l_input["hour"] / 24)

        for col in self.expected_features:
            if col not in l_input.columns:
                print(f"⚠ Missing feature: {col} — filling with 0")
                l_input[col] = 0.0

        # if inject_temp is not None:
        #     column_name = f"prev_boiler_temp_{self.capacity_liters}_{'solar' if self.has_solar else 'no_solar'}"
        #     print(f"column name = {column_name}")
        #     print(f"l_input.columns = {l_input.columns}")
        #     if column_name in l_input.columns:
        #         natural_profile = self.generate_natural_heating_profile(start_temp=inject_temp)
        #         for time, temp in natural_profile.items():
        #             print(f"time: {time}")
        #             if time in l_forecast["date"].values:
        #                 l_input.loc[l_forecast["date"] == time, column_name] = temp
        #         print(f"✅ Injected natural heating profile from {inject_temp}°C")

        l_input = l_input[self.expected_features].astype(np.float32)

        forecast_temps, time_stamps = [], []
        for i in range(len(l_input) - 5):
            sequence = l_input.iloc[i:i + 6]
            X = np.expand_dims(self.scaler_x.transform(sequence), axis=0)
            y_pred_scaled = self.model.predict(X, verbose=0)
            y_pred = self.scaler_y.inverse_transform(y_pred_scaled)[0]
            forecast_temps.append(y_pred)
            time_stamps.append(l_forecast["date"].iloc[i])

        df_forecast = pd.DataFrame(forecast_temps, columns=self.target_columns)
        df_forecast.insert(0, "time", time_stamps)
        df_forecast["time"] = pd.to_datetime(df_forecast["time"]).dt.tz_localize(None)

        if self.last_static_temp is not None and self.last_inject_until is not None:
            jerusalem = pytz.timezone("Asia/Jerusalem")
            now = self.last_inject_until.tzinfo.localize(datetime.now().replace(minute=0, second=0, microsecond=0))
            print(f"now < self.last_inject_until: {now < self.last_inject_until}")
            if now < self.last_inject_until:
                current_temp = self.last_static_temp
                print(f"current temp = {current_temp}")
                key = f"boiler temp for {self.capacity_liters} L {'with' if self.has_solar else 'without'} solar system"
                self.temperature = current_temp
                print(f"self temperature {self.temperature}")
                print(f"key: {key}")
                print("🔍 Forecast columns before save:", df_forecast.columns.tolist())
                if key not in df_forecast.columns:
                    df_forecast[key] = np.nan

                print("🔍 First forecast time in df_forecast:", df_forecast["time"].iloc[0])
                print("🕒 Last inject start:", self.last_inject_until - timedelta(hours=6))

                for idx, row in df_forecast.iterrows():
                    forecast_time = row["time"]
                    # ⭐ הפוך אותו ל־tz-aware
                    if forecast_time.tzinfo is None:
                        forecast_time = pytz.timezone("Asia/Jerusalem").localize(forecast_time)

                    if forecast_time > self.last_inject_until:
                        print("in if")
                        break

                    if idx == 0:
                        df_forecast.at[idx, key] = np.float32(current_temp)
                        continue

                    # שליפת משתנים סביבתיים מהתחזית
                    mask = l_forecast["date"] == forecast_time
                    print(f"forecast time: {forecast_time}")

                    if not mask.any():
                        continue

                    ambient = l_input.loc[mask, "temperature_2m"].values[0]
                    radiation = l_input.loc[mask, "direct_radiation"].values[0]
                    cloud = l_input.loc[mask, "cloud_cover"].values[0]
                    wind = l_input.loc[mask, "wind_speed_10m"].values[0]
                    hour = forecast_time.hour
                    month = forecast_time.month

                    # חישוב טמפ׳ לפי סוג הדוד
                    if self.has_solar:
                        current_temp = self.compute_solar_heating(
                            prev_temp=current_temp,
                            radiation=radiation,
                            cloud_cover=cloud,
                            hour=hour,
                            month=month,
                            volume_liters=self.capacity_liters
                        )

                    current_temp = round(current_temp, 2)
                    df_forecast.at[idx, key] = np.float32(current_temp)

                print(
                    f"✅ Natural temp simulation completed → up to {self.last_inject_until.strftime('%Y-%m-%d %H:%M')}")

        if save_forecast_json:
            print("saving JSON")
            forecast_json_path = os.path.join(os.getcwd(), "forecast_prediction.json")
            df_forecast.to_json(forecast_json_path, orient="records", force_ascii=False, indent=2, date_format="iso")
            print("📋 תחזית שנשמרה:")
            print(df_forecast[["time", "boiler temp for 150 L with solar system"]].head(10))
        # === חלק הסימולציה מהקוד הישן ===
        key = f"boiler temp for {self.capacity_liters} L {'with' if self.has_solar else 'without'} solar system"
        effective_volume = self.capacity_liters * (0.7 if self.has_solar else 1.0)
        log = []

        print(f"\n📅 Simulating daily usage with per-user temperatures: {schedule}")

        for target_time, details in schedule.items():
            if not isinstance(target_time, datetime):
                print(f"❌ שגיאה: מפתח בלו״ז אינו מסוג datetime: {target_time}")
                continue

            try:
                num_users = details.get("users", 1)
                shower_temp = details.get("shower_temp", 40.0)
                needed_liters = num_users * liters_per_shower * 1.1
                usable_liters = 0
                heating_duration = 0
                forecast_temp = 0.0

                heating_time, temp_at_start = self.calc_start_heating_time(
                    forecast_df=df_forecast,
                    boiler_key=key,
                    target_time=target_time,
                    target_temp=shower_temp
                )

                if temp_at_start is None:
                    status = "Insufficient - not enough time to heat"
                else:
                    forecast_temp = temp_at_start
                    if forecast_temp < shower_temp:
                        delta_T = shower_temp - forecast_temp
                        c = 4.186
                        mass_kg = self.capacity_liters
                        power_kj_per_min = self.power_usage * 1000 / 60
                        efficiency = 0.9
                        energy_needed_kj = mass_kg * c * delta_T
                        heating_duration = energy_needed_kj / (power_kj_per_min * efficiency)
                        heating_duration = round(heating_duration, 1)
                        if heating_time:
                            status = f"Insufficient - start heating at: {heating_time.strftime('%H:%M')} (need {heating_duration} min)"
                        else:
                            status = f"Insufficient - forecast too cold ({forecast_temp:.1f}°C < {shower_temp}°C)"
                    else:
                        usable_liters = self.capacity_liters * (forecast_temp - cold_temp) / (shower_temp - cold_temp)
                        if usable_liters >= needed_liters:
                            status = "Sufficient - no heating"
                            heating_duration = 0
                            effective_volume -= needed_liters
                        else:
                            delta_T = shower_temp - forecast_temp
                            c = 4.186
                            mass_kg = self.capacity_liters
                            power_kj_per_min = self.power_usage * 1000 / 60
                            efficiency = 0.9
                            energy_needed_kj = mass_kg * c * delta_T
                            heating_duration = energy_needed_kj / (power_kj_per_min * efficiency)
                            heating_duration = round(heating_duration, 1)
                            if heating_time:
                                status = f"Insufficient - start heating at: {heating_time.strftime('%H:%M')} (need {heating_duration} min)"
                            else:
                                status = f"Insufficient - forecast too cold ({forecast_temp:.1f}°C < {shower_temp}°C)"

                log.append({
                    "Time": target_time.strftime("%Y-%m-%d %H:%M"),
                    "Users": num_users,
                    "ShowerTemp": shower_temp,
                    "ForecastTemp": round(forecast_temp, 2),
                    "UsableLiters": round(usable_liters, 2),
                    "NeededLiters": round(needed_liters, 2),
                    "HeatingMinutes": heating_duration,
                    "Status": status
                })

            except Exception as e:
                print(f"❌ General error in time handling {target_time}: {e}")
                continue

        log_df = pd.DataFrame(log)
        if export_csv:
            output_path = os.path.join(os.getcwd(), filename)
            log_df.to_csv(output_path, index=False)
            print(f"\n📄 Usage log exported to: {output_path}")


        return log_df

    def OnTimer(self, now: datetime, forecast_api_func, run_model_func, shower_hour: int, num_users: int):
        """
        Runs once every X minutes/hours as main loop tick:
        - Gets forecast
        - Runs boiler model
        - Decides whether to heat
        - If it's shower time – runs time_showering()
        - Updates scale accordingly

        Args:
            now (datetime): current timestamp
            forecast_api_func (function): function that returns weather forecast DataFrame
            run_model_func (function): function that returns list[float] of forecasted boiler temps
            shower_hour (int): hour of shower time (e.g., 20 for 20:00)
            num_users (int): number of users showering
        """
        print(f"🕒 OnTimer Tick at {now}")

        # 1.weather forecast
        weather_df = forecast_api_func()

        # 2. Boiler temperature prediction
        forecasted_temps = run_model_func(weather_df)  # returns list[float]

        # 3. Initialize Scale_temperature (default – temp for the current hour)
        current_hour = now.hour
        scale_temperature = forecasted_temps[current_hour]

        # 4. Heating requirement check
        minutes_to_heat = self.calc_turn_on_boiler(forecasted_temps, shower_hour)
        if minutes_to_heat:
            scale_temperature = self.heat(duration_minutes=minutes_to_heat, start_temperature=scale_temperature)

        # 5.If we have reached shower time – we will activate time_showering
        if now.hour == shower_hour:
            scale_temperature = self.time_showering(
                forecast=forecasted_temps,
                end_time=now.replace(hour=shower_hour, minute=30),
                num_users=num_users
            )

        # 6. update scale
        scale_path = "scale_temperature_list.save"
        if os.path.exists(scale_path):
            scale = joblib.load(scale_path)
        else:
            scale = []

        scale.append(round(scale_temperature, 2))
        if len(scale) > 24:
            scale.pop(0)

        joblib.dump(scale, scale_path)
        print(f"📈 Updated scale with {scale_temperature:.2f}°C")

    def simulate_heating_profile(self, start_time: datetime, start_temp: float, max_duration_minutes: int = 90,
                                 step_minutes: int = 10):
        """
        מדמה את החימום של הדוד לאחר מקלחת לאורך זמן.
        מחזירה מילון של {datetime: temp} עבור כל צעד זמן בחימום.
        """
        MAX_TEMP = 68.0
        c = 4.186  # kJ/kg°C
        mass_kg = self.capacity_liters
        power_kj_per_min = self.power_usage * 1000 / 60
        efficiency = 0.9

        current_temp = start_temp
        current_time = start_time
        elapsed_minutes = 0

        heating_profile = {}

        while elapsed_minutes <= max_duration_minutes and current_temp < MAX_TEMP:
            # חישוב אנרגיה
            Q = power_kj_per_min * step_minutes * efficiency
            delta_T = Q / (mass_kg * c)
            current_temp = min(current_temp + delta_T, MAX_TEMP)

            # הוספה למילון
            heating_profile[current_time] = round(current_temp, 2)

            # עדכון זמן ודקות
            elapsed_minutes += step_minutes
            current_time += timedelta(minutes=step_minutes)

        return heating_profile

    def generate_natural_heating_profile(self, start_temp: float, hours: int = 4, step_minutes: int = 60,
                                         delta_per_hour: float = 0.5):
        """
        מדמה התחממות טבעית של מים בדוד (ללא הפעלת גוף חימום)
        עלייה הדרגתית של delta_per_hour כל שעה.
        """
        profile = {}
        now = pd.Timestamp.now().replace(minute=0, second=0, microsecond=0)
        for i in range(0, hours * 60 + 1, step_minutes):
            time = now + timedelta(minutes=i)
            temp = round(start_temp + (i / 60) * delta_per_hour, 2)
            profile[time] = temp
        return profile

    def update_natural_heating_forecast(self):
        if not self.last_static_temp or not self.last_inject_until:
            return

        now = pd.Timestamp.now()
        if now >= self.last_inject_until:
            return  # התחזית הטבעית הסתיימה

        hours_remaining = int((self.last_inject_until - now).total_seconds() // 3600)
        profile = self.generate_natural_heating_profile(
            start_temp=self.last_static_temp,
            hours=hours_remaining
        )

        self.natural_heating_forecast = profile

        # שמירה לקובץ JSON
        key = f"boiler temp for {self.capacity_liters} L {'with' if self.has_solar else 'without'} solar system"
        json_path = "natural_boiler_forecast.json"
        try:
            if os.path.exists(json_path):
                with open(json_path, "r") as f:
                    data = json.load(f)
            else:
                data = {}

            for time, temp in profile.items():
                time_str = str(time)
                if time_str not in data:
                    data[time_str] = {}
                data[time_str][key] = temp

            with open(json_path, "w") as f:
                json.dump(data, f, indent=2, default=str)

        except Exception as e:
            print(f"⚠️ Error saving natural forecast: {e}")

    # === Solar heating function ===
    def compute_solar_heating(self, prev_temp, radiation, cloud_cover, hour, month, volume_liters):

        if 6 <= hour <= 18 and radiation > MIN_EFFECTIVE_RADIATION:
            hour_weight = np.exp(-((hour - 13.5) ** 2) / 6.0)
            hour_weight = max(hour_weight, 0.25)

            temp_loss_factor = max(0.3, min(1.0, 1 - ((prev_temp - 45) / 40)))
            cloud_factor = (1 - cloud_cover) ** 1.2
            size_eff = COLLECTOR_EFFICIENCY_PER_SIZE.get(volume_liters, 0.8)

            effective_radiation = (
                    radiation * cloud_factor *
                    SOLAR_EFFICIENCY * hour_weight *
                    temp_loss_factor * size_eff * 1.15
            )

            energy_kWh = (effective_radiation / 1000) * COLLECTOR_AREA
            energy_kJ = energy_kWh * 3600
            mass = volume_liters * WATER_DENSITY
            delta_temp = energy_kJ / (mass * WATER_HEAT_CAPACITY)
            temp = prev_temp + delta_temp + np.random.normal(0, 0.05)

            seasonal_cap = 68 if 4 <= month <= 9 else 60
            print(f"compute_solar_heating - temp: {temp},  seasonal_cap: {seasonal_cap}, month: {month}")
            return min(temp, seasonal_cap)
        else:
            return prev_temp

    # === Cooling function ===
    def compute_physical_cooling(prev_temp, ambient_temp, volume_liters, hour, wind_speed):
        mass = volume_liters * WATER_DENSITY
        delta_T = prev_temp - ambient_temp
        if delta_T <= 0:
            return prev_temp

        surface_area = 1.1 + 0.01 * volume_liters
        insulation_variation = 1.0 + np.random.normal(0, 0.02)
        U_value = (INSULATION_K / INSULATION_THICKNESS) * insulation_variation
        Q_watts = U_value * surface_area * delta_T
        Q_kJ = Q_watts * 3600 / 1000
        delta_temp = Q_kJ / (mass * WATER_HEAT_CAPACITY)

        if hour >= 21 or hour <= 5:
            hour_factor = 1.3
        elif 6 <= hour <= 9 or 18 <= hour <= 20:
            hour_factor = 0.7
        else:
            hour_factor = 0.3

        if 13 <= hour <= 16 and ambient_temp > 27:
            hour_factor *= 0.6

        wind_factor = 1 + 0.05 * wind_speed
        insulation_factor = 1 - (volume_liters - 50) / 300

        delta_temp *= hour_factor * wind_factor * insulation_factor
        delta_temp = min(delta_temp, MAX_COOLING_PER_HOUR)

        return prev_temp - delta_temp + np.random.normal(0, 0.05)

    def load_forecasted_temp_from_prediction_file(self,capacity_liters: int, has_solar: bool):
        try:
            path = "forecast_prediction.json"
            if not os.path.exists(path):
                print("⚠️ קובץ התחזיות לא נמצא.")
                return None

            with open(path, "r") as f:
                records = json.load(f)
            df = pd.DataFrame(records)

            if "time" not in df.columns:
                print("⚠️ עמודת 'time' לא קיימת בקובץ.")
                return None

            df["time"] = pd.to_datetime(df["time"], errors="coerce")
            now = pd.Timestamp.now()
            df["time_diff"] = (df["time"] - now).abs()

            closest_idx = df["time_diff"].idxmin()
            row = df.loc[closest_idx]

            key = f"boiler temp for {capacity_liters} L {'with' if has_solar else 'without'} solar system"
            if key not in row:
                print(f"⚠️ העמודה '{key}' לא נמצאה.")
                return None

            return round(row[key], 2)

        except Exception as e:
            print(f"❌ שגיאה בטעינת תחזית מהקובץ: {e}")
            return None
