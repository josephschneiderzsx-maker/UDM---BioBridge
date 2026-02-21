import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'none',
  autoComplete,
  icon,
  error,
  disabled = false,
  multiline = false,
  maxLength,
  style,
  inputStyle,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  testID,
}) {
  const { colors } = useTheme();
  const { scaleFont, spacing, buttonHeight, isSmallPhone, isVerySmallPhone } = useResponsive();
  const [focused, setFocused] = useState(false);
  
  // Subtle border animation
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e) => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start();
    onFocusProp?.(e);
  };

  const handleBlur = (e) => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
    onBlurProp?.(e);
  };

  const borderColor = error
    ? colors.danger
    : borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.border, colors.primary],
      });

  const inputHeight = isVerySmallPhone ? 44 : isSmallPhone ? 46 : 50;
  const labelSize = scaleFont(13);
  const inputFontSize = scaleFont(15);

  return (
    <View style={[styles.container, { marginBottom: spacing(16) }, style]}>
      {label && (
        <Text style={[styles.label, { 
          color: error ? colors.danger : colors.textSecondary,
          fontSize: labelSize,
        }]}>
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor: colors.surface,
            minHeight: multiline ? 100 : inputHeight,
          },
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          style={[styles.input, { 
            color: colors.textPrimary,
            fontSize: inputFontSize,
            height: multiline ? undefined : inputHeight,
          }, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          onFocus={handleFocus}
          onBlur={handleBlur}
          selectionColor={colors.primary}
          editable={!disabled}
          multiline={multiline}
          maxLength={maxLength}
          testID={testID}
        />
      </Animated.View>
      {error && (
        <Text style={[styles.error, { color: colors.danger, fontSize: scaleFont(12) }]}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: { fontWeight: '500', marginBottom: 6, marginLeft: 2 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 0 },
  error: { marginTop: 4, marginLeft: 2 },
});
