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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <div className="text-xl font-semibold text-slate-900">{title}</div>
            {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
          </div>
          <button 
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors" 
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-6 p-6 bg-slate-50">
          {/* Facts Panel */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{factsTitle}</div>
                <div className="text-sm text-slate-900 leading-relaxed">{factsSummary ?? "—"}</div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {canRecompute && onRecompute && (
                  <button
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    onClick={() => void onRecompute()}
                  >
                    {recomputeLabel}
                  </button>
                )}
                <button
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setShowFacts((v) => !v)}
                  disabled={!factsJson}
                >
                  {showFacts ? "Hide Facts" : "View Facts"}
                </button>
              </div>
            </div>

            {showFacts && factsJson && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                {blockingIssues && blockingIssues.length > 0 && (
                  <>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Blocking Issues</div>
                    <ul className="mt-2 space-y-1.5 list-none pl-0">
                      {blockingIssues.map((b, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Raw Facts Data</div>
                  </>
                )}

                {(!blockingIssues || blockingIssues.length === 0) && (
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Raw Facts Data</div>
                )}

                <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-50 border border-slate-200 p-4 text-xs font-mono text-slate-700 leading-relaxed">
                  {JSON.stringify(factsJson, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Verbosity</label>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
                value={verbosity}
                onChange={(e) => setVerbosity(e.target.value as ExplainVerbosity)}
              >
                <option value="SHORT">Short</option>
                <option value="STANDARD">Standard</option>
                <option value="DETAILED">Detailed</option>
              </select>
            </div>

            <button
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              onClick={() => void onExplain()}
              disabled={!canExplain || !!explaining}
            >
              {explaining ? "Generating…" : "Explain"}
            </button>
          </div>

          {/* Output */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
                <div className="p-6 space-y-6">
                  {/* Summary */}
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Executive Summary</div>
                    <div className="text-sm text-slate-900 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-200">
                      {result.summary}
                    </div>
                  </div>

                  {/* Key Factors */}
                  {result.explanation && result.explanation.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Key Contributing Factors</div>
                      <ul className="space-y-2.5 list-none pl-0">
                        {(result.explanation ?? []).map((x, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-700 leading-relaxed">
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span>{x}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations && result.recommendations.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Recommended Actions</div>
                      <div className="space-y-2.5">
                        {result.recommendations.map((x, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100"
                          >
                            <div className="flex-shrink-0 w-6 h-6 rounded-md bg-blue-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                              {i + 1}
                            </div>
                            <div className="text-sm text-slate-900 leading-relaxed flex-1">{x}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata & Actions */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        {result.confidence && (
                          <div>
                            <span className="font-medium text-slate-700">Confidence:</span>{" "}
                            <span className={`font-semibold ${
                              result.confidence === 'HIGH' ? 'text-green-600' :
                              result.confidence === 'MEDIUM' ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {result.confidence}
                            </span>
                          </div>
                        )}
                        {result.version !== undefined && (
                          <div>
                            <span className="font-medium text-slate-700">Version:</span>{" "}
                            <span className="font-semibold text-slate-900">{result.version}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {onCopyResult && (
                          <button 
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors" 
                            onClick={onCopyResult}
                          >
                            Copy
                          </button>
                        )}
                        {onViewAuditTrail && (
                          <button
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            onClick={onViewAuditTrail}
                          >
                            View Audit Trail
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ExplainDrawerState>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-slate-200 bg-slate-50 px-6 py-3">
          <div className="text-xs text-slate-500 text-center">
            Explanations are generated from deterministic fact snapshots and recorded in Audit.
          </div>
        </div>
      </div>
    </div>
  );
}
