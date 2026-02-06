import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, glassBorder, glassSurface, neonGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

export interface CaptureQuadProps {
  onSnap: () => void;
  onDescribe: () => void;
  onSearch: () => void;
  onExtractRecipe: () => void;
}

interface QuadOptionProps {
  title: string;
  subtitle: string;
  icon: string;
  accent?: boolean;
  onPress: () => void;
}

function QuadOption(props: QuadOptionProps): React.ReactElement {
  const { title, subtitle, icon, onPress, accent = false } = props;

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: (pressed || accent) ? 'rgba(16, 185, 129, 0.1)' : glassSurface,
          borderColor: (pressed || accent) ? neonGreen : glassBorder,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          shadowColor: (pressed || accent) ? neonGreen : '#000',
          shadowOpacity: (pressed || accent) ? 0.3 : 0.1,
          shadowRadius: (pressed || accent) ? 12 : 8,
          shadowOffset: { width: 0, height: 4 },
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.optionIcon, { backgroundColor: (pressed || accent) ? `${neonGreen}25` : 'rgba(255,255,255,0.08)' }]}>
            <IconSymbol name={icon as never} size={28} color={(pressed || accent) ? neonGreen : colors.icon} />
          </View>
          <View style={styles.optionTextContainer}>
            <Text style={[TextStyles.h4, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
            <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: 8, textAlign: 'center', lineHeight: 18 }]}>
              {subtitle}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

export function CaptureQuad(props: CaptureQuadProps): React.ReactElement {
  const { onSnap, onDescribe, onSearch, onExtractRecipe } = props;
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.grid}>
        <View style={styles.row}>
          <QuadOption
            title="Photo"
            subtitle="Open the camera and take a photo"
            icon="camera"
            onPress={onSnap}
          />
          <QuadOption title="Describe" subtitle="Type or speak what you ate" icon="mic" onPress={onDescribe} />
        </View>
        <View style={styles.row}>
          <QuadOption
            title="Search"
            subtitle="Manual entry for brands & measurements"
            icon="magnifyingglass"
            onPress={onSearch}
          />
          <QuadOption
            title="Extract Recipe"
            subtitle="Scan a dish photo and save it to Recipes"
            icon="sparkles"
            onPress={onExtractRecipe}
          />
        </View>
      </View>

      {/* Spacer to clear the floating bottom navigation bar */}
      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.xl,
    flexGrow: 1,
  },
  grid: {
    gap: 16,
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  option: {
    flex: 1,
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 24,
    borderRadius: 24,
    borderWidth: 1.5,
    elevation: 4,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
});


