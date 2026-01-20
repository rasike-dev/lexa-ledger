/**
 * Trading Readiness "Why?" Drawer (Wrapper)
 * 
 * Week 3 - Track A: Refactored to use shared ExplainabilityDrawer
 * Facts-first, audit-safe, tenant-isolated.
 */

import { useNavigate } from "react-router-dom";
import { ExplainabilityDrawer } from "../explainability/ExplainabilityDrawer";
import { buildTradingReadinessAuditLink } from "../../utils/auditLink";
import {
  useExplainTradingReadiness,
  useLatestTradingReadinessFacts,
  useRecomputeTradingReadinessFacts,
} from "../../queries/useTradingReadinessExplain";
import { useUIStore } from "../../app/store/uiStore";
import { useAuthStore } from "../../app/store/authStore";
import { Roles, hasAnyRole } from "../../auth/roles";

type Props = {
  loanId: string;
  open: boolean;
  onClose: () => void;
};

export function TradingReadinessWhyDrawer({ loanId, open, onClose }: Props) {
  const navigate = useNavigate();
  
  // Auth & RBAC
  const roles = useAuthStore((s) => s.roles ?? []);
  const canRecompute = hasAnyRole(roles, [Roles.TRADING_ANALYST, Roles.TENANT_ADMIN]);

  // Data fetching
  const factsQ = useLatestTradingReadinessFacts(loanId);
  const recomputeM = useRecomputeTradingReadinessFacts(loanId);
  const explainM = useExplainTradingReadiness(loanId);

  // UI state
  const verbosity = useUIStore((s) => s.tradingExplainVerbosity);
  const setVerbosity = useUIStore((s) => s.setTradingExplainVerbosity);
  const markExplained = useUIStore((s) => s.markExplained);

  const facts: any = factsQ.data;
  const result: any = explainM.data;

  return (
    <ExplainabilityDrawer
      title="Why this readiness result?"
      subtitle="Facts-first explanation • audit-safe • tenant-isolated"
      open={open}
      onClose={onClose}
      factsTitle="Latest Fact Snapshot"
      factsSummary={
        facts ? (
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-xs text-slate-500 font-medium">Score:</span>{" "}
                <span className="font-semibold text-slate-900">{facts.readinessScore}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium">Band:</span>{" "}
                <span className={`font-semibold ${
                  facts.readinessBand === 'GREEN' ? 'text-green-600' :
                  facts.readinessBand === 'AMBER' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {facts.readinessBand}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 font-mono">
              computedAt: {new Date(facts.computedAt).toLocaleString()} • hash: {String(facts.factHash).slice(0, 16)}…
            </div>
          </div>
        ) : factsQ.isLoading ? (
          <span className="text-slate-500">Loading facts…</span>
        ) : (
          <span className="text-red-600">No facts found. Recompute to create a snapshot.</span>
        )
      }
      factsJson={facts}
      blockingIssues={facts?.blockingIssues ?? []}
      canRecompute={canRecompute}
      recomputeLabel={recomputeM.isPending ? "Recomputing…" : "Recompute"}
      onRecompute={async () => {
        await recomputeM.mutateAsync();
      }}
      verbosity={verbosity}
      setVerbosity={setVerbosity}
      canExplain={!!facts && !explainM.isPending}
      explaining={explainM.isPending}
      onExplain={async () => {
        await explainM.mutateAsync(verbosity);
        if (facts?.factHash) markExplained(loanId, facts.factHash);
      }}
      result={result}
      error={explainM.error}
      isEmpty={!facts || !!factsQ.error}
      onCopyResult={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
      onViewAuditTrail={() =>
        navigate(buildTradingReadinessAuditLink({ loanId, factHash: facts?.factHash }))
      }
    />
  );
}
