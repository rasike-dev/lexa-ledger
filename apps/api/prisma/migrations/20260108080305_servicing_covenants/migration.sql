-- CreateEnum
CREATE TYPE "CovenantStatus" AS ENUM ('PASS', 'WARN', 'FAIL');

-- CreateEnum
CREATE TYPE "ScenarioMode" AS ENUM ('BASE', 'STRESS');

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
    "status" "CovenantStatus" NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "CovenantTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanScenario_loanId_key" ON "LoanScenario"("loanId");

-- CreateIndex
CREATE INDEX "LoanScenario_tenantId_idx" ON "LoanScenario"("tenantId");

-- CreateIndex
CREATE INDEX "Covenant_tenantId_idx" ON "Covenant"("tenantId");

-- CreateIndex
CREATE INDEX "Covenant_loanId_idx" ON "Covenant"("loanId");

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
