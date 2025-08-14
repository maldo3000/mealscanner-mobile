import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function SettingsScreen() {
  const [showMetrics, setShowMetrics] = React.useState(true);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[TextStyles.h2, { color: colors.text }]}>Settings</Text>
      </View>
      
      <View style={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={[TextStyles.h4, { color: colors.text, marginBottom: 12 }]}>Profile</Text>
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[TextStyles.body, { color: colors.text }]}>👤 Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[TextStyles.body, { color: colors.text }]}>🎯 Nutrition Goals</Text>
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={[TextStyles.h4, { color: colors.text, marginBottom: 12 }]}>Preferences</Text>
          
          <View style={[styles.settingItemWithSwitch, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[TextStyles.body, { color: colors.text }]}>📊 Show Nutrition Metrics</Text>
            <Switch
              value={showMetrics}
              onValueChange={setShowMetrics}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={showMetrics ? colors.background : colors.icon}
            />
          </View>
          
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[TextStyles.body, { color: colors.text }]}>🔔 Notifications</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[TextStyles.body, { color: colors.text }]}>📱 Units & Display</Text>
          </TouchableOpacity>
        </View>

        {/* Data Section */}
        <View style={styles.section}>
          <Text style={[TextStyles.h4, { color: colors.text, marginBottom: 12 }]}>Data</Text>
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[TextStyles.body, { color: colors.text }]}>📤 Export Data</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[TextStyles.body, { color: colors.text }]}>🗑️ Clear History</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[TextStyles.body, { color: colors.text }]}>ℹ️ About MealScanner</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[TextStyles.body, { color: colors.text }]}>📋 Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  settingItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
  },
  settingItemWithSwitch: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
}); 