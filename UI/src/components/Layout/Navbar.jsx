import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  
  return (
    <nav className="bg-blue-600 dark:bg-gray-800 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl font-semibold">דוד חכם</span>
          </div>
          
          <div className="flex space-x-6">
            <Link 
              to="/" 
              className={`py-2 px-5 rounded-lg transition-all duration-300 ${
                location.pathname === '/' ? 'bg-blue-700 dark:bg-blue-500' : 'hover:bg-blue-700 dark:hover:bg-blue-600'
              }`}
            >
              לוח בקרה
            </Link>
            <Link 
              to="/settings" 
              className={`py-2 px-5 rounded-lg transition-all duration-300 ${
                location.pathname === '/settings' ? 'bg-blue-700 dark:bg-blue-500' : 'hover:bg-blue-700 dark:hover:bg-blue-600'
              }`}
            >
              הגדרות
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;