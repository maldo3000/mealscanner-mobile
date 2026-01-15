import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { ContentContainer } from '@/components/layout/ContentContainer';
import { Section } from '@/components/layout/Section';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen } from '@/constants/Colors';
import { Spacing, PageSpacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, updateUserProfile } from '@/lib/supabase';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      
      try {
        setEmail(user.email || '');
        const { data, error } = await getUserProfile(user.id);
        
        if (error) throw error;
        
        if (data) {
          setFullName(data.full_name || '');
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile information.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await updateUserProfile(user.id, {
        full_name: fullName,
      });
      
      if (error) throw error;
      
      Alert.alert('Success', 'Profile updated successfully.');
      router.back();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Edit Profile" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={neonGreen} />
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer edges={['top']}>
      <PageHeader 
        title="Edit Profile" 
        style={{ marginBottom: Spacing.lg }}
        leftAction={
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={28} color={colors.text} />
          </TouchableOpacity>
        }
      />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ContentContainer>
            <Section title="Personal Information">
              <View style={styles.inputWrapper}>
                <Input
                  label="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Your name"
                  autoFocus
                />
              </View>
              
              <View style={styles.inputWrapper}>
                <Input
                  label="Email Address"
                  value={email}
                  editable={false}
                  style={{ opacity: 0.6 }}
                />
                <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: Spacing.xs, marginLeft: 4 }]}>
                  Email address cannot be changed.
                </Text>
              </View>
            </Section>

            <View style={styles.footer}>
              <Button 
                variant="primary" 
                size="large" 
                fullWidth 
                onPress={handleSave}
                disabled={saving}
                noShadow // Remove the glow as requested
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </View>
          </ContentContainer>
        </ScrollView>
      </KeyboardAvoidingView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: Spacing.xl * 2,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  inputWrapper: {
    marginBottom: Spacing.lg,
  },
  footer: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xs,
  },
});

