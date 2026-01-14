import { PrismaClient, ScenarioMode, CovenantTestStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // pick a tenant + one or more loans
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");

  const loans = await prisma.loan.findMany({ where: { tenantId: tenant.id } });
  if (!loans.length) throw new Error("No loans found");

  for (const loan of loans) {
    // scenario row
    await prisma.loanScenario.upsert({
      where: { loanId: loan.id },
      update: {},
      create: { tenantId: tenant.id, loanId: loan.id, mode: ScenarioMode.BASE },
    });

    // covenants
    const dscr = await prisma.covenant.upsert({
      where: { tenantId_loanId_code: { tenantId: tenant.id, loanId: loan.id, code: "DSCR_MIN" } },
      update: {},
      create: {
        tenantId: tenant.id,
        loanId: loan.id,
        code: "DSCR_MIN",
        title: "Debt Service Coverage Ratio (DSCR)",
        description: "Minimum DSCR to be maintained quarterly.",
        threshold: 1.25,
        unit: "x",
        metric: "DSCR",
        operator: "GTE",
      },
    });

    const liquidity = await prisma.covenant.upsert({
      where: { tenantId_loanId_code: { tenantId: tenant.id, loanId: loan.id, code: "LIQ_MIN" } },
      update: {},
      create: {
        tenantId: tenant.id,
        loanId: loan.id,
        code: "LIQ_MIN",
        title: "Minimum Liquidity",
        description: "Minimum cash and cash equivalents.",
        threshold: 20000000,
        unit: "USD",
        metric: "LIQUIDITY",
        operator: "GTE",
      },
    });

    // results BASE vs STRESS
    await prisma.covenantTestResult.createMany({
      data: [
        {
          tenantId: tenant.id,
          loanId: loan.id,
          covenantId: dscr.id,
          scenario: ScenarioMode.BASE,
          value: 1.32,
          status: CovenantTestStatus.PASS,
          notes: "Base case meets threshold",
        },
        {
          tenantId: tenant.id,
          loanId: loan.id,
          covenantId: dscr.id,
          scenario: ScenarioMode.STRESS,
          value: 1.10,
          status: CovenantTestStatus.FAIL,
          notes: "Stress case breaches DSCR",
        },
        {
          tenantId: tenant.id,
          loanId: loan.id,
          covenantId: liquidity.id,
          scenario: ScenarioMode.BASE,
          value: 24000000,
          status: CovenantTestStatus.PASS,
          notes: "Base liquidity healthy",
        },
        {
          tenantId: tenant.id,
          loanId: loan.id,
          covenantId: liquidity.id,
          scenario: ScenarioMode.STRESS,
          value: 18000000,
          status: CovenantTestStatus.FAIL,
          notes: "Stress liquidity below minimum",
        },
      ],
      skipDuplicates: true,
    });

    await prisma.auditEvent.create({
      data: {
        tenantId: tenant.id,
        type: "SERVICING_SEEDED",
        summary: `Seeded servicing covenants for loan ${loan.id}`,
        payload: { loanId: loan.id },
      },
    });
  }

  console.log(`✅ Seeded servicing data for ${loans.length} loan(s)`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

