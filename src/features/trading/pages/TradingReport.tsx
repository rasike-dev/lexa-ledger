import { useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTradingSummary } from "@/features/trading/hooks/useTradingSummary";
import { loanPaths } from "@/app/routes/paths";

function bandLabel(band: string) {
  if (band === "GREEN") return "Trade-ready";
  if (band === "AMBER") return "Nearly ready";
  return "Not ready";
}

export default function TradingReport() {
  const { loanId } = useParams();
  const navigate = useNavigate();
  const q = useTradingSummary(loanId ?? null);

  // Auto-trigger print dialog when report loads (optional)
  useEffect(() => {
    if (q.data) {
      // Small delay to ensure content is rendered
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [q.data]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const item of q.data?.checklist ?? []) {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items: items.sort((a, b) => a.code.localeCompare(b.code)),
    }));
  }, [q.data]);

  const blockers = useMemo(() => {
    const items = (q.data?.checklist ?? []).filter((i) => i.status !== "DONE");
    // weight desc, blocked first
    return items.sort((a, b) => {
      const pa = a.status === "BLOCKED" ? 0 : 1;
      const pb = b.status === "BLOCKED" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return b.weight - a.weight;
    });
  }, [q.data]);

  const nextActions = useMemo(() => {
    const actions: string[] = [];
    for (const i of blockers) {
      if (i.code.startsWith("DOCS.")) actions.push(`Upload/validate documents: ${i.title}`);
      else if (i.code.startsWith("SERVICING.")) actions.push(`Complete servicing readiness: ${i.title}`);
      else if (i.code.startsWith("ESG.")) actions.push(`Add ESG evidence/KPIs: ${i.title}`);
      else if (i.code.startsWith("KYC.")) actions.push(`Complete KYC: ${i.title}`);
      else actions.push(`Resolve: ${i.title}`);
    }
    // dedupe + keep top 6
    return Array.from(new Set(actions)).slice(0, 6);
  }, [blockers]);

  if (q.isLoading) return <div style={{ padding: 16 }}>Loading trading report…</div>;
  if (q.isError || !q.data) return <div style={{ padding: 16 }}>Failed to load trading report.</div>;

  const { score, band, computedAt } = q.data;

  return (
    <div style={{ padding: 16, maxWidth: 980 }}>
      {/* Action buttons - hide when printing */}
      <div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 16, justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Trading Readiness Report</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => navigate(loanPaths.trading(loanId ?? ""))}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--card))",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            ← Back to Trading
          </button>
          <button
            onClick={() => window.print()}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: "none",
              background: "rgb(var(--primary))",
              color: "white",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🖨️ Print / Download PDF
          </button>
        </div>
      </div>

      <h2 className="print-only" style={{ margin: "0 0 16px 0" }}>Trading Readiness Report</h2>

      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12 }}>
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Readiness score</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{score} / 100</div>
        </div>

        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Band</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            {band} — {bandLabel(band)}
          </div>
        </div>

        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10, flex: 1 }}>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Computed at</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {computedAt ? new Date(computedAt).toLocaleString() : "—"}
          </div>
        </div>
      </div>

      <h3>Key blockers</h3>
      {blockers.length === 0 ? (
        <p>✅ No blockers. This loan is trade-ready.</p>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {blockers.slice(0, 8).map((i) => (
            <div key={i.id} style={{ padding: 10, border: "1px solid #eee", borderRadius: 10, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700 }}>{i.title}</div>
                <div style={{ fontWeight: 800 }}>{i.status}</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {i.category} · {i.code} · {i.weight} pts
              </div>
              {i.evidenceRef ? (
                <div style={{ fontSize: 12, opacity: 0.8 }}>Evidence: {i.evidenceRef}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <h3>Next actions</h3>
      {nextActions.length ? (
        <ul>
          {nextActions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : (
        <p>—</p>
      )}

      <h3>Checklist (by category)</h3>
      {grouped.map((g) => (
        <div key={g.category} style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 8 }}>{g.category}</h4>
          {g.items.map((i) => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f2f2f2" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{i.title}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{i.code} · {i.weight} pts</div>
              </div>
              <div style={{ fontWeight: 800 }}>{i.status}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
