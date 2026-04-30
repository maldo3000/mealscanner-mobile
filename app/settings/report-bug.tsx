import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Constants from 'expo-constants';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { glassBorder, neonGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { createBugReport, getInternalAccessSettings } from '@/lib/supabase';

const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
type BugSeverity = typeof SEVERITIES[number];

export default function ReportBugScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user } = useAuth();

  const appVersion = useMemo(() => Constants.default.expoConfig?.version || 'unknown', []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDevMode, setHasDevMode] = useState(false);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAccess = async () => {
      if (!user) {
        if (isMounted) {
          setHasDevMode(false);
          setIsLoadingAccess(false);
        }
        return;
      }

      const { data } = await getInternalAccessSettings(user.id);
      if (!isMounted) return;
      setHasDevMode(Boolean(data?.dev_mode_enabled));
      setIsLoadingAccess(false);
    };

    void loadAccess();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert('Not Signed In', 'Please sign in before submitting a bug report.');
      return;
    }

    if (!hasDevMode) {
      Alert.alert('Developer Mode Required', 'Enable developer mode to submit internal bug reports.');
      return;
    }

    if (title.trim().length < 3) {
      Alert.alert('Add a title', 'Please provide a short bug title (at least 3 characters).');
      return;
    }

    if (description.trim().length < 10) {
      Alert.alert('Add details', 'Please provide at least 10 characters in the bug description.');
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await createBugReport({
      title: title.trim(),
      description: description.trim(),
      stepsToReproduce: stepsToReproduce.trim() || undefined,
      expectedBehavior: expectedBehavior.trim() || undefined,
      actualBehavior: actualBehavior.trim() || undefined,
      severity,
      appVersion,
      platform: Platform.OS,
      metadata: {
        source_screen: 'settings/report-bug',
      },
    });
    setIsSubmitting(false);

    if (error || !data?.success) {
      const errorMessage = data?.error || (error instanceof Error ? error.message : 'Could not submit bug report.');
      Alert.alert('Submission Failed', errorMessage);
      return;
    }

    Alert.alert(
      'Bug Report Logged',
      `Saved report ${data.bug_report_id?.slice(0, 8) || ''}. We can route this to Notion or Sheets next.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <PageContainer edges={['top']}>
      <PageHeader
        title="Report Bug"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
        }
      />

      <ContentContainer scrollable>
        {isLoadingAccess ? (
          <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
            Checking developer access...
          </Text>
        ) : !hasDevMode ? (
          <Card variant="glass" padding="md" style={styles.settingItem}>
            <Text style={[TextStyles.body, { color: tokens.textPrimary }]}>
              Developer mode is not enabled for this account.
            </Text>
            <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: Spacing.xs }]}>
              Ask an admin to grant internal access, then turn on Developer Mode from Profile settings.
            </Text>
          </Card>
        ) : (
          <>
            <Section title="Details">
              <Card variant="glass" padding="none" style={styles.settingItem}>
                <TextInput
                  style={[styles.input, { color: tokens.textPrimary }]}
                  placeholderTextColor={tokens.textMuted}
                  placeholder="Title (e.g., Journal crashes after photo scan)"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={120}
                />
              </Card>

              <Card variant="glass" padding="none" style={styles.settingItem}>
                <TextInput
                  style={[styles.textArea, { color: tokens.textPrimary }]}
                  placeholderTextColor={tokens.textMuted}
                  placeholder="Description"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  maxLength={5000}
                />
              </Card>
            </Section>

            <Section title="Reproduction (Optional)">
              <Card variant="glass" padding="none" style={styles.settingItem}>
                <TextInput
                  style={[styles.textArea, { color: tokens.textPrimary }]}
                  placeholderTextColor={tokens.textMuted}
                  placeholder="Steps to reproduce"
                  value={stepsToReproduce}
                  onChangeText={setStepsToReproduce}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </Card>
              <Card variant="glass" padding="none" style={styles.settingItem}>
                <TextInput
                  style={[styles.input, { color: tokens.textPrimary }]}
                  placeholderTextColor={tokens.textMuted}
                  placeholder="Expected behavior"
                  value={expectedBehavior}
                  onChangeText={setExpectedBehavior}
                />
              </Card>
              <Card variant="glass" padding="none" style={styles.settingItem}>
                <TextInput
                  style={[styles.input, { color: tokens.textPrimary }]}
                  placeholderTextColor={tokens.textMuted}
                  placeholder="Actual behavior"
                  value={actualBehavior}
                  onChangeText={setActualBehavior}
                />
              </Card>
            </Section>

            <Section title="Severity">
              <Card variant="glass" padding="none" style={styles.settingItem}>
                <View style={styles.severityRow}>
                  {SEVERITIES.map((item) => {
                    const selected = severity === item;
                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.severityChip,
                          {
                            borderColor: selected ? neonGreen : glassBorder,
                            backgroundColor: selected ? `${neonGreen}15` : 'transparent',
                          },
                        ]}
                        onPress={() => setSeverity(item)}
                      >
                        <Text
                          style={[
                            TextStyles.bodySmall,
                            { color: selected ? neonGreen : tokens.textMuted, textTransform: 'capitalize' },
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Card>
            </Section>

            <Text style={[TextStyles.caption, { color: tokens.textMuted, marginTop: Spacing.sm }]}>
              Version {appVersion} • {Platform.OS}
            </Text>

            <View style={styles.buttonContainer}>
              <Button onPress={handleSubmit} disabled={isSubmitting} fullWidth>
                {isSubmitting ? 'Submitting...' : 'Submit Bug Report'}
              </Button>
            </View>
          </>
        )}
      </ContentContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    marginBottom: PageSpacing.cardGap,
  },
  input: {
    padding: Spacing.base,
    fontSize: 16,
    lineHeight: 22,
  },
  textArea: {
    padding: Spacing.base,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 120,
  },
  severityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    padding: Spacing.base,
  },
  severityChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
