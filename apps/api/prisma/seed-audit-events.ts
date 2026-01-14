/**
 * Seed Comprehensive Audit Events for All Loans
 * 
 * Creates realistic audit trail for all loans covering:
 * - Loan creation
 * - Document ingestion
 * - Trading readiness computation
 * - Explanation generation
 * - Covenant evaluations
 * - ESG updates
 * - Amendments
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const tenantId = "acme-capital-001";

// User IDs (from existing users)
const getUserIds = async () => {
  const users = await prisma.user.findMany({
    where: {
      memberships: {
        some: { tenantId },
      },
    },
    take: 3,
  });
  return users.map(u => u.id);
};

async function main() {
  console.log("🌱 Seeding comprehensive audit events for all loans...\n");

  const userIds = await getUserIds();
  if (userIds.length === 0) {
    console.log("❌ No users found for tenant. Please seed users first.");
    return;
  }

  const loans = await prisma.loan.findMany({
    where: { tenantId },
  });

  console.log(`Found ${loans.length} loans to seed audit events for\n`);

  let totalCreated = 0;

  for (const loan of loans) {
    const loanEvents = await prisma.auditEvent.count({
      where: { tenantId, evidenceRef: loan.id },
    });

    if (loanEvents > 10) {
      console.log(`✓ ${loan.id}: Already has ${loanEvents} events, skipping...`);
      continue;
    }

    console.log(`📝 Creating audit events for ${loan.id}...`);

    const actorUserId = userIds[Math.floor(Math.random() * userIds.length)];
    const baseTime = new Date();
    baseTime.setDate(baseTime.getDate() - 30); // Start 30 days ago

    const events = [];

    // 1. Loan Creation
    events.push({
      tenantId,
      type: "LOAN_CREATED",
      summary: `Loan ${loan.id} created for borrower ${loan.borrower}`,
      evidenceRef: loan.id,
      actorType: "USER",
      actorUserId: actorUserId,
      actorClientId: null,
      actorRoles: [],
      createdAt: new Date(baseTime.getTime() - 25 * 24 * 60 * 60 * 1000),
      payload: {
        loanId: loan.id,
        borrower: loan.borrower,
        agentBank: loan.agentBank,
        currency: loan.currency,
        facilityAmount: loan.facilityAmount.toString(),
      },
    });

    // 2. Document Ingestion
    events.push({
      tenantId,
      type: "DOCUMENT_INGESTED",
      summary: `Facility Agreement ingested for ${loan.id}`,
      evidenceRef: loan.id,
      actorType: "SERVICE",
      actorUserId: null,
      actorClientId: "document-extractor",
      actorRoles: [],
      createdAt: new Date(baseTime.getTime() - 24 * 24 * 60 * 60 * 1000),
      payload: {
        loanId: loan.id,
        documentType: "FACILITY_AGREEMENT",
        pages: 287,
        clausesExtracted: 142,
      },
    });

    // 3. Trading Readiness Computation
    const factSnapshot = await prisma.tradingReadinessFactSnapshot.findFirst({
      where: { loanId: loan.id },
      orderBy: { computedAt: "desc" },
    });

    if (factSnapshot) {
      events.push({
        tenantId,
        type: "TRADING_READINESS_COMPUTED",
        summary: `Trading readiness computed: ${factSnapshot.readinessScore}/100 (${factSnapshot.readinessBand})`,
        evidenceRef: loan.id,
        actorType: "SERVICE",
        actorUserId: null,
        actorClientId: "trading-readiness-engine",
        actorRoles: [],
        createdAt: factSnapshot.computedAt,
        correlationId: factSnapshot.correlationId || null,
        payload: {
          loanId: loan.id,
          readinessScore: factSnapshot.readinessScore,
          readinessBand: factSnapshot.readinessBand,
          factHash: factSnapshot.factHash,
        },
      });

      // 4. Trading Readiness Explanation
      const explanation = await prisma.tradingReadinessExplanation.findFirst({
        where: { loanId: loan.id },
        orderBy: { createdAt: "desc" },
      });

      if (explanation) {
        events.push({
          tenantId,
          type: "TRADING_READINESS_EXPLAIN_REQUESTED",
          summary: `Trading readiness explanation generated (${explanation.verbosity} verbosity)`,
          evidenceRef: loan.id,
          actorType: "USER",
          actorUserId: actorUserId,
          actorClientId: null,
          actorRoles: [],
          createdAt: explanation.createdAt,
          correlationId: explanation.correlationId || null,
          payload: {
            loanId: loan.id,
            factHash: explanation.factHash,
            verbosity: explanation.verbosity,
            audience: explanation.audience,
          },
        });
      }
    }

    // 5. Covenant Evaluations
    const covenants = await prisma.covenant.findMany({
      where: { loanId: loan.id },
      take: 3,
    }).catch(() => []);

    covenants.forEach((covenant, idx) => {
      events.push({
        tenantId,
        type: "COVENANT_EVALUATED",
        summary: `Covenant ${covenant.metric} evaluated: ${covenant.status || 'N/A'}`,
        evidenceRef: loan.id,
        actorType: "SERVICE",
        actorUserId: null,
        actorClientId: "covenant-engine",
        actorRoles: [],
        createdAt: new Date(baseTime.getTime() - (20 - idx * 2) * 24 * 60 * 60 * 1000),
        payload: {
          loanId: loan.id,
          covenantId: covenant.id,
          metric: covenant.metric,
          status: covenant.status || null,
          thresholdValue: covenant.thresholdValue?.toString() || null,
        },
      });
    });

    // 6. ESG KPI Updates
    const esgKpis = await prisma.eSGKpi.findMany({
      where: { loanId: loan.id },
      take: 2,
    }).catch(() => []);

    esgKpis.forEach((kpi, idx) => {
      events.push({
        tenantId,
        type: "ESG_KPI_UPDATED",
        summary: `ESG KPI ${kpi.name || 'Unknown'} updated: ${kpi.status || 'N/A'}`,
        evidenceRef: loan.id,
        actorType: "USER",
        actorUserId: actorUserId,
        actorClientId: null,
        actorRoles: [],
        createdAt: new Date(baseTime.getTime() - (15 - idx * 3) * 24 * 60 * 60 * 1000),
        payload: {
          loanId: loan.id,
          kpiId: kpi.id,
          kpiName: kpi.name || null,
          status: kpi.status || null,
        },
      });
    });

    // 7. Document Amendment
    events.push({
      tenantId,
      type: "DOCUMENT_AMENDED",
      summary: `Amendment #1 executed for ${loan.id}`,
      evidenceRef: loan.id,
      actorType: "USER",
      actorUserId: actorUserId,
      actorClientId: null,
      actorRoles: [],
      createdAt: new Date(baseTime.getTime() - 10 * 24 * 60 * 60 * 1000),
      payload: {
        loanId: loan.id,
        amendmentNumber: 1,
        description: "Financial covenant threshold adjustment",
      },
    });

    // 8. Trading Recompute Request
    events.push({
      tenantId,
      type: "TRADING_RECOMPUTE_REQUESTED",
      summary: `Trading readiness recompute requested for ${loan.id}`,
      evidenceRef: loan.id,
      actorType: "USER",
      actorUserId: actorUserId,
      actorClientId: null,
      actorRoles: [],
      createdAt: new Date(baseTime.getTime() - 5 * 24 * 60 * 60 * 1000),
      payload: {
        loanId: loan.id,
        reason: "Manual refresh requested",
      },
    });

    // Create all events
    for (const event of events) {
      try {
        await prisma.auditEvent.create({
          data: event as any,
        });
        totalCreated++;
      } catch (error: any) {
        // Skip if duplicate or constraint violation
        if (!error.message.includes('Unique constraint') && !error.message.includes('duplicate')) {
          console.error(`  ⚠️  Failed to create event: ${error.message}`);
        }
      }
    }

    console.log(`  ✅ Created ${events.length} events for ${loan.id}`);
  }

  console.log(`\n✨ Total audit events created: ${totalCreated}`);
  console.log(`\n💡 Audit viewer should now show events for all loans.`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
