import { useState, useEffect } from 'react';
import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints
const BREAKPOINTS = {
  verySmallPhone: 320, // Very old/small phones
  smallPhone: 360,     // Motorola G, budget Android (720p)
  phone: 375,          // iPhone X/11/12/13/14
  largePhone: 414,     // iPhone Plus/Max, large Android
  tablet: 768,         // iPad, Android tablets
};

// Base dimensions for scaling (iPhone 11 Pro as reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Premium responsive hook for adaptive UI across all device sizes
 */
export default function useResponsive() {
  const [dimensions, setDimensions] = useState({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
      });
    });

    return () => subscription?.remove();
  }, []);

  const { width, height } = dimensions;

  // Device type detection
  const isVerySmallPhone = width < BREAKPOINTS.smallPhone;
  const isSmallPhone = width >= BREAKPOINTS.smallPhone && width < BREAKPOINTS.phone;
  const isPhone = width >= BREAKPOINTS.phone && width < BREAKPOINTS.largePhone;
  const isLargePhone = width >= BREAKPOINTS.largePhone && width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet;
  const isLowEndDevice = isVerySmallPhone || isSmallPhone || height < 700;

  // Scaling factors
  const widthScale = width / BASE_WIDTH;
  const heightScale = height / BASE_HEIGHT;
  const scale = Math.min(widthScale, heightScale);

  // Font scale with accessibility support
  const fontScale = PixelRatio.getFontScale();
  const accessibleFontScale = Math.min(fontScale, 1.3); // Cap for very large font settings

  /**
   * Scale a value based on screen width
   * @param {number} size - Base size to scale
   * @param {number} factor - Optional scaling factor (default 1)
   */
  const scaleWidth = (size, factor = 1) => {
    const scaled = size * widthScale * factor;
    return Math.round(PixelRatio.roundToNearestPixel(scaled));
  };

  /**
   * Scale a value based on screen height
   * @param {number} size - Base size to scale
   * @param {number} factor - Optional scaling factor (default 1)
   */
  const scaleHeight = (size, factor = 1) => {
    const scaled = size * heightScale * factor;
    return Math.round(PixelRatio.roundToNearestPixel(scaled));
  };

  /**
   * Scale font size with accessibility support
   * @param {number} size - Base font size
   * @param {boolean} allowScaling - Allow system font scaling (default true)
   */
  const scaleFont = (size, allowScaling = true) => {
    const baseScale = isSmallPhone ? 0.9 : isTablet ? 1.1 : 1;
    const scaledSize = size * baseScale * scale;
    
    if (allowScaling) {
      return Math.round(scaledSize * accessibleFontScale);
    }
    return Math.round(scaledSize);
  };

  /**
   * Get responsive spacing
   * @param {number} base - Base spacing value
   */
  const spacing = (base) => {
    const factor = isSmallPhone ? 0.85 : isTablet ? 1.2 : 1;
    return Math.round(base * factor);
  };

  /**
   * Get responsive border radius
   * @param {number} base - Base border radius
   */
  const radius = (base) => {
    const factor = isSmallPhone ? 0.9 : isTablet ? 1.15 : 1;
    return Math.round(base * factor);
  };

  /**
   * Get responsive icon size
   * @param {number} base - Base icon size
   */
  const iconSize = (base) => {
    const factor = isSmallPhone ? 0.85 : isTablet ? 1.2 : 1;
    return Math.round(base * factor);
  };

  /**
   * Get responsive button height
   * @param {string} variant - 'small' | 'medium' | 'large'
   */
  const buttonHeight = (variant = 'medium') => {
    const heights = {
      small: isSmallPhone ? 38 : isTablet ? 48 : 44,
      medium: isSmallPhone ? 48 : isTablet ? 60 : 54,
      large: isSmallPhone ? 52 : isTablet ? 68 : 60,
    };
    return heights[variant] || heights.medium;
  };

  /**
   * Get responsive card padding
   */
  const cardPadding = () => {
    if (isSmallPhone) return { horizontal: 14, vertical: 12 };
    if (isTablet) return { horizontal: 24, vertical: 20 };
    return { horizontal: 18, vertical: 16 };
  };

  /**
   * Get responsive header height
   */
  const headerHeight = () => {
    const base = Platform.OS === 'ios' ? 44 : 56;
    return isSmallPhone ? base - 4 : isTablet ? base + 8 : base;
  };

  /**
   * Get responsive tab bar height
   */
  const tabBarHeight = () => {
    const base = 64;
    if (isVerySmallPhone || isSmallPhone) return 56;
    if (isTablet) return base + 8;
    return base;
  };

  /**
   * Get bottom padding to avoid tab bar overlap
   */
  const tabBarPadding = () => {
    if (isVerySmallPhone || isSmallPhone) return 75;
    if (Platform.OS === 'ios') return 100;
    return 85;
  };

  /**
   * Check if device supports blur effects
   */
  const supportsBlur = Platform.OS === 'ios' || Platform.Version >= 31;

  /**
   * Get safe hit slop for touch targets
   */
  const hitSlop = () => {
    const base = isSmallPhone ? 8 : 10;
    return { top: base, bottom: base, left: base, right: base };
  };

  /**
   * Get responsive grid columns
   */
  const gridColumns = () => {
    if (isTablet) return 3;
    if (isLargePhone) return 2;
    return 1;
  };

  /**
   * Get content max width for tablets
   */
  const contentMaxWidth = () => {
    if (isTablet) return 600;
    return width;
  };

  return {
    // Dimensions
    width,
    height,
    
    // Device types
    isVerySmallPhone,
    isSmallPhone,
    isPhone,
    isLargePhone,
    isTablet,
    isLowEndDevice,
    
    // Scaling functions
    scaleWidth,
    scaleHeight,
    scaleFont,
    spacing,
    radius,
    iconSize,
    buttonHeight,
    cardPadding,
    headerHeight,
    tabBarHeight,
    tabBarPadding,
    hitSlop,
    gridColumns,
    contentMaxWidth,
    
    // Capabilities
    supportsBlur,
    
    // Raw scales
    scale,
    fontScale: accessibleFontScale,
  };
}
