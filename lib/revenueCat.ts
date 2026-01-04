import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PurchasesPackage,
  PurchasesOffering,
} from 'react-native-purchases';

// RevenueCat API Keys
const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS;
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;

// Entitlement IDs (configured in RevenueCat dashboard)
export const ENTITLEMENTS = {
  PRO: 'MealScanner Pro',
} as const;

// Product IDs (configured in RevenueCat dashboard)
export const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime',
} as const;

// Feature limits for free tier
export const FREE_TIER_LIMITS = {
  DAILY_SCANS: 3,
} as const;

let isConfigured = false;

/**
 * Initialize RevenueCat SDK
 * Call this once when the app starts, after auth is ready
 */
export async function configureRevenueCat(): Promise<void> {
  if (isConfigured) {
    console.log('🛒 RevenueCat already configured');
    return;
  }

  try {
    // Set log level for debugging (reduce in production)
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    const apiKey = Platform.select({
      ios: REVENUECAT_API_KEY_IOS,
      android: REVENUECAT_API_KEY_ANDROID,
      default: REVENUECAT_API_KEY_IOS,
    });

    if (!apiKey) {
      throw new Error('No RevenueCat API key configured for this platform');
    }

    await Purchases.configure({ apiKey });
    isConfigured = true;
    console.log('🛒 RevenueCat configured successfully');
  } catch (error) {
    console.error('🛒 Failed to configure RevenueCat:', error);
    throw error;
  }
}

/**
 * Identify the user with RevenueCat (link to Supabase user ID)
 * Call this when user signs in
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    console.log('🛒 User identified with RevenueCat:', userId);
    return customerInfo;
  } catch (error) {
    console.error('🛒 Failed to identify user:', error);
    throw error;
  }
}

/**
 * Reset to anonymous user (call on sign out)
 */
export async function resetUser(): Promise<void> {
  try {
    // Check if user is already anonymous to avoid RevenueCat warning/error
    const isAnonymous = await Purchases.isAnonymous();
    if (isAnonymous) {
      console.log('🛒 RevenueCat user already anonymous');
      return;
    }

    await Purchases.logOut();
    console.log('🛒 RevenueCat user reset to anonymous');
  } catch (error) {
    // logOut throws if user is already anonymous, which is fine
    console.log('🛒 User already anonymous or error:', error);
  }
}

/**
 * Get current customer info
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (error) {
    console.error('🛒 Failed to get customer info:', error);
    throw error;
  }
}

/**
 * Check if user has Pro entitlement
 */
export function hasProEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  
  const proEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PRO];
  return proEntitlement !== undefined && proEntitlement.isActive;
}

/**
 * Check if user is a beta tester (has Pro via promo code)
 * Beta testers get Pro entitlement through promotional offers
 */
export function isBetaTester(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  
  const proEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PRO];
  if (!proEntitlement) return false;
  
  // Check if the entitlement was granted via promotional offer
  // RevenueCat sets productIdentifier to null or a special value for promo grants
  return proEntitlement.isActive && proEntitlement.ownershipType === 'FAMILY_SHARED' || 
         proEntitlement.periodType === 'intro' ||
         !proEntitlement.productIdentifier;
}

/**
 * Get available offerings (product packages)
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('🛒 Failed to get offerings:', error);
    throw error;
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    console.log('🛒 Purchase successful');
    return customerInfo;
  } catch (error: unknown) {
    // Check if user cancelled
    if (error && typeof error === 'object' && 'userCancelled' in error && (error as { userCancelled: boolean }).userCancelled) {
      console.log('🛒 User cancelled purchase');
      throw new Error('Purchase cancelled');
    }
    console.error('🛒 Purchase failed:', error);
    throw error;
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log('🛒 Purchases restored');
    return customerInfo;
  } catch (error) {
    console.error('🛒 Failed to restore purchases:', error);
    throw error;
  }
}

/**
 * Add listener for customer info updates
 */
export function addCustomerInfoUpdateListener(
  listener: (info: CustomerInfo) => void
): () => void {
  const subscription = Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    if (subscription?.remove) {
      subscription.remove();
    }
  };
}

// Re-export types for convenience
export type { CustomerInfo, PurchasesPackage, PurchasesOffering };

