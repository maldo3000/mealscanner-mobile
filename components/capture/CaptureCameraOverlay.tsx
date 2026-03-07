import React, { useCallback, useRef, useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { CameraType, CameraView } from 'expo-camera';

import { Viewfinder } from './Viewfinder';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { neonGreen } from '@/constants/Colors';

type ZoomLevel = 1 | 2;

const ZOOM_VALUES: Record<ZoomLevel, number> = {
  1: 0,
  2: 0.5,
};

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
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(1);
  const cameraRef = useRef<CameraView>(null);

  const toggleCameraFacing = useCallback((): void => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const toggleZoom = useCallback((): void => {
    setZoomLevel((current) => (current === 1 ? 2 : 1));
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
      <CameraView style={styles.camera} facing={facing} ref={cameraRef} zoom={ZOOM_VALUES[zoomLevel]}>
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
            <Viewfinder />
          </View>

          <View style={styles.bottomControls}>
            <View style={styles.zoomRow}>
              {([1, 2] as ZoomLevel[]).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.zoomPill, zoomLevel === level && styles.zoomPillActive]}
                  onPress={toggleZoom}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.zoomPillText, zoomLevel === level && styles.zoomPillTextActive]}>
                    {level}×
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
  bottomControls: {
    paddingBottom: 36,
    paddingHorizontal: 30,
    alignItems: 'center',
    gap: 20,
  },
  zoomRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  zoomPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    minWidth: 44,
    alignItems: 'center',
  },
  zoomPillActive: {
    backgroundColor: neonGreen,
    borderColor: neonGreen,
  },
  zoomPillText: {
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    fontSize: 14,
  },
  zoomPillTextActive: {
    color: '#000',
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


