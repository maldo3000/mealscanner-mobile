import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';

export type TagColor = 'default' | 'accent' | 'muted';

interface TagProps {
  color?: TagColor;
  children: React.ReactNode;
}

export function Tag({ color = 'default', children }: TagProps) {
  const { tokens, accentAlpha } = useTheme();

  const getStyles = () => {
    switch (color) {
      case 'accent':
        return { 
          backgroundColor: accentAlpha(0.2), 
          borderColor: tokens.accent,
          textColor: tokens.accent 
        };
      case 'muted':
        return { 
          backgroundColor: tokens.borderSubtle, 
          borderColor: tokens.glassBorder, 
          textColor: tokens.textMuted 
        };
      default:
        return { 
          backgroundColor: tokens.glassSurface, 
          borderColor: tokens.glassBorder, 
          textColor: tokens.textPrimary 
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
