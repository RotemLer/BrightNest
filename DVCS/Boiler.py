import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model
from datetime import datetime
import UTILS.weatherAPIRequest as weather
from DVCS.Device import Device


class Boiler(Device):
    def __init__(self, name: str, capacity_liters: int, power_usage: float = None, has_solar: bool = True):
        """
        :param name: Boiler name
        :param capacity_liters: Boiler size in liters (50, 100, 150)
        :param power_usage: Power in kW (default chosen by size if not provided)
        :param has_solar: Whether the boiler has a solar system
        """
        # Assign default power usage based on capacity if not provided
        if power_usage is None:
            if capacity_liters == 50:
                power_usage = 2.0
            elif capacity_liters == 100:
                power_usage = 3.0
            elif capacity_liters == 150:
                power_usage = 4.0
            else:
                power_usage = 3.0  # general fallback

        super().__init__(name, power_usage)
        self.capacity_liters = capacity_liters
        self.has_solar = has_solar
        self.temperature = 25
        self.last_forecast_df = None

        # Load model and scalers
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
        # 1. Retrieve forecast input data
        l_forecast, l_input = weather.get_forecast_dataframe_for_model(
            lat=32.0853, lon=34.7818, hours_ahead=48
        )

        if l_input.shape[0] < 6:
            print("❗ Not enough data for a 6-hour sequence.")
            return None

        # 2. Align input columns with model expectations
        for col in self.expected_features:
            if col not in l_input.columns:
                l_input[col] = 0.0
        l_input = l_input[self.expected_features]

        # 3. Normalize and reshape input
        l_input = l_input.astype(np.float32)
        forecast_temps = []
        time_stamps = []

        # 4. Rolling prediction every hour using a 6-hour window
        for i in range(len(l_input) - 5):
            sequence = l_input.iloc[i:i + 6]
            X = np.expand_dims(self.scaler_x.transform(sequence), axis=0)
            y_pred_scaled = self.model.predict(X, verbose=0)
            y_pred = self.scaler_y.inverse_transform(y_pred_scaled)[0]
            forecast_temps.append(y_pred)
            time_stamps.append(l_forecast["date"].iloc[i])

        # 5. Save the full forecast
        df_result = pd.DataFrame(forecast_temps, columns=self.target_columns)
        df_result.insert(0, "time", time_stamps)
        self.last_forecast_df = df_result

        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        df_result.to_csv(f"boiler_forecast_{timestamp}.csv", index=False)

        print(f"✅ Full forecast saved to boiler_forecast_{timestamp}.csv")
        return df_result

    def estimate_heating_time(self, start_time: str, target_temp: float = 50.0):
        """
        Estimate heating time (in minutes) from predicted temperature at given time
        to the desired target temperature, using physical energy formula.
        """
        if self.last_forecast_df is None:
            print("❌ No forecast data available. Please run CalcHeatingTime() first.")
            return None

        try:
            start_dt = pd.to_datetime(start_time).tz_localize(None)
        except Exception as e:
            print(f"❌ Invalid time format: {e}")
            return None

        df = self.last_forecast_df.copy()
        df["time"] = pd.to_datetime(df["time"]).dt.tz_localize(None)

        # Find closest forecast row to the requested time
        row = df.iloc[(df["time"] - start_dt).abs().argsort()[:1]]
        forecast_time = row["time"].iloc[0]

        key = f"boiler temp for {self.capacity_liters} L {'with' if self.has_solar else 'without'} solar system"
        if key not in row.columns:
            print(f"❌ Forecast column not found for: {key}")
            return None

        predicted_start_temp = row[key].iloc[0]
        delta_temp = max(0, target_temp - predicted_start_temp)

        # === Physics-based heating time ===
        mass_kg = self.capacity_liters  # Assume 1L = 1kg of water
        specific_heat = 4.186  # kJ/(kg·°C)
        power_kw = self.power_usage  # Power in kW

        energy_needed_kj = mass_kg * specific_heat * delta_temp
        power_kj_per_min = power_kw * 1000 / 60  # Convert kW to kJ/min

        if power_kj_per_min <= 0:
            print("❌ Power too low to calculate heating time.")
            return None

        estimated_minutes = energy_needed_kj / power_kj_per_min
        estimated_hours = estimated_minutes / 60
        estimated_end_time = forecast_time + pd.Timedelta(minutes=estimated_minutes)

        print(f"📅 Forecast time selected: {forecast_time}")
        print(f"📈 Forecasted temperature: {predicted_start_temp:.1f}°C")
        print(f"🎯 Target temperature: {target_temp:.1f}°C")
        print(f"🔥 Estimated heating time: {estimated_minutes:.1f} minutes (~{estimated_hours:.2f} hours)")
        print(f"⏱ Expected end time: {estimated_end_time.strftime('%Y-%m-%d %H:%M')}")

        return estimated_minutes