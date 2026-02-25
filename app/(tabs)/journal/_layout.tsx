import { bgPrimary } from '@/constants/Colors';
import { Stack } from 'expo-router';
import React from 'react';

export default function JournalTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bgPrimary } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}


