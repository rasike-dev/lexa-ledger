import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TENANT_ID = "acme-capital-001";
const EXPECTED_LOAN_IDS = [
  "ACME-TERM-001",
  "ACME-TERM-002",
  "ACME-TERM-003",
  "ACME-TERM-004",
  "ACME-GREEN-005",
];

/**
 * Validate that all seed data is complete and consistent
 */
async function main() {
  console.log("🔍 Validating seed data consistency...\n");

  let hasErrors = false;

  // 1. Check tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: TENANT_ID },
  });

  if (!tenant) {
    console.error(`❌ Tenant ${TENANT_ID} not found`);
    hasErrors = true;
  } else {
    console.log(`✅ Tenant ${TENANT_ID} exists`);
  }

  // 2. Check all loans exist
  const loans = await prisma.loan.findMany({
    where: { tenantId: TENANT_ID },
  });

  console.log(`\n📋 Loans:`);
  for (const expectedId of EXPECTED_LOAN_IDS) {
    const loan = loans.find((l) => l.id === expectedId);
    if (!loan) {
      console.error(`   ❌ Missing: ${expectedId}`);
      hasErrors = true;
    } else {
      console.log(`   ✅ ${expectedId}: ${loan.borrower}`);
    }
  }

  // 3. Check data completeness for each loan
  console.log(`\n📊 Data Completeness:`);
  for (const loanId of EXPECTED_LOAN_IDS) {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) continue;

    // Get document versions for this loan to count clauses
    const documents = await prisma.document.findMany({
      where: { tenantId: TENANT_ID, loanId },
      include: { versions: { include: { clauses: true } } },
    });
    const clausesCount = documents.reduce(
      (sum, doc) => sum + doc.versions.reduce((vSum, ver) => vSum + ver.clauses.length, 0),
      0,
    );

    const checks = {
      covenants: await prisma.covenant.count({ where: { loanId } }),
      tradingChecklist: await prisma.tradingChecklistItem.count({ where: { loanId } }),
      esgKpis: await prisma.eSGKpi.count({ where: { loanId } }),
      clauses: clausesCount,
      esgEvidence: await prisma.eSGEvidence.count({ where: { loanId } }),
      auditEvents: await prisma.auditEvent.count({
        where: { tenantId: TENANT_ID, evidenceRef: loanId },
      }),
    };

    console.log(`\n   ${loanId}:`);
    console.log(`      Covenants: ${checks.covenants} ${checks.covenants >= 2 ? "✅" : "⚠️"}`);
    console.log(`      Trading Checklist: ${checks.tradingChecklist} ${checks.tradingChecklist > 0 ? "✅" : "⚠️"}`);
    console.log(`      ESG KPIs: ${checks.esgKpis} ${checks.esgKpis >= 4 ? "✅" : "⚠️"}`);
    console.log(`      Clauses: ${checks.clauses} ${checks.clauses >= 4 ? "✅" : "⚠️"}`);
    console.log(`      ESG Evidence: ${checks.esgEvidence} ${checks.esgEvidence > 0 ? "✅" : "⚠️"}`);
    console.log(`      Audit Events: ${checks.auditEvents} ${checks.auditEvents >= 5 ? "✅" : "⚠️"}`);

    if (
      checks.covenants < 2 ||
      checks.tradingChecklist === 0 ||
      checks.esgKpis < 4 ||
      checks.clauses < 4 ||
      checks.esgEvidence === 0 ||
      checks.auditEvents < 5
    ) {
      hasErrors = true;
    }
  }

  // 4. Summary
  console.log(`\n${hasErrors ? "❌" : "✅"} Validation ${hasErrors ? "failed" : "passed"}`);

  if (hasErrors) {
    console.log("\n💡 Run 'pnpm seed:all' to populate missing data");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("❌ Validation failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
