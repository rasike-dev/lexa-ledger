/**
 * Trading Readiness Explainability Badge
 * 
 * Week 3 - Track A.1: Explainable Trading Readiness
 * 
 * Quick status overview and one-click actions:
 * - Fact snapshot status
 * - Explanation status (session-level)
 * - One-click "Explain" with last-used verbosity
 * - "Why?" drawer opener
 * - Audit trail deep link
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useLatestTradingReadinessFacts,
  useExplainTradingReadiness,
} from "../../queries/useTradingReadinessExplain";
import { useUIStore } from "../../app/store/uiStore";
import { buildTradingReadinessAuditLink } from "../../utils/auditLink";
import type { ExplainVerbosity } from "../../api/tradingReadiness";

type Props = {
  loanId: string;
  onOpenWhyDrawer: () => void; // Opens the existing full drawer
};

export function TradingReadinessExplainabilityBadge({ loanId, onOpenWhyDrawer }: Props) {
  const navigate = useNavigate();

  const factsQ = useLatestTradingReadinessFacts(loanId);
  const explainM = useExplainTradingReadiness(loanId);

  const verbosity = useUIStore((s) => s.tradingExplainVerbosity);
  const setVerbosity = useUIStore((s) => s.setTradingExplainVerbosity);

  const lastExplained = useUIStore((s) => s.lastExplainedFactHashByLoan[loanId]);
  const markExplained = useUIStore((s) => s.markExplained);

  const facts = factsQ.data as any | undefined;

  const factHashShort = useMemo(() => {
    const h = facts?.factHash as string | undefined;
    return h ? `${h.slice(0, 12)}…` : "";
  }, [facts?.factHash]);

  const snapshotStatus = facts
    ? "SNAPSHOT_READY"
    : factsQ.isLoading
      ? "LOADING"
      : "SNAPSHOT_MISSING";

  const explanationStatus =
    facts?.factHash && lastExplained === facts.factHash ? "EXPLAINED" : "NOT_EXPLAINED";

  async function oneClickExplain() {
    if (!facts?.factHash) return;

    try {
      await explainM.mutateAsync(verbosity);
      markExplained(loanId, facts.factHash);
      // Open drawer so user immediately sees explanation
      onOpenWhyDrawer();
    } catch (err) {
      // Error handled by global error handler/toast
      console.error('Failed to generate explanation:', err);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        background: 'white',
        padding: '0.5rem 0.75rem',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Left: Status */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151' }}>
          Explainability
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {snapshotStatus === "LOADING" && "Loading snapshot…"}
          {snapshotStatus === "SNAPSHOT_MISSING" && "No fact snapshot"}
          {snapshotStatus === "SNAPSHOT_READY" && (
            <>
              Snapshot: <span style={{ fontWeight: 500 }}>ready</span> • Hash{" "}
              <button
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dotted',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: '#6b7280',
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#111827')}
                onMouseOut={(e) => (e.currentTarget.style.color = '#6b7280')}
                onClick={() => navigator.clipboard.writeText(facts.factHash)}
                title="Copy factHash"
              >
                {factHashShort}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Verbosity selector */}
        <select
          style={{
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            padding: '0.25rem 0.5rem',
            fontSize: '0.75rem',
            cursor: !facts ? 'not-allowed' : 'pointer',
            opacity: !facts ? 0.5 : 1,
          }}
          value={verbosity}
          onChange={(e) => setVerbosity(e.target.value as ExplainVerbosity)}
          disabled={!facts}
          title="Verbosity"
        >
          <option value="SHORT">Short</option>
          <option value="STANDARD">Standard</option>
          <option value="DETAILED">Detailed</option>
        </select>

        {/* Explanation status pill */}
        <div
          style={{
            borderRadius: '9999px',
            padding: '0.25rem 0.5rem',
            fontSize: '11px',
            background: explanationStatus === "EXPLAINED" ? '#f0fdf4' : '#f9fafb',
            color: explanationStatus === "EXPLAINED" ? '#15803d' : '#4b5563',
          }}
          title={
            explanationStatus === "EXPLAINED"
              ? "Explanation generated for this snapshot (session)"
              : "Not generated yet (session)"
          }
        >
          {explanationStatus === "EXPLAINED" ? "Explained" : "Not explained"}
        </div>

        {/* One-click explain */}
        <button
          style={{
            borderRadius: '0.375rem',
            background: '#2563eb',
            color: 'white',
            padding: '0.375rem 0.75rem',
            fontSize: '0.75rem',
            border: 'none',
            cursor: (!facts || explainM.isPending) ? 'not-allowed' : 'pointer',
            opacity: (!facts || explainM.isPending) ? 0.5 : 1,
            fontWeight: 500,
          }}
          onClick={oneClickExplain}
          disabled={!facts || explainM.isPending}
          title={!facts ? "Compute facts first" : "Generate explanation"}
        >
          {explainM.isPending ? "Explaining…" : "Explain"}
        </button>

        {/* Open drawer */}
        <button
          style={{
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            background: 'white',
            padding: '0.375rem 0.75rem',
            fontSize: '0.75rem',
            cursor: !facts ? 'not-allowed' : 'pointer',
            opacity: !facts ? 0.5 : 1,
          }}
          onMouseOver={(e) => !facts || (e.currentTarget.style.background = '#f9fafb')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
          onClick={onOpenWhyDrawer}
          disabled={!facts}
          title="Open full explanation drawer"
        >
          Why?
        </button>

        {/* Audit */}
        <button
          style={{
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            background: 'white',
            padding: '0.375rem 0.75rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#f9fafb')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'white')}
          onClick={() =>
            navigate(
              buildTradingReadinessAuditLink({
                loanId,
                factHash: facts?.factHash,
              }),
            )
          }
          title="View audit trail"
        >
          Audit
        </button>
      </div>
    </div>
  );
}
