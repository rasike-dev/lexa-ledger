/**
 * Fact Hash Generator
 * 
 * Deterministic, stable hashing for immutable fact snapshots.
 * Ensures same inputs always produce the same hash (tamper detection).
 */

import { createHash } from 'crypto';

/**
 * Stable JSON stringification with sorted keys (deterministic)
 * 
 * This ensures that the same object always produces the same string,
 * regardless of key insertion order.
 */
function stableStringify(obj: unknown): string {
  // Handle primitives and null
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return `[${obj.map(stableStringify).join(',')}]`;
  }

  // Handle objects: sort keys recursively
  const rec = obj as Record<string, unknown>;
  const keys = Object.keys(rec).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ':' + stableStringify(rec[k])).join(',')}}`;
}

/**
 * Compute SHA256 hash of fact snapshot payload
 * 
 * @param payload - The fact snapshot data to hash
 * @returns SHA256 hash (hex string)
 * 
 * @example
 * ```ts
 * const hash = computeFactHash({
 *   loanId: 'loan-123',
 *   readinessScore: 72,
 *   readinessBand: 'AMBER',
 *   contributingFactors: { ... },
 *   blockingIssues: [ ... ],
 *   factVersion: 1,
 * });
 * ```
 */
export function computeFactHash(payload: unknown): string {
  const canonical = stableStringify(payload);
  return createHash('sha256').update(canonical).digest('hex');
}
