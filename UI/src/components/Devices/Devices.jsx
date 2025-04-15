import React from 'react';
import { Link } from 'react-router-dom';

function Devices() {
  const devices = [
    { id: 'boiler', name: 'דוד חשמלי', icon: '💡', path: '/devices/boiler' },
    { id: 'ac', name: 'מזגן', icon: '❄️', path: '/devices/ac' },
    { id: 'irrigation', name: 'השקיה', icon: '💧', path: '/devices/irrigation' },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">המכשירים שלי</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {devices.map(device => (
          <Link to={device.path} key={device.id}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <div className="text-4xl">{device.icon}</div>
              <h2 className="text-xl font-semibold mt-2">{device.name}</h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Devices;
