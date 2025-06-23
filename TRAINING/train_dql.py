import numpy as np
import os
import matplotlib.pyplot as plt
import json
from tensorflow.keras.models import load_model
from tensorflow.keras.optimizers import Adam
from SIM.BoilerSimulator import BoilerSimulator
from AGENTS.dql_agent import DQLAgent
from tqdm import trange
import pandas as pd

# --- Load forecasted outside temperature (optional) ---
weather_forecast = pd.Series(np.random.uniform(10, 30, size=24*7))

# --- Define environment settings ---
boiler_capacity = 100
heater_power_kw = 3.0
has_solar = True
num_users = 2

env = BoilerSimulator(
    boiler_capacity_liters=boiler_capacity,
    heater_power_kw=heater_power_kw,
    has_solar=has_solar,
    num_users=num_users,
    weather_forecast=weather_forecast
)

state_size = env._get_state().shape[0]
action_size = 2
agent = DQLAgent(state_size=state_size, action_size=action_size)

model_path = 'dql_boiler_model.h5'
training_state_path = 'training_state.json'

# --- Force fresh start (optional) ---
for f in [model_path, training_state_path]:
    if os.path.exists(f):
        os.remove(f)


start_episode = 0
best_reward = -np.inf
no_improvement_counter = 0
patience = 30  # Early stopping after 30 episodes without improvement

# --- Load existing model and training state ---
if os.path.exists(model_path):
    print("📂 Existing model found! Loading...")
    agent.model = load_model(model_path, compile=False)
    agent.model.compile(loss='mse', optimizer=Adam(learning_rate=0.0005))
    agent.update_target_model()

    if os.path.exists(training_state_path):
        with open(training_state_path, 'r') as f:
            state_data = json.load(f)
            start_episode = state_data.get('episodes_trained', 0)
            agent.epsilon = state_data.get('epsilon', 1.0)
        print(f"↺ Continuing training from episode {start_episode} with epsilon {agent.epsilon:.2f}")
else:
    print("🔎 Starting fresh training.")

# --- Training settings ---
n_episodes = 50
episode_length = 24  # one day
batch_size = 32
rewards_per_episode = []

# --- Training loop ---
for e in trange(start_episode, n_episodes, desc="Training episodes"):
    random_target_temp = np.random.randint(60, 70)
    state = env.reset(target_temp=random_target_temp)
    total_episode_reward = 0

    for time in range(episode_length):
        action = agent.act(state)
        next_state, reward, done = env.step(action)
        agent.remember(state, action, reward, next_state, done)
        state = next_state
        total_episode_reward += reward

        if time % 20 == 0:  # 🔽 Replay less frequent
            agent.replay(batch_size)

    if e % 5 == 0:
        agent.update_target_model()

    rewards_per_episode.append(total_episode_reward)

    if (e + 1) % 10 == 0:
        agent.model.save(model_path)
        with open(training_state_path, 'w') as f:
            json.dump({
                "episodes_trained": e + 1,
                "epsilon": agent.epsilon
            }, f)

    if total_episode_reward > best_reward:
        best_reward = total_episode_reward
        no_improvement_counter = 0
        print(f"⭐ New best reward: {best_reward:.2f} at episode {e+1}")
    else:
        no_improvement_counter += 1

    if no_improvement_counter >= patience:
        print(f"⏹ Early stopping triggered after {patience} episodes without improvement!")
        break

    if (e + 1) % 5 == 0:
        print(f"Episode {e+1}/{n_episodes} - Total Reward: {total_episode_reward:.2f} - Epsilon: {agent.epsilon:.2f}")

final_episode = start_episode + len(rewards_per_episode)
print(f"✅ Training finished successfully at episode {final_episode}!")

# --- Plot rewards ---
plt.plot(rewards_per_episode)
plt.title("Total Reward per Episode")
plt.xlabel("Episode")
plt.ylabel("Total Reward")
plt.grid()
plt.show()
