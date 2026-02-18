import React from 'react';
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
 * Primary button component with haptic feedback and responsive sizing
 * Backward compatible with existing usage while adding new premium features
 */
export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  icon,
  size = 'large',
  style,
  textStyle,
  fullWidth = true,
}) {
  const { colors } = useTheme();
  const { scaleFont, buttonHeight, isSmallPhone } = useResponsive();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      tension: 150,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 150,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const getButtonStyle = () => {
    const height = size === 'small' 
      ? buttonHeight('small') 
      : size === 'large' 
        ? buttonHeight('large') 
        : buttonHeight('medium');
    
    const baseStyle = [
      styles.button,
      { height },
      size === 'small' && styles.buttonSmall,
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

  const fontSize = size === 'small' 
    ? scaleFont(14) 
    : size === 'large' 
      ? scaleFont(17) 
      : scaleFont(15);

  return (
    <Animated.View
      style={[
        !fullWidth && styles.autoWidth,
        { transform: [{ scale: scaleAnim }] },
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
          <ActivityIndicator color={getTextColor()} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && <View style={styles.iconWrapper}>{icon}</View>}
            <Text
              style={[
                styles.text,
                size === 'small' && styles.textSmall,
                { color: getTextColor(), fontSize },
                textStyle,
              ]}
            >
              {title}
            </Text>
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
  },
  iconWrapper: {
    marginRight: 8,
  },
  text: {
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  textSmall: {
    fontSize: 15,
  },
});
