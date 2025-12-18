import { useState, useRef, useEffect } from 'react'
import { Audio } from 'expo-av'
import { Platform, Alert } from 'react-native'

interface UseAudioRecorderOptions {
  onRecordingComplete?: (uri: string) => void
  onError?: (error: Error) => void
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const recordingRef = useRef<Audio.Recording | null>(null)

  useEffect(() => {
    requestPermissions()
    
    // Set audio mode when component mounts
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    })

    return () => {
      // Cleanup: stop recording if still active
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(console.error)
      }
    }
  }, [])

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web doesn't need explicit permission for MediaRecorder
        setHasPermission(true)
        return
      }

      const { status } = await Audio.requestPermissionsAsync()
      setHasPermission(status === 'granted')
      
      if (status !== 'granted') {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in your device settings to use voice input.'
        )
      }
    } catch (error) {
      console.error('Error requesting audio permissions:', error)
      setHasPermission(false)
    }
  }

  const startRecording = async () => {
    try {
      if (hasPermission === false) {
        await requestPermissions()
        if (hasPermission === false) {
          options.onError?.(new Error('Microphone permission denied'))
          return
        }
      }

      if (Platform.OS === 'web') {
        // Web implementation would use MediaRecorder API
        Alert.alert('Web Recording', 'Web audio recording requires additional setup. Please use a mobile device.')
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )

      recordingRef.current = newRecording
      setRecording(newRecording)
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      const err = error instanceof Error ? error : new Error('Failed to start recording')
      options.onError?.(err)
      setIsRecording(false)
    }
  }

  const stopRecording = async (): Promise<string | null> => {
    try {
      if (!recordingRef.current) {
        return null
      }

      setIsRecording(false)
      
      await recordingRef.current.stopAndUnloadAsync()
      const uri = recordingRef.current.getURI()
      
      recordingRef.current = null
      setRecording(null)

      if (uri && options.onRecordingComplete) {
        options.onRecordingComplete(uri)
      }

      return uri
    } catch (error) {
      console.error('Failed to stop recording:', error)
      const err = error instanceof Error ? error : new Error('Failed to stop recording')
      options.onError?.(err)
      return null
    }
  }

  return {
    isRecording,
    hasPermission,
    startRecording,
    stopRecording,
  }
}

