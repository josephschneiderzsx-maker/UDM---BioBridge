import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, borderRadius } from '../constants/theme';

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
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button, size === 'small' && styles.buttonSmall];
    switch (variant) {
      case 'success':
        return [...baseStyle, styles.successButton];
      case 'danger':
        return [...baseStyle, styles.dangerButton];
      case 'secondary':
        return [...baseStyle, styles.secondaryButton];
      case 'ghost':
        return [...baseStyle, styles.ghostButton];
      case 'glass':
        return [...baseStyle, styles.glassButton];
      default:
        return [...baseStyle, styles.primaryButton];
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

  return (
    <TouchableOpacity
      style={[
        ...getButtonStyle(),
        disabled && styles.disabled,
        !fullWidth && styles.autoWidth,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
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
              { color: getTextColor() },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  buttonSmall: {
    height: 44,
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: 'rgba(0, 170, 255, 0.2)',
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  glassButton: {
    backgroundColor: colors.fillTertiary,
    borderWidth: 1,
    borderColor: colors.separator,
  },
  successButton: {
    backgroundColor: colors.success,
  },
  dangerButton: {
    backgroundColor: colors.danger,
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
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  textSmall: {
    fontSize: 15,
  },
});
