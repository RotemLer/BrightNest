import React, { useState, useEffect, useContext } from 'react';
import './App.css';
import {
    HashRouter as Router,
  Routes,
  Route,
  useLocation
} from 'react-router-dom';
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
import WeeklyGraph from './components/Dashboard/WeeklyGraph';
import MoneySavedGraph from './components/Dashboard/MoneySavedGraph';
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
      <Route path="/weekly-graph" element={<ProtectedRoute><WeeklyGraph /></ProtectedRoute>} />
      <Route path="/graphs/money" element={<ProtectedRoute><MoneySavedGraph /></ProtectedRoute>} />
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

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <Router>
        <AppRoutes />
      </Router>
    </div>
  );
}

export default App;
