-- CreateEnum
CREATE TYPE "TradingItemStatus" AS ENUM ('OPEN', 'DONE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ReadinessBand" AS ENUM ('RED', 'AMBER', 'GREEN');

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

-- CreateIndex
CREATE INDEX "TradingChecklistItem_tenantId_idx" ON "TradingChecklistItem"("tenantId");

-- CreateIndex
CREATE INDEX "TradingChecklistItem_loanId_idx" ON "TradingChecklistItem"("loanId");

-- CreateIndex
CREATE INDEX "TradingChecklistItem_status_idx" ON "TradingChecklistItem"("status");

-- CreateIndex
CREATE INDEX "TradingChecklistItem_category_idx" ON "TradingChecklistItem"("category");

-- CreateIndex
CREATE UNIQUE INDEX "TradingChecklistItem_tenantId_loanId_code_key" ON "TradingChecklistItem"("tenantId", "loanId", "code");

-- CreateIndex
CREATE INDEX "TradingReadinessSnapshot_tenantId_idx" ON "TradingReadinessSnapshot"("tenantId");

-- CreateIndex
CREATE INDEX "TradingReadinessSnapshot_loanId_idx" ON "TradingReadinessSnapshot"("loanId");

-- CreateIndex
CREATE INDEX "TradingReadinessSnapshot_computedAt_idx" ON "TradingReadinessSnapshot"("computedAt");

-- AddForeignKey
ALTER TABLE "TradingChecklistItem" ADD CONSTRAINT "TradingChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingChecklistItem" ADD CONSTRAINT "TradingChecklistItem_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingReadinessSnapshot" ADD CONSTRAINT "TradingReadinessSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradingReadinessSnapshot" ADD CONSTRAINT "TradingReadinessSnapshot_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
