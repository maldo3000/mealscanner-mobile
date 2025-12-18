import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewProps } from 'react-native';

import { Colors, textMuted } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

interface PageHeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  showBottomBorder?: boolean;
}

/**
 * Standardized page header component
 * Provides consistent typography, spacing, and optional actions
 */
export function PageHeader({
  title,
  subtitle,
  rightAction,
  leftAction,
  showBottomBorder = false,
  style,
  ...props
}: PageHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: PageSpacing.containerPadding,
          paddingBottom: PageSpacing.containerPadding,
          borderBottomWidth: showBottomBorder ? 1 : 0,
          borderBottomColor: colors.border,
        },
        style,
      ]}
      {...props}
    >
      <View style={styles.headerContent}>
        {leftAction && (
          <View style={styles.leftAction}>
            {leftAction}
          </View>
        )}
        
        <View style={styles.titleContainer}>
          <Text style={[TextStyles.h2, { color: colors.text }]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                TextStyles.bodySmall,
                { color: colors.icon, marginTop: Spacing.xs },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {rightAction && (
          <View style={styles.rightAction}>
            {rightAction}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
  },
  leftAction: {
    marginRight: Spacing.base,
    justifyContent: 'center',
  },
  rightAction: {
    marginLeft: Spacing.base,
    justifyContent: 'center',
  },
});

