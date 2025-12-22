/**
 * OpenAI Provider Implementation
 * 
 * Direct integration with OpenAI's API for chat completions and transcription.
 */

import type {
  ChatCompletionOptions,
  ChatCompletionResponse,
  TranscriptionOptions,
  TranscriptionResponse,
  LLMProviderClient,
} from './types.ts';

export class OpenAIProvider implements LLMProviderClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;
  }

  async chatComplete(
    options: ChatCompletionOptions,
    model: string
  ): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
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
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model || model,
      usage: data.usage,
    };
  }

  async transcribeAudio(options: TranscriptionOptions): Promise<TranscriptionResponse> {
    const formData = new FormData();
    formData.append('file', options.audioFile);
    formData.append('model', options.model || 'whisper-1');
    if (options.language) {
      formData.append('language', options.language);
    }

    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI Whisper API error:', errorData);
      throw new Error(`OpenAI Whisper API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      transcript: data.text || '',
      language: data.language || options.language,
    };
  }
}







