import { useState, useRef, useEffect } from 'react'
import { Audio } from 'expo-av'
import { Platform, Alert } from 'react-native'

/**
 * Minimum recording duration in milliseconds.
 * Recordings shorter than this will be discarded to avoid sending
 * silence/noise to the transcription API.
 */
const MIN_RECORDING_DURATION_MS = 500

interface UseAudioRecorderOptions {
  onRecordingComplete?: (uri: string) => void
  onError?: (error: Error) => void
  /** Minimum recording duration in ms (default: 500ms) */
  minDuration?: number
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const recordingStartTimeRef = useRef<number | null>(null)
  const minDuration = options.minDuration ?? MIN_RECORDING_DURATION_MS

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

      // Clean up any existing recording before creating a new one
      if (recordingRef.current) {
        try {
          const status = await recordingRef.current.getStatusAsync()
          if (status.isRecording) {
            await recordingRef.current.stopAndUnloadAsync()
          } else {
            await recordingRef.current.unloadAsync()
          }
        } catch (cleanupError) {
          console.warn('Error cleaning up previous recording:', cleanupError)
        }
        recordingRef.current = null
        setRecording(null)
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      )

      recordingRef.current = newRecording
      recordingStartTimeRef.current = Date.now()
      setRecording(newRecording)
      setIsRecording(true)
    } catch (error) {
      console.error('Failed to start recording:', error)
      const err = error instanceof Error ? error : new Error('Failed to start recording')
      options.onError?.(err)
      setIsRecording(false)
      // Clean up on error
      recordingRef.current = null
      setRecording(null)
    }
  }

  const stopRecording = async (): Promise<string | null> => {
    try {
      // Store reference before checking
      const currentRecording = recordingRef.current
      const startTime = recordingStartTimeRef.current
      
      if (!currentRecording) {
        // Already cleaned up or never started
        setIsRecording(false)
        setRecording(null)
        recordingStartTimeRef.current = null
        return null
      }

      // Set state first to prevent double-stop calls
      setIsRecording(false)
      
      // Check recording duration
      const recordingDuration = startTime ? Date.now() - startTime : 0
      const isTooShort = recordingDuration < minDuration
      
      if (isTooShort) {
        console.log(`Recording too short (${recordingDuration}ms < ${minDuration}ms), discarding`)
      }
      
      let uri: string | null = null
      
      try {
        // Try to get status first
        const status = await currentRecording.getStatusAsync()
        
        if (status.isRecording) {
          // Recording is active, stop it properly
          await currentRecording.stopAndUnloadAsync()
          uri = isTooShort ? null : currentRecording.getURI()
        } else if (status.canRecord) {
          // Recording exists but not active, just unload
          await currentRecording.unloadAsync()
        }
        // If neither, it's already stopped/unloaded
      } catch (statusError: unknown) {
        // If status check fails, try to stop anyway
        try {
          await currentRecording.stopAndUnloadAsync()
          uri = isTooShort ? null : currentRecording.getURI()
        } catch (stopError) {
          // If stop fails, try unload
          try {
            await currentRecording.unloadAsync()
          } catch (unloadError) {
            // If all fails, just log and continue
            console.warn('Could not clean up recording:', unloadError)
          }
        }
      }
      
      // Clean up refs
      recordingRef.current = null
      recordingStartTimeRef.current = null
      setRecording(null)

      if (uri && options.onRecordingComplete) {
        options.onRecordingComplete(uri)
      }

      return uri
    } catch (error) {
      console.error('Failed to stop recording:', error)
      const err = error instanceof Error ? error : new Error('Failed to stop recording')
      options.onError?.(err)
      // Clean up on error
      recordingRef.current = null
      recordingStartTimeRef.current = null
      setRecording(null)
      setIsRecording(false)
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

