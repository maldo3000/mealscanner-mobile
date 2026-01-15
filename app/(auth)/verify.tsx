import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Colors, neonGreen, textMuted, bgPrimary, glassBorder, glassSurface } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { FontAwesome } from '@expo/vector-icons';
import { resendVerificationEmail } from '@/lib/supabase';
import { PageContainer } from '@/components/layout/PageContainer';
import { Mascot } from '@/components/Mascot';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    const { error } = await resendVerificationEmail(email);
    if (error) {
      setError(error.message);
    } else {
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageContainer style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.replace('/(auth)/login')}
          >
            <FontAwesome name="chevron-left" size={20} color={neonGreen} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.mascotContainer}>
              <Mascot size={120} />
            </View>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              We've sent a verification link to{'\n'}
              <Text style={styles.emailText}>{email || 'your email'}</Text>
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Please click the link in the email to verify your account. Once verified, you'll be automatically signed in.
            </Text>
          </View>

          <View style={styles.actions}>
            <Button 
              variant="primary" 
              fullWidth 
              onPress={() => router.replace('/(auth)/login')}
            >
              Back to Sign In
            </Button>

            <TouchableOpacity 
              style={styles.resendButton} 
              onPress={handleResend}
              disabled={loading || resent}
            >
              <Text style={[styles.resendText, (loading || resent) && styles.disabledText]}>
                {loading ? 'Sending...' : resent ? 'Email Sent!' : "Didn't receive an email? Resend"}
              </Text>
            </TouchableOpacity>
            
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </ScrollView>
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
  scrollContent: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginTop: 10,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
    alignItems: 'center',
  },
  mascotContainer: {
    marginBottom: 24,
  },
  title: {
    ...TextStyles.h1,
    color: neonGreen,
    fontFamily: 'Telegraf_800UltraBold',
    textAlign: 'center',
  },
  subtitle: {
    ...TextStyles.body,
    color: textMuted,
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailText: {
    color: '#FFF',
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: glassSurface,
    borderWidth: 1,
    borderColor: glassBorder,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  infoText: {
    ...TextStyles.body,
    color: textMuted,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  resendButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  resendText: {
    ...TextStyles.body,
    color: neonGreen,
    fontSize: 14,
  },
  disabledText: {
    color: textMuted,
  },
  errorText: {
    ...TextStyles.caption,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 8,
  },
});










