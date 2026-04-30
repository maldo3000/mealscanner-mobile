import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { glassBorder, neonGreen } from '@/constants/Colors';
import { Spacing } from '@/constants/Spacing';
import { FontFamilies, TextStyles } from '@/constants/Typography';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import {
  type DevChatIntent,
  type DevChatMessage,
  getInternalAccessSettings,
  invokeDevChatAssistant,
} from '@/lib/supabase';

interface ChatBubble extends DevChatMessage {
  id: string;
  isLoading?: boolean;
  contextSummary?: {
    meals_count: number;
    has_goals: boolean;
    days_window: number;
  };
}

const INTENT_CHIPS: { label: string; prompt: string; intent: DevChatIntent }[] = [
  {
    label: 'Weekly summary',
    prompt: 'Give me a summary of what I ate this week.',
    intent: 'weekly_summary',
  },
  {
    label: 'Grocery list',
    prompt: 'Build a grocery list based on what I ate this week.',
    intent: 'grocery_list',
  },
  {
    label: 'Nutrition insights',
    prompt: 'What nutrition patterns do you see in my recent meals?',
    intent: 'nutrition_insights',
  },
  {
    label: 'Explain analysis',
    prompt: 'Why was my most recent meal analyzed the way it was?',
    intent: 'analysis_explainer',
  },
];

function nextId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function DevChatScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasDevMode, setHasDevMode] = useState(false);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);

  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<ChatBubble>>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (!user) {
        if (mounted) {
          setHasDevMode(false);
          setIsLoadingAccess(false);
        }
        return;
      }
      const { data } = await getInternalAccessSettings(user.id);
      if (!mounted) return;
      setHasDevMode(Boolean(data?.dev_mode_enabled));
      setIsLoadingAccess(false);
    };
    void check();
    return () => {
      mounted = false;
    };
  }, [user]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const sendMessage = useCallback(
    async (text: string, intentHint?: DevChatIntent) => {
      if (!text.trim() || isSending) return;

      const userBubble: ChatBubble = {
        id: nextId(),
        role: 'user',
        content: text.trim(),
      };

      const loadingBubble: ChatBubble = {
        id: nextId(),
        role: 'assistant',
        content: '',
        isLoading: true,
      };

      setMessages((prev) => [...prev, userBubble, loadingBubble]);
      setInputText('');
      setIsSending(true);
      scrollToEnd();

      const conversationHistory: DevChatMessage[] = [
        ...messages
          .filter((m) => !m.isLoading)
          .map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: text.trim() },
      ];

      const { data, error } = await invokeDevChatAssistant({
        messages: conversationHistory,
        intentHint,
        daysWindow: 7,
      });

      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== loadingBubble.id);
        if (error || !data?.success) {
          const errMsg =
            data?.error ||
            (error instanceof Error ? error.message : 'Something went wrong. Please try again.');
          return [
            ...updated,
            {
              id: nextId(),
              role: 'assistant' as const,
              content: errMsg,
            },
          ];
        }
        return [
          ...updated,
          {
            id: nextId(),
            role: 'assistant' as const,
            content: data.answer ?? 'No response received.',
            contextSummary: data.context_summary
              ? {
                  meals_count: data.context_summary.meals_count,
                  has_goals: data.context_summary.has_goals,
                  days_window: data.context_summary.days_window,
                }
              : undefined,
          },
        ];
      });

      setIsSending(false);
      scrollToEnd();
    },
    [isSending, messages, scrollToEnd],
  );

  const handleChipPress = useCallback(
    (chip: (typeof INTENT_CHIPS)[number]) => {
      void sendMessage(chip.prompt, chip.intent);
    },
    [sendMessage],
  );

  const handleSend = useCallback(() => {
    void sendMessage(inputText);
  }, [inputText, sendMessage]);

  const renderBubble = useCallback(
    ({ item }: { item: ChatBubble }) => {
      const isUser = item.role === 'user';

      if (item.isLoading) {
        return (
          <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
            <View
              style={[
                styles.bubble,
                styles.assistantBubble,
                { backgroundColor: tokens.glassSurface, borderColor: glassBorder },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color={neonGreen} />
                <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginLeft: Spacing.sm }]}>
                  Thinking...
                </Text>
              </View>
            </View>
          </View>
        );
      }

      return (
        <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}>
          <View
            style={[
              styles.bubble,
              isUser
                ? [styles.userBubble, { backgroundColor: `${neonGreen}20`, borderColor: neonGreen }]
                : [styles.assistantBubble, { backgroundColor: tokens.glassSurface, borderColor: glassBorder }],
            ]}
          >
            <Text
              style={[
                TextStyles.body,
                { color: tokens.textPrimary },
              ]}
              selectable
            >
              {item.content}
            </Text>
            {item.contextSummary && (
              <Text style={[TextStyles.caption, { color: tokens.textMuted, marginTop: Spacing.xs }]}>
                {item.contextSummary.meals_count} meals analyzed
                {item.contextSummary.has_goals ? ' (with goals)' : ''}
                {` | ${item.contextSummary.days_window}d window`}
              </Text>
            )}
          </View>
        </View>
      );
    },
    [tokens],
  );

  const renderEmptyState = useCallback(() => {
    return (
      <View style={styles.emptyContainer}>
        <Card variant="glass" padding="md" style={styles.scopeCard}>
          <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, textAlign: 'center' }]}>
            Developer Chat (read-only) — Ask for weekly summaries, grocery lists, and analysis
            explanations from your last 7 days. Editing meals or goals is not supported yet.
          </Text>
        </Card>

        <Text
          style={[
            TextStyles.label,
            { color: tokens.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.md },
          ]}
        >
          Try asking:
        </Text>

        <View style={styles.chipsContainer}>
          {INTENT_CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.intent}
              style={[
                styles.intentChip,
                { borderColor: glassBorder, backgroundColor: tokens.glassSurface },
              ]}
              onPress={() => handleChipPress(chip)}
              disabled={isSending}
              activeOpacity={0.7}
            >
              <Text style={[TextStyles.bodySmall, { color: neonGreen }]}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [tokens, isSending, handleChipPress]);

  if (isLoadingAccess) {
    return (
      <PageContainer edges={['top']}>
        <PageHeader
          title="Dev Chat"
          leftAction={
            <TouchableOpacity onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color={tokens.textPrimary} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={neonGreen} />
          <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: Spacing.md }]}>
            Checking developer access...
          </Text>
        </View>
      </PageContainer>
    );
  }

  if (!hasDevMode) {
    return (
      <PageContainer edges={['top']}>
        <PageHeader
          title="Dev Chat"
          leftAction={
            <TouchableOpacity onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color={tokens.textPrimary} />
            </TouchableOpacity>
          }
        />
        <View style={styles.centerContent}>
          <Card variant="glass" padding="md">
            <Text style={[TextStyles.body, { color: tokens.textPrimary }]}>
              Developer mode is not enabled for this account.
            </Text>
            <Text style={[TextStyles.bodySmall, { color: tokens.textMuted, marginTop: Spacing.xs }]}>
              Enable Developer Mode from Profile settings to use this feature.
            </Text>
          </Card>
        </View>
      </PageContainer>
    );
  }

  return (
    <PageContainer edges={['top']} noPadding>
      <View style={{ paddingHorizontal: Spacing.base }}>
        <PageHeader
          title="Dev Chat"
          leftAction={
            <TouchableOpacity onPress={() => router.back()}>
              <IconSymbol name="chevron.left" size={24} color={tokens.textPrimary} />
            </TouchableOpacity>
          }
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 20}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderBubble}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.messagesListEmpty,
          ]}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={scrollToEnd}
        />

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: tokens.glassSurface,
              borderTopColor: glassBorder,
              paddingBottom: Math.max(Spacing.sm, insets.bottom),
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={[
              styles.textInput,
              {
                color: tokens.textPrimary,
                backgroundColor: `${tokens.glassSurface}`,
                borderColor: glassBorder,
                fontFamily: FontFamilies.body,
              },
            ]}
            placeholderTextColor={tokens.textMuted}
            placeholder="Ask about your meals..."
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
            editable={!isSending}
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim() && !isSending ? neonGreen : `${neonGreen}30`,
              },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            activeOpacity={0.7}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <IconSymbol name="paperplane.fill" size={18} color="#000" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  messagesList: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  messagesListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
  },
  scopeCard: {
    width: '100%',
    maxWidth: 360,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
    maxWidth: 360,
  },
  intentChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bubbleRow: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '85%',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    borderBottomLeftRadius: 4,
    flexDirection: 'column',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: Spacing.base,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 120,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
