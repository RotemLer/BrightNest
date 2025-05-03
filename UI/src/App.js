import React, { useState, useEffect, useContext } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import ProtectedRoute from './components/Auth/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import AddDevice from './components/Devices/AddDevice';
import 'react-toastify/dist/ReactToastify.css';

function AppRoutes() {
  const location = useLocation();
  const hideLayout = location.pathname === '/login' || location.pathname === '/register';

  const routes = (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/dashbord" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/statistics" element={<ProtectedRoute><Statistics /></ProtectedRoute>} />
      <Route path="/devices/boiler" element={<ProtectedRoute><Boiler /></ProtectedRoute>} />
      <Route path="/devices/boiler" element={<ProtectedRoute><Boiler /></ProtectedRoute>} />
      <Route path="/devices/addDevice" element={<ProtectedRoute><AddDevice /></ProtectedRoute>} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );

  return (
    <>
      {hideLayout ? routes : <Layout>{routes}</Layout>}

      <ToastContainer
        position="top-center"
        autoClose={2500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </>
  );
}


function App() {
  const { setWeatherData, setPredictedBoilerTemp } = useContext(AppContext);
  const [theme] = useState('light');

  const extractWeatherDescriptionKey = (item) => {
    const descKey = Object.keys(item).find(key =>
      key.startsWith('weather_description_') && item[key] === true
    );
    return descKey || '';
  };

  useEffect(() => {
    setPredictedBoilerTemp(prev => {
      const outsideTemp = prev || 24;
      return outsideTemp > 25 ? 42 : outsideTemp > 20 ? 38 : 35;
    });
  }, [setPredictedBoilerTemp]);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <Router>
        <AppRoutes />
      </Router>
    </div>
  );
}

export default App;
