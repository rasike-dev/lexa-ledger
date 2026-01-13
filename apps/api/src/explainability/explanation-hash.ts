/**
 * Explanation Hash Generator
 * 
 * Deterministic hash for explanation cache deduplication.
 * Ensures same cache key always produces same hash.
 */

import { createHash } from 'crypto';

/**
 * Stable JSON stringification with sorted keys (deterministic)
 */
function stableStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }

  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(rec[k])).join(',')}}`;
}

/**
 * Compute SHA256 hash of explanation cache key
 * 
 * Cache key includes:
 * - tenantId, loanId, factHash
 * - audience, verbosity
 * - explainVersion, provider
 * 
 * @param payload - Cache key object
 * @returns SHA256 hash (hex string)
 */
export function computeExplanationHash(payload: unknown): string {
  const canonical = stableStringify(payload);
  return createHash('sha256').update(canonical).digest('hex');
}
