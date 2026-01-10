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

export function hasAnyRole(userRoles: string[] | undefined, required: Role[]) {
  if (!required.length) return true;
  const set = new Set(userRoles ?? []);
  return required.some(r => set.has(r));
}
