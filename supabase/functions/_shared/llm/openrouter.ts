/**
 * OpenRouter Provider Implementation
 * 
 * Integration with OpenRouter API (OpenAI-compatible interface).
 * OpenRouter provides access to multiple LLM models through a unified API.
 */

import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
  LLMProviderClient,
} from './types.ts';

export class OpenRouterProvider implements LLMProviderClient {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';
  private siteUrl?: string;
  private appName?: string;

  constructor(apiKey: string, siteUrl?: string, appName?: string) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.apiKey = apiKey;
    this.siteUrl = siteUrl;
    this.appName = appName;
  }

  async chatComplete(
    options: ChatCompletionOptions,
    model: string
  ): Promise<ChatCompletionResponse> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': this.siteUrl || 'https://mealscanner.app',
      'X-Title': this.appName || 'MealScanner',
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: options.messages,
        max_tokens: options.max_tokens,
        temperature: options.temperature,
        response_format: options.response_format,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenRouter API error:', errorData);
      throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model || model,
      usage: data.usage,
    };
  }

  // OpenRouter doesn't support transcription directly
  // This will be handled by the router with fallback to OpenAI
}



















