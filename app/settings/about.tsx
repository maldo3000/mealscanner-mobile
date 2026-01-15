import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import * as Constants from 'expo-constants';
import { Image } from 'expo-image';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Colors, neonGreen } from '@/constants/Colors';
import { Spacing, PageSpacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function AboutScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const version = Constants.default.expoConfig?.version || '1.0.0';

  return (
    <PageContainer edges={['top']}>
      <PageHeader 
        title="About" 
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />
      
      <ContentContainer scrollable>
        <View style={styles.logoContainer}>
          <Image 
            source={require('@/assets/images/mealscanner-logo.png')} 
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[TextStyles.h1, { color: colors.text, marginTop: Spacing.md }]}>MealScanner</Text>
          <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>Version {version}</Text>
        </View>

        <Section title="Our Mission">
          <Card variant="glass" padding="md">
            <Text style={[TextStyles.body, { color: colors.text, lineHeight: 22 }]}>
              MealScanner helps you understand what you eat through advanced AI analysis. 
              Our goal is to make nutrition tracking as simple as taking a photo, 
              providing you with the insights you need to live a healthier life.
            </Text>
          </Card>
        </Section>

        <Section title="Connect">
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <TouchableOpacity 
              style={styles.settingItemContent}
              onPress={() => Linking.openURL('https://mealscanner.app')}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="globe" size={20} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>Website</Text>
              </View>
              <IconSymbol name="arrow.up.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          </Card>
          
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <TouchableOpacity 
              style={styles.settingItemContent}
              onPress={() => Linking.openURL('mailto:support@mealscanner.app')}
            >
              <View style={styles.settingItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                  <IconSymbol name="envelope" size={20} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>Support Email</Text>
              </View>
              <IconSymbol name="arrow.up.right" size={16} color={colors.icon} />
            </TouchableOpacity>
          </Card>
        </Section>

        <Text style={[TextStyles.bodySmall, { color: colors.icon, textAlign: 'center', marginTop: Spacing.xl, marginBottom: Spacing.xl }]}>
          © 2026 MealScanner. All rights reserved.
        </Text>
      </ContentContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: 'center',
    marginVertical: Spacing.xl,
  },
  logo: {
    width: 100,
    height: 100,
  },
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
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});







