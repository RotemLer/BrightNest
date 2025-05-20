import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');

  if (!token) {
    // No token? User is NOT logged in → Redirect to login
    return <Navigate to="/login" replace />;
  }

  // Token exists → Allow access
  return children;
}

export default ProtectedRoute;
