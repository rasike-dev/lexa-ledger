import React from "react";
import { useParams } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";
import { useServicing, enrichCovenants } from "../../servicing/hooks/useServicing";

function statusStyle(status: "OK" | "WATCH" | "BREACH_RISK") {
  if (status === "OK") return { bg: "rgba(16,185,129,0.12)", fg: "rgb(16,185,129)", label: "OK" };
  if (status === "WATCH")
    return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", label: "Watch" };
  return { bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)", label: "Breach risk" };
}

function fmt(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);
}

export function LoanServicing() {
  const { loanId } = useParams();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);

  const scenario = useUIStore((s) =>
    loanId ? (s.servicingScenarioByLoan[loanId] ?? "base") : "base"
  );
  const toggleScenario = useUIStore((s) => s.toggleServicingScenario);

  React.useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  const q = useServicing(loanId ?? null);

  const computed = React.useMemo(() => {
    if (!q.data) return [];
    return enrichCovenants(q.data, scenario);
  }, [q.data, scenario]);

  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>Servicing • Covenants & Obligations</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
        Monitor covenant health and obligations. Use simulation to preview risk under stress.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>Scenario</div>
        <button
          onClick={() => loanId && toggleScenario(loanId)}
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--card))",
            fontWeight: 800,
          }}
        >
          {scenario === "base" ? "Base actuals" : "Stress scenario"} (toggle)
        </button>
      </div>

      {q.isLoading ? (
        <div style={{ color: "rgb(var(--muted))" }}>Loading servicing data…</div>
      ) : q.isError ? (
        <div style={{ color: "rgb(var(--danger))" }}>Failed to load servicing data.</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          {/* Covenant cards */}
          <div>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Covenants</div>

            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}
            >
              {computed.map((c) => {
                const s = statusStyle(c.status);

                return (
                  <div
                    key={c.id}
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
                        <div style={{ fontWeight: 900 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>
                          Test: {c.testFrequency}
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
                        value={`${c.operator} ${fmt(c.threshold)} ${c.unit}`}
                      />
                      <KpiMini title="Actual" value={`${fmt(c.actual)} ${c.unit}`} />
                      <KpiMini title="Headroom" value={`${fmt(c.headroom)} ${c.unit}`} />
                      <KpiMini
                        title="Interpretation"
                        value={
                          c.status === "OK"
                            ? "Within limits"
                            : c.status === "WATCH"
                              ? "Near threshold"
                              : "Outside limits"
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: "rgb(var(--muted))" }}>
              Demo note: Covenant status changes deterministically when switching scenarios. In
              Phase 3, this will be driven by extracted covenant logic + borrower data feeds.
            </div>
          </div>

          {/* Obligations */}
          <div>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Obligations due</div>

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
                  fontSize: 12,
                  color: "rgb(var(--muted))",
                }}
              >
                Upcoming reporting & deliverables
              </div>

              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {q.data.obligations
                  .slice()
                  .sort((a, b) => +new Date(a.dueDate) - +new Date(b.dueDate))
                  .slice(0, 6)
                  .map((o) => (
                    <div
                      key={o.id}
                      style={{
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid rgb(var(--border))",
                        background: "rgb(var(--bg))",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{o.title}</div>
                      <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>
                        Due: {new Date(o.dueDate).toLocaleDateString()} • Owner: {o.owner} • Status:{" "}
                        {o.status}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--bg))",
                  fontWeight: 900,
                }}
              >
                Generate compliance summary (next)
              </button>
            </div>
          </div>
        </div>
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
