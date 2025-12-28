import { Platform } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import * as FileSystem from 'expo-file-system/legacy';

import type { DraftMealItem, MealCaptureDraft, DatabaseFoodItem } from '@/components/capture/types';

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

let AsyncStorage: AsyncStorageLike | null = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AsyncStorage = require('@react-native-async-storage/async-storage').default as AsyncStorageLike;
}

const STORAGE_KEY = 'capture_meal_draft_v1';
const DRAFTS_DIR = `${FileSystem.documentDirectory ?? ''}captureDrafts`;
const MAX_PHOTOS = 4 as const;

function createSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createLocalId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.floor(quantity));
}

function ensureHeroIfNeeded(draft: DraftMealItem[]): DraftMealItem[] {
  const hasHero = draft.some((i) => i.itemType === 'photo' && i.isHero);
  if (hasHero) return draft;
  const firstPhotoIndex = draft.findIndex((i) => i.itemType === 'photo');
  if (firstPhotoIndex < 0) return draft;
  return draft.map((i, idx) => (idx === firstPhotoIndex ? { ...i, isHero: true } : i));
}

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists && info.isDirectory) return;
  await FileSystem.makeDirectoryAsync(path, { intermediates: true });
}

function parseDraft(raw: string | null): MealCaptureDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MealCaptureDraft>;
    if (!parsed || parsed.version !== 1) return null;
    if (typeof parsed.sessionId !== 'string') return null;
    if (!Array.isArray(parsed.items)) return null;
    return {
      version: 1,
      sessionId: parsed.sessionId,
      createdAtMs: typeof parsed.createdAtMs === 'number' ? parsed.createdAtMs : Date.now(),
      updatedAtMs: typeof parsed.updatedAtMs === 'number' ? parsed.updatedAtMs : Date.now(),
      contextText: typeof parsed.contextText === 'string' ? parsed.contextText : '',
      items: parsed.items as DraftMealItem[],
    };
  } catch {
    return null;
  }
}

async function writeDraft(draft: MealCaptureDraft | null): Promise<void> {
  if (!AsyncStorage) return;
  if (!draft) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
}

export interface UseMealCaptureDraftResult {
  isReady: boolean;
  draft: MealCaptureDraft | null;
  sessionId: string | null;
  items: DraftMealItem[];
  contextText: string;
  photoCount: number;
  canAddPhoto: boolean;

  ensureSession(): Promise<MealCaptureDraft>;
  discardSession(): Promise<void>;

  addTextItem(text: string): Promise<void>;
  addPhotoFromUri(sourceUri: string): Promise<void>;
  addVerifiedItem(foodItem: DatabaseFoodItem, quantity: number): Promise<void>;
  removeItem(localId: string): Promise<void>;
  setHero(localId: string): Promise<void>;
  updateQuantity(localId: string, nextQuantity: number): Promise<void>;

  setContextText(next: string): Promise<void>;
}

export function useMealCaptureDraft(): UseMealCaptureDraftResult {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [draft, setDraft] = useState<MealCaptureDraft | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        if (!AsyncStorage) {
          if (!cancelled) setDraft(null);
          return;
        }
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = parseDraft(raw);
        if (!cancelled) setDraft(parsed);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo<DraftMealItem[]>(() => draft?.items ?? [], [draft]);
  const contextText = useMemo<string>(() => draft?.contextText ?? '', [draft]);
  const sessionId = useMemo<string | null>(() => draft?.sessionId ?? null, [draft]);

  const photoCount = useMemo<number>(() => items.filter((i) => i.itemType === 'photo').length, [items]);
  const canAddPhoto = photoCount < MAX_PHOTOS;

  const ensureSession = useCallback(async (): Promise<MealCaptureDraft> => {
    let result: MealCaptureDraft | null = null;
    
    setDraft((prev) => {
      if (prev) {
        result = prev;
        return prev;
      }
      result = {
        version: 1,
        sessionId: createSessionId(),
        createdAtMs: Date.now(),
        updatedAtMs: Date.now(),
        contextText: '',
        items: [],
      };
      return result;
    });

    // Wait for the state update if needed (though setDraft is async, our result variable is set synchronously in the callback)
    // To be safe, we also persist it if it was just created
    if (result && !draft) {
      await writeDraft(result);
    }
    
    return result!;
  }, [draft]);

  const discardSession = useCallback(async (): Promise<void> => {
    const prevDraft = draft;
    setDraft(null);
    await writeDraft(null);

    if (prevDraft?.sessionId) {
      const sessionDir = `${DRAFTS_DIR}/${prevDraft.sessionId}`;
      try {
        const info = await FileSystem.getInfoAsync(sessionDir);
        if (info.exists) {
          await FileSystem.deleteAsync(sessionDir, { idempotent: true });
        }
      } catch {
        // ignore
      }
    }
  }, [draft]);

  const mutate = useCallback(
    async (mutator: (prev: MealCaptureDraft) => MealCaptureDraft): Promise<void> => {
      let updatedDraft: MealCaptureDraft | null = null;
      
      setDraft((prev) => {
        const base = prev || {
          version: 1,
          sessionId: createSessionId(),
          createdAtMs: Date.now(),
          updatedAtMs: Date.now(),
          contextText: '',
          items: [],
        };
        updatedDraft = mutator(base);
        return updatedDraft;
      });

      // After state is updated, persist to storage
      if (updatedDraft) {
        await writeDraft(updatedDraft);
      }
    },
    []
  );

  const setContextTextSafe = useCallback(
    async (next: string): Promise<void> => {
      await mutate((prev) => ({ ...prev, contextText: next, updatedAtMs: Date.now() }));
    },
    [mutate]
  );

  const addTextItem = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) return;
      await mutate((prev) => {
        const nextItems: DraftMealItem[] = [
          ...prev.items,
          {
            localId: createLocalId('text'),
            itemType: 'text',
            text: trimmed,
            quantity: 1,
            isHero: false,
            createdAtMs: Date.now(),
          },
        ];
        return { ...prev, items: ensureHeroIfNeeded(nextItems), updatedAtMs: Date.now() };
      });
    },
    [mutate]
  );

  const addPhotoFromUri = useCallback(
    async (sourceUri: string): Promise<void> => {
      if (!sourceUri) return;

      // Ensure we have a session first to get a stable sessionId for the file path
      const base = await ensureSession();
      
      const localId = createLocalId('photo');
      const sessionDir = `${DRAFTS_DIR}/${base.sessionId}`;
      const targetUri = `${sessionDir}/${localId}.jpg`;

      await ensureDir(sessionDir);
      await FileSystem.copyAsync({ from: sourceUri, to: targetUri });

      await mutate((prev) => {
        const currentPhotos = prev.items.filter((i) => i.itemType === 'photo').length;
        if (currentPhotos >= MAX_PHOTOS) return prev;

        const now = Date.now();
        const nextItems: DraftMealItem[] = [
          ...prev.items,
          { localId, itemType: 'photo', localUri: targetUri, quantity: 1, isHero: false, createdAtMs: now },
        ];
        return {
          ...prev,
          items: ensureHeroIfNeeded(nextItems),
          updatedAtMs: now,
        };
      });
    },
    [ensureSession, mutate]
  );

  const removeItem = useCallback(
    async (localId: string): Promise<void> => {
      if (!localId) return;
      await mutate((prev) => {
        const removed = prev.items.find((i) => i.localId === localId);
        const nextItems = ensureHeroIfNeeded(prev.items.filter((i) => i.localId !== localId));

        // Best-effort cleanup of persisted photo file.
        if (removed?.itemType === 'photo') {
          void FileSystem.deleteAsync(removed.localUri, { idempotent: true }).catch(() => undefined);
        }

        return { ...prev, items: nextItems, updatedAtMs: Date.now() };
      });
    },
    [mutate]
  );

  const setHero = useCallback(
    async (localId: string): Promise<void> => {
      await mutate((prev) => {
        const nextItems = prev.items.map((i) => (i.itemType === 'photo' ? { ...i, isHero: i.localId === localId } : i));
        return { ...prev, items: ensureHeroIfNeeded(nextItems), updatedAtMs: Date.now() };
      });
    },
    [mutate]
  );

  const updateQuantity = useCallback(
    async (localId: string, nextQuantity: number): Promise<void> => {
      const q = clampQuantity(nextQuantity);
      await mutate((prev) => ({
        ...prev,
        items: prev.items.map((i) => (i.localId === localId ? { ...i, quantity: q } : i)),
        updatedAtMs: Date.now(),
      }));
    },
    [mutate]
  );

  const addVerifiedItem = useCallback(
    async (foodItem: DatabaseFoodItem, quantity: number): Promise<void> => {
      const q = clampQuantity(quantity);
      await mutate((prev) => {
        const nextItems: DraftMealItem[] = [
          ...prev.items,
          {
            localId: createLocalId('verified'),
            itemType: 'verified',
            foodItem,
            quantity: q,
            isHero: false,
            createdAtMs: Date.now(),
          },
        ];
        return { ...prev, items: ensureHeroIfNeeded(nextItems), updatedAtMs: Date.now() };
      });
    },
    [mutate]
  );

  return {
    isReady,
    draft,
    sessionId,
    items,
    contextText,
    photoCount,
    canAddPhoto,

    ensureSession,
    discardSession,

    addTextItem,
    addPhotoFromUri,
    addVerifiedItem,
    removeItem,
    setHero,
    updateQuantity,

    setContextText: setContextTextSafe,
  };
}


