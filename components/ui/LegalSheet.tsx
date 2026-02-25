/**
 * LegalSheet Component
 * Bottom sheet for displaying Terms of Service and Privacy Policy
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Markdown from 'react-native-markdown-display';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, neonGreen } from '@/constants/Colors';
import { BorderRadius } from '@/constants/Layout';
import { Spacing } from '@/constants/Spacing';
import { useColorScheme } from '@/hooks/useColorScheme';
import { PRIVACY_POLICY_CONTENT } from '@/constants/PrivacyPolicyContent';
import { TERMS_OF_SERVICE_CONTENT } from '@/constants/TermsOfServiceContent';

export type LegalContentType = 'privacy' | 'terms';

interface LegalSheetProps {
  contentType: LegalContentType;
  onClose: () => void;
}

export const LegalSheet = forwardRef<BottomSheet, LegalSheetProps>(
  ({ contentType, onClose }, ref) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'dark'];

    // Snap points
    const snapPoints = useMemo(() => ['85%'], []);

    // Get content based on type
    const content = contentType === 'privacy' ? PRIVACY_POLICY_CONTENT : TERMS_OF_SERVICE_CONTENT;
    const title = contentType === 'privacy' ? 'Privacy Policy' : 'Terms of Service';

    // Backdrop component
    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.6}
        />
      ),
      []
    );

    // Markdown styles
    const markdownStyles = useMemo(() => StyleSheet.create({
      body: {
        color: colors.text,
        fontSize: 14,
        lineHeight: 22,
      },
      heading1: {
        color: neonGreen,
        fontSize: 24,
        fontWeight: '700',
        marginTop: Spacing.md,
        marginBottom: Spacing.md,
        lineHeight: 30,
      },
      heading2: {
        color: neonGreen,
        fontSize: 18,
        fontWeight: '600',
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
        lineHeight: 24,
      },
      heading3: {
        color: colors.text,
        fontSize: 16,
        fontWeight: '600',
        marginTop: Spacing.md,
        marginBottom: Spacing.xs,
        lineHeight: 22,
      },
      paragraph: {
        marginBottom: Spacing.md,
      },
      list_item: {
        color: colors.text,
        marginBottom: Spacing.xs,
      },
      bullet_list: {
        marginBottom: Spacing.md,
      },
      strong: {
        fontWeight: '700',
      },
      link: {
        color: neonGreen,
        textDecorationLine: 'underline',
      },
      hr: {
        backgroundColor: colors.icon,
        height: 1,
        marginVertical: Spacing.lg,
      },
    }), [colors]);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.background }]}
        handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colors.icon }]}
        onChange={(index) => {
          if (index === -1) onClose();
        }}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
          <TouchableOpacity onPress={() => (ref as any)?.current?.close()}>
            <IconSymbol name="xmark.circle.fill" size={28} color={colors.icon} />
          </TouchableOpacity>
        </View>
        
        <BottomSheetScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Markdown style={markdownStyles}>
            {content}
          </Markdown>
          <View style={styles.bottomSpacer} />
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

LegalSheet.displayName = 'LegalSheet';

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  bottomSpacer: {
    height: 40,
  },
});

export default LegalSheet;
