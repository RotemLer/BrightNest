import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLocation } from 'react-router-dom';

function Layout({ children }) {
  const location = useLocation();
  const hideLayout = ['/login', '/register', '/'].includes(location.pathname);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-200 via-gray-300/60 to-gray-400/40 dark:from-gray-900 dark:via-gray-800/90 dark:to-gray-900 text-gray-900 dark:text-white transition-all duration-500" dir="rtl">
      {/* Fade Navbar */}
      <div className={`transition-opacity duration-500 ${hideLayout ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
        <Navbar />
      </div>

      <main className="flex-grow py-12 px-6 sm:px-8 lg:px-12 xl:px-16 max-w-none mx-auto w-full">
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