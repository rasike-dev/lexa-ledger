/**
 * Trading Readiness "Why?" Panel
 * 
 * Week 3 - Track A.1: Explainable Trading Readiness
 * 
 * Displays AI-powered explanation of trading readiness assessment.
 * Always linked to an immutable fact snapshot (no hallucinations).
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { httpClient } from '@/shared/api/httpClient';

interface TradingWhyPanelProps {
  loanId: string;
  readinessScore: number;
  readinessBand: 'GREEN' | 'AMBER' | 'RED';
}

interface ExplanationResponse {
  summary: string;
  explanation: string[];
  recommendations: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  explanationId: string;
  factSnapshotId: string;
  factSnapshot: {
    id: string;
    readinessScore: number;
    readinessBand: string;
    computedAt: string;
    factHash: string;
  };
}

export function TradingWhyPanel({ loanId, readinessScore, readinessBand }: TradingWhyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [verbosity, setVerbosity] = useState<'SHORT' | 'STANDARD' | 'DETAILED'>('STANDARD');

  const { data: explanation, isLoading, error, refetch } = useQuery<ExplanationResponse>({
    queryKey: ['trading-explanation', loanId, verbosity], // audience is derived server-side from roles
    queryFn: async () => {
      return await httpClient.post(`/trading/readiness/${loanId}/explain`, {
        verbosity,
      });
    },
    enabled: isExpanded, // Only fetch when panel is expanded
    staleTime: 60_000, // Cache for 1 minute
  });

  // Get band styling
  const getBandStyle = (band: string) => {
    switch (band) {
      case 'GREEN':
        return { bg: 'rgba(16,185,129,0.12)', fg: 'rgb(16,185,129)', label: 'GREEN' };
      case 'AMBER':
        return { bg: 'rgba(245,158,11,0.12)', fg: 'rgb(245,158,11)', label: 'AMBER' };
      case 'RED':
        return { bg: 'rgba(239,68,68,0.12)', fg: 'rgb(239,68,68)', label: 'RED' };
      default:
        return { bg: 'rgba(100,116,139,0.12)', fg: 'rgb(100,116,139)', label: 'N/A' };
    }
  };

  const bandStyle = getBandStyle(readinessBand);

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid #e5e7eb',
        background: 'white',
        overflow: 'hidden',
      }}
    >
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '16px 20px',
          background: isExpanded ? '#f8fafc' : 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          transition: 'background-color 0.2s',
        }}
        onMouseOver={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = '#f8fafc';
          }
        }}
        onMouseOut={(e) => {
          if (!isExpanded) {
            e.currentTarget.style.background = 'white';
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 18,
              fontWeight: 700,
              boxShadow: '0 2px 4px rgba(99, 102, 241, 0.2)',
            }}
          >
            ?
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>
              Why is this rated {bandStyle.label}?
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              AI-powered explanation based on deterministic fact snapshots
            </div>
          </div>
        </div>
        <div style={{ 
          fontSize: 20, 
          color: '#94a3b8',
          fontWeight: 300,
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {isExpanded ? '−' : '+'}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: '20px', background: '#fafbfc' }}>
          {/* Controls */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '2px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Audience:</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>Auto (from roles)</span>
            </div>
            <div style={{ width: '1px', height: 20, background: '#e5e7eb' }} />
            <label style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Verbosity:</span>
              <select
                value={verbosity}
                onChange={(e) => setVerbosity(e.target.value as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 12,
                  background: 'white',
                  fontWeight: 500,
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <option value="SHORT">Short</option>
                <option value="STANDARD">Standard</option>
                <option value="DETAILED">Detailed</option>
              </select>
            </label>
            <div style={{ marginLeft: 'auto' }}>
              <button
                onClick={() => refetch()}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  fontSize: 12,
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#0f172a',
                  transition: 'all 0.2s',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div style={{ 
              padding: '32px', 
              textAlign: 'center', 
              color: '#64748b', 
              fontSize: 14,
              background: 'white',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ marginBottom: 8 }}>Generating explanation...</div>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>This may take a few moments</div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div
              style={{
                padding: '16px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Failed to load explanation</div>
              <div>Please try again or contact support if the issue persists.</div>
            </div>
          )}

          {/* Explanation Content */}
          {explanation && !explanation.error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Summary */}
              <div
                style={{
                  padding: '20px',
                  borderRadius: 8,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}
              >
                <div style={{ 
                  fontSize: 11, 
                  fontWeight: 700, 
                  color: '#64748b', 
                  marginBottom: 12,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Executive Summary
                </div>
                <div style={{ 
                  fontSize: 14, 
                  lineHeight: 1.7, 
                  color: '#0f172a',
                  fontWeight: 400,
                }}>
                  {explanation.summary}
                </div>
              </div>

              {/* Explanation Points */}
              {explanation.explanation.length > 0 && (
                <div style={{
                  padding: '20px',
                  borderRadius: 8,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}>
                  <div style={{ 
                    fontSize: 11, 
                    fontWeight: 700, 
                    color: '#64748b', 
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Key Contributing Factors
                  </div>
                  <ul style={{ 
                    margin: 0, 
                    paddingLeft: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}>
                    {explanation.explanation.map((point, idx) => (
                      <li 
                        key={idx} 
                        style={{ 
                          display: 'flex',
                          gap: 12,
                          color: '#1e293b',
                          fontSize: 14,
                          lineHeight: 1.6,
                        }}
                      >
                        <div style={{
                          flexShrink: 0,
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#6366f1',
                          marginTop: 8,
                        }} />
                        <div style={{ flex: 1 }}>{point}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {explanation.recommendations.length > 0 && (
                <div style={{
                  padding: '20px',
                  borderRadius: 8,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                }}>
                  <div style={{ 
                    fontSize: 11, 
                    fontWeight: 700, 
                    color: '#64748b', 
                    marginBottom: 16,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Recommended Actions
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {explanation.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px 16px',
                          borderRadius: 6,
                          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%)',
                          border: '1px solid rgba(99,102,241,0.2)',
                          fontSize: 13,
                          color: '#1e293b',
                          lineHeight: 1.6,
                          display: 'flex',
                          gap: 10,
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{
                          flexShrink: 0,
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          background: 'rgba(99,102,241,0.1)',
                          border: '1px solid rgba(99,102,241,0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 700,
                          color: '#6366f1',
                          marginTop: 1,
                        }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>{rec}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Footer */}
              <div
                style={{
                  padding: '16px 20px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  color: '#64748b',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Confidence:</span>{' '}
                    <span style={{ 
                      fontWeight: 700,
                      color: explanation.confidence === 'HIGH' ? '#059669' : 
                             explanation.confidence === 'MEDIUM' ? '#d97706' : '#dc2626'
                    }}>
                      {explanation.confidence}
                    </span>
                  </div>
                  <div style={{ width: '1px', height: 16, background: '#cbd5e1' }} />
                  <div>
                    <span style={{ fontWeight: 600, color: '#475569' }}>Snapshot:</span>{' '}
                    <span
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                        fontSize: 11,
                        color: '#64748b',
                        background: 'white',
                        padding: '2px 6px',
                        borderRadius: 4,
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      {explanation.factSnapshot.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error from API */}
          {explanation?.error && (
            <div
              style={{
                padding: '16px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Error</div>
              <div>{explanation.error}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
