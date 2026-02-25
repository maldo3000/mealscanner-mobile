import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '@/context/AuthContext'
import { getHowItWorksSeenStatus, markHowItWorksSeen } from '@/lib/supabase'

interface UseHowItWorksTutorialResult {
  isLoadingSeenState: boolean
  hasSeenHowItWorks: boolean
  markHowItWorksSeen: () => Promise<void>
}

const seenCacheByUserId = new Map<string, boolean>()

export function useHowItWorksTutorial(): UseHowItWorksTutorialResult {
  const { user } = useAuth()
  const [isLoadingSeenState, setIsLoadingSeenState] = useState(true)
  const [hasSeenHowItWorks, setHasSeenHowItWorks] = useState(false)

  useEffect(() => {
    const loadSeenState = async () => {
      if (!user?.id) {
        setHasSeenHowItWorks(false)
        setIsLoadingSeenState(false)
        return
      }

      const cachedValue = seenCacheByUserId.get(user.id)
      if (cachedValue !== undefined) {
        setHasSeenHowItWorks(cachedValue)
        setIsLoadingSeenState(false)
        return
      }

      setIsLoadingSeenState(true)
      const { data, error } = await getHowItWorksSeenStatus()
      if (error) {
        console.warn('Failed to load tutorial seen status:', error)
      }

      const seenValue = Boolean(data)
      seenCacheByUserId.set(user.id, seenValue)
      setHasSeenHowItWorks(seenValue)
      setIsLoadingSeenState(false)
    }

    void loadSeenState()
  }, [user?.id])

  const markSeen = useCallback(async (): Promise<void> => {
    if (!user?.id) return

    seenCacheByUserId.set(user.id, true)
    setHasSeenHowItWorks(true)

    const { data, error } = await markHowItWorksSeen()
    if (error || !data) {
      console.warn('Failed to persist tutorial seen status:', error)
    }
  }, [user?.id])

  return {
    isLoadingSeenState,
    hasSeenHowItWorks,
    markHowItWorksSeen: markSeen,
  }
}

export function resetHowItWorksTutorialCache(userId?: string): void {
  if (userId) {
    seenCacheByUserId.delete(userId)
    return
  }

  seenCacheByUserId.clear()
}
