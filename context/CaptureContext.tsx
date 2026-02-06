/**
 * CaptureContext
 * Provides global access to the capture sheet functionality
 */

import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

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

export function CaptureProvider({ children }: CaptureProviderProps) {
  const [isCaptureSheetVisible, setIsCaptureSheetVisible] = useState(false);
  const [captureAction, setCaptureAction] = useState<'snap' | 'describe' | 'log' | 'recipe' | null>(null);
  const [isCaptureVisible, setIsCaptureVisible] = useState(false);

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
