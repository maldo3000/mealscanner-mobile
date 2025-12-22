import React from 'react';
import { View, Text, StyleSheet, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Colors, neonGreen, textMuted, bgPrimary } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { Mascot } from '@/components/Mascot';
import { PageContainer } from '@/components/layout/PageContainer';

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageContainer style={styles.container}>
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <View style={styles.mascotContainer}>
              <Mascot size={180} />
            </View>
            <Text style={[styles.headline, { color: neonGreen }]}>
              Snap, Analyze,{"\n"}Eat Smarter
            </Text>
            <Text style={styles.subheadline}>
              Your AI-powered nutrition companion for a healthier, botanical lifestyle.
            </Text>
          </View>

          <View style={styles.actionSection}>
            <Button 
              variant="primary" 
              size="large" 
              fullWidth 
              onPress={() => router.push('/(auth)/onboarding')}
            >
              Get Started
            </Button>
            
            <Button 
              variant="ghost" 
              size="medium" 
              fullWidth 
              onPress={() => router.push('/(auth)/login')}
              style={styles.signInButton}
            >
              <Text style={styles.signInText}>
                Already have an account? <Text style={{ color: neonGreen }}>Sign In</Text>
              </Text>
            </Button>
          </View>
        </View>
      </PageContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: bgPrimary,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  mascotContainer: {
    marginBottom: 40,
    // Add a subtle glow behind the mascot
    shadowColor: neonGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
  },
  headline: {
    ...TextStyles.h1,
    textAlign: 'center',
    fontSize: 40,
    lineHeight: 48,
    marginBottom: 16,
    fontFamily: 'Telegraf_800UltraBold',
  },
  subheadline: {
    ...TextStyles.body,
    textAlign: 'center',
    color: textMuted,
    paddingHorizontal: 20,
    fontSize: 16,
  },
  actionSection: {
    width: '100%',
    gap: 12,
  },
  signInButton: {
    marginTop: 8,
  },
  signInText: {
    ...TextStyles.body,
    color: textMuted,
    fontSize: 15,
  },
});


