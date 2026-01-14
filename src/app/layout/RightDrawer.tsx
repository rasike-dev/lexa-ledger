import React from "react";
import { Link } from "react-router-dom";
import { useUIStore } from "../store/uiStore";
import { useTranslation } from "react-i18next";
import { useLoanSnapshot } from "../../features/loans/hooks/useLoanSnapshot";
import { useAuditTimeline } from "../../features/loans/hooks/useAuditTimeline";
import { loanPaths } from "../routes/paths";

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

export function RightDrawer() {
  const { t } = useTranslation("common");
  const activeLoanId = useUIStore((s) => s.activeLoanId);
  const open = useUIStore((s) => s.rightDrawerOpen);
  const setOpen = useUIStore((s) => s.setRightDrawerOpen);

  const loanQ = useLoanSnapshot(activeLoanId);
  const auditQ = useAuditTimeline(activeLoanId);

  if (!open) {
    return <div style={{ padding: 16, color: "rgb(var(--muted))" }}>{t("drawer.noSelection")}</div>;
  }

  return (
    <div className="right-drawer no-print" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: 16,
          borderBottom: "1px solid rgb(var(--border))",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 700 }}>{t("drawer.loanSnapshot")}</div>
          <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>{activeLoanId ?? "-"}</div>
        </div>
        <button
          onClick={() => setOpen(false)}
          style={{
            border: "1px solid rgb(var(--border))",
            borderRadius: 10,
            padding: "6px 10px",
            background: "rgb(var(--card))",
          }}
        >
          {t("close")}
        </button>
      </div>

      {/* Snapshot */}
      <div style={{ padding: 16 }}>
        {loanQ.isLoading ? (
          <div style={{ color: "rgb(var(--muted))" }}>Loading snapshot…</div>
        ) : loanQ.isError ? (
          <div style={{ color: "rgb(var(--danger))" }}>Failed to load snapshot</div>
        ) : (
          <>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{loanQ.data.borrower}</div>
            <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginBottom: 12 }}>
              Agent: {loanQ.data.agentBank} • Status: {loanQ.data.status}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--bg))",
                }}
              >
                <div style={{ fontSize: 11, color: "rgb(var(--muted))" }}>Facility</div>
                <div style={{ fontWeight: 700 }}>
                  {formatMoney(loanQ.data.facilityAmount, loanQ.data.currency)}
                </div>
              </div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--bg))",
                }}
              >
                <div style={{ fontSize: 11, color: "rgb(var(--muted))" }}>Margin</div>
                <div style={{ fontWeight: 700 }}>{loanQ.data.marginBps} bps</div>
              </div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--bg))",
                }}
              >
                <div style={{ fontSize: 11, color: "rgb(var(--muted))" }}>Covenants</div>
                <div style={{ fontWeight: 700 }}>{loanQ.data.covenants}</div>
              </div>

              <div
                style={{
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--bg))",
                }}
              >
                <div style={{ fontSize: 11, color: "rgb(var(--muted))" }}>ESG Clauses</div>
                <div style={{ fontWeight: 700 }}>{loanQ.data.esgClauses}</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 10 }}>
              Updated: {new Date(loanQ.data.lastUpdatedAt).toLocaleString()}
            </div>
          </>
        )}
      </div>

      {/* Obligations */}
      {activeLoanId && (
        <div style={{ padding: "0 16px 16px 16px" }}>
          <div
            style={{
              borderRadius: "12px",
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--card))",
              padding: 12,
            }}
          >
            <div style={{ fontSize: "13px", fontWeight: 600, color: "rgb(var(--foreground))" }}>
              Obligations
            </div>
            <div style={{ marginTop: 4, fontSize: "12px", color: "rgb(var(--muted-foreground))" }}>
              Derived obligations are available in Servicing.
            </div>
            <div style={{ marginTop: 8 }}>
              <Link
                to={loanPaths.servicing(activeLoanId)}
                style={{
                  display: "inline-flex",
                  borderRadius: "8px",
                  border: "1px solid rgb(var(--border))",
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "rgb(var(--foreground))",
                  background: "rgb(var(--background))",
                  textDecoration: "none",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgb(var(--muted))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgb(var(--background))";
                }}
              >
                Open Servicing
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Audit Timeline */}
      <div style={{ padding: "0 16px 16px 16px" }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>{t("drawer.auditTimeline")}</div>

        {auditQ.isLoading ? (
          <div style={{ color: "rgb(var(--muted))" }}>Loading timeline…</div>
        ) : auditQ.isError ? (
          <div style={{ color: "rgb(var(--danger))" }}>Failed to load timeline</div>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {auditQ.data.slice(0, 6).map((evt) => (
              <li key={evt.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{evt.summary}</div>
                <div style={{ fontSize: 11, color: "rgb(var(--muted))" }}>
                  {new Date(evt.timestamp).toLocaleString()} • {evt.actor}
                  {evt.evidenceRef ? ` • ${evt.evidenceRef}` : ""}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Actions */}
      <div style={{ marginTop: "auto", padding: 16, borderTop: "1px solid rgb(var(--border))" }}>
        <button
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgb(var(--primary))",
            color: "white",
            border: "none",
          }}
        >
          {t("drawer.actions.exportSummary")}
        </button>
      </div>
    </div>
  );
}
