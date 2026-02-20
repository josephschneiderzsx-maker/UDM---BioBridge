import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function GlassBackground({ style, children, fallbackColor }) {
  const { colors, isDark } = useTheme();
  const bg = fallbackColor || (isDark ? 'rgba(20,20,20,0.95)' : 'rgba(255,255,255,0.95)');
  return (
    <View style={[{ backgroundColor: bg }, style]}>
      {children}
    </View>
  );
}

export const GlassPresets = { card: {}, header: {}, tabBar: {}, modal: {} };
