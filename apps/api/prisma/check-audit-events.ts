import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const tenantId = "acme-capital-001";
  
  const count = await prisma.auditEvent.count({
    where: { tenantId },
  });
  
  console.log(`Total audit events for tenant ${tenantId}: ${count}`);
  
  if (count > 0) {
    const sample = await prisma.auditEvent.findMany({
      where: { tenantId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        summary: true,
        evidenceRef: true,
        createdAt: true,
      },
    });
    
    console.log("\nSample events:");
    sample.forEach(e => {
      console.log(`  - ${e.type} (${e.evidenceRef || 'no ref'}) - ${e.summary}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
