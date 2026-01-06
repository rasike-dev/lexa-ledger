import React from "react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import { loanPaths } from "../../../app/routes/paths";
import { useUIStore } from "../../../app/store/uiStore";
import { useLoanSnapshot } from "../hooks/useLoanSnapshot";
import { CopyLinkButton } from "../../../app/components/CopyLinkButton";
import { buildDeepLink } from "../../../app/utils/deepLink";

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
  const navigate = useNavigate();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);
  const resetDemoState = useUIStore((s) => s.resetDemoState);
  const setDemoMode = useUIStore((s) => s.setDemoMode);

  React.useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  const q = useLoanSnapshot(loanId ?? null);

  return (
    <div>
      <div id="top" style={{ scrollMarginTop: 12 }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, margin: "0 0 8px 0" }}>
        <h1 style={{ margin: 0 }}>Loan Workspace • Overview</h1>

        <CopyLinkButton
          href={buildDeepLink(`${loanPaths.overview(loanId ?? "demo-loan-001")}#top`)}
          label="Copy link to Loan Overview"
        />
      </div>
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

          {/* Guided Demo */}
          <div
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--card))",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Guided Demo (90 seconds)</div>
                <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>
                  A bank-ready walkthrough showing how structured documents drive servicing risk, trading diligence, and ESG transparency.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => {
                    const id = loanId ?? "demo-loan-001";
                    resetDemoState(id);
                    setDemoMode(true);
                    navigate(`${loanPaths.documents(id)}#amendments`);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgb(var(--border))",
                    background: "rgb(var(--primary))",
                    color: "white",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Start guided demo →
                </button>

                <button
                  onClick={() => {
                    const id = loanId ?? "demo-loan-001";
                    resetDemoState(id);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid rgb(var(--border))",
                    background: "rgb(var(--bg))",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  Reset demo state
                </button>

                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgb(var(--border))",
                    background: "rgb(var(--bg))",
                    fontWeight: 900,
                    fontSize: 12,
                    color: "rgb(var(--muted))",
                  }}
                >
                  Demo-safe • deterministic
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 12 }}>
              <DemoStep
                n={1}
                title="Documents → Amendment impact"
                desc="Open the clause explorer and review the amendment impact preview."
                linkTo={`${loanPaths.documents(loanId ?? "demo-loan-001")}#amendments`}
                linkLabel="Open Documents"
                bullets={["See severity-labelled changes", "Click downstream impact chips to navigate"]}
              />

              <DemoStep
                n={2}
                title="Servicing → Stress scenario"
                desc="Toggle to stress scenario to surface covenant breaches and reduced headroom."
                linkTo={`${loanPaths.servicing(loanId ?? "demo-loan-001")}#covenants`}
                linkLabel="Open Servicing"
                bullets={["Covenant statuses flip deterministically", "Sets up the trading diligence story"]}
              />

              <DemoStep
                n={3}
                title="Trading → Readiness + diligence"
                desc="Watch readiness score adjust based on covenant risk and see the checklist respond."
                linkTo={loanPaths.trading(loanId ?? "demo-loan-001")}
                linkLabel="Open Trading"
                bullets={["Score is explainable (transparent model)", "Checklist rows deep-link to fix areas"]}
              />

              <DemoStep
                n={4}
                title="ESG → KPI evidence & verification"
                desc="Review KPI status and evidence registry; see verification coverage feed into diligence."
                linkTo={`${loanPaths.esg(loanId ?? "demo-loan-001")}#evidence`}
                linkLabel="Open ESG"
                bullets={["Verified / unverified evidence mapped to KPIs", "Supports greener lending transparency"]}
              />
            </div>
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

function DemoStep({
  n,
  title,
  desc,
  linkTo,
  linkLabel,
  bullets,
}: {
  n: number;
  title: string;
  desc: string;
  linkTo: string;
  linkLabel: string;
  bullets: string[];
}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--bg))",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: "rgba(37,99,235,0.12)",
            color: "rgb(37,99,235)",
            fontWeight: 900,
          }}
        >
          {n}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900 }}>{title}</div>
          <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>{desc}</div>

          <ul style={{ margin: "10px 0 0 0", paddingLeft: 18, fontSize: 12, color: "rgb(var(--muted))" }}>
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>

          <div style={{ marginTop: 10 }}>
            <NavLink
              to={linkTo}
              style={{
                textDecoration: "none",
                display: "inline-block",
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--card))",
                fontWeight: 900,
                color: "rgb(var(--primary))",
                fontSize: 12,
              }}
            >
              {linkLabel} →
            </NavLink>
          </div>
        </div>
      </div>
    </div>
  );
}
