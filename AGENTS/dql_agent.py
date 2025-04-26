import numpy as np
import random
from collections import deque
from tensorflow.keras import models, layers, optimizers

class DQLAgent:
    def __init__(self, state_size, action_size):
        self.state_size = state_size
        self.action_size = action_size
        self.memory = deque(maxlen=5000)  # קצת יותר גדול
        self.gamma = 0.99  # ערך עדכון עתידי חזק יותר (יותר עומק בחיזוי)
        self.epsilon = 1.0
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.learning_rate = 0.0005  # נמוך יותר, ללמוד יותר מדויק
        self.model = self._build_model()
        self.target_model = self._build_model()
        self.update_target_model()

    def _build_model(self):
        model = models.Sequential()
        model.add(layers.Input(shape=(self.state_size,)))
        model.add(layers.Dense(128, activation='relu'))  # יותר נוירונים
        model.add(layers.Dense(128, activation='relu'))
        model.add(layers.Dense(self.action_size, activation='linear'))
        model.compile(loss='mse', optimizer=optimizers.Adam(learning_rate=self.learning_rate))
        return model

    def update_target_model(self):
        """Copy weights to target network"""
        self.target_model.set_weights(self.model.get_weights())

    def remember(self, state, action, reward, next_state, done):
        """Store experience tuple"""
        self.memory.append((state, action, reward, next_state, done))

    def act(self, state):
        """Choose action with epsilon-greedy"""
        if np.random.rand() <= self.epsilon:
            return random.randrange(self.action_size)
        q_values = self.model.predict(state[np.newaxis, :], verbose=0)[0]
        return np.argmax(q_values)

    def replay(self, batch_size):
        """Train the network using random minibatches"""
        if len(self.memory) < batch_size:
            return

        minibatch = random.sample(self.memory, batch_size)

        states = np.zeros((batch_size, self.state_size))
        targets = np.zeros((batch_size, self.action_size))

        for i, (state, action, reward, next_state, done) in enumerate(minibatch):
            states[i] = state
            target = self.model.predict(state[np.newaxis, :], verbose=0)[0]

            if done:
                target[action] = reward
            else:
                t = self.target_model.predict(next_state[np.newaxis, :], verbose=0)[0]
                target[action] = reward + self.gamma * np.amax(t)

            targets[i] = target

        self.model.fit(states, targets, epochs=1, verbose=0, batch_size=batch_size)

        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay