import { PageSpacing } from '@/constants/Spacing';
import { useTheme } from '@/context/ThemeContext';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, StyleSheet, View, ViewProps } from 'react-native';

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
  const { tokens } = useTheme();
  
  // On web, BlurView doesn't work the same way, so we use a translucent background
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          styles.webCard,
          { 
            backgroundColor: tokens.glassSurface,
            borderColor: tokens.glassBorder,
          },
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
    <View 
      style={[
        styles.container, 
        { backgroundColor: tokens.glassSurface },
        !noBorder && { borderWidth: 1, borderColor: tokens.glassBorder }, 
        style
      ]} 
      {...props}
    >
      {/* Skip BlurView on Android — software blur is extremely expensive and
          causes frame drops. The solid glassSurface background is sufficient. */}
      {Platform.OS !== 'android' && (
        <BlurView 
          intensity={intensity} 
          tint={tint} 
          style={StyleSheet.absoluteFill} 
        />
      )}
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
  },
  webCard: {
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
  },
  content: {
    // padding is set dynamically
  },
  border: {
    borderWidth: 1,
  },
});
