import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  
  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center">
            <span className="text-xl font-bold">דוד חכם</span>
          </div>
          
          <div className="flex space-x-4">
            <Link 
              to="/" 
              className={`ml-4 py-2 px-3 rounded-md ${
                location.pathname === '/' ? 'bg-blue-700' : 'hover:bg-blue-700'
              }`}
            >
              לוח בקרה
            </Link>
            <Link 
              to="/settings" 
              className={`py-2 px-3 rounded-md ${
                location.pathname === '/settings' ? 'bg-blue-700' : 'hover:bg-blue-700'
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