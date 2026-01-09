import { PrismaClient, TradingItemStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");

  const loans = await prisma.loan.findMany({ where: { tenantId: tenant.id } });
  if (!loans.length) throw new Error("No loans found");

  // v1 checklist set (deterministic, portable)
  const template = [
    { code: "DOCS.FACILITY_AGREEMENT", title: "Facility Agreement uploaded", category: "DOCUMENTS", weight: 20 },
    { code: "DOCS.AMENDMENTS_TRACKED", title: "Amendments tracked & versioned", category: "DOCUMENTS", weight: 10 },
    { code: "SERVICING.COVENANTS_MODELED", title: "Covenants modeled & tested", category: "SERVICING", weight: 20 },
    { code: "SERVICING.SCENARIOS_READY", title: "Base/Stress scenarios available", category: "SERVICING", weight: 10 },
    { code: "ESG.KPIS_PRESENT", title: "ESG KPIs present with evidence", category: "ESG", weight: 10 },
    { code: "KYC.BORROWER_VERIFIED", title: "Borrower KYC verified", category: "KYC", weight: 10 },
    { code: "DATA.AUDIT_TRAIL_OK", title: "Audit trail complete for key actions", category: "DATA", weight: 10 },
  ] as const;

  for (const loan of loans) {
    for (const item of template) {
      await prisma.tradingChecklistItem.upsert({
        where: { tenantId_loanId_code: { tenantId: tenant.id, loanId: loan.id, code: item.code } },
        update: {},
        create: {
          tenantId: tenant.id,
          loanId: loan.id,
          code: item.code,
          title: item.title,
          category: item.category,
          weight: item.weight,
          status: TradingItemStatus.OPEN,
        },
      });
    }

    await prisma.auditEvent.create({
      data: {
        tenantId: tenant.id,
        type: "TRADING_SEEDED",
        summary: `Seeded trading checklist for loan ${loan.id}`,
        payload: { loanId: loan.id },
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

