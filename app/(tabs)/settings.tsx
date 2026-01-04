import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen, glassBorder, semanticColors } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { Paywall } from '@/components/subscription/Paywall';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View, Alert, ActivityIndicator, Linking } from 'react-native';
import Animated, { FadeInDown, Easing } from 'react-native-reanimated';

export default function SettingsScreen() {
  const [showMetrics, setShowMetrics] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { activeGoal } = useNutritionGoals();
  const { signOut, user } = useAuth();
  const { isPro, isBetaTester, restorePurchases, showCustomerCenter, isLoading: isSubscriptionLoading } = useSubscription();

  const goalSubtitle = activeGoal
    ? `${activeGoal.name} • ${Math.round(activeGoal.dailyTargets.calories)} kcal`
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
    } catch (error) {
      console.error('🛒 Restore error:', error);
    } finally {
      setIsRestoring(false);
    }
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
              // Navigation will be handled by the AuthContext listener in _layout.tsx
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
      <PageHeader title="Settings" />
      
      <ContentContainer>
        {/* Profile Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(100).easing(Easing.out(Easing.quad))}>
          <Section title="Profile">
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity style={styles.settingItemContent}>
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="person" size={20} color={neonGreen} />
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text }]}>Edit Profile</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </TouchableOpacity>
            </Card>
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity
                style={styles.settingItemContent}
                onPress={() => router.push('/settings/nutrition-goals')}
                accessibilityLabel="Set nutrition goals"
                accessibilityHint="Opens the nutrition goals setup screen"
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="target" size={20} color={neonGreen} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[TextStyles.body, { color: colors.text }]}>
                      Nutrition Goals
                    </Text>
                    <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                      {goalSubtitle}
                    </Text>
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </TouchableOpacity>
            </Card>
          </Section>
        </Animated.View>

        {/* Subscription Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(150).easing(Easing.out(Easing.quad))}>
          <Section title="Subscription">
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity
                style={styles.settingItemContent}
                onPress={() => {
                  if (isPro) {
                    showCustomerCenter();
                  } else {
                    setPaywallVisible(true);
                  }
                }}
                accessibilityLabel={isPro ? "Manage subscription" : "Upgrade to Pro"}
                accessibilityHint={isPro ? "Opens subscription management" : "Opens upgrade options"}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="crown.fill" size={20} color={neonGreen} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[TextStyles.body, { color: colors.text }]}>
                      {isPro ? 'MealScanner Pro' : 'Upgrade to Pro'}
                    </Text>
                    <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                      {isSubscriptionLoading ? 'Loading...' : subscriptionSubtitle}
                    </Text>
                  </View>
                </View>
                {isPro ? (
                  <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                ) : (
                  <View style={styles.proBadge}>
                    <Text style={styles.proBadgeText}>PRO</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Card>

            {!isPro && (
              <Card variant="glass" padding="none" style={styles.settingItem}>
                <TouchableOpacity
                  style={styles.settingItemContent}
                  onPress={handleRestorePurchases}
                  disabled={isRestoring}
                  accessibilityLabel="Restore purchases"
                  accessibilityHint="Restores previous purchases from the App Store"
                >
                  <View style={styles.settingItemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                      {isRestoring ? (
                        <ActivityIndicator size="small" color={neonGreen} />
                      ) : (
                        <IconSymbol name="arrow.clockwise" size={20} color={neonGreen} />
                      )}
                    </View>
                    <Text style={[TextStyles.body, { color: colors.text }]}>
                      {isRestoring ? 'Restoring...' : 'Restore Purchases'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Card>
            )}
          </Section>
        </Animated.View>

        {/* Preferences Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(200).easing(Easing.out(Easing.quad))}>
          <Section title="Preferences">
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <View style={styles.settingItemContent}>
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="chart.bar" size={20} color={neonGreen} />
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text }]}>Show Nutrition Metrics</Text>
                </View>
                <Switch
                  value={showMetrics}
                  onValueChange={setShowMetrics}
                  trackColor={{ false: glassBorder, true: neonGreen }}
                  thumbColor={showMetrics ? '#000000' : colors.icon}
                />
              </View>
            </Card>
            
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity style={styles.settingItemContent}>
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="bell" size={20} color={neonGreen} />
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text }]}>Notifications</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </TouchableOpacity>
            </Card>
            
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity style={styles.settingItemContent}>
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="iphone" size={20} color={neonGreen} />
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text }]}>Units & Display</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </TouchableOpacity>
            </Card>
          </Section>
        </Animated.View>

        {/* Data Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(300).easing(Easing.out(Easing.quad))}>
          <Section title="Data">
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity style={styles.settingItemContent}>
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="square.and.arrow.up" size={20} color={neonGreen} />
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text }]}>Export Data</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </TouchableOpacity>
            </Card>
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity style={styles.settingItemContent}>
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="trash" size={20} color={neonGreen} />
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text }]}>Clear History</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </TouchableOpacity>
            </Card>
          </Section>
        </Animated.View>

        {/* About Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(400).easing(Easing.out(Easing.quad))}>
          <Section>
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity style={styles.settingItemContent}>
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="info.circle" size={20} color={neonGreen} />
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text }]}>About MealScanner</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </TouchableOpacity>
            </Card>
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity 
                style={styles.settingItemContent}
                onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || 'https://gist.github.com/maldo3000/01cb8245058b25733d89fb3c16cca7b5')}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="doc.text" size={20} color={neonGreen} />
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text }]}>Privacy Policy</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </TouchableOpacity>
            </Card>
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity 
                style={styles.settingItemContent}
                onPress={() => Linking.openURL(process.env.EXPO_PUBLIC_TERMS_URL || 'https://gist.github.com/maldo3000/d239c3302e64e053b31ea79611f86265')}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                    <IconSymbol name="doc.text" size={20} color={neonGreen} />
                  </View>
                  <Text style={[TextStyles.body, { color: colors.text }]}>Terms of Service</Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </TouchableOpacity>
            </Card>
          </Section>
        </Animated.View>

        {/* Account Section */}
        <Animated.View entering={FadeInDown.duration(600).delay(500).easing(Easing.out(Easing.quad))}>
          <Section title="Account">
            {user && (
              <Card variant="glass" padding="none" style={styles.settingItem}>
                <View style={styles.settingItemContent}>
                  <View style={styles.settingItemLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: `${neonGreen}20`, borderColor: `${neonGreen}40`, borderWidth: 1 }]}>
                      <IconSymbol name="envelope" size={20} color={neonGreen} />
                    </View>
                    <Text style={[TextStyles.bodySmall, { color: colors.icon }]} numberOfLines={1}>
                      {user.email}
                    </Text>
                  </View>
                </View>
              </Card>
            )}
            <Card variant="glass" padding="none" style={styles.settingItem}>
              <TouchableOpacity 
                style={styles.settingItemContent} 
                onPress={handleSignOut}
                disabled={isSigningOut}
              >
                <View style={styles.settingItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: `${semanticColors.error}20`, borderColor: `${semanticColors.error}40`, borderWidth: 1 }]}>
                    {isSigningOut ? (
                      <ActivityIndicator size="small" color={semanticColors.error} />
                    ) : (
                      <IconSymbol name="rectangle.portrait.and.arrow.right" size={20} color={semanticColors.error} />
                    )}
                  </View>
                  <Text style={[TextStyles.body, { color: semanticColors.error }]}>
                    {isSigningOut ? 'Signing Out...' : 'Sign Out'}
                  </Text>
                </View>
              </TouchableOpacity>
            </Card>
          </Section>
        </Animated.View>
      </ContentContainer>

      {/* Paywall Modal */}
      <Paywall
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    marginBottom: PageSpacing.cardGap,
  },
  settingItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proBadge: {
    backgroundColor: neonGreen,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proBadgeText: {
    ...TextStyles.caption,
    color: '#000',
    fontWeight: '700',
    fontSize: 11,
  },
}); 