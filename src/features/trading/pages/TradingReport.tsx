import React from "react";
import { useParams, NavLink } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";
import { loanPaths } from "../../../app/routes/paths";

import { useLoanSnapshot } from "../../loans/hooks/useLoanSnapshot";
import { usePortfolio } from "../../portfolio/hooks/usePortfolio";
import { useServicing, enrichCovenants } from "../../servicing/hooks/useServicing";
import { useTradingChecklist } from "../hooks/useTradingChecklist";
import { CopyLinkButton } from "../../../app/components/CopyLinkButton";
import { buildDeepLink } from "../../../app/utils/deepLink";

type CovenantStatus = "OK" | "WATCH" | "BREACH_RISK";
type ChecklistStatus = "PASS" | "REVIEW" | "FAIL";

function covenantPenalty(statuses: CovenantStatus[]) {
  const breach = statuses.filter((s) => s === "BREACH_RISK").length;
  const watch = statuses.filter((s) => s === "WATCH").length;
  const penalty = breach * 18 + watch * 6;
  return { penalty, breach, watch };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function statusChip(status: ChecklistStatus) {
  if (status === "PASS") return { cls: "chip chip--pass", label: "PASS" };
  if (status === "REVIEW") return { cls: "chip chip--review", label: "REVIEW" };
  return { cls: "chip chip--fail", label: "FAIL" };
}

export function TradingReport() {
  const { loanId } = useParams();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);

  React.useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  const scenario = useUIStore((s) =>
    loanId ? (s.servicingScenarioByLoan[loanId] ?? "base") : "base"
  );

  const snapshotQ = useLoanSnapshot(loanId ?? null);
  const portfolioQ = usePortfolio();
  const servicingQ = useServicing(loanId ?? null);
  const checklistQ = useTradingChecklist(loanId ?? null);

  const baseScore = React.useMemo(() => {
    const id = loanId ?? "";
    const row = portfolioQ.data?.loans.find((l) => l.id === id);
    return row?.tradeReadyScore ?? 80;
  }, [portfolioQ.data, loanId]);

  const covenantComputed = React.useMemo(() => {
    if (!servicingQ.data) return [];
    return enrichCovenants(servicingQ.data, scenario);
  }, [servicingQ.data, scenario]);

  const covenantStatuses = React.useMemo(
    () => covenantComputed.map((c) => c.status as CovenantStatus),
    [covenantComputed]
  );

  const scoreModel = React.useMemo(() => {
    const { penalty, breach, watch } = covenantPenalty(covenantStatuses);
    const score = clamp(baseScore - penalty, 0, 100);
    const tier = score >= 85 ? "Trade-ready" : score >= 70 ? "Needs review" : "Not ready";
    return { score, tier, penalty, breach, watch };
  }, [baseScore, covenantStatuses]);

  const checklist = React.useMemo(() => {
    if (!checklistQ.data) return null;
    const items = checklistQ.data.checklist.map((c) => ({
      ...c,
      status: (scenario === "stress" ? c.statusStress : c.statusBase) as ChecklistStatus,
    }));
    const counts = items.reduce(
      (acc, i) => {
        acc[i.status] += 1;
        return acc;
      },
      { PASS: 0, REVIEW: 0, FAIL: 0 } as Record<ChecklistStatus, number>
    );
    return { items, counts };
  }, [checklistQ.data, scenario]);

  const ready =
    !snapshotQ.isLoading &&
    !snapshotQ.isError &&
    !!snapshotQ.data &&
    !checklistQ.isLoading &&
    !checklistQ.isError &&
    !!checklist;

  const generatedAt = new Date().toISOString();

  return (
    <div className="print-root">
      <div id="top" style={{ scrollMarginTop: 12 }} />
      <div className="no-print report-actions">
        <NavLink className="link" to={loanPaths.trading(loanId ?? "demo-loan-001")}>
          ← Back to Trading
        </NavLink>

        <div style={{ display: "flex", gap: 8 }}>
          <CopyLinkButton
            href={buildDeepLink(`${loanPaths.tradingReport(loanId ?? "demo-loan-001")}#top`)}
            label="Copy link to Trading Report"
          />
          <button className="btn" onClick={() => window.print()}>
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="report">
        <header className="report-header">
          <div>
            <div className="report-title">Trade Diligence Snapshot</div>
            <div className="report-subtitle">LEXA Ledger • Secondary Loan Trading</div>
          </div>
          <div className="meta">
            <div>
              <span className="meta-k">Loan ID:</span> <span className="mono">{loanId ?? "-"}</span>
            </div>
            <div>
              <span className="meta-k">Scenario:</span>{" "}
              {scenario === "base" ? "Base actuals" : "Stress scenario"}
            </div>
            <div>
              <span className="meta-k">Generated:</span> {fmtDateTime(generatedAt)}
            </div>
          </div>
        </header>

        {!ready ? (
          <div className="muted">Loading report data…</div>
        ) : (
          <>
            {/* Borrower / facility block */}
            <section className="section grid-2">
              <div className="card">
                <div className="card-h">Borrower & Facility</div>
                <div className="card-b">
                  <div className="big">{snapshotQ.data.borrower}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    Agent: {snapshotQ.data.agentBank} • Status: {snapshotQ.data.status}
                  </div>
                  <div className="kv-grid" style={{ marginTop: 10 }}>
                    <KV
                      k="Facility"
                      v={`${snapshotQ.data.currency} ${Math.round(snapshotQ.data.facilityAmount).toLocaleString()}`}
                    />
                    <KV k="Margin" v={`${snapshotQ.data.marginBps} bps`} />
                    <KV k="Covenants" v={String(snapshotQ.data.covenants)} />
                    <KV k="ESG clauses" v={String(snapshotQ.data.esgClauses)} />
                    <KV k="Last updated" v={fmtDateTime(snapshotQ.data.lastUpdatedAt)} />
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-h">Readiness Summary</div>
                <div className="card-b">
                  <div className="score-row">
                    <div>
                      <div className="score">{scoreModel.score} / 100</div>
                      <div className="pill">{scoreModel.tier}</div>
                    </div>
                    <div className="muted">
                      Base score: <b>{baseScore}</b>
                      <br />
                      Risk adjustment: <b>-{scoreModel.penalty}</b>
                      <br />
                      Covenant flags: <b>{scoreModel.breach}</b> breach-risk,{" "}
                      <b>{scoreModel.watch}</b> watch
                    </div>
                  </div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    Model: Score = {baseScore} − ({scoreModel.breach}×18 + {scoreModel.watch}×6)
                  </div>
                </div>
              </div>
            </section>

            {/* Covenant posture */}
            <section className="section">
              <div className="section-h">Covenant posture (scenario-based)</div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Covenant</th>
                    <th>Threshold</th>
                    <th>Actual</th>
                    <th>Headroom</th>
                    <th>Status</th>
                    <th>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {covenantComputed.map((c) => (
                    <tr key={c.id}>
                      <td>{c.name}</td>
                      <td className="mono">
                        {c.operator} {c.threshold} {c.unit}
                      </td>
                      <td className="mono">
                        {c.actual} {c.unit}
                      </td>
                      <td className="mono">
                        {c.headroom.toFixed(2)} {c.unit}
                      </td>
                      <td>
                        <span
                          className={`chip ${c.status === "OK" ? "chip--pass" : c.status === "WATCH" ? "chip--review" : "chip--fail"}`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td>{c.testFrequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Diligence checklist */}
            <section className="section">
              <div className="section-h">
                Diligence checklist
                <span className="counts">
                  <span className="chip chip--pass">PASS: {checklist.counts.PASS}</span>
                  <span className="chip chip--review">REVIEW: {checklist.counts.REVIEW}</span>
                  <span className="chip chip--fail">FAIL: {checklist.counts.FAIL}</span>
                </span>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Check</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Evidence / Source</th>
                  </tr>
                </thead>
                <tbody>
                  {checklist.items.map((i) => {
                    const chip = statusChip(i.status);
                    return (
                      <tr key={i.id}>
                        <td>{i.title}</td>
                        <td>{i.auto ? "Automated" : "Human review"}</td>
                        <td>
                          <span className={chip.cls}>{chip.label}</span>
                        </td>
                        <td className="mono">{i.sourceRef ?? "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>

            {/* Recommendation */}
            <section className="section grid-2">
              <div className="card">
                <div className="card-h">Recommendation</div>
                <div className="card-b">
                  <div className="big">
                    {scoreModel.score >= 85
                      ? "Proceed to trade documentation."
                      : scoreModel.score >= 70
                        ? "Proceed with targeted reviews."
                        : "Do not proceed until remediation."}
                  </div>
                  <div className="muted" style={{ marginTop: 8 }}>
                    This snapshot is explainable and traceable: each score movement is linked to
                    covenant posture and checklist evidence references.
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-h">Next actions</div>
                <div className="card-b">
                  <ul className="list">
                    <li>Review covenant breaches / headroom in Servicing.</li>
                    <li>Validate reporting deliverables and obtain missing evidence packs.</li>
                    <li>Confirm “No open Events of Default” against latest notices.</li>
                    <li>Attach ESG KPI evidence where applicable.</li>
                  </ul>

                  <div className="muted" style={{ marginTop: 8 }}>
                    Report ID:{" "}
                    <span className="mono">
                      tds-{loanId}-{generatedAt.slice(0, 10)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <footer className="report-footer">
              LEXA Ledger • Audit-ready output • Generated from structured loan data and servicing
              posture
            </footer>
          </>
        )}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="kv">
      <div className="kv-k">{k}</div>
      <div className="kv-v">{v}</div>
    </div>
  );
}
