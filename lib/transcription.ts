const CREDIT_TOKENS = new Set<string>([
  'thank',
  'thanks',
  'you',
  'for',
  'watching',
  'listening',
  'viewing',
  'please',
  'like',
  'subscribe',
  'comment',
  'and',
  'to',
  'the',
  'a',
  'an',
  'video',
  'audio',
  'subtitles',
  'by',
])

const HALLUCINATION_PATTERNS: RegExp[] = [
  /^thanks?([.!?]+)?$/i,
  /^thank you([.!?]+)?$/i,
  /^thank(s| you)\s+for\s+(watching|listening|viewing)([.!?]+)?$/i,
  /^please\s+(like|subscribe|comment)([.!?]+)?$/i,
  /^subscribe(\s+to)?(\s+and)?(\s+like)?([.!?]+)?$/i,
  /^\[.*\]$/,
  /^♪+$/,
  /^\.+$/,
  /^-+$/,
]

function isLikelyHallucination(transcript: string): boolean {
  const trimmed = transcript.trim()
  if (!trimmed) return true

  for (const pattern of HALLUCINATION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true
    }
  }

  const normalized = trimmed.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
  const tokens = normalized.length > 0 ? normalized.toLowerCase().split(' ') : []
  if (tokens.length > 0 && tokens.length <= 6 && tokens.every((token) => CREDIT_TOKENS.has(token))) {
    return true
  }

  return false
}

export function getCleanTranscript(rawTranscript?: string | null): string | null {
  if (!rawTranscript) return null
  const trimmed = rawTranscript.trim()
  if (!trimmed) return null
  if (isLikelyHallucination(trimmed)) return null
  return trimmed
}
