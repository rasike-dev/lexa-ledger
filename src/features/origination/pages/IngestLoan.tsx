import React from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";
import { loanPaths } from "../../../app/routes/paths";

export function IngestLoan() {
  const navigate = useNavigate();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);
  const setLastExtractionAt = useUIStore((s) => s.setLastExtractionAt);

  const demoLoanId = "demo-loan-001";

  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>Origination • Ingest</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
        Upload a loan document (simulated). This will create a Digital Loan Twin.
      </p>

      <button
        onClick={() => {
          setActiveLoanId(demoLoanId);
          setLastExtractionAt(new Date().toISOString());
          navigate(loanPaths.overview(demoLoanId));
        }}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgb(var(--primary))",
          color: "white",
          border: "none",
        }}
      >
        Simulate Ingest → Open Digital Loan Twin
      </button>
    </div>
  );
}
