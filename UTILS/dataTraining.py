import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.metrics import mean_absolute_error

# Load and prepare data
df = pd.read_csv("Updated_With_Boiler_Hourly_Realistic_v4.csv", parse_dates=["date"])
df = pd.get_dummies(df, columns=["weather_description"])

base_features = [
    "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
    "precipitation", "cloud_cover", "wind_speed_10m", "is_day",
    "direct_radiation", "surface_pressure", "weather_code"
]
one_hot_features = [col for col in df.columns if col.startswith("weather_description_")]
features = base_features + one_hot_features

targets = [
    "boiler temp for 50 L with solar system",
    "boiler temp for 50 L without solar system",
    "boiler temp for 100 L with solar system",
    "boiler temp for 100 L without solar system",
    "boiler temp for 150 L with solar system",
    "boiler temp for 150 L without solar system"
]

# Drop NA
df = df.dropna(subset=features + targets).reset_index(drop=True)

# Add day column
df["day"] = df["date"].dt.date

# Split train / val / test by unique days
unique_days = df["day"].unique()
n_days = len(unique_days)
train_days = unique_days[:int(n_days * 0.7)]
val_days = unique_days[int(n_days * 0.7):int(n_days * 0.85)]
test_days = unique_days[int(n_days * 0.85):]

train_df = df[df["day"].isin(train_days)].drop(columns="day")
val_df = df[df["day"].isin(val_days)].drop(columns="day")
test_df = df[df["day"].isin(test_days)].drop(columns="day")

# Normalize inputs
scaler_x = MinMaxScaler()
X_train = scaler_x.fit_transform(train_df[features])
X_val = scaler_x.transform(val_df[features])
X_test = scaler_x.transform(test_df[features])

X_train = X_train.reshape((X_train.shape[0], 1, X_train.shape[1]))
X_val = X_val.reshape((X_val.shape[0], 1, X_val.shape[1]))
X_test = X_test.reshape((X_test.shape[0], 1, X_test.shape[1]))

# Normalize outputs
scaler_y = MinMaxScaler()
y_train = scaler_y.fit_transform(train_df[targets])
y_val = scaler_y.transform(val_df[targets])
y_test_actual = test_df[targets].values

# Define and train model
model = Sequential([
    Input(shape=(1, X_train.shape[2])),
    LSTM(50, activation='relu'),
    Dense(len(targets))
])
model.compile(optimizer='adam', loss='mse')

early_stop = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)

model.fit(
    X_train, y_train,
    epochs=50,
    validation_data=(X_val, y_val),
    callbacks=[early_stop],
    verbose=1
)

# Save the trained model
model.save("boiler_temperature_multitarget.h5")

# Predict and inverse-scale
y_pred_scaled = model.predict(X_test)
y_pred = scaler_y.inverse_transform(y_pred_scaled)

# Create results DataFrame
df_result = pd.DataFrame({
    "time": test_df["date"].values
})
for i, target in enumerate(targets):
    df_result[f"{target} - Actual"] = y_test_actual[:, i]
    df_result[f"{target} - Predicted"] = y_pred[:, i]
    df_result[f"{target} - Error %"] = 100 * np.abs(y_pred[:, i] - y_test_actual[:, i]) / y_test_actual[:, i]

# Add hour column for grouping
df_result["hour"] = pd.to_datetime(df_result["time"]).dt.floor("h")

# Compute per-hour summary
summary_rows = []
for target in targets:
    hourly = df_result.groupby("hour").agg({
        f"{target} - Actual": "mean",
        f"{target} - Error %": "mean"
    }).rename(columns={
        f"{target} - Actual": "Average Actual Temp",
        f"{target} - Error %": "Mean Error %"
    }).reset_index()
    hourly["Target"] = target
    summary_rows.append(hourly)

summary_df = pd.concat(summary_rows, ignore_index=True)

# Export results
df_result.drop(columns=["hour"]).to_csv("boiler_multitarget_predictions.csv", index=False)
summary_df.to_csv("boiler_multitarget_summary.csv", index=False)

print("✅ Model saved as boiler_temperature_multitarget.h5")
print("📁 CSV files created: boiler_multitarget_predictions.csv + boiler_multitarget_summary.csv")
