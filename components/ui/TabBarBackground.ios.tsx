import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';

export default function BlurTabBarBackground() {
  return (
    <View style={styles.container}>
      <BlurView
        // System chrome material automatically adapts to the system's theme
        // and matches the native tab bar appearance on iOS.
        tint="systemChromeMaterialDark" 
        intensity={80}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay} />
    </View>
  );
}

export function useBottomTabOverflow() {
  return useBottomTabBarHeight();
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 44, 34, 0.4)', // Green tint
  },
});
