import React, { useState } from 'react';

//example of a location picker component
const israelCities = [
  'ירושלים', 'תל אביב', 'חיפה', 'באר שבע', 'אילת', 'נתניה', 
  'אשדוד', 'ראשון לציון', 'פתח תקווה', 'חולון', 'בני ברק'
];

function LocationPicker({ selectedLocation, onLocationSelect }) {
  const [searchTerm, setSearchTerm] = useState(selectedLocation);
  const [showDropdown, setShowDropdown] = useState(false);


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
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        placeholder="הקלד עיר..."
      />

      {showDropdown && filteredLocations.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-auto transition-all">
          {filteredLocations.map((city) => (
            <div
              key={city}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
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