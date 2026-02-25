// RevenueCat mock implementation for web mode testing
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { mockSubscriptionData, mockUser } from './webMocks';

// Mock CustomerInfo for web testing
export const mockCustomerInfo: CustomerInfo = {
  entitlements: {
    active: {
      'MealScanner Pro': {
        identifier: 'MealScanner Pro',
        isActive: true,
        willRenew: true,
        latestPurchaseDate: new Date().toISOString(),
        originalPurchaseDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        expirationDate: mockSubscriptionData.expirationDate,
        productIdentifier: 'mealscanner_pro_annual',
        store: 'APP_STORE',
        periodType: 'normal',
        ownershipType: 'PURCHASED'
      }
    },
    all: {}
  },
  activeSubscriptions: ['mealscanner_pro_annual'],
  allPurchasedProductIdentifiers: ['mealscanner_pro_annual'],
  latestExpirationDate: mockSubscriptionData.expirationDate,
  firstSeen: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
  originalAppUserId: mockUser.id,
  requestDate: new Date().toISOString(),
  allExpirationDatesByProduct: {
    'mealscanner_pro_annual': mockSubscriptionData.expirationDate
  },
  allPurchaseDatesByProduct: {
    'mealscanner_pro_annual': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  }
};

// Mock packages for web testing
export const mockPackages: PurchasesPackage[] = [
  {
    identifier: '$rc_monthly',
    packageType: 'MONTHLY',
    product: {
      identifier: 'monthly',
      description: 'MealScanner Pro Monthly',
      title: 'MealScanner Pro Monthly',
      price: 4.99,
      priceString: '$4.99',
      currencyCode: 'USD',
      introPrice: null
    },
    offeringIdentifier: 'default'
  },
  {
    identifier: '$rc_annual',
    packageType: 'ANNUAL', 
    product: {
      identifier: 'yearly',
      description: 'MealScanner Pro Annual',
      title: 'MealScanner Pro Annual (Save 50%)',
      price: 47.99,
      priceString: '$47.99',
      currencyCode: 'USD',
      introPrice: null
    },
    offeringIdentifier: 'default'
  },
  {
    identifier: '$rc_lifetime',
    packageType: 'LIFETIME',
    product: {
      identifier: 'lifetime',
      description: 'MealScanner Pro Lifetime',
      title: 'MealScanner Pro Lifetime',
      price: 199.99,
      priceString: '$199.99',
      currencyCode: 'USD',
      introPrice: null
    },
    offeringIdentifier: 'default'
  }
];

// Mock offerings for web testing
export const mockOfferings: PurchasesOffering = {
  identifier: 'default',
  serverDescription: 'Default offering',
  availablePackages: mockPackages,
  lifetime: mockPackages[2],
  annual: mockPackages[1],
  monthly: mockPackages[0],
  all: {}
};

// RevenueCat mock implementation
class RevenueCatWebMock {
  private isConfigured = false;
  private currentUserId: string | null = null;

  async configure(): Promise<void> {
    if (this.isConfigured) return;
    
    // Simulate configuration delay
    await new Promise(resolve => setTimeout(resolve, 100));
    this.isConfigured = true;
    console.log('🛒 RevenueCat (Web Mock) configured successfully');
  }

  async logIn(userId: string): Promise<{ customerInfo: CustomerInfo }> {
    this.currentUserId = userId;
    console.log('🛒 User identified with RevenueCat (Web Mock):', userId);
    return { customerInfo: mockCustomerInfo };
  }

  async logOut(): Promise<CustomerInfo> {
    this.currentUserId = null;
    console.log('🛒 RevenueCat (Web Mock) user reset to anonymous');
    return mockCustomerInfo;
  }

  async getCustomerInfo(): Promise<CustomerInfo> {
    if (!this.isConfigured) {
      throw new Error('RevenueCat not configured');
    }
    return mockCustomerInfo;
  }

  async isAnonymous(): Promise<boolean> {
    return !this.currentUserId;
  }

  async getOfferings(): Promise<{ current: PurchasesOffering | null }> {
    if (!this.isConfigured) {
      throw new Error('RevenueCat not configured');
    }
    return { current: mockOfferings };
  }

  async purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo }> {
    if (!this.isConfigured) {
      throw new Error('RevenueCat not configured');
    }
    
    console.log('🛒 Purchase (Web Mock) simulated for package:', pkg.identifier);
    
    // Simulate purchase delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🛒 Purchase (Web Mock) successful');
    return { customerInfo: mockCustomerInfo };
  }

  async restorePurchases(): Promise<CustomerInfo> {
    console.log('🛒 Restore purchases (Web Mock) successful');
    return mockCustomerInfo;
  }

  setLogLevel(): void {
    // No-op in web mock
  }

  addCustomerInfoUpdateListener(callback: (customerInfo: CustomerInfo) => void): void {
    // Simulate subscription status change updates
    setTimeout(() => callback(mockCustomerInfo), 1000);
  }

  removeCustomerInfoUpdateListener(): void {
    // No-op in web mock
  }
}

// Create singleton instance
const revenueCatWebMock = new RevenueCatWebMock();

// Export mocked functions that match the real revenueCat interface
export async function configureRevenueCat(): Promise<void> {
  return revenueCatWebMock.configure();
}

export async function identifyUser(userId: string): Promise<CustomerInfo> {
  const { customerInfo } = await revenueCatWebMock.logIn(userId);
  return customerInfo;
}

export async function resetUser(): Promise<void> {
  await revenueCatWebMock.logOut();
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return revenueCatWebMock.getCustomerInfo();
}

export function hasProEntitlement(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  
  const proEntitlement = customerInfo.entitlements.active['MealScanner Pro'];
  return proEntitlement !== undefined && proEntitlement.isActive;
}

export function isBetaTester(customerInfo: CustomerInfo | null): boolean {
  if (!customerInfo) return false;
  
  const proEntitlement = customerInfo.entitlements.active['MealScanner Pro'];
  if (!proEntitlement) return false;
  
  // For web mock, we can simulate beta tester status
  return Math.random() > 0.8; // 20% chance of being beta tester for testing
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  const { current } = await revenueCatWebMock.getOfferings();
  return current;
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await revenueCatWebMock.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return revenueCatWebMock.restorePurchases();
}

export function addCustomerInfoUpdateListener(callback: (customerInfo: CustomerInfo) => void): () => void {
  revenueCatWebMock.addCustomerInfoUpdateListener(callback);
  
  // Return cleanup function
  return () => {
    revenueCatWebMock.removeCustomerInfoUpdateListener();
  };
}