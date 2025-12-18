import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { neonGreen, glassSurface, glassBorder } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';

export type TagColor = 'default' | 'accent' | 'muted';

interface TagProps {
  color?: TagColor;
  children: React.ReactNode;
}

export function Tag({ color = 'default', children }: TagProps) {
  const getStyles = () => {
    switch (color) {
      case 'accent':
        return { 
          backgroundColor: 'rgba(74, 222, 128, 0.2)', 
          borderColor: neonGreen,
          textColor: neonGreen 
        };
      case 'muted':
        return { 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          borderColor: 'rgba(255, 255, 255, 0.1)', 
          textColor: 'rgba(255, 255, 255, 0.6)' 
        };
      default:
        return { 
          backgroundColor: glassSurface, 
          borderColor: glassBorder, 
          textColor: '#FFFFFF' 
        };
    }
  };

  const { backgroundColor, borderColor, textColor } = getStyles();

  return (
    <View style={[styles.tag, { backgroundColor, borderColor }]}>
      <Text style={[TextStyles.caption, { color: textColor, fontWeight: '500' }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});
