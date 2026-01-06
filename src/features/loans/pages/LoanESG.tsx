import React from "react";
import { useParams, NavLink } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";
import { loanPaths } from "../../../app/routes/paths";

import { useEsg } from "../../esg/hooks/useEsg";
import { computeEsgScorecard, computeKpiStatus } from "../../esg/services/mockEsgApi";
import { useScrollToHash } from "../../../app/hooks/useScrollToHash";
import { CopyLinkButton } from "../../../app/components/CopyLinkButton";
import { buildDeepLink } from "../../../app/utils/deepLink";
import { GuidedDemoCTA } from "../../../app/components/GuidedDemoCTA";

function pillForOverall(overall: "GREEN" | "AMBER" | "RED") {
  if (overall === "GREEN") return { bg: "rgba(16,185,129,0.12)", fg: "rgb(16,185,129)" };
  if (overall === "AMBER") return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)" };
  return { bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)" };
}

function pillForKpi(status: "ON_TRACK" | "AT_RISK" | "OFF_TRACK") {
  if (status === "ON_TRACK")
    return { bg: "rgba(16,185,129,0.12)", fg: "rgb(16,185,129)", label: "On track" };
  if (status === "AT_RISK")
    return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", label: "At risk" };
  return { bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)", label: "Off track" };
}

export function LoanESG() {
  const { loanId } = useParams();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);

  React.useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  const q = useEsg(loanId ?? null);

  const scorecard = React.useMemo(() => (q.data ? computeEsgScorecard(q.data) : null), [q.data]);

  const verifiedForKpi = React.useMemo(() => {
    if (!q.data) return new Set<string>();
    const set = new Set<string>();
    q.data.evidence
      .filter((e) => e.status === "VERIFIED")
      .forEach((e) => e.appliesToKpiIds.forEach((id) => set.add(id)));
    return set;
  }, [q.data]);

  useScrollToHash([q.data]);

  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>ESG • KPIs & Evidence</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
        Capture, verify, and share ESG performance transparently across parties.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <NavLinkChip
          to={loanPaths.documents(loanId ?? "demo-loan-001")}
          label="View ESG clauses in Documents"
        />
        <NavLinkChip
          to={loanPaths.trading(loanId ?? "demo-loan-001")}
          label="Back to Trading diligence"
        />
      </div>

      {q.isLoading ? (
        <div style={{ color: "rgb(var(--muted))" }}>Loading ESG data…</div>
      ) : q.isError ? (
        <div style={{ color: "rgb(var(--danger))" }}>Failed to load ESG data.</div>
      ) : (
        <>
          {/* Scorecard */}
          {scorecard && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <Card
                title="Overall ESG posture"
                value={
                  <span
                    style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: pillForOverall(scorecard.overall).bg,
                      color: pillForOverall(scorecard.overall).fg,
                      fontWeight: 900,
                    }}
                  >
                    {scorecard.overall}
                  </span>
                }
              />
              <Card
                title="Evidence coverage"
                value={
                  <span style={{ fontWeight: 900 }}>{scorecard.verifiedCoveragePct}% verified</span>
                }
              />
              <Card
                title="KPI status"
                value={
                  <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>
                    <b>{scorecard.kpisOnTrack}</b> on track • <b>{scorecard.kpisAtRisk}</b> at risk
                    • <b>{scorecard.kpisOffTrack}</b> off track
                  </div>
                }
              />
            </div>
          )}

          {/* KPI Table */}
          <div
            style={{
              border: "1px solid rgb(var(--border))",
              borderRadius: 12,
              background: "rgb(var(--card))",
              overflow: "hidden",
            }}
          >
            <div
              id="kpis"
              style={{
                padding: 12,
                borderBottom: "1px solid rgb(var(--border))",
                scrollMarginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>ESG KPI register</div>
                <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>
                  As of: {new Date(q.data.asOf).toLocaleString()}
                </div>
              </div>

              <CopyLinkButton
                href={buildDeepLink(`${loanPaths.esg(loanId ?? "demo-loan-001")}#kpis`)}
                label="Copy link to ESG KPIs"
              />
            </div>

            <table
              style={{ width: "100%", borderCollapse: "collapse", background: "rgb(var(--bg))" }}
            >
              <thead style={{ background: "rgb(var(--card))" }}>
                <tr>
                  <Th>KPI</Th>
                  <Th>Period</Th>
                  <Th>Target</Th>
                  <Th>Actual</Th>
                  <Th>Status</Th>
                  <Th>Evidence</Th>
                  <Th>Clause</Th>
                </tr>
              </thead>
              <tbody>
                {q.data.kpis.map((k, idx) => {
                  const st = computeKpiStatus(k.direction, k.target, k.actual);
                  const pill = pillForKpi(st);
                  const hasVerified = verifiedForKpi.has(k.id);

                  return (
                    <tr
                      key={k.id}
                      style={{ borderTop: idx ? "1px solid rgb(var(--border))" : "none" }}
                    >
                      <Td>
                        <div style={{ fontWeight: 900 }}>{k.name}</div>
                        <div style={{ fontSize: 12, color: "rgb(var(--muted))" }}>
                          Direction:{" "}
                          {k.direction === "LOWER_IS_BETTER"
                            ? "Lower is better"
                            : "Higher is better"}
                        </div>
                      </Td>
                      <Td>{k.period}</Td>
                      <Td className="mono">
                        {k.target} {k.unit}
                      </Td>
                      <Td className="mono">
                        {k.actual} {k.unit}
                      </Td>
                      <Td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 999,
                            background: pill.bg,
                            color: pill.fg,
                            fontWeight: 900,
                            fontSize: 12,
                          }}
                        >
                          {pill.label}
                        </span>
                      </Td>
                      <Td>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 8px",
                            borderRadius: 999,
                            border: "1px solid rgb(var(--border))",
                            background: hasVerified
                              ? "rgba(16,185,129,0.10)"
                              : "rgba(245,158,11,0.10)",
                            color: hasVerified ? "rgb(16,185,129)" : "rgb(245,158,11)",
                            fontWeight: 900,
                            fontSize: 12,
                          }}
                        >
                          {hasVerified ? "Verified" : "Needs verification"}
                        </span>
                      </Td>
                      <Td className="mono">{k.linkedClauseRef ?? "-"}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Evidence Registry */}
          <div
            style={{
              marginTop: 12,
              border: "1px solid rgb(var(--border))",
              borderRadius: 12,
              background: "rgb(var(--card))",
            }}
          >
            <div
              id="evidence"
              style={{
                padding: 12,
                borderBottom: "1px solid rgb(var(--border))",
                scrollMarginTop: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>Evidence registry</div>
                <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>
                  Verified/unverified evidence mapped to KPIs (audit-ready).
                </div>
              </div>

              <CopyLinkButton
                href={buildDeepLink(`${loanPaths.esg(loanId ?? "demo-loan-001")}#evidence`)}
                label="Copy link to ESG Evidence"
              />
            </div>

            <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {q.data.evidence.map((e) => {
                const verified = e.status === "VERIFIED";
                return (
                  <div
                    key={e.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgb(var(--border))",
                      background: "rgb(var(--bg))",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 900 }}>{e.title}</div>
                        <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>
                          Type: {e.type} • Provider: {e.provider}
                        </div>
                      </div>

                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: 999,
                          background: verified ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                          color: verified ? "rgb(16,185,129)" : "rgb(245,158,11)",
                          fontWeight: 900,
                          fontSize: 12,
                          height: "fit-content",
                        }}
                      >
                        {verified ? "VERIFIED" : "UNVERIFIED"}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 8 }}>
                      Applies to: <span className="mono">{e.appliesToKpiIds.join(", ")}</span>
                    </div>

                    <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 6 }}>
                      Source: <span className="mono">{e.sourceRef ?? "-"}</span>
                    </div>

                    {verified && (
                      <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 6 }}>
                        Verified by: <b>{e.verifiedBy || "—"}</b>
                        {" • "}
                        At: <b>{e.verifiedAt ? new Date(e.verifiedAt).toLocaleString() : "—"}</b>
                      </div>
                    )}

                    {!verified && (
                      <div style={{ marginTop: 10 }}>
                        <button
                          disabled
                          title="Demo: verification workflow in Phase 3"
                          style={{
                            padding: "8px 10px",
                            borderRadius: 10,
                            border: "1px solid rgb(var(--border))",
                            background: "rgb(var(--card))",
                            fontWeight: 900,
                            opacity: 0.6,
                            cursor: "not-allowed",
                          }}
                        >
                          Request verification (next)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "rgb(var(--muted))" }}>
            Demo note: In production, evidence verification would integrate with third-party
            assurance providers and cryptographic attestations (DLT optional), producing audit
            trails consumable across counterparties.
          </div>

          <GuidedDemoCTA
            title="Guided Demo • Finish"
            body="Return to Overview to reset and replay the workflow, or explore modules freely."
            to={`${loanPaths.overview(loanId ?? "demo-loan-001")}#top`}
            buttonLabel="Back to Overview"
            subtle
          />
        </>
      )}
    </div>
  );
}

function NavLinkChip({ to, label }: { to: string; label: string }) {
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

function Card({ title, value }: { title: string; value: React.ReactNode }) {
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{ textAlign: "left", fontSize: 12, color: "rgb(var(--muted))", padding: "10px 12px" }}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td style={{ padding: "10px 12px", fontSize: 13 }} className={className}>
      {children}
    </td>
  );
}
