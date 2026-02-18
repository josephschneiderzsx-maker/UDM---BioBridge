import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Animated, Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { darkColors, lightColors } from '../constants/theme';

const THEME_KEY = 'theme_mode';
const THEME_AUTO_KEY = 'theme_auto';

const ThemeContext = createContext();

/**
 * Premium Theme Provider with animated transitions
 * Supports auto/dark/light modes with smooth transitions
 */
export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState('dark');
  const [autoMode, setAutoMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Animation values for smooth theme transitions
  const transitionProgress = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadThemePreferences();
  }, []);

  // Handle system theme changes when in auto mode
  useEffect(() => {
    if (autoMode && systemColorScheme) {
      const newMode = systemColorScheme;
      if (newMode !== mode) {
        animateThemeChange(newMode);
      }
    }
  }, [systemColorScheme, autoMode]);

  const loadThemePreferences = async () => {
    try {
      const [savedMode, savedAuto] = await Promise.all([
        AsyncStorage.getItem(THEME_KEY),
        AsyncStorage.getItem(THEME_AUTO_KEY),
      ]);

      const isAuto = savedAuto === 'true';
      setAutoMode(isAuto);

      if (isAuto && systemColorScheme) {
        setMode(systemColorScheme);
      } else if (savedMode === 'light' || savedMode === 'dark') {
        setMode(savedMode);
      }
    } catch (error) {
      console.warn('Failed to load theme preferences:', error);
    }
  };

  const animateThemeChange = (newMode) => {
    setIsTransitioning(true);

    // Overlay fade in
    Animated.sequence([
      Animated.timing(overlayOpacity, {
        toValue: 0.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress animation for smooth color interpolation
    transitionProgress.setValue(0);
    Animated.timing(transitionProgress, {
      toValue: 1,
      duration: 350,
      useNativeDriver: false,
    }).start(() => {
      setMode(newMode);
      setIsTransitioning(false);
    });
  };

  const toggleTheme = async () => {
    // Haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const next = mode === 'dark' ? 'light' : 'dark';
    
    // Disable auto mode when manually toggling
    if (autoMode) {
      setAutoMode(false);
      await AsyncStorage.setItem(THEME_AUTO_KEY, 'false');
    }

    animateThemeChange(next);
    await AsyncStorage.setItem(THEME_KEY, next);
  };

  const setThemeMode = async (newMode) => {
    if (newMode === 'auto') {
      setAutoMode(true);
      await AsyncStorage.setItem(THEME_AUTO_KEY, 'true');
      if (systemColorScheme) {
        animateThemeChange(systemColorScheme);
      }
    } else {
      setAutoMode(false);
      await AsyncStorage.setItem(THEME_AUTO_KEY, 'false');
      await AsyncStorage.setItem(THEME_KEY, newMode);
      animateThemeChange(newMode);
    }
  };

  const colors = mode === 'dark' ? darkColors : lightColors;
  const isDark = mode === 'dark';

  // Create animated color values for smooth transitions
  const animatedColors = {
    background: transitionProgress.interpolate({
      inputRange: [0, 1],
      outputRange: isDark 
        ? [lightColors.background, darkColors.background]
        : [darkColors.background, lightColors.background],
    }),
    surface: transitionProgress.interpolate({
      inputRange: [0, 1],
      outputRange: isDark
        ? [lightColors.surface, darkColors.surface]
        : [darkColors.surface, lightColors.surface],
    }),
  };

  return (
    <ThemeContext.Provider
      value={{
        colors,
        isDark,
        mode,
        autoMode,
        isTransitioning,
        toggleTheme,
        setThemeMode,
        animatedColors,
        overlayOpacity,
        transitionProgress,
      }}
    >
      {children}
      {/* Theme transition overlay */}
      <Animated.View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: isDark ? '#FFFFFF' : '#000000',
          opacity: overlayOpacity,
          zIndex: 9999,
        }}
      />
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

// Need to import StyleSheet for the overlay
import { StyleSheet } from 'react-native';
