import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Colors, neonGreen } from '@/constants/Colors';
import { BorderRadius } from '@/constants/Layout';
import { Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';

interface IngredientTagsProps {
  ingredients: string[];
  maxVisible?: number;
}

export function IngredientTags({ ingredients, maxVisible }: IngredientTagsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const [expanded, setExpanded] = React.useState(false);

  const visibleIngredients = expanded || !maxVisible 
    ? ingredients 
    : ingredients.slice(0, maxVisible);
  const hasMore = maxVisible && ingredients.length > maxVisible && !expanded;

  return (
    <View style={styles.container}>
      {visibleIngredients.map((ingredient, index) => (
        <View
          key={index}
          style={[
            styles.tag,
            {
              backgroundColor: `${neonGreen}20`,
              borderColor: `${neonGreen}40`,
            },
          ]}
        >
          <Text style={[TextStyles.bodySmall, { color: colors.text }]}>
            {ingredient}
          </Text>
        </View>
      ))}
      {hasMore && (
        <TouchableOpacity
          style={[
            styles.tag,
            styles.moreTag,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => setExpanded(true)}
        >
          <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
            +{ingredients.length - maxVisible} more
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tag: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
  },
  moreTag: {
    borderStyle: 'dashed',
  },
});

