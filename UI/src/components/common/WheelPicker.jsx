import React, { useState, useRef, useEffect } from 'react';

const WheelPicker = ({ options, onSelect }) => {
  const ITEM_HEIGHT = 48;
  const containerRef = useRef(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = selectedIndex * ITEM_HEIGHT;
    }
  }, [selectedIndex]);

  const handleScroll = () => {
    const container = containerRef.current;
    const index = Math.round(container.scrollTop / ITEM_HEIGHT);
    setSelectedIndex(index);
    onSelect(options[index]);
  };

  return (
    <div className="relative w-32 h-[240px] mx-auto overflow-hidden">
      <div className="absolute top-[96px] left-0 right-0 h-[48px] border-y-2 border-blue-500 pointer-events-none z-10" />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll scroll-snap-y snap-mandatory"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="py-[96px]">
          {options.map((option, index) => (
            <div
              key={index}
              className="h-[48px] flex items-center justify-center text-lg font-medium snap-start"
              style={{
                color: index === selectedIndex ? '#1D4ED8' : '#6B7280',
                fontWeight: index === selectedIndex ? 'bold' : 'normal',
              }}
            >
              {option}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WheelPicker;
