import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { ContentContainer } from '@/components/layout/ContentContainer';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Section } from '@/components/layout/Section';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors, glassBorder, neonGreen } from '@/constants/Colors';
import { PageSpacing, Spacing } from '@/constants/Spacing';
import { TextStyles } from '@/constants/Typography';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
    DEFAULT_NOTIFICATION_SETTINGS,
    NotificationSettings,
    areNotificationsEnabledOnDevice,
    getNotificationSettings,
    requestNotificationPermissions,
    saveNotificationSettings,
    syncScheduledNotifications,
} from '@/lib/notifications';

type ReminderKey = 'morning' | 'midday' | 'dinner' | 'dailyTip';
type EditableReminder = ReminderKey | 'weeklyReport';

function formatTime(hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [pickerReminder, setPickerReminder] = useState<ReminderKey | null>(null);
  const [isPermissionEnabled, setIsPermissionEnabled] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [storedSettings, permissionEnabled] = await Promise.all([
        getNotificationSettings(),
        areNotificationsEnabledOnDevice(),
      ]);
      setSettings(storedSettings);
      setIsPermissionEnabled(permissionEnabled);
      setIsLoading(false);
    };

    void load();
  }, []);

  const persistAndSync = async (next: NotificationSettings): Promise<void> => {
    setSettings(next);
    await saveNotificationSettings(next);
    await syncScheduledNotifications(next);
  };

  const ensureNotificationPermission = async (): Promise<boolean> => {
    const granted = await requestNotificationPermissions();
    setIsPermissionEnabled(granted);

    if (!granted) {
      Alert.alert(
        'Notifications are off',
        'Enable notifications in system settings to receive meal reminders and daily nutrition tips.'
      );
    }

    return granted;
  };

  const handleMasterToggle = async (nextEnabled: boolean): Promise<void> => {
    if (nextEnabled) {
      const granted = await ensureNotificationPermission();
      if (!granted) {
        return;
      }
    }

    const next = { ...settings, masterEnabled: nextEnabled };
    await persistAndSync(next);
  };

  const handleReminderToggle = async (key: EditableReminder, value: boolean): Promise<void> => {
    if (value && !settings.masterEnabled) {
      const granted = await ensureNotificationPermission();
      if (!granted) return;
      const nextEnabledState: NotificationSettings = {
        ...settings,
        masterEnabled: true,
        [key]: { ...settings[key], enabled: value },
      };
      await persistAndSync(nextEnabledState);
      return;
    }

    const next: NotificationSettings = {
      ...settings,
      [key]: { ...settings[key], enabled: value },
    };
    await persistAndSync(next);
  };

  const pickerValue = useMemo(() => {
    if (!pickerReminder) return new Date();
    const selected = settings[pickerReminder];
    const date = new Date();
    date.setHours(selected.hour, selected.minute, 0, 0);
    return date;
  }, [pickerReminder, settings]);

  const handleTimeChange = async (event: DateTimePickerEvent, date?: Date) => {
    if (!pickerReminder) return;
    if (!date) {
      if (event.type === 'dismissed') {
        setPickerReminder(null);
      }
      return;
    }

    const next: NotificationSettings = {
      ...settings,
      [pickerReminder]: {
        ...settings[pickerReminder],
        hour: date.getHours(),
        minute: date.getMinutes(),
      },
    };

    await persistAndSync(next);

    if (Platform.OS !== 'ios') {
      setPickerReminder(null);
    }
  };

  const renderReminderRow = (
    key: ReminderKey,
    label: string,
    description: string
  ) => (
    <Card variant="glass" padding="none" style={[styles.settingItem, !settings.masterEnabled && styles.disabledItem]}>
      <View style={styles.settingItemContent}>
        <View style={styles.settingItemLeft}>
          <Text style={[TextStyles.body, { color: colors.text, opacity: settings.masterEnabled ? 1 : 0.5 }]}>{label}</Text>
          <Text style={[TextStyles.bodySmall, { color: colors.icon, opacity: settings.masterEnabled ? 1 : 0.5 }]}>
            {description}
          </Text>
          <TouchableOpacity
            onPress={() => setPickerReminder(key)}
            style={[styles.timeButton, { borderColor: glassBorder }]}
            disabled={!settings.masterEnabled}
          >
            <Text style={[TextStyles.bodySmall, { color: colors.text, opacity: settings.masterEnabled ? 1 : 0.5 }]}>
              {formatTime(settings[key].hour, settings[key].minute)}
            </Text>
          </TouchableOpacity>
        </View>
        <Switch
          value={settings[key].enabled}
          onValueChange={(value) => {
            void handleReminderToggle(key, value);
          }}
          trackColor={{ false: glassBorder, true: neonGreen }}
          thumbColor={settings[key].enabled ? '#000000' : colors.icon}
        />
      </View>
    </Card>
  );

  if (isLoading) {
    return (
      <PageContainer edges={['top']}>
        <PageHeader
          title="Notifications"
          leftAction={
            <TouchableOpacity onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </TouchableOpacity>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer edges={['top']}>
      <PageHeader
        title="Notifications"
        leftAction={
          <TouchableOpacity onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
        }
      />
      
      <ContentContainer scrollable>
        <Section title="General">
          <Card variant="glass" padding="none" style={styles.settingItem}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemLeft}>
                <Text style={[TextStyles.body, { color: colors.text }]}>Enable Notifications</Text>
                <Text style={[TextStyles.bodySmall, { color: colors.icon }]}>
                  Turn all reminders and daily tips on or off.
                </Text>
              </View>
              <Switch
                value={settings.masterEnabled}
                onValueChange={(value) => {
                  void handleMasterToggle(value);
                }}
                trackColor={{ false: glassBorder, true: neonGreen }}
                thumbColor={settings.masterEnabled ? '#000000' : colors.icon}
              />
            </View>
          </Card>
        </Section>

        <Section title="Meal Reminders">
          {renderReminderRow('morning', 'Morning reminder', 'Log your first meal and get started.')}
          {renderReminderRow('midday', 'Midday reminder', 'Check in and log your lunch meal.')}
          {renderReminderRow('dinner', 'Dinner reminder', 'Log dinner and complete your day.')}
        </Section>

        <Section title="Learning">
          {renderReminderRow('dailyTip', 'Daily nutrition tip', 'Get one daily tip for your nutrition journey.')}
          
          <Card variant="glass" padding="none" style={[styles.settingItem, !settings.masterEnabled && styles.disabledItem]}>
            <View style={styles.settingItemContent}>
              <View style={styles.settingItemLeft}>
                <Text style={[TextStyles.body, { color: colors.text, opacity: settings.masterEnabled ? 1 : 0.5 }]}>Weekly Report Ready</Text>
                <Text style={[TextStyles.bodySmall, { color: colors.icon, opacity: settings.masterEnabled ? 1 : 0.5 }]}>
                  Get notified when your next weekly recap is available to generate.
                </Text>
              </View>
              <Switch
                value={settings.weeklyReport.enabled}
                onValueChange={(value) => {
                  void handleReminderToggle('weeklyReport', value);
                }}
                trackColor={{ false: glassBorder, true: neonGreen }}
                thumbColor={settings.weeklyReport.enabled ? '#000000' : colors.icon}
              />
            </View>
          </Card>
        </Section>
        
        <Text style={[TextStyles.bodySmall, { color: colors.icon, textAlign: 'center', marginTop: Spacing.xl, paddingHorizontal: Spacing.xl }]}>
          Notification settings are saved locally on this device and synced with your scheduled reminders.
        </Text>

        {!isPermissionEnabled && (
          <Text style={[TextStyles.caption, { color: colors.icon, textAlign: 'center', marginTop: Spacing.sm, paddingHorizontal: Spacing.xl }]}>
            Notifications are currently disabled in system permissions.
          </Text>
        )}

        {pickerReminder && (
          <Card variant="glass" padding="none" style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <Text style={[TextStyles.body, { color: colors.text }]}>Choose reminder time</Text>
              {Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => setPickerReminder(null)}>
                  <Text style={[TextStyles.bodySmall, { color: neonGreen }]}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
            <DateTimePicker
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              value={pickerValue}
              onChange={(event, date) => {
                void handleTimeChange(event, date);
              }}
            />
          </Card>
        )}
      </ContentContainer>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  settingItem: {
    marginBottom: PageSpacing.cardGap,
  },
  disabledItem: {
    opacity: 0.6,
  },
  timeButton: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    minWidth: 88,
  },
  settingItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
  },
  settingItemLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  pickerCard: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
});







