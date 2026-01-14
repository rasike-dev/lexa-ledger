import React, { useMemo, useState } from "react";
import { useLoanObligations } from "../../features/obligations/hooks/useLoanObligations";
import { EmptyState } from "../common";
import { ObligationsDrawer } from "./ObligationsDrawer";
import type { ObligationDto } from "../../features/obligations/types";

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

function formatDue(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

export function ObligationsCard({ loanId }: { loanId: string }) {
  const { data, isLoading, error, refetch } = useLoanObligations(loanId);
  const [open, setOpen] = useState(false);

  const top = useMemo(() => (data?.obligations ?? []).slice(0, 5), [data]);

  return (
    <>
      <div
        style={{
          borderRadius: "12px",
          border: "1px solid rgb(var(--border))",
          background: "rgb(var(--card))",
          padding: 16,
          boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "rgb(var(--foreground))" }}>
              Obligations due
            </div>
            <div style={{ marginTop: 4, fontSize: "12px", color: "rgb(var(--muted-foreground))" }}>
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
              onClick={() => setOpen(true)}
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
              View all
            </button>
          </div>
        </div>

        {isLoading ? (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
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
              marginTop: 16,
              borderRadius: "12px",
              border: "1px solid rgba(220,38,38,0.3)",
              background: "rgba(220,38,38,0.08)",
              padding: 12,
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
        ) : top.length === 0 ? (
          <div style={{ marginTop: 16 }}>
            <EmptyState
              title="No upcoming obligations derived yet"
              body="Once documents, covenants, and ESG evidence are present, LEXA derives obligations automatically."
              action={
                <button
                  onClick={() => setOpen(true)}
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
                >
                  View all
                </button>
              }
            />
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 0 }}>
            {top.map((o: ObligationDto) => (
              <div key={o.id} style={{ padding: "12px 0", borderTop: "1px solid rgb(var(--border))" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "rgb(var(--foreground))",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {o.title}
                    </div>
                    <div style={{ marginTop: 4, fontSize: "11px", color: "rgb(var(--muted-foreground))" }}>
                      Due {formatDue(o.dueDate)} • {o.sourceType.replace("_", " ")} • {o.sourceLabel}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: "11px",
                        color: "rgb(var(--muted-foreground))",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {o.rationale}
                    </div>
                  </div>
                  <div style={statusPill(o.status)}>{o.status.replace("_", " ")}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ObligationsDrawer open={open} onClose={() => setOpen(false)} loanId={loanId} />
    </>
  );
}
