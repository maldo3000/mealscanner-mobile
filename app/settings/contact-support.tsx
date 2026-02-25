import React, { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

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
import { useTheme } from '@/context/ThemeContext';
import { sendSupportEmail } from '@/lib/supabase';

const SUPPORT_TOPICS = [
  'Scan not working',
  'Subscription / Billing',
  'Account issue',
  'Apple Health sync',
  'Nutrition goals',
  'Feature request',
  'Bug report',
  'Other',
] as const;

type SupportTopic = typeof SUPPORT_TOPICS[number];

export default function ContactSupportScreen() {
  const router = useRouter();
  const { tokens } = useTheme();

  const [selectedTopic, setSelectedTopic] = useState<SupportTopic | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleSend = async () => {
    if (!selectedTopic) {
      Alert.alert('Select a Topic', 'Please choose a support topic before sending your message.');
      return;
    }

    if (selectedTopic === 'Other' && subject.trim().length === 0) {
      Alert.alert('Add a Subject', 'Please add a subject when using the "Other" topic.');
      return;
    }

    if (message.trim().length < 10) {
      Alert.alert('Message Too Short', 'Please enter at least 10 characters so we can help effectively.');
      return;
    }

    Keyboard.dismiss();
    setIsSending(true);

    const result = await sendSupportEmail({
      topic: selectedTopic,
      subject: subject.trim(),
      message: message.trim(),
    });

    setIsSending(false);

    if (result.success) {
      Alert.alert(
        'Message Sent',
        'Thanks for reaching out! We\'ll get back to you as soon as possible.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } else {
      Alert.alert('Failed to Send', result.error || 'Something went wrong. Please try again.');
    }
  };

  const placeholderMap: Record<SupportTopic, string> = {
    'Scan not working': 'Describe what happened when you tried to scan your meal...',
    'Subscription / Billing': 'Describe your billing or subscription issue...',
    'Account issue': 'Describe the issue you\'re having with your account...',
    'Apple Health sync': 'Describe what\'s happening with your Apple Health connection...',
    'Nutrition goals': 'Describe the issue with your nutrition goals...',
    'Feature request': 'Tell us about the feature you\'d like to see...',
    'Bug report': 'Describe the bug: what happened, what you expected, and steps to reproduce...',
    'Other': 'Tell us how we can help...',
  };

  return (
    <PageContainer edges={['top']}>
      <PageHeader
        title="Contact Support"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={tokens.textPrimary} />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ContentContainer scrollable>
          <Section title="Topic">
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setIsPickerOpen(!isPickerOpen)}
              >
                <Text
                  style={[
                    TextStyles.body,
                    { color: selectedTopic ? tokens.textPrimary : tokens.textMuted },
                  ]}
                >
                  {selectedTopic || 'Select a topic...'}
                </Text>
                <IconSymbol
                  name={isPickerOpen ? 'chevron.up' : 'chevron.down'}
                  size={16}
                  color={tokens.textMuted}
                />
              </TouchableOpacity>
            </Card>

            {isPickerOpen && (
              <Card variant="glass" padding="none" style={styles.dropdownCard}>
                {SUPPORT_TOPICS.map((topic, index) => {
                  const isSelected = selectedTopic === topic;
                  const isLast = index === SUPPORT_TOPICS.length - 1;

                  return (
                    <TouchableOpacity
                      key={topic}
                      style={[
                        styles.dropdownOption,
                        isSelected && { backgroundColor: `${neonGreen}15` },
                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: glassBorder },
                      ]}
                      onPress={() => {
                        setSelectedTopic(topic);
                        setIsPickerOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          TextStyles.body,
                          { color: isSelected ? neonGreen : tokens.textPrimary },
                        ]}
                      >
                        {topic}
                      </Text>
                      {isSelected && (
                        <IconSymbol name="checkmark" size={16} color={neonGreen} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}
          </Section>

          {selectedTopic === 'Other' && (
            <Section title="Subject">
              <Card variant="glass" padding="none" style={styles.settingItem}>
                <TextInput
                  style={[
                    styles.textInput,
                    { color: tokens.textPrimary, borderColor: glassBorder },
                  ]}
                  placeholderTextColor={tokens.textMuted}
                  placeholder="Brief description of your issue"
                  value={subject}
                  onChangeText={setSubject}
                  maxLength={100}
                  returnKeyType="next"
                />
              </Card>
            </Section>
          )}

          {selectedTopic && (
            <Section title="Message">
              <Card variant="glass" padding="none" style={styles.settingItem}>
                <TextInput
                  style={[
                    styles.textArea,
                    { color: tokens.textPrimary, borderColor: glassBorder },
                  ]}
                  placeholderTextColor={tokens.textMuted}
                  placeholder={placeholderMap[selectedTopic]}
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={5000}
                />
                <Text
                  style={[
                    TextStyles.caption,
                    styles.charCount,
                    { color: tokens.textMuted },
                  ]}
                >
                  {message.length} / 5000
                </Text>
              </Card>
            </Section>
          )}

          <View style={styles.buttonContainer}>
            <Button
              onPress={handleSend}
              disabled={isSending}
              fullWidth
            >
              {isSending ? 'Sending...' : 'Send Message'}
            </Button>
          </View>

          <Text
            style={[
              TextStyles.bodySmall,
              styles.footerText,
              { color: tokens.textMuted },
            ]}
          >
            We typically respond within 24 hours. Your account email will be included so we can reply directly.
          </Text>
        </ContentContainer>
      </KeyboardAvoidingView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  settingItem: {
    marginBottom: Spacing.sm,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
  },
  dropdownCard: {
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
  },
  textInput: {
    padding: Spacing.base,
    fontSize: 16,
    lineHeight: 22,
  },
  textArea: {
    padding: Spacing.base,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 150,
  },
  charCount: {
    textAlign: 'right',
    paddingRight: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  buttonContainer: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  footerText: {
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
});
