import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { borderRadius, spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function StatusBadge({ status, size = 'medium' }) {
  const { colors, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
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
    return colors.primary;
  };

  const getStatusText = () => {
    const s = status?.toLowerCase();
    if (s === 'open' || s === 'unlocked') return 'Unlocked';
    if (s === 'error') return 'Error';
    if (s === 'offline') return 'Offline';
    return 'Secured';
  };

  const statusColor = getStatusColor();
  const isSmall = size === 'small';

  return (
    <View style={[
      styles.container,
      isSmall && styles.containerSmall,
      {
        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
      },
    ]}>
      <View style={styles.dotWrapper}>
        <Animated.View
          style={[
            styles.pulse,
            {
              backgroundColor: statusColor,
              transform: [{ scale: pulseAnim }],
              opacity: glowAnim,
            },
          ]}
        />
        <View style={[styles.dot, { backgroundColor: statusColor }]} />
      </View>
      <Text
        style={[
          styles.text,
          isSmall && styles.textSmall,
          { color: statusColor },
        ]}
      >
        {getStatusText()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    borderWidth: 1,
  },
  containerSmall: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dotWrapper: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  pulse: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textSmall: {
    fontSize: 11,
  },
});
