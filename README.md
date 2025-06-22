# 💡 BrightNest – Smart Boiler Management System

A full-stack React + Flask application for managing home water heating intelligently. The system allows manual and automatic control of an electric boiler, personal shower scheduling for each household member, and real-time temperature forecasting based on weather data.

Built with React (frontend), Flask (backend), and an LSTM-based prediction engine.

---

## 🔧 System Setup – Step by Step

### 🛠️ Option 1: Run Everything Automatically

From the root directory:

```bash
python start-all.py
```

This will launch both the Flask backend and the React frontend.

---

### 🛠️ Option 2: Manual Setup

### 1. Clone the Project from GitHub

```bash
git clone https://github.com/[your-username]/BrightNest.git
cd BrightNest
```

### 2. Backend Setup (Flask)

#### a. Create a Python virtual environment:

```bash
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
```

#### b. Install dependencies:

```bash
pip install -r requirements.txt
```

#### c. Run the backend server:

```bash
cd Backend
python app.py
```

Flask will run on `http://localhost:5000`

### 3. Frontend Setup (React)

#### a. Navigate to frontend directory:

```bash
cd ../Frontend
```

#### b. Install dependencies:

```bash
npm install
```

#### c. Run the frontend:

```bash
npm start
```

React will run on `http://localhost:3000`

---

## 🚀 Deployment Instructions

The system is fully deployed via **Render** – both frontend and backend – under a single link:
👉 **[https://brightnest.onrender.com](https://brightnest.onrender.com)**

>⚠️ Note: Due to deployment size limitations on Render, user registration is disabled in the live version. For full functionality, including registration and personalized scheduling, we recommend running the project locally.

To access the live system:
### 1.Open the link above.
2.Because user registration is disabled in the deployed version, please use the following demo credentials:
  Email: BrightNest@gmail.com
  Password: 2025
3.If you cannot register a new user, use this demo account to explore the system.
4. Use the app as described below.

> Note: No separate `.env` configuration is needed in deployment – both services are integrated behind the scenes.

---

## 👤 Creating a New User

1. Visit the login/register page (React frontend).
2. Click on **Register**.
3. Enter name, email, password.
4. Define your boiler:

   * Volume: 50 / 100 / 150 liters
   * With or without solar
5. Add household members:

   * Each member includes a name and typical shower times
6. Save and continue to Dashboard.

---

## 🧭 User Flow (What Happens After Registration)

1. **Dashboard loads**:

   * Fetches weather forecast from Open-Meteo API
   * Predicts boiler temperatures for next 12 hours
2. **Checks if upcoming showers need heating**:

   * If needed, recommends heating
   * Activates boiler if auto-mode is enabled
   * Sends an email to the user notifying about the activation
3. **User can**:

   * Override heating manually
   * Edit schedules or boiler settings
   * View real-time temperature forecasts
   * Track daily and weekly electricity savings

---

## 🧠 Technologies Used

* React.js + React Router v6
* Flask (Python Backend)
* TensorFlow / Keras LSTM Model
* Open-Meteo API (hourly weather forecast)
* localStorage caching
* Email Notifications via Flask backend

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

## 📂 Project Structure

```
BrightNest/
├── Backend/
│   ├── app.py
│   ├── BoilerManager.py
│   ├── utils/
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.tsx
├── ML_Model/
│   ├── lstm_model.h5
│   ├── preprocessing_scripts.py
├── start-all.py
```

---

## 📦 Third-Party Libraries

### Frontend (React):

* `react-router-dom` – client-side routing
* `react-toastify` – toast notifications for feedback
* `dayjs` – time and date manipulation
* `lucide-react` – icons
* `tailwindcss` – utility-first CSS framework
* `classnames` – conditional class name management

### Backend (Flask):

* `Flask` – backend microframework
* `Flask-JWT-Extended` – user authentication with tokens
* `Pandas` – data manipulation
* `TensorFlow` – boiler temperature forecasting using LSTM
* `joblib` – model scaler loading
* `requests`, `datetime`, `os` – various backend helpers

---

## 🛠️ Development Tools Used

* **Postman** – to test and debug backend APIs
* **Git + GitHub** – for version control and collaboration
* **Chrome DevTools** – debugging React components and styling
* **VS Code Extensions** – Prettier, ESLint, Tailwind IntelliSense
* **GitHub Projects** – for task tracking during development

---

## 🤖 Smart Boiler Optimization using LSTM and Deep Q-Learning

This project demonstrates how artificial intelligence can optimize electric boiler usage in a residential setting, aiming to reduce energy consumption while keeping the water temperature comfortable for users.

### 🤖 Smart Boiler Optimization using LSTM Forecasting

This project includes a custom LSTM (Long Short-Term Memory) neural network that predicts the internal water temperature of an electric boiler over the next 6 hours, based entirely on environmental conditions and boiler configuration.

🔁 LSTM-Based Temperature Forecasting
The model was trained using real hourly weather data and simulates how external climate affects water temperature inside the boiler. Its inputs include:

* Ambient temperature (hourly)
* Cloud coverage (used to approximate solar heating effect)
* Boiler size: 50L, 100L, or 150L
* Whether a solar heating system is installed

The LSTM learns temperature behavior patterns across different weather conditions and boiler types, allowing the system to anticipate natural heating or cooling trends. This forecast enables smarter boiler control decisions — like when to activate heating in advance — based on expected temperature alone.

The model was developed using TensorFlow/Keras, and the forecast output is exported in CSV and JSON formats for seamless integration with the control system.

### 🛠️ Technologies Used

* Python 3.12
* TensorFlow/Keras for machine learning
* NumPy & Pandas for data handling
* Flask (or FastAPI for extensions) for backend API
* CSV files for simulation input/output and logging

Pretrained models and test datasets are provided. You can run the training or use the existing models to simulate boiler behavior and observe energy savings.

This system is modular, well-documented, and designed for future extension into real-world smart home environments.

---

## 🛠 Future Improvements

* Full mobile app (React Native)
* Voice assistant integration
* Real-time sensor data
* Energy cost optimization
* Notifications via WhatsApp/Push
