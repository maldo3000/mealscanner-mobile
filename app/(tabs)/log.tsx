import React from 'react';
import { Redirect } from 'expo-router';

/**
 * The Log tab is now handled by a global overlay in app/(tabs)/_layout.tsx.
 * If a user navigates here directly, we redirect them to the home screen.
 */
export default function LogScreen(): React.ReactElement {
  return <Redirect href="/(tabs)/" />;
}
