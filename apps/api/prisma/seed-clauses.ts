import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed clauses for loans 1-5
 * Each loan gets 4-5 relevant matching clauses
 */
async function main() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) throw new Error("No tenant found");

  // Get all loans for the tenant (process all loans, or specifically target first 5)
  const allLoans = await prisma.loan.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: "asc" },
    take: 5, // First 5 loans
  });

  if (allLoans.length === 0) {
    console.log("⚠️  No loans found for this tenant");
    return;
  }

  console.log(`Found ${allLoans.length} loan(s) to seed clauses for\n`);

  for (let loanIndex = 0; loanIndex < allLoans.length; loanIndex++) {
    const loan = allLoans[loanIndex];
    const loanId = loan.id;

    // Find or create a Facility Agreement document for this loan
    let document = await prisma.document.findFirst({
      where: {
        loanId: loan.id,
        tenantId: tenant.id,
        type: "FACILITY_AGREEMENT",
      },
    });

    if (!document) {
      document = await prisma.document.create({
        data: {
          tenantId: tenant.id,
          loanId: loan.id,
          type: "FACILITY_AGREEMENT",
          title: "Facility Agreement",
        },
      });
      console.log(`✅ Created document for loan ${loanId}`);
    }

    // Find or create document version v1
    let docVersion = await prisma.documentVersion.findFirst({
      where: {
        documentId: document.id,
        tenantId: tenant.id,
        version: 1,
      },
    });

    if (!docVersion) {
      docVersion = await prisma.documentVersion.create({
        data: {
          tenantId: tenant.id,
          documentId: document.id,
          version: 1,
          fileKey: `tenants/${tenant.id}/loans/${loanId}/documents/${document.id}/v1/facility_agreement.pdf`,
          fileName: "facility_agreement.pdf",
          contentType: "application/pdf",
        },
      });
      console.log(`✅ Created document version v1 for loan ${loanId}`);
    }

    // Check if clauses already exist for this document version
    const existingClauses = await prisma.clause.findMany({
      where: {
        documentVersionId: docVersion.id,
        tenantId: tenant.id,
      },
    });

    if (existingClauses.length >= 4) {
      console.log(`ℹ️  Loan ${loanId} already has ${existingClauses.length} clauses, skipping...`);
      continue;
    }

    // Define clauses based on loan index (different clauses for variety)
    const clauses = getClausesForLoan(loanIndex, loanId);

    // Create clauses
    for (const clauseData of clauses) {
      await prisma.clause.create({
        data: {
          tenantId: tenant.id,
          documentVersionId: docVersion.id,
          clauseRef: clauseData.clauseRef,
          title: clauseData.title,
          text: clauseData.text,
          riskTags: clauseData.riskTags,
        },
      });
    }

    console.log(`✅ Seeded ${clauses.length} clauses for loan ${loanId}`);
  }

  console.log(`\n✅ Completed seeding clauses for loans 1-5`);
}

/**
 * Get clauses for a specific loan index
 * Each loan gets 4-5 relevant, matching clauses
 */
function getClausesForLoan(loanIndex: number, loanId: string) {
  const baseClauses = [
    // Loan 1 (ACME-TERM-001) - Manufacturing focus
    [
      {
        clauseRef: `doc:${loanId}#p34`,
        title: "Margin and Pricing",
        text: "The margin shall be 175 basis points above EURIBOR. The margin is subject to adjustment based on the borrower's credit rating and financial performance metrics. Pricing adjustments occur quarterly based on covenant compliance.",
        riskTags: ["PRICING"],
      },
      {
        clauseRef: `doc:${loanId}#p112`,
        title: "Leverage Covenant",
        text: "The borrower shall maintain a Net Leverage Ratio not exceeding 3.5x. This ratio is calculated as Total Net Debt divided by EBITDA, tested quarterly. Breach of this covenant constitutes an Event of Default unless waived by Majority Lenders.",
        riskTags: ["COVENANT"],
      },
      {
        clauseRef: `doc:${loanId}#p141`,
        title: "Information Undertakings",
        text: "The borrower shall deliver quarterly compliance certificates and financial statements within 60 days of each quarter end. Annual audited accounts must be provided within 120 days of financial year end. All reports must be in the format specified in Schedule 5.",
        riskTags: ["REPORTING"],
      },
      {
        clauseRef: `doc:${loanId}#p188`,
        title: "Sustainability-Linked KPIs",
        text: "The borrower commits to reducing Scope 1 and Scope 2 emissions by 15% over the facility term. Renewable energy share must reach 30% by year 3. Annual ESG reports required with third-party verification.",
        riskTags: ["ESG"],
      },
      {
        clauseRef: `doc:${loanId}#p210`,
        title: "Events of Default",
        text: "Standard events of default include: non-payment of principal or interest, breach of financial covenants, material adverse change, insolvency proceedings, cross-default to other facilities exceeding $50 million.",
        riskTags: ["EOD"],
      },
    ],
    // Loan 2 (ACME-TERM-002) - Logistics focus
    [
      {
        clauseRef: `doc:${loanId}#p28`,
        title: "Interest Rate and Margin",
        text: "Interest rate is calculated as SONIA plus a margin of 200 basis points. The margin may be reduced by 25 basis points if the borrower achieves an investment-grade credit rating from a recognized rating agency.",
        riskTags: ["PRICING"],
      },
      {
        clauseRef: `doc:${loanId}#p95`,
        title: "Debt Service Coverage Ratio",
        text: "The borrower must maintain a minimum DSCR of 1.30x, calculated as EBITDA minus capital expenditures, divided by total debt service. This covenant is tested semi-annually with results reported within 45 days.",
        riskTags: ["COVENANT"],
      },
      {
        clauseRef: `doc:${loanId}#p132`,
        title: "Reporting Obligations",
        text: "Quarterly management accounts and compliance certificates due within 50 days. Annual audited financial statements within 90 days. Monthly operational metrics including fleet utilization and route performance.",
        riskTags: ["REPORTING"],
      },
      {
        clauseRef: `doc:${loanId}#p175`,
        title: "ESG Performance Metrics",
        text: "Target: Reduce fleet emissions intensity by 20% over 5 years. Achieve 25% electric vehicle adoption by year 4. Track and report Scope 3 emissions from logistics operations annually.",
        riskTags: ["ESG"],
      },
      {
        clauseRef: `doc:${loanId}#p198`,
        title: "Default Provisions",
        text: "Events of default include payment defaults, covenant breaches, material misrepresentations, change of control without consent, and cross-defaults to facilities exceeding £25 million.",
        riskTags: ["EOD"],
      },
    ],
    // Loan 3 (ACME-TERM-003) - Renewables focus
    [
      {
        clauseRef: `doc:${loanId}#p42`,
        title: "Pricing Structure",
        text: "Base rate is USD LIBOR (or successor rate) plus 225 basis points. Margin step-down available: 25 bps reduction if project achieves commercial operations date on schedule, and additional 25 bps if energy output exceeds 95% of forecast.",
        riskTags: ["PRICING"],
      },
      {
        clauseRef: `doc:${loanId}#p108`,
        title: "Interest Coverage Ratio",
        text: "Minimum Interest Coverage Ratio of 1.50x required, calculated as EBITDA divided by interest expense. Tested quarterly. Failure to meet this ratio triggers mandatory cash sweep to debt service reserve account.",
        riskTags: ["COVENANT"],
      },
      {
        clauseRef: `doc:${loanId}#p145`,
        title: "Information Requirements",
        text: "Quarterly project reports including energy generation data, availability metrics, and maintenance schedules. Annual technical audits by independent engineer. Monthly operational dashboards with real-time performance data.",
        riskTags: ["REPORTING"],
      },
      {
        clauseRef: `doc:${loanId}#p192`,
        title: "Renewable Energy Commitments",
        text: "Project must maintain renewable energy generation of at least 100 GWh annually. Track carbon offset certificates and renewable energy credits. Annual sustainability report with third-party verification of environmental impact.",
        riskTags: ["ESG"],
      },
      {
        clauseRef: `doc:${loanId}#p220`,
        title: "Events of Default and Remedies",
        text: "Default events include: payment defaults, failure to achieve commercial operations by specified date, material project delays exceeding 180 days, breach of environmental permits, and cross-defaults to project finance facilities.",
        riskTags: ["EOD"],
      },
    ],
    // Loan 4 (ACME-TERM-004) - General corporate
    [
      {
        clauseRef: `doc:${loanId}#p36`,
        title: "Interest and Fees",
        text: "Interest accrues at EURIBOR plus 190 basis points. Commitment fee of 50 basis points on undrawn amounts. Arrangement fee of 1.5% of facility amount payable at closing. Margin subject to annual review based on financial performance.",
        riskTags: ["PRICING"],
      },
      {
        clauseRef: `doc:${loanId}#p102`,
        title: "Financial Covenants",
        text: "Maintain Net Leverage Ratio below 4.0x and Interest Coverage Ratio above 2.0x. Both tested quarterly. Minimum liquidity of €15 million must be maintained at all times. Tangible net worth must not fall below €100 million.",
        riskTags: ["COVENANT"],
      },
      {
        clauseRef: `doc:${loanId}#p138`,
        title: "Financial Reporting",
        text: "Deliver quarterly unaudited financial statements within 55 days. Annual audited accounts within 100 days. Monthly management accounts for the first 12 months post-closing. All reports must comply with IFRS standards.",
        riskTags: ["REPORTING"],
      },
      {
        clauseRef: `doc:${loanId}#p185`,
        title: "ESG Framework",
        text: "Implement ESG policy within 6 months of closing. Annual ESG reporting with targets for energy efficiency (10% reduction), waste reduction (15% reduction), and diversity metrics (30% board diversity).",
        riskTags: ["ESG"],
      },
      {
        clauseRef: `doc:${loanId}#p215`,
        title: "Default and Acceleration",
        text: "Standard events of default: non-payment, covenant breach, material adverse change, insolvency, cross-default to facilities exceeding €30 million, and failure to maintain required insurance coverage.",
        riskTags: ["EOD"],
      },
    ],
    // Loan 5 (ACME-GREEN-005) - Green/Sustainability focus
    [
      {
        clauseRef: `doc:${loanId}#p40`,
        title: "Sustainability-Linked Pricing",
        text: "Base margin is 150 basis points above EURIBOR. Margin reduction of 25 bps available if borrower achieves annual ESG targets: 20% reduction in Scope 1+2 emissions, 40% renewable energy share, and maintains ESG rating of 'A' or higher from recognized agency.",
        riskTags: ["PRICING", "ESG"],
      },
      {
        clauseRef: `doc:${loanId}#p110`,
        title: "Green Covenant Requirements",
        text: "Borrower must maintain Net Leverage Ratio below 3.0x and demonstrate that at least 50% of capital expenditures are allocated to green/sustainable projects. Quarterly testing with annual third-party verification of green project allocation.",
        riskTags: ["COVENANT", "ESG"],
      },
      {
        clauseRef: `doc:${loanId}#p148`,
        title: "ESG Reporting Obligations",
        text: "Quarterly ESG performance reports due within 45 days, including emissions data, renewable energy metrics, and progress against sustainability targets. Annual comprehensive ESG report with third-party assurance required within 90 days of year-end.",
        riskTags: ["REPORTING", "ESG"],
      },
      {
        clauseRef: `doc:${loanId}#p200`,
        title: "Environmental Performance Targets",
        text: "Commitment to reduce carbon footprint by 30% over 5 years. Achieve 50% renewable energy by year 3. Maintain zero-waste-to-landfill status. Track and report on water usage, waste reduction, and biodiversity impact annually.",
        riskTags: ["ESG"],
      },
      {
        clauseRef: `doc:${loanId}#p225`,
        title: "Green Loan Default Provisions",
        text: "Events of default include: failure to meet annual ESG targets for two consecutive years, loss of green certification, material breach of environmental permits, misrepresentation of green project allocation, and standard payment/covenant defaults.",
        riskTags: ["EOD", "ESG"],
      },
    ],
  ];

  return baseClauses[loanIndex] || baseClauses[0];
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
