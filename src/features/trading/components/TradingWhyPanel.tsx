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
      return await httpClient.post(`/api/trading/readiness/${loanId}/explain`, {
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
          padding: '12px 16px',
          background: isExpanded ? '#f8fafc' : 'white',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            ?
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
              Why is this rated {bandStyle.label}?
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              AI-powered explanation (based on deterministic facts)
            </div>
          </div>
        </div>
        <div style={{ fontSize: 18, color: '#94a3b8' }}>{isExpanded ? '−' : '+'}</div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div style={{ padding: '0 16px 16px 16px' }}>
          {/* Controls */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginBottom: 12,
              paddingTop: 12,
              borderTop: '1px solid #e5e7eb',
            }}
          >
            <div style={{ fontSize: 11, color: '#64748b', alignSelf: 'center' }}>
              Audience: <span style={{ fontWeight: 600, color: '#0f172a' }}>Auto (from roles)</span>
            </div>

            <select
              value={verbosity}
              onChange={(e) => setVerbosity(e.target.value as any)}
              style={{
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 12,
                background: 'white',
              }}
            >
              <option value="SHORT">Short</option>
              <option value="STANDARD">Standard</option>
              <option value="DETAILED">Detailed</option>
            </select>

            <button
              onClick={() => refetch()}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 12,
                background: 'white',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              Refresh
            </button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
              Generating explanation...
            </div>
          )}

          {/* Error State */}
          {error && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'rgba(239,68,68,0.1)',
                color: '#dc2626',
                fontSize: 13,
              }}
            >
              Failed to load explanation. Please try again.
            </div>
          )}

          {/* Explanation Content */}
          {explanation && !explanation.error && (
            <div>
              {/* Summary */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: '#f8fafc',
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                  SUMMARY
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5, color: '#0f172a' }}>
                  {explanation.summary}
                </div>
              </div>

              {/* Explanation Points */}
              {explanation.explanation.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                    KEY FACTORS
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6 }}>
                    {explanation.explanation.map((point, idx) => (
                      <li key={idx} style={{ marginBottom: 4, color: '#475569' }}>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {explanation.recommendations.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                    RECOMMENDATIONS
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {explanation.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: 'rgba(99,102,241,0.05)',
                          border: '1px solid rgba(99,102,241,0.1)',
                          fontSize: 13,
                          color: '#475569',
                        }}
                      >
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata Footer */}
              <div
                style={{
                  paddingTop: 12,
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  color: '#94a3b8',
                }}
              >
                <div>
                  Confidence: <span style={{ fontWeight: 600 }}>{explanation.confidence}</span>
                </div>
                <div>
                  Snapshot:{' '}
                  <span
                    style={{
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      fontSize: 10,
                    }}
                  >
                    {explanation.factSnapshot.id.slice(0, 8)}...
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error from API */}
          {explanation?.error && (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: 'rgba(239,68,68,0.1)',
                color: '#dc2626',
                fontSize: 13,
              }}
            >
              {explanation.error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
