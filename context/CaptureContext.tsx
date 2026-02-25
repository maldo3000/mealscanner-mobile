/**
 * CaptureContext
 * Provides global access to the capture sheet functionality
 */

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/context/AuthContext';

interface CaptureContextType {
  /** Whether the capture action sheet is visible */
  isCaptureSheetVisible: boolean;
  /** Open the capture action sheet */
  openCaptureSheet: () => void;
  /** Close the capture action sheet */
  closeCaptureSheet: () => void;
  /** Current capture action */
  captureAction: 'snap' | 'describe' | 'log' | 'recipe' | null;
  /** Set the capture action */
  setCaptureAction: (action: 'snap' | 'describe' | 'log' | 'recipe' | null) => void;
  /** Whether capture mode is active */
  isCaptureVisible: boolean;
  /** Set capture visibility */
  setIsCaptureVisible: (visible: boolean) => void;
}

const CaptureContext = createContext<CaptureContextType | undefined>(undefined);

interface CaptureProviderProps {
  children: ReactNode;
}

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
};

let AsyncStorage: AsyncStorageLike | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default as AsyncStorageLike;
}

const CAPTURE_DRAFT_STORAGE_BASE_KEY = 'capture_meal_draft_v1';

function hasDraftItems(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { version?: number; items?: unknown };
    if (parsed?.version !== 1) return false;
    return Array.isArray(parsed.items) && parsed.items.length > 0;
  } catch {
    return false;
  }
}

export function CaptureProvider({ children }: CaptureProviderProps) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isCaptureSheetVisible, setIsCaptureSheetVisible] = useState(false);
  const [captureAction, setCaptureAction] = useState<'snap' | 'describe' | 'log' | 'recipe' | null>(null);
  const [isCaptureVisible, setIsCaptureVisible] = useState(false);

  // Resume capture tray if a draft exists (e.g., app restart mid-capture).
  // This keeps behavior consistent even when the heavy capture controller is lazy-loaded.
  useEffect(() => {
    let cancelled = false;

    async function restoreIfNeeded(): Promise<void> {
      if (!AsyncStorage) return;
      if (isAuthLoading) return;

      const userId = user?.id ?? 'guest';
      const key = `${CAPTURE_DRAFT_STORAGE_BASE_KEY}_${userId}`;

      try {
        const raw = await AsyncStorage.getItem(key);
        if (cancelled) return;
        if (hasDraftItems(raw)) {
          setIsCaptureVisible(true);
        }
      } catch {
        // ignore
      }
    }

    void restoreIfNeeded();
    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, user?.id]);

  const openCaptureSheet = useCallback(() => {
    setIsCaptureSheetVisible(true);
  }, []);

  const closeCaptureSheet = useCallback(() => {
    setIsCaptureSheetVisible(false);
  }, []);

  return (
    <CaptureContext.Provider
      value={{
        isCaptureSheetVisible,
        openCaptureSheet,
        closeCaptureSheet,
        captureAction,
        setCaptureAction,
        isCaptureVisible,
        setIsCaptureVisible,
      }}
    >
      {children}
    </CaptureContext.Provider>
  );
}

export function useCapture(): CaptureContextType {
  const context = useContext(CaptureContext);
  if (!context) {
    throw new Error('useCapture must be used within a CaptureProvider');
  }
  return context;
}

/**
 * Hook that safely returns capture context, or null if not in provider
 * Use this when you need optional access to capture functionality
 */
export function useCaptureOptional(): CaptureContextType | null {
  const context = useContext(CaptureContext);
  return context || null;
}
