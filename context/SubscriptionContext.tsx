import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';

import {
    addCustomerInfoUpdateListener,
    isBetaTester as checkIsBetaTester,
    configureRevenueCat,
    getCustomerInfo,
    hasProEntitlement,
    identifyUser,
    purchasePackage,
    resetUser,
    restorePurchases,
    type CustomerInfo, type PurchasesPackage,
} from '@/lib/revenueCat';
import { syncSubscriptionTier } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface SubscriptionContextType {
  /** Whether the subscription system is still loading */
  isLoading: boolean;
  /** Whether the user has Pro access (subscription or beta) */
  isPro: boolean;
  /** Whether the user is a beta tester */
  isBetaTester: boolean;
  /** Current customer info from RevenueCat */
  customerInfo: CustomerInfo | null;
  /** Purchase a specific package */
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore previous purchases */
  restorePurchases: () => Promise<boolean>;
  /** Show the RevenueCat paywall */
  showPaywall: () => Promise<boolean>;
  /** Show the RevenueCat Customer Center */
  showCustomerCenter: () => Promise<void>;
  /** Refresh customer info */
  refreshCustomerInfo: () => Promise<void>;
  /** 
   * Ensures the current subscription status is synced to the database.
   * Call this before operations that depend on backend reading the subscription tier.
   * Returns true if sync succeeded.
   */
  ensureSubscriptionSynced: (options?: { expectedIsPro?: boolean }) => Promise<boolean>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);

  // Derived state
  const isPro = hasProEntitlement(customerInfo);
  const isBetaTester = checkIsBetaTester(customerInfo);

  // Initialize RevenueCat and sync with auth
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function initialize() {
      try {
        // Configure RevenueCat SDK
        await configureRevenueCat();

        // Set up customer info listener
        unsubscribe = addCustomerInfoUpdateListener((info) => {
          console.log('🛒 Customer info updated');
          setCustomerInfo(info);
        });

        // If we already have a user, identify them
        if (user?.id) {
          const info = await identifyUser(user.id);
          setCustomerInfo(info);
        } else {
          // Get anonymous customer info
          const info = await getCustomerInfo();
          setCustomerInfo(info);
        }
      } catch (error) {
        console.error('🛒 Failed to initialize RevenueCat:', error);
      } finally {
        setIsLoading(false);
      }
    }

    // Only initialize after auth is ready
    if (!isAuthLoading) {
      initialize();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthLoading]);

  // Sync user identity when auth changes
  useEffect(() => {
    async function syncUser() {
      if (isLoading) return; // Wait for initial setup

      try {
        if (user?.id) {
          const info = await identifyUser(user.id);
          setCustomerInfo(info);
        } else {
          await resetUser();
          const info = await getCustomerInfo();
          setCustomerInfo(info);
        }
      } catch (error) {
        console.error('🛒 Failed to sync user:', error);
      }
    }

    syncUser();
  }, [user?.id, isLoading]);

  // Sync subscription status to Supabase profile (server-authoritative)
  useEffect(() => {
    async function syncProStatus() {
      if (!user?.id || isLoading) return;

      try {
        const { error } = await syncSubscriptionTier();
        
        if (error) {
          console.error('🛒 Failed to sync subscription to Supabase:', error);
        } else {
          console.log('🛒 Synced subscription status to Supabase (server-authoritative)');
        }
      } catch (error) {
        console.error('🛒 Failed to sync subscription to Supabase:', error);
      }
    }

    syncProStatus();
  }, [user?.id, isPro, isBetaTester, isLoading]);

  const formatSyncError = (error: unknown): Record<string, string | undefined> => {
    if (!error || typeof error !== 'object') {
      return { message: String(error) };
    }

    const candidate = error as {
      message?: string;
      code?: string;
      details?: string;
      hint?: string;
    };

    return {
      message: candidate.message,
      code: candidate.code,
      details: candidate.details,
      hint: candidate.hint,
    };
  };

  const syncSubscriptionTierWithRetries = useCallback(async (options?: { expectedIsPro?: boolean }): Promise<boolean> => {
    if (!user?.id) {
      console.warn('🛒 Cannot sync subscription: no user');
      return false;
    }

    const expectedIsPro = options?.expectedIsPro;
    const MAX_ATTEMPTS = 3;
    const BASE_DELAY_MS = 800;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`🛒 Ensuring subscription synced (attempt ${attempt}/${MAX_ATTEMPTS})`);

        const { data, error } = await syncSubscriptionTier();

        if (!error) {
          const syncedIsPro = (data as { is_pro?: boolean } | null)?.is_pro;
          if (typeof expectedIsPro === 'boolean' && typeof syncedIsPro === 'boolean' && syncedIsPro !== expectedIsPro) {
            console.warn(
              `🛒 Sync attempt ${attempt}/${MAX_ATTEMPTS} mismatch: expected is_pro=${expectedIsPro}, got is_pro=${syncedIsPro}`,
            );
          } else {
            console.log('🛒 ✅ Subscription tier confirmed in database');
            return true;
          }
        } else {
          console.warn(
            `🛒 Sync attempt ${attempt}/${MAX_ATTEMPTS} failed:`,
            formatSyncError(error),
          );
        }
      } catch (error) {
        console.warn(
          `🛒 Sync attempt ${attempt}/${MAX_ATTEMPTS} threw:`,
          formatSyncError(error),
        );
      }

      if (attempt < MAX_ATTEMPTS) {
        const delay = BASE_DELAY_MS * attempt;
        console.log(`🛒 Retrying in ${delay}ms...`);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }

    console.error('🛒 All sync attempts exhausted — returning false');
    return false;
  }, [user?.id]);

  const handlePurchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const info = await purchasePackage(pkg);
      setCustomerInfo(info);
      return hasProEntitlement(info);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Purchase failed';
      if (message !== 'Purchase cancelled') {
        Alert.alert('Purchase Failed', message);
      }
      return false;
    }
  }, []);

  const handleRestorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const info = await restorePurchases();
      setCustomerInfo(info);
      
      if (hasProEntitlement(info)) {
        const synced = await syncSubscriptionTierWithRetries({ expectedIsPro: true });
        if (!synced) {
          Alert.alert(
            'Restored with a delay',
            'Your purchase was restored, but we could not confirm Pro on our server yet. Please wait a moment and try again.'
          );
          return false;
        }

        Alert.alert('Restored!', 'Your Pro subscription has been restored.');
        return true;
      } else {
        Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore purchases';
      Alert.alert('Restore Failed', message);
      return false;
    }
  }, []);

  const handleShowPaywall = useCallback(async (): Promise<boolean> => {
    try {
      // Use RevenueCatUI to present the native paywall
      const paywallResult = await RevenueCatUI.presentPaywall();
      
      // Refresh customer info after paywall closes
      const info = await getCustomerInfo();
      setCustomerInfo(info);
      
      // Check if purchase was made
      return paywallResult === 'PURCHASED' || paywallResult === 'RESTORED';
    } catch (error) {
      console.error('🛒 Paywall error:', error);
      return false;
    }
  }, []);

  const handleShowCustomerCenter = useCallback(async (): Promise<void> => {
    try {
      await RevenueCatUI.presentCustomerCenter();
    } catch (error) {
      console.error('🛒 Customer Center error:', error);
      // Fallback: show alert with options
      Alert.alert(
        'Manage Subscription',
        'To manage your subscription, please visit the App Store settings.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleRefreshCustomerInfo = useCallback(async (): Promise<void> => {
    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error('🛒 Failed to refresh customer info:', error);
    }
  }, []);

  /**
   * Ensures the current subscription status is synced to the database.
   * This is critical before operations that depend on backend reading the subscription tier
   * (e.g., meal analysis, which checks isPro to determine extended nutrition data).
   *
   * Without this, there's a race condition where the user upgrades, but the backend
   * reads stale 'free' status from the database, resulting in missing fiber/sugar/sodium/cholesterol.
   */
  const handleEnsureSubscriptionSynced = useCallback(
    async (options?: { expectedIsPro?: boolean }): Promise<boolean> => {
      return syncSubscriptionTierWithRetries(options);
    },
    [syncSubscriptionTierWithRetries]
  );

  return (
    <SubscriptionContext.Provider
      value={{
        isLoading: isLoading || isAuthLoading,
        isPro,
        isBetaTester,
        customerInfo,
        purchasePackage: handlePurchasePackage,
        restorePurchases: handleRestorePurchases,
        showPaywall: handleShowPaywall,
        showCustomerCenter: handleShowCustomerCenter,
        refreshCustomerInfo: handleRefreshCustomerInfo,
        ensureSubscriptionSynced: handleEnsureSubscriptionSynced,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextType {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

