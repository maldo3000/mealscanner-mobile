import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

interface AnimatedCardProps {
  title: string;
  description: string;
  icon: string;
  onPress?: () => void;
}

export function AnimatedCard({ title, description, icon, onPress }: AnimatedCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Animated values
  const scale = useSharedValue(1);
  const backgroundColor = useSharedValue(0);
  
  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      backgroundColor: interpolateColor(
        backgroundColor.value,
        [0, 1],
        [colors.background, colors.surface]
      ),
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15 });
    backgroundColor.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
    backgroundColor.value = withTiming(0, { duration: 150 });
  };

  const styles = StyleSheet.create({
    card: {
      padding: 20,
      marginBottom: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 16,
    },
    content: {
      flex: 1,
    },
    badge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginTop: 8,
    },
  });

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.header}>
          <IconSymbol name={icon as any} size={32} color={colors.primary} />
          <View style={styles.content}>
            <Text style={[TextStyles.h4, { color: colors.text }]}>{title}</Text>
            <Text style={[TextStyles.body, { color: colors.icon, marginTop: 4 }]}>{description}</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <Text style={[TextStyles.caption, { color: 'white' }]}>
            ✨ Animated with Reanimated
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
} 