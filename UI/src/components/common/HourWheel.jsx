import React from 'react';

const HourWheel = ({ selectedHour, onSelect }) => {
  const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);

  return (
    <div className="w-28 h-32 overflow-y-scroll bg-white border border-gray-300 rounded-xl shadow-inner snap-y snap-mandatory">
      {hours.map((hour) => (
        <div
          key={hour}
          onClick={() => onSelect(hour)}
          className={`h-12 flex items-center justify-center cursor-pointer snap-start text-sm transition-all
            ${selectedHour === hour
              ? 'bg-orange-500 text-white font-bold rounded-full border-2 border-orange-600'
              : 'hover:bg-gray-100 text-gray-700'}`}
        >
          {hour}
        </div>
      ))}
    </div>
  );
};

export default HourWheel;
