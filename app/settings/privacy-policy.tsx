import React from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { PRIVACY_POLICY_CONTENT } from '@/constants/PrivacyPolicyContent';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const markdownStyles = StyleSheet.create({
    body: {
      color: colors.text,
      fontSize: 16,
      lineHeight: 24,
    },
    heading1: {
      color: neonGreen,
      fontSize: 28,
      fontWeight: '700',
      marginTop: Spacing.md, // Reduced from xl to avoid huge gap
      marginBottom: Spacing.md,
      lineHeight: 34, // Added lineHeight to prevent clipping
    },
    heading2: {
      color: neonGreen,
      fontSize: 22,
      fontWeight: '600',
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
      lineHeight: 28, // Added lineHeight
    },
    heading3: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '600',
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
      lineHeight: 24, // Added lineHeight
    },
    paragraph: {
      marginBottom: Spacing.md,
    },
    list_item: {
      color: colors.text,
      marginBottom: Spacing.xs,
    },
    bullet_list: {
      marginBottom: Spacing.md,
    },
    strong: {
      fontWeight: '700',
    },
    link: {
      color: neonGreen,
      textDecorationLine: 'underline',
    },
    hr: {
      backgroundColor: colors.icon,
      height: 1,
      marginVertical: Spacing.lg,
    },
  });

  return (
    <PageContainer edges={['top']}>
      <PageHeader 
        title="Privacy Policy" 
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />
      
      <ContentContainer>
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Markdown style={markdownStyles}>
            {PRIVACY_POLICY_CONTENT}
          </Markdown>
        </ScrollView>
      </ContentContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
});
