import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { Colors, glassBorder, glassSurface, semanticColors } from '@/constants/Colors';
import { BorderRadius } from '@/constants/Layout';
import { ComponentSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: object;
}

/**
 * Standardized text input component
 * Consistent styling with glass theme, proper placeholder styling, and error states
 */
export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[TextStyles.body, { color: colors.text, marginBottom: Spacing.sm }]}>
          {label}
        </Text>
      )}
      
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: glassSurface,
            borderColor: error ? semanticColors.error : glassBorder,
            borderWidth: error ? 2 : 1,
          },
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              paddingLeft: leftIcon ? Spacing.sm : ComponentSpacing.inputPadding,
              paddingRight: rightIcon ? Spacing.sm : ComponentSpacing.inputPadding,
            },
            style,
          ]}
          placeholderTextColor={colors.icon}
          {...props}
        />
        
        {rightIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>

      {(error || helperText) && (
        <Text
          style={[
            TextStyles.caption,
            {
              color: error ? semanticColors.error : colors.icon,
              marginTop: Spacing.xs,
            },
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingVertical: ComponentSpacing.inputPadding,
  },
  leftIcon: {
    paddingLeft: ComponentSpacing.inputPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    paddingRight: ComponentSpacing.inputPadding,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

