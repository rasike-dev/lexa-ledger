/**
 * Prompt Checksum
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B3: LLM Gateway Skeleton
 * 
 * SHA-256 checksum for prompts to ensure:
 * - Audit trail integrity
 * - Prompt reproducibility
 * - Version tracking
 */

import { createHash } from 'crypto';

/**
 * Compute SHA-256 hash of text
 * 
 * Used for:
 * - Prompt checksums (audit trail)
 * - Fact hash verification (Track A)
 * - Explanation hash computation (Track A)
 * 
 * @param text - Text to hash
 * @returns Hex-encoded SHA-256 hash (64 chars)
 * 
 * @example
 * ```typescript
 * const hash = sha256("Hello, world!");
 * // "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3"
 * ```
 */
export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
