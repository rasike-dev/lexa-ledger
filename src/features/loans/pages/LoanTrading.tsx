import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";
import { useAuthStore } from "../../../app/store/authStore";
import { Roles, hasAnyRole } from "../../../auth/roles";
import { loanPaths } from "../../../app/routes/paths";
import PageHeader from "../../../components/layout/PageHeader";
import { DemoDisclaimer } from "../../../components/common";

import { usePortfolio } from "../../portfolio/hooks/usePortfolio";
import { useServicing, enrichCovenants } from "../../servicing/hooks/useServicing";
import { useTradingChecklist } from "../../trading/hooks/useTradingChecklist";
import { useTradingSummary } from "../../trading/hooks/useTradingSummary";
import { useTradingRecompute } from "../../trading/hooks/useTradingRecompute";
import { useEsg } from "../../esg/hooks/useEsg";
import { computeEsgScorecard } from "../../esg/services/mockEsgApi";
import { GuidedDemoCTA } from "../../../app/components/GuidedDemoCTA";
import { featureFlags } from "../../../app/config/featureFlags";
import { ExplainabilityPanel } from "../../../components/trading/ExplainabilityPanel";
import { TradingReadinessWhyDrawer } from "../../../components/trading/TradingReadinessWhyDrawer";
import {
  useExplainTradingReadiness,
  useLatestTradingReadinessFacts,
  useRecomputeTradingReadinessFacts,
} from "../../../queries/useTradingReadinessExplain";
import { buildTradingReadinessAuditLink } from "../../../utils/auditLink";

type CovenantStatus = "OK" | "WATCH" | "BREACH_RISK";
type ChecklistStatus = "PASS" | "REVIEW" | "FAIL";

function statusChip(status: ChecklistStatus) {
  if (status === "PASS")
    return { bg: "rgba(16,185,129,0.12)", fg: "rgb(16,185,129)", label: "PASS" };
  if (status === "REVIEW")
    return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", label: "REVIEW" };
  return { bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)", label: "FAIL" };
}

function covenantPenalty(statuses: CovenantStatus[]) {
  // Deterministic scoring for demo (transparent & explainable)
  const breach = statuses.filter((s) => s === "BREACH_RISK").length;
  const watch = statuses.filter((s) => s === "WATCH").length;

  // Penalties: breach heavy, watch moderate
  const penalty = breach * 18 + watch * 6;
  return { penalty, breach, watch };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function checklistToRoute(loanId: string, title: string, sourceRef?: string) {
  const ref = (sourceRef ?? "").toLowerCase();
  const t = title.toLowerCase();

  // Prefer explicit sourceRef routing
  if (ref.startsWith("servicing:")) return `${loanPaths.servicing(loanId)}#covenants`;
  if (ref.startsWith("doc:")) {
    // If EoD related, jump to clause explorer + suggest EOD tag
    if (t.includes("event of default") || t.includes("eod"))
      return `${loanPaths.documents(loanId)}#clauses`;
    return `${loanPaths.documents(loanId)}#amendments`;
  }
  if (ref.startsWith("esg:")) return `${loanPaths.esg(loanId)}#evidence`;

  // Keyword fallback
  if (t.includes("covenant") || t.includes("headroom"))
    return `${loanPaths.servicing(loanId)}#covenants`;
  if (t.includes("event of default") || t.includes("eod") || t.includes("clause"))
    return `${loanPaths.documents(loanId)}#clauses`;
  if (t.includes("esg") || t.includes("evidence") || t.includes("kpi"))
    return `${loanPaths.esg(loanId)}#evidence`;

  return `${loanPaths.overview(loanId)}#top`;
}

function ExplainabilityPanelWrapper({
  loanId,
  score,
  band,
}: {
  loanId: string;
  score: number;
  band: "GREEN" | "AMBER" | "RED";
}) {
  const factsQ = useLatestTradingReadinessFacts(loanId);
  const recomputeM = useRecomputeTradingReadinessFacts(loanId);
  const explainM = useExplainTradingReadiness(loanId);
  const verbosity = useUIStore((s) => s.tradingExplainVerbosity);
  const setVerbosity = useUIStore((s) => s.setTradingExplainVerbosity);
  const markExplained = useUIStore((s) => s.markExplained);
  const [whyDrawerOpen, setWhyDrawerOpen] = useState(false);

  const facts = factsQ.data;
  const explanation = explainM.data;

  const handleExplain = async () => {
    await explainM.mutateAsync(verbosity);
    if (facts?.factHash) markExplained(loanId, facts.factHash);
  };

  const handleViewFacts = () => {
    setWhyDrawerOpen(true);
  };

  // Render explanation content
  const explanationContent = explanation ? (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {explanation.summary && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "rgb(var(--muted-foreground))", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Executive Summary
          </div>
          <div style={{ fontSize: "13px", lineHeight: "1.7", color: "rgb(var(--foreground))" }}>
            {explanation.summary}
          </div>
        </div>
      )}
      {explanation.explanation && explanation.explanation.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "rgb(var(--muted-foreground))", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Key Contributing Factors
          </div>
          <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
            {explanation.explanation.map((point: string, idx: number) => (
              <li key={idx} style={{ display: "flex", gap: 10, color: "rgb(var(--foreground))", fontSize: "13px", lineHeight: "1.6" }}>
                <div
                  style={{
                    flexShrink: 0,
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "rgb(var(--primary))",
                    marginTop: 7,
                  }}
                />
                <div style={{ flex: 1 }}>{point}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {explanation.recommendations && explanation.recommendations.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "rgb(var(--muted-foreground))", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Recommended Actions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {explanation.recommendations.map((rec: string, idx: number) => (
              <div
                key={idx}
                style={{
                  padding: "12px 14px",
                  borderRadius: "6px",
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  fontSize: "13px",
                  color: "rgb(var(--foreground))",
                  lineHeight: "1.6",
                }}
              >
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      <div style={{ marginBottom: 12 }}>
        <ExplainabilityPanel
          score={facts?.readinessScore ?? score}
          band={facts?.readinessBand ?? band}
          computedAt={facts?.computedAt}
          factHash={facts?.factHash}
          hasExplanation={!!explanation}
          onExplain={handleExplain}
          onRecomputeFacts={() => recomputeM.mutate()}
          onViewFacts={handleViewFacts}
          verbosity={verbosity === "STANDARD" ? "Standard" : verbosity === "SHORT" ? "Standard" : "Detailed"}
          setVerbosity={(v) => setVerbosity(v === "Standard" ? "STANDARD" : "DETAILED")}
          isExplaining={explainM.isPending}
          isRecomputing={recomputeM.isPending}
          explanation={explanationContent}
        />
      </div>
      <TradingReadinessWhyDrawer loanId={loanId} open={whyDrawerOpen} onClose={() => setWhyDrawerOpen(false)} />
    </>
  );
}

export function LoanTrading() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);
  const demoMode = useUIStore((s) => s.demoMode);
  const { roles } = useAuthStore();

  const canRecompute = hasAnyRole(roles, [
    Roles.TRADING_ANALYST,
    Roles.TENANT_ADMIN,
  ]);

  // Unused for now: const canViewWhy = hasAnyRole(roles, [
  //   Roles.TRADING_ANALYST,
  //   Roles.TRADING_VIEWER,
  //   Roles.TENANT_ADMIN,
  //   Roles.COMPLIANCE_AUDITOR,
  // ]);

  const scenario = useUIStore((s) =>
    loanId ? (s.servicingScenarioByLoan[loanId] ?? "base") : "base"
  );

  // Declare all data hooks before using them in effects
  const portfolioQ = usePortfolio();
  const servicingQ = useServicing(loanId ?? null);
  const checklistQ = useTradingChecklist(loanId ?? null);
  const tradingSummary = useTradingSummary(loanId ?? null);
  const recompute = useTradingRecompute(loanId ?? null);
  const esgQ = useEsg(loanId ?? null);

  useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  // Auto-refresh after recompute (simple poll for demo)
  useEffect(() => {
    if (recompute.isSuccess && !demoMode) {
      const timerId = setTimeout(() => {
        tradingSummary.refetch();
      }, 2000); // Wait 2 seconds for worker to process
      return () => clearTimeout(timerId);
    }
  }, [recompute.isSuccess, demoMode, tradingSummary]);

  const baseScore = useMemo(() => {
    const id = loanId ?? "";
    const row = portfolioQ.data?.loans.find((l) => l.id === id);
    return row?.tradeReadyScore ?? 80; // default demo base
  }, [portfolioQ.data, loanId]);

  const covenantStatuses = useMemo(() => {
    if (!servicingQ.data) return [] as CovenantStatus[];
    // enrichCovenants expects ServicingPayload with obligations
    const payload = { ...servicingQ.data, obligations: (servicingQ.data as any).obligations || [] } as any;
    const covs = enrichCovenants(payload, scenario);
    return covs.map((c) => c.status);
  }, [servicingQ.data, scenario]);

  const scoreModel = useMemo(() => {
    // Use live trading summary when available (demoMode OFF)
    if (!demoMode && tradingSummary.data) {
      const score = tradingSummary.data.score;
      const tier = score >= 85 ? "Trade-ready" : score >= 70 ? "Needs review" : "Not ready";
      return { score, tier, penalty: 0, breach: 0, watch: 0 };
    }

    // Fallback to old covenant-based calculation (demoMode ON or no data yet)
    const { penalty, breach, watch } = covenantPenalty(covenantStatuses);
    const score = clamp(baseScore - penalty, 0, 100);
    const tier = score >= 85 ? "Trade-ready" : score >= 70 ? "Needs review" : "Not ready";

    return { score, tier, penalty, breach, watch };
  }, [demoMode, tradingSummary.data, baseScore, covenantStatuses]);

  const evidenceCoverage = useMemo(() => {
    if (!esgQ.data) return null;
    return computeEsgScorecard(esgQ.data).verifiedCoveragePct;
  }, [esgQ.data]);

  const checklist = useMemo(() => {
    // Use live trading summary when available (demoMode OFF)
    if (!demoMode && tradingSummary.data) {
      const items = tradingSummary.data.checklist.map((c: any) => {
        // Map DONE/OPEN/BLOCKED to PASS/REVIEW/FAIL for statusChip compatibility
        const status: ChecklistStatus = 
          c.status === "DONE" ? "PASS" : 
          c.status === "BLOCKED" ? "FAIL" : 
          "REVIEW";
        
        return {
          id: c.id,
          title: c.title,
          status,
          auto: true, // Assume automated for live data
          sourceRef: c.evidenceRef ?? undefined,
          statusBase: status,
          statusStress: status,
        };
      });

      const counts = items.reduce(
        (acc: Record<string, number>, i: any) => {
          acc[i.status] += 1;
          return acc;
        },
        { PASS: 0, REVIEW: 0, FAIL: 0 } as Record<ChecklistStatus, number>
      );

      return { items, counts };
    }

    // Fallback to old fixture data (demoMode ON)
    if (!checklistQ.data) return null;

    const items = checklistQ.data.checklist.map((c) => {
      // default status from fixture
      let status = (scenario === "stress" ? c.statusStress : c.statusBase) as ChecklistStatus;

      // Dynamic override for ESG evidence check
      // Match by title (simple + robust for demo). You can later match by id "chk-005".
      const isEsgEvidenceCheck =
        c.id === "chk-005" ||
        c.title.toLowerCase().includes("esg") ||
        c.title.toLowerCase().includes("evidence");

      if (isEsgEvidenceCheck && evidenceCoverage !== null) {
        status = evidenceCoverage >= 67 ? "PASS" : "REVIEW";
      }

      return { ...c, status };
    });

    const counts = items.reduce(
      (acc, i) => {
        acc[i.status] += 1;
        return acc;
      },
      { PASS: 0, REVIEW: 0, FAIL: 0 } as Record<ChecklistStatus, number>
    );

    return { items, counts };
  }, [demoMode, tradingSummary.data, checklistQ.data, scenario, evidenceCoverage]);

  const canViewAudit = hasAnyRole(roles, [Roles.COMPLIANCE_AUDITOR, Roles.TENANT_ADMIN]);
  const canExport = hasAnyRole(roles, [
    Roles.TRADING_ANALYST,
    Roles.TRADING_VIEWER,
    Roles.COMPLIANCE_AUDITOR,
    Roles.TENANT_ADMIN,
  ]);

  return (
    <div className="p-6">
      <DemoDisclaimer />
      
      <PageHeader
        title="Trading • Trade Readiness"
        subtitle="Risk-aware automation for secondary trading diligence and readiness scoring"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {canViewAudit && loanId && (
              <NavLink
                to={buildTradingReadinessAuditLink({ loanId })}
                style={{
                  textDecoration: "none",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--card))",
                  color: "rgb(var(--foreground))",
                  fontSize: "13px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>📋</span>
                View Audit
              </NavLink>
            )}
            {canExport && loanId && (
              <button
                onClick={() => navigate(loanPaths.tradingReport(loanId))}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--primary))",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>📄</span>
                Export Report
              </button>
            )}
          </div>
        }
      />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <LinkChip to={loanPaths.documents(loanId ?? "demo-loan-001")} label="Go to Documents" />
        <LinkChip to={loanPaths.servicing(loanId ?? "demo-loan-001")} label="Go to Servicing" />
        {canViewAudit && loanId && (
          <LinkChip
            to={buildTradingReadinessAuditLink({ loanId })}
            label="View Audit Trail"
          />
        )}
      </div>


      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Card title="Scenario" value={scenario === "base" ? "Base actuals" : "Stress scenario"} />
        <Card
          title="Readiness score"
          value={<ScorePill score={scoreModel.score} tier={scoreModel.tier} />}
        />
        <Card
          title="Risk adjustment"
          value={
            <div>
              <div style={{ fontWeight: 900 }}>-{scoreModel.penalty} pts</div>
              <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>
                {scoreModel.breach} breach-risk • {scoreModel.watch} watch
              </div>
            </div>
          }
        />
      </div>

      {/* Week 3 - Track A.1: Explainable Trading Readiness (Why Panel) */}
      {!demoMode && loanId && tradingSummary.data && (
        <ExplainabilityPanelWrapper
          loanId={loanId}
          score={scoreModel.score}
          band={tradingSummary.data.band as "GREEN" | "AMBER" | "RED"}
        />
      )}

      {/* Control Panel (live data only) */}
      {!demoMode && tradingSummary.data && (
        <div
          style={{
            marginBottom: 12,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>Last computed:</div>
            <div style={{ fontWeight: 600 }}>
              {tradingSummary.data.computedAt 
                ? new Date(tradingSummary.data.computedAt).toLocaleString()
                : "—"}
            </div>
            <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginLeft: "auto" }}>
              Band: 
            </div>
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                background: 
                  tradingSummary.data.band === "GREEN" ? "rgba(16,185,129,0.12)" :
                  tradingSummary.data.band === "AMBER" ? "rgba(245,158,11,0.12)" :
                  "rgba(220,38,38,0.12)",
                color: 
                  tradingSummary.data.band === "GREEN" ? "rgb(16,185,129)" :
                  tradingSummary.data.band === "AMBER" ? "rgb(245,158,11)" :
                  "rgb(220,38,38)",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {tradingSummary.data.band}
            </span>
            <button
              onClick={() => recompute.mutate()}
              disabled={!canRecompute || recompute.isPending}
              title={
                !canRecompute
                  ? "Requires Trading Analyst or Tenant Admin role"
                  : undefined
              }
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid rgb(var(--border))",
                background: !canRecompute ? "rgb(var(--muted))" : "rgb(var(--bg))",
                fontWeight: 900,
                cursor: !canRecompute || recompute.isPending ? "not-allowed" : "pointer",
                opacity: !canRecompute ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {recompute.isPending ? (
                <>
                  <span className="spinner" /> Recomputing...
                </>
              ) : (
                <>
                  <span style={{ fontSize: 16 }}>⟳</span> Recompute Now
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        {/* Checklist */}
        <div
          style={{
            border: "1px solid rgb(var(--border))",
            borderRadius: 12,
            background: "rgb(var(--card))",
          }}
        >
          <div
            style={{
              padding: 12,
              borderBottom: "1px solid rgb(var(--border))",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900 }}>Diligence checklist</div>
              <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>
                Auto-checks + human review items, tied to document clauses and servicing state.
              </div>
            </div>

            {checklist && (
              <div style={{ display: "flex", gap: 8, fontSize: 12 }}>
                <CountPill label="PASS" value={checklist.counts.PASS} kind="PASS" />
                <CountPill label="REVIEW" value={checklist.counts.REVIEW} kind="REVIEW" />
                <CountPill label="FAIL" value={checklist.counts.FAIL} kind="FAIL" />
              </div>
            )}
          </div>

          <div style={{ padding: 12 }}>
            {checklistQ.isLoading ? (
              <div style={{ color: "rgb(var(--muted))" }}>Loading checklist…</div>
            ) : checklistQ.isError ? (
              <div style={{ color: "rgb(var(--danger))" }}>Failed to load checklist.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {checklist?.items.map((c: any) => {
                  const chip = statusChip(c.status);
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (!loanId) return;
                        navigate(checklistToRoute(loanId, c.title, c.sourceRef));
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid rgb(var(--border))",
                        background: "rgb(var(--bg))",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>{c.title}</div>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: chip.bg,
                            color: chip.fg,
                            fontSize: 12,
                            fontWeight: 900,
                          }}
                        >
                          {chip.label}
                        </span>
                      </div>

                      <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 6 }}>
                        {c.auto ? "Automated check" : "Human review required"}
                        {c.sourceRef ? ` • Source: ${c.sourceRef}` : ""}
                        {c.id === "chk-005" && evidenceCoverage !== null
                          ? ` • Coverage: ${evidenceCoverage}%`
                          : ""}
                        {" • "}
                        <span style={{ color: "rgb(var(--primary))", fontWeight: 900 }}>
                          Open module →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Readiness explanation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--card))",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Why this score?</div>
            <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>
              Base score comes from the portfolio posture. We then apply deterministic penalties
              based on covenant risk under the selected scenario.
            </div>

            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 12,
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--bg))",
              }}
            >
              <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>Model</div>
              <div style={{ fontWeight: 900, marginTop: 6 }}>
                Score = {baseScore} − ({scoreModel.breach}×18 + {scoreModel.watch}×6)
              </div>
              <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 6 }}>
                Penalty = {scoreModel.penalty} → Score = {scoreModel.score}
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--card))",
            }}
          >
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Recommended actions</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "rgb(var(--muted))" }}>
              <li>Review covenant headroom in Servicing and remediate breaches.</li>
              <li>Verify reporting obligations and evidence packs before settlement.</li>
              <li>Export diligence snapshot for buyer review.</li>
            </ul>

            <button
              onClick={() => {
                if (!loanId) return;
                navigate(loanPaths.tradingReport(loanId));
              }}
              style={{
                width: "100%",
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgb(var(--primary))",
                color: "white",
                border: "none",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Export diligence snapshot (print/PDF)
            </button>
          </div>

          {featureFlags.GUIDED_DEMO && (
            <GuidedDemoCTA
              step={3}
              totalSteps={4}
              title="Guided Demo • Next step"
              body="Now review ESG KPIs and evidence verification — this feeds diligence and supports greener lending."
              to={`${loanPaths.esg(loanId ?? "demo-loan-001")}#evidence`}
              buttonLabel="Go to ESG"
            />
          )}
        </div>
      </div>

    </div>
  );
}

function Card({ title, value }: { title: string; value: ReactNode }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--card))",
      }}
    >
      <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>{title}</div>
      <div style={{ fontSize: 16, fontWeight: 900, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function ScorePill({ score, tier }: { score: number; tier: string }) {
  const bg =
    score >= 85
      ? "rgba(16,185,129,0.12)"
      : score >= 70
        ? "rgba(245,158,11,0.12)"
        : "rgba(220,38,38,0.12)";

  const fg = score >= 85 ? "rgb(16,185,129)" : score >= 70 ? "rgb(245,158,11)" : "rgb(220,38,38)";

  return (
    <div>
      <div style={{ fontWeight: 900 }}>{score} / 100</div>
      <div style={{ marginTop: 6 }}>
        <span
          style={{
            padding: "4px 8px",
            borderRadius: 999,
            background: bg,
            color: fg,
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          {tier}
        </span>
      </div>
    </div>
  );
}

function CountPill({
  label,
  value,
  kind,
}: {
  label: string;
  value: number;
  kind: "PASS" | "REVIEW" | "FAIL";
}) {
  const s = statusChip(kind);
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        fontWeight: 900,
      }}
    >
      {label}: {value}
    </span>
  );
}

function LinkChip({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={{
        textDecoration: "none",
        color: "rgb(var(--primary))",
        fontWeight: 900,
        fontSize: 12,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--bg))",
      }}
    >
      {label} →
    </NavLink>
  );
}
