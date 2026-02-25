import { neonGreen } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { Image } from 'expo-image';
import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Viewfinder } from './Viewfinder';

interface CaptureImagePreviewProps {
  uri: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CaptureImagePreview({ uri, onConfirm, onCancel }: CaptureImagePreviewProps): React.ReactElement {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton} activeOpacity={0.7}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Preview Photo</Text>
        <TouchableOpacity onPress={onConfirm} style={styles.headerButton} activeOpacity={0.7}>
          <Text style={[styles.headerButtonText, { color: neonGreen }]}>Choose</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.animatedWrapper, animatedStyle]}>
            <Image 
              source={{ uri }} 
              style={{ width: windowWidth, height: windowHeight }} 
              contentFit="contain" 
            />
          </Animated.View>
        </GestureDetector>
        
        <View style={styles.viewfinderOverlay} pointerEvents="none">
          <Viewfinder />
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.hint}>
          Pinch to zoom • Drag to center
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    minHeight: 60,
    zIndex: 20,
  },
  title: {
    ...TextStyles.h3,
    color: 'white',
  },
  headerButton: {
    padding: 10,
    minWidth: 80,
  },
  headerButtonText: {
    ...TextStyles.body,
    color: 'white',
    fontWeight: '700',
  },
  imageContainer: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
  },
  animatedWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  footer: {
    padding: 30,
    alignItems: 'center',
    zIndex: 20,
  },
  hint: {
    ...TextStyles.bodySmall,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});
