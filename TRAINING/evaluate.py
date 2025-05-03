import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from tensorflow.keras.models import load_model
from SIM.BoilerSimulator import BoilerSimulator

# --- Load trained model ---
model_path = 'dql_boiler_model.h5'
model = load_model(model_path, compile=False)

# --- Create environment for evaluation ---
# You can change the settings here to simulate different boilers
weather_forecast = pd.Series(np.random.uniform(10, 30, size=24*7))  # 7 days of hourly forecasts

env = BoilerSimulator(
    boiler_capacity_liters=100,
    heater_power_kw=3.0,
    has_solar=True,
    num_users=2,
    weather_forecast=weather_forecast
)

# --- Evaluation settings ---
episode_length = 24 * 7  # Simulate 7 days
state = env.reset()

# --- Tracking metrics ---
total_reward = 0
successful_hot_water_hours = 0
total_target_hours = 0
total_heating_actions = 0

rewards = []

# --- Evaluate loop ---
for t in range(episode_length):
    q_values = model.predict(state[np.newaxis, :], verbose=0)[0]
    action = np.argmax(q_values)  # Choose best action
    next_state, reward, done = env.step(action)

    # Track stats
    total_reward += reward
    rewards.append(total_reward)

    if 18 <= env.hour <= 21:  # Target hours
        total_target_hours += 1
        if env.boiler_temp >= 40:
            successful_hot_water_hours += 1

    if action == 1:
        total_heating_actions += 1

    state = next_state

# --- Print results ---
print("✅ Evaluation finished!")
print(f"🎯 Total Reward: {total_reward:.2f}")
print(f"🔥 Successful hot water supply rate: {(successful_hot_water_hours / total_target_hours) * 100:.2f}%")
print(f"⚡ Total heating actions taken: {total_heating_actions}")

# --- Plot reward progress ---
plt.plot(rewards)
plt.title("Reward Progress During Evaluation")
plt.xlabel("Timestep (hour)")
plt.ylabel("Cumulative Reward")
plt.grid()
plt.show()