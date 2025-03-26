import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

# === Load the first 30,000 rows and select relevant columns ===
df = pd.read_csv("Updated_With_Boiler_HomeC.csv", nrows=30000)

# Use exact real column names from your CSV
cols = [
    'boiler temp for 150 L with solar system',
    'use [kW]',
    'temperature',
    'humidity',
    'Solar [kW]'
]

# Filter down to the 5 columns we need
df = df[cols].copy()

# === Create target: time_to_66C ===
required_temp = 66
temps = df['boiler temp for 150 L with solar system'].values
time_to_66C = [None] * len(temps)

# Get all indices where temp ≥ 66
reach_indices = np.where(temps >= required_temp)[0]

# For each row, find how long it takes to reach 66°C
for i in range(len(temps)):
    if temps[i] >= required_temp:
        time_to_66C[i] = 0
    else:
        future_hits = reach_indices[reach_indices > i]
        if len(future_hits) > 0:
            time_to_66C[i] = future_hits[0] - i

# Add the calculated target column
df['time_to_66C'] = time_to_66C

# Drop rows with missing values
df.dropna(inplace=True)

# Debug print
print(f"✅ Rows remaining after dropna(): {len(df)}")

# === Split into Train / Validation / Test ===
n = len(df)
train_end = int(n * 0.5)
val_end = int(n * 0.75)

df_train = df.iloc[:train_end]
df_val = df.iloc[train_end:val_end]
df_test = df.iloc[val_end:]

# === Normalize using MinMaxScaler ===
scaler = MinMaxScaler()
scaler.fit(df_train)

train_scaled = scaler.transform(df_train)
val_scaled = scaler.transform(df_val)
test_scaled = scaler.transform(df_test)

# === Create sequences ===
def create_sequences(data, seq_len):
    X, y = [], []
    for i in range(len(data) - seq_len):
        X.append(data[i:i+seq_len, :-1])  # Inputs (all but target)
        y.append(data[i+seq_len, -1])     # Target is at +1 step
    return np.array(X), np.array(y)

sequence_length = 24
X_train, y_train = create_sequences(train_scaled, sequence_length)
X_val, y_val = create_sequences(val_scaled, sequence_length)
X_test, y_test = create_sequences(test_scaled, sequence_length)

print(f"🧠 Training on {X_train.shape[0]} sequences")

# === Define and train LSTM model ===
model = Sequential([
    LSTM(64, input_shape=(X_train.shape[1], X_train.shape[2])),
    Dense(1)
])
model.compile(optimizer='adam', loss='mse')
model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=10, batch_size=32)

# === Predict on test set ===
predictions_scaled = model.predict(X_test)

# === Inverse transform predictions and actuals ===
real_preds = []
real_ys = []

for i in range(len(predictions_scaled)):
    dummy_input = np.zeros((1, df.shape[1]))
    dummy_input[0, :-1] = test_scaled[i + sequence_length - 1, :-1]
    dummy_input[0, -1] = predictions_scaled[i][0]
    inv_pred = scaler.inverse_transform(dummy_input)[0, -1]
    real_preds.append(inv_pred)

    dummy_input[0, -1] = y_test[i]
    inv_true = scaler.inverse_transform(dummy_input)[0, -1]
    real_ys.append(inv_true)

# === Print first 10 predicted vs actual values ===
print("\n--- Predicted vs Actual time to reach 66°C (seconds) ---")
for i in range(10):
    print(f"{i+1}) Predicted: {real_preds[i]:.1f} sec, Actual: {real_ys[i]:.1f} sec")
