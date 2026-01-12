import { getEffectiveRoles } from "./effectiveRoles";

export const Roles = {
  PLATFORM_SUPER_ADMIN: 'PLATFORM_SUPER_ADMIN',
  TENANT_ADMIN: 'TENANT_ADMIN',
  LOAN_OFFICER: 'LOAN_OFFICER',
  DOCUMENT_SPECIALIST: 'DOCUMENT_SPECIALIST',
  SERVICING_MANAGER: 'SERVICING_MANAGER',
  TRADING_ANALYST: 'TRADING_ANALYST',
  TRADING_VIEWER: 'TRADING_VIEWER',
  ESG_ANALYST: 'ESG_ANALYST',
  ESG_VERIFIER: 'ESG_VERIFIER',
  RISK_OFFICER: 'RISK_OFFICER',
  COMPLIANCE_AUDITOR: 'COMPLIANCE_AUDITOR',
  SUPPORT_OPERATOR: 'SUPPORT_OPERATOR',
  INTEGRATION_SERVICE: 'INTEGRATION_SERVICE',
} as const;

export type Role = typeof Roles[keyof typeof Roles];

/**
 * Check if user has any of the required roles (UI gating)
 * 
 * In demo mode: uses simulated roles if enabled
 * In production: always uses real JWT roles
 * 
 * IMPORTANT: This is for UI gating only. Backend API authorization
 * always uses the real JWT token, not simulated roles.
 */
export function hasAnyRole(userRoles: string[] | undefined, required: Role[]): boolean;
export function hasAnyRole(required: Role[]): boolean;
export function hasAnyRole(
  userRolesOrRequired: string[] | undefined | Role[],
  required?: Role[]
): boolean {
  // New signature: hasAnyRole(required: Role[])
  if (!required) {
    const requiredRoles = userRolesOrRequired as Role[];
    if (!requiredRoles.length) return true;
    const effectiveRoles = getEffectiveRoles();
    const set = new Set(effectiveRoles);
    return requiredRoles.some(r => set.has(r));
  }
  
  // Legacy signature: hasAnyRole(userRoles, required) - for backward compatibility
  const userRoles = userRolesOrRequired as string[] | undefined;
  if (!required.length) return true;
  const set = new Set(userRoles ?? []);
  return required.some(r => set.has(r));
}
