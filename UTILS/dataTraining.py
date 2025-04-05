import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input
from collections import defaultdict
from sklearn.metrics import mean_absolute_error

# Load data
file_path = "Updated_With_Boiler_Hourly_Realistic_v4.csv"
df = pd.read_csv(file_path, parse_dates=["date"])

# One-hot encode weather_description
df = pd.get_dummies(df, columns=["weather_description"])

# Define weather features (after one-hot)
base_weather_features = [
    "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
    "precipitation", "cloud_cover", "wind_speed_10m", "is_day",
    "direct_radiation", "surface_pressure", "weather_code"
]
# Add one-hot columns for weather_description
weather_features = base_weather_features + [col for col in df.columns if col.startswith("weather_description_")]

# Define boiler targets
boiler_targets = {
    "with": [
        "boiler temp for 50 L with solar system",
        "boiler temp for 100 L with solar system",
        "boiler temp for 150 L with solar system"
    ],
    "without": [
        "boiler temp for 50 L without solar system",
        "boiler temp for 100 L without solar system",
        "boiler temp for 150 L without solar system"
    ]
}

# Drop missing values
df = df.dropna(subset=weather_features + boiler_targets["with"] + boiler_targets["without"]).reset_index(drop=True)

# Create day column for split
df["day"] = df["date"].dt.date
unique_days = df["day"].unique()
train_days = unique_days[:int(len(unique_days) * 0.8)]
test_days = unique_days[int(len(unique_days) * 0.8):]

train_df = df[df["day"].isin(train_days)].drop(columns="day")
test_df = df[df["day"].isin(test_days)].drop(columns="day")

# Normalize input features
scaler_x = MinMaxScaler()
X_train = scaler_x.fit_transform(train_df[weather_features])
X_test = scaler_x.transform(test_df[weather_features])

# Reshape to LSTM input
X_train = X_train.reshape((X_train.shape[0], 1, X_train.shape[1]))
X_test = X_test.reshape((X_test.shape[0], 1, X_test.shape[1]))

results = defaultdict(dict)

# Train and predict for each target
for system_type, targets in boiler_targets.items():
    for target in targets:
        print(f"Training model for: {target} ({system_type})")

        scaler_y = MinMaxScaler()
        y_train = scaler_y.fit_transform(train_df[[target]])
        y_test_actual = test_df[[target]].values
        y_test_scaled = scaler_y.transform(test_df[[target]])

        model = Sequential([
            Input(shape=(1, X_train.shape[2])),
            LSTM(50, activation='relu'),
            Dense(1)
        ])
        model.compile(optimizer='adam', loss='mse')
        model.fit(X_train, y_train, epochs=20, verbose=0)

        y_pred_scaled = model.predict(X_test)
        y_pred = scaler_y.inverse_transform(y_pred_scaled)

        df_result = pd.DataFrame({
            "time": test_df["date"].values,
            "Predicted Temperature": y_pred.flatten(),
            "Actual Temperature": y_test_actual.flatten()
        })

        df_result["hour"] = df_result["time"].dt.floor("h")
        df_result["Absolute Error"] = np.abs(df_result["Predicted Temperature"] - df_result["Actual Temperature"])

        hourly_metrics = df_result.groupby("hour").agg({
            "Absolute Error": "mean",
            "Actual Temperature": "mean"
        }).rename(columns={
            "Absolute Error": "Mean Absolute Error",
            "Actual Temperature": "Average Actual Temp"
        })
        hourly_metrics["Error %"] = 100 * hourly_metrics["Mean Absolute Error"] / hourly_metrics["Average Actual Temp"]
        hourly_metrics = hourly_metrics.reset_index()

        df_result = df_result.merge(hourly_metrics, on="hour", how="left")
        df_result.drop(columns=["hour"], inplace=True)

        results[system_type][target] = df_result

# Summary table
summary = []
for system_type, targets in results.items():
    for target, df_result in targets.items():
        mae = mean_absolute_error(df_result["Actual Temperature"], df_result["Predicted Temperature"])
        avg_actual = df_result["Actual Temperature"].mean()
        error_percent = (mae / avg_actual) * 100
        summary.append({
            "System Type": system_type,
            "Target": target,
            "Mean Absolute Error": round(mae, 2),
            "Average Actual Temp": round(avg_actual, 2),
            "Error %": round(error_percent, 2)
        })

summary_df = pd.DataFrame(summary).sort_values(by="Error %")

# Combine all predictions into one table
combined_df = None
for system_type, targets in results.items():
    for target, df_pred in targets.items():
        df_pred = df_pred.copy()
        df_pred["time"] = pd.to_datetime(df_pred["time"]).dt.floor("h")

        col_name_pred = f"{target} - Predicted"
        col_name_actual = f"{target} - Actual"
        col_name_error = f"{target} - Error %"

        reduced_df = df_pred[["time", "Predicted Temperature", "Actual Temperature", "Error %"]].rename(columns={
            "Predicted Temperature": col_name_pred,
            "Actual Temperature": col_name_actual,
            "Error %": col_name_error
        })

        if combined_df is None:
            combined_df = reduced_df
        else:
            reduced_df = reduced_df.drop(columns=["time"])
            combined_df = pd.concat([combined_df.reset_index(drop=True), reduced_df.reset_index(drop=True)], axis=1)

# Export outputs
combined_df.to_csv("boiler_hourly_predictions_ONEHOT.csv", index=False)
summary_df.to_csv("boiler_prediction_summary_ONEHOT.csv", index=False)
print("✅ Files saved: boiler_hourly_predictions_ONEHOT.csv & boiler_prediction_summary_ONEHOT.csv")
