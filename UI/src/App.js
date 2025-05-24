import React, { useState, useEffect, useContext } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './components/Auth/HomePage';
import Dashboard from './components/Dashboard/Dashboard';
import Layout from './components/Layout/Layout';
import UserSettings from './components/Settings/AppSettings.jsx';
import Profile from './components/Profile/Profile';
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
  const { setPredictedBoilerTemp } = useContext(AppContext);
  const [theme] = useState('light');

useEffect(() => {
  const fetchForecastTemp = async () => {
    const token = localStorage.getItem('token'); // שליפת הטוקן מה־localStorage
    if (!token) {
      console.warn("🔒 לא נמצא טוקן, לא נשלחת בקשה לתחזית");
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/boiler/recommendations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const now = new Date();

        // מוצאת את הרשומה הקרובה ביותר לזמן נוכחי
        const closest = data.reduce((prev, curr) => {
          const prevTime = new Date(prev.Time);
          const currTime = new Date(curr.Time);
          return Math.abs(currTime - now) < Math.abs(prevTime - now) ? curr : prev;
        });

        if (closest?.ForecastTemp) {
          console.log("🔮 תחזית טמפ׳ מהשרת:", closest.ForecastTemp);
          setPredictedBoilerTemp(closest.ForecastTemp);
        } else {
          console.warn("⚠️ לא נמצאה תחזית טמפ' תקפה ברשומות");
        }
      } else {
        console.warn("⚠️ לא התקבלו רשומות תחזית");
      }
    } catch (err) {
      console.error("❌ שגיאה בקבלת תחזית הדוד:", err);
    }
  };

  fetchForecastTemp();
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
