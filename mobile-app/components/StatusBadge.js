import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { borderRadius, spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

/**
 * Premium status badge with pulse animation and responsive sizing
 */
export default function StatusBadge({ status, size = 'medium' }) {
  const { colors, isDark } = useTheme();
  const { scaleFont, isSmallPhone } = useResponsive();
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.8,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    glow.start();

    return () => {
      pulse.stop();
      glow.stop();
    };
  }, []);

  const getStatusColor = () => {
    const s = status?.toLowerCase();
    if (s === 'open' || s === 'unlocked') return colors.success;
    if (s === 'error' || s === 'offline') return colors.danger;
    if (s === 'timeout') return colors.warning;
    return colors.primary;
  };

  const getStatusText = () => {
    const s = status?.toLowerCase();
    if (s === 'open' || s === 'unlocked') return 'Unlocked';
    if (s === 'error') return 'Error';
    if (s === 'offline') return 'Offline';
    if (s === 'timeout') return 'Timeout';
    return 'Secured';
  };

  const statusColor = getStatusColor();
  const isSmall = size === 'small';

  // Responsive sizing
  const containerPadding = isSmall
    ? { horizontal: isSmallPhone ? 8 : 10, vertical: isSmallPhone ? 4 : 5 }
    : { horizontal: isSmallPhone ? 12 : 16, vertical: isSmallPhone ? 6 : 8 };

  const dotSize = isSmall ? (isSmallPhone ? 5 : 6) : (isSmallPhone ? 6 : 7);
  const fontSize = isSmall ? scaleFont(11) : scaleFont(13);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
          paddingHorizontal: containerPadding.horizontal,
          paddingVertical: containerPadding.vertical,
          opacity: fadeAnim,
        },
      ]}
    >
      <View style={[styles.dotWrapper, { width: dotSize + 4, height: dotSize + 4 }]}>
        <Animated.View
          style={[
            styles.pulse,
            {
              backgroundColor: statusColor,
              width: dotSize + 4,
              height: dotSize + 4,
              borderRadius: (dotSize + 4) / 2,
              transform: [{ scale: pulseAnim }],
              opacity: glowAnim,
            },
          ]}
        />
        <View
          style={[
            styles.dot,
            {
              backgroundColor: statusColor,
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.text,
          {
            color: statusColor,
            fontSize,
          },
        ]}
      >
        {getStatusText()}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    borderWidth: 1,
  },
  dotWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  pulse: {
    position: 'absolute',
  },
  dot: {},
  text: {
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
