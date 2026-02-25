import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { bgPrimary, glassBorder, neonGreen, textMuted } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { signInWithApple, signInWithGoogle, supabase } from '@/lib/supabase';
import { EmailSchema, loginValidator, PasswordSchemaSimple, validateField } from '@/lib/validation';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validateEmailField = (value: string) => {
    const result = validateField(EmailSchema, value);
    setFieldErrors(prev => ({
      ...prev,
      email: result.error || '',
    }));
    return result.valid;
  };

  const validatePasswordField = (value: string) => {
    const result = validateField(PasswordSchemaSimple, value);
    setFieldErrors(prev => ({
      ...prev,
      password: result.error || '',
    }));
    return result.valid;
  };

  const handleEmailSignIn = async () => {
    // Validate all fields
    const validation = loginValidator.validate({ email, password });
    
    if (!validation.success) {
      setError(validation.error || 'Please check your input');
      setFieldErrors(validation.errors || {});
      return;
    }
    
    setFieldErrors({});
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        router.push({ pathname: '/(auth)/verify', params: { email } });
      } else {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await signInWithApple();
      if (error) setError(error.message);
    } catch (e: any) {
      console.error('❌ handleAppleSignIn unexpected error:', e);
      setError(e?.message || 'Something went wrong with Apple Sign-In');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await signInWithGoogle();
      if (error) setError(error.message);
    } catch (e: any) {
      console.error('❌ handleGoogleSignIn unexpected error:', e);
      setError(e?.message || 'Something went wrong with Google Sign-In');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <PageContainer style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <FontAwesome name="chevron-left" size={20} color={neonGreen} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue your journey</Text>
            </View>

            <View style={styles.socialButtons}>
              {Platform.OS === 'ios' && (
                <Button 
                  variant="glass" 
                  fullWidth 
                  onPress={handleAppleSignIn}
                  icon={<FontAwesome name="apple" size={20} color="white" />}
                  style={styles.appleButton}
                >
                  Continue with Apple
                </Button>
              )}
              <Button 
                variant="glass" 
                fullWidth 
                onPress={handleGoogleSignIn}
                icon={<FontAwesome name="google" size={20} color="white" />}
              >
                Continue with Google
              </Button>
            </View>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.form}>
              <View>
                <Input
                  label="Email"
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (fieldErrors.email) validateEmailField(text);
                  }}
                  onBlur={() => validateEmailField(email)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
              </View>
              <View>
                <Input
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (fieldErrors.password) validatePasswordField(text);
                  }}
                  onBlur={() => validatePasswordField(password)}
                  secureTextEntry={!showPassword}
                  rightIcon={
                    <TouchableOpacity 
                      onPress={() => setShowPassword(!showPassword)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <FontAwesome 
                        name={showPassword ? 'eye' : 'eye-slash'} 
                        size={18} 
                        color={textMuted} 
                      />
                    </TouchableOpacity>
                  }
                />
                {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
              </View>
              
              {error && <Text style={styles.errorText}>{error}</Text>}

              <Button 
                variant="primary" 
                fullWidth 
                onPress={handleEmailSignIn}
                disabled={loading}
                style={styles.submitButton}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </View>

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </ScrollView>
        </PageContainer>
      </KeyboardAvoidingView>
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
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginTop: 10,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  title: {
    ...TextStyles.h1,
    color: neonGreen,
    fontFamily: 'Telegraf_800UltraBold',
  },
  subtitle: {
    ...TextStyles.body,
    color: textMuted,
    marginTop: 8,
  },
  socialButtons: {
    gap: 16,
    marginBottom: 32,
  },
  appleButton: {
    backgroundColor: 'black',
    borderColor: glassBorder,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: glassBorder,
  },
  dividerText: {
    ...TextStyles.caption,
    color: textMuted,
    marginHorizontal: 16,
  },
  form: {
    gap: 20,
  },
  errorText: {
    ...TextStyles.caption,
    color: '#ef4444',
    textAlign: 'center',
  },
  fieldError: {
    ...TextStyles.caption,
    color: '#ef4444',
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 12,
  },
  forgotPassword: {
    marginTop: 24,
    alignItems: 'center',
  },
  forgotPasswordText: {
    ...TextStyles.body,
    color: textMuted,
    fontSize: 14,
  },
});














