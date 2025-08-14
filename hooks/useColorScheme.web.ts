
/**
 * Force dark theme for web to match mobile experience
 * Always returns 'dark' regardless of system preferences
 */
export function useColorScheme() {
  // Always return 'dark' for web to ensure consistent theming
  return 'dark' as const;
}
