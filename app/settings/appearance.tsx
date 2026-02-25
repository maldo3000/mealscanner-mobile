import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { ThemeId, themeNames } from '@/constants/themes';
import { TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';

const themeDescriptions: Record<ThemeId, string> = {
  herbarium: 'Warm, organic, refined',
  classicGreen: 'Vibrant, energetic, bold',
};

export default function AppearanceScreen() {
  const router = useRouter();
  const { tokens, themeId, setTheme } = useTheme();

  const renderThemeOption = (id: ThemeId) => {
    const isSelected = themeId === id;
    const name = themeNames[id];
    const description = themeDescriptions[id];
    
    return (
      <Card variant="glass" padding="none" style={styles.settingItem} key={id}>
        <TouchableOpacity 
          style={styles.settingItemContent}
          onPress={() => setTheme(id)}
        >
          <View style={styles.themeOptionText}>
            <Text style={[TextStyles.body, { color: tokens.textPrimary }]}>{name}</Text>
            <Text style={[TextStyles.caption, { color: tokens.textMuted, marginTop: 2 }]}>
              {description}
            </Text>
          </View>
          {isSelected && <IconSymbol name="checkmark" size={20} color={tokens.accent} />}
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <PageContainer edges={['top']}>
      <PageHeader 
        title="Appearance" 
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
        }
      />
      
      <ContentContainer scrollable>
        <Section title="App Theme" description="Choose the visual style for the app.">
          {renderThemeOption('classicGreen')}
          {renderThemeOption('herbarium')}
        </Section>
        
        <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.xl }]}>
          The selected theme will be applied throughout the entire app.
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
  themeOptionText: {
    flex: 1,
  },
});
