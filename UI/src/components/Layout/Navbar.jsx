import React, { useContext, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

import logo from '../icons/brightNest_logo.png';

function Navbar() {
  const location = useLocation();
  const { userName } = useContext(AppContext);

  useEffect(() => {
    console.log('UserName from context:', userName);
  }, [userName]);

  return (
    <nav className="bg-blue-600 dark:bg-gray-800 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between w-full">

          {/*RIGHT*/}
          <div className="flex-shrink-0">
            <Link to="/dashbord" className="flex items-center space-x-2 border border-orange-500 rounded-md">
              <img src={logo} alt="Logo" className="h-10 w-auto" />
            </Link>
          </div>

          {/*CENTER*/}
          <div className="flex items-center space-x-6 rtl:space-x-reverse justify-center flex-1">
            <Link 
              to="/dashbord" 
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
            <Link 
              to="/statistics" 
              className={`py-2 px-5 rounded-lg transition-all duration-300 ${
                location.pathname === '/statistics' ? 'bg-blue-700 dark:bg-blue-500' : 'hover:bg-blue-700 dark:hover:bg-blue-600'
              }`}
            >
              סטטיסטיקות
            </Link>
          </div>

          {/* LEFT */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">

          <Link
            to="/profile"
            className="flex items-center space-x-6 rtl:space-x-reverse text-white"
          >
            {userName || 'הפרופיל שלי'}
          </Link>

          <span className="text-white text-lg">|</span>

          <Link 
            to="/"
            className="flex items-center space-x-6 rtl:space-x-reverse text-white">
            יציאה
          </Link>

          </div>


        </div>
      </div>
    </nav>
  );
}

export default Navbar;
