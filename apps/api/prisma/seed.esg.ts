import { PrismaClient, ESGKpiType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");

  const loans = await prisma.loan.findMany({ where: { tenantId: tenant.id } });
  if (!loans.length) throw new Error("No loans found");

  for (const loan of loans) {
    // Check if Scope 1 Emissions KPI already exists
    const exists1 = await prisma.eSGKpi.findFirst({
      where: { tenantId: tenant.id, loanId: loan.id, type: ESGKpiType.EMISSIONS_SCOPE_1 },
    });
    if (!exists1) {
      await prisma.eSGKpi.create({
        data: {
          tenantId: tenant.id,
          loanId: loan.id,
          type: ESGKpiType.EMISSIONS_SCOPE_1,
          title: "Scope 1 Emissions",
          unit: "tCO2e",
          target: 1200,
          current: 1450,
          asOfDate: new Date(),
        },
      });
    }

    // Check if Renewable Energy % KPI already exists
    const exists2 = await prisma.eSGKpi.findFirst({
      where: { tenantId: tenant.id, loanId: loan.id, type: ESGKpiType.RENEWABLE_ENERGY_PERCENT },
    });
    if (!exists2) {
      await prisma.eSGKpi.create({
        data: {
          tenantId: tenant.id,
          loanId: loan.id,
          type: ESGKpiType.RENEWABLE_ENERGY_PERCENT,
          title: "Renewable Energy %",
          unit: "%",
          target: 60,
          current: 42,
          asOfDate: new Date(),
        },
      });
    }

    // Check if Water Usage KPI already exists
    const exists3 = await prisma.eSGKpi.findFirst({
      where: { tenantId: tenant.id, loanId: loan.id, type: ESGKpiType.WATER_USAGE },
    });
    if (!exists3) {
      await prisma.eSGKpi.create({
        data: {
          tenantId: tenant.id,
          loanId: loan.id,
          type: ESGKpiType.WATER_USAGE,
          title: "Water Usage",
          unit: "m³",
          target: 50000,
          current: 62000,
          asOfDate: new Date(),
        },
      });
    }

    // Check if Waste Recycled % KPI already exists
    const exists4 = await prisma.eSGKpi.findFirst({
      where: { tenantId: tenant.id, loanId: loan.id, type: ESGKpiType.WASTE_RECYCLED_PERCENT },
    });
    if (!exists4) {
      await prisma.eSGKpi.create({
        data: {
          tenantId: tenant.id,
          loanId: loan.id,
          type: ESGKpiType.WASTE_RECYCLED_PERCENT,
          title: "Waste Recycled %",
          unit: "%",
          target: 75,
          current: 68,
          asOfDate: new Date(),
        },
      });
    }

    await prisma.auditEvent.create({
      data: {
        tenantId: tenant.id,
        type: "ESG_SEEDED",
        summary: `Seeded ESG KPIs for loan ${loan.id}`,
        payload: { loanId: loan.id },
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("✅ ESG KPIs seeded successfully");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

