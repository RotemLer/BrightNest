# 💡 BrightNest – Smart Boiler Management System

A full-stack React + Flask application for managing home water heating intelligently. The system allows manual and automatic control of an electric boiler, personal shower scheduling for each household member, and real-time temperature forecasting based on weather data.

---

## 🚀 Installation & Running the Project

### Frontend (React)
```bash
cd UI
npm install
npm start
```

### Backend (Flask)
```bash
cd Backend
pip install -r requirements.txt
python app.py
```

> By default, the frontend runs on `localhost:3000` and the backend on `localhost:5000`. Communication is handled via secure fetch requests (with JWT).

---

## 🏗️ Basic Frontend Architecture

```
UI/
├── components/
│   ├── BoilerControl.tsx        # Boiler manual/auto controls
│   ├── Dashboard.tsx            # Main user dashboard
│   ├── FamilyManager.tsx        # Add/edit household members
│   ├── Login.tsx / Register.tsx # Authentication screens
│   └── common/                  # Reusable components (hour pickers, status)
├── context/
│   └── AppContext.tsx           # Global state for user, boiler, forecast
├── utils/
│   └── api.ts / dateUtils.ts    # API calls & time-based logic
├── App.tsx                      # Main routing and structure
└── index.tsx                    # App entry point
```

---

## 📦 Third-Party Libraries

### Frontend (React):
- `react-router-dom` – client-side routing
- `react-toastify` – toast notifications for feedback
- `dayjs` – time and date manipulation
- `lucide-react` – icons
- `tailwindcss` – utility-first CSS framework
- `classnames` – conditional class name management

### Backend (Flask):
- `Flask` – backend microframework
- `Flask-JWT-Extended` – user authentication with tokens
- `Pandas` – data manipulation
- `TensorFlow` – boiler temperature forecasting using LSTM
- `joblib` – model scaler loading
- `requests`, `datetime`, `os` – various backend helpers

---

## 🛠️ Development Tools Used (Bonus)

- **Postman** – to test and debug backend APIs
- **Git + GitHub** – for version control and collaboration
- **Chrome DevTools** – debugging React components and styling
- **VS Code Extensions** – Prettier, ESLint, Tailwind IntelliSense
- **GitHub Projects** – for task tracking during development


---

## 🤖 Smart Boiler Optimization using LSTM and Deep Q-Learning

This project demonstrates how artificial intelligence can optimize electric boiler usage in a residential setting, aiming to reduce energy consumption while keeping the water temperature comfortable for users.

### 🔁 LSTM-Based Forecasting
We used a recurrent neural network (LSTM) to predict the water temperature inside the boiler for the next few hours. The model takes into account:
- Ambient temperature and weather conditions (cloud coverage)
- Boiler size: 50L, 100L, or 150L
- Presence or absence of a solar heating system
- Last known boiler temperature

The LSTM model was trained on synthetic yet realistic weather and usage data, using TensorFlow/Keras, and was evaluated on multiple volume scenarios.

### 🧠 Deep Q-Learning Optimization
In addition to forecasting, we developed a Deep Q-Learning (DQL) agent that decides when to turn the electric heater on or off. Its goal is to achieve the desired temperature for upcoming showers while minimizing power usage.

The agent receives as input:
- Current and forecasted temperatures
- Upcoming user shower schedule
- Cost of activation vs. comfort loss

It learns optimal actions through repeated simulation and reward feedback.

### 🧪 Support Modules
The system includes:
- A boiler simulator that mimics heat retention and dissipation over time
- A synthetic weather data generator (CSV-based) that reproduces realistic hourly weather patterns
- Training and evaluation tools for both forecasting and DQL models

### 🛠️ Technologies Used
- Python 3.12
- TensorFlow/Keras for machine learning
- NumPy & Pandas for data handling
- Flask (or FastAPI for extensions) for backend API
- CSV files for simulation input/output and logging

Pretrained models and test datasets are provided. You can run the training or use the existing models to simulate boiler behavior and observe energy savings.

This system is modular, well-documented, and designed for future extension into real-world smart home environments.

