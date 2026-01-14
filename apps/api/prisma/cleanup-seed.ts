import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TENANT_ID = "acme-capital-001";
const TARGET_LOAN_IDS = [
  "ACME-TERM-001",
  "ACME-TERM-002",
  "ACME-TERM-003",
  "ACME-TERM-004",
  "ACME-GREEN-005",
];

/**
 * Cleanup script: Removes all loans and related data except the 5 target demo loans
 * This ensures a clean slate before seeding
 */
async function main() {
  console.log("🧹 Cleaning up old/duplicate data...\n");

  // Get tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: TENANT_ID },
  });

  if (!tenant) {
    console.log("⚠️  Tenant not found, nothing to clean");
    return;
  }

  // Get all loans for the tenant
  const allLoans = await prisma.loan.findMany({
    where: { tenantId: TENANT_ID },
    select: { id: true },
  });

  const loansToDelete = allLoans.filter((loan) => !TARGET_LOAN_IDS.includes(loan.id));

  if (loansToDelete.length === 0) {
    console.log("✅ No duplicate loans to clean up");
    console.log(`   Keeping: ${TARGET_LOAN_IDS.join(", ")}`);
    return;
  }

  console.log(`📋 Found ${loansToDelete.length} loan(s) to delete:`);
  loansToDelete.forEach((loan) => console.log(`   - ${loan.id}`));

  // Delete loans (cascade will handle related data)
  for (const loan of loansToDelete) {
    await prisma.loan.delete({
      where: { id: loan.id },
    });
    console.log(`   ✅ Deleted loan: ${loan.id}`);
  }

  console.log(`\n✅ Cleanup complete. Kept ${TARGET_LOAN_IDS.length} target loans.`);
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
