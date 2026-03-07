import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Platform } from 'react-native'
import {
  useAudioRecorder as useExpoAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorderState,
  type RecorderState,
} from 'expo-audio'

const MIN_RECORDING_DURATION_MS = 500
const DEFAULT_SILENCE_THRESHOLD_DB = -50

interface UseAudioRecorderOptions {
  onRecordingComplete?: (uri: string) => void | Promise<void>
  onError?: (error: Error) => void
  minDuration?: number
  enableMetering?: boolean
  silenceThresholdDb?: number
}

export function useAudioRecorder(options: UseAudioRecorderOptions = {}) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const recordingStartTimeRef = useRef<number | null>(null)
  const maxMeteringRef = useRef<number>(-160)
  const minDuration = options.minDuration ?? MIN_RECORDING_DURATION_MS
  const silenceThresholdDb = options.silenceThresholdDb ?? DEFAULT_SILENCE_THRESHOLD_DB

  const recordingOptions = {
    ...RecordingPresets.HIGH_QUALITY,
    ...(options.enableMetering ? { isMeteringEnabled: true } : {}),
  }

  const recorder = useExpoAudioRecorder(recordingOptions, (status) => {
    if (status.hasError) {
      options.onError?.(new Error('Recording error'))
    }
  })

  const recorderState = useAudioRecorderState(recorder, 100)

  const metering = recorderState.metering ?? -160

  useEffect(() => {
    if (metering > maxMeteringRef.current) {
      maxMeteringRef.current = metering
    }
  }, [metering])

  useEffect(() => {
    requestPermissions()
  }, [])

  const requestPermissions = async () => {
    try {
      if (Platform.OS === 'web') {
        setHasPermission(true)
        return
      }

      const status = await AudioModule.requestRecordingPermissionsAsync()
      setHasPermission(status.granted)

      if (!status.granted) {
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

  const startRecording = useCallback(async (): Promise<void> => {
    try {
      if (hasPermission === false) {
        await requestPermissions()
        if (hasPermission === false) {
          options.onError?.(new Error('Microphone permission denied'))
          return
        }
      }

      if (Platform.OS === 'web') {
        Alert.alert('Web Recording', 'Web audio recording requires additional setup. Please use a mobile device.')
        return
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      })

      recordingStartTimeRef.current = Date.now()
      maxMeteringRef.current = -160

      await recorder.prepareToRecordAsync()
      recorder.record()
    } catch (error) {
      console.error('Failed to start recording:', error)
      const err = error instanceof Error ? error : new Error('Failed to start recording')
      options.onError?.(err)
    }
  }, [hasPermission, recorder, options])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    try {
      const startTime = recordingStartTimeRef.current

      if (!recorderState.isRecording) {
        recordingStartTimeRef.current = null
        return null
      }

      await recorder.stop()

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      })

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

      recordingStartTimeRef.current = null

      const shouldDiscard = isTooShort || isSilent
      const uri = shouldDiscard ? null : recorder.uri

      if (uri && options.onRecordingComplete) {
        // Do not block stopRecording on network transcription work.
        // This keeps UI controls responsive (e.g., cancel/close) while transcription runs.
        void Promise.resolve(options.onRecordingComplete(uri)).catch((callbackError: unknown) => {
          const err =
            callbackError instanceof Error
              ? callbackError
              : new Error('Failed to process completed recording')
          options.onError?.(err)
        })
      }

      return uri
    } catch (error) {
      console.error('Failed to stop recording:', error)
      const err = error instanceof Error ? error : new Error('Failed to stop recording')
      options.onError?.(err)
      recordingStartTimeRef.current = null
      return null
    }
  }, [recorder, recorderState.isRecording, minDuration, silenceThresholdDb, options])

  return {
    isRecording: recorderState.isRecording,
    hasPermission,
    metering,
    startRecording,
    stopRecording,
  }
}
