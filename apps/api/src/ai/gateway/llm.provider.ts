/**
 * LLM Provider Interface
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B3: LLM Gateway Skeleton
 * 
 * Generic interface for all LLM providers (OpenAI, Anthropic, Azure, etc.)
 * Keeps business logic decoupled from provider implementations.
 */

/**
 * LLM Provider Response
 * 
 * Standard response format from any LLM provider.
 * Providers must return this shape regardless of their internal API.
 */
export type LlmProviderResponse = {
  /**
   * Model identifier used by the provider
   * Examples: "gpt-4", "claude-3-opus", "demo-v1"
   */
  model: string;

  /**
   * Token usage metrics (optional)
   * Providers should populate this when available
   */
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };

  /**
   * JSON-parsed response from the LLM
   * 
   * The provider should either:
   * 1. Parse JSON themselves and return the object
   * 2. Return raw string and gateway will parse
   * 
   * For B3, we expect providers to return parsed objects.
   */
  json: unknown;
};

/**
 * LLM Provider Interface
 * 
 * All providers (Demo, OpenAI, Anthropic, etc.) must implement this.
 * 
 * Key design decisions:
 * - Single `generateJson()` method (not per-use-case)
 * - Prompt is already rendered (provider doesn't know about templates)
 * - Provider returns generic JSON (gateway handles validation)
 * 
 * This enables:
 * - Hot-swapping providers
 * - Fallback routing
 * - A/B testing different models
 */
export interface LlmProvider {
  /**
   * Provider name for audit trails
   * Examples: "OPENAI", "ANTHROPIC", "AZURE_OPENAI", "DEMO_PROVIDER"
   */
  name(): string;

  /**
   * Generate JSON from a prompt
   * 
   * @param params.prompt - Fully rendered, redacted prompt string
   * @param params.model - Model identifier (e.g., "gpt-4", "explain-trading-v1")
   * @returns Provider response with model, usage, and JSON
   */
  generateJson(params: { prompt: string; model: string }): Promise<LlmProviderResponse>;
}
