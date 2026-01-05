import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { loanPaths } from "../../../app/routes/paths";
import { useUIStore } from "../../../app/store/uiStore";
import { useClauses } from "../../documents/hooks/useClauses";

function badgeColors(tag: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    PRICING: { bg: "rgba(37,99,235,0.12)", fg: "rgb(37,99,235)" },
    COVENANT: { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)" },
    REPORTING: { bg: "rgba(148,163,184,0.18)", fg: "rgb(100,116,139)" },
    ESG: { bg: "rgba(16,185,129,0.12)", fg: "rgb(16,185,129)" },
    EOD: { bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)" },
  };
  return map[tag] ?? { bg: "rgba(148,163,184,0.18)", fg: "rgb(100,116,139)" };
}

function severityStyle(sev: string) {
  if (sev === "HIGH") return { bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)" };
  if (sev === "MEDIUM") return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)" };
  return { bg: "rgba(16,185,129,0.12)", fg: "rgb(16,185,129)" };
}

function impactToPath(impact: string, loanId: string) {
  const lower = impact.toLowerCase();

  if (lower.includes("documents")) return loanPaths.documents(loanId);
  if (lower.includes("servicing")) return loanPaths.servicing(loanId);
  if (lower.includes("trading")) return loanPaths.trading(loanId);
  if (lower.includes("esg")) return loanPaths.esg(loanId);

  // default to overview
  return loanPaths.overview(loanId);
}

export function LoanDocuments() {
  const navigate = useNavigate();
  const { loanId } = useParams();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);

  React.useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  const q = useClauses(loanId ?? null);
  const [selectedClauseId, setSelectedClauseId] = React.useState<string | null>(null);

  const selectedClause =
    q.data?.clauses.find((c) => c.id === selectedClauseId) ?? q.data?.clauses[0];
  React.useEffect(() => {
    if (!selectedClauseId && q.data?.clauses?.length) setSelectedClauseId(q.data.clauses[0].id);
  }, [q.data, selectedClauseId]);

  if (!loanId) {
    return (
      <div>
        <h1 style={{ margin: "0 0 8px 0" }}>Documents • Clause Explorer</h1>
        <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
          Structured clause view with amendment summary and downstream impact.
        </p>
        <div style={{ color: "rgb(var(--danger))", marginTop: 12 }}>
          No loan ID provided. Please select a loan first.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>Documents • Clause Explorer</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
        Structured clause view with amendment summary and downstream impact.
      </p>

      {q.isLoading ? (
        <div style={{ color: "rgb(var(--muted))" }}>Loading clauses…</div>
      ) : q.isError ? (
        <div style={{ color: "rgb(var(--danger))" }}>
          Failed to load clauses. {q.error instanceof Error ? q.error.message : "Unknown error"}
        </div>
      ) : !q.data ? (
        <div style={{ color: "rgb(var(--muted))" }}>No data available.</div>
      ) : (
        <>
          {/* Versions + Amendment Summary */}
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}
          >
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Document versions</div>
              {q.data.versions.map((v) => (
                <div
                  key={v.versionId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    padding: "6px 0",
                  }}
                >
                  <span>{v.label}</span>
                  <span style={{ color: "rgb(var(--muted))" }}>
                    {new Date(v.asOf).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Amendment impact preview</div>
              {q.data.amendmentSummary.map((a, idx) => {
                const s = severityStyle(a.severity);
                return (
                  <div
                    key={idx}
                    style={{
                      borderTop: idx ? "1px solid rgb(var(--border))" : "none",
                      paddingTop: idx ? 10 : 0,
                      marginTop: idx ? 10 : 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: s.bg,
                          color: s.fg,
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {a.severity}
                      </span>
                      <span style={{ fontWeight: 700 }}>{a.field}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 6 }}>
                      From <b>{a.from}</b> to <b>{a.to}</b>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 8 }}>
                      <div style={{ color: "rgb(var(--muted))", marginBottom: 6 }}>
                        Downstream impacts
                      </div>

                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {a.impacts.map((impact) => (
                          <button
                            key={impact}
                            onClick={() => {
                              if (!loanId) return;
                              navigate(impactToPath(impact, loanId));
                            }}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "1px solid rgb(var(--border))",
                              background: "rgb(var(--bg))",
                              cursor: "pointer",
                              fontSize: 12,
                              color: "rgb(var(--primary))",
                              fontWeight: 800,
                            }}
                          >
                            {impact}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Clause list + details */}
          <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 12 }}>
            <div
              style={{
                border: "1px solid rgb(var(--border))",
                borderRadius: 12,
                overflow: "hidden",
                background: "rgb(var(--bg))",
              }}
            >
              <div
                style={{
                  padding: 12,
                  background: "rgb(var(--card))",
                  borderBottom: "1px solid rgb(var(--border))",
                  fontWeight: 800,
                }}
              >
                Clauses ({q.data?.clauses.length ?? 0})
              </div>

              <div style={{ maxHeight: "60vh", overflow: "auto" }}>
                {q.data?.clauses.map((c) => {
                  const col = badgeColors(c.tag);
                  const active = c.id === selectedClause?.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClauseId(c.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 12,
                        border: "none",
                        borderTop: "1px solid rgb(var(--border))",
                        background: active ? "rgba(37,99,235,0.08)" : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>{c.title}</div>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: col.bg,
                            color: col.fg,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {c.tag}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 6 }}>
                        {c.sourceRef}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgb(var(--border))",
                borderRadius: 12,
                background: "rgb(var(--card))",
              }}
            >
              <div style={{ padding: 12, borderBottom: "1px solid rgb(var(--border))" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  {selectedClause?.title ?? "Clause"}
                </div>
                <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 6 }}>
                  Source: {selectedClause?.sourceRef ?? "-"}
                </div>
              </div>

              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 800, marginBottom: 8 }}>Structured fields</div>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgb(var(--border))",
                    background: "rgb(var(--bg))",
                    overflow: "auto",
                    fontSize: 12,
                  }}
                >
                  {JSON.stringify(selectedClause?.structured ?? {}, null, 2)}
                </pre>

                <div style={{ marginTop: 12, fontSize: 12, color: "rgb(var(--muted))" }}>
                  This structured representation enables automation: covenant monitoring, obligation
                  scheduling, ESG tracking, and trade due diligence.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
