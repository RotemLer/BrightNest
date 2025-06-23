// src/components/Auth/HomePage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../icons/brightNest_logo.png';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-orange-100 via-yellow-50 to-blue-100 space-y-8 px-4">
    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center justify-center space-x-2 rtl:space-x-reverse">
      ברוכים הבאים ל
      <img src={logo} alt="BrightNest Logo" className="h-8 w-auto ml-2" />
    </h1>


      <div className="flex flex-col space-y-4 w-full max-w-xs">
        <button
          onClick={() => navigate('/login')}
          className="py-3 bg-[#1FA7FF] hover:bg-[#166DAD] text-white rounded-lg font-bold text-lg shadow transition"
        >
          התחברות
        </button>

        <button
          onClick={() => navigate('/register')}
          className="py-3 bg-[#FF6D2E] hover:bg-[#CC4B00] text-white rounded-lg font-bold text-lg shadow transition"
        >
          הרשמה
        </button>
      </div>
    </div>
  );
}

export default HomePage;
