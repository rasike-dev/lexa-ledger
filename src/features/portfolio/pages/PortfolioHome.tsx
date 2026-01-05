import React from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";
import { INGEST, loanPaths } from "../../../app/routes/paths";
import { usePortfolioKpis } from "../hooks/usePortfolioKpis";
import { usePortfolio } from "../hooks/usePortfolio";

function formatCompact(n: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(
    n
  );
}

export function PortfolioHome() {
  const navigate = useNavigate();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);

  const kpiQ = usePortfolioKpis();
  const portfolioQ = usePortfolio();

  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>Portfolio</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
        Portfolio overview with KPIs and active loans (demo data).
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 12, marginBottom: 12 }}>
        <button
          onClick={() => navigate(INGEST)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          Origination (Ingest)
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
        <KpiCard
          title="Active loans"
          value={kpiQ.kpis ? String(kpiQ.kpis.totalLoans) : "—"}
          loading={kpiQ.isLoading}
        />
        <KpiCard
          title="Portfolio exposure"
          value={kpiQ.kpis ? formatCompact(kpiQ.kpis.totalExposureBase) : "—"}
          loading={kpiQ.isLoading}
        />
        <KpiCard
          title="Loans at risk"
          value={kpiQ.kpis ? String(kpiQ.kpis.loansAtRisk) : "—"}
          loading={kpiQ.isLoading}
        />
        <KpiCard
          title="Trade-ready (≥85)"
          value={kpiQ.kpis ? String(kpiQ.kpis.tradeReadyCount) : "—"}
          loading={kpiQ.isLoading}
        />
        <KpiCard
          title="Obligations due (14d)"
          value={kpiQ.kpis ? String(kpiQ.kpis.obligationsDueSoon) : "—"}
          loading={kpiQ.isLoading}
        />
        <KpiCard
          title="ESG clauses tracked"
          value={kpiQ.kpis ? String(kpiQ.kpis.esgClausesTotal) : "—"}
          loading={kpiQ.isLoading}
        />
      </div>

      {/* Loan list */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Loans</div>

        {portfolioQ.isLoading ? (
          <div style={{ color: "rgb(var(--muted))" }}>Loading loans…</div>
        ) : portfolioQ.isError ? (
          <div style={{ color: "rgb(var(--danger))" }}>Failed to load loans</div>
        ) : (
          <div
            style={{ border: "1px solid rgb(var(--border))", borderRadius: 12, overflow: "hidden" }}
          >
            <table
              style={{ width: "100%", borderCollapse: "collapse", background: "rgb(var(--bg))" }}
            >
              <thead style={{ background: "rgb(var(--card))" }}>
                <tr>
                  <Th>Loan</Th>
                  <Th>Borrower</Th>
                  <Th>Facility</Th>
                  <Th>Risk</Th>
                  <Th>Trade-ready</Th>
                  <Th>Next due</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {portfolioQ.data.loans.map((l) => (
                  <tr key={l.id} style={{ borderTop: "1px solid rgb(var(--border))" }}>
                    <Td mono>{l.id}</Td>
                    <Td>{l.borrower}</Td>
                    <Td>
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: l.currency,
                        maximumFractionDigits: 0,
                      }).format(l.facilityAmount)}
                    </Td>
                    <Td>
                      <RiskBadge flag={l.riskFlag} />
                    </Td>
                    <Td>{l.tradeReadyScore}</Td>
                    <Td>{new Date(l.nextObligationDue).toLocaleDateString()}</Td>
                    <Td>
                      <button
                        onClick={() => {
                          setActiveLoanId(l.id);
                          navigate(loanPaths.overview(l.id));
                        }}
                        style={{
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid rgb(var(--border))",
                          background: "rgb(var(--card))",
                        }}
                      >
                        Open
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ title, value, loading }: { title: string; value: string; loading?: boolean }) {
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
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6 }}>{loading ? "…" : value}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{ textAlign: "left", fontSize: 12, color: "rgb(var(--muted))", padding: "10px 12px" }}
    >
      {children}
    </th>
  );
}
function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td
      style={{
        padding: "10px 12px",
        fontSize: 13,
        fontFamily: mono
          ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
          : undefined,
      }}
    >
      {children}
    </td>
  );
}

function RiskBadge({ flag }: { flag: "OK" | "WATCH" | "BREACH_RISK" }) {
  const map = {
    OK: { label: "OK", bg: "rgba(16,185,129,0.12)", fg: "rgb(16,185,129)" },
    WATCH: { label: "Watch", bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)" },
    BREACH_RISK: { label: "Breach risk", bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)" },
  } as const;

  const s = map[flag];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: 999,
        background: s.bg,
        color: s.fg,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {s.label}
    </span>
  );
}
