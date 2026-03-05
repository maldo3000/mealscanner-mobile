import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { WeeklyReportSheet } from '@/components/reports/WeeklyReportSheet';
import { Paywall } from '@/components/subscription/Paywall';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProBadge } from '@/components/ui/ProBadge';
import { SwirlingSpinner } from '@/components/ui/SwirlingSpinner';
import { semanticColors } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useTheme } from '@/context/ThemeContext';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import BottomSheet from '@gorhom/bottom-sheet';
import { useFocusEffect } from '@react-navigation/native';
import { File, Paths } from 'expo-file-system/next';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

import { presentCodeRedemptionSheet } from '@/lib/revenueCat';
import { deleteAccount, deleteMeal, getAllUserMealIds, getAllUserMeals } from '@/lib/supabase';

interface MenuRowProps {
  icon: any;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showChevron?: boolean;
  isLast?: boolean;
  color?: string;
  isLoading?: boolean;
  rightAction?: React.ReactNode;
}

const MenuRow = ({ 
  icon, 
  title, 
  subtitle, 
  onPress, 
  showChevron = true, 
  isLast = false, 
  color,
  isLoading = false,
  rightAction,
}: MenuRowProps) => {
  const { tokens } = useTheme();
  const iconColor = color || tokens.accent;

  return (
    <View>
      <TouchableOpacity 
        style={styles.menuRow} 
        onPress={onPress}
        disabled={isLoading}
      >
        <View style={styles.menuRowLeft}>
          {isLoading ? (
            <SwirlingSpinner size={22} color={iconColor} />
          ) : (
            <IconSymbol name={icon} size={22} color={iconColor} />
          )}
          <View style={styles.menuRowText}>
            <Text style={[TextStyles.body, { color: color || tokens.textPrimary }]}>{title}</Text>
            {subtitle && (
              <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: 2 }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.menuRowRight}>
          {rightAction}
          {showChevron && (
            <IconSymbol name="chevron.right" size={16} color={tokens.textMuted} />
          )}
        </View>
      </TouchableOpacity>
      {!isLast && <View style={[styles.separator, { backgroundColor: tokens.borderSubtle }]} />}
    </View>
  );
};

export default function ProfileTabScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const router = useRouter();
  const { tokens, accentAlpha } = useTheme();
  const { activeGoal, resetGoals, refresh: refreshGoals } = useNutritionGoals();

  // Re-fetch goal data when the screen regains focus (e.g. after editing in settings)
  useFocusEffect(
    useCallback(() => {
      void refreshGoals();
    }, [refreshGoals]),
  );
  const { signOut, user } = useAuth();
  const { isPro, isBetaTester, restorePurchases, showCustomerCenter, isLoading: isSubscriptionLoading } = useSubscription();
  const weeklyReportSheetRef = useRef<BottomSheet>(null);

  const formatMacro = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '0';
    return Number(val.toFixed(1)).toString();
  };

  const goalSubtitle = activeGoal
    ? `${activeGoal.name} • ${formatMacro(activeGoal.dailyTargets.calories)} kcal`
    : 'Not set yet';

  const subscriptionSubtitle = isPro
    ? isBetaTester
      ? 'Beta Tester • Full Access'
      : 'Pro • Full Access'
    : 'Free • Limited Features';

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
      Alert.alert('Success', 'Purchases restored successfully.');
    } catch (error) {
      console.error('🛒 Restore error:', error);
      Alert.alert('Error', 'Failed to restore purchases.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportData = async () => {
    if (!user) {
      Alert.alert('Not Signed In', 'Please sign in to export your data.');
      return;
    }
    setIsExporting(true);
    try {
      const { data: meals, error } = await getAllUserMeals(user.id);
      if (error) throw error;

      if (!meals || meals.length === 0) {
        Alert.alert('No Data', 'You don\'t have any meals to export yet.');
        return;
      }

      // Build CSV
      const csvHeaders = [
        'Date', 'Time', 'Meal Type', 'Description', 'Calories',
        'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)',
        'Sugar (g)', 'Sodium (mg)', 'Cholesterol (mg)',
        'Health Score', 'Ingredients', 'Serving Estimate',
      ];

      const escapeCSV = (value: string | undefined | null): string => {
        if (value === undefined || value === null) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows = (meals || []).map((meal: any) => {
        const date = new Date(meal.created_at);
        return [
          date.toLocaleDateString(),
          date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          meal.meal_type || '',
          escapeCSV(meal.description),
          meal.calories ?? '',
          meal.macros?.protein ?? '',
          meal.macros?.carbs ?? '',
          meal.macros?.fat ?? '',
          meal.macros?.fiber ?? '',
          meal.macros?.sugar ?? '',
          meal.macros?.sodium ?? '',
          meal.macros?.cholesterol ?? '',
          meal.health_score ?? '',
          escapeCSV(meal.ingredients?.join('; ')),
          escapeCSV(meal.serving_estimate),
        ].join(',');
      });

      const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
      
      const fileName = `mealscanner_export_${new Date().toISOString().split('T')[0]}.csv`;
      const file = new File(Paths.cache, fileName);
      file.create({ overwrite: true });
      file.write(csvContent);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export My MealScanner Data',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Could not export your data at this time.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'This will permanently delete all your logged meals and reset your nutrition goals. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            try {
              const { data: meals } = await getAllUserMealIds(user.id);
              if (meals && meals.length > 0) {
                await Promise.all(meals.map(meal => deleteMeal(meal.id)));
              }
              await resetGoals();
              Alert.alert('Success', 'Your history and goals have been cleared.');
            } catch (error) {
              console.error('Clear history error:', error);
              Alert.alert('Error', 'Failed to clear some data. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    // First confirmation: Explain the consequences
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data including:\n\n' +
      '• Your profile information\n' +
      '• All meal history and photos\n' +
      '• Saved recipes\n' +
      '• Nutrition goals\n\n' +
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation: Final warning with prompt
            Alert.alert(
              'Are you absolutely sure?',
              'Type DELETE to confirm account deletion. This is permanent and cannot be reversed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      const { error } = await deleteAccount();
                      if (error) {
                        throw error;
                      }
                      // Sign out after successful deletion
                      await signOut();
                      // The auth context will handle navigation to login
                    } catch (error) {
                      console.error('Delete account error:', error);
                      Alert.alert(
                        'Deletion Failed',
                        'Could not delete your account. Please try again or contact support if the problem persists.'
                      );
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <PageContainer>
      <PageHeader 
        title="Profile" 
        rightAction={isPro ? <ProBadge style={{ marginTop: 8 }} /> : null}
      />
      
      <ContentContainer>
        {/* User Profile Card */}
        <Animated.View entering={FadeInDown.duration(600).delay(100).easing(Easing.out(Easing.quad))}>
          <GlassCard padding={Spacing.base} style={styles.userCard}>
            <View style={styles.userCardContent}>
              <View style={styles.avatarContainer}>
                {/* Avatar Placeholder */}
                <View style={[styles.avatar, { backgroundColor: accentAlpha(0.15), borderColor: accentAlpha(0.3) }]}>
                  <IconSymbol name="person.fill" size={32} color={tokens.accent} />
                </View>
                {isPro && (
                  <View style={[styles.proBadgeMini, { backgroundColor: tokens.accent }]}>
                    <IconSymbol name="checkmark.seal" size={14} color={tokens.textOnAccent} />
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={[TextStyles.h3, { color: tokens.textPrimary }]}>
                  {user?.email?.split('@')[0] || 'User'}
                </Text>
                <Text style={[TextStyles.bodySmall, { color: tokens.textMuted }]}>
                  {user?.email || 'No email set'}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Account Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(200).easing(Easing.out(Easing.quad))}>
          <Text style={[TextStyles.bodySmall, styles.sectionTitle, { color: tokens.textMuted }]}>ACCOUNT</Text>
          <GlassCard padding={0} noBorder={false}>
            <MenuRow 
              icon="person" 
              title="Personal Information" 
              onPress={() => router.push('/settings/profile')} 
            />
            <MenuRow 
              icon="target" 
              title="Nutrition Goals" 
              subtitle={goalSubtitle}
              onPress={() => router.push('/settings/nutrition-goals')} 
            />
            <MenuRow 
              icon="bell.fill" 
              title="Notifications" 
              onPress={() => router.push('/settings/notifications')} 
            />
            <MenuRow 
              icon="paintbrush.fill" 
              title="Appearance" 
              onPress={() => router.push('/settings/appearance')} 
            />
            <MenuRow 
              icon="iphone" 
              title="Units & Display" 
              onPress={() => router.push('/settings/units')}
              isLast={true}
            />
          </GlassCard>
        </Animated.View>

        {/* Subscription Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(300).easing(Easing.out(Easing.quad))}>
          <Text style={[TextStyles.bodySmall, styles.sectionTitle, { color: tokens.textMuted }]}>SUBSCRIPTION</Text>
          <GlassCard padding={0}>
            <MenuRow 
              icon="star.fill" 
              title={isPro ? 'MealScanner Pro' : 'Upgrade to Pro'} 
              subtitle={isSubscriptionLoading ? 'Loading...' : subscriptionSubtitle}
              onPress={() => isPro ? showCustomerCenter() : setPaywallVisible(true)}
              rightAction={isPro ? <ProBadge /> : null}
            />
            {!isPro && (
              <MenuRow 
                icon="checkmark.circle" 
                title="Restore Purchases" 
                onPress={handleRestorePurchases}
                isLoading={isRestoring}
                isLast={Platform.OS !== 'ios'}
              />
            )}
            {!isPro && Platform.OS === 'ios' && (
              <MenuRow
                icon="giftcard"
                title="Redeem Promo Code"
                onPress={presentCodeRedemptionSheet}
                isLast={true}
              />
            )}
            {isPro && (
              <MenuRow 
                icon="checkmark.circle" 
                title="Manage Subscription" 
                onPress={showCustomerCenter}
                isLast={true}
              />
            )}
          </GlassCard>
        </Animated.View>

        {/* Others Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(400).easing(Easing.out(Easing.quad))}>
          <Text style={[TextStyles.bodySmall, styles.sectionTitle, { color: tokens.textMuted }]}>OTHER</Text>
          <GlassCard padding={0}>
            <MenuRow 
              icon="square.and.arrow.up" 
              title="Export Data" 
              onPress={handleExportData}
              isLoading={isExporting}
            />
            <MenuRow 
              icon="trash" 
              title="Clear History" 
              onPress={handleClearHistory}
            />
            <MenuRow
              icon="questionmark.circle"
              title="How it works"
              onPress={() => router.push('/settings/how-it-works' as any)}
            />
            <MenuRow
              icon="chart.bar.doc.horizontal"
              title="Weekly Report"
              subtitle="Your personal nutritionist recap"
              onPress={() => {
                if (isPro || isBetaTester) {
                  weeklyReportSheetRef.current?.expand();
                } else {
                  setPaywallVisible(true);
                }
              }}
            />
            <MenuRow 
              icon="envelope" 
              title="Contact Support" 
              onPress={() => router.push('/settings/contact-support' as any)} 
            />
            <MenuRow 
              icon="info.circle" 
              title="About MealScanner" 
              onPress={() => router.push('/settings/about')} 
            />
            <MenuRow 
              icon="lock.doc" 
              title="Privacy Policy" 
              onPress={() => router.push('/settings/privacy-policy')} 
            />
            <MenuRow 
              icon="lock.doc" 
              title="Terms of Service" 
              onPress={() => router.push('/settings/terms-of-service')} 
            />
            <MenuRow 
              icon="doc.text" 
              title="Sources" 
              onPress={() => router.push('/settings/sources' as any)} 
            />
            <MenuRow 
              icon="rectangle.portrait.and.arrow.right" 
              title="Sign Out" 
              onPress={handleSignOut}
              color={semanticColors.error}
              showChevron={false}
              isLast={true}
              isLoading={isSigningOut}
            />
          </GlassCard>
        </Animated.View>

        {/* Danger Zone Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(500).easing(Easing.out(Easing.quad))}>
          <Text style={[TextStyles.bodySmall, styles.sectionTitle, { color: tokens.textMuted }]}>DANGER ZONE</Text>
          <GlassCard padding={0}>
            <MenuRow 
              icon="person.crop.circle.badge.minus" 
              title="Delete Account" 
              onPress={handleDeleteAccount}
              color={semanticColors.error}
              showChevron={false}
              isLast={true}
              isLoading={isDeleting}
            />
          </GlassCard>
        </Animated.View>

        {/* Extra bottom padding to clear tab bar */}
        <View style={{ height: 100 }} />
      </ContentContainer>

      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />

      {user?.id ? (
        <WeeklyReportSheet
          ref={weeklyReportSheetRef}
          userId={user.id}
          isPro={isPro || isBetaTester}
          onRequirePro={() => setPaywallVisible(true)}
          onClose={() => {}}
        />
      ) : null}
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  userCard: {
    marginBottom: PageSpacing.sectionGap,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  proBadgeMini: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  sectionTitle: {
    marginLeft: Spacing.xs,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xl,
    letterSpacing: 1,
    opacity: 0.7,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    minHeight: 60,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    flex: 1,
  },
  menuRowText: {
    flex: 1,
  },
  menuRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  separator: {
    height: 1,
    marginLeft: 22 + Spacing.base + Spacing.base, // icon width + gap + padding
  },
});
