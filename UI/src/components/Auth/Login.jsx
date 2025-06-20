import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { toast } from 'react-toastify';


function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AppContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000'}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password: password }),
        credentials: "include"
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('התחברת בהצלחה!');
        setTimeout(() => {
          login(data.token);
          console.log(localStorage.getItem("token")); // should log the JWT
          navigate('/dashbord');
        }, 1200);
      } else {
        toast.error("אימייל או סיסמה לא נכונים");
      }
      
    } catch (error) {
      console.error('❌ Error during login:', error);
      toast.error('בעיה בשרת. נסה שוב מאוחר יותר.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen
                    bg-gradient-to-br from-orange-100 via-yellow-50 to-blue-100
                    dark:from-[#1A1A1A] dark:via-[#1F2A3C] dark:to-[#0F1C2E]">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md w-full max-w-md space-y-6"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">התחברות</h2>

        <input
          type="email"
          placeholder="אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
        />

        <input
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
        />

        <button
          type="submit"
          className="w-full py-3 bg-[#1FA7FF] hover:bg-[#166DAD] text-white font-bold rounded-lg transition duration-300"
        >
          התחבר
        </button>


        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          אין לך משתמש?{' '}
          <a href="/register" className="text-[#FF6D2E] hover:underline">
            הרשמה
          </a>

        </p>
      </form>
    </div>
  );
}

export default Login;
