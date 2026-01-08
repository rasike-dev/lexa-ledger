import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";
import { loanPaths } from "../../../app/routes/paths";
import { ingestLoan } from "../services/originationApi";

export function IngestLoan() {
  const navigate = useNavigate();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);
  const setLastExtractionAt = useUIStore((s) => s.setLastExtractionAt);
  const demoMode = useUIStore((s) => s.demoMode);

  const [borrower, setBorrower] = useState("");
  const [agentBank, setAgentBank] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [facilityAmount, setFacilityAmount] = useState("");
  const [marginBps, setMarginBps] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const demoLoanId = "demo-loan-001";

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();

    if (!borrower.trim() || !agentBank.trim() || !facilityAmount || !marginBps) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        borrower: borrower.trim(),
        agentBank: agentBank.trim(),
        currency,
        facilityAmount: Number(facilityAmount),
        marginBps: Number(marginBps),
      };

      const res = await ingestLoan(payload);

      setActiveLoanId(res.loanId);
      setLastExtractionAt(new Date().toISOString());
      navigate(`/loans/${res.loanId}/overview`);
    } catch (error) {
      console.error("Ingest failed:", error);
      alert("Failed to ingest loan. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Demo mode: quick button for demo-loan-001
  if (demoMode) {
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

  // Live mode: form for real ingestion
  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>Origination • Ingest</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
        Create a new Digital Loan Twin by ingesting loan details.
      </p>

      <form onSubmit={onSubmit} style={{ maxWidth: 500, marginTop: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Borrower
          </label>
          <input
            type="text"
            value={borrower}
            onChange={(e) => setBorrower(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid rgb(var(--border))",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Agent Bank
          </label>
          <input
            type="text"
            value={agentBank}
            onChange={(e) => setAgentBank(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid rgb(var(--border))",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            required
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid rgb(var(--border))",
            }}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Facility Amount
          </label>
          <input
            type="number"
            value={facilityAmount}
            onChange={(e) => setFacilityAmount(e.target.value)}
            required
            min="0"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid rgb(var(--border))",
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Margin (BPS)
          </label>
          <input
            type="number"
            value={marginBps}
            onChange={(e) => setMarginBps(e.target.value)}
            required
            min="0"
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid rgb(var(--border))",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              background: isSubmitting ? "rgb(var(--muted))" : "rgb(var(--primary))",
              color: "white",
              border: "none",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontWeight: 600,
            }}
          >
            {isSubmitting ? "Ingesting..." : "Ingest Loan"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            disabled={isSubmitting}
            style={{
              padding: "10px 20px",
              borderRadius: 6,
              background: "rgb(var(--background))",
              color: "rgb(var(--foreground))",
              border: "1px solid rgb(var(--border))",
              cursor: isSubmitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
