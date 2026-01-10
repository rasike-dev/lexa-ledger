import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "../../../app/store/uiStore";
import { useAuthStore } from "../../../app/store/authStore";
import { Roles, hasAnyRole } from "../../../auth/roles";
import { useLoanDocuments } from "../../documents/hooks/useLoanDocuments";
import { useClauses } from "../../documents/hooks/useClauses";
import { createDocumentContainerHttp, uploadDocumentVersionHttp } from "../../documents/services/httpDocumentsWriteApi";
import { GuidedDemoCTA } from "../../../app/components/GuidedDemoCTA";
import { loanPaths } from "../../../app/routes/paths";

function badgeColors(tag: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    basic: { bg: "rgba(148,163,184,0.18)", fg: "rgb(100,116,139)" },
    covenant: { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)" },
    risk: { bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)" },
    PRICING: { bg: "rgba(37,99,235,0.12)", fg: "rgb(37,99,235)" },
    COVENANT: { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)" },
    REPORTING: { bg: "rgba(148,163,184,0.18)", fg: "rgb(100,116,139)" },
    ESG: { bg: "rgba(16,185,129,0.12)", fg: "rgb(16,185,129)" },
    EOD: { bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)" },
  };
  return map[tag] ?? { bg: "rgba(148,163,184,0.18)", fg: "rgb(100,116,139)" };
}

export function LoanDocuments() {
  const { loanId } = useParams();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);
  const demoMode = useUIStore((s) => s.demoMode);
  const { roles } = useAuthStore();
  const qc = useQueryClient();
  const docsQuery = useLoanDocuments(loanId ?? null);

  const canUploadDocs = hasAnyRole(roles, [
    Roles.DOCUMENT_SPECIALIST,
    Roles.TENANT_ADMIN,
  ]);

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("Facility Agreement");
  const [newType, setNewType] = useState("FACILITY_AGREEMENT");

  useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  // Default select latest version of newest doc
  useEffect(() => {
    if (!docsQuery.data?.length) return;
    const first = docsQuery.data[0];
    const latest = first.latestVersion?.documentVersionId ?? first.versions[0]?.documentVersionId;
    if (latest && selectedVersionId !== latest) setSelectedVersionId(latest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docsQuery.data]);

  const clausesQuery = useClauses(selectedVersionId);

  // A) Handlers for create + upload
  async function onCreateDocument() {
    if (!loanId) return;
    if (demoMode) return; // or allow creating local-only demo items later

    const res = await createDocumentContainerHttp(loanId, { title: newTitle, type: newType });
    setSelectedDocumentId(res.documentId);

    // refresh documents list
    await qc.invalidateQueries({ queryKey: ["loanDocuments", loanId] });
  }

  async function onUploadVersion(file: File) {
    if (!selectedDocumentId) return;
    if (demoMode) return;

    await uploadDocumentVersionHttp(selectedDocumentId, file);

    // refresh list + clauses (default selection effect should pick latest)
    await qc.invalidateQueries({ queryKey: ["loanDocuments", loanId] });
  }

  // C) Version -> Document mapping for selection binding
  const versionToDocId = useMemo(() => {
    const map: Record<string, string> = {};
    (docsQuery.data ?? []).forEach((d) => {
      d.versions.forEach((v) => (map[v.documentVersionId] = d.documentId));
    });
    return map;
  }, [docsQuery.data]);

  const options = useMemo(() => {
    return (docsQuery.data ?? []).flatMap((d) =>
      d.versions.map((v) => ({
        value: v.documentVersionId,
        label: `${d.title} — v${v.version} (${v.fileName})`,
      })),
    );
  }, [docsQuery.data]);

  if (!loanId) {
    return (
      <div>
        <h1 style={{ margin: "0 0 8px 0" }}>Documents • Clause Explorer</h1>
        <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
          Structured clause view with extracted clauses from uploaded documents.
        </p>
        <div style={{ color: "rgb(var(--danger))", marginTop: 12 }}>
          No loan ID provided. Please select a loan first.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>Documents • Clause Explorer</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
        Structured clause view with extracted clauses from uploaded documents.
      </p>

      {/* B) Create + Upload UI */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginTop: 16,
          marginBottom: 16,
          padding: 12,
          borderRadius: 12,
          border: demoMode ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgb(var(--border))",
          background: demoMode ? "rgba(245,158,11,0.08)" : "rgb(var(--card))",
        }}
      >
        <input
          value={newTitle}
          onChange={(e) => !demoMode && setNewTitle(e.target.value)}
          placeholder="Document title"
          disabled={demoMode}
          style={{
            flex: 1,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid rgb(var(--border))",
            background: demoMode ? "rgb(var(--muted))" : "rgb(var(--background))",
            color: demoMode ? "rgb(var(--muted-foreground))" : "rgb(var(--foreground))",
            fontSize: 14,
            cursor: demoMode ? "not-allowed" : "text",
          }}
        />
        <select
          value={newType}
          onChange={(e) => !demoMode && setNewType(e.target.value)}
          disabled={demoMode}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid rgb(var(--border))",
            background: demoMode ? "rgb(var(--muted))" : "rgb(var(--background))",
            color: demoMode ? "rgb(var(--muted-foreground))" : "rgb(var(--foreground))",
            fontSize: 14,
            cursor: demoMode ? "not-allowed" : "pointer",
          }}
        >
          <option value="FACILITY_AGREEMENT">Facility Agreement</option>
          <option value="AMENDMENT">Amendment</option>
          <option value="OTHER">Other</option>
        </select>

        <button
          onClick={onCreateDocument}
          disabled={!canUploadDocs || demoMode}
          title={
            !canUploadDocs
              ? "Requires Document Specialist or Tenant Admin role"
              : undefined
          }
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            border: !canUploadDocs || demoMode ? "1px solid rgb(var(--muted))" : "1px solid rgb(var(--primary))",
            background: !canUploadDocs || demoMode ? "rgb(var(--muted))" : "rgb(var(--primary))",
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            cursor: !canUploadDocs || demoMode ? "not-allowed" : "pointer",
            opacity: !canUploadDocs || demoMode ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          Create Document
        </button>

        <label
          title={
            !canUploadDocs
              ? "Requires Document Specialist or Tenant Admin role"
              : !selectedDocumentId
              ? "Select a document first"
              : undefined
          }
          style={{
            padding: "6px 16px",
            borderRadius: 8,
            border: "1px solid rgb(var(--border))",
            background:
              selectedDocumentId && !demoMode && canUploadDocs
                ? "rgb(var(--accent))"
                : "rgb(var(--muted))",
            color:
              selectedDocumentId && !demoMode && canUploadDocs
                ? "rgb(var(--accent-foreground))"
                : "rgb(var(--muted-foreground))",
            fontSize: 14,
            fontWeight: 600,
            cursor: selectedDocumentId && !demoMode && canUploadDocs ? "pointer" : "not-allowed",
            opacity: selectedDocumentId && !demoMode && canUploadDocs ? 1 : 0.6,
            whiteSpace: "nowrap",
          }}
        >
          Upload Version
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadVersion(f);
            }}
            disabled={!canUploadDocs || demoMode || !selectedDocumentId}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {docsQuery.isLoading && (
        <div style={{ color: "rgb(var(--muted))", marginTop: 12 }}>Loading documents…</div>
      )}
      {docsQuery.isError && (
        <div style={{ color: "rgb(var(--danger))", marginTop: 12 }}>
          Failed to load documents. {docsQuery.error instanceof Error ? docsQuery.error.message : "Unknown error"}
        </div>
      )}

      {!!options.length && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 16,
            padding: 12,
            borderRadius: 12,
            border: "1px solid rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600 }}>Select document version:</span>
            <select
              value={selectedVersionId ?? ""}
              onChange={(e) => {
                const vId = e.target.value;
                setSelectedVersionId(vId);
                setSelectedDocumentId(versionToDocId[vId] ?? null);
              }}
              style={{
                flex: 1,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--background))",
                color: "rgb(var(--foreground))",
                fontSize: 14,
              }}
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <hr style={{ border: "none", borderTop: "1px solid rgb(var(--border))", margin: "24px 0" }} />

      <h3 style={{ margin: "0 0 12px 0" }}>Extracted Clauses</h3>

      {clausesQuery.isLoading && (
        <div style={{ color: "rgb(var(--muted))" }}>Loading clauses…</div>
      )}
      {clausesQuery.isError && (
        <div style={{ color: "rgb(var(--danger))" }}>
          Failed to load clauses. {clausesQuery.error instanceof Error ? clausesQuery.error.message : "Unknown error"}
        </div>
      )}

      {!clausesQuery.isLoading && !clausesQuery.isError && !clausesQuery.data?.length && (
        <div style={{ color: "rgb(var(--muted))" }}>
          No clauses extracted yet. The worker may still be processing this document.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
        {clausesQuery.data?.map((c: any) => {
          const colors = c.riskTags?.[0] ? badgeColors(c.riskTags[0]) : badgeColors("basic");
          return (
            <div
              key={c.id}
              style={{
                padding: 16,
                borderRadius: 12,
                border: "1px solid rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                {c.clauseRef && (
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: colors.bg,
                      color: colors.fg,
                    }}
                  >
                    {c.clauseRef}
                  </span>
                )}
                <span style={{ fontWeight: 600, fontSize: 15 }}>{c.title ?? "Clause"}</span>
              </div>
              <div style={{ whiteSpace: "pre-wrap", color: "rgb(var(--foreground))", lineHeight: 1.6 }}>
                {c.text}
              </div>
              {!!c.riskTags?.length && (
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {c.riskTags.map((tag: string) => {
                    const tagColors = badgeColors(tag);
                    return (
                      <span
                        key={tag}
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: tagColors.bg,
                          color: tagColors.fg,
                          fontWeight: 500,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {tag}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <GuidedDemoCTA
        step={1}
        totalSteps={4}
        title="Guided Demo • Next step"
        body="Next, open Servicing to see covenant monitoring and scenario simulation in action."
        to={loanPaths.servicing(loanId ?? "demo-loan-001")}
        buttonLabel="Go to Servicing"
      />
    </div>
  );
}
