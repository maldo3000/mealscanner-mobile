import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { SwirlingSpinner } from '@/components/ui/SwirlingSpinner';
import { Colors } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useTheme } from '@/context/ThemeContext';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useColorScheme } from '@/hooks/useColorScheme';
import { isDailyLimitError, transcribeAudioDirect } from '@/lib/supabase';
import { getCleanTranscript } from '@/lib/transcription';
import { AnalysisLoadingOverlay, AnalysisStatus } from './AnalysisLoadingOverlay';
import { VoicePulseSkia } from './VoicePulseSkia';
import type { DraftMealItem } from './types';

const MAX_PHOTOS = 4 as const;

export interface MealStagingScreenProps {
  userId: string;
  items: DraftMealItem[];
  contextText: string;
  analysisStatus: AnalysisStatus;

  heroPhotoLocalId: string | null;
  photoCount: number;

  onDiscardSession: () => void;

  onQuickSnap: () => void;
  onQuickUpload: () => void;
  onQuickDescribe: () => void;

  onRemoveItem: (localId: string) => void;
  onSetHero: (localId: string) => void;
  onUpdateQuantity: (localId: string, nextQuantity: number) => void;
  onEditTextItem: (localId: string, currentText: string) => void;

  onSaveContext: (next: string) => Promise<void> | void;
  onAnalyze: () => Promise<void> | void;
}

interface MealItemRowProps {
  item: DraftMealItem;
  isHero: boolean;
  onRemove: () => void;
  onSetHero: () => void;
  onDecrement: () => void;
  onIncrement: () => void;
  onEditTextItem: () => void;
}

function MealItemRow(props: MealItemRowProps): React.ReactElement {
  const { item, isHero, onRemove, onSetHero, onDecrement, onIncrement, onEditTextItem } = props;
  const { tokens } = useTheme();

  return (
    <View style={styles.itemRow}>
      <View style={styles.itemLeft}>
        {item.itemType === 'photo' ? (
          <Image source={{ uri: item.localUri }} style={styles.itemThumb} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.textThumb}>
            <IconSymbol name="text.alignleft" size={18} color="white" />
          </View>
        )}
        {item.itemType === 'text' ? (
          <TouchableOpacity
            style={styles.itemMain}
            onPress={onEditTextItem}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Edit described meal item"
          >
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.text}
            </Text>
            <Text style={styles.editHint}>Tap to edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.itemMain}>
            {item.itemType === 'photo' ? (
              <Text style={styles.itemTitle} numberOfLines={1}>
                Photo
              </Text>
            ) : (
              <Text style={styles.itemTitle} numberOfLines={2}>
                {item.foodItem.name}
              </Text>
            )}
            {item.itemType === 'photo' && (
              <TouchableOpacity onPress={onSetHero} style={styles.heroButton} activeOpacity={0.85}>
                <IconSymbol name={isHero ? 'star.fill' : 'star'} size={16} color={isHero ? tokens.accent : 'white'} />
                {!isHero && <Text style={styles.heroButtonText}>Set hero</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.itemRight}>
        <View style={styles.stepper}>
          <TouchableOpacity onPress={onDecrement} style={styles.stepperButton} activeOpacity={0.85}>
            <IconSymbol name="minus" size={16} color="white" />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{item.quantity}</Text>
          <TouchableOpacity onPress={onIncrement} style={styles.stepperButton} activeOpacity={0.85}>
            <IconSymbol name="plus" size={16} color="white" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton} activeOpacity={0.85}>
          <IconSymbol name="trash" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function MealStagingScreen(props: MealStagingScreenProps): React.ReactElement {
  const {
    userId,
    items,
    contextText,
    analysisStatus,
    heroPhotoLocalId,
    photoCount,
    onDiscardSession,
    onQuickDescribe,
    onQuickSnap,
    onQuickUpload,
    onRemoveItem,
    onSetHero,
    onUpdateQuantity,
    onEditTextItem,
    onSaveContext,
    onAnalyze,
  } = props;

  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [showContextModal, setShowContextModal] = useState<boolean>(false);
  const [tempContext, setTempContext] = useState<string>(contextText);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isTranscriptionSlow, setIsTranscriptionSlow] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [isPreparingAnalyze, setIsPreparingAnalyze] = useState<boolean>(false);
  const [isAnalyzeInFlight, setIsAnalyzeInFlight] = useState<boolean>(false);

  // Refs to access latest values in async callbacks
  const isTranscribingRef = useRef(isTranscribing);
  const tempContextRef = useRef(tempContext);
  const isAnalyzeInFlightRef = useRef<boolean>(false);
  const transcriptionPromiseRef = useRef<Promise<void> | null>(null);
  const transcriptionAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isTranscribingRef.current = isTranscribing;
  }, [isTranscribing]);

  useEffect(() => {
    tempContextRef.current = tempContext;
  }, [tempContext]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleAudioTranscription = useCallback((audioUri: string): Promise<void> => {
    if (!audioUri) return Promise.resolve();
    const task = (async () => {
      setIsTranscribing(true);
      setIsTranscriptionSlow(false);
      const controller = new AbortController();
      transcriptionAbortRef.current = controller;
      try {
        const { data, error } = await transcribeAudioDirect(audioUri, userId, {
          signal: controller.signal,
          timeoutMs: 120_000,
          slowRequestMs: 30_000,
          onSlowRequest: () => setIsTranscriptionSlow(true),
        });
        if (error) throw error;
        const transcript = getCleanTranscript(data?.transcript);
        if (transcript) {
          setTempContext((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${transcript}` : transcript;
          });
        }
      } catch (err) {
        if (err instanceof Error && err.message === 'Transcription cancelled') {
          // User cancelled in-flight transcription; keep modal responsive without alert noise.
        } else if (isDailyLimitError(err)) {
          Alert.alert('Scan Limit Reached', err instanceof Error ? err.message : "You've hit today's scan limit. This resets at midnight UTC.");
        } else if (err instanceof Error && err.message.toLowerCase().includes('timed out')) {
          Alert.alert('Transcription Timeout', 'This is taking longer than expected. Please try again or use a shorter recording.');
        } else {
          Alert.alert('Transcription Error', 'Failed to transcribe audio. Please try again or type your feedback.');
        }
      } finally {
        setIsTranscribing(false);
        setIsTranscriptionSlow(false);
        if (transcriptionAbortRef.current === controller) {
          transcriptionAbortRef.current = null;
        }
      }
    })();

    transcriptionPromiseRef.current = task;
    return task.finally(() => {
      if (transcriptionPromiseRef.current === task) {
        transcriptionPromiseRef.current = null;
      }
    });
  }, [userId]);

  const cancelTranscription = useCallback((): void => {
    transcriptionAbortRef.current?.abort();
    transcriptionAbortRef.current = null;
    setIsTranscribing(false);
    setIsTranscriptionSlow(false);
  }, []);

  const { isRecording, metering, startRecording, stopRecording } = useAudioRecorder({
    onRecordingComplete: handleAudioTranscription,
    enableMetering: true,
    onError: (error) => {
      Alert.alert('Recording Error', error.message);
    },
  });

  const handleVoiceInput = useCallback(async () => {
    if (isRecording) {
      await stopRecording();
      return;
    }
    try {
      await startRecording();
    } catch {
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  }, [isRecording, startRecording, stopRecording]);

  const isAnalyzing = analysisStatus === 'analyzing' || analysisStatus === 'success';
  const canAnalyze =
    items.length > 0 &&
    analysisStatus === 'idle' &&
    !isAnalyzeInFlight &&
    !isPreparingAnalyze &&
    !isRecording &&
    !isTranscribing;

  const headerSubtitle = useMemo<string>(() => {
    if (items.length === 0) return 'Throw in photos or quick notes before we analyze.';
    return 'Everything you add will be analyzed together.';
  }, [items.length]);

  const openContext = useCallback((): void => {
    setTempContext(contextText);
    setShowContextModal(true);
  }, [contextText]);

  const closeContext = useCallback(async (): Promise<void> => {
    cancelTranscription();
    if (isRecording) {
      await stopRecording();
    }
    setShowContextModal(false);
    setTempContext('');
  }, [cancelTranscription, isRecording, stopRecording]);

  const saveContext = useCallback(async (): Promise<void> => {
    const shouldWaitForTranscription = isRecording || isTranscribing;
    if (isRecording) {
      await stopRecording();
    }
    if (shouldWaitForTranscription) {
      await waitForTranscription();
    }
    await onSaveContext(tempContext);
    setShowContextModal(false);
  }, [isRecording, isTranscribing, onSaveContext, stopRecording, tempContext, waitForTranscription]);

  const waitForTranscription = useCallback(async (): Promise<void> => {
    if (transcriptionPromiseRef.current) {
      await transcriptionPromiseRef.current;
      return;
    }
    // Fallback for rare edge cases where transcribing is true without a tracked promise.
    if (isTranscribingRef.current) {
      let attempts = 0;
      const maxAttempts = 200;
      while (isTranscribingRef.current && attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 100));
        attempts += 1;
      }
    }
  }, []);

  const handleAnalyze = useCallback(async (): Promise<void> => {
    if (isAnalyzeInFlightRef.current || analysisStatus !== 'idle') return;

    isAnalyzeInFlightRef.current = true;
    setIsAnalyzeInFlight(true);
    setIsPreparingAnalyze(true);
    try {
      // If recording is active, stop it first.
      if (isRecording) {
        await stopRecording();
      }

      // If transcription is already in-flight, wait deterministically before saving and analyzing.
      await waitForTranscription();

      const finalContext = tempContextRef.current.trim();
      if (finalContext) {
        await onSaveContext(finalContext);
      }

      await onAnalyze();
    } finally {
      setIsPreparingAnalyze(false);
      setIsAnalyzeInFlight(false);
      isAnalyzeInFlightRef.current = false;
    }
  }, [analysisStatus, isRecording, onAnalyze, onSaveContext, stopRecording, waitForTranscription]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
        style={{ overflow: 'visible' }}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[TextStyles.h2, { color: colors.text }]}>Meal Items</Text>
            <Text style={[TextStyles.body, { color: colors.icon, marginTop: 6 }]}>{headerSubtitle}</Text>
          </View>
          <TouchableOpacity onPress={onDiscardSession} style={styles.exitSessionButton} activeOpacity={0.85}>
            <IconSymbol name="xmark" size={18} color={colors.icon} />
            <Text style={[TextStyles.bodySmall, { color: colors.icon, fontWeight: '700' }]}>Exit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.itemsMetaRow}>
          <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
            {photoCount}/{MAX_PHOTOS} photos
          </Text>
        </View>

        <View style={styles.list}>
          {items.map((item) => (
            <MealItemRow
              key={item.localId}
              item={item}
              isHero={item.itemType === 'photo' && item.localId === heroPhotoLocalId}
              onRemove={() => onRemoveItem(item.localId)}
              onSetHero={() => onSetHero(item.localId)}
              onDecrement={() => onUpdateQuantity(item.localId, item.quantity - 1)}
              onIncrement={() => onUpdateQuantity(item.localId, item.quantity + 1)}
              onEditTextItem={() => {
                if (item.itemType === 'text') {
                  onEditTextItem(item.localId, item.text);
                }
              }}
            />
          ))}

          {items.length === 0 && (
            <View style={[styles.emptyState, { borderColor: tokens.glassBorder, backgroundColor: tokens.glassSurface }]}>
              <IconSymbol name="tray" size={28} color={colors.icon} />
              <Text style={[TextStyles.h4, { color: colors.text, marginTop: 10 }]}>Your tray is empty</Text>
              <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: 6, textAlign: 'center' }]}>
                Take a photo, upload an image, or add a quick description to get started.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={openContext}
          disabled={isAnalyzing}
          activeOpacity={0.85}
        >
          <GlassCard
            intensity={15}
            padding={14}
            style={{
              marginBottom: Spacing.lg,
              borderColor: tokens.glassBorder,
            }}
          >
            <View style={styles.contextRow}>
              <View style={styles.contextIcon}>
                <IconSymbol name="sparkles" size={20} color={tokens.accent} />
              </View>
              <View style={styles.contextLeft}>
                <Text style={[TextStyles.bodySmall, { color: tokens.textPrimary, fontWeight: '800' }]}>
                  {contextText.trim() ? 'Edit context' : 'Add context'}
                </Text>
                <Text style={[TextStyles.caption, { color: tokens.textMuted, marginTop: 2 }]}>
                  Portions, oils, timing, or anything the camera missed
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={16} color={tokens.textMuted} />
            </View>
          </GlassCard>
        </TouchableOpacity>

        <View style={styles.quickAddContainer}>
          <View style={[styles.quickAddPill, { borderColor: tokens.glassBorder, backgroundColor: 'rgba(2, 44, 34, 0.85)' }]}>
            <TouchableOpacity onPress={onQuickSnap} style={styles.quickAddButton} activeOpacity={0.85}>
              <IconSymbol name="camera" size={20} color="white" />
              <Text style={styles.quickAddText}>Photo</Text>
            </TouchableOpacity>
            <View style={styles.quickDivider} />
            <TouchableOpacity onPress={onQuickUpload} style={styles.quickAddButton} activeOpacity={0.85}>
              <IconSymbol name="square.and.arrow.up" size={20} color="white" />
              <Text style={styles.quickAddText}>Upload</Text>
            </TouchableOpacity>
            <View style={styles.quickDivider} />
            <TouchableOpacity onPress={onQuickDescribe} style={styles.quickAddButton} activeOpacity={0.85}>
              <IconSymbol name="mic" size={20} color="white" />
              <Text style={styles.quickAddText}>Describe</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.analyzeContainer}>
          <Button
            variant="primary"
            onPress={handleAnalyze}
            disabled={!canAnalyze}
            fullWidth
            style={[
              styles.analyzeButton,
              canAnalyze && {
                shadowColor: tokens.accent,
                shadowOpacity: 0.45,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
              },
            ]}
            icon={
              isPreparingAnalyze ? (
                <SwirlingSpinner size="small" color="#000000" />
              ) : (
                <IconSymbol name="brain.head.profile" size={18} color="#000000" />
              )
            }
          >
            {isPreparingAnalyze ? 'Preparing analysis...' : 'Analyze meal'}
          </Button>
        </View>
      </ScrollView>

      <Modal visible={showContextModal} transparent animationType="fade" onRequestClose={closeContext}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <View style={[styles.modalCard, { backgroundColor: tokens.background }]}>
                <View style={styles.modalHeader}>
                  <Text style={[TextStyles.h3, { color: colors.text }]}>Add context</Text>
                  <TouchableOpacity onPress={closeContext} style={styles.modalClose} activeOpacity={0.85}>
                    <IconSymbol name="xmark" size={22} color={colors.icon} />
                  </TouchableOpacity>
                </View>
                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.md }]}>
                  Portions, oils, timing, or anything the camera missed
                </Text>
                <Input
                  placeholder="E.g., large portion, cooked in olive oil, had a soda…"
                  value={tempContext}
                  onChangeText={setTempContext}
                  multiline
                  numberOfLines={7}
                  textAlignVertical="top"
                  rightIcon={
                    !isKeyboardVisible && (
                      <View style={styles.voiceInputWrapper}>
                        <View style={styles.voicePulseClip}>
                          <VoicePulseSkia metering={metering} isRecording={isRecording} size={56} />
                        </View>
                        <TouchableOpacity
                          onPress={handleVoiceInput}
                          disabled={isTranscribing}
                          activeOpacity={0.7}
                          style={[
                            styles.voiceInputButton,
                            {
                              backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.15)' : `${tokens.accent}15`,
                              borderColor: isRecording ? '#EF4444' : `${tokens.accent}40`,
                            },
                          ]}
                        >
                          <IconSymbol
                            name={isRecording ? 'stop.fill' : isTranscribing ? 'hourglass' : 'mic'}
                            size={24}
                            color={isRecording ? '#EF4444' : tokens.accent}
                          />
                        </TouchableOpacity>
                      </View>
                    )
                  }
                  containerStyle={{ marginBottom: Spacing.lg }}
                  style={{ minHeight: 140 }}
                />

                {/* Recording indicator */}
                {isRecording && (
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={[TextStyles.bodySmall, { color: '#EF4444' }]}>Recording… tap mic to stop</Text>
                  </View>
                )}

                {/* Transcribing indicator */}
                {isTranscribing && (
                  <View style={styles.transcribingIndicator}>
                    <SwirlingSpinner size="small" />
                    <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>Transcribing…</Text>
                  </View>
                )}
                {isTranscribing && (
                  <TouchableOpacity onPress={cancelTranscription} activeOpacity={0.8} style={styles.cancelTranscriptionButton}>
                    <Text style={[TextStyles.bodySmall, { color: tokens.accent, fontWeight: '700' }]}>Cancel transcription</Text>
                  </TouchableOpacity>
                )}
                {isTranscribing && isTranscriptionSlow && (
                  <Text style={[TextStyles.caption, { color: colors.icon, marginBottom: Spacing.md }]}>
                    Still transcribing... You can cancel and retry.
                  </Text>
                )}

                <View style={styles.modalActions}>
                  <Button variant="secondary" onPress={closeContext} style={styles.modalButton}>
                    Cancel
                  </Button>
                  <Button variant="primary" onPress={saveContext} style={styles.modalButton}>
                    Save
                  </Button>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <AnalysisLoadingOverlay status={analysisStatus} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: PageSpacing.containerPadding,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  exitSessionButton: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    minHeight: 40,
  },
  itemsMetaRow: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  list: {
    marginBottom: Spacing.lg,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  quickAddContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    marginTop: Spacing.sm,
  },
  quickAddPill: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  quickAddButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 96,
    minHeight: 44,
    gap: 4,
  },
  quickAddText: {
    ...TextStyles.caption,
    color: 'white',
    fontWeight: '700',
  },
  quickDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 66,
    marginBottom: Spacing.lg,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  contextIcon: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    padding: 8,
    borderRadius: 12,
    flexShrink: 0,
  },
  contextLeft: {
    flex: 1,
    minWidth: 0,
  },
  analyzeContainer: {
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 12,
    marginTop: Spacing.md,
    overflow: 'visible',
  },
  analyzeButton: {
    minHeight: 56,
  },

  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    minHeight: 72,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  itemThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  textThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMain: {
    flex: 1,
    gap: 8,
  },
  editHint: {
    ...TextStyles.caption,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
  },
  itemTitle: {
    ...TextStyles.body,
    color: 'white',
    fontFamily: FontFamilies.headingBold,
    fontWeight: Platform.OS === 'web' ? '800' : undefined,
    fontSize: 17,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    minHeight: 32,
    alignSelf: 'flex-start',
    gap: 6,
  },
  heroButtonText: {
    ...TextStyles.caption,
    color: 'white',
    fontWeight: '700',
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 10,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  stepperButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  stepperValue: {
    width: 36,
    textAlign: 'center',
    color: 'white',
    fontWeight: '800',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 520,
  },
  modalCard: {
    borderRadius: 20,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  modalClose: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
  },
  voiceInputWrapper: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voicePulseClip: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: Platform.OS === 'android' ? 'visible' : 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceInputButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    zIndex: 1,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.md,
    marginBottom: Spacing.md,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  transcribingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: -Spacing.md,
    marginBottom: Spacing.md,
  },
  cancelTranscriptionButton: {
    marginTop: -Spacing.xs,
    marginBottom: Spacing.md,
    alignSelf: 'flex-start',
  },
});


