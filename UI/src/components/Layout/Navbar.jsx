import React, { useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { User, Settings, LogOut, Home } from 'lucide-react';
import logo from '../icons/brightNest_logo.png';

function Navbar() {
  const location = useLocation();
  const { userName, logout } = useContext(AppContext);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('UserName from context:', userName);
  }, [userName]);

  return (
    <nav className="relative bg-gradient-to-r from-orange-500 via-orange-400 to-blue-500
                    dark:from-orange-600 dark:via-orange-500 dark:to-blue-600
                    shadow-2xl overflow-hidden">

      {/* Animated wave background */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-300/40 via-yellow-300/20 to-blue-300/40
                        animate-gradient-x bg-300% bg-gradient-to-r"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent
                        animate-pulse"></div>
      </div>

      {/* Enhanced floating bubbles - more bubbles with smooth hover effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large bubbles */}
        <div className="absolute top-2 left-[20%] w-16 h-16 bg-white/10 rounded-full animate-float-slow hover:animate-bounce transition-all duration-300 hover:scale-110"></div>
        <div className="absolute top-4 right-[25%] w-12 h-12 bg-white/10 rounded-lg rotate-45 animate-float-medium hover:rotate-90 transition-all duration-500 hover:scale-125"></div>
        <div className="absolute bottom-2 left-[30%] w-20 h-20 bg-white/10 rounded-full animate-float-fast hover:animate-pulse transition-all duration-300 hover:scale-105"></div>
        <div className="absolute top-6 left-[45%] w-8 h-8 bg-white/15 rounded-full animate-bounce hover:animate-spin transition-all duration-300 hover:scale-125"></div>

        {/* Medium bubbles */}
        <div className="absolute top-8 left-[15%] w-10 h-10 bg-blue-300/20 rounded-full animate-float-slow delay-75 hover:bg-blue-300/40 transition-all duration-300 hover:scale-110"></div>
        <div className="absolute bottom-6 right-[20%] w-14 h-14 bg-orange-300/15 rounded-full animate-float-medium delay-150 hover:bg-orange-300/30 transition-all duration-300 hover:scale-105"></div>
        <div className="absolute top-12 right-[35%] w-6 h-6 bg-yellow-300/25 rounded-full animate-bounce delay-300 hover:animate-ping transition-all duration-300 hover:scale-150"></div>
        <div className="absolute bottom-8 left-[60%] w-16 h-16 bg-white/8 rounded-full animate-float-fast delay-500 hover:bg-white/20 transition-all duration-300 hover:scale-115"></div>

        {/* Small bubbles */}
        <div className="absolute top-3 left-[70%] w-4 h-4 bg-white/20 rounded-full animate-float-slow delay-200 hover:animate-bounce transition-all duration-300 hover:scale-200"></div>
        <div className="absolute bottom-4 left-[18%] w-5 h-5 bg-blue-200/15 rounded-full animate-float-medium delay-700 hover:bg-blue-200/35 transition-all duration-300 hover:scale-150"></div>
        <div className="absolute top-10 left-[75%] w-7 h-7 bg-orange-200/20 rounded-full animate-bounce delay-100 hover:animate-pulse transition-all duration-300 hover:scale-125"></div>
        <div className="absolute bottom-10 right-[15%] w-3 h-3 bg-yellow-200/25 rounded-full animate-float-fast delay-400 hover:bg-yellow-200/50 transition-all duration-300 hover:scale-300"></div>

        {/* Extra tiny bubbles */}
        <div className="absolute top-5 left-[10%] w-2 h-2 bg-white/30 rounded-full animate-float-slow delay-600 hover:animate-spin transition-all duration-300 hover:scale-400"></div>
        <div className="absolute bottom-3 left-[25%] w-3 h-3 bg-blue-100/20 rounded-full animate-bounce delay-800 hover:bg-blue-100/40 transition-all duration-300 hover:scale-250"></div>
        <div className="absolute top-7 right-[10%] w-2 h-2 bg-orange-100/25 rounded-full animate-float-medium delay-900 hover:animate-pulse transition-all duration-300 hover:scale-350"></div>
        <div className="absolute bottom-7 left-[80%] w-4 h-4 bg-yellow-100/20 rounded-full animate-float-fast delay-1000 hover:bg-yellow-100/40 transition-all duration-300 hover:scale-200"></div>

        {/* Diamond shapes */}
        <div className="absolute top-6 left-[35%] w-6 h-6 bg-white/12 rotate-45 animate-float-slow delay-300 hover:rotate-180 transition-all duration-500 hover:scale-125"></div>
        <div className="absolute bottom-5 right-[40%] w-4 h-4 bg-blue-200/18 rotate-45 animate-float-medium delay-600 hover:rotate-90 transition-all duration-400 hover:scale-150"></div>
        <div className="absolute top-9 left-[55%] w-5 h-5 bg-orange-200/15 rotate-45 animate-bounce delay-450 hover:rotate-270 transition-all duration-600 hover:scale-135"></div>

        {/* Square shapes */}
        <div className="absolute top-4 left-[65%] w-3 h-3 bg-white/18 rounded-sm animate-float-fast delay-250 hover:rounded-lg transition-all duration-300 hover:scale-200"></div>
        <div className="absolute bottom-6 left-[78%] w-5 h-5 bg-yellow-200/12 rounded-sm animate-float-slow delay-750 hover:rounded-xl transition-all duration-400 hover:scale-140"></div>

        {/* Additional scattered bubbles */}
        <div className="absolute top-1 left-[5%] w-3 h-3 bg-white/15 rounded-full animate-float-medium delay-200 hover:bg-white/30 transition-all duration-300 hover:scale-200"></div>
        <div className="absolute bottom-1 left-[50%] w-2 h-2 bg-blue-200/20 rounded-full animate-bounce delay-600 hover:bg-blue-200/40 transition-all duration-300 hover:scale-300"></div>
        <div className="absolute top-2 left-[85%] w-4 h-4 bg-orange-200/15 rounded-full animate-float-slow delay-400 hover:bg-orange-200/35 transition-all duration-300 hover:scale-175"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-8 py-5">
        <div className="flex items-center justify-between w-full">

          {/* RIGHT: LOGO */}
          <div className="flex-shrink-0">
            <Link to="/dashbord" className="group flex items-center space-x-4 rounded-2xl p-4
                                            bg-white/20 hover:bg-white/30 backdrop-blur-xl
                                            border border-white/30 hover:border-white/50
                                            transition-all duration-500 hover:scale-105 hover:shadow-xl
                                            hover:translate-y-[-2px]">
              <div className="relative">
                <img src={logo} alt="Logo" className="h-12 w-auto group-hover:drop-shadow-2xl transition-all duration-300" />
                <div className="absolute -inset-2 bg-gradient-to-r from-orange-400/20 to-blue-400/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              <div className="hidden lg:block">
                <div className="text-white font-bold text-xl drop-shadow-lg tracking-wide">BrightNest</div>
                <div className="text-white/90 text-sm font-medium">Smart Home Control</div>
              </div>
            </Link>
          </div>

          {/* LEFT: NAVIGATION */}
          <div className="flex items-center space-x-3 rtl:space-x-reverse">

            {/* Profile Link */}
            <Link
              to="/profile"
              className="group flex items-center space-x-3 rtl:space-x-reverse text-gray-700 font-medium
                         px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-xl
                         border border-white/20 hover:border-white/40
                         transition-all duration-300 hover:scale-105 hover:shadow-lg hover:translate-y-[-2px]
                         relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-9 h-9 bg-white/25 rounded-xl flex items-center justify-center
                                group-hover:bg-white/35 group-hover:scale-110 group-hover:rotate-12
                                transition-all duration-300 shadow-inner">
                  <User className="w-5 h-5 text-gray-700 drop-shadow-sm" />
                </div>
                <span className="drop-shadow-sm font-semibold hidden sm:block">
                  {userName || 'הפרופיל שלי'}
                </span>
              </div>
            </Link>

            {/* Separator */}
            <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/40 to-transparent"></div>

            {/* Settings Link */}
            <Link
              to="/settings"
              className={`group flex items-center space-x-3 rtl:space-x-reverse py-3 px-5 rounded-xl font-medium 
                         transition-all duration-300 hover:scale-105 hover:shadow-lg hover:translate-y-[-2px]
                         backdrop-blur-xl border relative overflow-hidden ${
                location.pathname === '/settings'
                  ? 'bg-white/30 border-white/50 text-white shadow-lg scale-105 translate-y-[-2px]'
                  : 'bg-white/15 hover:bg-white/25 border-white/20 hover:border-white/40 text-gray-700 hover:text-gray-700'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-yellow-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10 flex items-center space-x-3 rtl:space-x-reverse">
                <div className="w-8 h-8 bg-white/25 rounded-lg flex items-center justify-center
                                group-hover:bg-white/35 group-hover:scale-110 group-hover:rotate-90
                                transition-all duration-500 shadow-inner">
                  <Settings className="w-4 h-4 text-gray-700 drop-shadow-sm" />
                </div>
                <span className="drop-shadow-sm font-semibold hidden sm:block">הגדרות</span>
              </div>
            </Link>

            {/* Separator */}
            <div className="w-px h-10 bg-gradient-to-b from-transparent via-white/40 to-transparent"></div>

            {/* Logout Button */}
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="group relative overflow-hidden py-3 px-5 rounded-2xl font-bold
                         bg-white/20 hover:bg-white/30 backdrop-blur-xl
                         border-2 border-white/30 hover:border-white/50
                         text-gray-700 transition-all duration-500 hover:scale-110 hover:shadow-2xl
                         hover:translate-y-[-3px] active:scale-95"
            >
              {/* Background gradient animation */}
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20
                              opacity-0 group-hover:opacity-100 transition-opacity duration-300
                              bg-200% animate-gradient-x"></div>

              <div className="relative z-10 flex items-center space-x-2 rtl:space-x-reverse">
                <div className="w-8 h-8 bg-white/25 rounded-xl flex items-center justify-center
                                group-hover:bg-red-500/30 group-hover:scale-125 group-hover:rotate-180
                                transition-all duration-500 shadow-inner">
                  <LogOut className="w-4 h-4 text-gray-700 drop-shadow-sm" />
                </div>
                <span className="drop-shadow-sm font-semibold hidden sm:block">יציאה</span>
              </div>

              {/* Ripple effect */}
              <div className="absolute inset-0 bg-white/10 rounded-2xl scale-0 group-hover:scale-100
                              opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            </button>

          </div>

        </div>
      </div>

      {/* Enhanced bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-yellow-300 to-blue-400 opacity-80"></div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/30"></div>

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-10px) rotate(90deg); }
          50% { transform: translateY(-5px) rotate(180deg); }
          75% { transform: translateY(-15px) rotate(270deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-8px) translateX(4px); }
          66% { transform: translateY(-12px) translateX(-4px); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.1); }
        }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 4s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 3s ease-in-out infinite; }
      `}</style>
    </nav>
  );
}

export default Navbar;