import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export type RecipeSource = 'ai' | 'scanned' | 'discover';

interface SourceBadgeProps {
  source: RecipeSource;
  size?: number;
}

export function SourceBadge({ source, size = 16 }: SourceBadgeProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getSourceIcon = () => {
    switch (source) {
      case 'ai':
        return 'sparkles' as const;
      case 'scanned':
        return 'camera' as const;
      case 'discover':
        return 'star.fill' as const;
    }
  };

  const getSourceColor = () => {
    switch (source) {
      case 'ai':
        return colors.tint;
      case 'scanned':
        return '#FFFFFF';
      case 'discover':
        return '#FDE047'; // accentYellow
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
      <IconSymbol 
        name={getSourceIcon()} 
        size={size} 
        color={getSourceColor()} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});



