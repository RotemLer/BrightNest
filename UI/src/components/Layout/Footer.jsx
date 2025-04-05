import React from 'react';

function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 py-6 mt-12">
      <div className="container mx-auto px-4 text-center text-sm">
        <p className="font-medium">פרויקט גמר במדעי המחשב - מערכת דוד חכם</p>
        <p className="mt-1">© {new Date().getFullYear()} - כל הזכויות שמורות</p>
      </div>
    </footer>
  );
}

export default Footer;