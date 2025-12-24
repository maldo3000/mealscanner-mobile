import React, { useCallback, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CameraType, CameraView } from 'expo-camera';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { neonGreen } from '@/constants/Colors';

export interface CaptureCameraOverlayProps {
  initialFacing?: CameraType;
  onCancel: () => void;
  onCaptured: (uri: string) => Promise<void> | void;
  onPickImage?: () => Promise<void> | void;
}

export function CaptureCameraOverlay(props: CaptureCameraOverlayProps): React.ReactElement {
  const { initialFacing = 'back', onCancel, onCaptured, onPickImage } = props;

  const [facing, setFacing] = useState<CameraType>(initialFacing);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const cameraRef = useRef<CameraView>(null);

  const toggleCameraFacing = useCallback((): void => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const takePicture = useCallback(async (): Promise<void> => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      if (photo?.uri) {
        await onCaptured(photo.uri);
      }
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCaptured]);

  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.overlay}>
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.exitButton} onPress={onCancel} activeOpacity={0.8}>
              <IconSymbol name="xmark" size={22} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={toggleCameraFacing} activeOpacity={0.8}>
              <IconSymbol name="arrow.triangle.2.circlepath.camera" size={18} color="white" />
              <Text style={styles.controlText}>Flip</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.centerGuide}>
            <View style={styles.viewfinder}>
              <View style={styles.viewfinderRow}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
              </View>
              <View style={styles.viewfinderRow}>
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>
          </View>

          <View style={styles.bottomControls}>
            <View style={styles.shutterRow}>
              <TouchableOpacity
                style={[styles.galleryButton, { borderColor: `${neonGreen}40`, borderWidth: 1 }]}
                onPress={onPickImage}
                activeOpacity={0.7}
                disabled={isCapturing}
              >
                <IconSymbol name="photo.on.rectangle" size={24} color={neonGreen} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                onPress={takePicture}
                activeOpacity={0.9}
                disabled={isCapturing}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              {/* Empty view to balance the gallery button for centering the shutter */}
              <View style={styles.spacer} />
            </View>
          </View>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingTop: 24,
  },
  exitButton: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 12,
    borderRadius: 24,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 12,
    borderRadius: 24,
    minWidth: 56,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
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
  viewfinder: {
    width: 280,
    height: 280,
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  viewfinderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  corner: {
    width: 40,
    height: 40,
    borderColor: neonGreen,
  },
  topLeft: {
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  topRight: {
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  bottomControls: {
    paddingBottom: 36,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  galleryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 48,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
});


