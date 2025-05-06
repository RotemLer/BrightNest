import numpy as np
import pandas as pd
import joblib
from tensorflow.keras.models import load_model
from datetime import datetime, timedelta
import os
from DVCS.Device import Device

class BoilerManager(Device):
    def __init__(self, name: str, capacity_liters: int, power_usage: float = None, has_solar: bool = True):
        if power_usage is None:
            power_map = {50: 2.0, 100: 3.0, 150: 4.0}
            power_usage = power_map.get(capacity_liters, 3.0)

        super().__init__(name, power_usage)
        self.capacity_liters = capacity_liters
        self.has_solar = has_solar
        self.temperature = 25

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

    def get_target_column(self):
        key = (self.capacity_liters, self.has_solar)
        column_map = {
            (50, True): "boiler temp for 50 L with solar system",
            (50, False): "boiler temp for 50 L without solar system",
            (100, True): "boiler temp for 100 L with solar system",
            (100, False): "boiler temp for 100 L without solar system",
            (150, True): "boiler temp for 150 L with solar system",
            (150, False): "boiler temp for 150 L without solar system"
        }
        return column_map.get(key)

    def get_temperature(self):
        return self.temperature

    def forecast_6h(self, weather_df: pd.DataFrame) -> list[float]:
        df = weather_df.copy()
        df["month"] = df["date"].dt.month
        df["dayofyear"] = df["date"].dt.dayofyear
        df["hour"] = df["date"].dt.hour

        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
        df["day_sin"] = np.sin(2 * np.pi * df["dayofyear"] / 365)
        df["day_cos"] = np.cos(2 * np.pi * df["dayofyear"] / 365)
        df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
        df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

        # Add boiler temp history or fill 0.0 if missing
        for col in self.expected_features:
            if col.startswith("prev_boiler_temp") and col not in df.columns:
                df[col] = self.get_temperature()

        for col in self.expected_features:
            if col not in df.columns:
                df[col] = 0.0

        df = df.sort_values("date").reset_index(drop=True)
        seq_len = 6
        forecasts = []

        for i in range(len(df) - seq_len + 1):
            input_seq = df[self.expected_features].iloc[i:i+seq_len].astype(np.float32)
            X = np.expand_dims(self.scaler_x.transform(input_seq), axis=0)
            y_pred_scaled = self.model.predict(X, verbose=0)
            y_pred = self.scaler_y.inverse_transform(y_pred_scaled)[0]

            target_col = self.get_target_column()
            target_idx = self.target_columns.index(target_col)
            forecasts.append(y_pred[target_idx])

        return forecasts
