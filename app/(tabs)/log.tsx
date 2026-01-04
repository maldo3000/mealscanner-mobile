import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { useCameraPermissions } from 'expo-camera';
import { useNavigation, useRouter, useLocalSearchParams } from 'expo-router';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/Button';
import { CaptureCameraOverlay } from '@/components/capture/CaptureCameraOverlay';
import { CaptureImagePreview } from '@/components/capture/CaptureImagePreview';
import { CaptureQuad } from '@/components/capture/CaptureQuad';
import { DescribeInputSheet } from '@/components/capture/DescribeInputSheet';
import { MealStagingScreen } from '@/components/capture/MealStagingScreen';
import { FoodSearchModal } from '@/components/capture/FoodSearchModal';
import { AnalysisStatus } from '@/components/capture/AnalysisLoadingOverlay';
import { UpgradePrompt, ScanCounter } from '@/components/subscription/UpgradePrompt';
import { Paywall } from '@/components/subscription/Paywall';
import { useMealCaptureDraft } from '@/hooks/useMealCaptureDraft';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { Colors, primaryGreen, neonGreen } from '@/constants/Colors';
import { Spacing, PageSpacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  analyzeMealMulti,
  analyzeRecipeFromImage,
  getCurrentUser,
  saveDatabaseMeal,
  supabase,
  uploadMealImage,
} from '@/lib/supabase';
import type { AnalyzeMealMultiItemInput, AnalyzeMealMultiRequest, DatabaseFoodMealData } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { CaptureIntent, DatabaseFoodItem } from '@/components/capture/types';

type ScreenState =
  | { type: 'loading_auth' }
  | { type: 'signed_out' }
  | { type: 'loading_draft' }
  | { type: 'quad' }
  | { type: 'staging' }
  | { type: 'camera_meal' }
  | { type: 'camera_recipe' }
  | { type: 'describe_meal' }
  | { type: 'search_entry' }
  | { type: 'recipe_processing'; photoUri: string }
  | { type: 'image_preview'; uri: string; mode: 'meal' | 'recipe' };

export default function LogScreen(): React.ReactElement {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ action?: string }>();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [isProcessingRecipe, setIsProcessingRecipe] = useState<boolean>(false);
  const [paywallVisible, setPaywallVisible] = useState<boolean>(false);

  const [permission, requestPermission] = useCameraPermissions();

  const draft = useMealCaptureDraft();
  const { canScan, isPro, scanLimitState, incrementScan, showPaywall } = useFeatureAccess();

  // Determine which screen to show
  const [pendingIntent, setPendingIntent] = useState<CaptureIntent | null>(null);
  const [cameraMode, setCameraMode] = useState<'meal' | 'recipe' | null>(null);
  const [describeOpen, setDescribeOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [recipePhotoUri, setRecipePhotoUri] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<{ uri: string; mode: 'meal' | 'recipe' } | null>(null);

  const screenState = useMemo<ScreenState>(() => {
    if (authLoading) return { type: 'loading_auth' };
    if (!user) return { type: 'signed_out' };
    if (!draft.isReady) return { type: 'loading_draft' };
    if (previewUri) return { type: 'image_preview', uri: previewUri.uri, mode: previewUri.mode };
    if (recipePhotoUri && isProcessingRecipe) return { type: 'recipe_processing', photoUri: recipePhotoUri };
    if (cameraMode === 'meal') return { type: 'camera_meal' };
    if (cameraMode === 'recipe') return { type: 'camera_recipe' };
    if (describeOpen) return { type: 'describe_meal' };
    if (searchOpen) return { type: 'search_entry' };
    if (draft.items.length > 0) return { type: 'staging' };
    return { type: 'quad' };
  }, [authLoading, cameraMode, describeOpen, draft.isReady, draft.items.length, isProcessingRecipe, previewUri, recipePhotoUri, searchOpen, user]);

  // Hide tab bar when camera or preview is open
  useEffect(() => {
    const hideTabBar = cameraMode !== null || previewUri !== null;
    navigation.setOptions({
      tabBarStyle: hideTabBar ? { display: 'none', height: 0, opacity: 0, pointerEvents: 'none' } : undefined,
    });
    return () => {
      navigation.setOptions({ tabBarStyle: undefined });
    };
  }, [cameraMode, previewUri, navigation]);

  // Auth
  useEffect(() => {
    void checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Handle action parameter from capture action sheet
  useEffect(() => {
    if (!params.action || !user || !draft.isReady) return;

    const action = params.action;
    // Clear the action param to prevent re-triggering
    router.setParams({ action: undefined });

    // Map action to intent
    if (action === 'snap') {
      void handleIntent('snap');
    } else if (action === 'describe') {
      void handleIntent('describe');
    } else if (action === 'log') {
      void handleIntent('search');
    } else if (action === 'recipe') {
      void handleIntent('extract_recipe');
    }
  }, [params.action, user, draft.isReady, handleIntent, router]);

  const checkUser = async (): Promise<void> => {
    setAuthLoading(true);
    try {
      const { user: currentUser } = await getCurrentUser();
      setUser(currentUser ?? null);
    } finally {
      setAuthLoading(false);
    }
  };

  // Intent handlers from Quad
  const handleIntent = useCallback(
    async (intent: CaptureIntent): Promise<void> => {
      if (intent === 'snap') {
        if (!permission?.granted) {
          const result = await requestPermission();
          if (!result.granted) {
            Alert.alert('Camera Permission', 'We need camera permissions to take photos.');
            return;
          }
        }
        setCameraMode('meal');
      } else if (intent === 'describe') {
        setDescribeOpen(true);
      } else if (intent === 'search') {
        setSearchOpen(true);
      } else if (intent === 'extract_recipe') {
        if (!permission?.granted) {
          const result = await requestPermission();
          if (!result.granted) {
            Alert.alert('Camera Permission', 'We need camera permissions to capture recipes.');
            return;
          }
        }
        setCameraMode('recipe');
      }
    },
    [permission, requestPermission]
  );

  // Camera handlers
  const handleMealPhotoCaptured = useCallback(
    async (uri: string): Promise<void> => {
      setCameraMode(null);
      
      try {
        // Resize image to ensure it's within a reasonable size for the AI service
        // 1200px is plenty for AI vision and keeps file size < 1MB
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        await draft.addPhotoFromUri(manipulated.uri);
      } catch (e) {
        console.error('❌ Failed to resize captured image:', e);
        // Fallback to original if resize fails
        await draft.addPhotoFromUri(uri);
      }
    },
    [draft]
  );

  const handleCameraCancel = useCallback((): void => {
    setCameraMode(null);
  }, []);

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
      
      // Update preview state FIRST, then close camera mode
      // This ensures screenState useMemo sees the previewUri before cameraMode is cleared
      setPreviewUri({ uri, mode: currentMode as 'meal' | 'recipe' });
      setCameraMode(null);
    }
  }, [cameraMode, draft, handleRecipePhotoCaptured]);

  // Describe handlers
  const handleDescribeSubmit = useCallback(
    async (text: string): Promise<void> => {
      await draft.addTextItem(text);
      setDescribeOpen(false);
    },
    [draft]
  );

  const handleDescribeCancel = useCallback((): void => {
    setDescribeOpen(false);
  }, []);

  // Search (manual entry) handlers
  const handleFoodItemSelected = useCallback(
    async (item: DatabaseFoodItem, quantity: number): Promise<void> => {
      await draft.addVerifiedItem(item, quantity);
      setSearchOpen(false);
    },
    [draft]
  );

  const handleSearchCancel = useCallback((): void => {
    setSearchOpen(false);
  }, []);

  // Quick Log - saves database food directly without AI analysis
  const handleQuickLog = useCallback(
    async (item: DatabaseFoodItem, servingMultiplier: number, customServingGrams?: number): Promise<void> => {
      if (!user) {
        Alert.alert('Error', 'You must be signed in to log food');
        return;
      }

      try {
        // Map DatabaseFoodItem to DatabaseFoodMealData format
        const foodData: DatabaseFoodMealData = {
          id: item.id,
          name: item.name,
          brand: item.brand,
          source: item.source,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber,
          sodium: item.sodium,
          ingredients: item.ingredients,
          servingSize: item.servingSize,
          servingUnit: item.servingUnit,
          servingText: item.servingText,
          barcode: item.barcode,
          imageUrl: item.imageUrl,
        };

        const { data, error } = await saveDatabaseMeal(
          user.id,
          foodData,
          servingMultiplier,
          customServingGrams
        );

        if (error) throw error;

        // Close the search modal
        setSearchOpen(false);

        // Navigate to the meal detail page or journal
        if (data?.id) {
          router.push(`/meal/${data.id}`);
        } else {
          router.push('/(tabs)/journal');
        }
      } catch (error) {
        console.error('❌ Quick log failed:', error);
        const message = error instanceof Error ? error.message : 'Failed to log food';
        Alert.alert('Error', message);
      }
    },
    [user, router]
  );

  // Quick add from staging
  const handleQuickSnap = useCallback(async (): Promise<void> => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setCameraMode('meal');
  }, [permission, requestPermission]);

  const handleQuickUpload = useCallback(async (): Promise<void> => {
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
      setPreviewUri({ uri: result.assets[0].uri, mode: 'meal' });
    }
  }, [draft]);

  const handleQuickDescribe = useCallback((): void => {
    setDescribeOpen(true);
  }, []);

  // Discard session
  const handleDiscardSession = useCallback(async (): Promise<void> => {
    Alert.alert('Discard meal?', 'All photos and items will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await draft.discardSession();
        },
      },
    ]);
  }, [draft]);

  // Analyze meal
  const handleAnalyze = useCallback(async (): Promise<void> => {
    if (!user || draft.items.length === 0) return;

    // Check scan limit for free users
    const scanAccess = canScan();
    if (!scanAccess.allowed) {
      // Show paywall when limit is reached
      const success = await showPaywall();
      if (!success) {
        setPaywallVisible(true);
      }
      return;
    }

    setAnalysisStatus('analyzing');

    try {
      const inputs: AnalyzeMealMultiItemInput[] = [];
      let orderIndex = 0;

      for (const item of draft.items) {
        if (item.itemType === 'photo') {
          // Log photo size for debugging
          try {
            const fileInfo = await FileSystem.getInfoAsync(item.localUri);
            if (fileInfo.exists) {
              console.log(`📸 Photo ${orderIndex + 1} size: ${(fileInfo.size / 1024 / 1024).toFixed(2)} MB`);
            }
          } catch (e) {
            console.warn('Could not check file size:', e);
          }

          const fileName = `meal_${Date.now()}_${orderIndex}.jpg`;
          const { data: uploadData, error: uploadError } = await uploadMealImage(item.localUri, fileName, user.id);
          if (uploadError || !uploadData?.publicUrl) {
            throw new Error(`Failed to upload photo ${orderIndex + 1}`);
          }
          inputs.push({
            itemType: 'photo',
            imageUrl: uploadData.publicUrl,
            quantity: item.quantity,
            orderIndex,
            isHero: item.isHero,
          });
        } else if (item.itemType === 'text') {
          inputs.push({
            itemType: 'text',
            text: item.text,
            quantity: item.quantity,
            orderIndex,
            isHero: false,
          });
        } else if (item.itemType === 'verified') {
          inputs.push({
            itemType: 'verified',
            verifiedNutrition: {
              name: item.foodItem.name,
              calories: item.foodItem.calories,
              protein: item.foodItem.protein,
              carbs: item.foodItem.carbs,
              fat: item.foodItem.fat,
              fiber: item.foodItem.fiber,
              sodium: item.foodItem.sodium,
              ingredients: item.foodItem.ingredients,
            },
            quantity: item.quantity,
            orderIndex,
            isHero: false,
          });
        }
        orderIndex += 1;
      }

      const payload: AnalyzeMealMultiRequest = {
        userId: user.id,
        contextText: draft.contextText.trim() || undefined,
        items: inputs,
        isPro,
      };

      const { data, error } = await analyzeMealMulti(payload);
      if (error) throw error;

      const mealId = (data as { meal_id?: string } | null)?.meal_id;

      // Increment scan count for free users
      await incrementScan();

      // Show success state briefly before navigating
      setAnalysisStatus('success');
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await draft.discardSession();

      if (mealId) {
        router.push(`/meal/${mealId}`);
      } else {
        router.push('/(tabs)/journal');
      }
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to analyze meal';
      const isEdgeFunctionError = message.includes('Edge Function');
      
      Alert.alert(
        'Error', 
        isEdgeFunctionError 
          ? 'The AI analysis service is having trouble. This usually happens if the photo is too large or if there is a temporary server issue. Try again with a different photo or check your connection.'
          : message
      );
    } finally {
      setAnalysisStatus('idle');
    }
  }, [draft, router, user, canScan, showPaywall, incrementScan]);

  // Extract Recipe flow
  const handleRecipePhotoCaptured = useCallback(
    async (uri: string): Promise<void> => {
      setCameraMode(null);
      
      let finalUri = uri;
      try {
        // Resize image to ensure it's within a reasonable size for the AI service
        const manipulated = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalUri = manipulated.uri;
      } catch (e) {
        console.error('❌ Failed to resize recipe image:', e);
      }

      setRecipePhotoUri(finalUri);
      setIsProcessingRecipe(true);

      try {
        if (!user) throw new Error('Not signed in');

        // Upload the photo
        const fileName = `recipe_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await uploadMealImage(finalUri, fileName, user.id);
        if (uploadError || !uploadData?.publicUrl) {
          throw new Error('Failed to upload recipe image');
        }

        // Analyze as recipe
        const { data, error } = await analyzeRecipeFromImage(uploadData.publicUrl, user.id);
        if (error) throw error;

        const recipeId = (data as { recipe_id?: string } | null)?.recipe_id;
        setRecipePhotoUri(null);

        if (recipeId) {
          router.push(`/recipe/${recipeId}`);
        } else {
          router.push('/(tabs)/recipes');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to analyze recipe';
        Alert.alert('Error', message);
        setRecipePhotoUri(null);
      } finally {
        setIsProcessingRecipe(false);
      }
    },
    [router, user]
  );

  // Hero photo
  const heroPhotoLocalId = useMemo<string | null>(() => {
    const hero = draft.items.find((i) => i.itemType === 'photo' && i.isHero);
    return hero?.localId ?? null;
  }, [draft.items]);

  // Render based on screen state
  if (screenState.type === 'loading_auth' || screenState.type === 'loading_draft') {
    return (
      <PageContainer>
        <ContentContainer scrollable={false}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={primaryGreen} />
            <Text style={[TextStyles.body, { color: colors.icon, marginTop: Spacing.base }]}>Loading…</Text>
          </View>
        </ContentContainer>
      </PageContainer>
    );
  }

  if (screenState.type === 'signed_out') {
    return (
      <PageContainer>
        <ContentContainer scrollable={false}>
          <View style={styles.centered}>
            <IconSymbol name="person.circle.fill" size={64} color={colors.icon} />
            <Text style={[TextStyles.h2, { color: colors.text, textAlign: 'center', marginTop: Spacing.xl }]}>
              Please sign in
            </Text>
            <Text
              style={[
                TextStyles.body,
                { color: colors.icon, textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing['2xl'], paddingHorizontal: PageSpacing.containerPadding },
              ]}
            >
              You need to be signed in to capture meals
            </Text>
            <Button variant="primary" onPress={() => router.push('/(tabs)/auth')} fullWidth>
              Go to Sign In
            </Button>
          </View>
        </ContentContainer>
      </PageContainer>
    );
  }

  if (screenState.type === 'camera_meal') {
    return <CaptureCameraOverlay onCancel={handleCameraCancel} onCaptured={handleMealPhotoCaptured} onPickImage={handlePickImage} />;
  }

  if (screenState.type === 'camera_recipe') {
    return <CaptureCameraOverlay onCancel={handleCameraCancel} onCaptured={handleRecipePhotoCaptured} onPickImage={handlePickImage} />;
  }

  if (screenState.type === 'recipe_processing') {
    return (
      <PageContainer>
        <ContentContainer scrollable={false}>
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={neonGreen} />
            <Text style={[TextStyles.h3, { color: colors.text, marginTop: Spacing.lg, textAlign: 'center' }]}>
              Extracting recipe…
            </Text>
            <Text style={[TextStyles.body, { color: colors.icon, marginTop: Spacing.md, textAlign: 'center' }]}>
              The AI is reading the dish and writing a full recipe
            </Text>
          </View>
        </ContentContainer>
      </PageContainer>
    );
  }

  if (screenState.type === 'describe_meal') {
    return (
      <DescribeInputSheet
        userId={user?.id ?? ''}
        title="Describe Meal"
        subtitle="Type or speak what you ate"
        placeholder="E.g., two scrambled eggs with toast"
        onCancel={handleDescribeCancel}
        onSubmit={handleDescribeSubmit}
      />
    );
  }

  if (screenState.type === 'search_entry') {
    return (
      <FoodSearchModal 
        onCancel={handleSearchCancel} 
        onSelectItem={handleFoodItemSelected}
        onQuickLog={handleQuickLog}
      />
    );
  }

  if (screenState.type === 'image_preview') {
    return (
      <CaptureImagePreview
        uri={screenState.uri}
        onCancel={() => setPreviewUri(null)}
        onConfirm={async () => {
          const { uri, mode } = screenState;
          setPreviewUri(null);

          try {
            // Resize image to ensure it's within a reasonable size for the AI service
            // This replaces the compression/resizing previously handled by the native square cropper
            const manipulated = await ImageManipulator.manipulateAsync(
              uri,
              [{ resize: { width: 1200 } }], // 1200px is plenty for AI vision and keeps file size < 1MB
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const finalUri = manipulated.uri;

            if (mode === 'meal') {
              await draft.addPhotoFromUri(finalUri);
            } else if (mode === 'recipe') {
              await handleRecipePhotoCaptured(finalUri);
            }
          } catch (e) {
            console.error('❌ Failed to resize image:', e);
            // Fallback to original if resize fails
            if (mode === 'meal') {
              await draft.addPhotoFromUri(uri);
            } else if (mode === 'recipe') {
              await handleRecipePhotoCaptured(uri);
            }
          }
        }}
      />
    );
  }

  if (screenState.type === 'staging') {
    return (
      <PageContainer>
        <MealStagingScreen
          items={draft.items}
          contextText={draft.contextText}
          analysisStatus={analysisStatus}
          heroPhotoLocalId={heroPhotoLocalId}
          photoCount={draft.photoCount}
          onDiscardSession={handleDiscardSession}
          onQuickSnap={handleQuickSnap}
          onQuickUpload={handleQuickUpload}
          onQuickDescribe={handleQuickDescribe}
          onRemoveItem={draft.removeItem}
          onSetHero={draft.setHero}
          onUpdateQuantity={draft.updateQuantity}
          onSaveContext={draft.setContextText}
          onAnalyze={handleAnalyze}
        />
      </PageContainer>
    );
  }

  // Quad (default)
  return (
    <PageContainer>
      <PageHeader 
        title="Capture" 
        rightAction={
          <ScanCounter
            scansRemaining={scanLimitState.scansRemaining}
            scansAllowed={scanLimitState.scansAllowed}
            isPro={isPro}
            onPress={() => setPaywallVisible(true)}
          />
        }
      />
      <CaptureQuad
        onSnap={() => handleIntent('snap')}
        onDescribe={() => handleIntent('describe')}
        onSearch={() => handleIntent('search')}
        onExtractRecipe={() => handleIntent('extract_recipe')}
      />
      
      {/* Paywall Modal */}
      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature="scans"
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: PageSpacing.containerPadding,
  },
});
