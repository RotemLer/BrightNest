import numpy as np

class BoilerSimulator:
    def __init__(self, boiler_capacity_liters, heater_power_kw, has_solar, num_users, weather_forecast, target_temp=65):
        self.boiler_capacity_liters = boiler_capacity_liters
        self.heater_power_kw = heater_power_kw
        self.has_solar = has_solar
        self.num_users = num_users
        self.weather_forecast = weather_forecast
        self.target_temp = target_temp
        self.hour = 0
        self.boiler_temp = 25  # Starting temp
        self.reset()

    def reset(self, target_temp=None):
        if target_temp is not None:
            self.target_temp = target_temp
        self.hour = 0
        self.boiler_temp = 25 + np.random.uniform(-2, 2)
        return self._get_state()

    def step(self, action):
        outside_temp = self.weather_forecast[self.hour]

        # Simulate solar effect
        if self.has_solar and 8 <= (self.hour % 24) <= 17:
            self.boiler_temp += 0.05 * (outside_temp - self.boiler_temp)

        # Simulate heater
        if action == 1:
            self.boiler_temp += self.heater_power_kw * 0.5

        # Cooling
        self.boiler_temp += 0.02 * (outside_temp - self.boiler_temp)

        # Simulate hot water usage
        if 6 <= (self.hour % 24) <= 8 or 18 <= (self.hour % 24) <= 21:
            self.boiler_temp -= 0.3 * self.num_users

        self.boiler_temp = np.clip(self.boiler_temp, 0, 100)

        reward = self._calculate_reward(action)

        self.hour += 1
        done = self.hour >= len(self.weather_forecast)

        return self._get_state(), reward, done

    def _get_state(self):
        return np.array([
            self.boiler_temp,
            self.weather_forecast[self.hour % len(self.weather_forecast)],
            self.hour % 24,
            int(self.has_solar),
            self.num_users,
            self.boiler_capacity_liters,
            self.target_temp
        ], dtype=np.float32)

    def _calculate_reward(self, action):
        reward = 0
        temp_diff = self.boiler_temp - self.target_temp

        # ענישה על טמפרטורה נמוכה מדי
        if temp_diff < 0:
            reward -= abs(temp_diff) * 0.3

        # תגמול קטן אם בטווח הרצוי
        elif 0 <= temp_diff <= 3:
            reward += 2

        # ענישה על חימום יתר
        elif temp_diff > 10:
            reward -= 3
        else:
            reward -= 0.5

        # ענישה קלה על הדלקת גוף החימום
        if action == 1:
            reward -= 0.5

        # בונוס נוסף לשעות שיא (אם חם מספיק)
        if 18 <= (self.hour % 24) <= 21:
            if self.boiler_temp >= self.target_temp:
                reward += 3
            else:
                reward -= 1  # עונש אם לא הספיק להתחמם

        return reward
