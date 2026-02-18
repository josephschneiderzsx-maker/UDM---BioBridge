import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import { Sun, Moon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius } from '../constants/theme';

/**
 * Premium animated theme toggle switch
 * Smooth transition between light and dark modes with haptic feedback
 */
export default function AnimatedThemeSwitch({ size = 'medium', style }) {
  const { colors, isDark, toggleTheme } = useTheme();
  
  const rotateAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(rotateAnim, {
        toValue: isDark ? 1 : 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [isDark]);

  const handlePress = async () => {
    // Haptic disabled for regular clicks
    toggleTheme();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const sunOpacity = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0],
  });

  const moonOpacity = rotateAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { button: 32, icon: 14 };
      case 'large':
        return { button: 44, icon: 20 };
      default:
        return { button: 36, icon: 16 };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={1}
      style={[styles.touchable, style]}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            width: sizeStyles.button + 16,
            height: sizeStyles.button + 16,
            borderRadius: (sizeStyles.button + 16) / 2,
            backgroundColor: isDark ? 'rgba(255, 200, 50, 0.2)' : 'rgba(100, 100, 200, 0.2)',
            opacity: glowAnim,
            transform: [{ scale: glowScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.button,
          {
            width: sizeStyles.button,
            height: sizeStyles.button,
            borderRadius: sizeStyles.button / 3,
            backgroundColor: colors.surface,
            borderColor: colors.separator,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ rotate: rotation }] },
          ]}
        >
          <Animated.View style={[styles.icon, { opacity: sunOpacity }]}>
            <Sun
              size={sizeStyles.icon}
              color="#FFB800"
              strokeWidth={2.5}
            />
          </Animated.View>
          <Animated.View style={[styles.icon, styles.moonIcon, { opacity: moonOpacity }]}>
            <Moon
              size={sizeStyles.icon}
              color="#A0A0FF"
              strokeWidth={2.5}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
  },
  moonIcon: {
    transform: [{ rotate: '180deg' }],
  },
});
