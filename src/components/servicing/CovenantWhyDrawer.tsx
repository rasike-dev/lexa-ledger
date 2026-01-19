/**
 * Covenant "Why?" Drawer
 * 
 * Week 3 - Track A: Explainable Intelligence
 * Step E1.2: Explain Drawer Polish
 * 
 * Facts-first, audit-safe, tenant-isolated.
 * CRITICAL: No legal interpretation - explains thresholds, observed values, and breach logic only.
 */

import { useNavigate } from "react-router-dom";
import { ExplainabilityDrawer } from "../explainability/ExplainabilityDrawer";
import { useUIStore } from "../../app/store/uiStore";
import { useAuthStore } from "../../app/store/authStore";
import { Roles, hasAnyRole } from "../../auth/roles";

type Props = {
  loanId: string;
  covenantId: string;
  open: boolean;
  onClose: () => void;
};

export function CovenantWhyDrawer({ loanId, covenantId: _covenantId, open, onClose }: Props) {
  const navigate = useNavigate();
  
  // Auth & RBAC
  const roles = useAuthStore((s) => s.roles ?? []);
  const canRecompute = hasAnyRole(roles, [Roles.TENANT_ADMIN]); // SERVICING_OFFICER role doesn't exist

  // UI state
  const verbosity = useUIStore((s) => (s as any).covenantExplainVerbosity || 'STANDARD');
  const setVerbosity = (v: any) => {
    // Store in UIStore when available
    console.log('Covenant explain verbosity:', v);
  };

  // TODO: Wire up data fetching hooks when Covenant explain endpoints are ready
  // const factsQ = useLatestCovenantFacts(loanId, covenantId);
  // const recomputeM = useRecomputeCovenantFacts(loanId, covenantId);
  // const explainM = useExplainCovenant(loanId, covenantId);

  // Placeholder state
  const factsQ = { data: null, isLoading: false, error: null };
  const recomputeM = { isPending: false, mutateAsync: async () => {} };
  const explainM = { 
    data: null, 
    isPending: false, 
    error: null,
    mutateAsync: async (_v: any) => {}
  };

  const facts: any = factsQ.data;
  const result: any = explainM.data;

  return (
    <ExplainabilityDrawer
      title="Why this covenant status?"
      subtitle="Facts-first explanation • audit-safe • tenant-isolated • NO legal interpretation"
      open={open}
      onClose={onClose}
      factsTitle="Latest Covenant Evaluation"
      factsSummary={
        facts ? (
          <div>
            <span className="font-medium">Status:</span> {facts.status}{" "}
            <span className="font-medium">Type:</span> {facts.covenantType}
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
      blockingIssues={facts?.breachDetail ? [facts.breachDetail] : []}
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
      }}
      result={result}
      error={explainM.error}
      isEmpty={!facts || !!factsQ.error}
      onCopyResult={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
      onViewAuditTrail={() =>
        navigate(`/audit?entityType=LOAN&entityId=${loanId}&module=SERVICING&action=EXPLAIN_COVENANT`)
      }
    />
  );
}
