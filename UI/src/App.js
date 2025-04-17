import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/Auth/HomePage';
import Dashboard from './components/Dashboard/Dashboard';
import Layout from './components/Layout/Layout';
import UserSettings from './components/Settings/AppSettings.jsx';
import Profile from './components/Profile/Profile';
import Statistics from './components/Statistics/Statistics.jsx';
import Boiler from './components/Devices/Boiler.jsx';
import { AppContext } from './context/AppContext';
import Login from './components/Auth/Login.jsx';
import Register from './components/Auth/Register.jsx';

const defaultSettings = {
  location: 'תל אביב',
  showerDuration: 10,
  preferredShowerTime: '07:00',
  boilerStatus: false,
};

function App() {
  const [userSettings, setUserSettings] = useState(defaultSettings);
  const [weatherData, setWeatherData] = useState([]); // ✅ dynamic now
  const [predictedBoilerTemp, setPredictedBoilerTemp] = useState(35);
  const [theme, setTheme] = useState('light');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ✅ Fetch weather from Flask backend
  useEffect(() => {
    console.log("🌍 Fetching weather...");
    fetch('http://localhost:5000/openmeteo/32.0853/34.7818')
      .then(res => res.json())
      .then(data => {
        console.log("🌤️ Got weather data:", data);
        const parsed = data.forecast.map(item => ({
          day: new Date(item.date).toLocaleDateString('he-IL', { weekday: 'long' }),
          hour: new Date(item.date).getHours(),
          temp: item.temperature_2m,
          humidity: item.relative_humidity_2m,
          condition: item.description,  // temporary until we re-map
          icon: item.description
        }));
        setWeatherData(parsed);
      })
      .catch(err => console.error("❌ Failed to load weather data:", err));
  }, []);
  

  useEffect(() => {
    const outsideTemp = weatherData[0]?.temp || 0;
    const simulatedPrediction = outsideTemp > 25 ? 42 : outsideTemp > 20 ? 38 : 35;
    setPredictedBoilerTemp(simulatedPrediction);
  }, [weatherData]);

  const toggleBoilerStatus = () => {
    setUserSettings(prev => ({
      ...prev,
      boilerStatus: !prev.boilerStatus
    }));
  };

  const updateSettings = (newSettings) => {
    setUserSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const login = () => setIsLoggedIn(true);
  const logout = () => setIsLoggedIn(false);

  const contextValue = {
    userSettings,
    updateSettings,
    weatherData,
    predictedBoilerTemp,
    toggleBoilerStatus,
    toggleTheme,
    isLoggedIn,
    login,
    logout,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className={theme === 'dark' ? 'dark' : ''}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashbord" element={<Dashboard />} />
              <Route path="/settings" element={<UserSettings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/devices/boiler" element={<Boiler />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Routes>
          </Layout>
        </Router>
      </div>
    </AppContext.Provider>
  );
}

export default App;
