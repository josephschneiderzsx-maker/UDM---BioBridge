import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { borderRadius, spacing } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import useResponsive from '../hooks/useResponsive';

/**
 * Premium input component with enhanced animations and responsiveness
 * Supports accessibility, error states, and smooth focus transitions
 */
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
  const { colors, isDark } = useTheme();
  const { scaleFont, buttonHeight, isSmallPhone, isTablet } = useResponsive();
  
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(borderAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused]);

  useEffect(() => {
    if (error) {
      // Shake animation on error
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  const handleFocus = (e) => {
    setIsFocused(true);
    Animated.spring(labelAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: false,
    }).start();
    onFocusProp?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (!value) {
      Animated.spring(labelAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: false,
      }).start();
    }
    onBlurProp?.(e);
  };

  const borderColor = error
    ? colors.danger
    : borderAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
          isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
          colors.primary,
        ],
      });

  const backgroundColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      colors.surface,
      isDark ? 'rgba(0, 170, 255, 0.06)' : 'rgba(0, 170, 255, 0.04)',
    ],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  const inputHeight = buttonHeight('medium');
  const fontSize = scaleFont(16);
  const labelFontSize = scaleFont(12);

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX: shakeAnim }] },
        style,
      ]}
    >
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: error ? colors.danger : colors.textSecondary,
              fontSize: labelFontSize,
            },
          ]}
        >
          {label}
        </Text>
      )}
      
      <View style={styles.inputContainer}>
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glow,
            {
              backgroundColor: error ? colors.danger : colors.primary,
              opacity: glowOpacity,
              borderRadius: borderRadius.md + 4,
            },
          ]}
        />
        
        <Animated.View
          style={[
            styles.inputWrapper,
            {
              borderColor,
              backgroundColor,
              height: multiline ? undefined : inputHeight,
              minHeight: multiline ? inputHeight : undefined,
              borderRadius: borderRadius.md,
            },
          ]}
        >
          {icon && (
            <View style={[styles.iconWrapper, { opacity: isFocused ? 0.8 : 0.5 }]}>
              {icon}
            </View>
          )}
          
          <TextInput
            style={[
              styles.input,
              {
                color: colors.textPrimary,
                fontSize,
                paddingVertical: multiline ? spacing.md : 0,
              },
              inputStyle,
            ]}
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
            accessibilityLabel={label}
            accessibilityHint={placeholder}
            accessibilityState={{ disabled }}
          />
        </Animated.View>
      </View>

      {error && (
        <Animated.Text
          style={[
            styles.errorText,
            {
              color: colors.danger,
              fontSize: scaleFont(12),
            },
          ]}
        >
          {error}
        </Animated.Text>
      )}

      {maxLength && value && (
        <Text
          style={[
            styles.charCount,
            {
              color: colors.textTertiary,
              fontSize: scaleFont(11),
            },
          ]}
        >
          {value.length}/{maxLength}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginLeft: 2,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  inputContainer: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  iconWrapper: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    letterSpacing: -0.2,
  },
  errorText: {
    marginTop: spacing.xs,
    marginLeft: 2,
    fontWeight: '500',
  },
  charCount: {
    position: 'absolute',
    right: spacing.md,
    bottom: -spacing.lg,
    fontWeight: '400',
  },
});
