import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-100" dir="rtl">
      <Navbar />
      <main className="flex-grow py-6">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;