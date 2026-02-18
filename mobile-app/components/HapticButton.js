import React, { useRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Animated,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

/**
 * Premium button with haptic feedback and micro-animations
 * Responsive sizing and accessibility support
 */
export default function HapticButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary', // 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'glass'
  icon,
  iconPosition = 'left',
  size = 'medium', // 'small' | 'medium' | 'large'
  style,
  textStyle,
  fullWidth = true,
  hapticStyle = 'medium', // 'light' | 'medium' | 'heavy' | 'none'
}) {
  const { colors } = useTheme();
  const { scaleFont, buttonHeight, isSmallPhone } = useResponsive();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  const triggerHaptic = async () => {
    if (hapticStyle === 'none') return;
    
    const styles = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    
    await Haptics.impactAsync(styles[hapticStyle] || styles.medium);
  };

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        tension: 150,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = async () => {
    // Haptic disabled - only use for important actions (unlock door)
    onPress?.();
  };

  const getButtonStyle = () => {
    const height = buttonHeight(size);
    const baseStyle = [
      styles.button,
      { height },
      size === 'small' && styles.buttonSmall,
      size === 'large' && styles.buttonLarge,
    ];

    switch (variant) {
      case 'success':
        return [...baseStyle, { backgroundColor: colors.success }];
      case 'danger':
        return [...baseStyle, { backgroundColor: colors.danger }];
      case 'secondary':
        return [
          ...baseStyle,
          {
            backgroundColor: colors.primaryDim,
            borderWidth: 1,
            borderColor: 'rgba(0, 170, 255, 0.2)',
          },
        ];
      case 'ghost':
        return [...baseStyle, { backgroundColor: 'transparent' }];
      case 'glass':
        return [
          ...baseStyle,
          {
            backgroundColor: colors.fillTertiary,
            borderWidth: 1,
            borderColor: colors.separator,
          },
        ];
      default:
        return [...baseStyle, { backgroundColor: colors.primary }];
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'secondary':
      case 'ghost':
        return colors.primary;
      case 'glass':
        return colors.textPrimary;
      default:
        return '#FFFFFF';
    }
  };

  const getFontSize = () => {
    const baseSizes = {
      small: 14,
      medium: 16,
      large: 18,
    };
    return scaleFont(baseSizes[size] || baseSizes.medium);
  };

  const textColor = getTextColor();

  return (
    <Animated.View
      style={[
        !fullWidth && styles.autoWidth,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={[
          ...getButtonStyle(),
          disabled && styles.disabled,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: disabled || loading }}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            <Text
              style={[
                styles.text,
                { color: textColor, fontSize: getFontSize() },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonSmall: {
    paddingHorizontal: 16,
    borderRadius: borderRadius.sm,
  },
  buttonLarge: {
    paddingHorizontal: 32,
    borderRadius: borderRadius.lg,
  },
  disabled: {
    opacity: 0.35,
  },
  autoWidth: {
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  text: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
