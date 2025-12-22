import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurView } from 'expo-blur';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { Colors, glassBorder, glassSurface, neonGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  analyzeMealMulti,
  getCurrentUser,
  supabase,
  transcribeAudio,
  transcribeAudioDirect,
  uploadAudioFile,
  uploadMealImage,
} from '@/lib/supabase';
import type { AnalyzeMealMultiItemInput, AnalyzeMealMultiRequest } from '@/lib/supabase';

import type { User } from '@supabase/supabase-js';

type CaptureMode = 'photo' | 'text';

interface DraftMealItemBase {
  localId: string;
  quantity: number;
  isHero: boolean;
}

interface DraftPhotoItem extends DraftMealItemBase {
  itemType: 'photo';
  localUri: string;
}

interface DraftTextItem extends DraftMealItemBase {
  itemType: 'text';
  text: string;
}

type DraftMealItem = DraftPhotoItem | DraftTextItem;

const MAX_PHOTOS = 4 as const;

function createLocalId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
}

export default function LogScreen(): React.ReactElement {
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  const [items, setItems] = useState<DraftMealItem[]>([]);
  const [newTextItem, setNewTextItem] = useState<string>('');
  const [contextText, setContextText] = useState<string>('');

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [showContextModal, setShowContextModal] = useState<boolean>(false);
  const [tempContextText, setTempContextText] = useState<string>('');
  const [pendingPostTranscriptionAction, setPendingPostTranscriptionAction] = useState<(() => Promise<void>) | null>(
    null
  );

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onRecordingComplete: async (uri: string) => {
      await handleAudioTranscription(uri);
    },
    onError: (error: Error) => {
      Alert.alert('Recording Error', error.message);
      setIsTranscribing(false);
    },
  });

  // Animated value for recording pulse effect
  const recordingPulseAnim = useRef(new Animated.Value(0)).current;
  const recordingGlowAnim = useRef(new Animated.Value(0)).current;

  // Start/stop recording pulse animation
  useEffect(() => {
    if (isRecording) {
      // Create pulsing animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(recordingPulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          }),
        ])
      );
      
      // Glow in animation
      Animated.timing(recordingGlowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start();
      
      pulseAnimation.start();
      
      return () => {
        pulseAnimation.stop();
      };
    } else {
      // Glow out animation
      Animated.timing(recordingGlowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
      recordingPulseAnim.setValue(0);
    }
  }, [isRecording, recordingPulseAnim, recordingGlowAnim]);

  const photoCount = useMemo<number>(() => items.filter((i) => i.itemType === 'photo').length, [items]);
  const heroPhotoLocalId = useMemo<string | null>(() => {
    const hero = items.find((i) => i.itemType === 'photo' && i.isHero);
    return hero?.localId ?? null;
  }, [items]);

  useEffect(() => {
    const shouldHideTabBar = showCamera;
    navigation.setOptions({
      tabBarStyle: shouldHideTabBar ? { display: 'none', height: 0, opacity: 0, pointerEvents: 'none' } : undefined,
    });
    return () => {
      navigation.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation, showCamera]);

  useEffect(() => {
    void checkUser();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) {
        setItems([]);
        setContextText('');
        setNewTextItem('');
      }
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

  const ensureHeroIfNeeded = useCallback(
    (draft: DraftMealItem[]): DraftMealItem[] => {
      const hasHero = draft.some((i) => i.itemType === 'photo' && i.isHero);
      if (hasHero) return draft;
      const firstPhotoIndex = draft.findIndex((i) => i.itemType === 'photo');
      if (firstPhotoIndex < 0) return draft;
      return draft.map((i, idx) => (idx === firstPhotoIndex ? { ...i, isHero: true } : i));
    },
    []
  );

  const addPhotoItem = useCallback(
    (localUri: string): void => {
      setItems((prev) => {
        const currentPhotos = prev.filter((i) => i.itemType === 'photo').length;
        if (currentPhotos >= MAX_PHOTOS) {
          Alert.alert('Photo limit reached', `You can add up to ${MAX_PHOTOS} photos per meal.`);
          return prev;
        }
        const next: DraftMealItem[] = [
          ...prev,
          { localId: createLocalId('photo'), itemType: 'photo', localUri, quantity: 1, isHero: false },
        ];
        return ensureHeroIfNeeded(next);
      });
    },
    [ensureHeroIfNeeded]
  );

  const addTextItem = useCallback((): void => {
    const text = newTextItem.trim();
    if (!text) return;
    setItems((prev) => [...prev, { localId: createLocalId('text'), itemType: 'text', text, quantity: 1, isHero: false }]);
    setNewTextItem('');
  }, [newTextItem]);

  const removeItem = useCallback(
    (localId: string): void => {
      setItems((prev) => ensureHeroIfNeeded(prev.filter((i) => i.localId !== localId)));
    },
    [ensureHeroIfNeeded]
  );

  const setHero = useCallback((localId: string): void => {
    setItems((prev) =>
      prev.map((i) => (i.itemType === 'photo' ? { ...i, isHero: i.localId === localId } : i))
    );
  }, []);

  const updateQuantity = useCallback((localId: string, nextQuantity: number): void => {
    const q = clampQuantity(nextQuantity);
    setItems((prev) => prev.map((i) => (i.localId === localId ? { ...i, quantity: q } : i)));
  }, []);

  const openCamera = useCallback((): void => {
    setShowCamera(true);
  }, []);

  const closeCamera = useCallback((): void => {
    setShowCamera(false);
  }, []);

  const toggleCameraFacing = useCallback((): void => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const takePicture = useCallback(async (): Promise<void> => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (photo?.uri) {
        addPhotoItem(photo.uri);
        setShowCamera(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture');
      // eslint-disable-next-line no-console
      console.error('Camera error:', error);
    }
  }, [addPhotoItem]);

  const pickImageFromGallery = useCallback(async (): Promise<void> => {
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

    if (!result.canceled && result.assets && result.assets[0]?.uri) {
      addPhotoItem(result.assets[0].uri);
    }
  }, [addPhotoItem]);

  const handleAddContext = useCallback((): void => {
    setTempContextText(contextText);
    setShowContextModal(true);
  }, [contextText]);

  const handleSaveContext = useCallback(async (): Promise<void> => {
    if (isRecording) {
      setPendingPostTranscriptionAction(async () => {
        setContextText(tempContextText);
        setShowContextModal(false);
      });
      await stopRecording();
      return;
    }
    setContextText(tempContextText);
    setShowContextModal(false);
  }, [isRecording, stopRecording, tempContextText]);

  const handleCancelContext = useCallback((): void => {
    setTempContextText('');
    setShowContextModal(false);
  }, []);

  const handleVoiceInputForTextItem = useCallback(async (): Promise<void> => {
    if (isRecording) {
      setPendingPostTranscriptionAction(null);
      await stopRecording();
      return;
    }
    try {
      await startRecording();
    } catch {
      Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleVoiceInputForContext = useCallback(async (): Promise<void> => {
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

  const handleAudioTranscription = async (audioUri: string): Promise<void> => {
    if (!user || !audioUri) return;

    setIsTranscribing(true);
    try {
      const { data: transcriptionData, error: transcriptionError } = await transcribeAudioDirect(audioUri, user.id);

      let transcript: string | null = null;
      if (!transcriptionError && transcriptionData?.transcript) {
        transcript = transcriptionData.transcript.trim();
      } else {
        const fileName = `recording_${Date.now()}.m4a`;
        const { data: uploadData, error: uploadError } = await uploadAudioFile(audioUri, fileName, user.id);
        if (uploadError || !uploadData?.publicUrl) {
          throw transcriptionError ?? uploadError ?? new Error('Transcription failed');
        }
        const { data: storageTranscriptionData, error: storageTranscriptionError } = await transcribeAudio(
          uploadData.publicUrl,
          user.id
        );
        if (storageTranscriptionError || !storageTranscriptionData?.transcript) {
          throw storageTranscriptionError ?? new Error('Transcription failed');
        }
        transcript = storageTranscriptionData.transcript.trim();
      }

      if (transcript) {
        if (showContextModal) {
          setTempContextText((prev) => (prev ? prev + ' ' + transcript : transcript));
        } else {
          setNewTextItem((prev) => (prev ? prev + ' ' + transcript : transcript));
        }
      }

      if (pendingPostTranscriptionAction) {
        const action = pendingPostTranscriptionAction;
        setPendingPostTranscriptionAction(null);
        await action();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to transcribe audio';
      Alert.alert('Transcription Error', message);
      setPendingPostTranscriptionAction(null);
    } finally {
      setIsTranscribing(false);
    }
  };

  const buildAnalyzePayload = useCallback(
    async (currentItems: DraftMealItem[]): Promise<AnalyzeMealMultiRequest> => {
      if (!user) {
        throw new Error('Not signed in');
      }

      const inputs: AnalyzeMealMultiItemInput[] = [];
      let orderIndex = 0;

      for (const item of currentItems) {
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

      return {
        userId: user.id,
        contextText: contextText.trim() ? contextText.trim() : undefined,
        items: inputs,
      };
    },
    [contextText, user, uploadMealImage]
  );

  const handleAnalyze = useCallback(async (): Promise<void> => {
    if (!user) return;
    if (items.length === 0) {
      Alert.alert('Add items', 'Add at least one photo or text item before analyzing.');
      return;
    }

    if (isRecording) {
      setPendingPostTranscriptionAction(async () => {
        await handleAnalyze();
      });
      await stopRecording();
      return;
    }

    setIsAnalyzing(true);
    try {
      const payload = await buildAnalyzePayload(items);
      const { data, error } = await analyzeMealMulti(payload);
      if (error) throw error;

      const mealId = (data as { meal_id?: string } | null)?.meal_id;
      setItems([]);
      setContextText('');
      setNewTextItem('');
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
  }, [buildAnalyzePayload, isRecording, items, router, stopRecording, user]);

  if (!permission) {
    return (
      <PageContainer>
        <Text style={[TextStyles.body, { color: colors.text }]}>Loading camera...</Text>
      </PageContainer>
    );
  }

  if (!permission.granted && captureMode === 'photo') {
    return (
      <PageContainer>
        <ContentContainer scrollable={false}>
          <Text style={[TextStyles.body, { color: colors.text, textAlign: 'center', paddingBottom: Spacing.lg }]}>
            We need your permission to show the camera
          </Text>
          <Button variant="primary" onPress={requestPermission} fullWidth>
            Grant Camera Permission
          </Button>
        </ContentContainer>
      </PageContainer>
    );
  }

  if (authLoading) {
    return (
      <PageContainer>
        <ContentContainer scrollable={false}>
          <View style={styles.loadingSkeleton}>
            <View style={[styles.skeletonBlock, { backgroundColor: colors.border, opacity: 0.3 }]} />
          </View>
        </ContentContainer>
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer>
        <ContentContainer scrollable={false}>
          <View style={styles.signInContainer}>
            <IconSymbol name="person.circle.fill" size={64} color={colors.icon} />
            <Text style={[TextStyles.h2, { color: colors.text, textAlign: 'center', marginTop: Spacing.xl }]}>
              Please sign in
            </Text>
            <Text
              style={[
                TextStyles.body,
                {
                  color: colors.icon,
                  textAlign: 'center',
                  marginTop: Spacing.md,
                  marginBottom: Spacing['2xl'],
                  paddingHorizontal: PageSpacing.containerPadding,
                },
              ]}
            >
              You need to be signed in to capture meals
            </Text>
            <Button variant="primary" onPress={() => router.push('/(tabs)/auth')} fullWidth>
              <IconSymbol name="person" size={20} color="white" />
              Go to Sign In
            </Button>
          </View>
        </ContentContainer>
      </PageContainer>
    );
  }

  if (showCamera) {
    return (
      <SafeAreaView style={styles.cameraContainer}>
        <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
          <View style={styles.cameraOverlay}>
            <View style={styles.topControls}>
              <TouchableOpacity style={styles.exitButton} onPress={closeCamera}>
                <IconSymbol name="xmark" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing}>
                <IconSymbol name="arrow.triangle.2.circlepath.camera" size={20} color="white" />
                <Text style={styles.controlText}>Flip</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.centerGuide}>
              <View style={styles.focusSquare} />
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Capture Meal"
        subtitle="Add multiple photos and text items for a complete meal analysis"
      />

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: glassSurface, borderColor: glassBorder, borderWidth: 1 }]}>
        <TouchableOpacity
          style={[
            styles.tab,
            captureMode === 'photo' && { backgroundColor: neonGreen },
            captureMode !== 'photo' && { backgroundColor: 'transparent' },
          ]}
          onPress={() => setCaptureMode('photo')}
        >
          <Text
            style={[
              TextStyles.button,
              styles.tabText,
              captureMode === 'photo' ? { color: '#000000' } : { color: colors.icon },
            ]}
          >
            Photo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            captureMode === 'text' && { backgroundColor: neonGreen },
            captureMode !== 'text' && { backgroundColor: 'transparent' },
          ]}
          onPress={() => setCaptureMode('text')}
        >
          <Text
            style={[
              TextStyles.button,
              styles.tabText,
              captureMode === 'text' ? { color: '#000000' } : { color: colors.icon },
            ]}
          >
            Text
          </Text>
        </TouchableOpacity>
      </View>

      <ContentContainer keyboardAvoiding={true}>
        {/* Items list */}
        {items.length > 0 && (
          <View style={styles.itemsSection}>
            <View style={styles.itemsHeaderRow}>
              <Text style={[TextStyles.h4, { color: colors.text }]}>Meal items</Text>
              <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                {photoCount}/{MAX_PHOTOS} photos
              </Text>
            </View>
            <FlatList
              data={items}
              keyExtractor={(item) => item.localId}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <MealItemRow
                  item={item}
                  isHero={item.itemType === 'photo' && item.localId === heroPhotoLocalId}
                  onRemove={() => removeItem(item.localId)}
                  onSetHero={() => setHero(item.localId)}
                  onDecrement={() => updateQuantity(item.localId, item.quantity - 1)}
                  onIncrement={() => updateQuantity(item.localId, item.quantity + 1)}
                />
              )}
            />
          </View>
        )}

        {/* Add controls */}
        {captureMode === 'photo' ? (
          <View style={styles.addArea}>
            <Text style={[TextStyles.h3, { color: colors.text, textAlign: 'center' }]}>Add photos</Text>
            <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', marginTop: Spacing.sm }]}>
              Add up to {MAX_PHOTOS} photos. Pick one hero photo for the journal thumbnail.
            </Text>
            <View style={styles.buttonRow}>
              <Button
                variant="primary"
                onPress={openCamera}
                style={styles.primaryButton}
                icon={<IconSymbol name="camera" size={18} color="#000000" />}
                disabled={photoCount >= MAX_PHOTOS}
              >
                Take photo
              </Button>
              <Button
                variant="primary"
                onPress={pickImageFromGallery}
                style={styles.primaryButton}
                icon={<IconSymbol name="square.and.arrow.up" size={18} color="#000000" />}
                disabled={photoCount >= MAX_PHOTOS}
              >
                Upload
              </Button>
            </View>
          </View>
        ) : (
          <View style={styles.addArea}>
            <Text style={[TextStyles.h3, { color: colors.text, marginBottom: Spacing.base }]}>Add text items</Text>
            <Animated.View
              style={[
                styles.textInputContainer,
                isRecording && !showContextModal && {
                  borderColor: neonGreen,
                  borderWidth: 2,
                  shadowColor: neonGreen,
                  shadowOpacity: recordingPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.7],
                  }),
                  shadowRadius: recordingPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [5, 15],
                  }),
                },
              ]}
            >
              {/* Recording indicator for text input */}
              {isRecording && !showContextModal && (
                <Animated.View
                  style={[
                    styles.textInputRecordingIndicator,
                    {
                      opacity: recordingPulseAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.7, 1],
                      }),
                    },
                  ]}
                >
                  <View style={styles.textInputRecordingDot} />
                  <Text style={styles.textInputRecordingText}>Listening...</Text>
                </Animated.View>
              )}
              <Input
                placeholder="E.g., 2 eggs and toast"
                value={newTextItem}
                onChangeText={setNewTextItem}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                rightIcon={
                  <TouchableOpacity onPress={handleVoiceInputForTextItem} disabled={isTranscribing} activeOpacity={0.7}>
                    <Animated.View
                      style={[
                        styles.voiceIconContainer,
                        isRecording && !showContextModal && {
                          transform: [
                            {
                              scale: recordingPulseAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.15],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <IconSymbol
                        name={isRecording ? 'stop.fill' : isTranscribing ? 'hourglass' : 'mic'}
                        size={26}
                        color={isRecording && !showContextModal ? '#EF4444' : neonGreen}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                }
                containerStyle={{ marginBottom: Spacing.md }}
              />
            </Animated.View>
            <Button variant="primary" onPress={addTextItem} disabled={!newTextItem.trim()} fullWidth>
              <IconSymbol name="plus" size={18} color="#000000" />
              Add item
            </Button>
          </View>
        )}

        {/* Context + Analyze */}
        <View style={styles.footerArea}>
          <TouchableOpacity
            style={[styles.addContextButton, isAnalyzing && styles.addContextButtonDisabled]}
            onPress={handleAddContext}
            disabled={isAnalyzing}
            activeOpacity={0.8}
          >
            <View style={styles.addContextButtonContent}>
              <IconSymbol name="plus.circle" size={18} color="white" />
              <Text style={styles.addContextButtonText}>{contextText ? 'Edit context' : 'Add context'}</Text>
            </View>
          </TouchableOpacity>

          <Button
            variant="primary"
            onPress={handleAnalyze}
            disabled={items.length === 0 || isAnalyzing}
            fullWidth
            icon={isAnalyzing ? <ActivityIndicator size="small" color="#000000" /> : <IconSymbol name="brain.head.profile" size={18} color="#000000" />}
          >
            {isAnalyzing ? 'Analyzing…' : 'Analyze meal'}
          </Button>
        </View>
      </ContentContainer>

      {/* Context Modal */}
      <Modal visible={showContextModal} transparent animationType="fade" onRequestClose={handleCancelContext}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
            <Animated.View
              style={[
                styles.modalGlowContainer,
                {
                  shadowColor: neonGreen,
                  shadowOpacity: recordingGlowAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.8],
                  }),
                  shadowRadius: recordingPulseAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 25],
                  }),
                },
              ]}
            >
              <BlurView intensity={20} tint="dark" style={styles.modalContent}>
                <Animated.View
                  style={[
                    styles.modalRecordingBorder,
                    {
                      borderColor: isRecording ? neonGreen : glassBorder,
                      borderWidth: isRecording ? 2 : 1,
                      opacity: isRecording
                        ? recordingPulseAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.6, 1],
                          })
                        : 1,
                    },
                  ]}
                />
                
                {/* Recording indicator in modal */}
                {isRecording && (
                  <Animated.View
                    style={[
                      styles.modalRecordingIndicator,
                      {
                        opacity: recordingPulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.7, 1],
                        }),
                      },
                    ]}
                  >
                    <View style={styles.modalRecordingDot} />
                    <Text style={styles.modalRecordingText}>Listening...</Text>
                  </Animated.View>
                )}
                
                <View style={styles.modalHeader}>
                  <Text style={[TextStyles.h3, { color: colors.text }]}>Meal context</Text>
                  <TouchableOpacity onPress={handleCancelContext} style={styles.modalCloseButton} activeOpacity={0.7}>
                    <IconSymbol name="xmark" size={24} color={colors.icon} />
                  </TouchableOpacity>
                </View>

                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.md }]}>
                  Add extra details that apply to the whole meal (portion size, drinks, substitutions, etc).
                </Text>

                <Input
                  placeholder="E.g., homemade, large portions, extra cheese, sugar-free drink…"
                  value={tempContextText}
                  onChangeText={setTempContextText}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  rightIcon={
                    <TouchableOpacity onPress={handleVoiceInputForContext} disabled={isTranscribing} activeOpacity={0.7}>
                      <Animated.View
                        style={[
                          styles.voiceIconContainer,
                          isRecording && {
                            transform: [
                              {
                                scale: recordingPulseAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [1, 1.15],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <IconSymbol
                          name={isRecording ? 'stop.fill' : isTranscribing ? 'hourglass' : 'mic'}
                          size={26}
                          color={isRecording ? '#EF4444' : neonGreen}
                        />
                      </Animated.View>
                    </TouchableOpacity>
                  }
                  containerStyle={{ marginBottom: Spacing.lg }}
                  style={{ minHeight: 150 }}
                />

                <View style={styles.modalActions}>
                  <Button variant="secondary" onPress={handleCancelContext} style={styles.modalCancelButton}>
                    Cancel
                  </Button>
                  <Button variant="primary" onPress={handleSaveContext} style={styles.modalSaveButton}>
                    Save
                  </Button>
                </View>
              </BlurView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Recording Banner */}
      {isRecording && (
        <View style={[styles.recordingBanner, { top: insets.top }]}>
          <View style={styles.recordingBannerContent}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingBannerText}>Recording…</Text>
            <TouchableOpacity
              onPress={async () => {
                await stopRecording();
              }}
              style={styles.recordingStopButton}
            >
              <Text style={styles.recordingStopButtonText}>Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </PageContainer>
  );
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
          <View style={styles.itemMetaRow}>
            {item.itemType === 'photo' && (
              <TouchableOpacity onPress={onSetHero} style={styles.heroButton} activeOpacity={0.8}>
                <IconSymbol name={isHero ? 'star.fill' : 'star'} size={16} color={isHero ? neonGreen : 'white'} />
                <Text style={styles.heroButtonText}>{isHero ? 'Hero' : 'Set hero'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <View style={styles.itemRight}>
        <View style={styles.stepper}>
          <TouchableOpacity onPress={onDecrement} style={styles.stepperButton} activeOpacity={0.8}>
            <IconSymbol name="minus" size={16} color="white" />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{item.quantity}</Text>
          <TouchableOpacity onPress={onIncrement} style={styles.stepperButton} activeOpacity={0.8}>
            <IconSymbol name="plus" size={16} color="white" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton} activeOpacity={0.8}>
          <IconSymbol name="trash" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    marginBottom: PageSpacing.containerPadding,
    borderRadius: 9999,
    padding: Spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabText: {
    textAlign: 'center',
  },

  itemsSection: {
    marginBottom: Spacing.lg,
    paddingHorizontal: PageSpacing.containerPadding,
  },
  itemsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },

  addArea: {
    paddingHorizontal: PageSpacing.containerPadding,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.base,
  },
  buttonRow: {
    width: '100%',
    maxWidth: 360,
    gap: 12,
  },
  primaryButton: {
    flex: 1,
  },

  footerArea: {
    paddingHorizontal: PageSpacing.containerPadding,
    paddingBottom: 80,
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },

  addContextButton: {
    width: '100%',
    backgroundColor: 'rgba(6, 78, 59, 0.8)',
    borderWidth: 1,
    borderColor: neonGreen,
    borderRadius: 9999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContextButtonDisabled: {
    opacity: 0.5,
  },
  addContextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addContextButtonText: {
    ...TextStyles.button,
    color: 'white',
    fontWeight: '600',
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
    gap: 6,
  },
  itemTitle: {
    ...TextStyles.body,
    color: 'white',
    fontWeight: '600',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 9999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    minHeight: 32,
  },
  heroButtonText: {
    ...TextStyles.caption,
    color: 'white',
    fontWeight: '600',
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
    fontWeight: '700',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Camera Styles
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 60,
  },
  exitButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 25,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 25,
    minWidth: 50,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  controlText: {
    color: 'white',
    fontWeight: '600',
  },
  centerGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusSquare: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  bottomControls: {
    paddingBottom: 50,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
  },
  modalGlowContainer: {
    borderRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  modalContent: {
    borderRadius: 24,
    padding: Spacing.xl,
    overflow: 'hidden',
    ...(Platform.OS === 'web' && {
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
    }),
  },
  modalRecordingBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    pointerEvents: 'none',
  },
  modalRecordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 20,
    alignSelf: 'center',
  },
  modalRecordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  modalRecordingText: {
    ...TextStyles.bodySmall,
    color: '#EF4444',
    fontWeight: '600',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.base,
  },
  modalCancelButton: {
    flex: 1,
  },
  modalSaveButton: {
    flex: 1,
  },
  
  // Voice input styles
  voiceIconContainer: {
    padding: 4,
  },
  textInputContainer: {
    borderRadius: 16,
    overflow: 'visible',
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  textInputRecordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 16,
    alignSelf: 'center',
  },
  textInputRecordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  textInputRecordingText: {
    ...TextStyles.caption,
    color: '#EF4444',
    fontWeight: '600',
  },

  recordingBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    zIndex: 1000,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0, 0, 0, 0.2)',
  },
  recordingBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  recordingBannerText: {
    ...TextStyles.button,
    color: 'white',
    fontWeight: '600',
    flex: 1,
  },
  recordingStopButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  recordingStopButtonText: {
    ...TextStyles.bodySmall,
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.base,
    paddingHorizontal: PageSpacing.containerPadding,
  },

  loadingSkeleton: {
    width: '100%',
    padding: PageSpacing.containerPadding,
  },
  skeletonBlock: {
    height: 200,
    borderRadius: 16,
  },
});


