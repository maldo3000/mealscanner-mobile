import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Input } from '@/components/ui/Input';
import { bgPrimary, Colors, glassBorder, glassSurface, neonGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useColorScheme } from '@/hooks/useColorScheme';
import { analyzeImageMeal, analyzeRecipeFromImage, analyzeRecipeFromText, analyzeTextMeal, getCurrentUser, saveMeal, supabase, transcribeAudio, transcribeAudioDirect, uploadAudioFile, uploadMealImage } from '@/lib/supabase';
import { BlurView } from 'expo-blur';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type CaptureMode = 'photo' | 'text';

export default function LogScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('photo');
  const [mealDescription, setMealDescription] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCapturingRecipe, setIsCapturingRecipe] = useState(false);
  const [analysisType, setAnalysisType] = useState<'journal' | 'recipe' | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [contextText, setContextText] = useState('');
  const [showContextModal, setShowContextModal] = useState(false);
  const [tempContextText, setTempContextText] = useState('');
  const [isHoldRecording, setIsHoldRecording] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<(() => Promise<void>) | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Audio recording hook
  const { isRecording, startRecording, stopRecording } = useAudioRecorder({
    onRecordingComplete: async (uri) => {
      await handleAudioTranscription(uri);
    },
    onError: (error) => {
      Alert.alert('Recording Error', error.message);
      setIsTranscribing(false);
    }
  });

  // Hide/show tab bar based on camera state
  useEffect(() => {
    const shouldHideTabBar = showCamera || capturedImage;
    navigation.setOptions({
      tabBarStyle: shouldHideTabBar 
        ? { 
            display: 'none',
            height: 0,
            opacity: 0,
            pointerEvents: 'none'
          } 
        : undefined
    });
    
    // Cleanup: restore tab bar when component unmounts
    return () => {
      navigation.setOptions({
        tabBarStyle: undefined
      });
    };
  }, [showCamera, capturedImage, navigation]);

  // Animation values for loading states
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Animation for recording indicator
  const recordingPulseAnim = useRef(new Animated.Value(1)).current;

  // Start pulse animation when analyzing
  useEffect(() => {
    if (isAnalyzing || isLoading || isCapturingRecipe) {
      // Fade in the overlay
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Start pulsing animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.6,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => {
        pulseAnimation.stop();
      };
    } else {
      // Fade out the overlay
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isAnalyzing, isLoading, isCapturingRecipe]);

  // Start pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      const recordingPulse = Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(recordingPulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      recordingPulse.start();

      return () => {
        recordingPulse.stop();
      };
    } else {
      recordingPulseAnim.setValue(1);
    }
  }, [isRecording]);

  // Loading overlay component
  const LoadingOverlay = ({ 
    visible, 
    title, 
    subtitle,
    iconName = "brain.head.profile"
  }: { 
    visible: boolean; 
    title: string; 
    subtitle: string; 
    iconName?: string;
  }) => {
    if (!visible) return null;

    return (
      <Animated.View 
        style={[
          styles.loadingOverlay, 
          { 
            opacity: fadeAnim,
            backgroundColor: 'rgba(0, 0, 0, 0.7)' 
          }
        ]}
      >
        <View style={[styles.loadingContent, { backgroundColor: bgPrimary }]}>
          <Animated.View style={[styles.loadingIconContainer, { transform: [{ scale: pulseAnim }] }]}>
            <IconSymbol name={iconName} size={48} color={colors.tint} />
          </Animated.View>
          
          <ActivityIndicator 
            size="large" 
            color={colors.tint} 
            style={styles.loadingSpinner}
          />
          
          <Text style={[TextStyles.subtitle, { color: colors.text, textAlign: 'center' }]}>
            {title}
          </Text>
          
          <Text style={[TextStyles.bodySmall, { color: colors.icon, textAlign: 'center', lineHeight: 20, marginBottom: 20 }]}>
            {subtitle}
          </Text>
          
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((index) => (
              <Animated.View
                key={index}
                style={[
                  styles.loadingDot,
                  { 
                    backgroundColor: colors.tint,
                    transform: [{ 
                      scale: pulseAnim.interpolate({
                        inputRange: [0.6, 1],
                        outputRange: [0.8, 1.2],
                      })
                    }]
                  }
                ]}
              />
            ))}
          </View>
        </View>
      </Animated.View>
    );
  };

  // Check authentication status and listen for changes
  useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event in log screen:', event, session?.user?.email);
        setUser(session?.user || null);
        setAuthLoading(false);
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in, updating log screen state');
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, updating log screen state');
          // Reset any captured images when user signs out
          setCapturedImage(null);
          setShowCamera(false);
          setMealDescription('');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    setAuthLoading(true);
    try {
      const { user } = await getCurrentUser();
      setUser(user);
      console.log('Log screen - current user:', user?.email || 'No user');
    } catch (error) {
      console.error('Error checking user in log screen:', error);
    } finally {
      setAuthLoading(false);
    }
  };

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
          <Text style={[TextStyles.body, { color: colors.text, textAlign: 'center', paddingBottom: Spacing.lg }]}>We need your permission to show the camera</Text>
          <Button 
            variant="primary"
            onPress={requestPermission}
            fullWidth
          >
            Grant Camera Permission
          </Button>
        </ContentContainer>
      </PageContainer>
    );
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <PageContainer>
        <ContentContainer scrollable={false}>
          <View style={styles.uploadArea}>
            {/* Skeleton camera preview */}
            <View style={[styles.skeletonCamera, { backgroundColor: colors.border, opacity: 0.3, borderRadius: 20 }]} />
            
            {/* Skeleton buttons */}
            <View style={styles.captureControls}>
              <View style={[styles.skeletonButton, { width: 80, height: 80, backgroundColor: colors.border, opacity: 0.3, borderRadius: 40 }]} />
            </View>
          </View>
        </ContentContainer>
      </PageContainer>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <PageContainer>
        <ContentContainer scrollable={false}>
          <View style={styles.signInContainer}>
            <View style={styles.signInContent}>
              <View style={styles.signInIconContainer}>
                <IconSymbol name="person.circle.fill" size={64} color={colors.icon} />
              </View>
              
              <Text style={[TextStyles.h2, { color: colors.text, textAlign: 'center', marginTop: Spacing.xl }]}>
                Please sign in
              </Text>
              <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing['2xl'], paddingHorizontal: PageSpacing.containerPadding }]}>
                You need to be signed in to capture meals
              </Text>
              
              <Button 
                variant="primary"
                onPress={() => router.push('/(tabs)/auth')}
                fullWidth
              >
                <IconSymbol name="person" size={20} color="white" />
                Go to Sign In
              </Button>
            </View>
          </View>
        </ContentContainer>
      </PageContainer>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        if (photo?.uri) {
          setCapturedImage(photo.uri);
          setShowCamera(false);
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
        console.error('Camera error:', error);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const openCamera = () => {
    setShowCamera(true);
    setCapturedImage(null);
  };

  const closeCamera = () => {
    setShowCamera(false);
  };

  const exitCameraFlow = () => {
    setShowCamera(false);
    setCapturedImage(null);
    setIsLoading(false);
    setContextText(''); // Clear context when exiting camera flow
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording
      setIsHoldRecording(false);
      await stopRecording();
    } else {
      // Start recording
      try {
        await startRecording();
      } catch (error) {
        Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
      }
    }
  };

  // Handle press in (start recording on hold)
  const handleVoicePressIn = async () => {
    if (!isRecording) {
      try {
        setIsHoldRecording(true);
        await startRecording();
      } catch (error) {
        Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
        setIsHoldRecording(false);
      }
    }
  };

  // Handle press out (stop recording if started via hold)
  const handleVoicePressOut = async () => {
    if (isRecording && isHoldRecording) {
      setIsHoldRecording(false);
      await stopRecording();
    }
  };

  // Handle audio transcription after recording completes
  const handleAudioTranscription = async (audioUri: string) => {
    if (!user || !audioUri) return;

    setIsTranscribing(true);
    try {
      // Use direct transcription as primary method (bypasses storage requirement)
      console.log('🎤 Starting direct transcription...');
      const { data: transcriptionData, error: transcriptionError } = await transcribeAudioDirect(
        audioUri,
        user.id
      );

      if (transcriptionError || !transcriptionData?.transcript) {
        // Check if it's a deployment error - don't try fallback
        const isDeploymentError = transcriptionError?.message?.includes('not deployed') || 
                                   transcriptionError?.message?.includes('404') ||
                                   transcriptionError?.message?.includes('Function not found')
        
        if (isDeploymentError) {
          // Don't try fallback if function isn't deployed - just show the error
          throw transcriptionError
        }
        
        console.warn('Direct transcription failed, trying storage upload as fallback:', transcriptionError);
        
        // Fallback: Try storage upload method (only if not a deployment error)
        const fileName = `recording_${Date.now()}.m4a`;
        const { data: uploadData, error: uploadError } = await uploadAudioFile(
          audioUri,
          fileName,
          user.id
        );

        if (uploadError || !uploadData?.publicUrl) {
          // If both fail, show the original transcription error (more helpful)
          throw transcriptionError || new Error(`Transcription failed: ${uploadError?.message || 'Unknown error'}`)
        }

        // Try transcription via storage URL
        const { data: storageTranscriptionData, error: storageTranscriptionError } = await transcribeAudio(
          uploadData.publicUrl,
          user.id
        );

        if (storageTranscriptionError || !storageTranscriptionData?.transcript) {
          throw new Error(
            `All transcription methods failed. Direct: ${transcriptionError?.message || 'Unknown'}, Storage: ${storageTranscriptionError?.message || 'Unknown'}`
          );
        }

        // Use storage transcription result
        const transcript = storageTranscriptionData.transcript.trim();
        
        // Update the appropriate text field based on mode
        if (captureMode === 'text') {
          setMealDescription((prev) => (prev ? prev + ' ' + transcript : transcript));
        } else if (showContextModal) {
          // If context modal is open, update temp context text
          setTempContextText((prev) => (prev ? prev + ' ' + transcript : transcript));
        } else {
          setContextText((prev) => (prev ? prev + ' ' + transcript : transcript));
        }
      } else {
        // Direct transcription succeeded
        const transcript = transcriptionData.transcript.trim();
        
        // Update the appropriate text field based on mode
        if (captureMode === 'text') {
          setMealDescription((prev) => (prev ? prev + ' ' + transcript : transcript));
        } else if (showContextModal) {
          // If context modal is open, update temp context text
          setTempContextText((prev) => (prev ? prev + ' ' + transcript : transcript));
        } else {
          setContextText((prev) => (prev ? prev + ' ' + transcript : transcript));
        }
      }

      // Clean up local audio file
      try {
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
      } catch (cleanupError) {
        console.warn('Failed to cleanup audio file:', cleanupError);
      }

      // Execute pending save action if one exists
      if (pendingSaveAction) {
        const action = pendingSaveAction;
        setPendingSaveAction(null);
        await action();
      }
    } catch (error) {
      console.error('Transcription error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
      
      // Provide helpful error messages
      let userMessage = errorMessage
      
      // Clean up duplicate messages
      if (userMessage.includes('Please ensure') && userMessage.includes('not deployed')) {
        // Remove duplicate "Please ensure" part
        userMessage = userMessage.split('. Please ensure')[0]
      }
      
      // Add specific guidance based on error type
      if (errorMessage.includes('not deployed') || errorMessage.includes('404') || errorMessage.includes('Function not found')) {
        userMessage = 'The speech-to-text function is not deployed. Please run: supabase functions deploy speech-to-text-direct'
      } else if (errorMessage.includes('OpenAI API')) {
        userMessage = 'OpenAI API error. Please check your API key configuration in Supabase secrets.'
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userMessage = 'Network error. Please check your internet connection.'
      } else if (errorMessage.includes('Bucket not found')) {
        userMessage = 'Storage bucket not found. The app will use direct transcription instead.'
      }
      
      Alert.alert('Transcription Error', userMessage);
      
      // Clear pending save action on error
      setPendingSaveAction(null);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle Add Context button (for image preview mode)
  const handleAddContext = () => {
    // Open the context modal
    setTempContextText(contextText); // Initialize with existing context
    setShowContextModal(true);
  };

  // Handle voice input in context modal
  const handleContextVoiceInput = async () => {
    if (isRecording) {
      setIsHoldRecording(false);
      await stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error) {
        Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
      }
    }
  };

  // Handle press in for context modal (start recording on hold)
  const handleContextVoicePressIn = async () => {
    if (!isRecording) {
      try {
        setIsHoldRecording(true);
        await startRecording();
      } catch (error) {
        Alert.alert('Error', 'Failed to start recording. Please check microphone permissions.');
        setIsHoldRecording(false);
      }
    }
  };

  // Handle press out for context modal (stop recording if started via hold)
  const handleContextVoicePressOut = async () => {
    if (isRecording && isHoldRecording) {
      setIsHoldRecording(false);
      await stopRecording();
    }
  };

  // Save context from modal
  const handleSaveContext = async () => {
    // If recording, stop recording and wait for transcription before saving
    if (isRecording) {
      setIsHoldRecording(false);
      setPendingSaveAction(async () => {
        setContextText(tempContextText);
        setShowContextModal(false);
      });
      await stopRecording();
      return;
    }
    
    setContextText(tempContextText);
    setShowContextModal(false);
  };

  // Cancel context modal
  const handleCancelContext = () => {
    setTempContextText('');
    setShowContextModal(false);
  };

  const pickImageFromGallery = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to upload photos.'
        );
        return;
      }

      // Pick image from gallery
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', `Failed to pick image from gallery: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('Image picker error:', error);
    }
  };

  const handleJournalEntry = async () => {
    // If recording, stop recording and wait for transcription before saving
    if (isRecording) {
      setIsHoldRecording(false);
      setPendingSaveAction(async () => {
        if (!mealDescription.trim()) {
          Alert.alert('Description Required', 'Please describe your meal before analyzing.');
          return;
        }
        await executeJournalEntry();
      });
      await stopRecording();
      return;
    }

    await executeJournalEntry();
  };

  const executeJournalEntry = async () => {
    if (!mealDescription.trim()) {
      Alert.alert('Description Required', 'Please describe your meal before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisType('journal');
    try {
      // Call AI text analysis API
      const { data: analysisData, error: analysisError } = await analyzeTextMeal(
        mealDescription.trim(),
        user.id
      );

      if (analysisError) {
        throw analysisError;
      }

      const mealId = analysisData?.meal_id;
      
      Alert.alert(
        'Meal Analyzed!', 
        'Your meal has been analyzed and saved to your journal.',
        [
          { 
            text: 'View Analysis', 
            onPress: () => {
              setMealDescription('');
              setIsAnalyzing(false);
              setAnalysisType(null);
              if (mealId) {
                router.push(`/meal/${mealId}`);
              } else {
                router.push('/(tabs)/journal');
              }
            }
          },
          {
            text: 'OK',
            onPress: () => {
              setMealDescription('');
              setIsAnalyzing(false);
              setAnalysisType(null);
            }
          }
        ]
      );
    } catch (error) {
      setIsAnalyzing(false);
      setAnalysisType(null);
      Alert.alert('Error', 'Failed to analyze meal. Please try again.');
      console.error('AI analysis error:', error);
    }
  };

  const handleRecipeEntry = async () => {
    // If recording, stop recording and wait for transcription before saving
    if (isRecording) {
      setIsHoldRecording(false);
      setPendingSaveAction(async () => {
        if (!mealDescription.trim()) {
          Alert.alert('Description Required', 'Please describe your recipe before analyzing.');
          return;
        }
        await executeRecipeEntry();
      });
      await stopRecording();
      return;
    }

    await executeRecipeEntry();
  };

  const executeRecipeEntry = async () => {
    if (!mealDescription.trim()) {
      Alert.alert('Description Required', 'Please describe your recipe before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisType('recipe');
    try {
      // Call AI recipe text analysis API
      const { data: analysisData, error: analysisError } = await analyzeRecipeFromText(
        mealDescription.trim(),
        user.id
      );

      if (analysisError) {
        throw analysisError;
      }

      const recipeId = analysisData?.recipe_id;
      
      Alert.alert(
        'Recipe Analyzed!', 
        'Your recipe has been analyzed and saved.',
        [
          { 
            text: 'View Analysis', 
            onPress: () => {
              setMealDescription('');
              setIsAnalyzing(false);
              setAnalysisType(null);
              if (recipeId) {
                router.push(`/recipe/${recipeId}`);
              } else {
                router.push('/(tabs)/recipes');
              }
            }
          },
          {
            text: 'OK',
            onPress: () => {
              setMealDescription('');
              setIsAnalyzing(false);
              setAnalysisType(null);
            }
          }
        ]
      );
    } catch (error) {
      setIsAnalyzing(false);
      setAnalysisType(null);
      Alert.alert('Error', 'Failed to analyze recipe. Please try again.');
      console.error('Recipe analysis error:', error);
    }
  };

  const saveMealToSupabase = async () => {
    if (!capturedImage || !user) return;

    // If recording, stop recording and wait for transcription before saving
    if (isRecording) {
      setIsHoldRecording(false);
      setPendingSaveAction(async () => {
        await executeSaveMeal();
      });
      await stopRecording();
      return;
    }

    await executeSaveMeal();
  };

  const executeSaveMeal = async () => {
    if (!capturedImage || !user) return;

    setIsLoading(true);
    try {
      // Generate unique filename
      const fileName = `meal_${Date.now()}.jpg`;
      
      // Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await uploadMealImage(
        capturedImage, 
        fileName, 
        user.id
      );

      if (uploadError) {
        throw uploadError;
      }

      // Call AI image analysis with the uploaded image URL
      // The Edge Function will create the meal record and analyze it
      const { data: analysisData, error: analysisError } = await analyzeImageMeal(
        uploadData?.publicUrl || '',
        user.id,
        undefined, // mealId - let the function create the meal
        contextText || 'Captured meal photo' // Use context text if available
      );

      if (analysisError) {
        console.error('AI analysis failed:', analysisError);
        // Fallback: save basic meal record if AI analysis fails
        const { data: mealData, error: mealError } = await saveMeal({
          description: 'Captured meal photo',
          image_url: uploadData?.publicUrl,
          user_id: user.id,
        });

        if (mealError) {
          throw mealError;
        }

        // Try to get meal ID from the fallback save
        const mealId = mealData?.id;
        
        Alert.alert(
          'Meal Saved', 
          'Your meal has been saved, but AI analysis failed. You can view it in your journal.',
          [
            { 
              text: mealId ? 'View Meal' : 'View Journal', 
              onPress: () => {
                setCapturedImage(null);
                setIsLoading(false);
                setContextText(''); // Clear context after save
                if (mealId) {
                  router.push(`/meal/${mealId}`);
                } else {
                  router.push('/(tabs)/journal');
                }
              }
            }
          ]
        );
      } else {
        // AI analysis succeeded
        const mealId = analysisData?.meal_id;
        
        Alert.alert(
          'Meal Analyzed! 🎉', 
          'Your meal has been analyzed and saved to your journal with nutrition insights.',
          [
            { 
              text: 'View Analysis', 
              onPress: () => {
                setCapturedImage(null);
                setIsLoading(false);
                setContextText(''); // Clear context after successful save
                if (mealId) {
                  router.push(`/meal/${mealId}`);
                } else {
                  router.push('/(tabs)/journal');
                }
              }
            }
          ]
        );
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Error', 'Failed to save meal. Please try again.');
      console.error('Save meal error:', error);
    }
  };

  const retakePicture = () => {
    setCapturedImage(null);
    setShowCamera(true);
  };

  const captureRecipe = async () => {
    if (!capturedImage || !user) {
      Alert.alert('Error', 'No image captured or user not logged in');
      return;
    }

    try {
      setIsCapturingRecipe(true);

      // First upload the image
      const fileName = `recipe_${Date.now()}.jpg`;
      const uploadResult = await uploadMealImage(capturedImage, fileName, user.id);
      if (uploadResult.error) {
        throw uploadResult.error;
      }

      // Analyze the image for recipe data
      const { data: recipeData, error: recipeError } = await analyzeRecipeFromImage(
        uploadResult.data?.publicUrl || '',
        user.id,
        contextText || 'Recipe captured from photo' // Use context text if available
      );

      if (recipeError) {
        throw recipeError;
      }

      const recipeId = recipeData?.recipe_id;
      
      Alert.alert(
        'Recipe Captured! 🍳', 
        'Your recipe has been analyzed and saved to your recipes collection.',
        [
          { 
            text: 'View Analysis', 
            onPress: () => {
              setCapturedImage(null);
              setIsCapturingRecipe(false);
              setContextText(''); // Clear context after recipe capture
              if (recipeId) {
                router.push(`/recipe/${recipeId}`);
              } else {
                router.push('/(tabs)/recipes');
              }
            }
          }
        ]
      );
    } catch (error) {
      setIsCapturingRecipe(false);
      Alert.alert('Error', 'Failed to capture recipe. Please try again.');
      console.error('Capture recipe error:', error);
    }
  };

  // Camera View
  if (showCamera) {
    return (
      <SafeAreaView style={styles.cameraContainer}>
        <CameraView 
          style={styles.camera} 
          facing={facing} 
          ref={cameraRef}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.topControls}>
              <TouchableOpacity 
                style={styles.exitButton} 
                onPress={exitCameraFlow}
              >
                <IconSymbol name="xmark" size={24} color="white" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.controlButton} 
                onPress={toggleCameraFacing}
              >
                <IconSymbol name="arrow.triangle.2.circlepath.camera" size={20} color="white" />
                <Text style={styles.controlText}>Flip</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.centerGuide}>
              <View style={styles.focusSquare} />
            </View>

            <View style={styles.bottomControls}>
              <TouchableOpacity 
                style={styles.captureButton} 
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </CameraView>
      </SafeAreaView>
    );
  }

  // Image Preview
  if (capturedImage) {
    return (
      <SafeAreaView style={styles.previewContainer} edges={['top', 'bottom']}>
        {/* Top buttons - Exit and Retake */}
        <View style={[styles.previewTopButtons, { top: insets.top + Spacing.sm }]}>
          <TouchableOpacity 
            style={styles.previewExitButton}
            onPress={exitCameraFlow}
            activeOpacity={0.8}
          >
            <IconSymbol name="xmark" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.previewRetakeButton}
            onPress={retakePicture}
            disabled={isLoading || isCapturingRecipe}
            activeOpacity={0.8}
          >
            <IconSymbol name="camera" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Image Preview with Glassmorphic Container */}
        <View style={[styles.previewImageWrapper, { marginTop: insets.top + 60 }]}>
          <BlurView intensity={20} tint="dark" style={styles.glassContainer}>
            <View style={styles.previewImageContainer}>
              <Image 
                source={{ uri: capturedImage }} 
                style={styles.previewImage}
                contentFit="cover"
                transition={200}
              />
            </View>
          </BlurView>
        </View>
        
        {/* Action Buttons */}
        <View style={[styles.previewActions, { paddingBottom: insets.bottom + Spacing.base }]}>
          <View style={styles.buttonColumn}>
            <Button 
              variant="primary"
              onPress={saveMealToSupabase}
              disabled={isLoading || isCapturingRecipe}
              fullWidth
              icon={isLoading ? <ActivityIndicator size="small" color="#000000" /> : <IconSymbol name="checkmark" size={18} color="#000000" />}
            >
              {isLoading ? 'Processing...' : 'Log Meal'}
            </Button>
            
            <Button 
              variant="primary"
              onPress={captureRecipe}
              disabled={isLoading || isCapturingRecipe}
              fullWidth
              icon={isCapturingRecipe ? <ActivityIndicator size="small" color="#000000" /> : <IconSymbol name="fork.knife" size={18} color="#000000" />}
            >
              {isCapturingRecipe ? 'Extracting...' : 'Extract Recipe'}
            </Button>
            
            <TouchableOpacity
              style={[styles.addContextButton, (isLoading || isCapturingRecipe) && styles.addContextButtonDisabled]}
              onPress={handleAddContext}
              disabled={isLoading || isCapturingRecipe}
              activeOpacity={0.8}
            >
              <View style={styles.addContextButtonContent}>
                <IconSymbol name="plus.circle" size={18} color="white" />
                <Text style={styles.addContextButtonText}>
                  {contextText ? 'Edit Context' : 'Add Context'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading Overlay for Image Analysis */}
        <LoadingOverlay
          visible={isLoading}
          title="Analyzing Your Meal"
          subtitle="AI is analyzing your meal photo for nutrition insights..."
        />
        
        {/* Loading Overlay for Recipe Analysis */}
        <LoadingOverlay
          visible={isCapturingRecipe}
          title="Capturing Recipe"
          subtitle="AI is analyzing your photo to extract recipe details, ingredients, and cooking instructions. Please don't close the app while this is processing..."
          iconName="book.fill"
        />

        {/* Context Modal */}
        <Modal
          visible={showContextModal}
          transparent
          animationType="fade"
          onRequestClose={handleCancelContext}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.modalContainer}
            >
              <BlurView intensity={20} tint="dark" style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={[TextStyles.h3, { color: colors.text }]}>
                    Add Context
                  </Text>
                  <TouchableOpacity
                    onPress={handleCancelContext}
                    style={styles.modalCloseButton}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="xmark" size={24} color={colors.icon} />
                  </TouchableOpacity>
                </View>

                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginBottom: Spacing.md }]}>
                  Provide additional details about your meal to help improve the AI analysis
                </Text>

                <Input
                  placeholder="E.g., This is a homemade meal, portion size is large, contains extra cheese..."
                  value={tempContextText}
                  onChangeText={setTempContextText}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  rightIcon={
                    <TouchableOpacity 
                      onPress={handleContextVoiceInput}
                      disabled={isTranscribing}
                      activeOpacity={0.7}
                    >
                      {isRecording ? (
                        <Animated.View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transform: [{ scale: recordingPulseAnim }],
                          }}
                        >
                          <View
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              backgroundColor: '#EF4444',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconSymbol name="stop.fill" size={10} color="white" />
                          </View>
                        </Animated.View>
                      ) : (
                        <IconSymbol 
                          name={isTranscribing ? "hourglass" : "mic"} 
                          size={20} 
                          color={isTranscribing ? colors.icon : neonGreen} 
                        />
                      )}
                    </TouchableOpacity>
                  }
                  containerStyle={{ marginBottom: Spacing.lg }}
                  style={{ minHeight: 150 }}
                />

                <View style={styles.modalActions}>
                  <Button
                    variant="secondary"
                    onPress={handleCancelContext}
                    style={styles.modalCancelButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onPress={handleSaveContext}
                    style={styles.modalSaveButton}
                  >
                    Save
                  </Button>
                </View>
              </BlurView>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // Main Capture Interface
  return (
    <PageContainer>
      <PageHeader
        title="Capture Meal"
        subtitle="Take a photo or describe your meal for automatic nutrition analysis"
      />
      
      {/* Free Scans Indicator */}
      <View style={styles.scansIndicator}>
        <View style={styles.scansIcon}>
          <IconSymbol name="checkmark.circle" size={16} color={colors.tint} />
        </View>
        <Text style={[styles.scansText, { color: colors.text }]}>
          You have 16 free scans remaining
        </Text>
      </View>

      {/* Tab Switcher */}
      <View style={[styles.tabContainer, { backgroundColor: glassSurface, borderColor: glassBorder, borderWidth: 1 }]}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            captureMode === 'photo' && { backgroundColor: neonGreen },
            captureMode !== 'photo' && { backgroundColor: 'transparent' }
          ]}
          onPress={() => setCaptureMode('photo')}
        >
          <Text style={[
            TextStyles.button,
            styles.tabText,
            captureMode === 'photo' ? { color: '#000000' } : { color: colors.icon }
          ]}>
            Photo
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab,
            captureMode === 'text' && { backgroundColor: neonGreen },
            captureMode !== 'text' && { backgroundColor: 'transparent' }
          ]}
          onPress={() => setCaptureMode('text')}
        >
          <Text style={[
            TextStyles.button,
            styles.tabText,
            captureMode === 'text' ? { color: '#000000' } : { color: colors.icon }
          ]}>
            Text Description
          </Text>
        </TouchableOpacity>
      </View>

      <ContentContainer keyboardAvoiding={true}>
        {captureMode === 'photo' ? (
          // Photo Capture Mode
          <View style={styles.uploadArea}>
            <View style={styles.iconContainer}>
              <IconSymbol name="camera" size={48} color={colors.icon} />
            </View>
            
            <Text style={[TextStyles.h3, { color: colors.text, textAlign: 'center' }]}>Add a meal photo</Text>
            <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', marginTop: Spacing.sm, marginBottom: Spacing['2xl'] }]}>
              Take a photo or drag and drop an image
            </Text>
            
            <View style={styles.buttonRow}>
              <Button 
                variant="primary"
                onPress={openCamera}
                style={styles.primaryButton}
                icon={<IconSymbol name="camera" size={18} color="#000000" />}
              >
                Take photo
              </Button>
              
              <Button 
                variant="primary"
                onPress={pickImageFromGallery}
                style={styles.primaryButton}
                icon={<IconSymbol name="square.and.arrow.up" size={18} color="#000000" />}
              >
                Upload
              </Button>
            </View>
          </View>
        ) : (
          // Text Description Mode
          <View style={styles.textCaptureArea}>
            <Text style={[TextStyles.h3, { color: colors.text, marginBottom: Spacing.base }]}>Describe Your Meal</Text>
            
            <Input
              placeholder="Describe your meal"
              value={mealDescription}
              onChangeText={setMealDescription}
              multiline
              numberOfLines={15}
              textAlignVertical="top"
              rightIcon={
                <TouchableOpacity 
                  onPress={handleVoiceInput}
                  onPressIn={handleVoicePressIn}
                  onPressOut={handleVoicePressOut}
                  disabled={isTranscribing}
                  activeOpacity={0.7}
                >
                  {isRecording ? (
                    <Animated.View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: [{ scale: recordingPulseAnim }],
                      }}
                    >
                      <View
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: '#EF4444',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <IconSymbol name="stop.fill" size={10} color="white" />
                      </View>
                    </Animated.View>
                  ) : (
                    <IconSymbol 
                      name={isTranscribing ? "hourglass" : "mic"} 
                      size={20} 
                      color={isTranscribing ? colors.icon : neonGreen} 
                    />
                  )}
                </TouchableOpacity>
              }
              containerStyle={{ marginBottom: Spacing.md }}
              style={{ minHeight: 200 }}
            />
            
            <Text style={[TextStyles.bodySmall, { color: colors.icon, textAlign: 'center', marginBottom: Spacing.md }]}>
              Include portion sizes and ingredients for better analysis
            </Text>
            
            <View style={styles.buttonColumn}>
              <Button 
                variant="primary"
                onPress={handleJournalEntry}
                disabled={!mealDescription.trim() || isAnalyzing}
                fullWidth
                style={{ width: '100%' }}
                icon={isAnalyzing && analysisType === 'journal' ? <ActivityIndicator size="small" color="#000000" /> : <IconSymbol name="book" size={18} color="#000000" />}
              >
                {isAnalyzing && analysisType === 'journal' ? 'Analyzing...' : 'Journal Entry'}
              </Button>
              
              <Button 
                variant="primary"
                onPress={handleRecipeEntry}
                disabled={!mealDescription.trim() || isAnalyzing}
                fullWidth
                style={{ width: '100%' }}
                icon={isAnalyzing && analysisType === 'recipe' ? <ActivityIndicator size="small" color="#000000" /> : <IconSymbol name="fork.knife" size={18} color="#000000" />}
              >
                {isAnalyzing && analysisType === 'recipe' ? 'Analyzing...' : 'Recipe Entry'}
              </Button>
            </View>
          </View>
        )}
      </ContentContainer>

      {/* Loading Overlays */}
      <LoadingOverlay
        visible={isAnalyzing}
        title={analysisType === 'recipe' ? "Analyzing Your Recipe" : "Analyzing Your Meal"}
        subtitle={analysisType === 'recipe' 
          ? "AI is extracting recipe information from your description. Please don't close the app while this is processing..."
          : "AI is extracting nutrition information from your description. Please don't close the app while this is processing..."}
      />

      <LoadingOverlay
        visible={isLoading}
        title="Processing Image"
        subtitle="AI is analyzing your meal photo for nutrition data. Please don't close the app while this is processing..."
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  scansIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  scansIcon: {
    // Icon styling handled by IconSymbol
  },
  scansText: {
    fontSize: 14,
  },
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
  uploadArea: {
    alignItems: 'center',
    padding: Spacing['3xl'],
  },
  signInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInContent: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  signInIconContainer: {
    marginBottom: 0,
  },
  textCaptureArea: {
    padding: PageSpacing.containerPadding,
  },
  textTitle: {
    marginBottom: 24,
  },
  textInputContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    minHeight: 200,
    position: 'relative',
  },
  textInput: {
    lineHeight: 24,
    flex: 1,
  },
  voiceButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    padding: 8,
  },
  helperText: {
    marginBottom: 32,
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonRow: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  buttonColumn: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
    alignSelf: 'center',
  },
  primaryButton: {
    flex: 1,
  },
  signInButton: {
    marginTop: 8,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 20,
  },
  permissionButton: {
    marginTop: 20,
  },
  analyzeButton: {
    width: '100%',
  },
  actionButton: {
    flex: 1,
  },
  recipeButton: {
    width: '100%',
    marginTop: 8,
  },
  buttonText: {
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
  
  // Preview Styles
  previewContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  previewImageWrapper: {
    flex: 1,
    paddingHorizontal: Spacing.base,
    paddingBottom: 200, // Space for buttons
  },
  glassContainer: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: glassBorder,
  },
  previewImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    padding: 20,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  topActionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  addContextButton: {
    width: '100%',
    backgroundColor: 'rgba(6, 78, 59, 0.8)', // Darker green
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
  previewTopButtons: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  previewExitButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRetakeButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Loading Overlay Styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContent: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    minWidth: 280,
  },
  loadingIconContainer: {
    marginBottom: 16,
  },
  loadingSpinner: {
    marginBottom: 16,
  },
  loadingTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  // Updated Button Styles
  analyzeButtonDisabled: {
    opacity: 0.5,
  },
  skeletonCamera: {
    width: '100%',
    aspectRatio: 4 / 3,
    marginBottom: Spacing.xl,
  },
  skeletonButton: {
    borderRadius: 40,
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
  modalContent: {
    borderRadius: 24,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: glassBorder,
    ...(Platform.OS === 'web' && {
      backgroundColor: 'rgba(30, 30, 30, 0.95)',
    }),
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
}); 