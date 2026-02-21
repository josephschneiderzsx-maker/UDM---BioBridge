import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SMALL_SCREEN_HEIGHT_THRESHOLD = 640;

export const isSmallScreen = SCREEN_HEIGHT < SMALL_SCREEN_HEIGHT_THRESHOLD;

/**
 * Header height for floating headers. Use a smaller value on small screens to free space.
 * @param {number} defaultHeight - Default height (e.g. 160, 120, 140)
 * @returns {number}
 */
export function compactHeaderHeight(defaultHeight) {
  if (!isSmallScreen) return defaultHeight;
  const ratio = 0.22;
  const maxFromRatio = Math.round(SCREEN_HEIGHT * ratio);
  return Math.min(defaultHeight, Math.max(maxFromRatio, 100));
}

/**
 * Bottom padding for content when tab bar is visible (small screens get less padding).
 */
export const TAB_BAR_PADDING_BOTTOM = isSmallScreen ? 80 : 100;

export { SCREEN_WIDTH, SCREEN_HEIGHT };
