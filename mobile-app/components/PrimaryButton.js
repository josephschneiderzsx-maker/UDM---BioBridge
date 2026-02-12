import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { borderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

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

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.button, size === 'small' && styles.buttonSmall];
    switch (variant) {
      case 'success':
        return [...baseStyle, { backgroundColor: colors.success }];
      case 'danger':
        return [...baseStyle, { backgroundColor: colors.danger }];
      case 'secondary':
        return [...baseStyle, { backgroundColor: colors.primaryDim, borderWidth: 1, borderColor: 'rgba(0, 170, 255, 0.2)' }];
      case 'ghost':
        return [...baseStyle, { backgroundColor: 'transparent' }];
      case 'glass':
        return [...baseStyle, { backgroundColor: colors.fillTertiary, borderWidth: 1, borderColor: colors.separator }];
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
