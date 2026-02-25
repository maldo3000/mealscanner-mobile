import React, { useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import BottomSheet from '@gorhom/bottom-sheet';
import { Button } from '@/components/ui/Button';
import { Colors, neonGreen, textMuted, bgPrimary } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { AnimatedLogo } from '@/components/ui/AnimatedLogo';
import { PageContainer } from '@/components/layout/PageContainer';
import { LegalSheet, LegalContentType } from '@/components/ui/LegalSheet';

export default function LandingScreen() {
  const router = useRouter();
  const legalSheetRef = useRef<BottomSheet>(null);
  const [legalContentType, setLegalContentType] = useState<LegalContentType>('privacy');

  const openLegalSheet = useCallback((type: LegalContentType) => {
    setLegalContentType(type);
    legalSheetRef.current?.expand();
  }, []);

  const closeLegalSheet = useCallback(() => {
    legalSheetRef.current?.close();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageContainer style={styles.container}>
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <View style={styles.mascotContainer}>
              <AnimatedLogo size={200} />
            </View>
            <Text style={[styles.headline, { color: neonGreen }]}>
              Snap, Analyze,{"\n"}Eat Smarter
            </Text>
            <Text style={styles.subheadline}>
              Your AI-powered nutrition companion for a healthier lifestyle.
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

          <View style={styles.legalFooter}>
            <Text style={styles.legalText}>
              By continuing, you agree to our{' '}
            </Text>
            <View style={styles.legalLinksRow}>
              <TouchableOpacity 
                onPress={() => openLegalSheet('terms')}
                activeOpacity={0.7}
              >
                <Text style={styles.legalLink}>Terms of Service</Text>
              </TouchableOpacity>
              <Text style={styles.legalText}> and </Text>
              <TouchableOpacity 
                onPress={() => openLegalSheet('privacy')}
                activeOpacity={0.7}
              >
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <LegalSheet
          ref={legalSheetRef}
          contentType={legalContentType}
          onClose={closeLegalSheet}
        />
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
    marginBottom: 32,
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
  legalFooter: {
    marginTop: 20,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legalText: {
    ...TextStyles.caption,
    color: textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    ...TextStyles.caption,
    color: neonGreen,
    textDecorationLine: 'underline',
    lineHeight: 18,
  },
});













