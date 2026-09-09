import { useCallback, useEffect, useRef, useState } from 'react';
import { addCustomerInfoUpdateListener, configureRevenueCat, getCustomerInfo, identifyUser, resetUser, type CustomerInfo } from '@/lib/revenueCat';

let identityQueue: Promise<void> = Promise.resolve();

interface IdentityState {
  userId: string | null | undefined;
  info: CustomerInfo | null;
  error: string | null;
  loading: boolean;
}

export function useRevenueCatIdentity(userId: string | null, authLoading: boolean) {
  const currentUser = useRef(userId);
  const generation = useRef(0);
  if (currentUser.current !== userId) generation.current++;
  const currentGeneration = generation.current;
  currentUser.current = userId;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<IdentityState>({ userId: undefined, info: null, error: null, loading: true });

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    setState({ userId, info: null, error: null, loading: true });
    const initialize = async () => {
      if (cancelled) return;
      try {
        await configureRevenueCat();
        if (cancelled) return;
        if (!userId) await resetUser();
        const info = userId ? await identifyUser(userId) : await getCustomerInfo();
        if (cancelled) return;
        setState({ userId, info, error: null, loading: false });
        unsubscribe = addCustomerInfoUpdateListener(updated => {
          if (!cancelled && currentUser.current === userId) {
            setState({ userId, info: updated, error: null, loading: false });
          }
        });
      } catch (error) {
        if (!cancelled) setState({ userId, info: null, error: error instanceof Error ? error.message : 'Subscriptions are unavailable. Please retry.', loading: false });
      }
    };
    identityQueue = identityQueue.then(initialize, initialize);
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [userId, authLoading, revision]);

  const setCustomerInfo = useCallback((info: CustomerInfo) => {
    if (currentUser.current === userId && generation.current === currentGeneration) {
      setState({ userId, info, error: null, loading: false });
    }
  }, [userId, currentGeneration]);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  const matchesUser = state.userId === userId;
  return {
    customerInfo: matchesUser ? state.info : null,
    isLoading: authLoading || !matchesUser || state.loading,
    error: matchesUser ? state.error : null,
    setCustomerInfo,
    retry,
  };
}
