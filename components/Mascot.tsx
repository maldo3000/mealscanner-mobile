import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export type MascotMood = 'neutral' | 'happy' | 'encouraging';

interface MascotProps {
  mood?: MascotMood;
  size?: number;
}

export function Mascot({ mood = 'neutral', size = 64 }: MascotProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('../assets/images/avocado-mascot.png')}
        style={[styles.avocadoImage, { width: size, height: size }]}
        resizeMode="contain"
        accessibilityLabel="Avocado mascot"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avocadoImage: {
    width: '100%',
    height: '100%',
  },
});

