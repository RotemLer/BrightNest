import React, { useState } from 'react';

// רשימה של מיקומים לדוגמה
const israelCities = [
  'ירושלים', 'תל אביב', 'חיפה', 'באר שבע', 'אילת', 'נתניה', 
  'אשדוד', 'ראשון לציון', 'פתח תקווה', 'חולון', 'בני ברק'
];

function LocationPicker({ selectedLocation, onLocationSelect }) {
  const [searchTerm, setSearchTerm] = useState(selectedLocation);
  const [showDropdown, setShowDropdown] = useState(false);

  // סינון המיקומים לפי מה שהמשתמש הקליד
  const filteredLocations = israelCities.filter(city => 
    city.includes(searchTerm)
  );

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
  };

  const handleLocationClick = (city) => {
    setSearchTerm(city);
    onLocationSelect(city);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="הקלד עיר..."
      />

      {showDropdown && filteredLocations.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredLocations.map((city) => (
            <div
              key={city}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleLocationClick(city)}
            >
              {city}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default LocationPicker;