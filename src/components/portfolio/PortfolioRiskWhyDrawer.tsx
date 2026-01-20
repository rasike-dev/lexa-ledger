/**
 * Portfolio Risk "Why?" Drawer
 * 
 * Week 3 - Track A: Explainable Intelligence
 * Step E1.2: Explain Drawer Polish
 * 
 * Facts-first, audit-safe, tenant-isolated.
 */

import { useNavigate } from "react-router-dom";
import { ExplainabilityDrawer } from "../explainability/ExplainabilityDrawer";
import { useUIStore } from "../../app/store/uiStore";
import { useAuthStore } from "../../app/store/authStore";
import { Roles, hasAnyRole } from "../../auth/roles";

type Props = {
  portfolioId?: string;
  open: boolean;
  onClose: () => void;
};

export function PortfolioRiskWhyDrawer({ portfolioId = 'default', open, onClose }: Props) {
  const navigate = useNavigate();
  
  // Auth & RBAC
  const roles = useAuthStore((s) => s.roles ?? []);
  const canRecompute = hasAnyRole(roles, [
    Roles.RISK_OFFICER, 
    Roles.COMPLIANCE_AUDITOR, 
    Roles.TENANT_ADMIN
  ]);

  // UI state
  const verbosity = useUIStore((s) => s.portfolioExplainVerbosity || 'STANDARD');
  const setVerbosity = useUIStore((s) => s.setPortfolioExplainVerbosity);

  // TODO: Wire up data fetching hooks when Portfolio explain endpoints are ready
  // const factsQ = useLatestPortfolioRiskFacts(portfolioId);
  // const recomputeM = useRecomputePortfolioRiskFacts(portfolioId);
  // const explainM = useExplainPortfolioRisk(portfolioId);

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
      title="Why this portfolio risk distribution?"
      subtitle="Facts-first explanation • audit-safe • tenant-isolated"
      open={open}
      onClose={onClose}
      factsTitle="Latest Portfolio Risk Snapshot"
      factsSummary={
        facts ? (
          <div>
            <span className="font-medium">Loans:</span> {facts.totals?.loans ?? 0}{" "}
            <span className="font-medium">Exposure:</span> {
              facts.totals?.exposure 
                ? new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: facts.totals.currency || 'USD',
                    notation: 'compact'
                  }).format(facts.totals.exposure)
                : 'N/A'
            }
            <div className="mt-1 text-xs text-gray-500">
              asOfDate: {new Date(facts.asOfDate).toLocaleString()} • hash:{" "}
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
      blockingIssues={facts?.anomalies ?? []}
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
        navigate(`/audit?entityType=PORTFOLIO&entityId=${portfolioId}&module=PORTFOLIO&action=EXPLAIN_RISK`)
      }
    />
  );
}
