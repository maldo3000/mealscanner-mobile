import { Audio } from 'expo-av'
import { useEffect, useRef, useState } from 'react'
import { Alert, Platform } from 'react-native'

/**
 * Minimum recording duration in milliseconds.
 * Recordings shorter than this will be discarded to avoid sending
 * silence/noise to the transcription API.
 */
const MIN_RECORDING_DURATION_MS = 500

/**
 * Default metering threshold (dB) to consider a recording as silent.
 * Expo metering ranges from roughly -160 (silence) to 0 (loud).
 */
const DEFAULT_SILENCE_THRESHOLD_DB = -50

/** Max retries when iOS audio session fails to activate */
const MAX_SESSION_RETRIES = 3
/** Delay between retries in ms */
const SESSION_RETRY_DELAY_MS = 150

interface UseAudioRecorderOptions {
  onRecordingComplete?: (uri: string) => void | Promise<void>
  onError?: (error: Error) => void
  /** Minimum recording duration in ms (default: 500ms) */
  minDuration?: number
  /** Whether to enable audio metering (for visualization) */
  enableMetering?: boolean
  /** Silence threshold in dB to discard empty recordings (default: -50) */
  silenceThresholdDb?: number
}

/**
 * Helper: activate the iOS audio session for recording.
 * Retries a few times with a short delay to handle the case where
 * the previous session hasn't fully deactivated yet.
 */
async function activateRecordingSession(retries = MAX_SESSION_RETRIES): Promise<void> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })
      return // success
    } catch (err) {
      if (attempt < retries) {
        // Wait for the previous session to fully deactivate before retrying
        await new Promise(r => setTimeout(r, SESSION_RETRY_DELAY_MS))
      } else {
        throw err
      }
    }
  }
}

/**
 * Helper: deactivate the recording-specific audio session.
 * This tells iOS the app is done recording so the session can be
 * cleanly reactivated later.
 */
async function deactivateRecordingSession(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    })
  } catch {
    // Non-critical — best-effort deactivation
  }
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const [isRecording, setIsRecording] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [metering, setMetering] = useState<number>(-160)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const operationQueueRef = useRef<Promise<unknown>>(Promise.resolve())
  const recordingStartTimeRef = useRef<number | null>(null)
  const maxMeteringRef = useRef<number>(-160)
  const minDuration = options.minDuration ?? MIN_RECORDING_DURATION_MS
  const silenceThresholdDb = options.silenceThresholdDb ?? DEFAULT_SILENCE_THRESHOLD_DB

  useEffect(() => {
    requestPermissions()

    return () => {
      // Cleanup: stop recording if still active and deactivate session
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync()
          .then(() => deactivateRecordingSession())
          .catch(console.error)
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

  const runExclusive = async <T>(operation: () => Promise<T>): Promise<T> => {
    const run = operationQueueRef.current.then(operation, operation)
    operationQueueRef.current = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }

  const handleStatusUpdate = (status: Audio.RecordingStatus) => {
    if (status.metering !== undefined) {
      setMetering(status.metering)
      if (status.metering > maxMeteringRef.current) {
        maxMeteringRef.current = status.metering
      }
    }
  }

  const startRecording = async (): Promise<void> => {
    await runExclusive(async () => {
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

          // Deactivate first so iOS fully releases the session,
          // then the retry loop in activateRecordingSession can re-acquire it cleanly
          await deactivateRecordingSession()
        }

        // Activate session with retry logic to handle iOS timing issues
        await activateRecordingSession()

        const recordingOptions = {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          ...(options.enableMetering ? { isMeteringEnabled: true } : {}),
        }

        const { recording: newRecording } = await Audio.Recording.createAsync(
          recordingOptions,
          options.enableMetering ? handleStatusUpdate : undefined,
          options.enableMetering ? 100 : undefined // Update every 100ms for smooth animation
        )

        recordingRef.current = newRecording
        recordingStartTimeRef.current = Date.now()
        maxMeteringRef.current = -160
        setRecording(newRecording)
        setIsRecording(true)
        setMetering(-160)
      } catch (error) {
        console.error('Failed to start recording:', error)
        const err = error instanceof Error ? error : new Error('Failed to start recording')
        options.onError?.(err)
        setIsRecording(false)
        // Clean up on error
        recordingRef.current = null
        setRecording(null)
      }
    })
  }

  const stopRecording = async (): Promise<string | null> => {
    return runExclusive(async () => {
      try {
        // Store reference before checking
        const currentRecording = recordingRef.current
        const startTime = recordingStartTimeRef.current

        if (!currentRecording) {
          // Already cleaned up or never started
          setIsRecording(false)
          setRecording(null)
          recordingStartTimeRef.current = null
          setMetering(-160)
          return null
        }

        // Set state first to prevent double-stop calls
        setIsRecording(false)
        setMetering(-160)

        // Check recording duration
        const recordingDuration = startTime ? Date.now() - startTime : 0
        const isTooShort = recordingDuration < minDuration
        const shouldCheckSilence = options.enableMetering === true
        const isSilent = shouldCheckSilence && maxMeteringRef.current < silenceThresholdDb

        if (isTooShort) {
          console.log(`Recording too short (${recordingDuration}ms < ${minDuration}ms), discarding`)
        }
        if (isSilent) {
          console.log(`Recording silent (peak ${maxMeteringRef.current}dB < ${silenceThresholdDb}dB), discarding`)
        }

        let uri: string | null = null

        try {
          // Try to get status first
          const status = await currentRecording.getStatusAsync()

          if (status.isRecording) {
            // Recording is active, stop it properly
            await currentRecording.stopAndUnloadAsync()
            const shouldDiscard = isTooShort || isSilent
            uri = shouldDiscard ? null : currentRecording.getURI()
          } else if (status.canRecord) {
            // Recording exists but not active, just unload
            await currentRecording.unloadAsync()
          }
          // If neither, it's already stopped/unloaded
        } catch {
          // If status check fails, try to stop anyway
          try {
            await currentRecording.stopAndUnloadAsync()
            const shouldDiscard = isTooShort || isSilent
            uri = shouldDiscard ? null : currentRecording.getURI()
          } catch {
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

        // Deactivate the recording session so iOS fully releases it.
        // This ensures the next startRecording can cleanly re-acquire the session.
        await deactivateRecordingSession()

        if (uri && options.onRecordingComplete) {
          await options.onRecordingComplete(uri)
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
        setMetering(-160)
        await deactivateRecordingSession()
        return null
      }
    })
  }

  return {
    isRecording,
    hasPermission,
    metering,
    startRecording,
    stopRecording,
  }
}

