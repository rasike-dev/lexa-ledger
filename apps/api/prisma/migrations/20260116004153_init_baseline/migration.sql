-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ORG_ADMIN', 'AGENT', 'ANALYST', 'OPS', 'VIEWER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FACILITY_AGREEMENT', 'AMENDMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "CovenantTestStatus" AS ENUM ('PASS', 'WARN', 'FAIL');

-- CreateEnum
CREATE TYPE "ScenarioMode" AS ENUM ('BASE', 'STRESS');

-- CreateEnum
CREATE TYPE "CovenantMetric" AS ENUM ('DSCR', 'LIQUIDITY', 'LEVERAGE', 'EBITDA', 'INTEREST_COVER');

-- CreateEnum
CREATE TYPE "CovenantOperator" AS ENUM ('GTE', 'LTE');

-- CreateEnum
CREATE TYPE "TradingItemStatus" AS ENUM ('OPEN', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ReadinessBand" AS ENUM ('RED', 'AMBER', 'GREEN');

-- CreateEnum
CREATE TYPE "ESGKpiType" AS ENUM ('EMISSIONS_SCOPE_1', 'EMISSIONS_SCOPE_2', 'EMISSIONS_SCOPE_3', 'RENEWABLE_ENERGY_PERCENT', 'ENERGY_INTENSITY', 'WATER_USAGE', 'WASTE_RECYCLED_PERCENT', 'SAFETY_TRIR', 'DIVERSITY_PERCENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ESGEvidenceType" AS ENUM ('REPORT', 'CERTIFICATE', 'INVOICE', 'AUDIT', 'POLICY', 'OTHER');

-- CreateEnum
CREATE TYPE "ESGVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'NEEDS_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('USER', 'SERVICE');

-- CreateEnum
CREATE TYPE "EsgKpiStatus" AS ENUM ('PASS', 'FAIL', 'NEEDS_VERIFICATION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CovenantStatus" AS ENUM ('COMPLIANT', 'BREACH', 'AT_RISK', 'UNKNOWN');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "borrower" TEXT NOT NULL,
    "agentBank" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "facilityAmount" BIGINT NOT NULL,
    "marginBps" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" "ActorType",
    "actorUserId" TEXT,
    "actorClientId" TEXT,
    "actorRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correlationId" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidenceRef" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "checksum" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clause" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "clauseRef" TEXT,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "riskTags" TEXT[],
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanScenario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "mode" "ScenarioMode" NOT NULL DEFAULT 'BASE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Covenant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "threshold" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metric" "CovenantMetric" NOT NULL,
    "operator" "CovenantOperator" NOT NULL DEFAULT 'GTE',

    CONSTRAINT "Covenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CovenantTestResult" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "covenantId" TEXT NOT NULL,
    "scenario" "ScenarioMode" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "status" "CovenantTestStatus" NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "CovenantTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingChecklistItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 10,
    "status" "TradingItemStatus" NOT NULL DEFAULT 'OPEN',
    "evidenceRef" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradingChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingReadinessSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "band" "ReadinessBand" NOT NULL,
    "reasons" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradingReadinessSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingReadinessFactSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "readinessScore" INTEGER NOT NULL,
    "readinessBand" "ReadinessBand" NOT NULL,
    "contributingFactors" JSONB NOT NULL,
    "blockingIssues" JSONB NOT NULL,
    "factVersion" INTEGER NOT NULL DEFAULT 1,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "computedBy" TEXT NOT NULL DEFAULT 'SYSTEM',
    "factHash" TEXT NOT NULL,
    "correlationId" TEXT,

    CONSTRAINT "TradingReadinessFactSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingReadinessExplanation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "factHash" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "verbosity" TEXT NOT NULL,
    "explainVersion" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "explanationHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,

    CONSTRAINT "TradingReadinessExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ESGKpi" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "type" "ESGKpiType" NOT NULL,
    "title" TEXT NOT NULL,
    "unit" TEXT,
    "target" DOUBLE PRECISION,
    "current" DOUBLE PRECISION,
    "asOfDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ESGKpi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ESGEvidence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "kpiId" TEXT,
    "type" "ESGEvidenceType" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "source" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "checksum" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ESGEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ESGVerification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "status" "ESGVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "confidence" DOUBLE PRECISION,
    "notes" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ESGVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsgKpiFactSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "kpiCode" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "status" "EsgKpiStatus" NOT NULL,
    "score" INTEGER,
    "reasonCodes" JSONB NOT NULL,
    "measurement" JSONB NOT NULL,
    "evidence" JSONB NOT NULL,
    "verification" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "computedBy" TEXT NOT NULL,
    "factVersion" INTEGER NOT NULL DEFAULT 1,
    "factHash" TEXT NOT NULL,
    "correlationId" TEXT,

    CONSTRAINT "EsgKpiFactSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EsgKpiExplanation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "kpiId" TEXT NOT NULL,
    "factHash" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "verbosity" TEXT NOT NULL,
    "explainVersion" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "explanationHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,

    CONSTRAINT "EsgKpiExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CovenantEvaluationFactSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "covenantId" TEXT NOT NULL,
    "covenantName" TEXT NOT NULL,
    "covenantType" TEXT NOT NULL,
    "status" "CovenantStatus" NOT NULL,
    "threshold" JSONB NOT NULL,
    "observed" JSONB NOT NULL,
    "breachDetail" JSONB NOT NULL,
    "inputSignals" JSONB NOT NULL,
    "sourceRefs" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "computedBy" TEXT NOT NULL,
    "factVersion" INTEGER NOT NULL DEFAULT 1,
    "factHash" TEXT NOT NULL,
    "correlationId" TEXT,

    CONSTRAINT "CovenantEvaluationFactSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CovenantExplanation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "covenantId" TEXT NOT NULL,
    "factHash" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "verbosity" TEXT NOT NULL,
    "explainVersion" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "explanationHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,

    CONSTRAINT "CovenantExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioRiskFactSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "portfolioId" TEXT,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "totals" JSONB NOT NULL,
    "distributions" JSONB NOT NULL,
    "topDrivers" JSONB NOT NULL,
    "anomalies" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "computedBy" TEXT NOT NULL,
    "factVersion" INTEGER NOT NULL DEFAULT 1,
    "factHash" TEXT NOT NULL,
    "correlationId" TEXT,

    CONSTRAINT "PortfolioRiskFactSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioRiskExplanation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "portfolioId" TEXT,
    "factHash" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "verbosity" TEXT NOT NULL,
    "explainVersion" INTEGER NOT NULL DEFAULT 1,
    "provider" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "explanationHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,

    CONSTRAINT "PortfolioRiskExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImpactEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "correlationId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceAction" TEXT NOT NULL,
    "impacts" JSONB NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImpactEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "Membership"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Loan_tenantId_idx" ON "Loan"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_tenantId_id_key" ON "Loan"("tenantId", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_idx" ON "AuditEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorType_idx" ON "AuditEvent"("actorType");

-- CreateIndex
CREATE INDEX "AuditEvent_correlationId_idx" ON "AuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditEvent_tenantId_id_key" ON "AuditEvent"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "Document"("tenantId");

-- CreateIndex
CREATE INDEX "Document_loanId_idx" ON "Document"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_tenantId_id_key" ON "Document"("tenantId", "id");

-- CreateIndex
CREATE INDEX "DocumentVersion_tenantId_idx" ON "DocumentVersion"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_tenantId_id_key" ON "DocumentVersion"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_version_key" ON "DocumentVersion"("documentId", "version");

-- CreateIndex
CREATE INDEX "Clause_tenantId_idx" ON "Clause"("tenantId");

-- CreateIndex
CREATE INDEX "Clause_documentVersionId_idx" ON "Clause"("documentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "Clause_tenantId_id_key" ON "Clause"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "LoanScenario_loanId_key" ON "LoanScenario"("loanId");

-- CreateIndex
CREATE INDEX "LoanScenario_tenantId_idx" ON "LoanScenario"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanScenario_tenantId_id_key" ON "LoanScenario"("tenantId", "id");

-- CreateIndex
CREATE INDEX "Covenant_tenantId_idx" ON "Covenant"("tenantId");

-- CreateIndex
CREATE INDEX "Covenant_loanId_idx" ON "Covenant"("loanId");

-- CreateIndex
CREATE UNIQUE INDEX "Covenant_tenantId_id_key" ON "Covenant"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Covenant_tenantId_loanId_code_key" ON "Covenant"("tenantId", "loanId", "code");

-- CreateIndex
CREATE INDEX "CovenantTestResult_tenantId_idx" ON "CovenantTestResult"("tenantId");

-- CreateIndex
CREATE INDEX "CovenantTestResult_loanId_idx" ON "CovenantTestResult"("loanId");

-- CreateIndex
CREATE INDEX "CovenantTestResult_covenantId_idx" ON "CovenantTestResult"("covenantId");

-- CreateIndex
CREATE INDEX "CovenantTestResult_scenario_idx" ON "CovenantTestResult"("scenario");

-- CreateIndex
CREATE UNIQUE INDEX "CovenantTestResult_tenantId_id_key" ON "CovenantTestResult"("tenantId", "id");

-- CreateIndex
CREATE INDEX "TradingChecklistItem_tenantId_idx" ON "TradingChecklistItem"("tenantId");

-- CreateIndex
CREATE INDEX "TradingChecklistItem_loanId_idx" ON "TradingChecklistItem"("loanId");

-- CreateIndex
CREATE INDEX "TradingChecklistItem_status_idx" ON "TradingChecklistItem"("status");

-- CreateIndex
CREATE INDEX "TradingChecklistItem_category_idx" ON "TradingChecklistItem"("category");

-- CreateIndex
CREATE UNIQUE INDEX "TradingChecklistItem_tenantId_id_key" ON "TradingChecklistItem"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TradingChecklistItem_tenantId_loanId_code_key" ON "TradingChecklistItem"("tenantId", "loanId", "code");

-- CreateIndex
CREATE INDEX "TradingReadinessSnapshot_tenantId_idx" ON "TradingReadinessSnapshot"("tenantId");

-- CreateIndex
CREATE INDEX "TradingReadinessSnapshot_loanId_idx" ON "TradingReadinessSnapshot"("loanId");

-- CreateIndex
CREATE INDEX "TradingReadinessSnapshot_computedAt_idx" ON "TradingReadinessSnapshot"("computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradingReadinessSnapshot_tenantId_id_key" ON "TradingReadinessSnapshot"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TradingReadinessFactSnapshot_factHash_key" ON "TradingReadinessFactSnapshot"("factHash");

-- CreateIndex
CREATE INDEX "TradingReadinessFactSnapshot_tenantId_idx" ON "TradingReadinessFactSnapshot"("tenantId");

-- CreateIndex
CREATE INDEX "TradingReadinessFactSnapshot_loanId_idx" ON "TradingReadinessFactSnapshot"("loanId");

-- CreateIndex
CREATE INDEX "TradingReadinessFactSnapshot_computedAt_idx" ON "TradingReadinessFactSnapshot"("computedAt");

-- CreateIndex
CREATE INDEX "TradingReadinessFactSnapshot_readinessBand_idx" ON "TradingReadinessFactSnapshot"("readinessBand");

-- CreateIndex
CREATE INDEX "TradingReadinessFactSnapshot_tenantId_loanId_computedAt_idx" ON "TradingReadinessFactSnapshot"("tenantId", "loanId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradingReadinessFactSnapshot_tenantId_id_key" ON "TradingReadinessFactSnapshot"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "TradingReadinessExplanation_explanationHash_key" ON "TradingReadinessExplanation"("explanationHash");

-- CreateIndex
CREATE INDEX "TradingReadinessExplanation_tenantId_idx" ON "TradingReadinessExplanation"("tenantId");

-- CreateIndex
CREATE INDEX "TradingReadinessExplanation_loanId_idx" ON "TradingReadinessExplanation"("loanId");

-- CreateIndex
CREATE INDEX "TradingReadinessExplanation_factHash_idx" ON "TradingReadinessExplanation"("factHash");

-- CreateIndex
CREATE INDEX "TradingReadinessExplanation_tenantId_loanId_factHash_create_idx" ON "TradingReadinessExplanation"("tenantId", "loanId", "factHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradingReadinessExplanation_tenantId_id_key" ON "TradingReadinessExplanation"("tenantId", "id");

-- CreateIndex
CREATE INDEX "ESGKpi_tenantId_idx" ON "ESGKpi"("tenantId");

-- CreateIndex
CREATE INDEX "ESGKpi_loanId_idx" ON "ESGKpi"("loanId");

-- CreateIndex
CREATE INDEX "ESGKpi_type_idx" ON "ESGKpi"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ESGKpi_tenantId_id_key" ON "ESGKpi"("tenantId", "id");

-- CreateIndex
CREATE INDEX "ESGEvidence_tenantId_idx" ON "ESGEvidence"("tenantId");

-- CreateIndex
CREATE INDEX "ESGEvidence_loanId_idx" ON "ESGEvidence"("loanId");

-- CreateIndex
CREATE INDEX "ESGEvidence_kpiId_idx" ON "ESGEvidence"("kpiId");

-- CreateIndex
CREATE INDEX "ESGEvidence_uploadedAt_idx" ON "ESGEvidence"("uploadedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ESGEvidence_tenantId_id_key" ON "ESGEvidence"("tenantId", "id");

-- CreateIndex
CREATE INDEX "ESGVerification_tenantId_idx" ON "ESGVerification"("tenantId");

-- CreateIndex
CREATE INDEX "ESGVerification_loanId_idx" ON "ESGVerification"("loanId");

-- CreateIndex
CREATE INDEX "ESGVerification_evidenceId_idx" ON "ESGVerification"("evidenceId");

-- CreateIndex
CREATE INDEX "ESGVerification_status_idx" ON "ESGVerification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ESGVerification_tenantId_id_key" ON "ESGVerification"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "EsgKpiFactSnapshot_factHash_key" ON "EsgKpiFactSnapshot"("factHash");

-- CreateIndex
CREATE INDEX "EsgKpiFactSnapshot_tenantId_loanId_kpiId_computedAt_idx" ON "EsgKpiFactSnapshot"("tenantId", "loanId", "kpiId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EsgKpiExplanation_explanationHash_key" ON "EsgKpiExplanation"("explanationHash");

-- CreateIndex
CREATE INDEX "EsgKpiExplanation_tenantId_loanId_kpiId_factHash_createdAt_idx" ON "EsgKpiExplanation"("tenantId", "loanId", "kpiId", "factHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CovenantEvaluationFactSnapshot_factHash_key" ON "CovenantEvaluationFactSnapshot"("factHash");

-- CreateIndex
CREATE INDEX "CovenantEvaluationFactSnapshot_tenantId_loanId_covenantId_c_idx" ON "CovenantEvaluationFactSnapshot"("tenantId", "loanId", "covenantId", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CovenantExplanation_explanationHash_key" ON "CovenantExplanation"("explanationHash");

-- CreateIndex
CREATE INDEX "CovenantExplanation_tenantId_loanId_covenantId_factHash_cre_idx" ON "CovenantExplanation"("tenantId", "loanId", "covenantId", "factHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioRiskFactSnapshot_factHash_key" ON "PortfolioRiskFactSnapshot"("factHash");

-- CreateIndex
CREATE INDEX "PortfolioRiskFactSnapshot_tenantId_asOfDate_computedAt_idx" ON "PortfolioRiskFactSnapshot"("tenantId", "asOfDate", "computedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioRiskExplanation_explanationHash_key" ON "PortfolioRiskExplanation"("explanationHash");

-- CreateIndex
CREATE INDEX "PortfolioRiskExplanation_tenantId_portfolioId_factHash_crea_idx" ON "PortfolioRiskExplanation"("tenantId", "portfolioId", "factHash", "createdAt");

-- CreateIndex
CREATE INDEX "ImpactEvent_tenantId_detectedAt_idx" ON "ImpactEvent"("tenantId", "detectedAt");

-- CreateIndex
CREATE INDEX "ImpactEvent_tenantId_sourceType_sourceId_idx" ON "ImpactEvent"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ImpactEvent_correlationId_idx" ON "ImpactEvent"("correlationId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clause" ADD CONSTRAINT "Clause_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clause" ADD CONSTRAINT "Clause_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanScenario" ADD CONSTRAINT "LoanScenario_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanScenario" ADD CONSTRAINT "LoanScenario_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Covenant" ADD CONSTRAINT "Covenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Covenant" ADD CONSTRAINT "Covenant_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantTestResult" ADD CONSTRAINT "CovenantTestResult_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantTestResult" ADD CONSTRAINT "CovenantTestResult_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantTestResult" ADD CONSTRAINT "CovenantTestResult_covenantId_fkey" FOREIGN KEY ("covenantId") REFERENCES "Covenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingChecklistItem" ADD CONSTRAINT "TradingChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingChecklistItem" ADD CONSTRAINT "TradingChecklistItem_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingReadinessSnapshot" ADD CONSTRAINT "TradingReadinessSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingReadinessSnapshot" ADD CONSTRAINT "TradingReadinessSnapshot_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingReadinessFactSnapshot" ADD CONSTRAINT "TradingReadinessFactSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingReadinessFactSnapshot" ADD CONSTRAINT "TradingReadinessFactSnapshot_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingReadinessExplanation" ADD CONSTRAINT "TradingReadinessExplanation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingReadinessExplanation" ADD CONSTRAINT "TradingReadinessExplanation_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESGKpi" ADD CONSTRAINT "ESGKpi_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESGKpi" ADD CONSTRAINT "ESGKpi_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESGEvidence" ADD CONSTRAINT "ESGEvidence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESGEvidence" ADD CONSTRAINT "ESGEvidence_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESGEvidence" ADD CONSTRAINT "ESGEvidence_kpiId_fkey" FOREIGN KEY ("kpiId") REFERENCES "ESGKpi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESGVerification" ADD CONSTRAINT "ESGVerification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESGVerification" ADD CONSTRAINT "ESGVerification_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ESGVerification" ADD CONSTRAINT "ESGVerification_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "ESGEvidence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsgKpiFactSnapshot" ADD CONSTRAINT "EsgKpiFactSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsgKpiFactSnapshot" ADD CONSTRAINT "EsgKpiFactSnapshot_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsgKpiExplanation" ADD CONSTRAINT "EsgKpiExplanation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsgKpiExplanation" ADD CONSTRAINT "EsgKpiExplanation_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EsgKpiExplanation" ADD CONSTRAINT "EsgKpiExplanation_factHash_fkey" FOREIGN KEY ("factHash") REFERENCES "EsgKpiFactSnapshot"("factHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantEvaluationFactSnapshot" ADD CONSTRAINT "CovenantEvaluationFactSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantEvaluationFactSnapshot" ADD CONSTRAINT "CovenantEvaluationFactSnapshot_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantExplanation" ADD CONSTRAINT "CovenantExplanation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantExplanation" ADD CONSTRAINT "CovenantExplanation_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CovenantExplanation" ADD CONSTRAINT "CovenantExplanation_factHash_fkey" FOREIGN KEY ("factHash") REFERENCES "CovenantEvaluationFactSnapshot"("factHash") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioRiskFactSnapshot" ADD CONSTRAINT "PortfolioRiskFactSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioRiskExplanation" ADD CONSTRAINT "PortfolioRiskExplanation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioRiskExplanation" ADD CONSTRAINT "PortfolioRiskExplanation_factHash_fkey" FOREIGN KEY ("factHash") REFERENCES "PortfolioRiskFactSnapshot"("factHash") ON DELETE CASCADE ON UPDATE CASCADE;
