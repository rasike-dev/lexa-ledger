import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { queryClient } from '../providers/QueryProvider';
import { isUiRoleSimAllowed, useUiRoleSimStore } from '../../auth/uiRoleSim.store';
import { Roles } from '../../auth/roles';
import { useMeQuery } from '../../auth/useMeQuery';

/**
 * Step A2 — Identity Panel
 * 
 * Compact user pill in header that opens a popover with:
 * - User name and email
 * - Tenant ID (with copy button)
 * - Roles as chips (with copy button)
 * - Logout button
 * 
 * Step A3 — Production-grade logout cleanup
 * - Clears TanStack Query cache (prevents cross-tenant ghost data)
 * - Resets UI store state (activeLoanId, scenarios, etc.)
 * - Redirects to Keycloak logout
 * 
 * Step B1 — UI Role Simulation (demo mode only)
 * - Allows simulating different role sets for demo purposes
 * - Visible badge when active
 * - Affects UI gating only, not backend authorization
 */

function initials(nameOrEmail?: string | null) {
  if (!nameOrEmail) return 'U';
  const s = nameOrEmail.trim();
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

export function IdentityPanel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showServerDetails, setShowServerDetails] = useState(false);

  const userName = useAuthStore((s) => s.userName);
  const userEmail = useAuthStore((s) => s.userEmail);
  const tenantId = useAuthStore((s) => s.tenantId);
  const roles = useAuthStore((s) => s.roles);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // Role simulation (demo mode only)
  const { enabled: simEnabled, simulatedRoles, setEnabled: setSimEnabled, setSimulatedRoles, clear: clearSimulation } = useUiRoleSimStore();
  const simActive = isUiRoleSimAllowed() && simEnabled && simulatedRoles.length > 0;

  // Server-validated identity (Step E1)
  const me = useMeQuery(showServerDetails);

  const displayName = userName || userEmail || 'Signed in';
  const avatarText = useMemo(() => initials(userName || userEmail), [userName, userEmail]);

  // Role simulation presets
  const rolePresets = [
    { label: 'Tenant Admin', roles: [Roles.TENANT_ADMIN] },
    { label: 'Compliance Auditor', roles: [Roles.COMPLIANCE_AUDITOR] },
    { label: 'Trading Viewer', roles: [Roles.TRADING_VIEWER] },
    { label: 'Trading Analyst', roles: [Roles.TRADING_ANALYST] },
    { label: 'ESG Verifier', roles: [Roles.ESG_VERIFIER] },
    { label: 'Loan Officer', roles: [Roles.LOAN_OFFICER] },
  ];

  if (!isAuthenticated) return null;

  return (
    <div style={{ position: 'relative' }}>
      {/* Header trigger (compact, enterprise-style) */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '6px 10px',
          borderRadius: 999,
          border: '1px solid #e5e7eb',
          background: 'white',
          cursor: 'pointer',
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            display: 'grid',
            placeItems: 'center',
            background: '#667eea',
            color: 'white',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {avatarText}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>{displayName}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>
            Tenant:{' '}
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {tenantId ? tenantId.slice(0, 8) : '—'}
            </span>
          </div>
        </div>

        {/* Role simulation badge (demo mode only) */}
        {simActive && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 9999,
              background: '#fef3c7',
              color: '#92400e',
              border: '1px solid #fcd34d',
              whiteSpace: 'nowrap',
            }}
          >
            UI Role Sim
          </span>
        )}

        <span style={{ fontSize: 12, opacity: 0.7 }}>▾</span>
      </button>

      {/* Popover */}
      {open && (
        <>
          {/* click-away backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'transparent',
              zIndex: 49,
            }}
          />

          <div
            role="dialog"
            aria-label="Identity panel"
            style={{
              position: 'absolute',
              right: 0,
              marginTop: 10,
              width: 420,
              maxWidth: 'min(420px, calc(100vw - 24px))',
              borderRadius: 16,
              border: '1px solid #e5e7eb',
              background: 'white',
              boxShadow: '0 14px 30px rgba(0,0,0,0.12)',
              padding: 14,
              zIndex: 50,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800 }}>{userName || 'User'}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{userEmail || '—'}</div>
              </div>

              <button
                onClick={() => setOpen(false)}
                style={{
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  borderRadius: 10,
                  padding: '6px 10px',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                Close
              </button>
            </div>

            <div style={{ height: 1, background: '#eef2f7', margin: '12px 0' }} />

            {/* Tenant */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Tenant</div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {tenantId || '—'}
                </div>
              </div>

              <button
                onClick={() => tenantId && copy(tenantId)}
                disabled={!tenantId}
                style={{
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  borderRadius: 10,
                  padding: '6px 10px',
                  cursor: tenantId ? 'pointer' : 'not-allowed',
                  opacity: tenantId ? 1 : 0.5,
                  fontSize: 12,
                }}
              >
                Copy
              </button>
            </div>

            <div style={{ height: 1, background: '#eef2f7', margin: '12px 0' }} />

            {/* Roles */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Roles</div>
                <button
                  onClick={() => copy((roles || []).join(', '))}
                  style={{
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    borderRadius: 10,
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  Copy roles
                </button>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                {(roles || []).length === 0 ? (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>No roles found in token.</div>
                ) : (
                  roles.map((r) => (
                    <span
                      key={r}
                      style={{
                        fontSize: 11,
                        border: '1px solid #e5e7eb',
                        background: '#f8fafc',
                        padding: '4px 8px',
                        borderRadius: 999,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                    >
                      {r}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Role Simulation (demo mode only) */}
            {isUiRoleSimAllowed() && (
              <>
                <div style={{ height: 1, background: '#eef2f7', margin: '12px 0' }} />

                <div
                  style={{
                    borderRadius: 12,
                    border: '1px solid #fcd34d',
                    background: '#fffbeb',
                    padding: 12,
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>
                        Role simulation (UI only)
                      </div>
                      <div style={{ fontSize: 10, color: '#78350f', marginTop: 2 }}>
                        Demo mode only. Backend auth uses real token.
                      </div>
                    </div>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#92400e',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={simEnabled}
                        onChange={(e) => setSimEnabled(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      Enabled
                    </label>
                  </div>

                  {/* Preset Buttons */}
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {rolePresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setSimulatedRoles(preset.roles)}
                        disabled={!simEnabled}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: 9999,
                          border: '1px solid #fcd34d',
                          background: 'white',
                          color: '#92400e',
                          cursor: simEnabled ? 'pointer' : 'not-allowed',
                          opacity: simEnabled ? 1 : 0.5,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (simEnabled) {
                            e.currentTarget.style.background = '#fef3c7';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                    <button
                      onClick={() => clearSimulation()}
                      disabled={!simEnabled}
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 9999,
                        border: '1px solid #d1d5db',
                        background: 'white',
                        color: '#6b7280',
                        cursor: simEnabled ? 'pointer' : 'not-allowed',
                        opacity: simEnabled ? 1 : 0.5,
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  {/* Active Roles Display */}
                  <div style={{ marginTop: 10, fontSize: 10, color: '#78350f' }}>
                    Active UI roles:{' '}
                    <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                      {simulatedRoles.length > 0 ? simulatedRoles.join(', ') : '(none)'}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Server-validated identity (Step E1) */}
            <div style={{ height: 1, background: '#eef2f7', margin: '12px 0' }} />

            <div>
              <button
                onClick={() => setShowServerDetails((v) => !v)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  borderRadius: 12,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                <span>
                  {showServerDetails ? '▾' : '▸'} Server-validated identity
                </span>
                <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>
                  (for demo/support)
                </span>
              </button>

              {showServerDetails && (
                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    padding: 12,
                  }}
                >
                  {me.isLoading && (
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Loading from server...</div>
                  )}

                  {me.isError && (
                    <div style={{ fontSize: 11, color: '#dc2626' }}>
                      Failed to load /api/me
                    </div>
                  )}

                  {me.data && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>
                        This is what the server sees from your JWT token:
                      </div>

                      <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                            issuer:
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              color: '#6b7280',
                              wordBreak: 'break-all',
                              textAlign: 'right',
                            }}
                          >
                            {me.data.issuer || '—'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                            subject:
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              color: '#6b7280',
                              wordBreak: 'break-all',
                              textAlign: 'right',
                            }}
                          >
                            {me.data.subject || '—'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                            userId:
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              color: '#6b7280',
                              wordBreak: 'break-all',
                              textAlign: 'right',
                            }}
                          >
                            {me.data.userId || '—'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                            tenantId:
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              color: '#6b7280',
                              wordBreak: 'break-all',
                              textAlign: 'right',
                            }}
                          >
                            {me.data.tenantId || '—'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                            correlationId:
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              color: '#6b7280',
                              wordBreak: 'break-all',
                              textAlign: 'right',
                            }}
                          >
                            {me.data.correlationId || '—'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>
                            roles:
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                              color: '#6b7280',
                              wordBreak: 'break-all',
                              textAlign: 'right',
                            }}
                          >
                            {me.data.roles?.length > 0 ? me.data.roles.join(', ') : '—'}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: '1px solid #e5e7eb',
                          fontSize: 10,
                          color: '#9ca3af',
                        }}
                      >
                        💡 Use this to verify JWT claims match client state
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ height: 1, background: '#eef2f7', margin: '12px 0' }} />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/portfolio');
                }}
                style={{
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  borderRadius: 12,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                Go to Portfolio
              </button>

              <button
                onClick={() => {
                  // 1) Clear all cached queries (prevent cross-tenant ghost data)
                  queryClient.clear();

                  // 2) Reset UI store (clear loan context, scenarios, etc.)
                  useUIStore.getState().reset();

                  // 3) Clear auth and redirect to Keycloak logout
                  logout();
                }}
                style={{
                  border: '1px solid #111827',
                  background: '#111827',
                  color: 'white',
                  borderRadius: 12,
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
