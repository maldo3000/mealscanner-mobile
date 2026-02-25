import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Brand } from '@/constants/Brand';

interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  headerRight?: React.ReactNode;
  noPadding?: boolean;
}

export function DashboardCard({
  title,
  subtitle,
  children,
  style,
  headerRight,
  noPadding = false,
}: DashboardCardProps) {
  return (
    <View style={[styles.card, style]}>
      {(title || headerRight) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {headerRight}
        </View>
      )}
      <View style={noPadding ? undefined : styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Brand.surface1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 4,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: "'Telegraf', sans-serif",
    fontSize: 18,
    fontWeight: '800',
    color: Brand.bone,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 13,
    color: Brand.sage,
    marginTop: 2,
  },
  body: {
    padding: 24,
    paddingTop: 16,
  },
});
