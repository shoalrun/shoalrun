import { postJson, providerError, throwIfCancelled, type Transport } from './provider-http.js';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ChatCallOptions = { maxTokens?: number; temperature?: number; signal?: AbortSignal };
export type ChatRoute = { model: string; failed: Array<{ model: string; error: string }> };
export type ChatResult = { text: string; finishReason?: string; model?: string; promptTokens?: number; completionTokens?: number; route?: ChatRoute };
export type ChatProvider = { name: string; model: string; complete(messages: ChatMessage[], options?: ChatCallOptions): Promise<ChatResult> };

// Fields the tool owns. Extra body fields can add to a request but never replace these.
export const reservedBodyFields = ['model', 'messages', 'max_tokens', 'temperature', 'stream'];

export type OpenAIChatOptions = Transport & { body?: Record<string, unknown>; model: string; apiKey?: string; keyEnv?: string; baseUrl?: string; maxTokens?: number; temperature?: number };

// The OpenAI chat completions API, and the many services that copy it: OpenRouter, OpenAI, Ollama, vLLM, a LiteLLM proxy. Shoalrun has
// no default model or service. Whoever runs it chooses both, and the choice lives in config. The key comes from the environment
// variable named by `keyEnv` (OPENAI_API_KEY by default) and never appears in an error.
export function openAIChatProvider(options: OpenAIChatOptions): ChatProvider {
  const model = options.model;
  if (!model) throw new Error('Choose a chat model');
  const baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
  const local = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(baseUrl);
  const keyEnv = options.keyEnv ?? 'OPENAI_API_KEY';
  return {
    name: 'openai', model,
    async complete(messages, call = {}) {
      const apiKey = options.apiKey ?? process.env[keyEnv];
      if (!apiKey && !local) throw new Error(`Set ${keyEnv} to generate answers`);
      const maxTokens = call.maxTokens ?? options.maxTokens;
      const temperature = call.temperature ?? options.temperature;
      // Some models occasionally return an empty reply with a normal stop. That is worth one more try. An empty reply that stopped at the
      // token limit is not: asking again would use the same limit.
      for (let attempt = 0; ; attempt++) {
        throwIfCancelled(call.signal);
        const body = await postJson('Chat API', `${baseUrl}/chat/completions`, apiKey ? { authorization: `Bearer ${apiKey}` } : {}, { ...options.body, model, messages, ...(maxTokens ? { max_tokens: maxTokens } : {}), ...(temperature !== undefined ? { temperature } : {}) }, { ...options, signal: call.signal }) as {
          error?: { message?: unknown } | string;
          model?: string;
          choices?: Array<{ finish_reason?: string; message?: { content?: unknown } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        // Some services report an upstream failure with HTTP 200 and an error object.
        if (body?.error) throw new Error(`Chat API returned an error: ${providerError(typeof body.error === 'string' ? body.error : body.error.message ?? 'unknown', [apiKey])}`);
        const choice = body?.choices?.[0];
        const content = choice?.message?.content;
        const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map(part => typeof part === 'string' ? part : String((part as { text?: unknown })?.text ?? '')).join('') : '';
        if (text.trim()) return { text: text.trim(), finishReason: choice?.finish_reason, model: body.model, promptTokens: body.usage?.prompt_tokens, completionTokens: body.usage?.completion_tokens };
        if (attempt === 0 && choice?.finish_reason !== 'length') continue;
        throw new Error(`Chat API returned no answer text${choice?.finish_reason ? ` (finish reason: ${choice.finish_reason})` : ''}${choice?.finish_reason === 'length' ? '; a reasoning model may need a larger chat.maxTokens' : ''}`);
      }
    }
  };
}

export type ChatProviderConfig = Partial<OpenAIChatOptions> & { provider?: string };

// Shoalrun has no default chat provider or model, exactly as with embeddings.
export function createChatProvider(config: ChatProviderConfig = {}): ChatProvider {
  const { provider, model } = config;
  if (!provider) throw new Error('Choose a chat provider: openai (any OpenAI-style service, including OpenRouter)');
  if (!model) throw new Error(`Choose a chat model for ${provider}`);
  if (provider === 'openai') return openAIChatProvider({ ...config, model });
  throw new Error(`Unknown chat provider ${provider}; use openai`);
}

// Try each model in turn and use the first that answers. The result says which one did and which ones failed, and why. If none answers,
// the error lists every failure.
export function fallbackChat(providers: ChatProvider[]): ChatProvider {
  if (!providers.length) throw new Error('fallbackChat needs at least one provider');
  if (providers.length === 1) return providers[0];
  return {
    name: providers[0].name,
    model: providers[0].model,
    async complete(messages, call) {
      const failed: ChatRoute['failed'] = [];
      for (const provider of providers) {
        throwIfCancelled(call?.signal);
        try { return { ...await provider.complete(messages, call), route: { model: provider.model, failed } }; }
        catch (error) { throwIfCancelled(call?.signal); failed.push({ model: provider.model, error: (error as Error).message }); }
      }
      throw new Error(`Every model failed: ${failed.map(item => `${item.model}: ${item.error}`).join('; ')}`);
    }
  };
}
