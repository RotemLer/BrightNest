import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import UserSettings from './components/Settings/UserSettings';
import { AppContext } from './context/AppContext';

// דוגמה לנתוני ברירת מחדל
const defaultSettings = {
  location: 'תל אביב',
  showerDuration: 10, // בדקות
  preferredShowerTime: '07:00',
  boilerStatus: false, // כבוי כברירת מחדל
};

// דוגמה לנתוני מזג אוויר התחלתיים
const initialWeatherData = [
  { date: '2025-04-05', temp: 24, humidity: 65, description: 'בהיר' },
  { date: '2025-04-06', temp: 26, humidity: 70, description: 'מעונן חלקית' },
  { date: '2025-04-07', temp: 23, humidity: 75, description: 'גשם קל' },
];

function App() {
  const [userSettings, setUserSettings] = useState(defaultSettings);
  const [weatherData, setWeatherData] = useState(initialWeatherData);
  const [predictedBoilerTemp, setPredictedBoilerTemp] = useState(35);

  // פונקציה להדמיית שליפת נתוני מזג אוויר מה-API
  useEffect(() => {
    // במקרה אמיתי - כאן תהיה קריאה לשירות מזג האוויר
    console.log('Weather data loaded');
  }, []);

  // פונקציה להדמיית חישוב טמפרטורת הדוד המוערכת בהתבסס על המודל
  useEffect(() => {
    // במקרה אמיתי - נבצע כאן חישוב על סמך המודל המאומן
    // לוגיקה פשוטה לדוגמה:
    const outsideTemp = weatherData[0].temp;
    const simulatedPrediction = outsideTemp > 25 ? 42 : outsideTemp > 20 ? 38 : 35;
    setPredictedBoilerTemp(simulatedPrediction);
  }, [weatherData]);

  // פונקציה שתטפל בהחלפת סטטוס הדוד
  const toggleBoilerStatus = () => {
    setUserSettings(prev => ({
      ...prev,
      boilerStatus: !prev.boilerStatus
    }));
  };

  // פונקציה לעדכון הגדרות המשתמש
  const updateSettings = (newSettings) => {
    setUserSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  // הערכים שנשתף בקונטקסט
  const contextValue = {
    userSettings,
    updateSettings,
    weatherData,
    predictedBoilerTemp,
    toggleBoilerStatus
  };

  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<UserSettings />} />
          </Routes>
        </Layout>
      </Router>
    </AppContext.Provider>
  );
}

export default App;