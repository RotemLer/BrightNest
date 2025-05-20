import numpy as np
import pandas as pd
from keras.src.losses import MeanSquaredError
from tensorflow.keras.models import load_model
import joblib

class BoilerForecastManager:
    def __init__(self, model_path, scaler_x_path, scaler_y_path, features, target_columns):
        self.model = model = load_model(model_path, custom_objects={'mse': MeanSquaredError()}, compile=True)
        self.scaler_x = joblib.load(scaler_x_path)
        self.scaler_y = joblib.load(scaler_y_path)
        self.features = features
        self.target_columns = target_columns

    def predict_next_6_hours(self, df_recent):
        predictions = []
        df_seq = df_recent.copy()

        for _ in range(6):
            X_input = self.scaler_x.transform(df_seq[self.features])
            X_input = X_input.reshape((1, 6, len(self.features)))
            y_pred_scaled = self.model.predict(X_input, verbose=0)
            y_pred = self.scaler_y.inverse_transform(y_pred_scaled)[0]
            predictions.append(y_pred)

            next_row = df_seq.iloc[-1:].copy()
            for i, col in enumerate(self.target_columns):
                tank = col.split(" ")[3]
                solar = "solar" if "with solar system" in col else "no_solar"
                key = f"prev_boiler_temp_{tank}_{solar}"
                next_row[key] = y_pred[i]

            next_row["hour"] = (next_row["hour"] + 1) % 24
            next_row["hour_sin"] = np.sin(2 * np.pi * next_row["hour"] / 24)
            next_row["hour_cos"] = np.cos(2 * np.pi * next_row["hour"] / 24)

            df_seq = pd.concat([df_seq.iloc[1:], next_row], ignore_index=True)

        return pd.DataFrame(predictions, columns=self.target_columns)

