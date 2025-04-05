import { createContext } from 'react';

export const AppContext = createContext({
  userSettings: {
    location: '',
    showerDuration: 0,
    preferredShowerTime: '',
    boilerStatus: false,
  },
  updateSettings: () => {},

  weatherData: [],
  predictedBoilerTemp: 0,

  toggleBoilerStatus: () => {},
  
  toggleTheme: () => {}, // אנו רק משתפים את הפונקציה פה
});