// URZIS PASS - Premium Design System
// Inspired by Apple HIG + Google Material You + URZIS Brand Identity

export const darkColors = {
  // Backgrounds - Pure black foundation (Apple dark mode)
  background: '#000000',
  backgroundSecondary: '#0A0A0A',
  surface: '#1C1C1E',
  surfaceElevated: '#2C2C2E',
  surfaceGlass: 'rgba(28, 28, 30, 0.85)',

  // Primary - URZIS Signature Blue
  primary: '#00AAFF',
  primaryLight: '#4DC5FF',
  primaryDark: '#0088CC',
  primaryDim: 'rgba(0, 170, 255, 0.10)',
  primaryDimStrong: 'rgba(0, 170, 255, 0.18)',

  // Accent - Warm complement
  accent: '#5E5CE6',
  accentDim: 'rgba(94, 92, 230, 0.12)',

  // System Colors
  success: '#30D158',
  successDim: 'rgba(48, 209, 88, 0.10)',
  danger: '#FF453A',
  dangerDim: 'rgba(255, 69, 58, 0.10)',
  warning: '#FFD60A',
  orange: '#FF9F0A',

  // Text - Clean hierarchy
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.55)',
  textTertiary: 'rgba(255, 255, 255, 0.28)',
  textInverse: '#000000',

  // Borders & Separators
  separator: 'rgba(255, 255, 255, 0.06)',
  separatorStrong: 'rgba(255, 255, 255, 0.10)',
  separatorOpaque: '#38383A',

  // Fill
  fillPrimary: 'rgba(120, 120, 128, 0.36)',
  fillSecondary: 'rgba(120, 120, 128, 0.24)',
  fillTertiary: 'rgba(120, 120, 128, 0.16)',
};

export const lightColors = {
  // Backgrounds - iOS light system
  background: '#F2F2F7',
  backgroundSecondary: '#EBEBF0',
  surface: '#FFFFFF',
  surfaceElevated: '#F8F8FA',
  surfaceGlass: 'rgba(255, 255, 255, 0.85)',

  // Primary - URZIS Signature Blue (same)
  primary: '#00AAFF',
  primaryLight: '#4DC5FF',
  primaryDark: '#0088CC',
  primaryDim: 'rgba(0, 170, 255, 0.10)',
  primaryDimStrong: 'rgba(0, 170, 255, 0.18)',

  // Accent
  accent: '#5E5CE6',
  accentDim: 'rgba(94, 92, 230, 0.12)',

  // System Colors
  success: '#34C759',
  successDim: 'rgba(52, 199, 89, 0.10)',
  danger: '#FF3B30',
  dangerDim: 'rgba(255, 59, 48, 0.10)',
  warning: '#FFCC00',
  orange: '#FF9500',

  // Text - Clean hierarchy
  textPrimary: '#000000',
  textSecondary: 'rgba(0, 0, 0, 0.55)',
  textTertiary: 'rgba(0, 0, 0, 0.28)',
  textInverse: '#FFFFFF',

  // Borders & Separators
  separator: 'rgba(0, 0, 0, 0.06)',
  separatorStrong: 'rgba(0, 0, 0, 0.10)',
  separatorOpaque: '#C6C6C8',

  // Fill
  fillPrimary: 'rgba(120, 120, 128, 0.20)',
  fillSecondary: 'rgba(120, 120, 128, 0.16)',
  fillTertiary: 'rgba(120, 120, 128, 0.12)',
};

// Default export for backward compat (used in splash screen / static styles)
export const colors = darkColors;

export const typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.37,
    lineHeight: 41,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.36,
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.35,
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.38,
    lineHeight: 25,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  body: {
    fontSize: 17,
    fontWeight: '400',
    letterSpacing: -0.41,
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.32,
    lineHeight: 21,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.24,
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: -0.08,
    lineHeight: 18,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.07,
    lineHeight: 13,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  full: 9999,
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  glow: (color) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  }),
};
