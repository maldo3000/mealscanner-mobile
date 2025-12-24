import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import { useCameraPermissions } from 'expo-camera';
import { useNavigation, useRouter } from 'expo-router';

import { PageContainer } from '@/components/layout/PageContainer';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/Button';
import { CaptureCameraOverlay } from '@/components/capture/CaptureCameraOverlay';
import { CaptureQuad } from '@/components/capture/CaptureQuad';
import { DescribeInputSheet } from '@/components/capture/DescribeInputSheet';
import { MealStagingScreen } from '@/components/capture/MealStagingScreen';
import { useMealCaptureDraft } from '@/hooks/useMealCaptureDraft';
import { Colors, primaryGreen, neonGreen } from '@/constants/Colors';
import { Spacing, PageSpacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  analyzeMealMulti,
  analyzeRecipeFromImage,
  getCurrentUser,
  supabase,
  uploadMealImage,
} from '@/lib/supabase';
import type { AnalyzeMealMultiItemInput, AnalyzeMealMultiRequest } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { CaptureIntent } from '@/components/capture/types';

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
  | { type: 'recipe_processing'; photoUri: string };

export default function LogScreen(): React.ReactElement {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const navigation = useNavigation();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isProcessingRecipe, setIsProcessingRecipe] = useState<boolean>(false);

  const [permission, requestPermission] = useCameraPermissions();

  const draft = useMealCaptureDraft();

  // Determine which screen to show
  const [pendingIntent, setPendingIntent] = useState<CaptureIntent | null>(null);
  const [cameraMode, setCameraMode] = useState<'meal' | 'recipe' | null>(null);
  const [describeOpen, setDescribeOpen] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [recipePhotoUri, setRecipePhotoUri] = useState<string | null>(null);

  const screenState = useMemo<ScreenState>(() => {
    if (authLoading) return { type: 'loading_auth' };
    if (!user) return { type: 'signed_out' };
    if (!draft.isReady) return { type: 'loading_draft' };
    if (recipePhotoUri && isProcessingRecipe) return { type: 'recipe_processing', photoUri: recipePhotoUri };
    if (cameraMode === 'meal') return { type: 'camera_meal' };
    if (cameraMode === 'recipe') return { type: 'camera_recipe' };
    if (describeOpen) return { type: 'describe_meal' };
    if (searchOpen) return { type: 'search_entry' };
    if (draft.items.length > 0) return { type: 'staging' };
    return { type: 'quad' };
  }, [authLoading, cameraMode, describeOpen, draft.isReady, draft.items.length, isProcessingRecipe, recipePhotoUri, searchOpen, user]);

  // Hide tab bar when camera is open
  useEffect(() => {
    const hideTabBar = cameraMode !== null;
    navigation.setOptions({
      tabBarStyle: hideTabBar ? { display: 'none', height: 0, opacity: 0, pointerEvents: 'none' } : undefined,
    });
    return () => {
      navigation.setOptions({ tabBarStyle: undefined });
    };
  }, [cameraMode, navigation]);

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
      await draft.addPhotoFromUri(uri);
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
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const uri = result.assets[0].uri;
      const currentMode = cameraMode;
      // Close camera/mode first so we can process
      setCameraMode(null);

      if (currentMode === 'meal') {
        await draft.addPhotoFromUri(uri);
      } else if (currentMode === 'recipe') {
        // reuse the recipe processing logic
        await handleRecipePhotoCaptured(uri);
      }
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
  const handleSearchSubmit = useCallback(
    async (text: string): Promise<void> => {
      await draft.addTextItem(text);
      setSearchOpen(false);
    },
    [draft]
  );

  const handleSearchCancel = useCallback((): void => {
    setSearchOpen(false);
  }, []);

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
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      await draft.addPhotoFromUri(result.assets[0].uri);
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
    setIsAnalyzing(true);

    try {
      const inputs: AnalyzeMealMultiItemInput[] = [];
      let orderIndex = 0;

      for (const item of draft.items) {
        if (item.itemType === 'photo') {
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
        } else {
          inputs.push({
            itemType: 'text',
            text: item.text,
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
      };

      const { data, error } = await analyzeMealMulti(payload);
      if (error) throw error;

      const mealId = (data as { meal_id?: string } | null)?.meal_id;
      await draft.discardSession();

      if (mealId) {
        router.push(`/meal/${mealId}`);
      } else {
        router.push('/(tabs)/journal');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze meal';
      Alert.alert('Error', message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [draft, router, user]);

  // Extract Recipe flow
  const handleRecipePhotoCaptured = useCallback(
    async (uri: string): Promise<void> => {
      setCameraMode(null);
      setRecipePhotoUri(uri);
      setIsProcessingRecipe(true);

      try {
        if (!user) throw new Error('Not signed in');

        // Upload the photo
        const fileName = `recipe_${Date.now()}.jpg`;
        const { data: uploadData, error: uploadError } = await uploadMealImage(uri, fileName, user.id);
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
      <DescribeInputSheet
        userId={user?.id ?? ''}
        title="Search Database"
        subtitle="Enter specific brands or measurements"
        placeholder="E.g., 1 cup Chobani Greek Yogurt, 2 oz almonds"
        onCancel={handleSearchCancel}
        onSubmit={handleSearchSubmit}
      />
    );
  }

  if (screenState.type === 'staging') {
    return (
      <PageContainer>
        <MealStagingScreen
          items={draft.items}
          contextText={draft.contextText}
          isAnalyzing={isAnalyzing}
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
      <CaptureQuad
        onSnap={() => handleIntent('snap')}
        onDescribe={() => handleIntent('describe')}
        onSearch={() => handleIntent('search')}
        onExtractRecipe={() => handleIntent('extract_recipe')}
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
