import React, { useRef, useEffect } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Premium animated refresh indicator
 * Used as a custom refresh indicator for pull-to-refresh
 */
export default function PremiumRefreshControl({ refreshing, pullProgress = 0 }) {
  const { colors } = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (refreshing) {
      // Start spinning animation
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();

      // Scale up
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Fade in
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset animations
      spinAnim.setValue(0);
      
      // Scale down
      Animated.spring(scaleAnim, {
        toValue: 0.5,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Fade out
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [refreshing]);

  // Pull progress animation (when not refreshing)
  useEffect(() => {
    if (!refreshing && pullProgress > 0) {
      scaleAnim.setValue(0.5 + (pullProgress * 0.5));
      opacityAnim.setValue(pullProgress);
    }
  }, [pullProgress, refreshing]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Animated.View
        style={[
          styles.spinner,
          {
            borderColor: colors.primary,
            transform: [{ rotate: spin }],
          },
        ]}
      />
      <View style={[styles.dot, { backgroundColor: colors.primary }]} />
    </Animated.View>
  );
}

/**
 * Custom RefreshControl wrapper with premium styling
 */
export function createRefreshControlStyle(colors) {
  return {
    tintColor: colors.primary,
    colors: [colors.primary],
    progressBackgroundColor: colors.surface,
    progressViewOffset: Platform.OS === 'android' ? 0 : 0,
  };
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2.5,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
