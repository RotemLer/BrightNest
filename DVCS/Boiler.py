

import joblib
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta
import UTILS.weatherAPIRequest as weather
from DVCS.Device import Device
import numpy as np
import os
import pandas as pd
from datetime import datetime


# ==== Boiler Initialization ====
class BoilerManager(Device):
    def __init__(self, name: str, capacity_liters: int,  has_solar: bool = True, power_usage: float = None):
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
        return self.temperature

    def str(self):
        solar = "with solar" if self.has_solar else "without solar"
        return f"Boiler '{self.name}' ({self.capacity_liters}L, {solar}) - {self.get_status()}, {self.temperature:.1f}°C"

    def boiler_manager(self, scheduled_shower_time: datetime):

        return 0

    def cool(self, current_temp: float, used_liters: float = 40.0, cold_water_temp: float = 22.0):
        """
        Simulates the cooling of the boiler due to hot water usage and cold water entering.

        Args:
            current_temp (float): current water temperature in °C
            used_liters (float): amount of hot water used in liters (default = 40L)
            cold_water_temp (float): temperature of the incoming cold water (°C)

        Returns:
            float: updated boiler temperature after cooling
        """
        total_liters = self.capacity_liters
        remaining_liters = total_liters - used_liters

        if remaining_liters < 0:
            print("⚠ Used more water than boiler capacity.")
            remaining_liters = 0

        # Law of Conservation of Heat - Mixing Hot Water with Cold Water
        new_temp = (
                           (remaining_liters * current_temp) + (used_liters * cold_water_temp)
                   ) / total_liters

        new_temp = round(new_temp, 2)
        self.temperature = new_temp

        # update scale
        scale_path = "scale_temperature_list.save"
        if os.path.exists(scale_path):
            scale = joblib.load(scale_path)
        else:
            scale = []

        scale.append(new_temp)
        if len(scale) > 24:
            scale.pop(0)

        joblib.dump(scale, scale_path)
        print(f"🧊 Cooling: used {used_liters}L → new temp = {new_temp}°C")

        return new_temp

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

    def simulate_day_usage_with_custom_temps(self, schedule: dict, cold_temp: float = 20.0,
                                             liters_per_shower: float = 40.0,
                                             export_csv: bool = True,
                                             filename: str = "daily_usage_log_custom_temp.csv"):


        # === Forecast prediction from the model ===
        l_forecast, l_input = weather.get_forecast_dataframe_for_model(
            lat=31.25, lon=34.79, hours_ahead=48
        )

        if l_input.shape[0] < 6:
            print("❗ Not enough data for a 6-hour sequence.")
            return

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
            return

        for col in self.expected_features:
            if col not in l_input.columns:
                print(f"⚠ Missing feature: {col} — filling with 0")
                l_input[col] = 0.0

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

                # Init values
                usable_liters = 0
                heating_duration = 0
                forecast_temp = 0.0

                # Try to find when to start heating
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
                        # compute heating duration
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

        # שמירת התחזית המלאה לקובץ JSON לשימוש חיצוני
        try:
            forecast_json_path = os.path.join(os.getcwd(), "forecast_prediction.json")
            df_forecast.to_json(forecast_json_path, orient="records", force_ascii=False, indent=2, date_format="iso")
            print(f"📄 תחזית נשמרה בקובץ: {forecast_json_path}")
        except Exception as e:
            print(f"❌ שגיאה בשמירת תחזית לדוד:", e)

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