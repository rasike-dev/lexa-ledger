import React from "react";
import { useParams, NavLink } from "react-router-dom";
import { useUIStore } from "../../../app/store/uiStore";
import { useAuthStore } from "../../../app/store/authStore";
import { Roles, hasAnyRole } from "../../../auth/roles";
import { loanPaths } from "../../../app/routes/paths";
import { useEsgSummary } from "../../esg/hooks/useEsgSummary";
import { useUploadEsgEvidence } from "../../esg/hooks/useUploadEsgEvidence";
import { useVerifyEsgEvidence } from "../../esg/hooks/useVerifyEsgEvidence";
import type { EsgKpi } from "../../esg/services/httpEsgApi";
import { useScrollToHash } from "../../../app/hooks/useScrollToHash";
import { CopyLinkButton } from "../../../app/components/CopyLinkButton";
import { buildDeepLink } from "../../../app/utils/deepLink";
import { GuidedDemoCTA } from "../../../app/components/GuidedDemoCTA";

function verificationBadge(status: string) {
  switch (status) {
    case "VERIFIED":
      return { bg: "rgba(16,185,129,0.12)", fg: "rgb(16,185,129)", label: "✅ VERIFIED" };
    case "NEEDS_REVIEW":
      return { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", label: "⚠️ NEEDS REVIEW" };
    case "REJECTED":
      return { bg: "rgba(220,38,38,0.12)", fg: "rgb(220,38,38)", label: "❌ REJECTED" };
    default: // PENDING
      return { bg: "rgba(148,163,184,0.12)", fg: "rgb(148,163,184)", label: "🟡 PENDING" };
  }
}

// Determine if "higher is better" for a KPI type
function isHigherBetter(kpiType: string): boolean {
  const higherIsBetter = [
    "RENEWABLE_ENERGY_PERCENT",
    "WASTE_RECYCLED_PERCENT",
    "DIVERSITY_PERCENT",
  ];
  return higherIsBetter.includes(kpiType);
}

function calculateGap(kpi: EsgKpi) {
  if (kpi.current == null || kpi.target == null) return null;
  
  const gap = kpi.current - kpi.target;
  const gapPercent = kpi.target !== 0 ? (gap / kpi.target) * 100 : 0;
  
  // Determine if on target based on direction
  let isOnTarget: boolean;
  if (isHigherBetter(kpi.type)) {
    // For "higher is better" KPIs: current should be >= target (within tolerance)
    isOnTarget = gap >= -5; // Allow 5% below target
  } else {
    // For "lower is better" KPIs: current should be <= target (within tolerance)
    isOnTarget = gap <= 5; // Allow 5% above target
  }
  
  return { gap, gapPercent, isOnTarget };
}

function NavLinkChip({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      style={{
        padding: "6px 12px",
        borderRadius: 999,
        border: "1px solid rgb(var(--border))",
        background: "rgb(var(--card))",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 600,
        color: "rgb(var(--foreground))",
      }}
    >
      {label}
    </NavLink>
  );
}

function Card({ title, value }: { title: string; value: React.ReactNode }) {
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
      <div style={{ fontWeight: 900, fontSize: 20 }}>{value}</div>
    </div>
  );
}

export function LoanESG() {
  const { loanId } = useParams();
  const setActiveLoanId = useUIStore((s) => s.setActiveLoanId);
  const demoMode = useUIStore((s) => s.demoMode);
  const { roles } = useAuthStore();

  const canVerifyESG = hasAnyRole(roles, [
    Roles.ESG_ANALYST,
    Roles.ESG_VERIFIER,
    Roles.TENANT_ADMIN,
  ]);

  const canUploadEvidence = hasAnyRole(roles, [
    Roles.ESG_ANALYST,
    Roles.ESG_VERIFIER,
    Roles.TENANT_ADMIN,
  ]);

  const esgQuery = useEsgSummary(loanId ?? null);
  const uploadMutation = useUploadEsgEvidence(loanId ?? null);
  const verifyMutation = useVerifyEsgEvidence(loanId ?? null);

  const [uploadTitle, setUploadTitle] = React.useState("");
  const [uploadType, setUploadType] = React.useState("REPORT");
  const [uploadKpiId, setUploadKpiId] = React.useState("");

  React.useEffect(() => {
    if (loanId) setActiveLoanId(loanId);
  }, [loanId, setActiveLoanId]);

  useScrollToHash([esgQuery.data]);

  async function handleUpload(file: File) {
    const title = uploadTitle.trim() || file.name;
    await uploadMutation.mutateAsync({
      title,
      type: uploadType,
      kpiId: uploadKpiId || undefined,
      file,
    });
    // Reset form
    setUploadTitle("");
    setUploadKpiId("");
  }

  const kpis = esgQuery.data?.kpis ?? [];
  const evidence = esgQuery.data?.evidence ?? [];

  // Enhanced summary stats
  const totalKpis = kpis.length;
  const kpisOnTarget = kpis.filter((k: EsgKpi) => {
    const gap = calculateGap(k);
    return gap?.isOnTarget;
  }).length;
  const kpisOffTrack = kpis.filter((k: EsgKpi) => {
    const gap = calculateGap(k);
    return gap && !gap.isOnTarget;
  }).length;
  const kpisNoTarget = kpis.filter((k: EsgKpi) => {
    return k.current == null || k.target == null;
  }).length;

  const verifiedEvidence = evidence.filter((e: any) => e.latestVerification?.status === "VERIFIED").length;
  const needsReviewEvidence = evidence.filter((e: any) => e.latestVerification?.status === "NEEDS_REVIEW").length;
  const pendingEvidence = evidence.filter((e: any) => 
    !e.latestVerification || e.latestVerification?.status === "PENDING"
  ).length;

  return (
    <div>
      <h1 style={{ margin: "0 0 8px 0" }}>ESG • Environmental, Social, Governance</h1>
      <p style={{ marginTop: 0, color: "rgb(var(--muted))" }}>
        Track ESG KPIs, upload evidence, and maintain compliance transparency.
      </p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <NavLinkChip
          to={loanPaths.documents(loanId ?? "demo-loan-001")}
          label="View ESG clauses in Documents"
        />
        <NavLinkChip
          to={loanPaths.trading(loanId ?? "demo-loan-001")}
          label="Back to Trading diligence"
        />
      </div>

      {esgQuery.isLoading ? (
        <div style={{ color: "rgb(var(--muted))" }}>Loading ESG data…</div>
      ) : esgQuery.isError ? (
        <div style={{ color: "rgb(var(--danger))" }}>Failed to load ESG data.</div>
      ) : (
        <>
          {/* Enhanced Mini Dashboard */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <Card title="Total KPIs" value={totalKpis} />
            <Card 
              title="✅ On Track" 
              value={`${kpisOnTarget} KPIs`}
            />
            <Card 
              title="⚠️ Off Track" 
              value={`${kpisOffTrack} KPIs`}
            />
            <Card 
              title="⚠️ No Target" 
              value={`${kpisNoTarget} KPIs`}
            />
            <Card 
              title="✅ Verified" 
              value={`${verifiedEvidence} evidence`}
            />
            <Card 
              title="⚠️ Needs Review" 
              value={`${needsReviewEvidence} evidence`}
            />
            <Card 
              title="🟡 Pending" 
              value={`${pendingEvidence} evidence`}
            />
          </div>

          {/* Upload Section */}
          <div
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgb(var(--border))",
              background: "rgb(var(--card))",
              marginBottom: 16,
            }}
            title={
              !canUploadEvidence
                ? "Requires ESG Analyst, ESG Verifier, or Tenant Admin role"
                : undefined
            }
          >
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Upload Evidence</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="text"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Evidence title (optional)"
                style={{
                  flex: "1 1 200px",
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--background))",
                  color: "rgb(var(--foreground))",
                }}
                disabled={!canUploadEvidence || demoMode}
              />
              <select
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--background))",
                  color: "rgb(var(--foreground))",
                }}
                disabled={!canUploadEvidence || demoMode}
              >
                <option value="REPORT">Report</option>
                <option value="CERTIFICATE">Certificate</option>
                <option value="INVOICE">Invoice</option>
                <option value="AUDIT">Audit</option>
                <option value="POLICY">Policy</option>
                <option value="OTHER">Other</option>
              </select>
              <select
                value={uploadKpiId}
                onChange={(e) => setUploadKpiId(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid rgb(var(--border))",
                  background: "rgb(var(--background))",
                  color: "rgb(var(--foreground))",
                }}
                disabled={!canUploadEvidence || demoMode}
              >
                <option value="">Link to KPI (optional)</option>
                {kpis.map((k: EsgKpi) => (
                  <option key={k.id} value={k.id}>
                    {k.title}
                  </option>
                ))}
              </select>
              <input
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
                disabled={!canUploadEvidence || demoMode || uploadMutation.isPending}
                style={{ flex: "0 0 auto" }}
              />
              {uploadMutation.isPending && (
                <span style={{ fontSize: 12, color: "rgb(var(--muted))" }}>Uploading...</span>
              )}
            </div>
          </div>

          {/* KPIs Section */}
          <div
            id="kpis"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              fontWeight: 900,
              marginBottom: 8,
              scrollMarginTop: 12,
            }}
          >
            <span>Key Performance Indicators</span>
            <CopyLinkButton
              href={buildDeepLink(`${loanPaths.esg(loanId ?? "demo-loan-001")}#kpis`)}
              label="Copy link to KPIs"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {kpis.map((kpi: EsgKpi) => {
              const gap = calculateGap(kpi);
              return (
                <div
                  key={kpi.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgb(var(--border))",
                    background: "rgb(var(--card))",
                  }}
                >
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>{kpi.title}</div>
                  <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginBottom: 8 }}>
                    Type: {kpi.type}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 11, color: "rgb(var(--muted))" }}>Target</div>
                      <div style={{ fontWeight: 600 }}>
                        {kpi.target != null ? `${kpi.target} ${kpi.unit || ""}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "rgb(var(--muted))" }}>Current</div>
                      <div style={{ fontWeight: 600 }}>
                        {kpi.current != null ? `${kpi.current} ${kpi.unit || ""}` : "—"}
                      </div>
                    </div>
                  </div>

                  {gap && (
                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        background: gap.isOnTarget
                          ? "rgba(16,185,129,0.12)"
                          : "rgba(245,158,11,0.12)",
                        color: gap.isOnTarget ? "rgb(16,185,129)" : "rgb(245,158,11)",
                        fontSize: 12,
                        fontWeight: 600,
                        textAlign: "center",
                      }}
                    >
                      {gap.isOnTarget ? "✅ On Target" : "⚠️ Off Target"} (
                      {gap.gapPercent > 0 ? "+" : ""}
                      {gap.gapPercent.toFixed(1)}%)
                    </div>
                  )}

                  {kpi.asOfDate && (
                    <div style={{ fontSize: 11, color: "rgb(var(--muted))", marginTop: 8 }}>
                      As of: {new Date(kpi.asOfDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Evidence Section */}
          <div
            id="evidence"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              fontWeight: 900,
              marginBottom: 8,
              scrollMarginTop: 12,
            }}
          >
            <span>Evidence & Verification</span>
            <CopyLinkButton
              href={buildDeepLink(`${loanPaths.esg(loanId ?? "demo-loan-001")}#evidence`)}
              label="Copy link to Evidence"
            />
          </div>

          <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
            {evidence.map((ev: any) => {
              const verification = ev.latestVerification;
              const badge = verification ? verificationBadge(verification.status) : verificationBadge("PENDING");

              return (
                <div
                  key={ev.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid rgb(var(--border))",
                    background: "rgb(var(--card))",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900 }}>{ev.title}</div>
                      <div style={{ fontSize: 12, color: "rgb(var(--muted))", marginTop: 4 }}>
                        Type: {ev.type} • File: {ev.fileName}
                      </div>
                      <div style={{ fontSize: 11, color: "rgb(var(--muted))", marginTop: 2 }}>
                        Uploaded: {new Date(ev.uploadedAt).toLocaleString()}
                      </div>
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 8px",
                        borderRadius: 999,
                        background: badge.bg,
                        color: badge.fg,
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Confidence Bar */}
                  {verification?.confidence != null && (
                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                        <span style={{ color: "rgb(var(--muted))" }}>Confidence</span>
                        <span style={{ fontWeight: 600 }}>{Math.round(verification.confidence * 100)}%</span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: "rgb(var(--border))",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${verification.confidence * 100}%`,
                            height: "100%",
                            background: 
                              verification.confidence >= 0.8 ? "rgb(16,185,129)" :
                              verification.confidence >= 0.6 ? "rgb(245,158,11)" :
                              "rgb(220,38,38)",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {verification?.notes && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 8,
                        borderRadius: 8,
                        background: "rgb(var(--background))",
                        fontSize: 11,
                        color: "rgb(var(--muted))",
                      }}
                    >
                      ℹ️ {verification.notes}
                    </div>
                  )}

                  {verification && (
                    <div style={{ fontSize: 11, color: "rgb(var(--muted))", marginTop: 8 }}>
                      Verified: {new Date(verification.checkedAt).toLocaleString()}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button
                      onClick={() => verifyMutation.mutate(ev.id)}
                      disabled={!canVerifyESG || demoMode || verifyMutation.isPending}
                      title={
                        !canVerifyESG
                          ? "Requires ESG Analyst, ESG Verifier, or Tenant Admin role"
                          : undefined
                      }
                      style={{
                        flex: 1,
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid rgb(var(--border))",
                        background: !canVerifyESG || demoMode ? "rgb(var(--muted))" : "rgb(var(--card))",
                        color: !canVerifyESG || demoMode ? "white" : "rgb(var(--foreground))",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: !canVerifyESG || demoMode ? "not-allowed" : "pointer",
                        opacity: !canVerifyESG ? 0.6 : 1,
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!demoMode && canVerifyESG) {
                          e.currentTarget.style.background = "rgb(var(--primary))";
                          e.currentTarget.style.color = "white";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!demoMode && canVerifyESG) {
                          e.currentTarget.style.background = "rgb(var(--card))";
                          e.currentTarget.style.color = "rgb(var(--foreground))";
                        }
                      }}
                    >
                      {verifyMutation.isPending ? "🔄 Verifying..." : "🔄 Verify Now"}
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(ev.fileKey);
                      }}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid rgb(var(--border))",
                        background: "rgb(var(--card))",
                        color: "rgb(var(--foreground))",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgb(var(--primary))";
                        e.currentTarget.style.color = "white";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgb(var(--card))";
                        e.currentTarget.style.color = "rgb(var(--foreground))";
                      }}
                      title={`Copy file key: ${ev.fileKey}`}
                    >
                      📋 Copy Key
                    </button>
                  </div>
                </div>
              );
            })}

            {evidence.length === 0 && (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  color: "rgb(var(--muted))",
                  border: "1px dashed rgb(var(--border))",
                  borderRadius: 12,
                }}
              >
                No evidence uploaded yet. Use the form above to upload ESG evidence.
              </div>
            )}
          </div>

          <GuidedDemoCTA
            step={4}
            totalSteps={4}
            title="Guided Demo • Complete"
            body="You've explored the full LMA-EDGE system: Origination → Documents → Servicing → Trading → ESG. Toggle demoMode to see live backend integration."
            to={loanPaths.overview(loanId ?? "demo-loan-001")}
            buttonLabel="Back to Overview"
          />
        </>
      )}
    </div>
  );
}
