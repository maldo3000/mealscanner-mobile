import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { getDailyNutritionTip } from '@/lib/nutritionTips';

type ReminderKey = 'morning' | 'midday' | 'dinner' | 'dailyTip' | 'weeklyReport';

interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
}

export interface NotificationSettings {
  masterEnabled: boolean;
  morning: ReminderSettings;
  midday: ReminderSettings;
  dinner: ReminderSettings;
  dailyTip: ReminderSettings;
  weeklyReport: { enabled: boolean };
}

interface ScheduledNotificationIds {
  morning?: string;
  midday?: string;
  dinner?: string;
  dailyTip?: string;
  weeklyReport?: string;
}

const NOTIFICATION_SETTINGS_KEY = '@mealscanner_notification_settings';
const NOTIFICATION_IDS_KEY = '@mealscanner_notification_ids';
const WEEKLY_REPORT_NEXT_DATE_KEY = '@mealscanner_weekly_report_next_date';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  masterEnabled: false,
  morning: { enabled: true, hour: 8, minute: 30 },
  midday: { enabled: true, hour: 12, minute: 30 },
  dinner: { enabled: true, hour: 18, minute: 30 },
  dailyTip: { enabled: true, hour: 15, minute: 0 },
  weeklyReport: { enabled: true },
} as const;

let notificationHandlerConfigured = false;

function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return 8;
  return Math.max(0, Math.min(23, Math.floor(hour)));
}

function clampMinute(minute: number): number {
  if (!Number.isFinite(minute)) return 0;
  return Math.max(0, Math.min(59, Math.floor(minute)));
}

function sanitizeReminder(input: Partial<ReminderSettings> | undefined, fallback: ReminderSettings): ReminderSettings {
  return {
    enabled: typeof input?.enabled === 'boolean' ? input.enabled : fallback.enabled,
    hour: clampHour(typeof input?.hour === 'number' ? input.hour : fallback.hour),
    minute: clampMinute(typeof input?.minute === 'number' ? input.minute : fallback.minute),
  };
}

function sanitizeSettings(input: Partial<NotificationSettings> | null | undefined): NotificationSettings {
  return {
    masterEnabled:
      typeof input?.masterEnabled === 'boolean'
        ? input.masterEnabled
        : DEFAULT_NOTIFICATION_SETTINGS.masterEnabled,
    morning: sanitizeReminder(input?.morning, DEFAULT_NOTIFICATION_SETTINGS.morning),
    midday: sanitizeReminder(input?.midday, DEFAULT_NOTIFICATION_SETTINGS.midday),
    dinner: sanitizeReminder(input?.dinner, DEFAULT_NOTIFICATION_SETTINGS.dinner),
    dailyTip: sanitizeReminder(input?.dailyTip, DEFAULT_NOTIFICATION_SETTINGS.dailyTip),
    weeklyReport: {
      enabled: typeof input?.weeklyReport?.enabled === 'boolean' 
        ? input.weeklyReport.enabled 
        : DEFAULT_NOTIFICATION_SETTINGS.weeklyReport.enabled
    },
  };
}

async function loadScheduledIds(): Promise<ScheduledNotificationIds> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ScheduledNotificationIds;
    return parsed ?? {};
  } catch (error) {
    console.warn('Failed to load notification IDs:', error);
    return {};
  }
}

async function saveScheduledIds(ids: ScheduledNotificationIds): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(ids));
  } catch (error) {
    console.warn('Failed to persist notification IDs:', error);
  }
}

async function scheduleDailyNotification(
  title: string,
  body: string,
  hour: number,
  minute: number,
  route: 'log' | 'tip'
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: 'default',
      data: { route },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function initializeNotifications(): Promise<void> {
  if (!notificationHandlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerConfigured = true;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#22c55e',
  });
}

export async function areNotificationsEnabledOnDevice(): Promise<boolean> {
  const permissions = await Notifications.getPermissionsAsync();
  return permissions.granted || permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted || existing.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return sanitizeSettings(parsed);
  } catch (error) {
    console.warn('Failed to load notification settings:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(sanitizeSettings(settings)));
  } catch (error) {
    console.warn('Failed to persist notification settings:', error);
  }
}

export async function updateWeeklyReportAvailableDate(date: string | null): Promise<void> {
  try {
    if (date) {
      await AsyncStorage.setItem(WEEKLY_REPORT_NEXT_DATE_KEY, date);
    } else {
      await AsyncStorage.removeItem(WEEKLY_REPORT_NEXT_DATE_KEY);
    }
  } catch (error) {
    console.warn('Failed to update weekly report date:', error);
  }
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  const existingIds = await loadScheduledIds();
  const ids = Object.values(existingIds).filter(Boolean) as string[];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await saveScheduledIds({});
}

export async function syncScheduledNotifications(settings: NotificationSettings): Promise<void> {
  await initializeNotifications();
  await cancelAllScheduledNotifications();

  if (!settings.masterEnabled) {
    return;
  }

  const hasPermission = await areNotificationsEnabledOnDevice();
  if (!hasPermission) {
    return;
  }

  const nextIds: ScheduledNotificationIds = {};
  const todaysTip = getDailyNutritionTip(new Date());

  if (settings.morning.enabled) {
    nextIds.morning = await scheduleDailyNotification(
      'Start your day strong',
      'Log your first meal to kick off your nutrition streak.',
      settings.morning.hour,
      settings.morning.minute,
      'log'
    );
  }

  if (settings.midday.enabled) {
    nextIds.midday = await scheduleDailyNotification(
      'Lunch check-in',
      'Take a second to log lunch and keep your progress rolling.',
      settings.midday.hour,
      settings.midday.minute,
      'log'
    );
  }

  if (settings.dinner.enabled) {
    nextIds.dinner = await scheduleDailyNotification(
      'Dinner reminder',
      'Log dinner to close out your day with better insights.',
      settings.dinner.hour,
      settings.dinner.minute,
      'log'
    );
  }

  if (settings.dailyTip.enabled) {
    nextIds.dailyTip = await scheduleDailyNotification(
      'Daily nutrition tip',
      todaysTip.title,
      settings.dailyTip.hour,
      settings.dailyTip.minute,
      'tip'
    );
  }

  // Weekly report notification
  if (settings.weeklyReport.enabled) {
    const nextDate = await AsyncStorage.getItem(WEEKLY_REPORT_NEXT_DATE_KEY);
    if (nextDate) {
      const triggerDate = new Date(nextDate);
      if (!Number.isNaN(triggerDate.getTime()) && triggerDate.getTime() > Date.now()) {
        nextIds.weeklyReport = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Weekly Report Available',
            body: 'Your personal nutritionist recap is ready! Open the app to view your insights.',
            sound: 'default',
            data: { route: 'report' },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
          },
        });
      }
    }
  }

  await saveScheduledIds(nextIds);
}

export function getNotificationRouteFromData(data: unknown): '/(tabs)/log' | '/(tabs)' | '/(tabs)/profile' | null {
  if (!data || typeof data !== 'object') return null;
  const route = (data as { route?: unknown }).route;
  if (route === 'log') return '/(tabs)/log';
  if (route === 'tip') return '/(tabs)';
  if (route === 'report') return '/(tabs)/profile';
  return null;
}
