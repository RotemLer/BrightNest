import pandas as pd  # Ensure 'pandas' library is installed: pip install pandas
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from sklearn.metrics import mean_absolute_error

# === Load data ===
df = pd.read_csv("Updated_With_Boiler_HomeC.csv", nrows=60000)

# Columns used in model
cols = [
    'boiler temp for 150 L with solar system',
    'use [kW]',
    'Solar [kW]',
    'cloudCover',
    'humidity',
    'windSpeed'
]

df = df[cols].copy()

# === Real-world based time-to-66C estimation ===
current_temp = df['boiler temp for 150 L with solar system']
effective_power = (
    1.2 * df['use [kW]'] +
    1.5 * df['Solar [kW]'] -
    0.5 * df['cloudCover'] -
    0.3 * df['humidity'] -
    0.3 * df['windSpeed']
)

# Avoid division by zero or negative rates
effective_power = effective_power.clip(lower=0.01)

# Compute time in seconds
df['time_to_66C'] = (66 - current_temp) / effective_power * 60
df = df[df['time_to_66C'] > 0]  # keep only valid rows

print(f"✅ Final usable rows: {len(df)}")

# === Train / Val / Test Split ===
n = len(df)
train_end = int(n * 0.5)
val_end = int(n * 0.75)

df_train = df.iloc[:train_end]
df_val = df.iloc[train_end:val_end]
df_test = df.iloc[val_end:]

# === Normalize ===
scaler = MinMaxScaler()
scaler.fit(df_train)

train_scaled = scaler.transform(df_train)
val_scaled = scaler.transform(df_val)
test_scaled = scaler.transform(df_test)

# === Create sequences ===
def create_sequences(data, seq_len):
    X, y = [], []
    for i in range(len(data) - seq_len):
        X.append(data[i:i+seq_len, :-1])
        y.append(data[i+seq_len, -1])
    return np.array(X), np.array(y)

seq_len = 24
X_train, y_train = create_sequences(train_scaled, seq_len)
X_val, y_val = create_sequences(val_scaled, seq_len)
X_test, y_test = create_sequences(test_scaled, seq_len)

print(f"🧠 Training sequences: {X_train.shape[0]}")

# === LSTM Model ===
model = Sequential([
    LSTM(64, input_shape=(X_train.shape[1], X_train.shape[2])),
    Dense(1)
])
model.compile(optimizer='adam', loss='mae')
model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=10, batch_size=32)

# === Predict ===
pred_scaled = model.predict(X_test)

# === Inverse transform ===
real_preds, real_ys = [], []
for i in range(len(pred_scaled)):
    dummy = np.zeros((1, df.shape[1]))
    dummy[0, :-1] = test_scaled[i + seq_len - 1, :-1]
    dummy[0, -1] = pred_scaled[i][0]
    inv_pred = scaler.inverse_transform(dummy)[0, -1]
    real_preds.append(inv_pred)

    dummy[0, -1] = y_test[i]
    inv_true = scaler.inverse_transform(dummy)[0, -1]
    real_ys.append(inv_true)

# === Format seconds into hh:mm:ss ===
def format_hms(sec):
    h = int(sec) // 3600
    m = (int(sec) % 3600) // 60
    s = int(sec) % 60
    return f"{h:02}:{m:02}:{s:02}"

# === Show Results ===
print("\n--- Predicted vs Actual time to reach 66°C (hh:mm:ss) ---")
for i in range(10):
    print(f"{i+1}) Predicted: {format_hms(real_preds[i])}, Actual: {format_hms(real_ys[i])}")

# === Evaluate error ===
mae = mean_absolute_error(real_ys, real_preds)
print(f"\n📊 Mean Absolute Error: {mae:.2f} seconds")
