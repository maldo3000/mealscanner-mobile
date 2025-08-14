import { IconSymbol } from '@/components/ui/IconSymbol';
import { getFontFamily } from '@/constants/Colors';
import { getCurrentUser, signInWithPassword, signUpWithPassword, supabase } from '@/lib/supabase';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type AuthMode = 'signin' | 'signup';
type AuthState = 'form' | 'verification' | 'authenticated';

export const SupabaseTest = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authState, setAuthState] = useState<AuthState>('form');

  useEffect(() => {
    checkUser();
    
    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event, session?.user?.email_confirmed_at);
        setUser(session?.user || null);
        
        if (event === 'SIGNED_IN') {
          setConnectionStatus(`✅ Successfully signed in as ${session?.user?.email}`);
          setAuthState('authenticated');
          setPassword(''); // Clear password for security
          setConfirmPassword(''); // Clear confirm password
        } else if (event === 'SIGNED_OUT') {
          setConnectionStatus('👋 Signed out successfully');
          setAuthState('form');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    try {
      const { user, error } = await getCurrentUser();
      console.log('Current user:', { user, error });
      setUser(user);
      if (user) {
        setAuthState('authenticated');
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Information', 'Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    // Password confirmation validation for sign up
    if (authMode === 'signup') {
      if (!confirmPassword.trim()) {
        Alert.alert('Confirm Password', 'Please confirm your password.');
        return;
      }
      
      if (password !== confirmPassword) {
        Alert.alert('Passwords Don\'t Match', 'Please make sure both passwords are identical.');
        return;
      }
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    try {
      setAuthLoading(true);
      
      if (authMode === 'signup') {
        setConnectionStatus('Creating account...');
        const { data, error } = await signUpWithPassword(email.trim(), password);
        
        if (error) {
          // Handle specific error cases
          if (error.message.includes('User already registered')) {
            Alert.alert('Account Exists', 'An account with this email already exists. Please sign in instead.');
            setConnectionStatus('❌ Account already exists');
            setAuthMode('signin'); // Switch to sign in mode
          } else if (error.message.includes('Invalid email')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            setConnectionStatus('❌ Invalid email address');
          } else if (error.message.includes('Password')) {
            Alert.alert('Password Error', error.message);
            setConnectionStatus('❌ Password requirements not met');
          } else {
            Alert.alert('Sign Up Error', `Error: ${error.message}`);
            setConnectionStatus(`❌ Sign Up Error: ${error.message}`);
          }
        } else {
          // Check if email confirmation is required
          if (data.user && !data.session) {
            // User was created but needs email verification
            setAuthState('verification');
            setConnectionStatus('📧 Please check your email to verify your account');
            Alert.alert(
              'Verify Your Email', 
              `We've sent a verification link to ${email.trim()}. Please check your email and click the link to activate your account.`,
              [{ text: 'OK' }]
            );
          } else if (data.session) {
            // User was created and automatically signed in
            Alert.alert('Welcome!', 'Account created successfully! You are now signed in.');
            setConnectionStatus(`✅ Account created and signed in`);
            setAuthState('authenticated');
          }
          setPassword(''); // Clear password for security
          setConfirmPassword(''); // Clear confirm password
        }
      } else {
        setConnectionStatus('Signing in...');
        const { data, error } = await signInWithPassword(email.trim(), password);
        
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            Alert.alert('Sign In Failed', 'Invalid email or password. Please check your credentials and try again.');
            setConnectionStatus('❌ Invalid email or password');
          } else if (error.message.includes('Email not confirmed')) {
            Alert.alert('Email Not Verified', 'Please check your email and click the verification link before signing in.');
            setConnectionStatus('❌ Email not verified');
          } else if (error.message.includes('Too many requests')) {
            Alert.alert('Too Many Attempts', 'Too many sign in attempts. Please wait a moment and try again.');
            setConnectionStatus('❌ Too many attempts, please wait');
          } else {
            Alert.alert('Sign In Error', `Error: ${error.message}`);
            setConnectionStatus(`❌ Sign In Error: ${error.message}`);
          }
        } else {
          Alert.alert('Welcome back!', 'Successfully signed in!');
          setConnectionStatus(`✅ Signed in successfully`);
          setAuthState('authenticated');
          setPassword('');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to ${authMode === 'signup' ? 'create account' : 'sign in'}: ${error.message}`);
      setConnectionStatus(`❌ Error: ${error.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const resendVerification = async () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address.');
      return;
    }

    try {
      setAuthLoading(true);
      setConnectionStatus('Resending verification email...');
      
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        Alert.alert('Resend Failed', `Error: ${error.message}`);
        setConnectionStatus(`❌ Failed to resend: ${error.message}`);
      } else {
        Alert.alert('Email Sent', 'Verification email sent! Please check your inbox.');
        setConnectionStatus('📧 Verification email resent');
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to resend verification: ${error.message}`);
      setConnectionStatus(`❌ Resend error: ${error.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const backToForm = () => {
    setAuthState('form');
    setConnectionStatus('');
  };

  const testConnection = async () => {
    try {
      setAuthLoading(true);
      setConnectionStatus('Testing connection...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      
      if (error) {
        if (error.message.includes('relation "public.profiles" does not exist')) {
          setConnectionStatus('❌ Database tables not created yet');
          Alert.alert(
            'Database Setup Required', 
            'The database tables haven\'t been created yet. You need to run the SQL schema in your Supabase Dashboard.'
          );
        } else {
          setConnectionStatus(`❌ Database Error: ${error.message}`);
          Alert.alert('Database Error', error.message);
        }
      } else {
        setConnectionStatus('✅ Supabase connection working!');
        Alert.alert('Success', 'Supabase connection working perfectly!');
      }
    } catch (error: any) {
      setConnectionStatus(`❌ Connection Error: ${error.message}`);
      Alert.alert('Connection Error', `Failed to connect: ${error.message}`);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (user && authState === 'authenticated') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <IconSymbol name="camera" size={24} color="white" />
            </View>
            <Text style={styles.logoText}>MealScanner</Text>
          </View>
        </View>

        <View style={styles.authenticatedContent}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          
          {connectionStatus ? (
            <Text style={styles.statusText}>{connectionStatus}</Text>
          ) : null}

          <TouchableOpacity 
            style={[styles.testButton, authLoading && styles.buttonDisabled]} 
            onPress={testConnection}
            disabled={authLoading}
          >
            <Text style={styles.buttonText}>
              {authLoading ? 'Testing...' : 'Test Database Connection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.signOutButton} 
            onPress={() => supabase.auth.signOut()}
          >
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (authState === 'verification') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <IconSymbol name="camera" size={24} color="white" />
            </View>
            <Text style={styles.logoText}>MealScanner</Text>
          </View>
        </View>

        <View style={styles.authContent}>
          <View style={styles.verificationIcon}>
            <IconSymbol name="checkmark" size={48} color="#22C55E" />
          </View>
          <Text style={styles.authTitle}>Check Your Email</Text>
          <Text style={styles.authSubtitle}>
            We've sent a verification link to {email}
          </Text>
          <Text style={styles.verificationInstructions}>
            Please check your email and click the verification link to activate your account. 
            You may need to check your spam folder.
          </Text>

          {connectionStatus ? (
            <Text style={styles.statusText}>{connectionStatus}</Text>
          ) : null}

          <View style={styles.verificationActions}>
            <TouchableOpacity 
              style={[styles.secondaryButton, authLoading && styles.buttonDisabled]} 
              onPress={resendVerification}
              disabled={authLoading}
            >
              <Text style={styles.secondaryButtonText}>
                {authLoading ? 'Resending...' : 'Resend Email'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={backToForm}
            >
              <Text style={styles.linkButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <IconSymbol name="camera" size={24} color="white" />
          </View>
          <Text style={styles.logoText}>MealScanner</Text>
        </View>
      </View>

      <View style={styles.authContent}>
        <Text style={styles.authTitle}>
          {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
        </Text>
        <Text style={styles.authSubtitle}>
          {authMode === 'signin' 
            ? 'Sign in to your account' 
            : 'Create your new account'
          }
        </Text>

        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#6B7280"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          {authMode === 'signup' && (
            <>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="••••••••"
                placeholderTextColor="#6B7280"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </>
          )}

          {authMode === 'signin' && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.authButton, authLoading && styles.buttonDisabled]} 
            onPress={handleAuth}
            disabled={authLoading}
          >
            <Text style={styles.buttonText}>
              {authLoading 
                ? (authMode === 'signin' ? 'Signing In...' : 'Creating Account...') 
                : (authMode === 'signin' ? 'Sign In' : 'Sign Up')
              }
            </Text>
          </TouchableOpacity>

          <View style={styles.switchModeContainer}>
            <Text style={styles.switchModeText}>
              {authMode === 'signin' 
                ? "Don't have an account? " 
                : "Already have an account? "
              }
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                setPassword('');
                setConfirmPassword('');
                setConnectionStatus('');
              }}
            >
              <Text style={styles.switchModeLink}>
                {authMode === 'signin' ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {connectionStatus ? (
          <Text style={styles.statusText}>{connectionStatus}</Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1F2937', // Dark background like in screenshot
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1F2937',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    gap: 16,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: getFontFamily(),
  },
  authContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#22C55E',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: getFontFamily(),
  },
  authSubtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 40,
    fontFamily: getFontFamily(),
  },
  formContainer: {
    gap: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    marginBottom: 8,
    fontFamily: getFontFamily(),
  },
  input: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: '#4B5563',
    fontFamily: getFontFamily(),
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -10,
  },
  forgotPasswordText: {
    color: '#22C55E',
    fontSize: 14,
  },
  authButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#6B7280',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchModeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  switchModeText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  switchModeLink: {
    color: '#22C55E',
    fontSize: 14,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    padding: 12,
    backgroundColor: '#374151',
    borderRadius: 8,
    color: 'white',
    fontFamily: 'monospace',
  },
  authenticatedContent: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22C55E',
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  signOutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
  },
  verificationIcon: {
    alignItems: 'center',
    marginBottom: 24,
  },
  verificationInstructions: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  verificationActions: {
    gap: 16,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#22C55E',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    minWidth: 200,
  },
  secondaryButtonText: {
    color: '#22C55E',
    fontSize: 16,
    fontWeight: '500',
  },
  linkButton: {
    padding: 8,
  },
  linkButtonText: {
    color: '#6B7280',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
}); 