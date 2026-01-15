import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen } from '@/constants/Colors';
import { Spacing, PageSpacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function UnitsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [unitSystem, setUnitSystem] = useState<'metric' | 'imperial'>('metric');

  const renderOption = (label: string, value: 'metric' | 'imperial') => {
    const isSelected = unitSystem === value;
    return (
      <Card variant="glass" padding="none" style={styles.settingItem}>
        <TouchableOpacity 
          style={styles.settingItemContent}
          onPress={() => setUnitSystem(value)}
        >
          <Text style={[TextStyles.body, { color: colors.text }]}>{label}</Text>
          {isSelected && <IconSymbol name="checkmark" size={20} color={neonGreen} />}
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <PageContainer edges={['top']}>
      <PageHeader 
        title="Units & Display" 
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />
      
      <ContentContainer scrollable>
        <Section title="Unit System" description="Choose how weights and measurements are displayed.">
          {renderOption("Metric (kg, cm)", 'metric')}
          {renderOption("Imperial (lb, ft/in)", 'imperial')}
        </Section>
        
        <Text style={[TextStyles.bodySmall, { color: colors.icon, textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.xl }]}>
          These settings will be applied across all meal logs and nutrition goals.
        </Text>
      </ContentContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    marginBottom: PageSpacing.cardGap,
  },
  settingItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    minHeight: 56,
  },
});







