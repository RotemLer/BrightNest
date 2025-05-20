import pandas as pd
import numpy as np
import time
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input
from tensorflow.keras.callbacks import EarlyStopping
import joblib  # For saving scalers

start_time = time.time()

# === 1. Load CSV ===
df = pd.read_csv("Updated_With_Boiler_Hourly_Realistic_v4.csv", parse_dates=["date"])

# === 2. Define targets ===
target_columns = [
    "boiler temp for 50 L with solar system",
    "boiler temp for 50 L without solar system",
    "boiler temp for 100 L with solar system",
    "boiler temp for 100 L without solar system",
    "boiler temp for 150 L with solar system",
    "boiler temp for 150 L without solar system"
]

# נניח שזו הטמפרטורה שתרצי שהמודל יידע עליה מהעבר (שעה אחורה):
reference_column = "boiler temp for 100 L without solar system"

# יוצרים עמודה חדשה שמכילה את הטמפ בשעה הקודמת
# === Add previous boiler temperatures for each configuration ===
df["prev_boiler_temp_50_solar"]       = df["boiler temp for 50 L with solar system"].shift(1)
df["prev_boiler_temp_50_no_solar"]    = df["boiler temp for 50 L without solar system"].shift(1)
df["prev_boiler_temp_100_solar"]      = df["boiler temp for 100 L with solar system"].shift(1)
df["prev_boiler_temp_100_no_solar"]   = df["boiler temp for 100 L without solar system"].shift(1)
df["prev_boiler_temp_150_solar"]      = df["boiler temp for 150 L with solar system"].shift(1)
df["prev_boiler_temp_150_no_solar"]   = df["boiler temp for 150 L without solar system"].shift(1)



# === 3. Add seasonal + hourly features ===
df["month"] = df["date"].dt.month
df["dayofyear"] = df["date"].dt.dayofyear
df["hour"] = df["date"].dt.hour

df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
df["day_sin"] = np.sin(2 * np.pi * df["dayofyear"] / 365)
df["day_cos"] = np.cos(2 * np.pi * df["dayofyear"] / 365)
df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24)
df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24)

# === 4. Define base features ===
base_features = [
    "temperature_2m", "relative_humidity_2m", "dew_point_2m", "apparent_temperature",
    "precipitation", "cloud_cover", "wind_speed_10m", "is_day",
    "direct_radiation", "surface_pressure", "weather_code", "weather_description",
    "month_sin", "month_cos", "day_sin", "day_cos",
    "hour_sin", "hour_cos"
]

# === 5. Drop NaNs ===
prev_temp_cols = [
    "prev_boiler_temp_50_solar",
    "prev_boiler_temp_50_no_solar",
    "prev_boiler_temp_100_solar",
    "prev_boiler_temp_100_no_solar",
    "prev_boiler_temp_150_solar",
    "prev_boiler_temp_150_no_solar"
]

df = df.dropna(subset=base_features + target_columns + prev_temp_cols).reset_index(drop=True)

# === 6. Limit weather_description to top 10 ===
top_k = 10
top_weather = df["weather_description"].value_counts().nlargest(top_k).index
df["weather_description"] = df["weather_description"].where(df["weather_description"].isin(top_weather), "Other")

# === 7. One-hot encode weather_description only ===
df = pd.get_dummies(df, columns=["weather_description"])

# === 8. Split into train/val/test by day ===
df["day"] = df["date"].dt.date
unique_days = df["day"].unique()
n_days = len(unique_days)
train_days = unique_days[:int(n_days * 0.7)]
val_days = unique_days[int(n_days * 0.7):int(n_days * 0.85)]
test_days = unique_days[int(n_days * 0.85):]

train_df = df[df["day"].isin(train_days)].drop(columns="day")
val_df = df[df["day"].isin(val_days)].drop(columns="day")
test_df = df[df["day"].isin(test_days)].drop(columns="day")

# === 9. Create consistent feature list from TRAIN only ===
columns_to_exclude = target_columns + ["date"]
features = sorted([col for col in train_df.columns if col not in columns_to_exclude])
features += prev_temp_cols


# === 10. Add missing feature columns to val/test (with 0s) ===
for col in features:
    for part in [val_df, test_df]:
        if col not in part.columns:
            part[col] = 0.0

# === 11. Normalize ===
scaler_x = MinMaxScaler()
X_train_raw = scaler_x.fit_transform(train_df[features])
X_val_raw = scaler_x.transform(val_df[features])
X_test_raw = scaler_x.transform(test_df[features])

scaler_y = MinMaxScaler()
y_train_raw = scaler_y.fit_transform(train_df[target_columns])
y_val_raw = scaler_y.transform(val_df[target_columns])
y_test_actual = test_df[target_columns].values

# === Save scalers ===
joblib.dump(scaler_x, "../scaler_x.save")
joblib.dump(scaler_y, "../scaler_y.save")
print("💾 Saved scaler_x.save and scaler_y.save")

# === 12. Rebuild scaled DataFrames ===
train_df_scaled = pd.DataFrame(X_train_raw, columns=features)
val_df_scaled = pd.DataFrame(X_val_raw, columns=features)
test_df_scaled = pd.DataFrame(X_test_raw, columns=features)

# הוספת עמודות היעד (y) בצורה בטוחה ומדויקת
train_df_scaled = pd.concat([
    train_df_scaled,
    pd.DataFrame(y_train_raw, columns=target_columns, index=train_df_scaled.index)
], axis=1)

val_df_scaled = pd.concat([
    val_df_scaled,
    pd.DataFrame(y_val_raw, columns=target_columns, index=val_df_scaled.index)
], axis=1)

test_df_scaled = pd.concat([
    test_df_scaled,
    pd.DataFrame(y_test_actual, columns=target_columns, index=test_df_scaled.index)
], axis=1)


# === ✅ 13. DEBUG: check alignment ===
for df_name, df_part in [("train", train_df_scaled), ("val", val_df_scaled), ("test", test_df_scaled)]:
    df_cols = df_part.columns.tolist()
    for col in features:
        if col not in df_cols:
            raise ValueError(f"❌ {col} missing in {df_name}_df_scaled")

# === 14. Robust Sequence Creation ===
def create_sequences(df, feature_cols, target_cols, seq_len=6):
    X_seq, y_seq = [], []
    feature_data = df[feature_cols].values
    target_data = df[target_cols].values
    for i in range(seq_len, len(df)):
        X_seq.append(feature_data[i-seq_len:i])
        y_seq.append(target_data[i])
    return np.array(X_seq), np.array(y_seq)

# === 15. Generate Sequences ===
SEQUENCE_LENGTH = 6
X_train, y_train = create_sequences(train_df_scaled, features, target_columns, SEQUENCE_LENGTH)
X_val, y_val = create_sequences(val_df_scaled, features, target_columns, SEQUENCE_LENGTH)
X_test, y_test_actual_seq = create_sequences(test_df_scaled, features, target_columns, SEQUENCE_LENGTH)

# === 16. Build and train model ===
model = Sequential([
    Input(shape=(SEQUENCE_LENGTH, X_train.shape[2])),
    LSTM(50, activation='relu'),
    Dense(len(target_columns))
])
model.compile(optimizer='adam', loss='mse')
early_stop = EarlyStopping(monitor='val_loss', patience=3, restore_best_weights=True)

model.fit(X_train, y_train, epochs=50, validation_data=(X_val, y_val), callbacks=[early_stop], verbose=1)

# === 📊 Plot training vs validation loss ===
history = model.history.history
plt.figure(figsize=(10, 6))
plt.plot(history["loss"], label="Training Loss", marker='o')
plt.plot(history["val_loss"], label="Validation Loss", marker='o')
plt.title("Training vs Validation Loss")
plt.xlabel("Epoch")
plt.ylabel("MSE Loss")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.savefig("training_loss_plot.png")
plt.close()

print("📈 Training vs validation loss plot saved as training_loss_plot.png")

# === 17. Save model ===
model.save("boiler_temperature_multitarget_lstm6h.h5")
print("✅ Model saved as boiler_temperature_multitarget_lstm6h.h5")

# === 18. Predict and inverse scale ===
y_pred_scaled = model.predict(X_test)
y_pred = scaler_y.inverse_transform(y_pred_scaled)

# === 19. Save predictions ===
df_result = pd.DataFrame({
    "time": test_df["date"].iloc[SEQUENCE_LENGTH:SEQUENCE_LENGTH+len(y_pred)].values
})
for i, target in enumerate(target_columns):
    df_result[f"{target} - Actual"] = y_test_actual_seq[:, i]
    df_result[f"{target} - Predicted"] = y_pred[:, i]
    df_result[f"{target} - Error %"] = 100 * np.abs(y_pred[:, i] - y_test_actual_seq[:, i]) / y_test_actual_seq[:, i]

df_result.to_csv("boiler_multitarget_predictions.csv", index=False)
print("📁 Predictions saved to boiler_multitarget_predictions.csv")

# === 20. Save error distribution ===
error_summary = {}
for target in target_columns:
    err_col = f"{target} - Error %"
    if err_col in df_result.columns:
        s = df_result[err_col]
        error_summary[target] = {
            "Mean Error (%)": s.mean(),
            "Std Error (%)": s.std(),
            "Median Error (%)": s.median(),
            "Min Error (%)": s.min(),
            "Max Error (%)": s.max()
        }

error_df = pd.DataFrame(error_summary).T
error_df.to_csv("boiler_prediction_error_distribution.csv")
print("📊 Error summary saved to boiler_prediction_error_distribution.csv")

# === 21. Report time ===
end_time = time.time()
print(f"🕒 Total training time: {end_time - start_time:.2f} seconds")