import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

function Layout({ children }) {
  const location = useLocation();
  const hideLayout = ['/login', '/register', '/'].includes(location.pathname);


  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white transition-colors duration-300" dir="rtl">
      {/* Fade Navbar */}
      <div className={`transition-opacity duration-500 ${hideLayout ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
        <Navbar />
      </div>

      <main className="flex-grow py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Fade Footer */}
      <div className={`transition-opacity duration-500 ${hideLayout ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
        <Footer />
      </div>
    </div>
  );
}

export default Layout;
