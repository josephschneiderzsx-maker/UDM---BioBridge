import { useState, useEffect } from 'react';
import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints basés sur la largeur réelle (après ajustement densité)
const BREAKPOINTS = {
  verySmallPhone: 320,
  smallPhone: 360,
  phone: 375,
  largePhone: 414,
  tablet: 768,
};

// Base dimensions for scaling (iPhone 11 Pro as reference)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Premium responsive hook for adaptive UI across all device sizes
 * Adapte automatiquement à la densité de pixel et taille de police système
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

  // Densité de pixel de l'écran (1 = mdpi, 2 = xhdpi, 3 = xxhdpi, etc.)
  const pixelDensity = PixelRatio.get();
  
  // Font scale système (1 = normal, 1.5 = grande, etc.)
  const systemFontScale = PixelRatio.getFontScale();
  
  // Détection si l'utilisateur a une grande taille de police système
  const hasLargeFontScale = systemFontScale > 1.15;
  const hasVeryLargeFontScale = systemFontScale > 1.35;
  
  // Densité élevée (écrans haute résolution avec petite taille physique)
  const hasHighDensity = pixelDensity >= 3;
  
  // Calcul de la largeur "effective" (ajustée pour la densité)
  // Sur les écrans haute densité, on considère une taille plus petite
  const effectiveWidth = hasHighDensity && width < 400 ? width * 0.9 : width;

  // Device type detection - basé sur la largeur effective
  const isVerySmallPhone = effectiveWidth < BREAKPOINTS.smallPhone;
  const isSmallPhone = effectiveWidth >= BREAKPOINTS.smallPhone && effectiveWidth < BREAKPOINTS.phone;
  const isPhone = effectiveWidth >= BREAKPOINTS.phone && effectiveWidth < BREAKPOINTS.largePhone;
  const isLargePhone = effectiveWidth >= BREAKPOINTS.largePhone && effectiveWidth < BREAKPOINTS.tablet;
  const isTablet = effectiveWidth >= BREAKPOINTS.tablet;
  
  // Low-end device: petit écran OU grande police système OU haute densité avec petit écran
  const isLowEndDevice = isVerySmallPhone || isSmallPhone || hasVeryLargeFontScale || (hasHighDensity && width < 380);
  
  // Besoin de compactage: écran petit + grande police
  const needsCompactMode = (isSmallPhone || isVerySmallPhone) && hasLargeFontScale;

  // Scaling factors
  const widthScale = effectiveWidth / BASE_WIDTH;
  const heightScale = height / BASE_HEIGHT;
  const scale = Math.min(widthScale, heightScale);

  // Font scale avec protection contre les très grandes polices système
  // On limite le scaling pour éviter les débordements
  const cappedFontScale = Math.min(systemFontScale, needsCompactMode ? 1.1 : 1.3);

  /**
   * Scale a value based on screen width
   */
  const scaleWidth = (size, factor = 1) => {
    const scaled = size * widthScale * factor;
    return Math.round(PixelRatio.roundToNearestPixel(scaled));
  };

  /**
   * Scale a value based on screen height
   */
  const scaleHeight = (size, factor = 1) => {
    const scaled = size * heightScale * factor;
    return Math.round(PixelRatio.roundToNearestPixel(scaled));
  };

  /**
   * Scale font size - adapté à la densité et préférences système
   * @param {number} size - Base font size
   * @param {boolean} respectSystemScale - Respecter la taille système (true par défaut)
   */
  const scaleFont = (size, respectSystemScale = true) => {
    // Facteur de base selon le type d'appareil
    let baseScale = 1;
    if (isVerySmallPhone || needsCompactMode) {
      baseScale = 0.85;
    } else if (isSmallPhone) {
      baseScale = 0.9;
    } else if (isTablet) {
      baseScale = 1.1;
    }
    
    // Scaling de l'écran (légèrement atténué pour éviter les très grandes polices)
    const screenScale = Math.min(scale, 1.1);
    
    let scaledSize = size * baseScale * screenScale;
    
    // Appliquer le scaling système si demandé (avec cap)
    if (respectSystemScale) {
      scaledSize *= cappedFontScale;
    }
    
    return Math.round(scaledSize);
  };

  /**
   * Get responsive spacing - réduit sur petits écrans
   */
  const spacing = (base) => {
    let factor = 1;
    if (isVerySmallPhone || needsCompactMode) {
      factor = 0.7;
    } else if (isSmallPhone) {
      factor = 0.8;
    } else if (isTablet) {
      factor = 1.2;
    }
    return Math.round(base * factor);
  };

  /**
   * Get responsive border radius
   */
  const radius = (base) => {
    const factor = isVerySmallPhone ? 0.85 : isTablet ? 1.15 : 1;
    return Math.round(base * factor);
  };

  /**
   * Get responsive icon size
   */
  const iconSize = (base) => {
    let factor = 1;
    if (isVerySmallPhone || needsCompactMode) {
      factor = 0.8;
    } else if (isSmallPhone) {
      factor = 0.85;
    } else if (isTablet) {
      factor = 1.2;
    }
    return Math.round(base * factor);
  };

  /**
   * Get responsive button height
   */
  const buttonHeight = (variant = 'medium') => {
    const heights = {
      small: isVerySmallPhone ? 34 : isSmallPhone ? 38 : isTablet ? 48 : 44,
      medium: isVerySmallPhone ? 42 : isSmallPhone ? 46 : isTablet ? 60 : 52,
      large: isVerySmallPhone ? 48 : isSmallPhone ? 52 : isTablet ? 68 : 58,
    };
    return heights[variant] || heights.medium;
  };

  /**
   * Get responsive card padding
   */
  const cardPadding = () => {
    if (isVerySmallPhone || needsCompactMode) return { horizontal: 10, vertical: 8 };
    if (isSmallPhone) return { horizontal: 12, vertical: 10 };
    if (isTablet) return { horizontal: 24, vertical: 20 };
    return { horizontal: 16, vertical: 14 };
  };

  /**
   * Get responsive header height
   */
  const headerHeight = () => {
    const base = Platform.OS === 'ios' ? 44 : 56;
    if (isVerySmallPhone || needsCompactMode) return base - 8;
    if (isSmallPhone) return base - 4;
    if (isTablet) return base + 8;
    return base;
  };

  /**
   * Get responsive tab bar height
   */
  const tabBarHeight = () => {
    if (isVerySmallPhone || needsCompactMode) return 50;
    if (isSmallPhone) return 54;
    if (isTablet) return 72;
    return 62;
  };

  /**
   * Get bottom padding to avoid tab bar overlap
   */
  const tabBarPadding = () => {
    if (isVerySmallPhone || needsCompactMode) return 65;
    if (isSmallPhone) return 70;
    if (Platform.OS === 'ios') return 95;
    return 80;
  };

  /**
   * Check if device supports blur effects
   */
  const supportsBlur = Platform.OS === 'ios' || Platform.Version >= 31;

  /**
   * Get safe hit slop for touch targets
   */
  const hitSlop = () => {
    const base = isVerySmallPhone ? 6 : isSmallPhone ? 8 : 10;
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

  /**
   * Get margin for floating elements (header, tab bar)
   */
  const floatingMargin = () => {
    if (isVerySmallPhone || needsCompactMode) return 8;
    if (isSmallPhone) return 12;
    if (isTablet) return 24;
    return 16;
  };

  /**
   * Get compact mode status
   */
  const isCompactMode = needsCompactMode;

  return {
    // Dimensions
    width,
    height,
    effectiveWidth,
    
    // Device types
    isVerySmallPhone,
    isSmallPhone,
    isPhone,
    isLargePhone,
    isTablet,
    isLowEndDevice,
    isCompactMode,
    
    // System settings detection
    pixelDensity,
    systemFontScale,
    hasLargeFontScale,
    hasHighDensity,
    
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
    floatingMargin,
    
    // Capabilities
    supportsBlur,
    
    // Raw scales
    scale,
    fontScale: cappedFontScale,
  };
}
