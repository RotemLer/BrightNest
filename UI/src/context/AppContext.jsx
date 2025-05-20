import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AppContext = createContext({});

export const AppProvider = ({ children }) => {
  const [userSettings, setUserSettings] = useState({
    location: '',
    lat: null,
    lon: null,
    email: '',
    devices: [],
    boilerSize: '',       // חשיפה ישירה
    withSolar: false,     // חשיפה ישירה
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [weatherData, setWeatherData] = useState([]);
  const [predictedBoilerTemp, setPredictedBoilerTemp] = useState(0);

  const [autoStart] = useState('19:00');
  const [autoEnd] = useState('21:00');
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [heatingMode, setHeatingMode] = useState('manual');

  // ✅ שליפת פרטי משתמש מהשרת
  const fetchUserSettings = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();

      const prefs = data.preferences || {};
      const devices = data.devices || [];
      const boiler = devices[0] || {};

      setUserSettings({
        location: prefs.location || '',
        lat: prefs.lat || null,
        lon: prefs.lon || null,
        email: data.username || '',
        devices,
        boilerSize: boiler.size || '',
        withSolar: boiler.withSolar || false,
      });

      setUserName(data.full_name || '');
    } catch (err) {
      console.error('❌ שגיאה בטעינת פרטי משתמש:', err);
    }
  }, []);

  // ✅ שמירה לשרת
  const saveSettingsToServer = async ({ preferences, full_name, devices } = {}) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = {};
    if (preferences) payload.preferences = preferences;
    if (full_name) payload.full_name = full_name;

    // אם לא הועבר devices מבחוץ – שלח מתוך ה־state
    if (!devices && userSettings.boilerSize) {
      payload.devices = [{
        size: userSettings.boilerSize,
        withSolar: userSettings.withSolar,
      }];
    } else if (devices) {
      payload.devices = devices;
    }

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/profile/update`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error('שמירת העדפות נכשלה');
      const data = await res.json();
      console.log('✅ נשמר לשרת:', data);
    } catch (err) {
      console.error('❌ שגיאה בשמירת פרטי המשתמש:', err);
    }
  };

  const login = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    fetchUserSettings();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUserSettings({
      location: '',
      lat: null,
      lon: null,
      email: '',
      devices: [],
      boilerSize: '',
      withSolar: false,
    });
    setUserName('');
  };

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

  const getBoilerHours = () =>
    heatingMode === 'auto'
      ? { start: autoStart, end: autoEnd }
      : { start: startHour, end: endHour };

  useEffect(() => {
    if (isAuthenticated) fetchUserSettings();
  }, [isAuthenticated, fetchUserSettings]);

  useEffect(() => {
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
  }, [userSettings]);

  useEffect(() => {
    localStorage.setItem('userName', userName);
  }, [userName]);

  return (
    <AppContext.Provider
      value={{
        userSettings,
        updateSettings,
        saveSettingsToServer,
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
        fetchUserSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};