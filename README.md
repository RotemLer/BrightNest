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

## 🛠️ Development Tools Used

- **Postman** – to test and debug backend APIs
- **Git + GitHub** – for version control and collaboration
- **Chrome DevTools** – debugging React components and styling
- **VS Code Extensions** – Prettier, ESLint, Tailwind IntelliSense
- **GitHub Projects** – for task tracking during development


---

## 🤖 Smart Boiler Optimization using LSTM and Deep Q-Learning

This project demonstrates how artificial intelligence can optimize electric boiler usage in a residential setting, aiming to reduce energy consumption while keeping the water temperature comfortable for users.

### 🤖 Smart Boiler Optimization using LSTM Forecasting
This project includes a custom LSTM (Long Short-Term Memory) neural network that predicts the internal water temperature of an electric boiler over the next 6 hours, based entirely on environmental conditions and boiler configuration.

🔁 LSTM-Based Temperature Forecasting
The model was trained using real hourly weather data and simulates how external climate affects water temperature inside the boiler. Its inputs include:

Ambient temperature (hourly)

Cloud coverage (used to approximate solar heating effect)

Boiler size: 50L, 100L, or 150L

Whether a solar heating system is installed

The LSTM learns temperature behavior patterns across different weather conditions and boiler types, allowing the system to anticipate natural heating or cooling trends. This forecast enables smarter boiler control decisions — like when to activate heating in advance — based on expected temperature alone.

The model was developed using TensorFlow/Keras, and the forecast output is exported in CSV and JSON formats for seamless integration with the control system.


### 🛠️ Technologies Used
- Python 3.12
- TensorFlow/Keras for machine learning
- NumPy & Pandas for data handling
- Flask (or FastAPI for extensions) for backend API
- CSV files for simulation input/output and logging

Pretrained models and test datasets are provided. You can run the training or use the existing models to simulate boiler behavior and observe energy savings.

This system is modular, well-documented, and designed for future extension into real-world smart home environments.

