import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Colors, glassBorder, glassSurface, neonGreen, accentSky } from '@/constants/Colors';
import { Spacing, PageSpacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSubscription } from '@/context/SubscriptionContext';
import { getOfferings, type PurchasesPackage, type PurchasesOffering } from '@/lib/revenueCat';

interface PaywallProps {
  visible: boolean;
  onClose: () => void;
  /** Optional title override */
  title?: string;
  /** Optional subtitle override */
  subtitle?: string;
  /** Feature that triggered the paywall (for context) */
  feature?: 'scans' | 'recipes' | 'nutrition';
}

interface PackageCardProps {
  pkg: PurchasesPackage;
  isSelected: boolean;
  onSelect: () => void;
  isBestValue?: boolean;
}

function PackageCard({ pkg, isSelected, onSelect, isBestValue }: PackageCardProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const getPackageTitle = (): string => {
    switch (pkg.packageType) {
      case 'MONTHLY':
        return 'Monthly';
      case 'ANNUAL':
        return 'Yearly';
      case 'LIFETIME':
        return 'Lifetime';
      default:
        return pkg.identifier;
    }
  };

  const getPackageSubtitle = (): string => {
    switch (pkg.packageType) {
      case 'MONTHLY':
        return 'Billed monthly';
      case 'ANNUAL':
        return 'Billed annually • Save 50%';
      case 'LIFETIME':
        return 'One-time payment';
      default:
        return '';
    }
  };

  const getTrialText = (): string | null => {
    const intro = pkg.product.introPrice;
    if (intro && intro.price === 0) {
      // This is a free trial
      const period = intro.periodUnit; // 'DAY', 'WEEK', 'MONTH', 'YEAR'
      const count = intro.periodNumberOfUnits;
      return `${count} ${period.toLowerCase()}${count > 1 ? 's' : ''} FREE`;
    }
    return null;
  };

  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.8}>
      <Card 
        variant="glass" 
        noBorder={isSelected} 
        style={[
          styles.packageCard,
          isSelected && { 
            borderColor: neonGreen, 
            borderWidth: 2,
            borderRadius: 24, // Explicitly match Card's borderRadius
          },
        ]}
      >
        {isBestValue && (
          <View style={styles.bestValueBadge}>
            <Text style={styles.bestValueText}>BEST VALUE</Text>
          </View>
        )}
        <View style={styles.packageContent}>
          <View style={styles.packageLeft}>
            <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
            <View>
              <Text style={[TextStyles.h4, { color: colors.text }]}>{getPackageTitle()}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                {getTrialText() && (
                  <Text style={[TextStyles.caption, { color: neonGreen, fontWeight: '700' }]}>
                    {getTrialText()} • 
                  </Text>
                )}
                <Text style={[TextStyles.caption, { color: colors.icon }]}>{getPackageSubtitle()}</Text>
              </View>
            </View>
          </View>
          <Text style={[TextStyles.h3, { color: neonGreen }]}>
            {pkg.product.priceString}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export function Paywall({ visible, onClose, title, subtitle, feature }: PaywallProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { purchasePackage, restorePurchases, isPro } = useSubscription();

  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Load offerings
  useEffect(() => {
    async function loadOfferings() {
      if (!visible) return;
      
      setIsLoading(true);
      try {
        const currentOfferings = await getOfferings();
        setOfferings(currentOfferings);
        
        // Default select the annual package (best value)
        const annual = currentOfferings?.availablePackages.find(p => p.packageType === 'ANNUAL');
        setSelectedPackage(annual || currentOfferings?.availablePackages[0] || null);
      } catch (error) {
        console.error('Failed to load offerings:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadOfferings();
  }, [visible]);

  // Close if user became Pro
  useEffect(() => {
    if (isPro && visible) {
      onClose();
    }
  }, [isPro, visible, onClose]);

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    try {
      const success = await purchasePackage(selectedPackage);
      if (success) {
        onClose();
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        onClose();
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const getDefaultTitle = (): string => {
    switch (feature) {
      case 'scans':
        return 'Unlock Unlimited Scans';
      case 'recipes':
        return 'Unlock AI Recipe Generation';
      case 'nutrition':
        return 'Get Full Nutrition Insights';
      default:
        return 'Upgrade to Pro';
    }
  };

  const getDefaultSubtitle = (): string => {
    switch (feature) {
      case 'scans':
        return 'Scan as many meals as you want with MealScanner Pro';
      case 'recipes':
        return 'Generate custom recipes tailored to your nutrition goals';
      case 'nutrition':
        return 'Access detailed micronutrients and nutrition analysis';
      default:
        return 'Get the most out of MealScanner';
    }
  };

  const proFeatures = [
    { icon: 'camera.fill', text: 'Unlimited meal scans' },
    { icon: 'sparkles', text: 'AI Recipe Generation' },
    { icon: 'chart.bar.fill', text: 'Full nutrition breakdown' },
    { icon: 'arrow.clockwise', text: 'Unlimited re-analysis' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Fixed Header */}
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <View style={styles.titleSection}>
            <View style={styles.proIconContainer}>
              <IconSymbol name="crown.fill" size={32} color="#000" />
            </View>
            <Text style={[TextStyles.h1, { color: colors.text, textAlign: 'center' }]}>
              {title || getDefaultTitle()}
            </Text>
            <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center', marginTop: Spacing.sm }]}>
              {subtitle || getDefaultSubtitle()}
            </Text>
          </View>

          {/* Features List */}
          <View style={styles.featuresList}>
            {proFeatures.map((item, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <IconSymbol name={item.icon as any} size={18} color={neonGreen} />
                </View>
                <Text style={[TextStyles.body, { color: colors.text }]}>{item.text}</Text>
              </View>
            ))}
          </View>

          {/* Packages */}
          {isLoading ? (
            <ActivityIndicator size="large" color={neonGreen} style={styles.loader} />
          ) : (
            <View style={styles.packages}>
              {offerings?.availablePackages.map((pkg) => (
                <PackageCard
                  key={pkg.identifier}
                  pkg={pkg}
                  isSelected={selectedPackage?.identifier === pkg.identifier}
                  onSelect={() => setSelectedPackage(pkg)}
                  isBestValue={false} // Removed "Best Value" per user request
                />
              ))}
            </View>
          )}
          
          {/* Bottom spacing to ensure content isn't hidden by the fixed footer */}
          <View style={{ height: 180 }} />
        </ScrollView>

        {/* Fixed Footer with Absolute Positioning */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Button
            variant="primary"
            onPress={handlePurchase}
            disabled={!selectedPackage || isPurchasing || isRestoring}
            fullWidth
          >
            {isPurchasing ? 'Processing...' : 'Subscribe Now'}
          </Button>
          
          <TouchableOpacity 
            onPress={handleRestore} 
            disabled={isRestoring || isPurchasing}
            style={styles.restoreButton}
          >
            <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>

          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://gist.github.com/maldo3000/01cb8245058b25733d89fb3c16cca7b5')}>
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}> • </Text>
            <TouchableOpacity onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_TERMS_URL || 'https://gist.github.com/maldo3000/d239c3302e64e053b31ea79611f86265')}>
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={[TextStyles.caption, { color: colors.icon, textAlign: 'center', marginTop: Spacing.xs }]}>
            Cancel anytime. Subscription renews automatically.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: PageSpacing.containerPadding,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: PageSpacing.containerPadding,
    paddingTop: 60, // Reduced from 80
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: glassSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg, // Reduced from xl
  },
  proIconContainer: {
    width: 56, // Reduced from 64
    height: 56, // Reduced from 64
    borderRadius: 18, // Reduced from 20
    backgroundColor: neonGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md, // Reduced from lg
  },
  featuresList: {
    marginBottom: Spacing.lg, // Reduced from xl
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm, // Reduced from md
    gap: Spacing.md,
  },
  featureIcon: {
    width: 32, // Reduced from 36
    height: 32, // Reduced from 36
    borderRadius: 8, // Reduced from 10
    backgroundColor: `${neonGreen}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packages: {
    gap: Spacing.xs, // Reduced from sm
  },
  packageCard: {
    padding: Spacing.sm,
    position: 'relative',
  },
  packageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: neonGreen,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: neonGreen,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: Spacing.md,
    backgroundColor: accentSky,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bestValueText: {
    ...TextStyles.caption,
    color: '#000',
    fontWeight: '700',
    fontSize: 10,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: PageSpacing.containerPadding,
    paddingTop: Spacing.lg, // Reduced from xl
    backgroundColor: 'rgba(0,0,0,0.9)', // Deep semi-transparent background
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  legalLinkText: {
    ...TextStyles.caption,
    color: neonGreen,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    ...TextStyles.caption,
    color: 'rgba(255,255,255,0.3)',
    marginHorizontal: Spacing.xs,
  },
});

