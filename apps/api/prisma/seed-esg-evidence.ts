import { PrismaClient, ESGEvidenceType, ESGVerificationStatus } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

const TENANT_ID = "acme-capital-001";

/**
 * Generate a deterministic file key for evidence
 */
function generateFileKey(loanId: string, kpiType: string, index: number): string {
  return `esg-evidence/${loanId}/${kpiType}-${index}-${Date.now()}.pdf`;
}

/**
 * Generate a checksum
 */
function generateChecksum(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function main() {
  console.log("🌱 Seeding ESG Evidence & Verification data...\n");

  // Get all loans with their ESG KPIs
  const loans = await prisma.loan.findMany({
    where: { tenantId: TENANT_ID },
    include: {
      esgKpis: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${loans.length} loans\n`);

  for (const loan of loans) {
    console.log(`📦 ${loan.id}: ${loan.borrower}`);
    console.log(`   ESG KPIs: ${loan.esgKpis.length}`);

    for (const kpi of loan.esgKpis) {
      // Determine evidence type based on KPI type
      let evidenceType: ESGEvidenceType = ESGEvidenceType.OTHER;
      let evidenceTitle = "";
      let evidenceSource = "Borrower";
      let verificationStatus: ESGVerificationStatus = ESGVerificationStatus.PENDING;

      switch (kpi.type) {
        case "EMISSIONS_SCOPE_1":
        case "EMISSIONS_SCOPE_2":
        case "EMISSIONS_SCOPE_3":
          evidenceType = ESGEvidenceType.REPORT;
          evidenceTitle = `GHG Emissions Report - ${new Date().getFullYear() - 1}`;
          evidenceSource = "Environmental Consultant";
          // Hero loan gets verified, others vary
          verificationStatus =
            loan.id === "ACME-TERM-001"
              ? ESGVerificationStatus.VERIFIED
              : loan.id === "ACME-REV-004"
                ? ESGVerificationStatus.NEEDS_REVIEW
                : ESGVerificationStatus.PENDING;
          break;

        case "RENEWABLE_ENERGY_PERCENT":
          evidenceType = ESGEvidenceType.CERTIFICATE;
          evidenceTitle = "Renewable Energy Certificate (REC)";
          evidenceSource = "Energy Provider";
          // Green loan gets verified
          verificationStatus =
            loan.id === "ACME-GREEN-005"
              ? ESGVerificationStatus.VERIFIED
              : ESGVerificationStatus.PENDING;
          break;

        case "ENERGY_INTENSITY":
          evidenceType = ESGEvidenceType.REPORT;
          evidenceTitle = "Energy Consumption Report";
          evidenceSource = "Facilities Manager";
          verificationStatus = ESGVerificationStatus.PENDING;
          break;

        case "WATER_USAGE":
          evidenceType = ESGEvidenceType.INVOICE;
          evidenceTitle = "Water Usage Invoice";
          evidenceSource = "Utility Provider";
          verificationStatus = ESGVerificationStatus.PENDING;
          break;

        case "WASTE_RECYCLED_PERCENT":
          evidenceType = ESGEvidenceType.REPORT;
          evidenceTitle = "Waste Management Report";
          evidenceSource = "Waste Management Company";
          verificationStatus = ESGVerificationStatus.PENDING;
          break;

        case "SAFETY_TRIR":
          evidenceType = ESGEvidenceType.REPORT;
          evidenceTitle = "Safety & Incident Report";
          evidenceSource = "Safety Officer";
          // Hero loan gets verified
          verificationStatus =
            loan.id === "ACME-TERM-001"
              ? ESGVerificationStatus.VERIFIED
              : ESGVerificationStatus.PENDING;
          break;

        case "DIVERSITY_PERCENT":
          evidenceType = ESGEvidenceType.REPORT;
          evidenceTitle = "Diversity & Inclusion Report";
          evidenceSource = "HR Department";
          verificationStatus = ESGVerificationStatus.PENDING;
          break;

        default:
          evidenceType = ESGEvidenceType.OTHER;
          evidenceTitle = `${kpi.title} Evidence`;
          evidenceSource = "Borrower";
          verificationStatus = ESGVerificationStatus.PENDING;
      }

      // Create evidence
      const evidence = await prisma.eSGEvidence.create({
        data: {
          tenantId: TENANT_ID,
          loanId: loan.id,
          kpiId: kpi.id,
          type: evidenceType,
          title: evidenceTitle,
          source: evidenceSource,
          periodStart: new Date(new Date().getFullYear() - 1, 0, 1),
          periodEnd: new Date(new Date().getFullYear() - 1, 11, 31),
          fileKey: generateFileKey(loan.id, kpi.type, 0),
          fileName: `${kpi.type}_${loan.id}_${new Date().getFullYear() - 1}.pdf`,
          contentType: "application/pdf",
          checksum: generateChecksum(),
        },
      });

      console.log(`   ✅ Created evidence: ${evidence.title}`);

      // Create verification
      const verification = await prisma.eSGVerification.create({
        data: {
          tenantId: TENANT_ID,
          loanId: loan.id,
          evidenceId: evidence.id,
          status: verificationStatus,
          confidence:
            verificationStatus === ESGVerificationStatus.VERIFIED
              ? 0.95
              : verificationStatus === ESGVerificationStatus.NEEDS_REVIEW
                ? 0.65
                : null,
          notes:
            verificationStatus === ESGVerificationStatus.VERIFIED
              ? "Verified by ESG team. Data matches reported values."
              : verificationStatus === ESGVerificationStatus.NEEDS_REVIEW
                ? "Discrepancy detected. Requires manual review."
                : "Pending verification by ESG team.",
        },
      });

      console.log(`   ✅ Created verification: ${verification.status}`);

      // For hero loan (ACME-TERM-001), add additional evidence for some KPIs
      if (loan.id === "ACME-TERM-001" && (kpi.type === "EMISSIONS_SCOPE_1" || kpi.type === "EMISSIONS_SCOPE_2")) {
        const additionalEvidence = await prisma.eSGEvidence.create({
          data: {
            tenantId: TENANT_ID,
            loanId: loan.id,
            kpiId: kpi.id,
            type: ESGEvidenceType.CERTIFICATE,
            title: `ISO 14001 Environmental Management Certificate`,
            source: "Certification Body",
            periodStart: new Date(new Date().getFullYear() - 1, 0, 1),
            periodEnd: new Date(new Date().getFullYear() + 1, 11, 31),
            fileKey: generateFileKey(loan.id, kpi.type, 1),
            fileName: `ISO14001_${loan.id}.pdf`,
            contentType: "application/pdf",
            checksum: generateChecksum(),
          },
        });

        await prisma.eSGVerification.create({
          data: {
            tenantId: TENANT_ID,
            loanId: loan.id,
            evidenceId: additionalEvidence.id,
            status: ESGVerificationStatus.VERIFIED,
            confidence: 1.0,
            notes: "ISO 14001 certification verified. Valid until end of next year.",
          },
        });

        console.log(`   ✅ Created additional evidence: ${additionalEvidence.title}`);
      }

      // For green loan (ACME-GREEN-005), add invoice evidence for renewable energy
      if (loan.id === "ACME-GREEN-005" && kpi.type === "RENEWABLE_ENERGY_PERCENT") {
        const invoiceEvidence = await prisma.eSGEvidence.create({
          data: {
            tenantId: TENANT_ID,
            loanId: loan.id,
            kpiId: kpi.id,
            type: ESGEvidenceType.INVOICE,
            title: "Renewable Energy Purchase Invoice",
            source: "Energy Provider",
            periodStart: new Date(new Date().getFullYear() - 1, 0, 1),
            periodEnd: new Date(new Date().getFullYear() - 1, 11, 31),
            fileKey: generateFileKey(loan.id, kpi.type, 1),
            fileName: `REC_Invoice_${loan.id}_${new Date().getFullYear() - 1}.pdf`,
            contentType: "application/pdf",
            checksum: generateChecksum(),
          },
        });

        await prisma.eSGVerification.create({
          data: {
            tenantId: TENANT_ID,
            loanId: loan.id,
            evidenceId: invoiceEvidence.id,
            status: ESGVerificationStatus.VERIFIED,
            confidence: 0.98,
            notes: "REC purchase verified. Matches reported renewable energy percentage.",
          },
        });

        console.log(`   ✅ Created additional evidence: ${invoiceEvidence.title}`);
      }
    }

    console.log();
  }

  console.log("✅ ESG Evidence & Verification data seeded successfully!\n");

  // Summary
  const evidenceCount = await prisma.eSGEvidence.count({
    where: { tenantId: TENANT_ID },
  });

  const verificationCount = await prisma.eSGVerification.count({
    where: { tenantId: TENANT_ID },
  });

  console.log(`📊 Summary:`);
  console.log(`   Evidence items: ${evidenceCount}`);
  console.log(`   Verifications: ${verificationCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
