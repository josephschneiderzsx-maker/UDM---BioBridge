import React from 'react';
import { View, Platform, StyleSheet } from 'react-native';

let BlurViewComponent = null;
try {
  const mod = require('expo-blur');
  BlurViewComponent = mod.BlurView;
} catch (e) {
  // expo-blur not available
}

/**
 * Safe glassmorphism background.
 * Uses real BlurView on iOS; semi-transparent frosted fallback on Android
 * (avoids crashes on devices that don't support GPU blur).
 */
export default function GlassBackground({
  intensity = 80,
  tint = 'light',
  style,
  fallbackColor,
  ...props
}) {
  const defaultFallback =
    tint === 'dark'
      ? 'rgba(30,30,30,0.75)'
      : 'rgba(255,255,255,0.82)';
  const bg = fallbackColor || defaultFallback;

  if (Platform.OS === 'ios' && BlurViewComponent) {
    return (
      <BlurViewComponent
        intensity={intensity}
        tint={tint}
        style={style || StyleSheet.absoluteFill}
        {...props}
      />
    );
  }

  // Android fallback – frosted glass look without native blur
  return (
    <View
      style={[style || StyleSheet.absoluteFill, { backgroundColor: bg }]}
      {...props}
    />
  );
}
