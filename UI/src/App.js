import React, { useState, useEffect } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard/Dashboard';
import Layout from './components/Layout/Layout';
import UserSettings from './components/Settings/UserSettings';
import Devices from './components/Devices/Devices';
import Profile from './components/Profile/Profile';
import Statistics from './components/Statistics/Statistics.jsx';
import Boiler from './components/Devices/Boiler.jsx'
import { AppContext } from './context/AppContext';

const defaultSettings = {
  location: 'תל אביב',
  showerDuration: 10,
  preferredShowerTime: '07:00',
  boilerStatus: false,
};

const initialWeatherData = [
  { date: '2025-04-05', temp: 24, humidity: 65, description: 'בהיר' },
  { date: '2025-04-06', temp: 26, humidity: 70, description: 'מעונן חלקית' },
  { date: '2025-04-07', temp: 23, humidity: 75, description: 'גשם קל' },
];

function App() {
  const [userSettings, setUserSettings] = useState(defaultSettings);
  const [weatherData] = useState(initialWeatherData);
  const [predictedBoilerTemp, setPredictedBoilerTemp] = useState(35);
  const [theme, setTheme] = useState('light'); // מצב ברירת מחדל

  useEffect(() => {
    console.log('Weather data loaded');
  }, []);

  useEffect(() => {
    const outsideTemp = weatherData[0].temp;
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

  const contextValue = {
    userSettings,
    updateSettings,
    weatherData,
    predictedBoilerTemp,
    toggleBoilerStatus,
    toggleTheme,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className={theme === 'dark' ? 'dark' : ''}>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/settings" element={<UserSettings />} />
              <Route path="/devices" element={<Devices />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/devices/boiler" element={<Boiler />} />

            </Routes>
          </Layout>
        </Router>
      </div>
    </AppContext.Provider>
  );
}

export default App;