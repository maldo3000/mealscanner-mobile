import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useColorScheme } from '@/hooks/useColorScheme';
import { transcribeAudioDirect } from '@/lib/supabase';

export interface DescribeInputSheetProps {
  userId: string;
  title: string;
  subtitle: string;
  placeholder: string;
  initialText?: string;
  onCancel: () => void;
  onSubmit: (text: string) => Promise<void> | void;
}

export function DescribeInputSheet(props: DescribeInputSheetProps): React.ReactElement {
  const { userId, title, subtitle, placeholder, initialText = '', onCancel, onSubmit } = props;

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [text, setText] = useState<string>(initialText);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleTranscription = useCallback(
    async (audioUri: string): Promise<void> => {
      if (!audioUri) return;
      setIsTranscribing(true);
      try {
        const { data, error } = await transcribeAudioDirect(audioUri, userId);
        if (error) throw error;
        const transcript = data?.transcript?.trim();
        if (transcript) {
          setText((prev) => {
            const p = prev.trim();
            return p ? `${p} ${transcript}` : transcript;
          });
        }
      } finally {
        setIsTranscribing(false);
      }
    },
    [userId]
  );

  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onRecordingComplete: handleTranscription,
    onError: () => {
      setIsTranscribing(false);
    },
  });

  const canSubmit = useMemo<boolean>(() => !!text.trim() && !isSubmitting, [isSubmitting, text]);

  const toggleRecording = useCallback(async (): Promise<void> => {
    if (isTranscribing) return;
    if (isRecording) {
      await stopRecording();
      return;
    }
    await startRecording();
  }, [isRecording, isTranscribing, startRecording, stopRecording]);

  const submit = useCallback(async (): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (isRecording) {
        await stopRecording();
      }
      await onSubmit(trimmed);
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  }, [isRecording, isSubmitting, onSubmit, stopRecording, text]);

  const close = useCallback(async (): Promise<void> => {
    if (isRecording) {
      await stopRecording();
    }
    setText('');
    onCancel();
  }, [isRecording, onCancel, stopRecording]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={close} style={styles.backButton} activeOpacity={0.7}>
          <IconSymbol name="chevron.left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[TextStyles.h3, { color: colors.text }]}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoidingView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              <Text style={[TextStyles.body, { color: colors.icon, marginBottom: Spacing.xl }]}>{subtitle}</Text>

              <View style={styles.inputArea}>
                <TextInput
                  style={[styles.largeInput, { color: colors.text }]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.icon}
                  value={text}
                  onChangeText={setText}
                  multiline
                  autoFocus
                  textAlignVertical="top"
                />
              </View>
            </View>
          </TouchableWithoutFeedback>

          <View style={styles.footer}>
            {!isKeyboardVisible && (
              <>
                <TouchableOpacity
                  onPress={toggleRecording}
                  disabled={isTranscribing}
                  style={[
                    styles.hugeMicButton,
                    {
                      backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.15)' : `${neonGreen}15`,
                      borderColor: isRecording ? '#EF4444' : `${neonGreen}40`,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  {isTranscribing ? (
                    <ActivityIndicator size="large" color={neonGreen} />
                  ) : (
                    <IconSymbol
                      name={isRecording ? 'stop.fill' : 'mic'}
                      size={36}
                      color={isRecording ? '#EF4444' : neonGreen}
                    />
                  )}
                </TouchableOpacity>

                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.xl }]}>
                  {isRecording ? 'Listening... tap to stop' : 'Tap to speak'}
                </Text>
              </>
            )}

            <Button variant="primary" onPress={submit} disabled={!canSubmit} fullWidth style={styles.submitButton}>
              Add to meal
            </Button>

            {/* Spacer to clear the floating bottom navigation bar */}
            <View style={{ height: 140 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 60,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  inputArea: {
    minHeight: 200,
  },
  largeInput: {
    ...TextStyles.h3,
    fontSize: 24,
    lineHeight: 32,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: Spacing.xl,
  },
  hugeMicButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: Spacing.md,
  },
  submitButton: {
    height: 56,
  },
});


