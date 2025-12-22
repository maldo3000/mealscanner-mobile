/**
 * LLM Router
 * 
 * Central router for LLM provider selection and request handling.
 * Provides a unified interface for chat completions and transcription
 * across multiple providers (OpenAI, OpenRouter).
 */

import { OpenAIProvider } from './openai.ts';
import { OpenRouterProvider } from './openrouter.ts';
import type {
    ChatCompletionOptions,
    ChatCompletionResponse,
    LLMConfig,
    LLMProvider,
    TranscriptionOptions,
    TranscriptionResponse,
} from './types.ts';

export class LLMRouter {
  private openaiProvider?: OpenAIProvider;
  private openrouterProvider?: OpenRouterProvider;
  private defaultProvider: LLMProvider;
  private defaultTextModel: string;
  private defaultVisionModel: string;

  constructor() {
    // Initialize providers from environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiApiKey) {
      this.openaiProvider = new OpenAIProvider(openaiApiKey);
    }

    const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
    if (openrouterApiKey) {
      const siteUrl = Deno.env.get('OPENROUTER_SITE_URL');
      const appName = Deno.env.get('OPENROUTER_APP_NAME');
      this.openrouterProvider = new OpenRouterProvider(openrouterApiKey, siteUrl, appName);
    }

    // Set defaults from environment or use current defaults
    this.defaultProvider = (Deno.env.get('LLM_DEFAULT_PROVIDER') as LLMProvider) || 'openrouter';
    this.defaultTextModel = Deno.env.get('LLM_DEFAULT_TEXT_MODEL') || 'google/gemini-3-flash-preview';
    this.defaultVisionModel = Deno.env.get('LLM_DEFAULT_VISION_MODEL') || 'google/gemini-3-flash-preview';
  }

  /**
   * Get the appropriate provider based on config
   */
  private getProvider(config?: LLMConfig): { provider: LLMProviderClient; providerName: LLMProvider } {
    const providerName = config?.provider || this.defaultProvider;

    if (providerName === 'openrouter') {
      if (!this.openrouterProvider) {
        console.warn('OpenRouter requested but not configured, falling back to OpenAI');
        if (!this.openaiProvider) {
          throw new Error('No LLM provider configured. Please set OPENAI_API_KEY or OPENROUTER_API_KEY');
        }
        return { provider: this.openaiProvider, providerName: 'openai' };
      }
      return { provider: this.openrouterProvider, providerName: 'openrouter' };
    }

    // Default to OpenAI
    if (!this.openaiProvider) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY');
    }
    return { provider: this.openaiProvider, providerName: 'openai' };
  }

  /**
   * Get the model name based on config and whether it's a vision request
   */
  private getModel(config: LLMConfig | undefined, isVision: boolean): string {
    if (config?.model) {
      return config.model;
    }

    // For OpenRouter, use appropriate defaults
    const providerName = config?.provider || this.defaultProvider;
    if (providerName === 'openrouter') {
      // OpenRouter model format: provider/model-name
      // Use Gemini models as default
      return isVision ? this.defaultVisionModel : this.defaultTextModel;
    }

    // Default OpenAI models
    return isVision ? this.defaultVisionModel : this.defaultTextModel;
  }

  /**
   * Check if a message contains image content
   */
  private hasImageContent(messages: ChatCompletionOptions['messages']): boolean {
    return messages.some(msg => {
      if (typeof msg.content === 'string') {
        return false;
      }
      return msg.content.some(item => item.type === 'image_url');
    });
  }

  /**
   * Perform chat completion with automatic provider/model selection
   */
  async chatComplete(
    options: ChatCompletionOptions,
    config?: LLMConfig
  ): Promise<ChatCompletionResponse> {
    const isVision = this.hasImageContent(options.messages);
    const model = this.getModel(config, isVision);
    const { provider } = this.getProvider(config);

    console.log(`Using LLM provider: ${config?.provider || this.defaultProvider}, model: ${model}`);

    return await provider.chatComplete(options, model);
  }

  /**
   * Transcribe audio with automatic fallback to OpenAI if provider doesn't support it
   */
  async transcribeAudio(
    options: TranscriptionOptions,
    config?: LLMConfig
  ): Promise<TranscriptionResponse> {
    const providerName = config?.provider || this.defaultProvider;

    // Only OpenAI currently supports transcription
    // OpenRouter doesn't have a transcription endpoint
    if (providerName === 'openrouter') {
      console.warn('OpenRouter does not support transcription, falling back to OpenAI Whisper');
      if (!this.openaiProvider) {
        throw new Error('Transcription requires OpenAI API key. Please set OPENAI_API_KEY');
      }
      return await this.openaiProvider.transcribeAudio(options);
    }

    // Use OpenAI for transcription
    if (!this.openaiProvider) {
      throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY');
    }

    return await this.openaiProvider.transcribeAudio(options);
  }
}

// Export a singleton instance for convenience
let routerInstance: LLMRouter | null = null;

export function getLLMRouter(): LLMRouter {
  if (!routerInstance) {
    routerInstance = new LLMRouter();
  }
  return routerInstance;
}


