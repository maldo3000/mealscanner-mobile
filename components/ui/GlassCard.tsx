import React from 'react';
import { StyleSheet, View, ViewProps, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, glassBorder, glassSurface } from '@/constants/Colors';
import { PageSpacing } from '@/constants/Spacing';

interface GlassCardProps extends ViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default' | 'systemMaterial' | 'systemMaterialLight' | 'systemMaterialDark';
  children: React.ReactNode;
  noBorder?: boolean;
  padding?: number;
  gap?: number;
}

export function GlassCard({ 
  intensity = 20, 
  tint = 'dark', 
  children, 
  style, 
  noBorder = false,
  padding = 20,
  gap,
  ...props 
}: GlassCardProps) {
  
  // On web, BlurView doesn't work the same way, so we use a translucent background
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.webCard,
          !noBorder && styles.border,
          { padding, gap: gap || PageSpacing.elementGap },
          style,
        ]}
        {...props}
      >
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, !noBorder && styles.border, style]} {...props}>
      <BlurView 
        intensity={intensity} 
        tint={tint} 
        style={StyleSheet.absoluteFill} 
      />
      <View style={[styles.content, { padding, gap: gap || PageSpacing.elementGap }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: 'rgba(2, 44, 34, 0.6)', // Deep green tint
  },
  webCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glassBorder,
  },
  content: {
    // padding is set dynamically
  },
  border: {
    borderWidth: 1,
    borderColor: glassBorder,
  },
});

