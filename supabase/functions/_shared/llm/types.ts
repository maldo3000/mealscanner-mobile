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



















