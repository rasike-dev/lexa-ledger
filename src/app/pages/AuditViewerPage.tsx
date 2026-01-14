/**
 * AuditViewerPage - Enterprise Audit Event Viewer (Week 2.5 - Step E2)
 * 
 * Purpose:
 * - Searchable, filterable audit trail
 * - Demo-friendly: "every action → audited → searchable → exportable"
 * - RBAC protected: COMPLIANCE_AUDITOR + TENANT_ADMIN only
 * 
 * Features:
 * - Filters: date range, actorType, action, correlationId, free-text
 * - Table: paginated, sortable
 * - Detail drawer: full JSON view on row click
 * - Export: downloads current filtered results
 */

import { useMemo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { httpClient } from '@/shared/api/httpClient';
import { env } from '../config/env';

type AuditEvent = {
  id: string;
  createdAt: string;
  tenantId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  actorType: 'USER' | 'SERVICE';
  actorUserId?: string | null;
  actorClientId?: string | null;
  actorRoles?: string[] | null;
  correlationId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: any;
};

type AuditResponse = {
  items: AuditEvent[];
  nextCursor: string | null;
};

export function AuditViewerPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursors, setCursors] = useState<(string | null)[]>([null]); // Track cursor history for prev
  const limit = 25;

  const [q, setQ] = useState('');
  const [actorType, setActorType] = useState<'' | 'USER' | 'SERVICE'>('');
  const [correlationId, setCorrelationId] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [module, setModule] = useState(''); // Hidden filter from URL params
  const [entityId, setEntityId] = useState(''); // Hidden filter from URL params

  // Read URL params on mount (for deep linking)
  useEffect(() => {
    const qParam = searchParams.get('q');
    const actorTypeParam = searchParams.get('actorType') as '' | 'USER' | 'SERVICE' | null;
    const correlationIdParam = searchParams.get('correlationId');
    const actionParam = searchParams.get('action');
    const entityTypeParam = searchParams.get('entityType');
    const moduleParam = searchParams.get('module');
    const entityIdParam = searchParams.get('entityId');

    if (qParam) setQ(qParam);
    if (actorTypeParam) setActorType(actorTypeParam);
    if (correlationIdParam) setCorrelationId(correlationIdParam);
    if (actionParam) setAction(actionParam);
    if (entityTypeParam) setEntityType(entityTypeParam);
    if (moduleParam) setModule(moduleParam);
    if (entityIdParam) setEntityId(entityIdParam);
  }, [searchParams]);

  const params = useMemo(() => {
    const p: Record<string, any> = { limit };
    if (cursor) p.cursor = cursor;
    if (q.trim()) p.q = q.trim();
    if (actorType) p.actorType = actorType;
    if (correlationId.trim()) p.correlationId = correlationId.trim();
    if (action.trim()) p.action = action.trim();
    if (entityType.trim()) p.entityType = entityType.trim();
    if (module.trim()) p.module = module.trim(); // From URL params
    if (entityId.trim()) p.entityId = entityId.trim(); // From URL params
    return p;
  }, [cursor, limit, q, actorType, correlationId, action, entityType, module, entityId]);

  const audit = useQuery({
    queryKey: ['audit-events', params],
    queryFn: async () => {
      const response = await httpClient.get<AuditResponse>('/audit/events', { query: params });
      // Ensure response has the expected structure
      if (!response || typeof response !== 'object') {
        console.error('Unexpected API response:', response);
        return { items: [], nextCursor: null };
      }
      return response;
    },
    keepPreviousData: true,
    retry: 1,
  });

  const [selected, setSelected] = useState<AuditEvent | null>(null);

  const exportUrl = useMemo(() => {
    const usp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (k !== 'cursor') {
        // Export without cursor, just filters
        usp.set(k, String(v));
      }
    });
    // For export, use a large limit
    usp.set('limit', '1000');
    return `${env.apiBaseUrl}/audit/events?${usp.toString()}`;
  }, [params]);

  const handleNext = () => {
    if (audit.data?.nextCursor) {
      setCursors([...cursors, cursor]);
      setCursor(audit.data.nextCursor);
    }
  };

  const handlePrev = () => {
    if (cursors.length > 1) {
      const newCursors = cursors.slice(0, -1);
      setCursors(newCursors);
      setCursor(newCursors[newCursors.length - 1]);
    }
  };

  const resetFilters = () => {
    setQ('');
    setActorType('');
    setCorrelationId('');
    setAction('');
    setEntityType('');
    setModule(''); // Clear hidden filter
    setEntityId(''); // Clear hidden filter
    setCursor(null);
    setCursors([null]);
    // Clear URL parameters
    setSearchParams({});
  };

  const currentPage = cursors.length;

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#111827' }}>
            Audit Viewer
          </h1>
          <div style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>
            Search and export immutable audit events. RBAC enforced (COMPLIANCE_AUDITOR + TENANT_ADMIN).
          </div>
          {(module || entityId) && (
            <div style={{ marginTop: 8, padding: '6px 12px', background: '#dbeafe', borderRadius: 8, fontSize: 12, color: '#1e40af', fontWeight: 500 }}>
              🔗 Deep-linked filters applied: {module && `module=${module}`} {entityId && `entityId=${entityId.slice(0, 12)}…`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={resetFilters}
            style={{
              border: '1px solid #e5e7eb',
              background: 'white',
              color: '#374151',
              padding: '10px 16px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
            }}
          >
            Reset Filters
          </button>

          <a
            href={exportUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              border: '1px solid #111827',
              background: '#111827',
              color: 'white',
              padding: '10px 16px',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 13,
              transition: 'all 0.15s',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#111827';
            }}
          >
            📥 Export (current filters)
          </a>
        </div>
      </div>

      {/* Filters */}
      <div
        style={{
          marginTop: 20,
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          padding: 16,
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: '#374151' }}>
          Filters
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
          }}
        >
          <input
            placeholder="Search (action, entity, etc.)"
            value={q}
            onChange={(e) => {
              setCursor(null);
              setCursors([null]);
              setQ(e.target.value);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              fontSize: 13,
              outline: 'none',
              transition: 'border 0.15s',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          />

          <select
            value={actorType}
            onChange={(e) => {
              setCursor(null);
              setCursors([null]);
              setActorType(e.target.value as any);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              fontSize: 13,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">Actor Type (all)</option>
            <option value="USER">USER</option>
            <option value="SERVICE">SERVICE</option>
          </select>

          <input
            placeholder="Correlation ID"
            value={correlationId}
            onChange={(e) => {
              setCursor(null);
              setCursors([null]);
              setCorrelationId(e.target.value);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              fontSize: 13,
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          />

          <input
            placeholder="Action (e.g. LOAN_CREATED)"
            value={action}
            onChange={(e) => {
              setCursor(null);
              setCursors([null]);
              setAction(e.target.value);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              fontSize: 13,
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          />

          <input
            placeholder="Entity Type (e.g. Loan)"
            value={entityType}
            onChange={(e) => {
              setCursor(null);
              setCursors([null]);
              setEntityType(e.target.value);
            }}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: 10,
              fontSize: 13,
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#667eea';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          marginTop: 20,
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {/* Table header */}
        <div
          style={{
            padding: 16,
            borderBottom: '1px solid #eef2f7',
            fontSize: 13,
            fontWeight: 700,
            color: '#374151',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            {audit.isLoading
              ? 'Loading…'
              : `${audit.data?.items?.length ?? 0} events (page ${currentPage})`}
          </div>

          {audit.isFetching && !audit.isLoading && (
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Refreshing...</div>
          )}
        </div>

        {/* Table body */}
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>Time</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>Action</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>Actor</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>Entity</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, color: '#374151' }}>Correlation</th>
              </tr>
            </thead>
            <tbody>
              {(audit.data?.items ?? []).map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelected(e)}
                  style={{
                    cursor: 'pointer',
                    borderTop: '1px solid #eef2f7',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = 'white';
                  }}
                >
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: '#6b7280' }}>
                    {new Date(e.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 12,
                      color: '#111827',
                      fontWeight: 600,
                    }}
                  >
                    {e.action}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: e.actorType === 'USER' ? '#dbeafe' : '#fef3c7',
                        color: e.actorType === 'USER' ? '#1e40af' : '#92400e',
                        border:
                          e.actorType === 'USER'
                            ? '1px solid #bfdbfe'
                            : '1px solid #fcd34d',
                      }}
                    >
                      {e.actorType}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: '#6b7280',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                    >
                      {e.actorType === 'USER'
                        ? e.actorUserId?.slice(0, 8) || '—'
                        : e.actorClientId || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                        fontSize: 12,
                        color: '#111827',
                      }}
                    >
                      {e.entityType ?? '—'}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 11,
                        color: '#6b7280',
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      }}
                    >
                      {e.entityId?.slice(0, 12) || '—'}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 11,
                      color: '#6b7280',
                    }}
                  >
                    {e.correlationId?.slice(0, 8) || '—'}
                  </td>
                </tr>
              ))}

              {!audit.isLoading && (audit.data?.items?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>
                    {audit.error ? (
                      <div>
                        <div style={{ color: '#dc2626', marginBottom: 8 }}>Error loading audit events</div>
                        <div style={{ fontSize: 11 }}>{String(audit.error)}</div>
                      </div>
                    ) : (
                      'No audit events found for these filters.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderTop: '1px solid #eef2f7',
            background: '#fafbfc',
          }}
        >
          <button
            onClick={handlePrev}
            disabled={cursors.length <= 1}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              background: cursors.length <= 1 ? '#f9fafb' : 'white',
              color: cursors.length <= 1 ? '#9ca3af' : '#374151',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: cursors.length <= 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (cursors.length > 1) {
                e.currentTarget.style.background = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (cursors.length > 1) {
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            ← Previous
          </button>

          <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>
            Page {currentPage}
          </div>

          <button
            onClick={handleNext}
            disabled={!audit.data?.nextCursor}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              background: !audit.data?.nextCursor ? '#f9fafb' : 'white',
              color: !audit.data?.nextCursor ? '#9ca3af' : '#374151',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 13,
              cursor: !audit.data?.nextCursor ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              if (audit.data?.nextCursor) {
                e.currentTarget.style.background = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (audit.data?.nextCursor) {
                e.currentTarget.style.background = 'white';
              }
            }}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 600,
              maxWidth: '100%',
              maxHeight: '100%',
              borderRadius: 16,
              background: 'white',
              border: '1px solid #e5e7eb',
              padding: 20,
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start',
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>
                  Audit Event Detail
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: '#6b7280',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  }}
                >
                  {selected.id}
                </div>
              </div>

              <button
                onClick={() => setSelected(null)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
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
                Close
              </button>
            </div>

            {/* JSON view */}
            <pre
              style={{
                padding: 16,
                background: '#0d1117',
                color: '#e6edf3',
                borderRadius: 12,
                overflowX: 'auto',
                fontSize: 12,
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {JSON.stringify(selected, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
