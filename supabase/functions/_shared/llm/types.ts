/**
 * LLM Provider Types and Interfaces
 * 
 * Shared types for LLM provider abstraction layer.
 * Supports OpenAI and OpenRouter with consistent interfaces.
 */

export type LLMProvider = 'openai' | 'openrouter';

export interface LLMConfig {
  provider?: LLMProvider;
  model?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: {
      url: string;
      detail?: 'low' | 'high' | 'auto';
    };
  }>;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  response_format?: {
    type: 'json_object' | 'text';
  };
}

export interface ChatCompletionResponse {
  content: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface TranscriptionOptions {
  audioFile: File | Blob;
  language?: string;
  model?: string;
}

export interface TranscriptionResponse {
  transcript: string;
  language?: string;
}

export interface LLMProviderClient {
  chatComplete(options: ChatCompletionOptions, model: string): Promise<ChatCompletionResponse>;
  transcribeAudio?(options: TranscriptionOptions): Promise<TranscriptionResponse>;
}

// ==========================================
// Model Routing & Canary Types
// ==========================================

/** Configuration for safe model rollout with canary + fallback */
export interface ModelRoutingConfig {
  /** The new stable model to canary traffic to */
  primary: string;
  /** The current known-good model (receives non-canary traffic and serves as fallback) */
  fallback: string;
  /** Percentage of requests routed to the primary model (0-100). 0 = all fallback, 100 = all primary */
  canaryPercent: number;
}

/** Quality metrics logged per LLM call for model comparison */
export interface ModelQualityMetrics {
  /** Which model actually handled the request */
  model: string;
  /** Whether the response was valid JSON */
  jsonParseSuccess: boolean;
  /** Whether the router had to fall back to the fallback model */
  usedFallback: boolean;
  /** Total LLM round-trip latency in ms */
  latencyMs: number;
  /** Token usage from the response */
  usage?: ChatCompletionResponse['usage'];
  /** Number of items that got flagged as needs_review */
  needsReviewCount?: number;
  /** Total number of items analyzed */
  totalItemCount?: number;
  /** Error message if primary model failed and we fell back */
  fallbackReason?: string;
}


















