import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, ScrollViewProps, StyleSheet, View, ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageSpacing, SafeAreaSpacing } from '@/constants/Spacing';

interface ContentContainerProps extends ViewProps {
  children: React.ReactNode;
  scrollable?: boolean;
  keyboardAvoiding?: boolean;
  keyboardBehavior?: 'padding' | 'height' | 'position';
  contentPadding?: boolean;
  refreshControl?: React.ReactElement<typeof RefreshControl>;
}

/**
 * Standardized content wrapper component
 * Handles scrolling, keyboard avoidance, and consistent padding
 */
export function ContentContainer({
  children,
  scrollable = true,
  keyboardAvoiding = false,
  keyboardBehavior = Platform.OS === 'ios' ? 'padding' : 'height',
  contentPadding = true,
  refreshControl,
  style,
  ...props
}: ContentContainerProps) {
  const insets = useSafeAreaInsets();

  const contentStyle = [
    contentPadding && {
      paddingBottom: insets.bottom + SafeAreaSpacing.bottomOffset,
    },
  ];

  const content = (
    <View style={contentStyle}>
      {children}
    </View>
  );

  if (keyboardAvoiding) {
    return (
      <KeyboardAvoidingView
        style={[styles.container, style]}
        behavior={keyboardBehavior}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        {...props}
      >
        {scrollable ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    );
  }

  if (scrollable) {
    return (
      <ScrollView
        style={[styles.container, styles.scrollView, style]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        {...props}
      >
        {content}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, style]} {...props}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

