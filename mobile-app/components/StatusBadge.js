import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

export default function StatusBadge({ status }) {
  const { colors } = useTheme();
  const { scaleFont, spacing } = useResponsive();
  const isUnlocked = status === 'Unlocked';

  const color = isUnlocked ? colors.success : colors.textSecondary;
  const bg = isUnlocked
    ? 'rgba(50, 215, 75, 0.14)'
    : 'rgba(136, 136, 136, 0.10)';

  // Pulse the dot when unlocked
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isUnlocked) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.6, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse.setValue(1);
    }
  }, [isUnlocked]);

  return (
    <View style={[styles.badge, { 
      backgroundColor: bg,
      paddingHorizontal: spacing(12),
      paddingVertical: spacing(6),
    }]}>
      <View style={styles.dotWrap}>
        {isUnlocked && (
          <Animated.View
            style={[
              styles.dotRing,
              { backgroundColor: color, transform: [{ scale: pulse }], opacity: 0.35 },
            ]}
          />
        )}
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.text, { 
        color,
        fontSize: scaleFont(13),
      }]}>{status || 'Secured'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    alignSelf: 'center',
    gap: 7,
  },
  dotWrap: {
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: { fontWeight: '600' },
});
