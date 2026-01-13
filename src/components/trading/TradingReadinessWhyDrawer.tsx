/**
 * Trading Readiness "Why?" Drawer (Wrapper)
 * 
 * Week 3 - Track A: Refactored to use shared ExplainabilityDrawer
 * Facts-first, audit-safe, tenant-isolated.
 */

import React from "react";
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
          <div>
            <span className="font-medium">Score:</span> {facts.readinessScore}{" "}
            <span className="font-medium">Band:</span> {facts.readinessBand}
            <div className="mt-1 text-xs text-gray-500">
              computedAt: {new Date(facts.computedAt).toLocaleString()} • hash:{" "}
              <span className="font-mono">{String(facts.factHash).slice(0, 12)}…</span>
            </div>
          </div>
        ) : factsQ.isLoading ? (
          "Loading facts…"
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
      isEmpty={!facts || factsQ.error}
      onCopyResult={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
      onViewAuditTrail={() =>
        navigate(buildTradingReadinessAuditLink({ loanId, factHash: facts?.factHash }))
      }
    />
  );
}
