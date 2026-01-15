import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import RevenueCatUI from 'react-native-purchases-ui';

import {
  configureRevenueCat,
  identifyUser,
  resetUser,
  getCustomerInfo,
  hasProEntitlement,
  isBetaTester as checkIsBetaTester,
  purchasePackage,
  restorePurchases,
  addCustomerInfoUpdateListener,
  ENTITLEMENTS,
  type CustomerInfo,
  type PurchasesPackage,
} from '@/lib/revenueCat';
import { updateUserProfile } from '@/lib/supabase';
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
  ensureSubscriptionSynced: () => Promise<boolean>;
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

  // Sync Pro status to Supabase profile
  useEffect(() => {
    async function syncProStatus() {
      if (!user?.id || isLoading) return;

      try {
        const targetTier = isPro || isBetaTester ? 'pro' : 'free';
        
        const { error } = await updateUserProfile(user.id, { 
          subscription_tier: targetTier 
        });
        
        if (error) {
          console.error('🛒 Failed to sync subscription to Supabase:', error);
        } else {
          console.log(`🛒 Synced subscription status to Supabase: ${targetTier}`);
        }
      } catch (error) {
        console.error('🛒 Failed to sync subscription to Supabase:', error);
      }
    }

    syncProStatus();
  }, [user?.id, isPro, isBetaTester, isLoading]);

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
  const handleEnsureSubscriptionSynced = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      console.warn('🛒 Cannot sync subscription: no user');
      return false;
    }

    try {
      const targetTier = isPro || isBetaTester ? 'pro' : 'free';
      console.log(`🛒 Ensuring subscription synced to database: ${targetTier}`);
      
      const { error } = await updateUserProfile(user.id, { 
        subscription_tier: targetTier 
      });
      
      if (error) {
        console.error('🛒 Failed to sync subscription before operation:', error);
        return false;
      }
      
      console.log(`🛒 ✅ Subscription tier confirmed in database: ${targetTier}`);
      return true;
    } catch (error) {
      console.error('🛒 Failed to sync subscription before operation:', error);
      return false;
    }
  }, [user?.id, isPro, isBetaTester]);

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

