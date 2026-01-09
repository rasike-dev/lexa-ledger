-- CreateEnum
CREATE TYPE "ESGKpiType" AS ENUM ('EMISSIONS_SCOPE_1', 'EMISSIONS_SCOPE_2', 'EMISSIONS_SCOPE_3', 'RENEWABLE_ENERGY_PERCENT', 'ENERGY_INTENSITY', 'WATER_USAGE', 'WASTE_RECYCLED_PERCENT', 'SAFETY_TRIR', 'DIVERSITY_PERCENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ESGEvidenceType" AS ENUM ('REPORT', 'CERTIFICATE', 'INVOICE', 'AUDIT', 'POLICY', 'OTHER');

-- CreateEnum
CREATE TYPE "ESGVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'NEEDS_REVIEW', 'REJECTED');

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

-- CreateIndex
CREATE INDEX "ESGKpi_tenantId_idx" ON "ESGKpi"("tenantId");

-- CreateIndex
CREATE INDEX "ESGKpi_loanId_idx" ON "ESGKpi"("loanId");

-- CreateIndex
CREATE INDEX "ESGKpi_type_idx" ON "ESGKpi"("type");

-- CreateIndex
CREATE INDEX "ESGEvidence_tenantId_idx" ON "ESGEvidence"("tenantId");

-- CreateIndex
CREATE INDEX "ESGEvidence_loanId_idx" ON "ESGEvidence"("loanId");

-- CreateIndex
CREATE INDEX "ESGEvidence_kpiId_idx" ON "ESGEvidence"("kpiId");

-- CreateIndex
CREATE INDEX "ESGEvidence_uploadedAt_idx" ON "ESGEvidence"("uploadedAt");

-- CreateIndex
CREATE INDEX "ESGVerification_tenantId_idx" ON "ESGVerification"("tenantId");

-- CreateIndex
CREATE INDEX "ESGVerification_loanId_idx" ON "ESGVerification"("loanId");

-- CreateIndex
CREATE INDEX "ESGVerification_evidenceId_idx" ON "ESGVerification"("evidenceId");

-- CreateIndex
CREATE INDEX "ESGVerification_status_idx" ON "ESGVerification"("status");

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
