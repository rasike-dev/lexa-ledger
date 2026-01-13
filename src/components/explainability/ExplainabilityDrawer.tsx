import React from "react";
import { ExplainDrawerState } from "./ExplainDrawerState";

export type ExplainVerbosity = "SHORT" | "STANDARD" | "DETAILED";

export type ExplainResult = {
  summary: string;
  explanation: string[];
  recommendations: string[];
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  version?: number;
};

type Props = {
  title: string;
  subtitle?: string;

  open: boolean;
  onClose: () => void;

  // Facts panel
  factsTitle?: string;
  factsSummary?: React.ReactNode;
  factsJson?: any;
  blockingIssues?: string[];

  canRecompute?: boolean;
  onRecompute?: () => Promise<void>;
  recomputeLabel?: string;

  // Explain controls
  verbosity: ExplainVerbosity;
  setVerbosity: (v: ExplainVerbosity) => void;

  canExplain: boolean;
  onExplain: () => Promise<void>;
  explaining?: boolean;

  result?: ExplainResult;
  error?: any; // Error from explanation query
  isEmpty?: boolean; // True if no facts/explanation available

  // Actions
  onCopyResult?: () => void;
  onViewAuditTrail?: () => void;
};

/**
 * Generic Explainability Drawer
 * 
 * Week 3 - Track A: Shared UI component for all explainability use cases
 * (Trading Readiness, ESG KPI, Covenant Breach, Portfolio Risk)
 * 
 * Pattern: Facts-first → Cached explanations → Audit trail
 */
export function ExplainabilityDrawer({
  title,
  subtitle,
  open,
  onClose,
  factsTitle = "Fact Snapshot",
  factsSummary,
  factsJson,
  blockingIssues,
  canRecompute,
  onRecompute,
  recomputeLabel = "Recompute",
  verbosity,
  setVerbosity,
  canExplain,
  onExplain,
  explaining,
  result,
  error,
  isEmpty,
  onCopyResult,
  onViewAuditTrail,
}: Props) {
  const [showFacts, setShowFacts] = React.useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="text-lg font-semibold">{title}</div>
            {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
          </div>
          <button className="rounded px-3 py-1 text-sm hover:bg-gray-100" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* Facts Panel */}
          <div className="rounded border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-gray-500">{factsTitle}</div>
                <div className="mt-1 text-sm">{factsSummary ?? "—"}</div>
              </div>

              <div className="flex flex-col gap-2">
                {canRecompute && onRecompute && (
                  <button
                    className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                    onClick={() => void onRecompute()}
                  >
                    {recomputeLabel}
                  </button>
                )}
                <button
                  className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => setShowFacts((v) => !v)}
                  disabled={!factsJson}
                >
                  {showFacts ? "Hide Facts" : "View Facts"}
                </button>
              </div>
            </div>

            {showFacts && factsJson && (
              <div className="mt-3 border-t pt-3">
                {blockingIssues && blockingIssues.length > 0 && (
                  <>
                    <div className="text-xs font-semibold text-gray-600">Blocking Issues</div>
                    <ul className="mt-1 list-disc pl-5 text-sm">
                      {blockingIssues.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                    <div className="mt-3 text-xs font-semibold text-gray-600">Facts</div>
                  </>
                )}

                {(!blockingIssues || blockingIssues.length === 0) && (
                  <div className="text-xs font-semibold text-gray-600">Facts</div>
                )}

                <pre className="mt-1 max-h-60 overflow-auto rounded bg-gray-50 p-2 text-xs">
                  {JSON.stringify(factsJson, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between rounded border p-3">
            <div className="flex items-center gap-2">
              <div className="text-sm text-gray-600">Verbosity</div>
              <select
                className="rounded border px-2 py-1 text-sm"
                value={verbosity}
                onChange={(e) => setVerbosity(e.target.value as ExplainVerbosity)}
              >
                <option value="SHORT">Short</option>
                <option value="STANDARD">Standard</option>
                <option value="DETAILED">Detailed</option>
              </select>
            </div>

            <button
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
              onClick={() => void onExplain()}
              disabled={!canExplain || !!explaining}
            >
              {explaining ? "Explaining…" : "Explain"}
            </button>
          </div>

          {/* Output */}
          <div className="rounded border">
            <ExplainDrawerState
              title="Explanation"
              isLoading={explaining}
              error={error}
              isEmpty={isEmpty || (!result && !explaining && !error)}
              emptyTitle="No explanation yet"
              emptyBody="Click Explain to generate a facts-based explanation."
              onRetry={onExplain}
            >
              {result && (
                <div className="p-3">
                  <div className="text-sm font-semibold mb-2">Explanation</div>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="text-xs text-gray-500">Summary</div>
                      <div>{result.summary}</div>
                    </div>

                    <div className="text-sm">
                      <div className="text-xs text-gray-500">Reasoning</div>
                      <ul className="mt-1 list-disc pl-5">
                        {(result.explanation ?? []).map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="text-sm">
                      <div className="text-xs text-gray-500">Recommendations</div>
                      <ul className="mt-1 list-disc pl-5">
                        {(result.recommendations ?? []).map((x, i) => (
                          <li key={i}>{x}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="text-xs text-gray-500">
                      {result.confidence && (
                        <>
                          Confidence: <span className="font-medium">{result.confidence}</span>
                        </>
                      )}
                      {result.version !== undefined && (
                        <>
                          {" "}
                          • Version: <span className="font-medium">{result.version}</span>
                        </>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {onCopyResult && (
                        <button className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50" onClick={onCopyResult}>
                          Copy
                        </button>
                      )}
                      {onViewAuditTrail && (
                        <button
                          className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
                          onClick={onViewAuditTrail}
                        >
                          View Audit Trail
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </ExplainDrawerState>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 text-xs text-gray-500">
          Explanations are generated from deterministic fact snapshots and recorded in Audit.
        </div>
      </div>
    </div>
  );
}
