import React from "react";
import { useParams, NavLink } from "react-router-dom";
import { loanPaths } from "../../../app/routes/paths";
import { useUIStore } from "../../../app/store/uiStore";
import { useLoanSnapshot } from "../hooks/useLoanSnapshot";

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
}

export function LoanOverview() {
  const { loanId } = useParams();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);

  React.useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  const q = useLoanSnapshot(loanId ?? null);

  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>Loan Workspace • Overview</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
        Digital Loan Twin summary and lifecycle entry points.
      </p>

      {q.isLoading ? (
        <div style={{ color: "rgb(var(--muted))" }}>Loading loan snapshot…</div>
      ) : q.isError ? (
        <div style={{ color: "rgb(var(--danger))" }}>Failed to load snapshot.</div>
      ) : (
        <>
          {/* Header summary */}
          <div
            style={{
              padding: 16,
              border: "1px solid rgb(var(--border))",
              borderRadius: 12,
              background: "rgb(var(--card))",
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 18 }}>{q.data.borrower}</div>
            <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 6 }}>
              Loan ID:{" "}
              <span
                style={{
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              >
                {q.data.id}
              </span>
              {" • "}
              Agent: {q.data.agentBank}
              {" • "}
              Status: {q.data.status}
            </div>
          </div>

          {/* Quick KPIs */}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}
          >
            <KpiCard title="Facility" value={formatMoney(q.data.facilityAmount, q.data.currency)} />
            <KpiCard title="Margin" value={`${q.data.marginBps} bps`} />
            <KpiCard title="Last updated" value={new Date(q.data.lastUpdatedAt).toLocaleString()} />

            <KpiCard title="Covenants tracked" value={String(q.data.covenants)} />
            <KpiCard title="ESG clauses tracked" value={String(q.data.esgClauses)} />
            <KpiCard
              title="Lifecycle health"
              value={<LifecycleHealth covenants={q.data.covenants} esg={q.data.esgClauses} />}
            />
          </div>

          {/* Lifecycle next steps */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Lifecycle modules</div>

            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}
            >
              <ModuleCard
                title="Documents"
                description="Explore clauses, compare amendments, and review change impact."
                to={loanPaths.documents(q.data.id)}
              />
              <ModuleCard
                title="Servicing"
                description="Monitor covenants, obligations, and early warning signals."
                to={loanPaths.servicing(q.data.id)}
              />
              <ModuleCard
                title="Trading"
                description="Generate a trade readiness snapshot and diligence checklist."
                to={loanPaths.trading(q.data.id)}
              />
              <ModuleCard
                title="ESG"
                description="Track ESG obligations, KPIs, and verification evidence."
                to={loanPaths.esg(q.data.id)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: React.ReactNode }) {
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
      <div style={{ fontSize: 16, fontWeight: 800, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function ModuleCard({
  title,
  description,
  to,
}: {
  title: string;
  description: string;
  to: string;
}) {
  return (
    <NavLink
      to={to}
      style={{
        textDecoration: "none",
        color: "inherit",
        border: "1px solid rgb(var(--border))",
        borderRadius: 12,
        background: "rgb(var(--bg))",
        padding: 14,
        display: "block",
      }}
    >
      <div style={{ fontWeight: 900 }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 6 }}>{description}</div>
      <div style={{ fontSize: 12, marginTop: 10, color: "rgb(var(--primary))", fontWeight: 800 }}>
        Open →
      </div>
    </NavLink>
  );
}

function LifecycleHealth({ covenants, esg }: { covenants: number; esg: number }) {
  // Demo-friendly heuristic (will later be derived from real covenant states + ESG verification)
  if (covenants >= 6 || esg >= 5) return <span>Active monitoring</span>;
  if (covenants >= 4 || esg >= 3) return <span>Healthy</span>;
  return <span>Light monitoring</span>;
}
