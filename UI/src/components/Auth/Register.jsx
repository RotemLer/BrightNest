// src/components/Auth/Register.jsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AppContext);

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch('http://localhost:5000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: email,
        password: password,
        full_name: name
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Registration successful:', data);
      alert('נרשמת בהצלחה!');
      navigate('/login');


    } else {
      console.error('Registration failed:', data.error);
      alert(data.error);
    }
  } catch (error) {
    console.error('Error during registration:', error);
  }
};


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md w-full max-w-md space-y-6"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">הרשמה</h2>

        <input
          type="text"
          placeholder="שם מלא"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white"
        />

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
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition duration-300"
        >
          הירשם
        </button>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          כבר יש לך חשבון?{' '}
          <a href="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            התחבר
          </a>
        </p>
      </form>
    </div>
  );
}

export default Register;
