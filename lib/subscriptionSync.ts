interface SyncResponse {
  data: unknown;
  error: unknown;
}
interface ConfirmationOptions {
  userId: string;
  expectedIsPro: boolean;
  sync: () => Promise<SyncResponse>;
  isCurrent: () => boolean;
  delay?: (milliseconds: number) => Promise<void>;
}

export function isConfirmedSubscription(data: unknown, userId: string, expectedIsPro: boolean): boolean {
  if (!data || typeof data !== 'object') return false;
  const result = data as Record<string, unknown>;
  return result.success === true && result.user_id === userId && result.is_pro === expectedIsPro;
}

export async function confirmSubscription({ userId, expectedIsPro, sync, isCurrent, delay = ms => new Promise(resolve => setTimeout(resolve, ms)) }: ConfirmationOptions): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!isCurrent()) return false;
    try {
      const { data, error } = await sync();
      if (!isCurrent()) return false;
      if (!error && isConfirmedSubscription(data, userId, expectedIsPro)) return true;
    } catch (error) {
      console.error('Subscription verification failed:', error);
    }
    if (attempt < 2 && isCurrent()) await delay(800 * (attempt + 1));
  }
  return false;
}
