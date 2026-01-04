import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen, glassBorder, accentSky, semanticColors } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useSubscription } from '@/context/SubscriptionContext';
import { Paywall } from './Paywall';

interface UpgradePromptProps {
  /** Type of feature being gated */
  feature: 'scans' | 'recipes' | 'nutrition';
  /** Custom title override */
  title?: string;
  /** Custom message override */
  message?: string;
  /** Number of scans remaining (for scan limit prompt) */
  scansRemaining?: number;
  /** Whether to show as a compact inline version */
  compact?: boolean;
  /** Style overrides */
  style?: object;
}

/**
 * Inline upgrade prompt component for gated features
 * Shows contextual messaging and CTA to upgrade
 */
export function UpgradePrompt({
  feature,
  title,
  message,
  scansRemaining,
  compact = false,
  style,
}: UpgradePromptProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { showPaywall } = useSubscription();
  
  const [paywallVisible, setPaywallVisible] = useState(false);

  const getDefaultContent = () => {
    switch (feature) {
      case 'scans':
        if (scansRemaining !== undefined && scansRemaining > 0) {
          return {
            icon: 'camera.fill',
            title: `${scansRemaining} scan${scansRemaining === 1 ? '' : 's'} remaining today`,
            message: 'Upgrade to Pro for unlimited scans',
            accentColor: accentSky,
          };
        }
        return {
          icon: 'camera.fill',
          title: 'Daily scan limit reached',
          message: 'Upgrade to Pro for unlimited meal scans',
          accentColor: semanticColors.error,
        };
      case 'recipes':
        return {
          icon: 'sparkles',
          title: 'Pro Feature',
          message: 'AI Recipe Generation is available with Pro',
          accentColor: accentSky,
        };
      case 'nutrition':
        return {
          icon: 'chart.bar.fill',
          title: 'Full Nutrition Breakdown',
          message: 'Upgrade to Pro to see detailed micronutrients',
          accentColor: accentSky,
        };
      default:
        return {
          icon: 'crown.fill',
          title: 'Pro Feature',
          message: 'Upgrade to unlock this feature',
          accentColor: neonGreen,
        };
    }
  };

  const content = getDefaultContent();
  const displayTitle = title || content.title;
  const displayMessage = message || content.message;

  const handleUpgrade = async () => {
    // Try RevenueCat native paywall first
    const success = await showPaywall();
    if (!success) {
      // Fall back to custom paywall if native fails
      setPaywallVisible(true);
    }
  };

  if (compact) {
    return (
      <>
        <TouchableOpacity onPress={handleUpgrade} activeOpacity={0.8} style={style}>
          <View style={[styles.compactContainer, { borderColor: content.accentColor }]}>
            <IconSymbol name={content.icon as any} size={16} color={content.accentColor} />
            <Text style={[TextStyles.caption, { color: colors.text, flex: 1 }]} numberOfLines={1}>
              {displayTitle}
            </Text>
            <View style={[styles.compactBadge, { backgroundColor: content.accentColor }]}>
              <Text style={styles.compactBadgeText}>PRO</Text>
            </View>
          </View>
        </TouchableOpacity>
        
        <Paywall
          visible={paywallVisible}
          onClose={() => setPaywallVisible(false)}
          feature={feature}
        />
      </>
    );
  }

  return (
    <>
      <Card variant="glass" style={[styles.container, style]}>
        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${content.accentColor}20` }]}>
            <IconSymbol name={content.icon as any} size={24} color={content.accentColor} />
          </View>
          
          <View style={styles.textContent}>
            <Text style={[TextStyles.h4, { color: colors.text }]}>{displayTitle}</Text>
            <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: 2 }]}>
              {displayMessage}
            </Text>
          </View>
        </View>

        <Button
          variant="primary"
          onPress={handleUpgrade}
          style={styles.upgradeButton}
        >
          Upgrade to Pro
        </Button>
      </Card>

      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        feature={feature}
      />
    </>
  );
}

/**
 * Compact scan counter for displaying in headers/toolbars
 */
interface ScanCounterProps {
  scansRemaining: number;
  scansAllowed: number;
  isPro: boolean;
  onPress?: () => void;
}

export function ScanCounter({ scansRemaining, scansAllowed, isPro, onPress }: ScanCounterProps): React.ReactElement | null {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (isPro) {
    return (
      <View style={styles.scanCounterPro}>
        <IconSymbol name="crown.fill" size={14} color={neonGreen} />
        <Text style={[TextStyles.caption, { color: neonGreen, fontWeight: '600' }]}>PRO</Text>
      </View>
    );
  }

  const isLow = scansRemaining <= 1;
  const accentColor = isLow ? semanticColors.warning : colors.icon;

  return (
    <TouchableOpacity 
      onPress={onPress} 
      activeOpacity={0.7}
      style={[styles.scanCounter, { borderColor: accentColor }]}
    >
      <IconSymbol name="camera.fill" size={12} color={accentColor} />
      <Text style={[TextStyles.caption, { color: accentColor, fontWeight: '600' }]}>
        {scansRemaining}/{scansAllowed}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.base,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.base,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
  },
  upgradeButton: {
    marginTop: Spacing.xs,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  compactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactBadgeText: {
    ...TextStyles.caption,
    color: '#000',
    fontWeight: '700',
    fontSize: 9,
  },
  scanCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  scanCounterPro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${neonGreen}15`,
  },
});

