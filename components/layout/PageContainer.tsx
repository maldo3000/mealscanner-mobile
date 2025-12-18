import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { bgPrimary } from '@/constants/Colors';
import { PageSpacing } from '@/constants/Spacing';

interface PageContainerProps extends ViewProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  noPadding?: boolean;
}

/**
 * Standardized page container wrapper
 * Handles safe area insets and provides consistent background and padding
 */
export function PageContainer({
  children,
  edges = ['top'],
  backgroundColor = bgPrimary,
  noPadding = false,
  style,
  ...props
}: PageContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor },
        style,
      ]}
      edges={edges}
      {...props}
    >
      {noPadding ? (
        children
      ) : (
        <View
          style={[
            styles.content,
            { paddingHorizontal: PageSpacing.containerPadding },
          ]}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

