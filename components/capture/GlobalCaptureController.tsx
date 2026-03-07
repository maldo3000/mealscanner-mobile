import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { SwirlingSpinner } from '@/components/ui/SwirlingSpinner';

import { useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/AppBackground';
import { AnalysisStatus } from '@/components/capture/AnalysisLoadingOverlay';
import { CaptureCameraOverlay } from '@/components/capture/CaptureCameraOverlay';
import { CaptureImagePreview } from '@/components/capture/CaptureImagePreview';
import { DescribeInputSheet } from '@/components/capture/DescribeInputSheet';
import { FoodSearchModal } from '@/components/capture/FoodSearchModal';
import { MealStagingScreen } from '@/components/capture/MealStagingScreen';
import type { CaptureIntent, DatabaseFoodItem } from '@/components/capture/types';
import { PageContainer } from '@/components/layout/PageContainer';
import { Paywall } from '@/components/subscription/Paywall';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useMealCaptureDraft } from '@/hooks/useMealCaptureDraft';
import { useReviewPrompt } from '@/hooks/useReviewPrompt';
import type { AnalyzeMealMultiItemInput, DatabaseFoodMealData } from '@/lib/supabase';
import {
    analyzeMealMulti,
    analyzeRecipeFromImage,
    isDailyLimitError,
    isRecipeFeatureUnavailableError,
    saveDatabaseMeal,
    uploadMealImage,
} from '@/lib/supabase';

export interface GlobalCaptureControllerProps {
  /** The action to trigger (snap, describe, etc.) */
  activeAction: 'snap' | 'describe' | 'log' | 'recipe' | null;
  /** Callback to fully close the capture controller */
  onClose: () => void;
  /** Callback to acknowledge the action was processed (clears activeAction only) */
  onActionProcessed: () => void;
  /** Whether the overlay should be visible */
  isVisible: boolean;
}

type ScreenState =
  | { type: 'idle' }
  | { type: 'loading_auth' }
  | { type: 'signed_out' }
  | { type: 'loading_draft' }
  | { type: 'staging' }
  | { type: 'camera_meal' }
  | { type: 'camera_recipe' }
  | { type: 'describe_meal' }
  | { type: 'search_entry' }
  | { type: 'recipe_processing'; photoUri: string }
  | { type: 'image_preview'; uri: string; mode: 'meal' | 'recipe' };

interface EditingTextItemState {
  localId: string;
  text: string;
}

export function GlobalCaptureController({ activeAction, onClose, onActionProcessed, isVisible }: GlobalCaptureControllerProps) {
  const { tokens } = useTheme();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const { user, isLoading: isAuthLoading } = useAuth();
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [isProcessingRecipe, setIsProcessingRecipe] = useState<boolean>(false);
  const [paywallVisible, setPaywallVisible] = useState<boolean>(false);

  const [permission, requestPermission] = useCameraPermissions();
  const draft = useMealCaptureDraft();
  const { canScan, isPro, scanLimitState, incrementScan, ensureSubscriptionSynced } = useFeatureAccess();
  const { trackSuccessfulScan } = useReviewPrompt();

  const [cameraMode, setCameraMode] = useState<'meal' | 'recipe' | null>(null);
  const [describeOpen, setDescribeOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [editingTextItem, setEditingTextItem] = useState<EditingTextItemState | null>(null);
  const [recipePhotoUri, setRecipePhotoUri] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<{ uri: string; mode: 'meal' | 'recipe' } | null>(null);
  const isAnalyzeInFlightRef = useRef<boolean>(false);

  // Determine which screen to show
  const screenState = useMemo<ScreenState>(() => {
    // If not visible and no items, we are idle
    if (!isVisible && draft.isReady && draft.items.length === 0) return { type: 'idle' };
    
    // Once we have items or an active action, we show something
    if (isAuthLoading) return { type: 'loading_auth' };
    if (!user) return { type: 'signed_out' };
    if (!draft.isReady) return { type: 'loading_draft' };
    if (previewUri) return { type: 'image_preview', uri: previewUri.uri, mode: previewUri.mode };
    if (recipePhotoUri && isProcessingRecipe) return { type: 'recipe_processing', photoUri: recipePhotoUri };
    if (cameraMode === 'meal') return { type: 'camera_meal' };
    if (cameraMode === 'recipe') return { type: 'camera_recipe' };
    if (describeOpen) return { type: 'describe_meal' };
    if (searchOpen) return { type: 'search_entry' };
    if (draft.items.length > 0) return { type: 'staging' };

    // If an action is pending but local state hasn't been set by useEffect yet,
    // show a loading overlay instead of returning idle to prevent a brief flash
    // of the underlying screen during the transition.
    // activeAction is cleared by onActionProcessed() after the intent is handled,
    // so this only shows during the brief window between trigger and processing.
    if (activeAction) return { type: 'loading_draft' };
    
    return { type: 'idle' };
  }, [isVisible, isAuthLoading, activeAction, cameraMode, describeOpen, draft.isReady, draft.items.length, isProcessingRecipe, previewUri, recipePhotoUri, searchOpen, user]);

  // Handle intent from external trigger
  const handleIntent = useCallback(
    async (intent: CaptureIntent): Promise<void> => {
      if (intent === 'snap') {
        if (!permission?.granted) {
          const result = await requestPermission();
          if (!result.granted) {
            Alert.alert('Camera Permission', 'We need camera permissions to take photos.');
            onClose();
            return;
          }
        }
        setCameraMode('meal');
      } else if (intent === 'describe') {
        setEditingTextItem(null);
        setDescribeOpen(true);
      } else if (intent === 'search') {
        setSearchOpen(true);
      } else if (intent === 'extract_recipe') {
        if (!permission?.granted) {
          const result = await requestPermission();
          if (!result.granted) {
            Alert.alert('Camera Permission', 'We need camera permissions to capture recipes.');
            onClose();
            return;
          }
        }
        setCameraMode('recipe');
      }
    },
    [permission, requestPermission, onClose]
  );

  // Process the incoming action and immediately clear it via onActionProcessed().
  // Clearing activeAction after processing ensures that:
  // 1. The same action can be triggered again (e.g. describe → cancel → describe)
  // 2. The screenState loading_draft fallback doesn't persist after processing
  // 3. handleIntent won't re-fire on dependency changes (activeAction is null)
  useEffect(() => {
    if (!activeAction || !user || !draft.isReady) return;

    if (activeAction === 'snap') {
      void handleIntent('snap');
    } else if (activeAction === 'describe') {
      void handleIntent('describe');
    } else if (activeAction === 'log') {
      void handleIntent('search');
    } else if (activeAction === 'recipe') {
      void handleIntent('extract_recipe');
    }

    // Acknowledge the action so it resets to null. The controller stays
    // mounted via isCaptureVisible, but activeAction is now free for reuse.
    onActionProcessed();
  }, [activeAction, user, draft.isReady, handleIntent, onActionProcessed]);

  // Camera handlers
  const handleMealPhotoCaptured = useCallback(
    async (uri: string): Promise<void> => {
      setCameraMode(null);
      try {
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        await draft.addPhotoFromUri(manipulated.uri);
      } catch (e) {
        await draft.addPhotoFromUri(uri);
      }
    },
    [draft]
  );

  const handleCameraCancel = useCallback((): void => {
    setCameraMode(null);
    if (draft.items.length === 0) onClose();
  }, [draft.items.length, onClose]);

  const handlePickImage = useCallback(async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need photo library permissions to upload photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      const currentMode = cameraMode || 'meal';
      setPreviewUri({ uri, mode: currentMode as 'meal' | 'recipe' });
      setCameraMode(null);
    }
  }, [cameraMode]);

  // Describe handlers
  const handleDescribeSubmit = useCallback(
    async (text: string): Promise<void> => {
      if (editingTextItem) {
        await draft.updateTextItem(editingTextItem.localId, text);
      } else {
        await draft.addTextItem(text);
      }
      setEditingTextItem(null);
      setDescribeOpen(false);
    },
    [draft, editingTextItem]
  );

  const handleDescribeCancel = useCallback((): void => {
    setEditingTextItem(null);
    setDescribeOpen(false);
    if (draft.items.length === 0) onClose();
  }, [draft.items.length, onClose]);

  const handleEditTextItem = useCallback(
    (localId: string, currentText: string): void => {
      setEditingTextItem({ localId, text: currentText });
      setDescribeOpen(true);
    },
    []
  );

  // Search handlers
  const handleFoodItemSelected = useCallback(
    async (item: DatabaseFoodItem, quantity: number): Promise<void> => {
      await draft.addVerifiedItem(item, quantity);
      setSearchOpen(false);
    },
    [draft]
  );

  const handleSearchCancel = useCallback((): void => {
    setSearchOpen(false);
    if (draft.items.length === 0) onClose();
  }, [draft.items.length, onClose]);

  const handleQuickLog = useCallback(
    async (item: DatabaseFoodItem, totalGrams: number): Promise<void> => {
      if (!user) return;
      try {
        const foodData: DatabaseFoodMealData = {
          id: item.id,
          name: item.name,
          brand: item.brand,
          source: item.source,
          caloriesPer100g: item.caloriesPer100g,
          proteinPer100g: item.proteinPer100g,
          carbsPer100g: item.carbsPer100g,
          fatPer100g: item.fatPer100g,
          fiberPer100g: item.fiberPer100g,
          sodiumPer100g: item.sodiumPer100g,
          ingredients: item.ingredients,
          servingSize: item.servingSize,
          servingUnit: item.servingUnit,
          servingText: item.servingText,
          barcode: item.barcode,
          imageUrl: item.imageUrl,
        };
        const { data } = await saveDatabaseMeal(user.id, foodData, totalGrams);
        setSearchOpen(false);
        onClose();
        if (data?.id) router.push(`/meal/${data.id}`);
        else router.push('/(tabs)/journal');
      } catch (error) {
        Alert.alert('Error', 'Failed to log food');
      }
    },
    [user, router, onClose]
  );

  // Staging handlers
  const handleDiscardSession = useCallback(async (): Promise<void> => {
    Alert.alert('Discard meal?', 'All photos and items will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          // Await discardSession so AsyncStorage is cleared before we close.
          // discardSession clears storage explicitly (not via persistence effect)
          // so the CaptureContext restore effect won't re-mount the controller.
          await draft.discardSession();
          onClose();
        },
      },
    ]);
  }, [draft, onClose]);

  const handleAnalyze = useCallback(async (): Promise<void> => {
    if (!user || draft.items.length === 0) return;
    if (isAnalyzeInFlightRef.current || analysisStatus !== 'idle') return;
    isAnalyzeInFlightRef.current = true;

    try {
      const hasAIItems = draft.items.some(item => item.itemType === 'photo' || item.itemType === 'text');
      if (hasAIItems && !canScan().allowed) {
        setPaywallVisible(true);
        return;
      }

      setAnalysisStatus('analyzing');

      // CRITICAL: Ensure subscription tier is synced to database BEFORE analysis.
      // This fixes a race condition where the user upgrades to Pro but the backend
      // reads stale 'free' status, resulting in missing fiber/sugar/sodium/cholesterol.
      const isSubscriptionSynced = await ensureSubscriptionSynced({ expectedIsPro: isPro });
      if (isPro && !isSubscriptionSynced) {
        Alert.alert(
          'Unable to verify Pro access',
          'We could not sync your subscription status. Please try again in a moment.'
        );
        return;
      }

      const inputs: AnalyzeMealMultiItemInput[] = [];
      let orderIndex = 0;

      for (const item of draft.items) {
        if (item.itemType === 'photo') {
          const fileName = `meal_${Date.now()}_${orderIndex}.jpg`;
          const { data: uploadData, error: uploadError } = await uploadMealImage(item.localUri, fileName, user.id);
          if (uploadError || !uploadData?.publicUrl) throw new Error(`Failed to upload photo ${orderIndex + 1}`);
          inputs.push({ itemType: 'photo', imageUrl: uploadData.publicUrl, quantity: item.quantity, orderIndex, isHero: item.isHero });
        } else if (item.itemType === 'text') {
          inputs.push({ itemType: 'text', text: item.text, quantity: item.quantity, orderIndex, isHero: false });
        } else if (item.itemType === 'verified') {
          inputs.push({ itemType: 'verified', verifiedNutrition: { ...item.foodItem }, quantity: item.quantity, orderIndex, isHero: false });
        }
        orderIndex += 1;
      }

      const { data, error } = await analyzeMealMulti({ userId: user.id, items: inputs, isPro, contextText: draft.contextText });
      if (error) throw error;

      if (hasAIItems) await incrementScan();
      setAnalysisStatus('success');
      void trackSuccessfulScan();
      await new Promise(resolve => setTimeout(resolve, 1500));
      await draft.discardSession();
      onClose();

      const mealId = (data as any)?.meal_id;
      if (mealId) router.push(`/meal/${mealId}`);
      else router.push('/(tabs)/journal');
    } catch (error) {
      if (isDailyLimitError(error)) {
        Alert.alert(
          'Scan Limit Reached',
          error instanceof Error ? error.message : "You've hit today's scan limit. This resets at midnight UTC.",
        );
      } else {
        Alert.alert('Error', 'Analysis failed');
      }
    } finally {
      setAnalysisStatus('idle');
      isAnalyzeInFlightRef.current = false;
    }
  }, [analysisStatus, draft, router, user, canScan, incrementScan, isPro, onClose, ensureSubscriptionSynced, trackSuccessfulScan]);

  // Recipe handlers
  const handleRecipePhotoCaptured = useCallback(
    async (uri: string): Promise<void> => {
      setCameraMode(null);
      let finalUri = uri;
      try {
        const manipulated = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1200 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
        finalUri = manipulated.uri;
      } catch (e) {}

      setRecipePhotoUri(finalUri);
      setIsProcessingRecipe(true);

      try {
        if (!user) throw new Error('Not signed in');
        const fileName = `recipe_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await uploadMealImage(finalUri, fileName, user.id);
        if (uploadError || !uploadData?.publicUrl) throw new Error('Failed to upload');
        const { data, error } = await analyzeRecipeFromImage(uploadData.publicUrl, user.id, isPro);
        if (error) throw error;
        setRecipePhotoUri(null);
        onClose();
        const recipeId = (data as any)?.recipe_id;
        if (recipeId) router.push(`/recipe/${recipeId}`);
        else router.push('/(tabs)/recipes');
      } catch (error) {
        if (isRecipeFeatureUnavailableError(error)) {
          Alert.alert('Unavailable', 'Recipe generation is currently unavailable.');
        } else {
          Alert.alert('Error', 'Recipe analysis failed');
        }
        setRecipePhotoUri(null);
      } finally {
        setIsProcessingRecipe(false);
      }
    },
    [router, user, isPro, onClose]
  );

  // Render logic
  if (screenState.type === 'idle') return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 99999 }]} pointerEvents="box-none">
      {screenState.type === 'loading_auth' || screenState.type === 'loading_draft' ? (
        <View style={styles.centeredOverlay}>
          <SwirlingSpinner size="large" />
        </View>
      ) : screenState.type === 'signed_out' ? (
        <View style={styles.centeredOverlay}>
          <Text style={TextStyles.h2}>Please sign in</Text>
          <Button variant="primary" onPress={() => { onClose(); router.push('/(tabs)/auth'); }}>Go to Sign In</Button>
        </View>
      ) : screenState.type === 'camera_meal' ? (
        <CaptureCameraOverlay onCancel={handleCameraCancel} onCaptured={handleMealPhotoCaptured} onPickImage={handlePickImage} />
      ) : screenState.type === 'camera_recipe' ? (
        <CaptureCameraOverlay onCancel={handleCameraCancel} onCaptured={handleRecipePhotoCaptured} onPickImage={handlePickImage} />
      ) : screenState.type === 'recipe_processing' ? (
        <View style={styles.centeredOverlay}>
          <SwirlingSpinner size="large" />
          <Text style={[TextStyles.h3, { marginTop: Spacing.lg }]}>Extracting recipe…</Text>
        </View>
      ) : screenState.type === 'describe_meal' ? (
        <DescribeInputSheet 
          userId={user?.id ?? ''} 
          onCancel={handleDescribeCancel} 
          onSubmit={handleDescribeSubmit} 
          initialText={editingTextItem?.text ?? ''}
          title={editingTextItem ? 'Edit Description' : 'Describe Meal'}
          subtitle={editingTextItem ? 'Update your meal description before analyzing' : 'Type or speak what you ate'}
          placeholder="E.g., two scrambled eggs with toast"
        />
      ) : screenState.type === 'search_entry' ? (
        <FoodSearchModal onCancel={handleSearchCancel} onSelectItem={handleFoodItemSelected} onQuickLog={handleQuickLog} />
      ) : screenState.type === 'image_preview' ? (
        <CaptureImagePreview
          uri={screenState.uri}
          onCancel={() => setPreviewUri(null)}
          onConfirm={async () => {
            const { uri, mode } = screenState;
            setPreviewUri(null);
            if (mode === 'meal') await handleMealPhotoCaptured(uri);
            else await handleRecipePhotoCaptured(uri);
          }}
        />
      ) : screenState.type === 'staging' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}>
          <AppBackground />
          <PageContainer backgroundColor="transparent">
            <MealStagingScreen
              userId={user?.id ?? ''}
              items={draft.items}
              contextText={draft.contextText}
              analysisStatus={analysisStatus}
              heroPhotoLocalId={draft.items.find(i => i.itemType === 'photo' && i.isHero)?.localId ?? null}
              photoCount={draft.photoCount}
              onDiscardSession={handleDiscardSession}
              onQuickSnap={() => setCameraMode('meal')}
              onQuickUpload={handlePickImage}
              onQuickDescribe={() => {
                setEditingTextItem(null);
                setDescribeOpen(true);
              }}
              onRemoveItem={draft.removeItem}
              onSetHero={draft.setHero}
              onUpdateQuantity={draft.updateQuantity}
              onEditTextItem={handleEditTextItem}
              onSaveContext={draft.setContextText}
              onAnalyze={handleAnalyze}
            />
          </PageContainer>
        </View>
      ) : null}

      <Paywall visible={paywallVisible} onClose={() => setPaywallVisible(false)} feature="scans" />
    </View>
  );
}

const styles = StyleSheet.create({
  centeredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: PageSpacing.containerPadding,
  },
});






