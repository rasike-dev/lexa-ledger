import React from "react";
import { useParams } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";
import { useAuthStore } from "../../../app/store/authStore";
import { Roles, hasAnyRole } from "../../../auth/roles";
import { useServicing } from "../../servicing/hooks/useServicing";
import { useSetServicingScenario } from "../../servicing/hooks/useSetServicingScenario";
import { useRecomputeServicing } from "../../servicing/hooks/useRecomputeServicing";
import { useScrollToHash } from "../../../app/hooks/useScrollToHash";
import { CopyLinkButton } from "../../../app/components/CopyLinkButton";
import { buildDeepLink } from "../../../app/utils/deepLink";
import { loanPaths } from "../../../app/routes/paths";
import { GuidedDemoCTA } from "../../../app/components/GuidedDemoCTA";
import { featureFlags } from "../../../app/config/featureFlags";
import PageHeader from "../../../components/layout/PageHeader";
import { DemoDisclaimer, EmptyState } from "../../../components/common";
import { ObligationsCard } from "../../../components/obligations/ObligationsCard";

function statusStyle(status: "PASS" | "WARN" | "FAIL") {
  if (status === "PASS") return { bg: "rgba(16,185,129,0.12)", fg: "rgb(16,185,129)", label: "PASS" };
  if (status === "WARN")
    return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", label: "WARN" };
  return { bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)", label: "FAIL" };
}

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

export function LoanServicing() {
  const { loanId } = useParams();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);
  const demoMode = useUIStore((s) => s.demoMode);
  const { roles } = useAuthStore();

  const canManageServicing = hasAnyRole(roles, [
    Roles.SERVICING_MANAGER,
    Roles.TENANT_ADMIN,
  ]);

  const servicing = useServicing(loanId ?? null);
  const setScenario = useSetServicingScenario(loanId ?? null);
  const recompute = useRecomputeServicing(loanId ?? null);

  const currentScenario = servicing.data?.scenario ?? "BASE";
  const lastTestedAt = servicing.data?.lastTestedAt;

  React.useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  useScrollToHash([servicing.data]);

  return (
    <div>
      <PageHeader
        title="Servicing"
        subtitle="Monitor covenant health and obligations. Use simulation to preview risk under stress."
      />
      
      <div style={{ marginTop: 16 }}>
        <DemoDisclaimer />
      </div>

      {/* Scenario Info & Controls */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          padding: 12,
          marginBottom: 16,
          borderRadius: 12,
          border: "1px solid rgb(var(--border))",
          background: "rgb(var(--card))",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgb(var(--muted))" }}>Scenario:</span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              background: currentScenario === "BASE" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
              color: currentScenario === "BASE" ? "rgb(16,185,129)" : "rgb(245,158,11)",
            }}
          >
            {currentScenario}
          </span>
        </div>

        <div style={{ fontSize: 14, color: "rgb(var(--muted))" }}>
          <span style={{ fontWeight: 600 }}>Last tested:</span>{" "}
          {lastTestedAt ? new Date(lastTestedAt).toLocaleString() : "—"}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => recompute.mutate(undefined)}
            disabled={!canManageServicing || recompute.isPending || demoMode}
            title={
              !canManageServicing
                ? "Requires Servicing Manager or Tenant Admin role"
                : undefined
            }
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgb(var(--border))",
              background: !canManageServicing ? "rgb(var(--muted))" : "rgb(var(--background))",
              fontWeight: 600,
              fontSize: 13,
              cursor: !canManageServicing || recompute.isPending || demoMode ? "not-allowed" : "pointer",
              opacity: !canManageServicing || recompute.isPending ? 0.6 : 1,
            }}
          >
            {recompute.isPending ? "Recomputing..." : "⟳ Recompute Now"}
          </button>

          <button
            onClick={() => setScenario.mutate(currentScenario === "BASE" ? "STRESS" : "BASE")}
            disabled={!canManageServicing || setScenario.isPending || demoMode}
            title={
              !canManageServicing
                ? "Requires Servicing Manager or Tenant Admin role"
                : undefined
            }
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgb(var(--border))",
              background: !canManageServicing ? "rgb(var(--muted))" : "rgb(var(--card))",
              fontWeight: 700,
              fontSize: 13,
              cursor: !canManageServicing || setScenario.isPending || demoMode ? "not-allowed" : "pointer",
              opacity: !canManageServicing || setScenario.isPending ? 0.6 : 1,
            }}
          >
            Toggle to {currentScenario === "BASE" ? "STRESS" : "BASE"}
          </button>
        </div>
      </div>

      {servicing.isLoading ? (
        <div style={{ color: "rgb(var(--muted))" }}>Loading servicing data…</div>
      ) : servicing.isError ? (
        <div style={{ color: "rgb(var(--danger))" }}>Failed to load servicing data.</div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          {/* Covenant cards */}
          <div>
            <div
              id="covenants"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontWeight: 900,
                marginBottom: 8,
                scrollMarginTop: 12,
              }}
            >
              <span>Covenants</span>
              <CopyLinkButton
                href={buildDeepLink(`${loanPaths.servicing(loanId ?? "demo-loan-001")}#covenants`)}
                label="Copy link to Covenants"
              />
            </div>

            {servicing.data.covenants.length === 0 ? (
              <EmptyState
                title="No covenants found"
                body="Covenants will appear here once document clauses are processed and covenant monitoring is configured."
              />
            ) : (
              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}
              >
                {servicing.data.covenants.map((c) => {
                const s = statusStyle(c.status);
                const headroom = c.value - c.threshold;

                return (
                  <div
                    key={c.covenantId}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgb(var(--border))",
                      background: "rgb(var(--card))",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "start",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 900 }}>{c.title}</div>
                        <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>
                          Code: {c.code}
                        </div>
                      </div>

                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: s.bg,
                          color: s.fg,
                          fontSize: 12,
                          fontWeight: 900,
                        }}
                      >
                        {s.label}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 10,
                      }}
                    >
                      <KpiMini
                        title="Threshold"
                        value={`${fmt(c.threshold)} ${c.unit ?? ""}`}
                      />
                      <KpiMini title="Actual" value={`${fmt(c.value)} ${c.unit ?? ""}`} />
                      <KpiMini title="Headroom" value={`${fmt(headroom)} ${c.unit ?? ""}`} />
                      <KpiMini
                        title="Interpretation"
                        value={
                          c.status === "PASS"
                            ? "Within limits"
                            : c.status === "WARN"
                              ? "Near threshold"
                              : "Outside limits"
                        }
                      />
                    </div>
                    {c.notes && (
                      <div style={{ marginTop: 10, fontSize: 12, color: "rgb(var(--muted))" }}>
                        {c.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            )}

          </div>

          {/* Obligations */}
          <div>
            <div
              id="obligations"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontWeight: 900,
                marginBottom: 8,
                scrollMarginTop: 12,
              }}
            >
              <span>Obligations due</span>
              <CopyLinkButton
                href={buildDeepLink(`${loanPaths.servicing(loanId ?? "demo-loan-001")}#obligations`)}
                label="Copy link to Obligations"
              />
            </div>

            {loanId && <ObligationsCard loanId={loanId} />}
          </div>
        </div>

          {featureFlags.GUIDED_DEMO && (
            <GuidedDemoCTA
              step={2}
              totalSteps={4}
              title="Guided Demo • Next step"
              body="Next, open Trading to see readiness score and diligence checklist react to covenant risk."
              to={loanPaths.trading(loanId ?? "demo-loan-001")}
              buttonLabel="Go to Trading"
            />
          )}
        </>
      )}
    </div>
  );
}

function KpiMini({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 10,
        borderRadius: 12,
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--bg))",
      }}
    >
      <div style={{ fontSize: 11, color: "rgb(var(--muted))" }}>{title}</div>
      <div style={{ fontWeight: 900, marginTop: 5, fontSize: 13 }}>{value}</div>
    </div>
  );
}
