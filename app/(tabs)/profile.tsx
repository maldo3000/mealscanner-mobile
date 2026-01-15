import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ProBadge } from '@/components/ui/ProBadge';
import { Colors, neonGreen, glassBorder, semanticColors } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Paywall } from '@/components/subscription/Paywall';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert, ActivityIndicator, Linking } from 'react-native';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';

import { getAllUserMeals, deleteMeal } from '@/lib/supabase';

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
  rightAction
}: MenuRowProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const iconColor = color || neonGreen;

  return (
    <View>
      <TouchableOpacity 
        style={styles.menuRow} 
        onPress={onPress}
        disabled={isLoading}
      >
        <View style={styles.menuRowLeft}>
          {isLoading ? (
            <ActivityIndicator size="small" color={iconColor} style={{ width: 22 }} />
          ) : (
            <IconSymbol name={icon} size={22} color={iconColor} />
          )}
          <View style={styles.menuRowText}>
            <Text style={[TextStyles.body, { color: color || colors.text }]}>{title}</Text>
            {subtitle && (
              <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: 2 }]} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.menuRowRight}>
          {rightAction}
          {showChevron && (
            <IconSymbol name="chevron.right" size={16} color={colors.icon} />
          )}
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.separator} />}
    </View>
  );
};

export default function ProfileTabScreen() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const { activeGoal, resetGoals } = useNutritionGoals();
  const { signOut, user } = useAuth();
  const { isPro, isBetaTester, restorePurchases, showCustomerCenter, isLoading: isSubscriptionLoading } = useSubscription();

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
    if (!user) return;
    setIsExporting(true);
    try {
      const { data: meals, error } = await getAllUserMeals(user.id);
      if (error) throw error;

      const exportData = {
        profile: {
          email: user.email,
          id: user.id,
          activeGoal: activeGoal,
        },
        meals: meals || [],
        exportDate: new Date().toISOString(),
        app: 'MealScanner Mobile',
        version: '1.0.0',
      };
      
      const fileName = `mealscanner_export_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.cacheDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(exportData, null, 2));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export My MealScanner Data',
          UTI: 'public.json',
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
              const { data: meals } = await getAllUserMeals(user.id);
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
                <View style={styles.avatar}>
                  <IconSymbol name="person.fill" size={32} color={neonGreen} />
                </View>
                {isPro && (
                  <View style={styles.proBadgeMini}>
                    <IconSymbol name="checkmark.seal" size={14} color={neonGreen} />
                  </View>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={[TextStyles.h3, { color: colors.text }]}>
                  {user?.email?.split('@')[0] || 'User'}
                </Text>
                <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                  {user?.email || 'No email set'}
                </Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Account Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(200).easing(Easing.out(Easing.quad))}>
          <Text style={[TextStyles.bodySmall, styles.sectionTitle, { color: colors.icon }]}>ACCOUNT</Text>
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
              icon="iphone" 
              title="Units & Display" 
              onPress={() => router.push('/settings/units')}
              isLast={true}
            />
          </GlassCard>
        </Animated.View>

        {/* Subscription Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(300).easing(Easing.out(Easing.quad))}>
          <Text style={[TextStyles.bodySmall, styles.sectionTitle, { color: colors.icon }]}>SUBSCRIPTION</Text>
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
          <Text style={[TextStyles.bodySmall, styles.sectionTitle, { color: colors.icon }]}>OTHER</Text>
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
              icon="info.circle" 
              title="About MealScanner" 
              onPress={() => router.push('/settings/about')} 
            />
            <MenuRow 
              icon="lock.doc" 
              title="Privacy Policy" 
              onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://gist.github.com/maldo3000/01cb8245058b25733d89fb3c16cca7b5')} 
            />
            <MenuRow 
              icon="lock.doc" 
              title="Terms of Service" 
              onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_TERMS_URL || 'https://gist.github.com/maldo3000/d239c3302e64e053b31ea79611f86265')} 
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

        {/* Extra bottom padding to clear tab bar */}
        <View style={{ height: 100 }} />
      </ContentContainer>

      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  proBadgeMini: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#022c22',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: neonGreen,
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
    backgroundColor: glassBorder,
    marginLeft: 22 + Spacing.base + Spacing.base, // icon width + gap + padding
  },
});
