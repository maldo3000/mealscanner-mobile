import React from 'react';
import { StyleSheet, Text, View, ViewProps } from 'react-native';

import { Colors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

interface PageHeaderProps extends ViewProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  leftAction?: React.ReactNode;
  showBottomBorder?: boolean;
  titleStyle?: any;
  subtitleStyle?: any;
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
  titleStyle,
  subtitleStyle,
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
          paddingTop: Spacing.lg,
          paddingBottom: Spacing.md,
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
          <Text style={[TextStyles.h1, { color: colors.text, fontSize: 44, lineHeight: 52 }, titleStyle]}>
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[
                TextStyles.bodySmall,
                { color: colors.icon, marginTop: Spacing.xs },
                subtitleStyle
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

