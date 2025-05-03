import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext({
  userSettings: {
    location: '',
    lat: null,
    lon: null,
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
  const [userSettings, setUserSettings] = useState(() => {
    const savedSettings = localStorage.getItem('userSettings');
    return savedSettings ? JSON.parse(savedSettings) : {
      location: '',
      lat: null,
      lon: null,
      email: '',
      showerDuration: 0,
      preferredShowerTime: '',
      boilerStatus: false,
    };
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('token') ? true : false;
  });

  const login = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const [userName, setUserName] = useState(() => {
    return localStorage.getItem('userName') || '';
  });

  const [weatherData, setWeatherData] = useState([]);
  const [predictedBoilerTemp, setPredictedBoilerTemp] = useState(0);

  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
  }, [userSettings]);

  useEffect(() => {
    localStorage.setItem('userName', userName);
  }, [userName]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);  

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

  const [autoStart] = useState('19:00');
  const [autoEnd] = useState('21:00');
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [heatingMode, setHeatingMode] = useState('manual');

  const getBoilerHours = () => {
    return heatingMode === 'auto'
      ? { start: autoStart, end: autoEnd }
      : { start: startHour, end: endHour };
  };

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
        boilerHours: getBoilerHours(),
        autoStart,
        autoEnd,
        isAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
