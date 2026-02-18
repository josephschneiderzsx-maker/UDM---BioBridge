import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { ChevronRight, Shield } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { borderRadius, spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

/**
 * Premium door card with enhanced animations and responsiveness
 */
export default function DoorCard({ door, onPress, onLongPress, index = 0 }) {
  const { colors, isDark } = useTheme();
  const { scaleFont, spacing: rSpacing, iconSize, isSmallPhone, isTablet } = useResponsive();
  
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const pressScaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 60;
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        tension: 60,
        friction: 8,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index]);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(door);
  };

  const handleLongPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress?.(door);
  };

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(pressScaleAnim, {
        toValue: 0.97,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(pressScaleAnim, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const cardPadding = isSmallPhone ? 14 : isTablet ? 22 : 18;
  const iconContainerSize = isSmallPhone ? 38 : isTablet ? 52 : 44;

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          transform: [
            { scale: Animated.multiply(scaleAnim, pressScaleAnim) },
            { translateY: translateYAnim },
          ],
          opacity: opacityAnim,
          marginBottom: rSpacing(10),
        },
      ]}
    >
      {/* Glow effect on press */}
      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: colors.primary,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.08],
            }),
            borderRadius: borderRadius.lg + 4,
          },
        ]}
      />
      
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            paddingVertical: cardPadding,
            paddingHorizontal: cardPadding + 2,
          },
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        delayLongPress={400}
        accessibilityRole="button"
        accessibilityLabel={`Door: ${door.name}`}
        accessibilityHint="Tap to control, long press for options"
      >
        {/* Icon container with gradient background */}
        <View
          style={[
            styles.iconContainer,
            {
              width: iconContainerSize,
              height: iconContainerSize,
              borderRadius: iconContainerSize / 3,
              backgroundColor: colors.primaryDim,
            },
          ]}
        >
          <Shield
            size={iconSize(20)}
            color={colors.primary}
            strokeWidth={2}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[
              styles.doorName,
              {
                color: colors.textPrimary,
                fontSize: scaleFont(16),
              },
            ]}
            numberOfLines={1}
          >
            {door.name}
          </Text>
          <Text
            style={[
              styles.doorInfo,
              {
                color: colors.textTertiary,
                fontSize: scaleFont(13),
              },
            ]}
            numberOfLines={1}
          >
            {door.terminal_ip}
          </Text>
        </View>

        {/* Trailing arrow */}
        <View
          style={[
            styles.trailing,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
              width: isSmallPhone ? 20 : 24,
              height: isSmallPhone ? 20 : 24,
              borderRadius: isSmallPhone ? 10 : 12,
            },
          ]}
        >
          <ChevronRight
            size={iconSize(14)}
            color={colors.textTertiary}
            strokeWidth={2.5}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
  },
  doorName: {
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  doorInfo: {
    letterSpacing: 0.1,
  },
  trailing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
