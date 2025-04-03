import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input
from collections import defaultdict
from sklearn.metrics import mean_absolute_error

# Load data
file_path = "C:\\Studies\\final project\\project\\generateDataSet\\Hourly_HomeC.csv.gz"
df = pd.read_csv(file_path, compression="gzip", parse_dates=["time"])

# Define columns
weather_features = [
    "temperature", "humidity", "visibility", "apparentTemperature", "pressure",
    "windSpeed", "cloudCover", "windBearing", "precipIntensity", "dewPoint",
    "precipProbability", "Solar [kW]"
]

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

# Split to train (first 3 days = 72 rows) and test
train_df = df.iloc[:72]
test_df = df.iloc[72:]

# Normalize input features
scaler_x = MinMaxScaler()
X_train = scaler_x.fit_transform(train_df[weather_features])
X_test = scaler_x.transform(test_df[weather_features])

# Reshape for LSTM (samples, time_steps, features)
X_train = X_train.reshape((X_train.shape[0], 1, X_train.shape[1]))
X_test = X_test.reshape((X_test.shape[0], 1, X_test.shape[1]))

results = defaultdict(dict)

# Train and predict
for system_type, targets in boiler_targets.items():
    for target in targets:
        print(f"Training model for: {target} ({system_type})")

        scaler_y = MinMaxScaler()
        y_train = scaler_y.fit_transform(train_df[[target]])
        y_test_actual = test_df[[target]].values
        y_test_scaled = scaler_y.transform(test_df[[target]])

        model = Sequential()
        model.add(Input(shape=(1, X_train.shape[2])))
        model.add(LSTM(50, activation='relu'))
        model.add(Dense(1))
        model.compile(optimizer='adam', loss='mse')

        model.fit(X_train, y_train, epochs=20, verbose=0)

        y_pred_scaled = model.predict(X_test)
        y_pred = scaler_y.inverse_transform(y_pred_scaled)

        df_result = pd.DataFrame({
            "time": test_df["time"].values,
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

# Create summary
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

summary_df = pd.DataFrame(summary)
summary_df = summary_df.sort_values(by="Error %")

# Merge all predictions to one table
combined_df = test_df[["time"]].copy().drop_duplicates().reset_index(drop=True)

for system_type, targets in results.items():
    for target, df_pred in targets.items():
        col_name_pred = f"{target} - Predicted"
        col_name_actual = f"{target} - Actual"
        col_name_error = f"{target} - Error %"

        reduced_df = df_pred[["time", "Predicted Temperature", "Actual Temperature", "Error %"]].copy()
        reduced_df = reduced_df.rename(columns={
            "Predicted Temperature": col_name_pred,
            "Actual Temperature": col_name_actual,
            "Error %": col_name_error
        })

        combined_df = combined_df.merge(reduced_df, on="time", how="left")

# Export files
combined_df.to_csv("boiler_all_predictions_by_hour.csv", index=False)
summary_df.to_csv("boiler_prediction_summary.csv", index=False)
print("✅ Combined hourly predictions exported to: boiler_all_predictions_by_hour.csv")
