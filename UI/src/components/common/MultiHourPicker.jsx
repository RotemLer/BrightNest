import React, {useRef } from 'react';

const ITEM_HEIGHT = 40;

const MultiHourPicker = ({ selectedHours, setSelectedHours }) => {
  const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const containerRef = useRef(null);

  const toggleHour = (hour) => {
    setSelectedHours((prev) =>
      prev.includes(hour)
        ? prev.filter((h) => h !== hour)
        : [...prev, hour].sort((a, b) => parseInt(a) - parseInt(b))
    );
  };

  return (
    <div className="w-full flex justify-center">
      <div
        ref={containerRef}
        className="h-[240px] w-32 overflow-y-scroll bg-gray-50 rounded-lg shadow-inner border border-gray-200"
      >
        {hours.map((hour) => (
          <div
            key={hour}
            onClick={() => toggleHour(hour)}
            className={`h-[${ITEM_HEIGHT}px] flex items-center justify-center cursor-pointer 
              ${selectedHours.includes(hour)
                ? 'bg-blue-500 text-white font-bold'
                : 'hover:bg-gray-100 text-gray-700'}`}
          >
            {hour}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiHourPicker;
