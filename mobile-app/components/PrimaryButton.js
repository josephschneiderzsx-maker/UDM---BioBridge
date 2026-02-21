import React, { useRef } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

export default function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  icon,
  style,
}) {
  const { colors } = useTheme();
  const { scaleFont, buttonHeight, spacing, isSmallPhone, isVerySmallPhone } = useResponsive();
  
  // Subtle press animation
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      tension: 200,
      friction: 15,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 200,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const bg =
    variant === 'primary'
      ? colors.primary
      : variant === 'danger'
      ? colors.danger
      : variant === 'outline'
      ? 'transparent'
      : colors.surface;

  const textColor =
    variant === 'outline'
      ? colors.primary
      : variant === 'secondary'
      ? colors.textPrimary
      : '#000000';

  const borderStyle =
    variant === 'outline' ? { borderWidth: 1.5, borderColor: colors.primary } : {};

  const height = buttonHeight(size);
  const baseFontSizes = {
    small: 14,
    medium: 15,
    large: 17,
  };
  const fontSize = scaleFont(baseFontSizes[size] || baseFontSizes.medium);

  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={1}
        style={[
          styles.button,
          { backgroundColor: bg, height },
          borderStyle,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <View style={styles.content}>
            {icon && <View style={styles.iconLeft}>{icon}</View>}
            <Text style={[styles.text, { color: textColor, fontSize }]}>{title}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: { flexDirection: 'row', alignItems: 'center' },
  iconLeft: { marginRight: 8 },
  text: { fontWeight: '600', letterSpacing: -0.2 },
  disabled: { opacity: 0.4 },
});
