import { Platform } from 'react-native';

/**
 * MealScanner Green Theme Colors
 * Consistent green color palette used throughout the app
 */

const tintColorLight = '#32D74B'; // Lime green
const tintColorDark = '#32D74B'; // Lime green
const primaryGreen = '#32D74B'; // Lime green
const lightGreen = '#32D74B'; // Lime green
const darkGreen = '#28A745'; // Darker lime green

// Platform-specific font family for Helvetica Neue
export const getFontFamily = () => {
  if (Platform.OS === 'ios') {
    return 'HelveticaNeue';
  } else if (Platform.OS === 'android') {
    return 'sans-serif';
  } else {
    // Web - comprehensive font stack to ensure Helvetica Neue is used
    return 'Helvetica Neue, Helvetica, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, sans-serif';
  }
};

// Dark theme colors for consistent theming
const darkColors = {
  text: '#F9FAFB',
  background: '#111827',
  tint: tintColorDark,
  icon: '#9CA3AF',
  tabIconDefault: '#9CA3AF',
  tabIconSelected: tintColorDark,
  primary: lightGreen,
  primaryLight: '#6EE7B7', // Green-300
  primaryDark: primaryGreen,
  surface: '#1F2937', // Gray-800
  border: '#374151', // Gray-700
};

export const Colors = {
  light: Platform.OS === 'web' ? darkColors : {
    text: '#111827', // Gray-900
    background: '#FFFFFF',
    tint: tintColorLight,
    icon: '#6B7280', // Gray-500
    tabIconDefault: '#6B7280',
    tabIconSelected: tintColorLight,
    primary: primaryGreen,
    primaryLight: lightGreen,
    primaryDark: darkGreen,
    surface: '#F9FAFB', // Gray-50
    border: '#E5E7EB', // Gray-200
  },
  dark: darkColors,
};
