import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { bgPrimary, Colors, glassBorder, glassSurface, neonGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useColorScheme } from '@/hooks/useColorScheme';
import { transcribeAudioDirect } from '@/lib/supabase';
import { AnalysisLoadingOverlay, AnalysisStatus } from './AnalysisLoadingOverlay';
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
}

function MealItemRow(props: MealItemRowProps): React.ReactElement {
  const { item, isHero, onRemove, onSetHero, onDecrement, onIncrement } = props;

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
        <View style={styles.itemMain}>
          {item.itemType === 'photo' ? (
            <Text style={styles.itemTitle} numberOfLines={1}>
              Photo
            </Text>
          ) : item.itemType === 'verified' ? (
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.foodItem.name}
            </Text>
          ) : (
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.text}
            </Text>
          )}
          {item.itemType === 'photo' && (
            <TouchableOpacity onPress={onSetHero} style={styles.heroButton} activeOpacity={0.85}>
              <IconSymbol name={isHero ? 'star.fill' : 'star'} size={16} color={isHero ? neonGreen : 'white'} />
              {!isHero && <Text style={styles.heroButtonText}>Set hero</Text>}
            </TouchableOpacity>
          )}
        </View>
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
    onSaveContext,
    onAnalyze,
  } = props;

  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [showContextModal, setShowContextModal] = useState<boolean>(false);
  const [tempContext, setTempContext] = useState<string>(contextText);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);

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

  const handleAudioTranscription = useCallback(async (audioUri: string) => {
    if (!audioUri) return;
    setIsTranscribing(true);
    try {
      const { data, error } = await transcribeAudioDirect(audioUri, userId);
      if (error) throw error;
      if (data?.transcript) {
        setTempContext((prev) => {
          const trimmed = prev.trim();
          return trimmed ? `${trimmed} ${data.transcript}` : data.transcript;
        });
      }
    } catch (e) {
      Alert.alert('Transcription Error', 'Failed to transcribe audio. Please try again or type your feedback.');
    } finally {
      setIsTranscribing(false);
    }
  }, [userId]);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onRecordingComplete: handleAudioTranscription,
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
  const canAnalyze = items.length > 0 && analysisStatus === 'idle';

  const headerSubtitle = useMemo<string>(() => {
    if (items.length === 0) return 'Throw in photos or quick notes before we analyze.';
    return 'Everything you add will be analyzed together.';
  }, [items.length]);

  const openContext = useCallback((): void => {
    setTempContext(contextText);
    setShowContextModal(true);
  }, [contextText]);

  const closeContext = useCallback(async (): Promise<void> => {
    if (isRecording) {
      await stopRecording();
    }
    setShowContextModal(false);
    setTempContext('');
  }, [isRecording, stopRecording]);

  const saveContext = useCallback(async (): Promise<void> => {
    if (isRecording) {
      await stopRecording();
    }
    await onSaveContext(tempContext);
    setShowContextModal(false);
  }, [isRecording, onSaveContext, stopRecording, tempContext]);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 140 }]}
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
            />
          ))}

          {items.length === 0 && (
            <View style={[styles.emptyState, { borderColor: glassBorder, backgroundColor: glassSurface }]}>
              <IconSymbol name="tray" size={28} color={colors.icon} />
              <Text style={[TextStyles.h4, { color: colors.text, marginTop: 10 }]}>Your tray is empty</Text>
              <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: 6, textAlign: 'center' }]}>
                Take a photo, upload an image, or add a quick description to get started.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.quickAddContainer}>
          <View style={[styles.quickAddPill, { borderColor: glassBorder, backgroundColor: 'rgba(2, 44, 34, 0.85)' }]}>
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

        <Pressable
          onPress={openContext}
          disabled={isAnalyzing}
          style={({ pressed }) => [
            styles.contextCard,
            {
              borderColor: 'rgba(255,255,255,0.10)',
              backgroundColor: 'rgba(255,255,255,0.04)',
              opacity: pressed ? 0.92 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Add context"
          accessibilityHint="Add portions, oils, timing, or anything the camera missed"
        >
          <View style={styles.contextLeft}>
            <Text style={[TextStyles.bodySmall, { color: colors.text, fontWeight: '700' }]}>
              {contextText.trim() ? 'Edit context' : 'Add context'}
            </Text>
            <Text style={[TextStyles.caption, { color: colors.icon, marginTop: 4 }]}>
              Portions, oils, timing, or anything the camera missed
            </Text>
          </View>
          <IconSymbol name="chevron.right" size={16} color={colors.icon} />
        </Pressable>

        <View style={styles.analyzeContainer}>
          <Button
            variant="primary"
            onPress={onAnalyze}
            disabled={!canAnalyze}
            fullWidth
            style={[
              styles.analyzeButton,
              canAnalyze && {
                shadowColor: neonGreen,
                shadowOpacity: 0.45,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
              },
            ]}
            icon={<IconSymbol name="brain.head.profile" size={18} color="#000000" />}
          >
            Analyze meal
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
              <View style={styles.modalCard}>
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
                      <TouchableOpacity
                        onPress={handleVoiceInput}
                        disabled={isTranscribing}
                        activeOpacity={0.7}
                        style={styles.voiceInputButton}
                      >
                        <IconSymbol
                          name={isRecording ? 'stop.fill' : isTranscribing ? 'hourglass' : 'mic'}
                          size={26}
                          color={isRecording ? '#EF4444' : neonGreen}
                        />
                      </TouchableOpacity>
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
                    <ActivityIndicator size="small" color={neonGreen} />
                    <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>Transcribing…</Text>
                  </View>
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
  contextLeft: {
    flex: 1,
    paddingRight: 10,
  },
  analyzeContainer: {
    width: '100%',
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
    backgroundColor: bgPrimary,
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
  voiceInputButton: {
    padding: Spacing.xs,
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
});


