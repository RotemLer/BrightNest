import React, { useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import logo from '../icons/brightNest_logo.png';

function Navbar() {
  const location = useLocation();
  const { userName, logout } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('UserName from context:', userName);
  }, [userName]);

  return (
    <nav className="bg-gradient-to-r from-orange-500 via-yellow-400 to-blue-500
                    dark:from-[#CC4B00] dark:via-[#D4A82A] dark:to-[#166DAD]
                    text-white shadow-md">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between w-full">

          {/* RIGHT: LOGO */}
          <div className="flex-shrink-0">
            <Link to="/dashbord" className="flex items-center space-x-2 rounded-md p-1
                                            bg-white/10 hover:bg-white/20
                                            dark:bg-white/10 dark:hover:bg-white/20 transition">
              <img src={logo} alt="Logo" className="h-10 w-auto" />
            </Link>
          </div>

          {/* LEFT: LINKS */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">

            <Link
              to="/profile"
              className="flex items-center space-x-6 rtl:space-x-reverse text-white font-medium hover:underline"
            >
              {userName || 'הפרופיל שלי'}
            </Link>

            <span className="text-white text-lg">|</span>

            <Link
              to="/settings"
              className={`py-2 px-5 rounded-lg font-medium transition-all duration-300 ${
                location.pathname === '/settings'
                  ? 'bg-[#166DAD] dark:bg-[#1A4C80]'
                  : 'bg-white/10 hover:bg-[#1FA7FF] dark:bg-white/10 dark:hover:bg-[#1FA7FF]'
              }`}
            >
              הגדרות
            </Link>

            <span className="text-white text-lg">|</span>

            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="py-2 px-5 rounded-lg font-semibold
                         bg-orange-500 hover:bg-orange-600
                         dark:bg-[#CC4B00] dark:hover:bg-[#FF6D2E]
                         text-white dark:text-white transition"
            >
              יציאה
            </button>

          </div>

        </div>
      </div>
    </nav>
  );
}

export default Navbar;
