import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Brand } from '@/constants/Brand';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DashboardCard } from './DashboardCard';

const shortcuts = [
  { key: 'photo', label: 'Photo', icon: 'camera' as const },
  { key: 'type', label: 'Type', icon: 'keyboard' as const },
  { key: 'voice', label: 'Voice', icon: 'mic' as const },
  { key: 'search', label: 'Search', icon: 'magnifyingglass' as const },
] as const;

export function QuickActions() {
  const router = useRouter();

  return (
    <DashboardCard title="Quick Actions" subtitle="Log faster on desktop">
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/(tabs)/log')}
        activeOpacity={0.85}
      >
        <IconSymbol name="plus" size={20} color={Brand.ink} />
        <Text style={styles.primaryButtonText}>Log Meal</Text>
      </TouchableOpacity>

      <View style={styles.shortcuts}>
        {shortcuts.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={styles.shortcutChip}
            onPress={() => router.push('/(tabs)/log')}
            activeOpacity={0.7}
          >
            <IconSymbol name={s.icon} size={14} color={Brand.matcha} />
            <Text style={styles.shortcutText}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Brand.matcha,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
    // @ts-ignore
    cursor: 'pointer',
    // @ts-ignore
    transition: 'opacity 0.15s',
  },
  primaryButtonText: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 16,
    fontWeight: '600',
    color: Brand.ink,
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shortcutChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Brand.surface2,
    // @ts-ignore
    cursor: 'pointer',
    // @ts-ignore
    transition: 'border-color 0.15s',
  },
  shortcutText: {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: 13,
    fontWeight: '600',
    color: Brand.sage,
  },
});
