import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark'); // Default to dark mode
  const [lowBandwidth, setLowBandwidth] = useState(
    localStorage.getItem('lowBandwidth') === 'true'
  );

  // Apply class to HTML tag for Tailwind dark styling
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Persist low bandwidth mode
  useEffect(() => {
    localStorage.setItem('lowBandwidth', lowBandwidth.toString());
  }, [lowBandwidth]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleLowBandwidth = () => {
    setLowBandwidth((prev) => !prev);
  };

  const value = {
    theme,
    lowBandwidth,
    toggleTheme,
    toggleLowBandwidth
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
