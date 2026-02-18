import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

let BlurViewComponent = null;
try {
  const mod = require('expo-blur');
  BlurViewComponent = mod.BlurView;
} catch (e) {
  // expo-blur not available
}

/**
 * Premium glassmorphism background with adaptive fallbacks
 * Uses real BlurView on iOS; semi-transparent frosted fallback on Android
 * Automatically adapts tint based on theme when not explicitly set
 */
export default function GlassBackground({
  intensity = 80,
  tint, // 'light' | 'dark' | undefined (auto)
  style,
  fallbackColor,
  children,
  ...props
}) {
  const { isDark } = useTheme();
  
  // Auto-detect tint based on theme if not provided
  const effectiveTint = tint || (isDark ? 'dark' : 'light');
  
  // Calculate fallback colors based on tint
  const defaultFallback = effectiveTint === 'dark'
    ? 'rgba(30, 30, 30, 0.85)'
    : 'rgba(255, 255, 255, 0.88)';
  
  const bg = fallbackColor || defaultFallback;

  // Check if device supports blur
  const supportsBlur = Platform.OS === 'ios' && BlurViewComponent;

  if (supportsBlur) {
    return (
      <BlurViewComponent
        intensity={intensity}
        tint={effectiveTint}
        style={style || StyleSheet.absoluteFill}
        {...props}
      >
        {children}
      </BlurViewComponent>
    );
  }

  // Android/fallback - frosted glass look without native blur
  // Using multiple layers for better visual effect
  return (
    <View
      style={[style || StyleSheet.absoluteFill, styles.fallbackContainer]}
      {...props}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: bg }]} />
      {/* Subtle noise effect simulation */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: effectiveTint === 'dark' 
              ? 'rgba(255, 255, 255, 0.02)' 
              : 'rgba(0, 0, 0, 0.01)',
          },
        ]}
      />
      {children}
    </View>
  );
}

/**
 * Preset glass styles for common use cases
 */
export const GlassPresets = {
  // Card glass effect
  card: {
    intensity: 60,
    tint: 'light',
    style: {
      borderRadius: 20,
      overflow: 'hidden',
    },
  },
  // Navigation header glass
  header: {
    intensity: 80,
    tint: 'light',
  },
  // Tab bar glass
  tabBar: {
    intensity: 80,
    tint: 'light',
  },
  // Modal/sheet glass
  modal: {
    intensity: 90,
    tint: 'dark',
  },
};

const styles = StyleSheet.create({
  fallbackContainer: {
    overflow: 'hidden',
  },
});
