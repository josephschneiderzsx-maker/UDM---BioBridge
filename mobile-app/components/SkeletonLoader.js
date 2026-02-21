import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

function Skeleton({ width, height = 16, radius = 8, style }) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

export default function SkeletonLoader() {
  return <DoorCardSkeleton />;
}

export function DoorCardSkeleton() {
  const { colors } = useTheme();
  const { cardPadding, spacing, isVerySmallPhone, isSmallPhone } = useResponsive();
  const padding = cardPadding();
  const iconBoxSize = isVerySmallPhone ? 36 : isSmallPhone ? 40 : 42;
  
  return (
    <View style={[styles.card, { 
      backgroundColor: colors.card, 
      borderColor: colors.border,
      padding: padding.horizontal,
      paddingVertical: padding.vertical,
    }]}>
      <Skeleton width={iconBoxSize} height={iconBoxSize} radius={spacing(10)} />
      <View style={styles.info}>
        <Skeleton width={140} height={14} style={{ marginBottom: spacing(8) }} />
        <Skeleton width={90} height={11} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <DoorCardSkeleton key={i} />
      ))}
    </>
  );
}

export function ActivitySkeleton() {
  const { colors } = useTheme();
  const { spacing } = useResponsive();
  
  return (
    <View style={{ paddingHorizontal: spacing(16) }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View
          key={i}
          style={[styles.activityRow, { borderColor: colors.border }]}
        >
          <Skeleton width={32} height={32} radius={16} style={{ marginRight: spacing(12) }} />
          <View style={{ flex: 1 }}>
            <Skeleton width="70%" height={13} style={{ marginBottom: spacing(6) }} />
            <Skeleton width="40%" height={11} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  info: { flex: 1, marginLeft: 12 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
