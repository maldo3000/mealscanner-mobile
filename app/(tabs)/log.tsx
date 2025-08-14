import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { HeroImage } from '@/components/ui/OptimizedImage';
import { Colors } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { analyzeImageMeal, analyzeRecipeFromImage, analyzeTextMeal, getCurrentUser, saveMeal, supabase, uploadMealImage } from '@/lib/supabase';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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
  const cameraRef = useRef<CameraView>(null);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Hide/show tab bar based on camera state
  useEffect(() => {
    const shouldHideTabBar = showCamera || capturedImage;
    navigation.setOptions({
      tabBarStyle: shouldHideTabBar ? { display: 'none' } : undefined
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
        <View style={[styles.loadingContent, { backgroundColor: colors.background }]}>
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
      <ThemedView style={styles.container}>
        <Text style={[TextStyles.body, { color: colors.text }]}>Loading camera...</Text>
      </ThemedView>
    );
  }

  if (!permission.granted && captureMode === 'photo') {
    return (
      <ThemedView style={styles.container}>
        <Text style={[TextStyles.body, { color: colors.text, textAlign: 'center', paddingBottom: 20 }]}>We need your permission to show the camera</Text>
        <TouchableOpacity 
          style={[styles.permissionButton, { backgroundColor: colors.tint }]} 
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.uploadArea}>
          <View style={styles.iconContainer}>
            <IconSymbol name="hourglass" size={48} color={colors.icon} />
          </View>
          <Text style={[TextStyles.h3, { color: colors.text, textAlign: 'center' }]}>Loading...</Text>
          <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', marginBottom: 30 }]}>
            Checking authentication status
          </Text>
        </View>
      </ThemedView>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.uploadArea}>
          <View style={styles.iconContainer}>
            <IconSymbol name="person" size={48} color={colors.icon} />
          </View>
          
          <Text style={[TextStyles.h3, { color: colors.text, textAlign: 'center' }]}>Please sign in</Text>
          <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', marginBottom: 30 }]}>
            You need to be signed in to capture meals
          </Text>
          
          <TouchableOpacity 
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push('/(tabs)/auth')}
          >
            <IconSymbol name="person" size={20} color="white" />
            <Text style={[TextStyles.button, { color: 'white' }]}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ThemedView>
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
  };

  const handleVoiceInput = () => {
    // TODO: Implement voice-to-text functionality
    Alert.alert('Voice Input', 'Voice input functionality coming soon!');
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

  const analyzeWithAI = async () => {
    if (!mealDescription.trim()) {
      Alert.alert('Description Required', 'Please describe your meal before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Call AI text analysis API
      const { data: analysisData, error: analysisError } = await analyzeTextMeal(
        mealDescription.trim(),
        user.id
      );

      if (analysisError) {
        throw analysisError;
      }

      Alert.alert(
        'Meal Analyzed!', 
        'Your meal has been analyzed and saved to your journal.',
        [
          { 
            text: 'View Journal', 
            onPress: () => {
              setMealDescription('');
              setIsAnalyzing(false);
              router.push('/(tabs)/journal');
            }
          },
          {
            text: 'OK',
            onPress: () => {
              setMealDescription('');
              setIsAnalyzing(false);
            }
          }
        ]
      );
    } catch (error) {
      setIsAnalyzing(false);
      Alert.alert('Error', 'Failed to analyze meal. Please try again.');
      console.error('AI analysis error:', error);
    }
  };

  const saveMealToSupabase = async () => {
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
        'Captured meal photo' // description
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

        Alert.alert(
          'Meal Saved', 
          'Your meal has been saved, but AI analysis failed. You can view it in your journal.',
          [
            { 
              text: 'View Journal', 
              onPress: () => {
                setCapturedImage(null);
                setIsLoading(false);
                router.push('/(tabs)/journal');
              }
            }
          ]
        );
      } else {
        // AI analysis succeeded
        Alert.alert(
          'Meal Analyzed! 🎉', 
          'Your meal has been analyzed and saved to your journal with nutrition insights.',
          [
            { 
              text: 'View Analysis', 
              onPress: () => {
                setCapturedImage(null);
                setIsLoading(false);
                router.push('/(tabs)/journal');
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
        'Recipe captured from photo'
      );

      if (recipeError) {
        throw recipeError;
      }

      Alert.alert(
        'Recipe Captured! 🍳', 
        'Your recipe has been analyzed and saved to your recipes collection.',
        [
          { 
            text: 'View Recipes', 
            onPress: () => {
              setCapturedImage(null);
              setIsCapturingRecipe(false);
              router.push('/(tabs)/recipes');
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
      <View style={styles.previewContainer}>
        {/* Exit button */}
        <TouchableOpacity 
          style={styles.previewExitButton}
          onPress={exitCameraFlow}
        >
          <IconSymbol name="xmark" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.previewImageContainer}>
          <HeroImage source={{ uri: capturedImage }} style={styles.previewImage} />
        </View>
        
        <View style={styles.previewActions}>
          {/* Top row - Retake and Save & Analyze */}
          <View style={styles.topActionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.retakeButton]} 
              onPress={retakePicture}
              disabled={isLoading || isCapturingRecipe}
            >
              <IconSymbol name="camera" size={20} color="white" />
              <Text style={styles.actionButtonText}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                { backgroundColor: colors.tint },
                (isLoading || isCapturingRecipe) && styles.actionButtonDisabled
              ]} 
              onPress={saveMealToSupabase}
              disabled={isLoading || isCapturingRecipe}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.actionButtonText}>Processing...</Text>
                </>
              ) : (
                <>
                  <IconSymbol name="checkmark" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Save & Analyze</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom row - Capture Recipe */}
          <TouchableOpacity 
            style={[
              styles.recipeButton,
              { backgroundColor: '#10B981' }, // Green color for recipe
              (isLoading || isCapturingRecipe) && styles.actionButtonDisabled
            ]} 
            onPress={captureRecipe}
            disabled={isLoading || isCapturingRecipe}
          >
            {isCapturingRecipe ? (
              <>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.actionButtonText}>Capturing Recipe...</Text>
              </>
            ) : (
              <>
                <IconSymbol name="fork.knife" size={20} color="white" />
                <Text style={styles.actionButtonText}>Capture Recipe</Text>
              </>
            )}
          </TouchableOpacity>
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
      </View>
    );
  }

  // Main Capture Interface
  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[TextStyles.h2, { color: colors.text }]}>Capture Meal</Text>
            <Text style={[TextStyles.body, { color: colors.icon, marginTop: 4, lineHeight: 22 }]}>
              Take a photo or describe your meal for automatic nutrition analysis
            </Text>
          </View>
        </View>
        
        {/* Free Scans Indicator */}
        <View style={styles.scansIndicator}>
          <View style={styles.scansIcon}>
            <IconSymbol name="checkmark.circle" size={16} color={colors.tint} />
          </View>
          <Text style={[styles.scansText, { color: colors.text }]}>
            You have 16 free scans remaining
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            captureMode === 'photo' && { backgroundColor: colors.tint },
            captureMode !== 'photo' && { backgroundColor: 'transparent' }
          ]}
          onPress={() => setCaptureMode('photo')}
        >
          <Text style={[
            TextStyles.button,
            captureMode === 'photo' ? { color: 'white' } : { color: colors.icon }
          ]}>
            Photo
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab,
            captureMode === 'text' && { backgroundColor: colors.tint },
            captureMode !== 'text' && { backgroundColor: 'transparent' }
          ]}
          onPress={() => setCaptureMode('text')}
        >
          <Text style={[
            TextStyles.button,
            captureMode === 'text' ? { color: 'white' } : { color: colors.icon }
          ]}>
            Text Description
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {captureMode === 'photo' ? (
          // Photo Capture Mode
          <View style={styles.uploadArea}>
            <View style={styles.iconContainer}>
              <IconSymbol name="camera" size={48} color={colors.icon} />
            </View>
            
                      <Text style={[TextStyles.h3, { color: colors.text, textAlign: 'center' }]}>Add a meal photo</Text>
          <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', marginBottom: 30 }]}>
            Take a photo or drag and drop an image
          </Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                onPress={openCamera}
              >
                <IconSymbol name="camera" size={20} color="white" />
                <Text style={[TextStyles.button, { color: 'white' }]}>Take photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                onPress={pickImageFromGallery}
              >
                <IconSymbol name="square.and.arrow.up" size={20} color="white" />
                <Text style={[TextStyles.button, { color: 'white' }]}>Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Text Description Mode
          <View style={styles.textCaptureArea}>
            <Text style={[TextStyles.h3, { color: colors.text }]}>Describe Your Meal</Text>
            
            <View style={[styles.textInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.textInput, { color: colors.text }]}
                placeholder="Describe your meal"
                placeholderTextColor={colors.icon}
                value={mealDescription}
                onChangeText={setMealDescription}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
              
              {/* Voice Input Button */}
              <TouchableOpacity 
                style={styles.voiceButton}
                onPress={handleVoiceInput}
              >
                <IconSymbol name="mic" size={20} color={colors.tint} />
              </TouchableOpacity>
            </View>
            
                      <Text style={[TextStyles.bodySmall, { color: colors.icon, textAlign: 'center', marginBottom: 32 }]}>
            Include portion sizes and ingredients for better analysis
          </Text>
            
            <TouchableOpacity 
              style={[
                styles.analyzeButton, 
                { backgroundColor: colors.tint },
                (!mealDescription.trim() || isAnalyzing) && styles.analyzeButtonDisabled
              ]}
              onPress={analyzeWithAI}
              disabled={!mealDescription.trim() || isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.analyzeButtonText}>Analyzing...</Text>
                </>
              ) : (
                <>
                  <IconSymbol name="brain.head.profile" size={20} color="white" />
                  <Text style={styles.analyzeButtonText}>Analyze with AI</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Loading Overlays */}
      <LoadingOverlay
        visible={isAnalyzing}
        title="Analyzing Your Meal"
        subtitle="AI is extracting nutrition information from your description. Please don't close the app while this is processing..."
      />

      <LoadingOverlay
        visible={isLoading}
        title="Processing Image"
        subtitle="AI is analyzing your meal photo for nutrition data. Please don't close the app while this is processing..."
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    marginBottom: 4,
  },
  headerSubtitle: {
    lineHeight: 22,
  },
  scansIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scansIcon: {
    // Icon styling handled by IconSymbol
  },
  scansText: {
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 25,
    backgroundColor: '#1F2937',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  uploadArea: {
    alignItems: 'center',
    padding: 40,
  },
  textCaptureArea: {
    padding: 20,
  },
  textTitle: {
    marginBottom: 24,
  },
  textInputContainer: {
    borderRadius: 16,
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
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  analyzeButtonText: {
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
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  message: {
    textAlign: 'center',
    paddingBottom: 20,
  },
  permissionButton: {
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
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
  previewImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60, // Account for status bar
    paddingBottom: 120, // Account for buttons
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'column',
    padding: 20,
    paddingBottom: 40, // Safe area
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  topActionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  recipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  retakeButton: {
    backgroundColor: '#6B7280',
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
  },
  previewExitButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 25,
    zIndex: 10,
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
}); 