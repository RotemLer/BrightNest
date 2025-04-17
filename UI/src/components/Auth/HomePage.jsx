// src/components/Auth/Home.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white">ברוכים הבאים ל-BrightNest</h1>

      <div className="flex flex-col space-y-4 w-full max-w-xs">
        <button
          onClick={() => navigate('/login')}
          className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition duration-300"
        >
          התחברות
        </button>
        <button
          onClick={() => navigate('/register')}
          className="py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition duration-300"
        >
          הרשמה
        </button>
      </div>
    </div>
  );
}

export default HomePage;
