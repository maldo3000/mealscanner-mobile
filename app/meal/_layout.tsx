import { bgPrimary } from '@/constants/Colors';
import { Stack } from 'expo-router';

export default function MealLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: bgPrimary },
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}







