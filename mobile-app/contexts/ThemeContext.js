import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from '../constants/theme';

const ThemeContext = createContext({
  colors: darkColors,
  isDark: true,
  mode: 'dark',
  toggleTheme: () => {},
  setThemeMode: () => {},
});

const THEME_KEY = 'theme_mode';

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(saved => {
        if (saved === 'light' || saved === 'dark') setMode(saved);
      })
      .catch(() => {});
  }, []);

  const toggleTheme = async () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    await AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
  };

  const setThemeMode = async (newMode) => {
    const m = newMode === 'auto' ? 'dark' : newMode;
    setMode(m);
    await AsyncStorage.setItem(THEME_KEY, m).catch(() => {});
  };

  const colors = mode === 'dark' ? darkColors : lightColors;
  const isDark = mode === 'dark';

  return (
    <ThemeContext.Provider value={{ colors, isDark, mode, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
