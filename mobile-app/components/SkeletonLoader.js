import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../contexts/ThemeContext';
import { borderRadius } from '../constants/theme';

/**
 * Premium skeleton loader with shimmer effect
 * Adapts to theme and provides smooth loading states
 */
export default function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.md,
  style,
  variant = 'default', // 'default' | 'card' | 'avatar' | 'text' | 'button'
  lines = 1, // For text variant
  spacing: lineSpacing = 8,
}) {
  const { colors, isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-200, 200],
  });

  const baseColor = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
  const shimmerColor = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)';

  const getVariantStyle = () => {
    switch (variant) {
      case 'card':
        return {
          width: '100%',
          height: 80,
          borderRadius: borderRadius.lg,
        };
      case 'avatar':
        return {
          width: 44,
          height: 44,
          borderRadius: 22,
        };
      case 'button':
        return {
          width: '100%',
          height: 54,
          borderRadius: borderRadius.md,
        };
      case 'text':
        return {
          width: '100%',
          height: 16,
          borderRadius: borderRadius.xs,
        };
      default:
        return {
          width,
          height,
          borderRadius: radius,
        };
    }
  };

  const variantStyle = getVariantStyle();

  const renderSingleSkeleton = (index = 0, customWidth) => (
    <View
      key={index}
      style={[
        styles.skeleton,
        {
          backgroundColor: baseColor,
          width: customWidth || variantStyle.width,
          height: variantStyle.height,
          borderRadius: variantStyle.borderRadius,
          marginBottom: index < lines - 1 ? lineSpacing : 0,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['transparent', shimmerColor, 'transparent']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );

  if (variant === 'text' && lines > 1) {
    return (
      <View style={styles.textContainer}>
        {Array.from({ length: lines }).map((_, index) => {
          const lineWidth = index === lines - 1 ? '60%' : '100%';
          return renderSingleSkeleton(index, lineWidth);
        })}
      </View>
    );
  }

  return renderSingleSkeleton();
}

/**
 * Skeleton card preset for door cards
 */
export function DoorCardSkeleton() {
  const { colors, isDark } = useTheme();
  
  return (
    <View style={[styles.doorCard, { 
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    }]}>
      <SkeletonLoader variant="avatar" />
      <View style={styles.doorCardContent}>
        <SkeletonLoader width="70%" height={18} style={{ marginBottom: 8 }} />
        <SkeletonLoader width="40%" height={14} />
      </View>
      <SkeletonLoader width={24} height={24} borderRadius={12} />
    </View>
  );
}

/**
 * Skeleton list for multiple cards
 */
export function SkeletonList({ count = 3, variant = 'card' }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, index) => (
        variant === 'card' ? (
          <DoorCardSkeleton key={index} />
        ) : (
          <SkeletonLoader key={index} variant={variant} style={{ marginBottom: 12 }} />
        )
      ))}
    </View>
  );
}

/**
 * Activity log skeleton
 */
export function ActivitySkeleton() {
  const { colors, isDark } = useTheme();
  
  return (
    <View style={[styles.activityCard, {
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
    }]}>
      <View style={styles.activityAccent} />
      <SkeletonLoader width={40} height={40} borderRadius={12} />
      <View style={styles.activityContent}>
        <SkeletonLoader width="60%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonLoader width="40%" height={12} />
      </View>
      <SkeletonLoader width={50} height={12} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
    width: 200,
  },
  textContainer: {
    width: '100%',
  },
  listContainer: {
    width: '100%',
  },
  doorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  doorCardContent: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 14,
    paddingRight: 16,
    borderWidth: 1,
    marginBottom: 6,
    overflow: 'hidden',
  },
  activityAccent: {
    width: 3,
    height: '100%',
    backgroundColor: 'rgba(0, 170, 255, 0.3)',
    marginRight: 14,
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
});
