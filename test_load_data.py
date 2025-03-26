import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

# === Load data ===
df = pd.read_csv("Updated_With_Boiler_HomeC.csv", nrows=60000)

# Exact column names
cols = [
    'boiler temp for 150 L with solar system',
    'use [kW]',
    'temperature',
    'humidity',
    'Solar [kW]'
]
df = df[cols].copy()

# 🔍 Debug: See max boiler temp
print("📊 Max boiler temp in this sample:", df['boiler temp for 150 L with solar system'].max())

# === Create target: time_to_60C (TEMPORARY) ===
required_temp = 60
temps = df['boiler temp for 150 L with solar system'].values
time_to_target = [None] * len(temps)
reach_indices = np.where(temps >= required_temp)[0]

for i in range(len(temps)):
    if temps[i] >= required_temp:
        time_to_target[i] = 0
    else:
        future_hits = reach_indices[reach_indices > i]
        if len(future_hits) > 0:
            time_to_target[i] = future_hits[0] - i

df['time_to_60C'] = time_to_target

# Drop invalid rows
df.dropna(inplace=True)
print(f"✅ Rows remaining after dropna(): {len(df)}")

# === Split ===
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

# === Sequence builder ===
def create_sequences(data, seq_len):
    X, y = [], []
    for i in range(len(data) - seq_len):
        X.append(data[i:i+seq_len, :-1])
        y.append(data[i+seq_len, -1])
    return np.array(X), np.array(y)

sequence_length = 24
X_train, y_train = create_sequences(train_scaled, sequence_length)
X_val, y_val = create_sequences(val_scaled, sequence_length)
X_test, y_test = create_sequences(test_scaled, sequence_length)

print(f"🧠 Training samples: {X_train.shape[0]}")

# === Model ===
model = Sequential([
    LSTM(64, input_shape=(X_train.shape[1], X_train.shape[2])),
    Dense(1)
])
model.compile(optimizer='adam', loss='mse')
model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=10, batch_size=32)

# === Predict ===
predictions_scaled = model.predict(X_test)

# === Inverse transform ===
real_preds, real_ys = [], []
for i in range(len(predictions_scaled)):
    dummy_input = np.zeros((1, df.shape[1]))
    dummy_input[0, :-1] = test_scaled[i + sequence_length - 1, :-1]
    dummy_input[0, -1] = predictions_scaled[i][0]
    inv_pred = scaler.inverse_transform(dummy_input)[0, -1]
    real_preds.append(inv_pred)

    dummy_input[0, -1] = y_test[i]
    inv_true = scaler.inverse_transform(dummy_input)[0, -1]
    real_ys.append(inv_true)

# === Output ===
print("\n--- Predicted vs Actual time to reach 60°C (seconds) ---")
for i in range(10):
    print(f"{i+1}) Predicted: {real_preds[i]:.1f} sec, Actual: {real_ys[i]:.1f} sec")
