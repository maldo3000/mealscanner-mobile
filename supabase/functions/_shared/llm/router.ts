/**
 * LLM Router
 * 
 * Central router for LLM provider selection and request handling.
 * Provides a unified interface for chat completions and transcription
 * across multiple providers (OpenAI, OpenRouter).
 * 
 * Supports safe model rollout via canary routing:
 *   - LLM_CANARY_PERCENT (0-100): percentage of requests routed to the primary (new) model
 *   - Remaining traffic goes to the fallback (known-good) model
 *   - If the primary model fails, the router automatically retries with the fallback
 *   - All requests are logged with model quality metrics for comparison
 */

import { OpenAIProvider } from './openai.ts';
import { OpenRouterProvider } from './openrouter.ts';
import type {
    ChatCompletionOptions,
    ChatCompletionResponse,
    LLMConfig,
    LLMProvider,
    LLMProviderClient,
    ModelQualityMetrics,
    ModelRoutingConfig,
    TranscriptionOptions,
    TranscriptionResponse,
} from './types.ts';

// ==========================================
// Model Routing Defaults
// ==========================================
// Primary = the production model (Gemini 2.5 Flash stable — GA, vision, JSON schema)
// Fallback = kept as a safety net if the primary errors out
const DEFAULT_PRIMARY_MODEL = 'google/gemini-2.5-flash';
const DEFAULT_FALLBACK_MODEL = 'google/gemini-2.5-flash';

export class LLMRouter {
  private openaiProvider?: OpenAIProvider;
  private openrouterProvider?: OpenRouterProvider;
  private defaultProvider: LLMProvider;
  private defaultTextModel: string;
  private defaultVisionModel: string;
  private routingConfig: ModelRoutingConfig;

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
    this.defaultTextModel = Deno.env.get('LLM_DEFAULT_TEXT_MODEL') || DEFAULT_PRIMARY_MODEL;
    this.defaultVisionModel = Deno.env.get('LLM_DEFAULT_VISION_MODEL') || DEFAULT_PRIMARY_MODEL;

    // Canary routing configuration (defaults to 100% primary = stable model)
    const canaryPercent = parseInt(Deno.env.get('LLM_CANARY_PERCENT') || '100', 10);
    this.routingConfig = {
      primary: Deno.env.get('LLM_PRIMARY_MODEL') || DEFAULT_PRIMARY_MODEL,
      fallback: Deno.env.get('LLM_FALLBACK_MODEL') || DEFAULT_FALLBACK_MODEL,
      canaryPercent: Number.isFinite(canaryPercent) ? Math.max(0, Math.min(100, canaryPercent)) : 0,
    };

    console.log('🔧 LLM Router initialized:', {
      provider: this.defaultProvider,
      routing: {
        primary: this.routingConfig.primary,
        fallback: this.routingConfig.fallback,
        canaryPercent: this.routingConfig.canaryPercent,
      },
    });
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
   * Select a model via canary routing.
   * If the caller already specified a model in LLMConfig, that takes priority (no canary).
   * Otherwise, rolls a random number against canaryPercent to choose primary vs fallback.
   */
  private selectModelWithCanary(config: LLMConfig | undefined, isVision: boolean): { model: string; isCanary: boolean } {
    // Explicit per-request override — bypass canary routing entirely
    if (config?.model) {
      return { model: config.model, isCanary: false };
    }

    const { primary, fallback, canaryPercent } = this.routingConfig;

    // canaryPercent = 0 means all traffic goes to fallback (current known-good model)
    // canaryPercent = 100 means all traffic goes to primary (new stable model)
    if (canaryPercent <= 0) {
      return { model: fallback, isCanary: false };
    }
    if (canaryPercent >= 100) {
      return { model: primary, isCanary: true };
    }

    const roll = Math.random() * 100;
    if (roll < canaryPercent) {
      return { model: primary, isCanary: true };
    }
    return { model: fallback, isCanary: false };
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
   * Log model quality metrics for observability and model comparison.
   * These logs can be parsed by Supabase log drain / external monitoring.
   */
  logQualityMetrics(metrics: ModelQualityMetrics): void {
    const tag = metrics.usedFallback ? '⚠️ FALLBACK' : (metrics.jsonParseSuccess ? '✅' : '❌');
    console.log(`${tag} [MODEL_QUALITY] ${JSON.stringify(metrics)}`);
  }

  /**
   * Perform chat completion with canary routing and automatic fallback.
   *
   * Flow:
   * 1. Select model via canary routing (primary vs fallback)
   * 2. Send request to selected model
   * 3. If the selected model was the primary (canary) and it fails,
   *    automatically retry with the fallback model
   * 4. Return response + metadata about which model was used
   */
  async chatComplete(
    options: ChatCompletionOptions,
    config?: LLMConfig
  ): Promise<ChatCompletionResponse & { _routing: { model: string; isCanary: boolean; usedFallback: boolean; fallbackReason?: string; latencyMs: number } }> {
    const isVision = this.hasImageContent(options.messages);
    const { model: selectedModel, isCanary } = this.selectModelWithCanary(config, isVision);
    const { provider } = this.getProvider(config);
    const providerName = config?.provider || this.defaultProvider;

    console.log(`🎯 LLM request: provider=${providerName}, model=${selectedModel}, isCanary=${isCanary}, canaryPercent=${this.routingConfig.canaryPercent}%`);

    const startTime = Date.now();

    try {
      const response = await provider.chatComplete(options, selectedModel);
      const latencyMs = Date.now() - startTime;

      console.log(`✅ LLM response: model=${response.model}, latency=${latencyMs}ms, tokens=${response.usage?.total_tokens ?? 'n/a'}`);

      return {
        ...response,
        _routing: {
          model: response.model || selectedModel,
          isCanary,
          usedFallback: false,
          latencyMs,
        },
      };
    } catch (primaryError) {
      const primaryLatency = Date.now() - startTime;
      const errorMsg = primaryError instanceof Error ? primaryError.message : String(primaryError);

      // If this was a canary request, automatically retry with the fallback model
      if (isCanary && selectedModel !== this.routingConfig.fallback) {
        console.warn(`⚠️ Canary model "${selectedModel}" failed after ${primaryLatency}ms: ${errorMsg}`);
        console.warn(`⚠️ Retrying with fallback model "${this.routingConfig.fallback}"...`);

        const fallbackStartTime = Date.now();
        try {
          const fallbackResponse = await provider.chatComplete(options, this.routingConfig.fallback);
          const fallbackLatency = Date.now() - fallbackStartTime;

          console.log(`✅ Fallback response: model=${fallbackResponse.model}, latency=${fallbackLatency}ms`);

          // Log the fallback event for monitoring
          this.logQualityMetrics({
            model: selectedModel,
            jsonParseSuccess: false,
            usedFallback: true,
            latencyMs: primaryLatency,
            fallbackReason: errorMsg,
          });

          return {
            ...fallbackResponse,
            _routing: {
              model: fallbackResponse.model || this.routingConfig.fallback,
              isCanary: true,
              usedFallback: true,
              fallbackReason: errorMsg,
              latencyMs: primaryLatency + fallbackLatency,
            },
          };
        } catch (fallbackError) {
          // Both models failed — surface the fallback error
          console.error(`❌ Fallback model also failed: ${fallbackError instanceof Error ? fallbackError.message : fallbackError}`);
          throw fallbackError;
        }
      }

      // Not a canary request or fallback model same as selected — propagate error
      throw primaryError;
    }
  }

  /** Expose routing config for external inspection (e.g., health checks) */
  getRoutingConfig(): Readonly<ModelRoutingConfig> {
    return { ...this.routingConfig };
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


