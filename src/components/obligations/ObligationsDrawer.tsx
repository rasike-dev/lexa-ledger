import React from "react";
import { Link } from "react-router-dom";
import { useLoanObligations } from "../../features/obligations/hooks/useLoanObligations";
import { loanPaths } from "../../app/routes/paths";
import type { ObligationDto } from "../../features/obligations/types";

function sourceLink(o: ObligationDto): string {
  if (o.sourceType === "CLAUSE") return loanPaths.documents(o.loanId);
  if (o.sourceType === "COVENANT") return loanPaths.servicing(o.loanId);
  if (o.sourceType === "ESG_KPI") return loanPaths.esg(o.loanId);
  return loanPaths.overview(o.loanId);
}

function statusPill(status: string) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "9999px",
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: 500,
  };
  if (status === "OVERDUE")
    return { ...base, background: "rgba(220,38,38,0.12)", color: "rgb(220,38,38)" };
  if (status === "DUE_SOON")
    return { ...base, background: "rgba(245,158,11,0.12)", color: "rgb(245,158,11)" };
  return { ...base, background: "rgba(16,185,129,0.12)", color: "rgb(16,185,129)" };
}

export function ObligationsDrawer({
  open,
  onClose,
  loanId,
}: {
  open: boolean;
  onClose: () => void;
  loanId: string;
}) {
  const { data, isLoading, error, refetch } = useLoanObligations(open ? loanId : undefined);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.3)",
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: "100%",
          maxWidth: "672px",
          background: "rgb(var(--background))",
          boxShadow: "-4px 0 6px -1px rgba(0, 0, 0, 0.1)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            borderBottom: "1px solid rgb(var(--border))",
            padding: 16,
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "rgb(var(--foreground))" }}>Obligations</div>
            <div style={{ marginTop: 4, fontSize: "13px", color: "rgb(var(--muted-foreground))" }}>
              Derived from documents, covenants, and ESG evidence cadence
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => refetch()}
              style={{
                borderRadius: "8px",
                border: "1px solid rgb(var(--border))",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 500,
                color: "rgb(var(--foreground))",
                background: "rgb(var(--background))",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgb(var(--muted))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgb(var(--background))";
              }}
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              style={{
                borderRadius: "8px",
                border: "1px solid rgb(var(--border))",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 500,
                color: "rgb(var(--foreground))",
                background: "rgb(var(--background))",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgb(var(--muted))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgb(var(--background))";
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div style={{ padding: 16, overflow: "auto", flex: 1 }}>
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  height: 16,
                  width: "100%",
                  borderRadius: "4px",
                  background: "rgb(var(--muted))",
                  opacity: 0.3,
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
              <div
                style={{
                  height: 16,
                  width: "83%",
                  borderRadius: "4px",
                  background: "rgb(var(--muted))",
                  opacity: 0.3,
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
              <div
                style={{
                  height: 16,
                  width: "66%",
                  borderRadius: "4px",
                  background: "rgb(var(--muted))",
                  opacity: 0.3,
                  animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
            </div>
          ) : error ? (
            <div
              style={{
                borderRadius: "12px",
                border: "1px solid rgba(220,38,38,0.3)",
                background: "rgba(220,38,38,0.08)",
                padding: 16,
                fontSize: "13px",
                color: "rgb(220,38,38)",
              }}
            >
              Failed to load obligations.{" "}
              <button
                onClick={() => refetch()}
                style={{ textDecoration: "underline", cursor: "pointer", background: "none", border: "none", color: "inherit" }}
              >
                Retry
              </button>
            </div>
          ) : (
            <div style={{ borderRadius: "12px", border: "1px solid rgb(var(--border))", overflow: "hidden", background: "rgb(var(--card))" }}>
              <table style={{ width: "100%", fontSize: "13px", borderCollapse: "collapse" }}>
                <thead style={{ background: "rgb(var(--muted))" }}>
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "rgb(var(--foreground))", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Obligation
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "rgb(var(--foreground))", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Due Date</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "rgb(var(--foreground))", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: 600, color: "rgb(var(--foreground))", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.obligations ?? []).map((o: ObligationDto, index: number) => (
                    <tr 
                      key={o.id} 
                      style={{ 
                        borderTop: index > 0 ? "1px solid rgb(var(--border))" : "none",
                        background: index % 2 === 0 ? "rgb(var(--card))" : "rgb(var(--background))",
                      }}
                    >
                      <td style={{ padding: "16px" }}>
                        <div style={{ fontWeight: 600, color: "rgb(var(--foreground))", fontSize: "14px", marginBottom: 4 }}>{o.title}</div>
                        <div style={{ fontSize: "12px", color: "rgb(var(--muted-foreground))", lineHeight: "1.4" }}>{o.rationale}</div>
                        <div style={{ marginTop: 6, fontSize: "11px", color: "rgb(var(--muted-foreground))" }}>
                          Source: <span style={{ fontWeight: 500 }}>{o.sourceLabel}</span>
                        </div>
                      </td>
                      <td style={{ padding: "16px", color: "rgb(var(--foreground))", whiteSpace: "nowrap" }}>
                        <div style={{ fontWeight: 500 }}>{new Date(o.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                        <div style={{ fontSize: "11px", color: "rgb(var(--muted-foreground))", marginTop: 2 }}>
                          {(() => {
                            const days = Math.ceil((new Date(o.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            if (days < 0) return `${Math.abs(days)} days overdue`;
                            if (days === 0) return "Due today";
                            if (days === 1) return "Due tomorrow";
                            return `In ${days} days`;
                          })()}
                        </div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <div style={statusPill(o.status)}>{o.status.replace("_", " ")}</div>
                      </td>
                      <td style={{ padding: "16px" }}>
                        <Link
                          to={sourceLink(o)}
                          style={{
                            color: "rgb(var(--primary))",
                            textDecoration: "underline",
                            cursor: "pointer",
                            fontWeight: 500,
                            fontSize: "13px",
                          }}
                        >
                          {o.sourceType.replace("_", " ")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {(data?.obligations?.length ?? 0) === 0 ? (
                    <tr>
                      <td style={{ padding: 24, color: "rgb(var(--muted-foreground))", textAlign: "center" }} colSpan={4}>
                        No obligations derived yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
