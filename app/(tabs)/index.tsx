
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const ActionCard = ({ 
    title, 
    description, 
    buttonText, 
    icon, 
    onPress 
  }: {
    title: string;
    description: string;
    buttonText: string;
    icon: string;
    onPress: () => void;
  }) => (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <IconSymbol name={icon as any} size={32} color={colors.tint} />
        <View style={styles.cardContent}>
          <Text style={[TextStyles.h4, { color: colors.text }]}>{title}</Text>
          <Text style={[TextStyles.bodySmall, { color: colors.icon, marginTop: 4 }]}>
            {description}
          </Text>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.actionButton} 
        onPress={onPress}
      >
        <Text style={[TextStyles.button, { color: colors.tint }]}>
          {buttonText}
        </Text>
        <IconSymbol name="chevron.right" size={16} color={colors.tint} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerContent}>
          <View style={{ width: 24 }} />
          <View style={styles.logoContainer}>
            <View style={[styles.logoIcon, { backgroundColor: colors.tint }]}>
              <IconSymbol name="fork.knife" size={24} color="white" />
            </View>
            <Text style={[TextStyles.h3, { color: colors.text }]}>MealScanner</Text>
          </View>
          <TouchableOpacity>
            <IconSymbol name="person" size={24} color={colors.icon} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>


        <ActionCard
          icon="camera"
          title="Capture a Meal"
          description="Take a photo of your food or describe it to get instant nutritional analysis."
          buttonText="Get started"
          onPress={() => router.push('/(tabs)/log')}
        />

        <ActionCard
          icon="book"
          title="View Journal"
          description="Track your meal history and nutrition patterns over time."
          buttonText="See your meals"
          onPress={() => router.push('/(tabs)/journal')}
        />

        <ActionCard
          icon="target"
          title="Edit Your Goal"
          description="Update your health data and nutrition targets."
          buttonText="Update goals"
          onPress={() => router.push('/(tabs)/settings')}
        />

        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={[TextStyles.h4, { color: colors.text }]}>Recent Meals</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/journal')}>
              <Text style={[TextStyles.button, { color: colors.tint }]}>
                View all
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="plus" size={32} color={colors.icon} />
            <Text style={[TextStyles.subtitle, { color: colors.icon, marginTop: 8 }]}>
              No meals logged yet
            </Text>
            <Text style={[TextStyles.body, { color: colors.icon, textAlign: 'center' }]}>
              Start by capturing your first meal
            </Text>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },

  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 16,
  },
  cardContent: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  recentSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyState: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
});
