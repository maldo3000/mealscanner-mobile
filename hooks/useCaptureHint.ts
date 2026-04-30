import { useCallback, useEffect, useState } from 'react'

import AsyncStorage from '@react-native-async-storage/async-storage'

const HINT_KEY_PREFIX = '@mealscanner/captureHintSeenCount_'
const MAX_HINT_SHOWS = 3

function hintKey(userId: string): string {
  return `${HINT_KEY_PREFIX}${userId}`
}

interface UseCaptureHintResult {
  shouldShowHint: boolean
  dismissHint: () => void
}

export function useCaptureHint(userId: string): UseCaptureHintResult {
  const [shouldShowHint, setShouldShowHint] = useState(false)

  useEffect(() => {
    const initHint = async () => {
      try {
        const raw = await AsyncStorage.getItem(hintKey(userId))
        const count = raw ? parseInt(raw, 10) : 0
        if (count < MAX_HINT_SHOWS) {
          setShouldShowHint(true)
          await AsyncStorage.setItem(hintKey(userId), String(count + 1))
        }
      } catch {
        // silently fail — hint is non-critical
      }
    }

    void initHint()
  }, [userId])

  const dismissHint = useCallback(() => {
    setShouldShowHint(false)
  }, [])

  return { shouldShowHint, dismissHint }
}

export async function resetCaptureHint(userId: string): Promise<void> {
  await AsyncStorage.removeItem(hintKey(userId))
}
