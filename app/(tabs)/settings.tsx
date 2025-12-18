import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen, glassBorder } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const [showMetrics, setShowMetrics] = React.useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeGoal } = useNutritionGoals();

  const goalSubtitle = activeGoal
    ? `${activeGoal.name} • ${Math.round(activeGoal.dailyTargets.calories)} kcal`
    : 'Not set yet';
  
  return (
    <PageContainer>
      <PageHeader title="Settings" />
      
      <ContentContainer>
        {/* Profile Section */}
        <Section title="Profile">
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <TouchableOpacity style={styles.settingItemContent}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="person" size={20} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>Edit Profile</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          </Card>
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <TouchableOpacity
              style={styles.settingItemContent}
              onPress={() => router.push('/settings/nutrition-goals')}
              accessibilityLabel="Set nutrition goals"
              accessibilityHint="Opens the nutrition goals setup screen"
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="target" size={20} color={neonGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[TextStyles.body, { color: colors.text }]}>
                    Nutrition Goals
                  </Text>
                  <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                    {goalSubtitle}
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          </Card>
        </Section>

        {/* Preferences Section */}
        <Section title="Preferences">
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="chart.bar" size={20} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>Show Nutrition Metrics</Text>
              </View>
              <Switch
                value={showMetrics}
                onValueChange={setShowMetrics}
                trackColor={{ false: glassBorder, true: neonGreen }}
                thumbColor={showMetrics ? '#000000' : colors.icon}
              />
            </View>
          </Card>
          
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <TouchableOpacity style={styles.settingItemContent}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="bell" size={20} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>Notifications</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          </Card>
          
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <TouchableOpacity style={styles.settingItemContent}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="iphone" size={20} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>Units & Display</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          </Card>
        </Section>

        {/* Data Section */}
        <Section title="Data">
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <TouchableOpacity style={styles.settingItemContent}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="square.and.arrow.up" size={20} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>Export Data</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          </Card>
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <TouchableOpacity style={styles.settingItemContent}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="trash" size={20} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>Clear History</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          </Card>
        </Section>

        {/* About Section */}
        <Section>
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <TouchableOpacity style={styles.settingItemContent}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="info.circle" size={20} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>About MealScanner</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          </Card>
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <TouchableOpacity style={styles.settingItemContent}>
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="doc.text" size={20} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>Privacy Policy</Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          </Card>
        </Section>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 