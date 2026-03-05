import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen } from '@/constants/Colors';
import { NUTRIENT_EDUCATION_CONTENT } from '@/constants/NutrientEducationContent';
import { ALL_NUTRITION_SOURCES } from '@/constants/NutritionTips';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

function SourceLink({ label, url, color }: { label: string; url: string; color: string }) {
  return (
    <TouchableOpacity
      style={styles.sourceRow}
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      accessibilityLabel={`Open ${label}`}
    >
      <View style={styles.sourceRowLeft}>
        <IconSymbol name="link" size={14} color={neonGreen} />
        <Text style={[TextStyles.bodySmall, { color, flex: 1 }]}>{label}</Text>
      </View>
      <IconSymbol name="arrow.up.right" size={12} color={neonGreen} />
    </TouchableOpacity>
  );
}

export default function SourcesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const nutrientSources = Object.values(NUTRIENT_EDUCATION_CONTENT).flatMap((n) => n.sources);
  const allSources = [...ALL_NUTRITION_SOURCES, ...nutrientSources];

  const uniqueSources = Array.from(
    new Map(allSources.map((s) => [s.url, s])).values()
  );

  return (
    <PageContainer edges={['top']}>
      <PageHeader
        title="Sources"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ContentContainer scrollable>
        <Section title="About">
          <Card variant="glass" padding="md">
            <Text style={[TextStyles.body, { color: colors.text, lineHeight: 22 }]}>
              Nutrition information in MealScanner is based on publicly available
              guidelines from government health agencies and peer-reviewed
              organizations. AI-generated meal analyses are estimates and should
              not replace professional medical advice.
            </Text>
          </Card>
        </Section>

        <Section title="Reference Sources">
          <Card variant="glass" padding="md" style={{ gap: 2 }}>
            {uniqueSources.map((source) => (
              <SourceLink
                key={source.url}
                label={source.label}
                url={source.url}
                color={colors.text}
              />
            ))}
          </Card>
        </Section>

        <Text
          style={[
            TextStyles.caption,
            {
              color: colors.icon,
              textAlign: 'center',
              marginTop: Spacing.lg,
              marginBottom: Spacing.xl,
              fontStyle: 'italic',
              lineHeight: 16,
              paddingHorizontal: Spacing.md,
            },
          ]}
        >
          For informational purposes only. Not medical advice. Consult a
          registered dietitian or healthcare professional for personalized
          dietary guidance.
        </Text>
      </ContentContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  sourceRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    paddingRight: Spacing.sm,
  },
});
