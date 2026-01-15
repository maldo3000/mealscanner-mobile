import React from 'react';
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';
import { Colors, neonGreen, glassBorder, glassSurface, glassHighlight } from '@/constants/Colors';
import { ComponentSpacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

export type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  noShadow?: boolean;
  textStyle?: any;
}

export function Button({ 
  variant = 'primary', 
  size = 'medium', 
  children, 
  style,
  disabled,
  icon,
  fullWidth = false,
  noShadow = false,
  textStyle,
  ...props 
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark']; // Force dark mode preference for this theme

  const getContainerStyle = () => {
    const base = [styles.button];
    
    switch (variant) {
      case 'primary':
        base.push({ 
          backgroundColor: neonGreen,
          borderColor: neonGreen,
          shadowColor: noShadow ? 'transparent' : neonGreen,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: noShadow ? 0 : (disabled ? 0.3 : 0.6),
          shadowRadius: noShadow ? 0 : 12,
          elevation: noShadow ? 0 : 8,
          opacity: disabled ? 0.5 : 1,
        });
        break;
      case 'secondary':
        base.push({
          backgroundColor: 'transparent',
          borderColor: neonGreen,
          borderWidth: 1,
        });
        break;
      case 'glass':
        base.push({
          backgroundColor: glassSurface,
          borderColor: glassHighlight,
          borderWidth: 1,
        });
        break;
      case 'ghost':
        base.push({
          backgroundColor: 'transparent',
          borderColor: 'transparent',
        });
        break;
    }
    return base;
  };

  const getTextStyle = () => {
    if (disabled && variant !== 'primary') {
      return { color: 'rgba(255,255,255,0.3)' };
    }
    
    switch (variant) {
      case 'primary':
        return { color: disabled ? 'rgba(0,0,0,0.5)' : '#000000' }; // Black text on neon green, dimmed when disabled
      case 'secondary':
        return { color: neonGreen };
      case 'glass':
        return { color: '#FFFFFF' };
      case 'ghost':
        return { color: '#FFFFFF' };
      default:
        return { color: '#FFFFFF' };
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'small': return 36;
      case 'large': return 56;
      default: return 48;
    }
  };

  return (
    <TouchableOpacity
      style={[
        ...getContainerStyle(),
        {
          height: getHeight(),
          paddingHorizontal: size === 'small' ? ComponentSpacing.buttonPadding : 24,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
      disabled={disabled}
      activeOpacity={0.8}
      {...props}
    >
      <View style={styles.contentContainer}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <Text
          style={[
            TextStyles.button,
            getTextStyle(),
            {
              fontSize: size === 'small' ? 13 : size === 'large' ? 18 : 15,
            },
            textStyle,
          ]}
        >
          {children}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 9999, // Pill shape
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1, // Thin sleek border
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: ComponentSpacing.iconGap,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
