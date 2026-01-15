import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen, glassBorder } from '@/constants/Colors';
import { Spacing, PageSpacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [mealReminders, setMealReminders] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [proTips, setProTips] = useState(true);

  const renderToggle = (label: string, value: boolean, onValueChange: (v: boolean) => void, description?: string) => (
    <Card variant="glass" padding="none" style={styles.settingItem}>
      <View style={styles.settingItemContent}>
        <View style={styles.settingItemLeft}>
          <Text style={[TextStyles.body, { color: colors.text }]}>{label}</Text>
          {description && (
            <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>{description}</Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: glassBorder, true: neonGreen }}
          thumbColor={value ? '#000000' : colors.icon}
        />
      </View>
    </Card>
  );

  return (
    <PageContainer edges={['top']}>
      <PageHeader 
        title="Notifications" 
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />
      
      <ContentContainer scrollable>
        <Section title="Reminders">
          {renderToggle(
            "Meal Reminders", 
            mealReminders, 
            setMealReminders, 
            "Get reminded to log your meals throughout the day."
          )}
        </Section>

        <Section title="Reports & Tips">
          {renderToggle(
            "Weekly Progress", 
            weeklyReports, 
            setWeeklyReports, 
            "A summary of your nutrition and health scores every week."
          )}
          {renderToggle(
            "Daily Insights", 
            proTips, 
            setProTips, 
            "Get personalised nutrition tips based on your logged meals."
          )}
        </Section>
        
        <Text style={[TextStyles.bodySmall, { color: colors.icon, textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.xl }]}>
          Notification settings are saved locally on this device.
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
  },
  settingItemLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
});







