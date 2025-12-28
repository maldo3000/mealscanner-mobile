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
        backgroundColor: unlocked ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.1)',
        borderColor: unlocked ? 'rgba(255,255,255,0.08)' : 'transparent',
        borderWidth: 1
      }
    ]}>
      <View style={[
        styles.iconContainer, 
        { 
          backgroundColor: unlocked ? `${accent}15` : 'rgba(255,255,255,0.05)',
          borderColor: unlocked ? `${accent}30` : 'transparent',
          borderWidth: 1,
          shadowColor: unlocked ? accent : 'transparent',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: unlocked ? 0.2 : 0,
          shadowRadius: 8,
          elevation: unlocked ? 4 : 0,
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
            fontWeight: '700', 
            textAlign: 'center',
            fontSize: 10,
            letterSpacing: 0.2,
          }
        ]} 
        numberOfLines={2}
      >
        {title.toUpperCase()}
      </Text>
      
      {!unlocked && (
        <View style={styles.lockedOverlay}>
          <IconSymbol name="lock.fill" size={10} color="rgba(255,255,255,0.4)" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxWidth: 110,
    height: 100,
    position: 'relative',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14, // Squircle-like
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});
