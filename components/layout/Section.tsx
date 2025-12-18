import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';

import { Colors } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

interface SectionProps extends ViewProps {
  title?: string;
  children: React.ReactNode;
  gap?: number;
}

/**
 * Standardized section wrapper component
 * Provides consistent spacing between sections and optional section titles
 */
export function Section({
  title,
  children,
  gap = PageSpacing.sectionGap,
  style,
  ...props
}: SectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  return (
    <View
      style={[
        styles.section,
        { marginBottom: gap },
        style,
      ]}
      {...props}
    >
      {title && (
        <Text
          style={[
            TextStyles.h4,
            { color: colors.text, marginBottom: Spacing.md },
          ]}
        >
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
  },
});

