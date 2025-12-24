import React, { useCallback, useMemo, useState } from 'react';
import {
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

import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { Colors, glassBorder, glassSurface, neonGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import type { DraftMealItem } from './types';

const MAX_PHOTOS = 4 as const;

export interface MealStagingScreenProps {
  items: DraftMealItem[];
  contextText: string;
  isAnalyzing: boolean;

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
    items,
    contextText,
    isAnalyzing,
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

  const canAnalyze = items.length > 0 && !isAnalyzing;

  const headerSubtitle = useMemo<string>(() => {
    if (items.length === 0) return 'Throw in photos or quick notes before we analyze.';
    return 'Everything you add will be analyzed together.';
  }, [items.length]);

  const openContext = useCallback((): void => {
    setTempContext(contextText);
    setShowContextModal(true);
  }, [contextText]);

  const closeContext = useCallback((): void => {
    setShowContextModal(false);
    setTempContext('');
  }, []);

  const saveContext = useCallback(async (): Promise<void> => {
    await onSaveContext(tempContext);
    setShowContextModal(false);
  }, [onSaveContext, tempContext]);

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
                Snap a photo, upload an image, or add a quick description to get started.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.quickAddContainer}>
          <View style={[styles.quickAddPill, { borderColor: glassBorder, backgroundColor: 'rgba(2, 44, 34, 0.85)' }]}>
            <TouchableOpacity onPress={onQuickSnap} style={styles.quickAddButton} activeOpacity={0.85}>
              <IconSymbol name="camera" size={20} color="white" />
              <Text style={styles.quickAddText}>Snap</Text>
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
              <BlurView intensity={20} tint="dark" style={styles.modalContent}>
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
                  containerStyle={{ marginBottom: Spacing.lg }}
                  style={{ minHeight: 140 }}
                />
                <View style={styles.modalActions}>
                  <Button variant="secondary" onPress={closeContext} style={styles.modalButton}>
                    Cancel
                  </Button>
                  <Button variant="primary" onPress={saveContext} style={styles.modalButton}>
                    Save
                  </Button>
                </View>
              </BlurView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    fontWeight: '700',
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  modalContent: {
    borderRadius: 20,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: Spacing.md,
  },
  modalClose: {
    padding: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
  },
});


