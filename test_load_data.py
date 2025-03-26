import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense

# Load your dataset
df = pd.read_csv("Updated_With_Boiler_HomeC.csv.gz")

# Keep only the needed columns (feel free to tweak later)
df = df[['temperature', 'cloudCover', 'use [kW]', 'humidity', 'Solar [kW]',
         ' for 150L boiler without solar system']]

# Clean nulls
df.dropna(inplace=True)

# Use a small slice for testing
df = df.iloc[:2000]

# Normalize
scaler = MinMaxScaler()
scaled = scaler.fit_transform(df)

# Create LSTM sequences
def create_sequences(data, seq_len):
    X, y = [], []
    for i in range(len(data) - seq_len):
        X.append(data[i:i+seq_len, :-1])  # all features except last column (target)
        y.append(data[i+seq_len, -1])     # only the target column
    return np.array(X), np.array(y)

sequence_length = 24
X, y = create_sequences(scaled, sequence_length)

# Define the model
model = Sequential([
    LSTM(64, input_shape=(X.shape[1], X.shape[2])),
    Dense(1)
])
model.compile(optimizer='adam', loss='mse')

# Train
model.fit(X, y, epochs=10, batch_size=16)

# Predict
preds_scaled = model.predict(X)

# Inverse transform predictions and actual values
real_preds = []
real_ys = []

for i in range(len(preds_scaled)):
    temp_input = np.zeros((1, df.shape[1]))
    temp_input[0, :-1] = scaled[i + sequence_length - 1, :-1]
    temp_input[0, -1] = preds_scaled[i][0]
    inv_pred = scaler.inverse_transform(temp_input)[0, -1]
    real_preds.append(inv_pred)

    temp_input[0, -1] = y[i]
    inv_true = scaler.inverse_transform(temp_input)[0, -1]
    real_ys.append(inv_true)

# Plot
plt.figure(figsize=(12, 5))
plt.plot(real_ys, label='Actual')
plt.plot(real_preds, label='Predicted', alpha=0.7)
plt.title("Predicted vs Actual Energy Usage")
plt.xlabel("Time Steps")
plt.ylabel("kWh")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
