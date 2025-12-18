import React from 'react';
import { StyleSheet, View } from 'react-native';
import { neonGreen, accentYellow } from '@/constants/Colors';

export type MascotMood = 'neutral' | 'happy' | 'encouraging';

interface MascotProps {
  mood?: MascotMood;
  size?: number;
}

export function Mascot({ mood = 'neutral', size = 64 }: MascotProps) {
  // Determine colors based on mood
  const getColors = () => {
    switch (mood) {
      case 'happy':
        return {
          body: accentYellow,
          face: '#000000',
        };
      case 'encouraging':
        return {
          body: neonGreen,
          face: '#000000',
        };
      default: // neutral
        return {
          body: neonGreen,
          face: '#000000',
        };
    }
  };

  const colors = getColors();
  const eyeSize = size * 0.12;
  const eyeSpacing = size * 0.25;
  const smileWidth = size * 0.4;
  const smileHeight = size * 0.15;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Body - rounded circle */}
      <View style={[styles.body, { 
        width: size, 
        height: size, 
        borderRadius: size / 2,
        backgroundColor: colors.body,
      }]}>
        {/* Eyes */}
        <View style={styles.eyesContainer}>
          <View style={[styles.eye, { 
            width: eyeSize, 
            height: eyeSize, 
            borderRadius: eyeSize / 2,
            backgroundColor: colors.face,
            left: size / 2 - eyeSpacing - eyeSize / 2,
          }]} />
          <View style={[styles.eye, { 
            width: eyeSize, 
            height: eyeSize, 
            borderRadius: eyeSize / 2,
            backgroundColor: colors.face,
            right: size / 2 - eyeSpacing - eyeSize / 2,
          }]} />
        </View>

        {/* Smile */}
        <View style={[styles.smileContainer, { 
          top: size * 0.55,
          width: smileWidth,
          height: smileHeight,
        }]}>
          <View style={[styles.smile, {
            width: smileWidth,
            height: smileHeight,
            borderBottomLeftRadius: smileHeight,
            borderBottomRightRadius: smileHeight,
            borderWidth: size * 0.08,
            borderColor: colors.face,
            borderTopWidth: 0,
          }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyesContainer: {
    position: 'absolute',
    top: '35%',
    width: '100%',
    height: '20%',
  },
  eye: {
    position: 'absolute',
    top: 0,
  },
  smileContainer: {
    position: 'absolute',
    left: '50%',
    marginLeft: -0, // Will be adjusted by width
    justifyContent: 'center',
    alignItems: 'center',
  },
  smile: {
    marginLeft: -0, // Center the smile
  },
});

