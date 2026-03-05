import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeSyntheticEvent, TextInputContentSizeChangeEventData } from 'react-native';
import {
    Alert,
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

import { SwirlingSpinner } from '@/components/ui/SwirlingSpinner';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useColorScheme } from '@/hooks/useColorScheme';
import { isDailyLimitError, transcribeAudioDirect } from '@/lib/supabase';
import { getCleanTranscript } from '@/lib/transcription';
import { VoicePulseSkia } from './VoicePulseSkia';

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
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [text, setText] = useState<string>(initialText);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPreparingSubmit, setIsPreparingSubmit] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

  // Refs for UI elements
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Track input viewport + content height so programmatic updates never clip the last line.
  // We use a ScrollView wrapper for reliable scrollToEnd without focusing the TextInput
  // (focusing would pop the keyboard during voice dictation).
  const [inputViewportHeight, setInputViewportHeight] = useState<number>(0);
  const [inputContentHeight, setInputContentHeight] = useState<number>(0);

  // Refs for async submit flow (stop -> transcribe -> submit)
  const isSubmittingRef = useRef<boolean>(false);
  const isTranscribingRef = useRef<boolean>(isTranscribing);
  const textRef = useRef<string>(text);
  const transcriptionPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    isTranscribingRef.current = isTranscribing;
  }, [isTranscribing]);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const scrollToEndSoon = useCallback((animated: boolean = true): void => {
    // Two RAFs ensures the ScrollView has measured the updated content size.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated });
      });
    });
  }, []);

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
    (audioUri: string): Promise<void> => {
      if (!audioUri) return Promise.resolve();
      const task = (async () => {
        setIsTranscribing(true);
        try {
          const { data, error } = await transcribeAudioDirect(audioUri, userId);
          if (error) throw error;
          const transcript = getCleanTranscript(data?.transcript);
          if (transcript) {
            setText((prev) => {
              const p = prev.trim();
              const newText = p ? `${p} ${transcript}` : transcript;

              setTimeout(() => {
                scrollToEndSoon(true);
                inputRef.current?.setNativeProps({
                  selection: { start: newText.length, end: newText.length },
                });
              }, 50);

              return newText;
            });
          }
        } catch (err) {
          if (isDailyLimitError(err)) {
            Alert.alert('Scan Limit Reached', err instanceof Error ? err.message : "You've hit today's scan limit. This resets at midnight UTC.");
          } else {
            Alert.alert('Transcription Error', 'Failed to transcribe audio. Please try again or type your description.');
          }
        } finally {
          setIsTranscribing(false);
        }
      })();

      transcriptionPromiseRef.current = task;
      return task.finally(() => {
        if (transcriptionPromiseRef.current === task) {
          transcriptionPromiseRef.current = null;
        }
      });
    },
    [scrollToEndSoon, userId]
  );

  const { isRecording, metering, startRecording, stopRecording } = useAudioRecorder({
    onRecordingComplete: handleTranscription,
    enableMetering: true,
    onError: () => {
      setIsTranscribing(false);
    },
  });

  const canSubmit = useMemo<boolean>(() => {
    const hasText = text.trim().length > 0;
    const hasVoiceInFlight = isRecording || isTranscribing || isPreparingSubmit || isSubmitting;
    return hasText || hasVoiceInFlight;
  }, [isPreparingSubmit, isRecording, isSubmitting, isTranscribing, text]);

  const submitLabel = useMemo<string>(() => {
    if (isPreparingSubmit || isTranscribing) return 'Transcribing...';
    if (isSubmitting) return 'Adding...';
    return 'Add to meal';
  }, [isPreparingSubmit, isSubmitting, isTranscribing]);

  const toggleRecording = useCallback(async (): Promise<void> => {
    if (isTranscribing || isSubmitting || isPreparingSubmit) return;
    if (isRecording) {
      await stopRecording();
      return;
    }
    await startRecording();
  }, [isPreparingSubmit, isRecording, isSubmitting, isTranscribing, startRecording, stopRecording]);

  const waitForTranscription = useCallback(async (): Promise<void> => {
    if (transcriptionPromiseRef.current) {
      await transcriptionPromiseRef.current;
      return;
    }
    // Fallback for rare edge cases where UI says transcribing but no tracked promise exists.
    if (isTranscribingRef.current) {
      let attempts = 0;
      const maxAttempts = 200;
      while (isTranscribingRef.current && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 100));
        attempts += 1;
      }
    }
  }, []);

  const submit = useCallback(async (): Promise<void> => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const shouldWaitForTranscription = isRecording || isTranscribing;
      if (shouldWaitForTranscription) {
        setIsPreparingSubmit(true);
      }

      if (isRecording) {
        await stopRecording();
      }

      if (shouldWaitForTranscription) {
        await waitForTranscription();
        setIsPreparingSubmit(false);
      }

      const trimmed = textRef.current.trim();
      if (!trimmed) return;

      await onSubmit(trimmed);
      setText('');
    } finally {
      setIsPreparingSubmit(false);
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  }, [isRecording, isTranscribing, onSubmit, stopRecording, waitForTranscription]);

  const close = useCallback(async (): Promise<void> => {
    try {
      if (isRecording) {
        await stopRecording();
      }
    } catch {
      // Ensure we always proceed to cancel even if stopRecording fails
    }
    // Reset all loading states so the UI isn't left in a stuck state
    setIsSubmitting(false);
    setIsPreparingSubmit(false);
    setIsTranscribing(false);
    isSubmittingRef.current = false;
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.scrollContent}>
            <Text style={[TextStyles.body, { color: colors.icon, marginBottom: Spacing.md }]}>{subtitle}</Text>

            <View
              style={styles.inputArea}
              onLayout={(e: LayoutChangeEvent) => {
                const next = Math.ceil(e.nativeEvent.layout.height);
                setInputViewportHeight((prev) => (prev === next ? prev : next));
              }}
            >
              <ScrollView
                ref={scrollRef}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                style={styles.inputScroll}
              >
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.largeInput,
                    {
                      color: colors.text,
                      height:
                        inputViewportHeight > 0 || inputContentHeight > 0
                          ? Math.max(inputViewportHeight, inputContentHeight + Spacing.xl)
                          : undefined,
                    },
                  ]}
                  placeholder={placeholder}
                  placeholderTextColor={colors.icon}
                  value={text}
                  onChangeText={setText}
                  multiline
                  textAlignVertical="top"
                  scrollEnabled={false}
                  onContentSizeChange={(e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
                    const next = Math.ceil(e.nativeEvent.contentSize.height);
                    setInputContentHeight((prev) => (prev === next ? prev : next));
                    scrollToEndSoon(true);
                  }}
                />
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>

          <View style={styles.footer}>
            {!isKeyboardVisible && (
              <>
                <View style={styles.micButtonContainer}>
                  <VoicePulseSkia metering={metering} isRecording={isRecording} size={88} />
                  <TouchableOpacity
                    onPress={toggleRecording}
                    disabled={isTranscribing || isSubmitting || isPreparingSubmit}
                    style={[
                      styles.hugeMicButton,
                      {
                        backgroundColor: isRecording ? 'rgba(255, 255, 255, 0.10)' : `${neonGreen}15`,
                        borderColor: isRecording ? '#FFFFFF' : `${neonGreen}40`,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    {isTranscribing ? (
                      <SwirlingSpinner size={36} color={neonGreen} />
                    ) : (
                  <IconSymbol
                    name={isRecording ? 'stop.fill' : 'mic.fill'}
                    size={36}
                    color={isRecording ? '#FFFFFF' : neonGreen}
                  />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.lg }]}>
                  {isRecording ? 'Listening... tap to stop' : 'Tap to speak'}
                </Text>
              </>
            )}

            <View style={styles.buttonContainer}>
            <Button
              variant="primary"
              onPress={submit}
              disabled={!canSubmit}
              fullWidth
              style={styles.submitButton}
              textStyle={{ color: 'white' }}
              icon={isSubmitting ? <SwirlingSpinner size="small" color="white" /> : undefined}
            >
              {submitLabel}
              </Button>
            </View>

            {/* Spacer to clear the bottom edge */}
            <View style={{ height: Math.max(insets.bottom, Spacing.xl) }} />
          </View>
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
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
  },
  inputArea: {
    flex: 1,
    marginBottom: Spacing.md,
  },
  inputScroll: {
    flex: 1,
  },
  largeInput: {
    ...TextStyles.h3,
    fontSize: 24,
    lineHeight: 32,
    paddingBottom: Spacing.xl,
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  micButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  hugeMicButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 1,
  },
  buttonContainer: {
    width: '100%',
    zIndex: 2,
    position: 'relative',
  },
  submitButton: {
    height: 56,
  },
});


