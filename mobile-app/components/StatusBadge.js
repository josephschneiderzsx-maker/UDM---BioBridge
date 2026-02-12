import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, borderRadius, spacing } from '../constants/theme';

export default function StatusBadge({ status, size = 'medium' }) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.5,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
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
    <View style={[styles.container, isSmall && styles.containerSmall]}>
      <View style={styles.dotWrapper}>
        <Animated.View
          style={[
            styles.pulse,
            {
              backgroundColor: statusColor,
              transform: [{ scale: pulseAnim }],
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
    backgroundColor: colors.fillTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
  },
  containerSmall: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
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
    opacity: 0.3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 11,
  },
});
