import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, AppState } from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { useRevenueCatIdentity } from '@/hooks/useRevenueCatIdentity';
import { isBetaTester as checkIsBetaTester, getCustomerInfo, hasProEntitlement, purchasePackage, restorePurchases, type CustomerInfo, type PurchasesPackage } from '@/lib/revenueCat';
import { confirmSubscription } from '@/lib/subscriptionSync';
import { syncSubscriptionTier } from '@/lib/supabase';
import { useAuth } from './AuthContext';

type ActivationStatus = 'idle' | 'syncing' | 'active' | 'pending';
interface SubscriptionContextType {
  isLoading: boolean;
  isPro: boolean;
  isBetaTester: boolean;
  customerInfo: CustomerInfo | null;
  activationStatus: ActivationStatus;
  initializationError: string | null;
  retryInitialization: () => void;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  showPaywall: () => Promise<boolean>;
  showCustomerCenter: () => Promise<void>;
  refreshCustomerInfo: () => Promise<void>;
  ensureSubscriptionSynced: (options?: { expectedIsPro?: boolean }) => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const identity = useRevenueCatIdentity(userId, authLoading);
  const { customerInfo, isLoading, setCustomerInfo } = identity;
  const isPro = !!userId && hasProEntitlement(customerInfo);
  const currentUser = useRef(userId);
  const generation = useRef(0);
  if (currentUser.current !== userId) generation.current++;
  const currentGeneration = generation.current;
  currentUser.current = userId;
  const mounted = useRef(true);
  const operationInFlight = useRef(false);
  const syncInFlight = useRef<{ key: string; promise: Promise<boolean> } | null>(null);
  const [activation, setActivation] = useState<{ userId: string | null; generation: number; status: ActivationStatus }>({ userId: null, generation: -1, status: 'idle' });
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const isCurrent = useCallback(() => mounted.current && currentUser.current === userId && generation.current === currentGeneration, [userId, currentGeneration]);

  const ensureSubscriptionSynced = useCallback((options?: { expectedIsPro?: boolean }): Promise<boolean> => {
    if (!userId || !isCurrent() || isLoading || identity.error) return Promise.resolve(false);
    const expectedIsPro = options?.expectedIsPro ?? isPro;
    const key = userId + ':' + currentGeneration + ':' + expectedIsPro;
    if (syncInFlight.current?.key === key) return syncInFlight.current.promise;
    setActivation({ userId, generation: currentGeneration, status: 'syncing' });
    const promise = confirmSubscription({ userId, expectedIsPro, sync: syncSubscriptionTier, isCurrent })
      .then(confirmed => {
        if (isCurrent() && syncInFlight.current?.promise === promise) {
          setActivation({ userId, generation: currentGeneration, status: confirmed ? (expectedIsPro ? 'active' : 'idle') : 'pending' });
        }
        return confirmed;
      }).finally(() => {
        if (syncInFlight.current?.promise === promise) syncInFlight.current = null;
      });
    syncInFlight.current = { key, promise };
    return promise;
  }, [userId, currentGeneration, isPro, isLoading, identity.error, isCurrent]);

  useEffect(() => {
    if (userId && !isLoading && !identity.error) void ensureSubscriptionSynced({ expectedIsPro: isPro });
  }, [userId, isLoading, isPro, identity.error, ensureSubscriptionSynced]);

  const ready = useCallback(() => {
    if (!userId || isLoading || identity.error || !isCurrent()) {
      Alert.alert('Subscriptions unavailable', !userId ? 'Please sign in first.' : 'Subscription setup is not ready. Please retry in a moment.');
      return false;
    }
    return true;
  }, [userId, isLoading, identity.error, isCurrent]);

  const activate = useCallback(async (info: CustomerInfo): Promise<boolean> => {
    if (!isCurrent()) return false;
    setCustomerInfo(info);
    if (!hasProEntitlement(info)) return false;
    const confirmed = await ensureSubscriptionSynced({ expectedIsPro: true });
    if (!isCurrent()) return false;
    if (!confirmed) Alert.alert('Purchase received — activation pending', 'Your store purchase is recorded. Pro could not be confirmed on our server yet. Use Retry Activation; you do not need to purchase again.');
    return confirmed;
  }, [isCurrent, setCustomerInfo, ensureSubscriptionSynced]);

  const handlePurchase = useCallback(async (pkg: PurchasesPackage) => {
    if (!ready() || operationInFlight.current) return false;
    operationInFlight.current = true;
    try {
      const info = await getCustomerInfo();
      if (!isCurrent()) return false;
      // Do not buy again while an existing entitlement awaits server activation.
      return await activate(hasProEntitlement(info) ? info : await purchasePackage(pkg));
    } catch (error) {
      if (isCurrent() && (!(error instanceof Error) || error.message !== 'Purchase cancelled')) {
        Alert.alert('Purchase Failed', error instanceof Error ? error.message : 'Please try again.');
      }
      return false;
    } finally { operationInFlight.current = false; }
  }, [ready, isCurrent, activate]);

  const handleRestore = useCallback(async () => {
    if (!ready() || operationInFlight.current) return false;
    operationInFlight.current = true;
    try {
      const info = await restorePurchases();
      if (!isCurrent()) return false;
      setCustomerInfo(info);
      if (!hasProEntitlement(info)) {
        Alert.alert('No Purchases Found', 'No active Pro purchase was found for this store account.');
        return false;
      }
      const restored = await activate(info);
      if (restored) Alert.alert('Restored', 'Your Pro access has been restored.');
      return restored;
    } catch (error) {
      if (isCurrent()) Alert.alert('Restore Failed', error instanceof Error ? error.message : 'Please try again.');
      return false;
    } finally { operationInFlight.current = false; }
  }, [ready, isCurrent, setCustomerInfo, activate]);

  const handleShowPaywall = useCallback(async () => {
    if (!ready() || operationInFlight.current) return false;
    operationInFlight.current = true;
    try {
      const existing = await getCustomerInfo();
      if (!isCurrent()) return false;
      if (hasProEntitlement(existing)) return await activate(existing);
      const result = await RevenueCatUI.presentPaywall();
      if (!isCurrent()) return false;
      if (result === PAYWALL_RESULT.ERROR) {
        Alert.alert('Paywall unavailable', 'Subscription options could not be loaded. Please try again.');
        return false;
      }
      if (result !== PAYWALL_RESULT.PURCHASED && result !== PAYWALL_RESULT.RESTORED) return false;
      return await activate(await getCustomerInfo());
    } catch (error) {
      if (isCurrent()) Alert.alert('Paywall unavailable', error instanceof Error ? error.message : 'Please try again.');
      return false;
    } finally { operationInFlight.current = false; }
  }, [ready, isCurrent, activate]);

  const refreshCustomerInfo = useCallback(async () => {
    if (!userId || isLoading || identity.error) return;
    try {
      const info = await getCustomerInfo();
      if (!isCurrent()) return;
      setCustomerInfo(info);
      await ensureSubscriptionSynced({ expectedIsPro: hasProEntitlement(info) });
    } catch (error) { console.error('Subscription refresh failed:', error); }
  }, [userId, isLoading, identity.error, isCurrent, setCustomerInfo, ensureSubscriptionSynced]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshCustomerInfo();
    });
    return () => listener.remove();
  }, [refreshCustomerInfo]);

  const showCustomerCenter = useCallback(async () => {
    if (!ready()) return;
    try {
      await RevenueCatUI.presentCustomerCenter();
      await refreshCustomerInfo();
    } catch (error) {
      console.error('Customer Center unavailable:', error);
      Alert.alert('Manage Subscription', 'You can manage your subscription in your App Store or Play Store account settings.');
    }
  }, [ready, refreshCustomerInfo]);

  return <SubscriptionContext.Provider value={{
    isLoading, isPro, isBetaTester: isPro && checkIsBetaTester(customerInfo), customerInfo,
    activationStatus: activation.userId === userId && activation.generation === currentGeneration ? activation.status : 'idle',
    initializationError: identity.error, retryInitialization: identity.retry,
    purchasePackage: handlePurchase, restorePurchases: handleRestore, showPaywall: handleShowPaywall,
    showCustomerCenter, refreshCustomerInfo, ensureSubscriptionSynced,
  }}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error('useSubscription must be used within a SubscriptionProvider');
  return context;
}
