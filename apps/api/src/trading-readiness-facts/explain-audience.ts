/**
 * Explain Audience Derivation
 * 
 * Maps user roles to explanation audience (role-aware verbosity).
 */

export type ExplainAudience = 'TRADING_ANALYST' | 'TRADING_VIEWER' | 'INVESTOR' | 'COMPLIANCE';

/**
 * Derive explanation audience from user roles
 * 
 * Priority order:
 * 1. TRADING_ANALYST → most detailed
 * 2. COMPLIANCE_AUDITOR → compliance-focused
 * 3. Default → TRADING_VIEWER
 */
export function deriveAudience(roles: string[]): ExplainAudience {
  if (roles.includes('TRADING_ANALYST')) {
    return 'TRADING_ANALYST';
  }
  if (roles.includes('COMPLIANCE_AUDITOR')) {
    return 'COMPLIANCE';
  }
  return 'TRADING_VIEWER';
}
