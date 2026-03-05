import { ComponentSpacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

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
  const { tokens } = useTheme();
  const shouldUseGlowWrapper = variant === 'primary' && !noShadow;
  const fullWidthGlowInset = fullWidth ? 12 : 0;

  const getContainerStyle = () => {
    const base = [styles.button];
    
    switch (variant) {
      case 'primary':
        base.push({ 
          backgroundColor: tokens.accent,
          borderColor: tokens.accent,
          shadowColor: noShadow || shouldUseGlowWrapper ? 'transparent' : tokens.accent,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: noShadow || shouldUseGlowWrapper ? 0 : (disabled ? 0.3 : 0.6),
          shadowRadius: noShadow || shouldUseGlowWrapper ? 0 : 12,
          elevation: noShadow || shouldUseGlowWrapper ? 0 : 8,
          opacity: disabled ? 0.5 : 1,
        });
        break;
      case 'secondary':
        base.push({
          backgroundColor: 'transparent',
          borderColor: tokens.accent,
          borderWidth: 1,
        });
        break;
      case 'glass':
        base.push({
          backgroundColor: tokens.glassSurface,
          borderColor: tokens.glassHighlight,
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
      return { color: tokens.textMuted };
    }
    
    switch (variant) {
      case 'primary':
        // Use a dark green for better contrast on the accent background
        return { color: disabled ? '#1F1F1F' : '#0A2012', fontWeight: '600' as const };
      case 'secondary':
        return { color: tokens.accent };
      case 'glass':
        return { color: tokens.textPrimary };
      case 'ghost':
        return { color: tokens.textPrimary };
      default:
        return { color: tokens.textPrimary };
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'small': return 36;
      case 'large': return 56;
      default: return 48;
    }
  };

  const buttonStyle = [
    ...getContainerStyle(),
    {
      height: getHeight(),
      paddingHorizontal: size === 'small' ? ComponentSpacing.buttonPadding : 24,
      width: fullWidth ? '100%' : undefined,
    },
  ];

  const content = (
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
  );

  if (shouldUseGlowWrapper) {
    return (
      <View
        style={[
          styles.primaryWrapper,
          { width: fullWidth ? '100%' : undefined },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.primaryGlow,
            {
              left: fullWidthGlowInset,
              right: fullWidthGlowInset,
              backgroundColor: 'transparent',
              shadowColor: tokens.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: Platform.OS === 'android' ? 0 : (disabled ? 0.25 : fullWidth ? 0.6 : 0.45),
              shadowRadius: fullWidth ? 12 : 9,
              elevation: Platform.OS === 'android' ? 0 : (fullWidth ? 8 : 6),
            },
          ]}
        />
        <TouchableOpacity
          style={[
            ...buttonStyle,
            style,
          ]}
          disabled={disabled}
          activeOpacity={0.8}
          {...props}
        >
          {content}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        ...buttonStyle,
        style,
      ]}
      disabled={disabled}
      activeOpacity={0.8}
      {...props}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 9999, // Pill shape
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1, // Thin sleek border
    overflow: 'visible',
  },
  primaryWrapper: {
    position: 'relative',
    borderRadius: 9999,
    overflow: 'visible',
  },
  primaryGlow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 9999,
    overflow: 'visible',
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
