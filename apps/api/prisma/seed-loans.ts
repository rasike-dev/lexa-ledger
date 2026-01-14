import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TENANT_ID = "acme-capital-001";

/**
 * Seed 5 demo loans with consistent IDs
 * These loans are referenced by other seed scripts
 */
async function main() {
  console.log("🌱 Seeding demo loans...\n");

  // Ensure tenant exists
  let tenant = await prisma.tenant.findUnique({
    where: { id: TENANT_ID },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        id: TENANT_ID,
        name: "ACME Capital",
      },
    });
    console.log(`✅ Created tenant: ${TENANT_ID}`);
  } else {
    console.log(`✓ Tenant ${TENANT_ID} already exists`);
  }

  // Define the 5 demo loans
  const loans = [
    {
      id: "ACME-TERM-001",
      borrower: "Acme Manufacturing Ltd",
      agentBank: "Example Agent Bank",
      currency: "USD",
      facilityAmount: BigInt(250_000_000),
      marginBps: 325,
      status: "Active",
    },
    {
      id: "ACME-TERM-002",
      borrower: "Global Logistics Corp",
      agentBank: "Example Agent Bank",
      currency: "EUR",
      facilityAmount: BigInt(180_000_000),
      marginBps: 275,
      status: "Active",
    },
    {
      id: "ACME-TERM-003",
      borrower: "Renewable Energy Partners",
      agentBank: "Example Agent Bank",
      currency: "GBP",
      facilityAmount: BigInt(120_000_000),
      marginBps: 225,
      status: "Active",
    },
    {
      id: "ACME-TERM-004",
      borrower: "Corporate Holdings Inc",
      agentBank: "Example Agent Bank",
      currency: "USD",
      facilityAmount: BigInt(300_000_000),
      marginBps: 350,
      status: "Active",
    },
    {
      id: "ACME-GREEN-005",
      borrower: "Sustainable Ventures Ltd",
      agentBank: "Example Agent Bank",
      currency: "EUR",
      facilityAmount: BigInt(150_000_000),
      marginBps: 200,
      status: "Active",
    },
  ];

  let created = 0;
  let updated = 0;

  for (const loanData of loans) {
    const existing = await prisma.loan.findUnique({
      where: { id: loanData.id },
    });

    if (existing) {
      await prisma.loan.update({
        where: { id: loanData.id },
        data: {
          tenantId: tenant.id,
          borrower: loanData.borrower,
          agentBank: loanData.agentBank,
          currency: loanData.currency,
          facilityAmount: loanData.facilityAmount,
          marginBps: loanData.marginBps,
          status: loanData.status,
          lastUpdatedAt: new Date(),
        },
      });
      updated++;
      console.log(`✓ Updated loan: ${loanData.id}`);
    } else {
      await prisma.loan.create({
        data: {
          id: loanData.id,
          tenantId: tenant.id,
          borrower: loanData.borrower,
          agentBank: loanData.agentBank,
          currency: loanData.currency,
          facilityAmount: loanData.facilityAmount,
          marginBps: loanData.marginBps,
          status: loanData.status,
          lastUpdatedAt: new Date(),
        },
      });
      created++;
      console.log(`✅ Created loan: ${loanData.id} - ${loanData.borrower}`);
    }
  }

  console.log(`\n✅ Loan seeding complete:`);
  console.log(`   Created: ${created}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Total: ${loans.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
