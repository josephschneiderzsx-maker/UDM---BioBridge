import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

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
    variant === 'outline' ? { borderWidth: 1, borderColor: colors.primary } : {};

  const height = size === 'small' ? 40 : size === 'large' ? 56 : 50;
  const fontSize = size === 'small' ? 14 : size === 'large' ? 17 : 15;

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
      style={[
        styles.button,
        { backgroundColor: bg, height },
        borderStyle,
        isDisabled && styles.disabled,
        style,
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
