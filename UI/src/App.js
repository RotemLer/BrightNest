import React, { useState, useEffect, useContext } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/Auth/HomePage';
import Dashboard from './components/Dashboard/Dashboard';
import Layout from './components/Layout/Layout';
import UserSettings from './components/Settings/AppSettings.jsx';
import Profile from './components/Profile/Profile';
import Statistics from './components/Statistics/Statistics.jsx';
import Boiler from './components/Devices/Boiler.jsx';
import Login from './components/Auth/Login.jsx';
import Register from './components/Auth/Register.jsx';
import { AppContext } from './context/AppContext';

function App() {
  const {
    setWeatherData,
    setPredictedBoilerTemp
  } = useContext(AppContext);

  const [theme] = useState('light');

  const extractWeatherDescriptionKey = (item) => {
    const descKey = Object.keys(item).find(key =>
      key.startsWith('weather_description_') && item[key] === true
    );
    return descKey || '';
  };

  useEffect(() => {
    console.log("🌍 Fetching weather...");
    fetch('http://localhost:5000/openmeteo/32.0853/34.7818')
      .then(res => res.json())
      .then(data => {
        console.log("🌤️ Got weather data:", data);
        const parsed = data.forecast.map(item => {
          const descriptionKey = extractWeatherDescriptionKey(item);
          return {
            day: new Date(item.date).toLocaleDateString('he-IL', { weekday: 'long' }),
            hour: new Date(item.date).getHours(),
            temp: item.temperature_2m,
            humidity: item.relative_humidity_2m,
            condition: descriptionKey.replace('weather_description_', ''),
            icon: descriptionKey
          };
        });
        setWeatherData(parsed);
      })
      .catch(err => console.error("❌ Failed to load weather data:", err));
  }, [setWeatherData]);

  useEffect(() => {
    setPredictedBoilerTemp(prev => {
      const outsideTemp = prev || 24;
      return outsideTemp > 25 ? 42 : outsideTemp > 20 ? 38 : 35;
    });
  }, [setPredictedBoilerTemp]);

  return (
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
  );
}

export default App;
