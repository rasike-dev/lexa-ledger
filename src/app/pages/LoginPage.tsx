import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { decodeJwt } from '../config/keycloak';
import { featureFlags } from '../config/featureFlags';

/**
 * Step A1 — Login Page
 * Step A4 — Demo accounts panel (dev/demo only)
 * 
 * Features:
 * - SSO login button (redirects to Keycloak)
 * - Auto-redirects if already authenticated with valid token
 * - Collapsible demo accounts panel with copy buttons (dev only)
 * - "Switch user" workflow explanation
 */

// Only show demo accounts when feature flag is enabled
// Note: This is separate from demoMode in UIStore (which controls demo data simulation)
const DEMO_MODE = featureFlags.SHOW_DEMO_ACCOUNTS;

type DemoAccount = {
  label: string;
  username: string;
  password: string;
  tenant: string;
  roles: string[];
  notes?: string;
};

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  
  const decoded = decodeJwt(token);
  if (!decoded?.exp) return false;
  
  const nowSec = Math.floor(Date.now() / 1000);
  return decoded.exp > nowSec;
}

// Detect if running in Tauri (desktop)
const IS_TAURI = typeof window !== 'undefined' && Boolean((window as any).__TAURI__);

export function LoginPage() {
  const navigate = useNavigate();
  const beginLogin = useAuthStore((s) => s.beginLogin);
  const beginDesktopLogin = useAuthStore((s) => s.beginDesktopLogin);
  const [demoOpen, setDemoOpen] = useState(true);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Demo accounts configuration (matches actual Keycloak users)
  const demoAccounts: DemoAccount[] = useMemo(
    () => [
      {
        label: 'Tenant Admin',
        username: 'rasike',
        password: 'rasike',
        tenant: 'cmk8n1q6 (primary)',
        roles: ['TENANT_ADMIN', 'TRADING_ANALYST', 'ESG_ANALYST', 'DOCUMENT_SPECIALIST', 'LOAN_OFFICER', 'ESG_VERIFIER'],
        notes: 'Full power: upload docs, recompute trading, verify ESG, export audit.',
      },
      {
        label: 'Compliance Auditor',
        username: 'auditor',
        password: 'auditor',
        tenant: 'cmk8n1q6 (primary)',
        roles: ['COMPLIANCE_AUDITOR'],
        notes: 'Read-only: can view/export audit trail, but mutations blocked (403).',
      },
      {
        label: 'Different Tenant User',
        username: 'testuser',
        password: 'testuser',
        tenant: 'other-tenant',
        roles: ['LOAN_OFFICER'],
        notes: 'Shows tenant isolation — different portfolio, no access to primary tenant data.',
      },
    ],
    []
  );

  const handleCopy = async (text: string, itemKey: string) => {
    await copy(text);
    setCopiedItem(itemKey);
    setTimeout(() => setCopiedItem(null), 1500);
  };

  // Check auth status on mount only
  useEffect(() => {
    const state = useAuthStore.getState();

    // No auth state, stay on login
    if (!state.accessToken) {
      return;
    }

    // Check if token is valid
    if (isTokenValid(state.accessToken)) {
      // Valid token, redirect to portfolio
      navigate('/portfolio', { replace: true });
    } else {
      // Token expired, clear it
      state.clearAuth();
    }
    // Empty deps array = only run once on mount
  }, [navigate]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div
        style={{
          width: 520,
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Main Login Card */}
        <div
          style={{
            background: 'white',
            borderRadius: 16,
            padding: 32,
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 24, textAlign: 'center' }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, color: '#111827' }}>
              LEXA Ledger
            </h1>
            <p
              style={{
                margin: '8px 0 0 0',
                color: '#6b7280',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Sign in with your organization SSO (Keycloak).
            </p>
          </div>

          {/* SSO Login Button */}
          <button
            onClick={() => {
              if (IS_TAURI) {
                // Desktop: open system browser and show waiting screen
                beginDesktopLogin();
                navigate('/desktop-login-waiting');
              } else {
                // Web: redirect to Keycloak
                beginLogin();
              }
            }}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: '#111827',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1f2937';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#111827';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Login with SSO
          </button>

          {/* Switch User Hint */}
          <p
            style={{
              marginTop: 12,
              fontSize: 11,
              color: '#9ca3af',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            Switch user: logout → login as another account
            <br />
            (tenant/roles will update automatically)
          </p>
        </div>

        {/* Demo Accounts Panel (dev/demo only) */}
        {DEMO_MODE && (
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            }}
          >
            {/* Collapsible Header */}
            <button
              onClick={() => setDemoOpen((v) => !v)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                textAlign: 'left',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                  💡 Demo Accounts
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                  For reviewers: copy usernames for quick login.
                </div>
              </div>
              <span style={{ fontSize: 16, color: '#6b7280' }}>{demoOpen ? '▾' : '▸'}</span>
            </button>

            {/* Collapsible Content */}
            {demoOpen && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {demoAccounts.map((account) => (
                  <div
                    key={account.username}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      padding: 12,
                      background: '#fafafa',
                    }}
                  >
                    {/* Account Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                          {account.label}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 12,
                            color: '#6b7280',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          }}
                        >
                          {account.username} / {account.password}
                        </div>
                        <div style={{ marginTop: 2, fontSize: 11, color: '#9ca3af' }}>
                          Tenant: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{account.tenant}</span>
                        </div>
                      </div>

                      {/* Copy Button */}
                      <button
                        onClick={() => handleCopy(account.username, account.username)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: '1px solid #d1d5db',
                          background: 'white',
                          fontSize: 11,
                          fontWeight: 600,
                          color: copiedItem === account.username ? '#10b981' : '#374151',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => {
                          if (copiedItem !== account.username) {
                            e.currentTarget.style.background = '#f9fafb';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                        }}
                      >
                        {copiedItem === account.username ? '✓ Copied' : 'Copy username'}
                      </button>
                    </div>

                    {/* Roles */}
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {account.roles.map((role) => (
                        <span
                          key={role}
                          style={{
                            fontSize: 10,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                            padding: '3px 8px',
                            borderRadius: 9999,
                            background: '#e0e7ff',
                            color: '#4338ca',
                            border: '1px solid #c7d2fe',
                          }}
                        >
                          {role}
                        </span>
                      ))}
                    </div>

                    {/* Notes */}
                    {account.notes && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: '#6b7280',
                          lineHeight: 1.4,
                        }}
                      >
                        {account.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Enterprise-grade SSO via Keycloak
          <br />
          Identity, tenant, and roles derived from JWT tokens
        </div>
      </div>
    </div>
  );
}
