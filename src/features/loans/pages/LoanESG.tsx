import React from "react";
import { useParams } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";

export function LoanESG() {
  const { loanId } = useParams();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);

  React.useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>ESG • ESG Ledger</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>Loan ID: {loanId}</p>
      <div
        style={{
          padding: 16,
          border: "1px solid rgb(var(--border))",
          borderRadius: 12,
          background: "rgb(var(--card))",
        }}
      >
        ESG obligations + KPI tracker + evidence (placeholder).
      </div>
    </div>
  );
}
