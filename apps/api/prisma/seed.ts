import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const TENANT_ID = "acme-capital-001";

async function main() {
  // 1) Create or get Tenant with consistent ID
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

  // 2) Create or get Dev User
  const user = await prisma.user.upsert({
    where: { email: "dev@lexa.local" },
    update: { name: "dev-user" },
    create: { email: "dev@lexa.local", name: "dev-user" },
  });

  // 3) Create membership as ORG_ADMIN
  await prisma.membership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
    update: { role: UserRole.ORG_ADMIN },
    create: { tenantId: tenant.id, userId: user.id, role: UserRole.ORG_ADMIN },
  });

  // 4) Create demo loan (stable ID for frontend)
  const loan = await prisma.loan.upsert({
    where: { id: "ACME-TERM-001" },
    update: {
      tenantId: tenant.id,
      borrower: "Acme Manufacturing Ltd",
      agentBank: "Example Agent Bank",
      currency: "USD",
      facilityAmount: BigInt(250_000_000),
      marginBps: 325,
      status: "Active",
      lastUpdatedAt: new Date(),
    },
    create: {
      id: "ACME-TERM-001",
      tenantId: tenant.id,
      borrower: "Acme Manufacturing Ltd",
      agentBank: "Example Agent Bank",
      currency: "USD",
      facilityAmount: BigInt(250_000_000),
      marginBps: 325,
      status: "Active",
      lastUpdatedAt: new Date(),
    },
  });

  // 5) Seed audit events (shape matches your AuditTimeline)
  // We'll keep types simple strings for now; later they become enums.
  const now = new Date();
  const events = [
    {
      type: "LOAN_INGESTED",
      summary: "Loan ingested and baseline entities created",
      evidenceRef: null,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
    },
    {
      type: "DOCUMENT_UPLOADED",
      summary: "Uploaded Facility Agreement v1",
      evidenceRef: "docver_demo_001",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1),
    },
    {
      type: "READINESS_COMPUTED",
      summary: "Trading readiness score computed (initial)",
      evidenceRef: null,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 6),
    },
    {
      type: "ESG_EVIDENCE_ADDED",
      summary: "ESG evidence pack added for verification",
      evidenceRef: "evidence_demo_001",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 2),
    },
  ];

  // Insert events idempotently by (tenantId, type, summary, createdAt)
  // (simple approach for seed; good enough)
  for (const e of events) {
    await prisma.auditEvent.create({
      data: {
        tenantId: tenant.id,
        actorId: user.id,
        type: e.type,
        summary: e.summary,
        evidenceRef: e.evidenceRef ?? undefined,
        createdAt: e.createdAt,
        payload: {
          loanId: loan.id,
        },
      },
    });
  }

  // Print info you need for frontend env
  console.log("✅ Seed complete");
  console.log("TENANT_ID:", tenant.id);
  console.log("DEV_USER:", user.email);
  console.log("DEMO_LOAN_ID:", loan.id);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

