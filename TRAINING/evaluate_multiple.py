import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from tensorflow.keras.models import load_model
from SIM.BoilerSimulator import BoilerSimulator
from tqdm import tqdm

model_path = 'dql_boiler_model.h5'
model = load_model(model_path, compile=False)

target_temp = 68

scenarios = []
for capacity in [50, 100, 150]:
    for has_solar in [False, True]:
        for num_users in [1, 2, 3]:
            scenarios.append({
                "capacity": capacity,
                "has_solar": has_solar,
                "num_users": num_users
            })

results = []

for scenario in tqdm(scenarios, desc="Evaluating scenarios"):
    weather_forecast = pd.Series(np.random.uniform(5, 35, size=24*7))
    env = BoilerSimulator(
        boiler_capacity_liters=scenario["capacity"],
        heater_power_kw=2.0 if scenario["capacity"] == 50 else 3.0 if scenario["capacity"] == 100 else 4.0,
        has_solar=scenario["has_solar"],
        num_users=scenario["num_users"],
        weather_forecast=weather_forecast,
        target_temp=target_temp
    )

    state = env.reset()
    total_reward = 0
    successful_hot_water_hours = 0
    total_target_hours = 0
    total_heating_actions = 0

    episode_length = 24 * 7

    for t in range(episode_length):
        q_values = model.predict(state[np.newaxis, :], verbose=0)[0]
        action = np.argmax(q_values)
        next_state, reward, done = env.step(action)

        total_reward += reward

        if 18 <= env.hour <= 21:
            total_target_hours += 1
            if env.boiler_temp >= target_temp:
                successful_hot_water_hours += 1

        if action == 1:
            total_heating_actions += 1

        state = next_state

    success_rate = (successful_hot_water_hours / total_target_hours) * 100 if total_target_hours > 0 else 0

    results.append({
        "Boiler Capacity (L)": scenario["capacity"],
        "Has Solar": scenario["has_solar"],
        "Number of Users": scenario["num_users"],
        "Total Reward": total_reward,
        "Success Rate (%)": success_rate,
        "Total Heating Actions": total_heating_actions
    })

results_df = pd.DataFrame(results)

print("\n📊 Evaluation Results Summary:")
print(results_df)
results_df.to_csv("evaluation_results_summary.csv", index=False)
print("✅ Results saved to evaluation_results_summary.csv")

plt.figure(figsize=(10, 6))
plt.barh(results_df.index, results_df["Success Rate (%)"])
plt.yticks(results_df.index, [
    f"{row['Boiler Capacity (L)']}L | {'Solar' if row['Has Solar'] else 'No Solar'} | {row['Number of Users']} Users"
    for _, row in results_df.iterrows()
])
plt.xlabel("Success Rate (%)")
plt.title(f"Hot Water Success Rate (>={target_temp}°C) per Scenario")
plt.grid()
plt.tight_layout()
plt.show()