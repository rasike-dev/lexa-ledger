import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";
import { INGEST, loanPaths } from "../../../app/routes/paths";
import { usePortfolioLoans } from "../hooks/usePortfolioLoans";
import { usePortfolioSummary } from "../hooks/usePortfolioSummary";

type Band = "ALL" | "GREEN" | "AMBER" | "RED";
type SortKey = "UPDATED" | "AMOUNT" | "TRADING" | "FAILS" | "ESG_PENDING";

function formatCompact(n: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function PortfolioHome() {
  const navigate = useNavigate();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);
  const demoMode = useUIStore((s) => s.demoMode);
  const setDemoMode = useUIStore((s) => s.setDemoMode);

  const summaryQ = usePortfolioSummary();
  const loansQ = usePortfolioLoans();

  const [q, setQ] = useState("");
  const [band, setBand] = useState<Band>("ALL");
  const [failsOnly, setFailsOnly] = useState(false);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [offTrackOnly, setOffTrackOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("UPDATED");

  const loans = loansQ.data?.loans ?? [];
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();

    let list = loans;

    // search
    if (term) {
      list = list.filter((l: any) =>
        l.borrower.toLowerCase().includes(term) ||
        l.id.toLowerCase().includes(term) ||
        (l.status ?? "").toLowerCase().includes(term)
      );
    }

    // filters
    if (band !== "ALL") {
      list = list.filter((l: any) => l.trading.band === band);
    }
    if (failsOnly) {
      list = list.filter((l: any) => (l.servicing.failingCount ?? 0) > 0);
    }
    if (pendingOnly) {
      list = list.filter((l: any) => (l.esg.evidencePendingCount ?? 0) > 0);
    }
    if (offTrackOnly) {
      list = list.filter((l: any) => (l.esg.offTrackCount ?? 0) > 0);
    }

    // sorting
    const sorted = [...list].sort((a: any, b: any) => {
      switch (sortKey) {
        case "AMOUNT":
          return (b.facilityAmount ?? 0) - (a.facilityAmount ?? 0);
        case "TRADING":
          return (b.trading.score ?? 0) - (a.trading.score ?? 0);
        case "FAILS":
          return (b.servicing.failingCount ?? 0) - (a.servicing.failingCount ?? 0);
        case "ESG_PENDING":
          return (b.esg.evidencePendingCount ?? 0) - (a.esg.evidencePendingCount ?? 0);
        case "UPDATED":
        default:
          return new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime();
      }
    });

    return sorted;
  }, [loans, q, band, failsOnly, pendingOnly, offTrackOnly, sortKey]);

  function openLoan(loanId: string) {
    setActiveLoanId(loanId);
    navigate(loanPaths.overview(loanId));
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>Portfolio</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
        Portfolio overview with real-time metrics across all loans.
      </p>

      <div style={{ display: "flex", gap: 12, marginTop: 12, marginBottom: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => navigate(INGEST)}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--card))",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + New Loan (Origination)
        </button>

        <button
          onClick={() => setDemoMode(!demoMode)}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: demoMode ? "2px solid rgb(245,158,11)" : "2px solid rgb(var(--primary))",
            background: demoMode ? "rgba(245,158,11,0.1)" : "rgba(var(--primary-rgb), 0.1)",
            color: demoMode ? "rgb(245,158,11)" : "rgb(var(--primary))",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
            transition: "all 0.2s",
          }}
        >
          <span>{demoMode ? "Demo Mode ON" : "Demo Mode OFF"}</span>
          <span
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 900,
              background: demoMode ? "rgb(245,158,11)" : "rgb(var(--primary))",
              color: "white",
            }}
          >
            {demoMode ? "Fixtures" : "Live API"}
          </span>
        </button>

        {demoMode && (
          <div
            style={{
              fontSize: 13,
              color: "rgb(var(--muted))",
              fontStyle: "italic",
            }}
          >
            Using hardcoded demo data
          </div>
        )}
      </div>

      {/* Summary Tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
        <SummaryTile
          title="Active Loans"
          value={summaryQ.data ? String(summaryQ.data.totals.loans) : "—"}
          loading={summaryQ.isLoading}
        />
        <SummaryTile
          title="Portfolio Exposure"
          value={summaryQ.data ? formatCompact(summaryQ.data.totals.facilityAmount) : "—"}
          loading={summaryQ.isLoading}
        />
        <SummaryTile
          title="Trading Bands"
          value={
            summaryQ.data
              ? `🟢 ${summaryQ.data.tradingBands.green} · 🟡 ${summaryQ.data.tradingBands.amber} · 🔴 ${summaryQ.data.tradingBands.red}`
              : "—"
          }
          loading={summaryQ.isLoading}
        />
        <SummaryTile
          title="Servicing Fails"
          value={
            summaryQ.data
              ? `${summaryQ.data.servicing.loansWithFails} loans · ${summaryQ.data.servicing.totalFails} total`
              : "—"
          }
          loading={summaryQ.isLoading}
        />
        <SummaryTile
          title="ESG Off Track"
          value={summaryQ.data ? `${summaryQ.data.esg.offTrackKpis} KPIs` : "—"}
          loading={summaryQ.isLoading}
        />
        <SummaryTile
          title="Evidence Pending"
          value={summaryQ.data ? `${summaryQ.data.esg.evidencePending} items` : "—"}
          loading={summaryQ.isLoading}
        />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by borrower, loan ID, or status…"
          style={{
            width: "min(520px, 100%)",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--background))",
            color: "rgb(var(--foreground))",
            fontSize: 14,
          }}
        />
      </div>

      {/* Filters & Sort Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 12,
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid rgb(var(--border))",
          background: "rgb(var(--card))",
          fontSize: 13,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "rgb(var(--muted))" }}>Trading band</span>
          <select
            value={band}
            onChange={(e) => setBand(e.target.value as Band)}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--background))",
              color: "rgb(var(--foreground))",
              fontSize: 13,
            }}
          >
            <option value="ALL">All</option>
            <option value="GREEN">GREEN</option>
            <option value="AMBER">AMBER</option>
            <option value="RED">RED</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={failsOnly} onChange={(e) => setFailsOnly(e.target.checked)} />
          <span style={{ color: "rgb(var(--muted))" }}>Has servicing fails</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={pendingOnly} onChange={(e) => setPendingOnly(e.target.checked)} />
          <span style={{ color: "rgb(var(--muted))" }}>Pending ESG evidence</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={offTrackOnly} onChange={(e) => setOffTrackOnly(e.target.checked)} />
          <span style={{ color: "rgb(var(--muted))" }}>Off-track KPIs</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "rgb(var(--muted))" }}>Sort</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--background))",
              color: "rgb(var(--foreground))",
              fontSize: 13,
            }}
          >
            <option value="UPDATED">Last updated</option>
            <option value="AMOUNT">Facility amount</option>
            <option value="TRADING">Trading score</option>
            <option value="FAILS">Servicing fails</option>
            <option value="ESG_PENDING">ESG pending evidence</option>
          </select>
        </label>

        <button
          onClick={() => {
            setBand("ALL");
            setFailsOnly(false);
            setPendingOnly(false);
            setOffTrackOnly(false);
            setSortKey("UPDATED");
            setQ("");
          }}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--background))",
            color: "rgb(var(--foreground))",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Reset
        </button>

        <div style={{ marginLeft: "auto", fontSize: 13, color: "rgb(var(--muted))" }}>
          Showing {filtered.length} / {loans.length}
        </div>
      </div>

      {/* Loans List */}
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Loans</div>

      {loansQ.isLoading ? (
          <div style={{ color: "rgb(var(--muted))" }}>Loading loans…</div>
      ) : loansQ.isError ? (
        <div style={{ color: "rgb(var(--danger))" }}>Failed to load portfolio.</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "rgb(var(--muted))" }}>
          {q ? "No loans match your search." : "No loans in portfolio."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.map((l: any) => (
            <div
              key={l.id}
              onClick={() => openLoan(l.id)}
              style={{
                cursor: "pointer",
                border: "1px solid rgb(var(--border))",
                borderRadius: 12,
                padding: 12,
                background: "rgb(var(--card))",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgb(var(--primary))";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgb(var(--border))";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{l.borrower}</div>
                  <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 2 }}>
                    {l.id} · {l.status}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>
                      {new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: l.currency,
                        maximumFractionDigits: 0,
                      }).format(l.facilityAmount)}
                  </div>
                  <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 2 }}>
                    Updated {new Date(l.lastUpdatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div
                        style={{
                  display: "flex",
                  gap: 14,
                  flexWrap: "wrap",
                  marginTop: 10,
                  fontSize: 12,
                  color: "rgb(var(--muted))",
                }}
              >
                <div>
                  📄 Docs: {l.documents.count} (FA v{l.documents.latestFacilityAgreementVersion ?? "—"})
                </div>
                <div>
                  ⚖️ Servicing: {l.servicing.scenario} · {l.servicing.failingCount} fail{l.servicing.failingCount === 1 ? "" : "s"}
                </div>
                <div>
                  📊 Trading: {l.trading.score}/100 {getTradingBandEmoji(l.trading.band)}
                </div>
                <div>
                  🌱 ESG: {l.esg.kpiCount} KPIs · {l.esg.offTrackCount} off track · {l.esg.evidencePendingCount} pending
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
    </div>
  );
}

function SummaryTile({ title, value, loading }: { title: string; value: string; loading?: boolean }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--card))",
      }}
    >
      <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 16, fontWeight: 800 }}>{loading ? "…" : value}</div>
    </div>
  );
}

function getTradingBandEmoji(band: string) {
  switch (band) {
    case "GREEN":
      return "🟢";
    case "AMBER":
      return "🟡";
    case "RED":
      return "🔴";
    default:
      return "";
  }
}
