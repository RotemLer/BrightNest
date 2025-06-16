import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AppContext = createContext({});

const shouldRefetch = (key, thresholdMs = 1000 * 60 * 60) => {
  const lastFetch = localStorage.getItem(key);
  const now = Date.now();
  return !lastFetch || now - parseInt(lastFetch) > thresholdMs;
};

export const AppProvider = ({ children }) => {
  const [userSettings, setUserSettings] = useState(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved) : {
      location: '',
      lat: null,
      lon: null,
      email: '',
      devices: [],
      boilerSize: '',
      withSolar: false,
      boilerStatus: '⛔️ כבוי',
    };
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [userName, setUserName] = useState(() => localStorage.getItem('userName') || '');
  const [predictedBoilerTemp, setPredictedBoilerTemp] = useState(() => {
      const settings = localStorage.getItem('userSettings');
      if (settings) {
        const location = JSON.parse(settings).location;
        const storedTemp = location ? localStorage.getItem(`boiler-temp-${location}`) : null;
        return storedTemp ? parseFloat(storedTemp) : 0;
      }
      return 0;
    });


  const [autoStart] = useState('19:00');
  const [autoEnd] = useState('21:00');
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [heatingMode, setHeatingMode] = useState(() => {
    return localStorage.getItem('heating-mode') || null;
  });


  useEffect(() => {
      if (heatingMode === 'manual' && startHour && endHour) {
        localStorage.setItem('manual-heating-start', startHour);
        localStorage.setItem('manual-heating-end', endHour);
      }
  }, [heatingMode, startHour, endHour]);


  useEffect(() => {
      const savedStart = localStorage.getItem('manual-heating-start');
      const savedEnd = localStorage.getItem('manual-heating-end');

      if (savedStart) setStartHour(savedStart);
      if (savedEnd) setEndHour(savedEnd);
  }, []);




  // ✅ theme loading on startup
  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    if (isDark) {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  const fetchUserSettings = useCallback(async () => {
    if (!shouldRefetch('lastProfileFetch')) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      const prefs = data.preferences || {};
      const devices = data.devices || [];
      const boiler = devices[0] || {};

      const updated = {
        location: prefs.location || '',
        lat: prefs.lat || null,
        lon: prefs.lon || null,
        email: data.username || '',
        devices,
        boilerSize: boiler.size || '',
        withSolar: boiler.withSolar || false,
        boilerStatus: '⛔️ כבוי',
      };

      setUserSettings(updated);
      localStorage.setItem('userSettings', JSON.stringify(updated));
      setUserName(data.full_name || '');
      localStorage.setItem('userName', data.full_name || '');
      localStorage.setItem('lastProfileFetch', Date.now());

      await fetchBoilerStatus();
    } catch (err) {
      console.error('❌ שגיאה בטעינת פרטי משתמש:', err);
    }
  }, []);

    const fetchBoilerStatus = useCallback(async (newStatus = null) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const isPost = !!newStatus;
    const url = `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/boiler/status`;

    if (!isPost && !shouldRefetch('lastBoilerStatusFetch')) return;

    const headers = { Authorization: `Bearer ${token}` };
    if (isPost) headers['Content-Type'] = 'application/json';

    try {
      const res = await fetch(url, {
        method: isPost ? 'POST' : 'GET',
        headers,
        ...(isPost && { body: JSON.stringify({ status: newStatus }) }),
      });

      const data = await res.json();
      console.log("🔥 Boiler status response:", data);


      if (res.ok && data.status) {

        setUserSettings(prev => {
          const updated = {
            ...prev,
            boilerStatus: data.status === 'on' ? '✅ פועל' : '⛔️ כבוי',
            ...(data.temperature  === "number" && {
              boilerTemp: `${data.temperature.toFixed(1)}°C`
            })
          };
          localStorage.setItem('userSettings', JSON.stringify(updated));
          return updated;
        });


        if (!isPost) localStorage.setItem('lastBoilerStatusFetch', Date.now());
      } else {
        console.error("⚠️ בעיה בתשובת השרת:", data);
      }
    } catch (err) {
      console.error("❌ שגיאה בשליפת סטטוס הדוד:", err);
    }
  },[]);

  const toggleBoilerStatus = useCallback(() => {
    const next = userSettings.boilerStatus === '✅ פועל' ? 'off' : 'on';
    (async () => {
        await fetchBoilerStatus(next);
      })();
  }, [userSettings.boilerStatus, fetchBoilerStatus]);


  const saveSettingsToServer = async ({ preferences, full_name, devices } = {}) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const payload = {};
    if (preferences) payload.preferences = preferences;
    if (full_name) payload.full_name = full_name;

    if (!devices && userSettings.boilerSize) {
      payload.devices = [{ size: userSettings.boilerSize, withSolar: userSettings.withSolar }];
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
    localStorage.clear();
    setIsAuthenticated(false);
    setUserSettings({
      location: '',
      lat: null,
      lon: null,
      email: '',
      devices: [],
      boilerSize: '',
      withSolar: false,
      boilerStatus: '⛔️ כבוי',
    });
    setUserName('');
  };

  const updateSettings = (newSettings) => {
    setUserSettings((prev) => ({ ...prev, ...newSettings }));
  };

  useEffect(() => {
    const isEmpty = !userSettings?.email || !userSettings?.boilerSize;
    if (isAuthenticated && isEmpty) fetchUserSettings();
  }, [isAuthenticated, fetchUserSettings, userSettings]);

  return (
    <AppContext.Provider
      value={{
        userSettings,
        setUserSettings,
        updateSettings,
        saveSettingsToServer,
        predictedBoilerTemp,
        setPredictedBoilerTemp,
        heatingMode,
        setHeatingMode,
        startHour,
        setStartHour,
        endHour,
        setEndHour,
        autoStart,
        autoEnd,
        userName,
        setUserName,
        toggleBoilerStatus,
        fetchBoilerStatus,
        toggleTheme,
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