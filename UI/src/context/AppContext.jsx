import React, { createContext, useState } from 'react';

export const AppContext = createContext({
  userSettings: {
    location: '',
    showerDuration: 0,
    preferredShowerTime: '',
    boilerStatus: false,
  },
  updateSettings: () => {},
  userName: '',
  setUserName: () => {},

  weatherData: [],
  predictedBoilerTemp: 37,

  toggleBoilerStatus: () => {},
  toggleTheme: () => {},

  heatingMode: 'auto',
  setHeatingMode: () => {},
  startHour: '07:00',
  endHour: '08:00',
  boilerHours: { start: '', end: '' },
  autoStart: '19:00',
  autoEnd: '21:00',
});

export const AppProvider = ({ children }) => {
  // הגדרות משתמש
  const [userSettings, setUserSettings] = useState({
    location: '',
    showerDuration: 0,
    preferredShowerTime: '',
    boilerStatus: false,
  });

  const [userName, setUserName] = useState('רותם לר');
  const [weatherData, setWeatherData] = useState([]);
  const [predictedBoilerTemp, setPredictedBoilerTemp] = useState(0);

  const updateSettings = (newSettings) => {
    setUserSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const toggleBoilerStatus = () => {
    setUserSettings((prev) => ({
      ...prev,
      boilerStatus: !prev.boilerStatus,
    }));
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
  };

  // מצב חימום ושעות
  const [autoStart] = useState('19:00');
  const [autoEnd] = useState('21:00');
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [heatingMode, setHeatingMode] = useState('manual');

  // חישוב שעות הדוד בפועל
  const getBoilerHours = () => {
    return heatingMode === 'auto'
      ? { start: autoStart, end: autoEnd }
      : { start: startHour, end: endHour };
  };
  
  

  // הדפסת בדיקה
  console.log("✅ boilerHours calculated:", getBoilerHours());

  return (
    <AppContext.Provider
      value={{
        userSettings,
        updateSettings,
        userName,
        setUserName,
        weatherData,
        setWeatherData,
        predictedBoilerTemp,
        setPredictedBoilerTemp,
        toggleBoilerStatus,
        toggleTheme,

        heatingMode,
        setHeatingMode,
        startHour,
        setStartHour,

        endHour,
        setEndHour,

        boilerHours: getBoilerHours(), // ⬅️ מועבר בוודאות

        autoStart,
        autoEnd,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
