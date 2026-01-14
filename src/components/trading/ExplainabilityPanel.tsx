import React, { useState } from "react";

function pillBand(band: string) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "9999px",
    padding: "2px 8px",
    fontSize: "11px",
    fontWeight: 500,
  };
  if (band === "GREEN")
    return { ...base, background: "rgba(16,185,129,0.12)", color: "rgb(16,185,129)" };
  if (band === "AMBER")
    return { ...base, background: "rgba(245,158,11,0.12)", color: "rgb(245,158,11)" };
  return { ...base, background: "rgba(220,38,38,0.12)", color: "rgb(220,38,38)" };
}

function fmt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type ExplainabilityPanelProps = {
  score: number;
  band: "GREEN" | "AMBER" | "RED";
  computedAt?: string;
  factHash?: string;
  hasExplanation: boolean;
  onExplain: () => void;
  onRecomputeFacts: () => void;
  onViewFacts: () => void;
  verbosity: "Standard" | "Detailed";
  setVerbosity: (v: "Standard" | "Detailed") => void;
  isExplaining?: boolean;
  isRecomputing?: boolean;
  explanation?: React.ReactNode;
};

export function ExplainabilityPanel({
  score,
  band,
  computedAt,
  factHash,
  hasExplanation,
  onExplain,
  onRecomputeFacts,
  onViewFacts,
  verbosity,
  setVerbosity,
  isExplaining = false,
  isRecomputing = false,
  explanation,
}: ExplainabilityPanelProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      style={{
        borderRadius: "12px",
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--card))",
        padding: 16,
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "rgb(var(--foreground))" }}>
            Why this readiness result?
          </div>
          <div style={{ marginTop: 4, fontSize: "12px", color: "rgb(var(--muted-foreground))" }}>
            Facts-first explanation • audit-safe • tenant-isolated
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: "12px", fontWeight: 500, color: "rgb(var(--muted-foreground))" }}>
            Detail level
          </label>
          <select
            value={verbosity}
            onChange={(e) => setVerbosity(e.target.value as "Standard" | "Detailed")}
            style={{
              borderRadius: "8px",
              border: "1px solid rgb(var(--border))",
              padding: "4px 8px",
              fontSize: "13px",
              background: "rgb(var(--background))",
              color: "rgb(var(--foreground))",
              cursor: "pointer",
            }}
          >
            <option value="Standard">Standard</option>
            <option value="Detailed">Detailed</option>
          </select>
        </div>
      </div>

      {/* Fact Snapshot */}
      <div
        style={{
          marginTop: 16,
          borderRadius: "12px",
          border: "1px solid rgb(var(--border))",
          background: "rgb(var(--muted))",
          padding: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "rgb(var(--muted-foreground))" }}>
              Latest Fact Snapshot
            </div>
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: "20px", fontWeight: 600, color: "rgb(var(--foreground))" }}>{score}</div>
              <div style={pillBand(band)}>{band}</div>
            </div>
            <div style={{ marginTop: 4, fontSize: "11px", color: "rgb(var(--muted-foreground))" }}>
              Computed {fmt(computedAt)}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={onRecomputeFacts}
              disabled={isRecomputing}
              style={{
                borderRadius: "8px",
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--background))",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 500,
                color: "rgb(var(--foreground))",
                cursor: isRecomputing ? "not-allowed" : "pointer",
                opacity: isRecomputing ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isRecomputing) e.currentTarget.style.background = "rgb(var(--muted))";
              }}
              onMouseLeave={(e) => {
                if (!isRecomputing) e.currentTarget.style.background = "rgb(var(--background))";
              }}
            >
              {isRecomputing ? "Recomputing…" : "Recompute facts"}
            </button>
            <button
              onClick={onViewFacts}
              style={{
                borderRadius: "8px",
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--background))",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 500,
                color: "rgb(var(--foreground))",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgb(var(--muted))";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgb(var(--background))";
              }}
            >
              View facts
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowDetails((s) => !s)}
          style={{
            marginTop: 12,
            fontSize: "11px",
            fontWeight: 500,
            color: "rgb(var(--foreground))",
            textDecoration: "underline",
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: 0,
          }}
        >
          {showDetails ? "Hide details" : "Show details"}
        </button>

        {showDetails && (
          <div style={{ marginTop: 8, fontSize: "11px", color: "rgb(var(--muted-foreground))" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Fact hash: {factHash ?? "—"}
              </span>
              {factHash && (
                <button
                  onClick={() => navigator.clipboard.writeText(factHash)}
                  style={{
                    borderRadius: "6px",
                    border: "1px solid rgb(var(--border))",
                    background: "rgb(var(--background))",
                    padding: "4px 8px",
                    fontSize: "11px",
                    fontWeight: 500,
                    color: "rgb(var(--foreground))",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgb(var(--muted))";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgb(var(--background))";
                  }}
                >
                  Copy
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Explanation */}
      <div style={{ marginTop: 16, borderTop: "1px solid rgb(var(--border))", paddingTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "rgb(var(--foreground))" }}>Explanation</div>
          <button
            onClick={onExplain}
            disabled={isExplaining}
            style={{
              borderRadius: "8px",
              background: "rgb(var(--foreground))",
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: 500,
              color: "rgb(var(--background))",
              cursor: isExplaining ? "not-allowed" : "pointer",
              opacity: isExplaining ? 0.6 : 1,
              border: "none",
            }}
            onMouseEnter={(e) => {
              if (!isExplaining) e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              if (!isExplaining) e.currentTarget.style.opacity = "1";
            }}
          >
            {hasExplanation
              ? isExplaining
                ? "Regenerating…"
                : "Regenerate"
              : isExplaining
                ? "Generating…"
                : "Generate explanation"}
          </button>
        </div>

        {!hasExplanation ? (
          <div style={{ marginTop: 12, borderRadius: "12px", border: "1px solid rgb(var(--border))", background: "rgb(var(--card))", padding: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  marginTop: 2,
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--muted))",
                  flexShrink: 0,
                }}
              />
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "rgb(var(--foreground))" }}>
                  No explanation yet
                </div>
                <div style={{ marginTop: 4, fontSize: "12px", color: "rgb(var(--muted-foreground))", lineHeight: "1.5" }}>
                  Generate a facts-based explanation from the latest snapshot. The request and output are recorded in Audit.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 12, borderRadius: "12px", border: "1px solid rgb(var(--border))", background: "rgb(var(--card))", padding: 16 }}>
            {explanation || (
              <div style={{ fontSize: "13px", color: "rgb(var(--foreground))" }}>Explanation content will appear here.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
