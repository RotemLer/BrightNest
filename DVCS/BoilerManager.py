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
class BoilerManager(Device):
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
                    print(f"⚠️ Column for {key} not found in CSV.")
        except Exception as e:
            print(f"⚠️ Failed to update CSV with real-time temp: {e}")

        return current_temp

    def get_temperature(self):
        return self.temperature

    def _str_(self):
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
            print("⚠️ Used more water than boiler capacity.")
            remaining_liters = 0

        # חוק שימור חום - ערבוב בין מים חמים למים קרים
        new_temp = (
                    (remaining_liters * current_temp) + (used_liters * cold_water_temp)
                   ) / total_liters

        new_temp = round(new_temp, 2)
        self.temperature = new_temp

        # עדכון scale
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

    def calc_turn_on_boiler(self, forecast: list[float], shower_hour: int, efficiency: float = 0.9):
        """
        Based on forecast and boiler specs, returns how long to turn on the boiler before shower.

        Returns:
            None if not needed, or int (minutes to turn on)
        """
        REQUIRED_TEMP = 50.0
        c = 4.186  # kJ/kg°C
        m = self.capacity_liters
        P = self.power_usage  # in kW
        eta = efficiency

        # כמה זמן עד המקלחת?
        current_hour = datetime.now().hour
        hours_ahead = shower_hour - current_hour
        if hours_ahead < 0:
            hours_ahead += 24

        if hours_ahead >= len(forecast):
            print("⚠️ Forecast too short.")
            return None

        forecasted_temp = forecast[hours_ahead]
        print(f"🛁 Shower in {hours_ahead}h → Forecasted temp = {forecasted_temp:.1f}°C")

        if forecasted_temp >= REQUIRED_TEMP:
            print("✅ No need to turn on boiler.")
            return None

        delta_T = REQUIRED_TEMP - forecasted_temp

        # מחשבים זמן נדרש לפי פיזיקה
        Q = delta_T * m * c  # אנרגיה נדרשת (kJ)
        power_kj_per_min = (P * 1000) / 60  # kW → kJ/min
        time_needed_min = Q / (power_kj_per_min * eta)

        print(f"🔥 Need to heat for ~{int(time_needed_min)} minutes.")
        return int(time_needed_min)

    def time_showering(self, forecast: list[float], end_time: datetime, num_users: int):
        """
        Simulates sequential showers and manages boiler heating/cooling accordingly.

        Args:
            forecast (list[float]): list of predicted hourly temperatures
            end_time (datetime): time of last shower ending
            num_users (int): number of people showering one after the other

        Returns:
            float: boiler temperature at the end
        """
        current_time = datetime.now()
        shower_duration = 10  # minutes per user
        cold_water_temp = 22.0  # from weather or default
        used_liters_per_user = 40.0

        for i in range(num_users):
            # ⏱️ מתי מקלחת היוזר הזה?
            shower_start = current_time + timedelta(minutes=i * shower_duration)
            shower_hour = shower_start.hour

            # 🔥 האם צריך להפעיל דוד?
            minutes_to_heat = self.calc_turn_on_boiler(forecast, shower_hour)
            if minutes_to_heat:
                self.heat(duration_minutes=minutes_to_heat, start_temperature=self.temperature)

            # 🚿 היוזר מתקלח → מקרר את הדוד
            print(f"👤 Shower {i + 1} at {shower_start.time()} (estimated)")
            self.cool(current_temp=self.temperature,
                      used_liters=used_liters_per_user,
                      cold_water_temp=cold_water_temp)

            # 🌀 האם צריך להדליק שוב לפני הבא? נחזור ללופ

        print(f"✅ Final boiler temperature after {num_users} showers: {self.temperature:.2f}°C")
        return self.temperature

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

        # 1. תחזית מז"א
        weather_df = forecast_api_func()

        # 2. חיזוי טמפ בדוד
        forecasted_temps = run_model_func(weather_df)  # returns list[float]

        # 3. אתחול Scale_temperature (ברירת מחדל – טמפ' לשעה הנוכחית)
        current_hour = now.hour
        scale_temperature = forecasted_temps[current_hour]

        # 4. בדיקת צורך בחימום
        minutes_to_heat = self.calc_turn_on_boiler(forecasted_temps, shower_hour)
        if minutes_to_heat:
            scale_temperature = self.heat(duration_minutes=minutes_to_heat, start_temperature=scale_temperature)

        # 5. אם הגענו לזמן המקלחת – נפעיל time_showering
        if now.hour == shower_hour:
            scale_temperature = self.time_showering(
                forecast=forecasted_temps,
                end_time=now.replace(hour=shower_hour, minute=30),
                num_users=num_users
            )

        # 6. עדכון scale
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

