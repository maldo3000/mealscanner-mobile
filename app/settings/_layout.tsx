import { bgPrimary } from '@/constants/Colors';
import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: bgPrimary },
      }}
    >
      <Stack.Screen name="nutrition-goals" />
      <Stack.Screen name="how-it-works" />
      <Stack.Screen name="contact-support" />
      <Stack.Screen name="report-bug" />
      <Stack.Screen name="dev-chat" />
    </Stack>
  );
}

























