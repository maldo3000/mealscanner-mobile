import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconSymbol } from './IconSymbol';
import { neonGreen, glassSurface, glassBorder, textWhite, textMuted } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';

export type BadgeAccentColor = 'default' | 'neon' | 'mint' | 'sky' | 'coral';

interface BadgeProps {
  icon: string;
  title: string;
  unlocked: boolean;
  accentColor?: BadgeAccentColor;
}

export function Badge({ icon, title, unlocked, accentColor = 'neon' }: BadgeProps) {
  
  const getAccentColor = () => {
    switch (accentColor) {
      case 'neon': return neonGreen;
      case 'mint': return '#a7f3d0';
      case 'sky': return '#38bdf8';
      case 'coral': return '#f472b6';
      default: return neonGreen;
    }
  };

  const accent = getAccentColor();
  
  return (
    <View style={[
      styles.badge, 
      { 
        backgroundColor: unlocked ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.2)',
        borderColor: unlocked ? glassBorder : 'transparent',
        borderWidth: 1
      }
    ]}>
      <View style={[
        styles.iconContainer, 
        { 
          backgroundColor: unlocked ? `${accent}20` : 'rgba(255,255,255,0.05)',
          borderColor: unlocked ? `${accent}40` : 'transparent',
          borderWidth: 1
        }
      ]}>
        <IconSymbol 
          name={icon as any} 
          size={24} 
          color={unlocked ? accent : textMuted} 
        />
      </View>
      
      <Text 
        style={[
          TextStyles.caption, 
          { 
            color: unlocked ? textWhite : textMuted, 
            marginTop: 8, 
            fontWeight: '500', 
            textAlign: 'center' 
          }
        ]} 
        numberOfLines={2}
      >
        {title}
      </Text>
      
      {!unlocked && (
        <View style={styles.lockedOverlay}>
          <IconSymbol name="lock.fill" size={14} color="rgba(255,255,255,0.5)" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    minHeight: 100,
    position: 'relative',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
});
