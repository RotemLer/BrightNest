import React from 'react';

function Footer() {
  return (
    <footer className="bg-gray-800 text-white py-4">
      <div className="container mx-auto px-4 text-center">
        <p>פרויקט גמר במדעי המחשב - מערכת דוד חכם</p>
        <p className="text-sm mt-1">© {new Date().getFullYear()} - כל הזכויות שמורות</p>
      </div>
    </footer>
  );
}

export default Footer;