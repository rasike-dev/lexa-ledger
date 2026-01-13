/**
 * Prompt Redaction
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B10.1: PII Redaction (emails, phones, long tokens)
 * 
 * PII redaction layer for prompts before sending to LLM providers.
 * Redaction happens BEFORE checksum calculation.
 */

/**
 * Redaction Result
 * 
 * Includes:
 * - Redacted prompt (safe to send to external LLM)
 * - Whether redaction was applied
 * - Summary of what was redacted (for audit)
 */
export type RedactionResult = {
  redactedPrompt: string;
  redactionApplied: boolean;
  redactionSummary: string[];
};

/**
 * PII Detection Patterns
 * 
 * Conservative patterns to avoid false positives:
 * - Emails: Standard RFC-compliant pattern
 * - Phones: International format with optional +, spaces, hyphens
 * - Long tokens: 32+ char hex strings (likely UUIDs, API keys, hashes)
 */
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(\+?\d[\d\s\-().]{7,}\d)/g;
const LONG_TOKEN_RE = /\b[a-f0-9]{32,}\b/gi;

/**
 * Redact sensitive information from a prompt
 * 
 * B10.1: Production implementation with:
 * - Email addresses → [REDACTED_EMAIL]
 * - Phone numbers → [REDACTED_PHONE]
 * - Long hex tokens → [REDACTED_TOKEN]
 * 
 * Redaction happens BEFORE checksum, ensuring:
 * - LLM never sees PII
 * - Checksum is stable for redacted prompt
 * - Audit trail shows what was redacted
 * 
 * @param prompt - Raw prompt string
 * @returns Redacted prompt + metadata
 */
export function redactPrompt(prompt: string): RedactionResult {
  let redacted = prompt;
  const summary: string[] = [];

  // Redact emails
  const beforeEmail = redacted;
  redacted = redacted.replace(EMAIL_RE, '[REDACTED_EMAIL]');
  if (redacted !== beforeEmail) {
    summary.push('emails');
  }

  // Redact phone numbers
  const beforePhone = redacted;
  redacted = redacted.replace(PHONE_RE, '[REDACTED_PHONE]');
  if (redacted !== beforePhone) {
    summary.push('phone_numbers');
  }

  // Redact long tokens (UUIDs, API keys, hashes)
  const beforeToken = redacted;
  redacted = redacted.replace(LONG_TOKEN_RE, '[REDACTED_TOKEN]');
  if (redacted !== beforeToken) {
    summary.push('long_tokens');
  }

  return {
    redactedPrompt: redacted,
    redactionApplied: summary.length > 0,
    redactionSummary: summary,
  };
}

/**
 * Future enhancements (if needed):
 * 
 * 1. SSN/Tax IDs: /\b\d{3}-\d{2}-\d{4}\b/g
 * 2. Credit cards: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g
 * 3. Named entities (NER): Use compromise.js or similar
 * 4. Custom business-specific patterns
 * 
 * Current implementation covers the most common PII risks for a loan platform:
 * - Contact info (emails, phones)
 * - Sensitive tokens (IDs, keys, hashes)
 */
