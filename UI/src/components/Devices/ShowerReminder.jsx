import React from 'react';

const ShowerReminder = ({ visible, onConfirm, onCancel, userName }) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full text-center">
        <h2 className="text-xl font-semibold mb-4">🛁 {userName}, האם סיימת את המקלחת?</h2>
        <div className="flex justify-center gap-4">
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            כן
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            לא
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShowerReminder;