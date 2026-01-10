import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TenantContext } from "../tenant/tenant-context";
import { ReadinessBand, ScenarioMode } from "@prisma/client";

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContext,
  ) {}

  private higherIsBetterKpiTypes = new Set<string>([
    "RENEWABLE_ENERGY_PERCENT",
    "WASTE_RECYCLED_PERCENT",
    "DIVERSITY_PERCENT",
  ]);

  private kpiOffTrack(type: string, target: number, current: number) {
    // deterministic v1 rule (AI-ready later):
    // - higher-is-better types: offTrack if current < target
    // - otherwise: offTrack if current > target (lower is better)
    if (this.higherIsBetterKpiTypes.has(type)) return current < target;
    return current > target;
  }

  async getPortfolioLoans() {
    // Tenant filtering is automatic via Prisma middleware
    const loans = await this.prisma.loan.findMany({
      where: {},
      orderBy: { lastUpdatedAt: "desc" },
      select: {
        id: true,
        borrower: true,
        currency: true,
        facilityAmount: true,
        status: true,
        lastUpdatedAt: true,
      },
    });

    const result = [];

    for (const loan of loans) {
      // ---------------- Documents ----------------
      const documentCount = await this.prisma.document.count({
        where: { loanId: loan.id },
      });

      const facilityAgreement = await this.prisma.document.findFirst({
        where: { loanId: loan.id, type: "FACILITY_AGREEMENT" as any },
        orderBy: { createdAt: "desc" },
        include: {
          versions: { orderBy: { version: "desc" }, take: 1 },
        },
      });

      const latestFacilityAgreementVersion = facilityAgreement?.versions?.[0]?.version ?? null;

      // ---------------- Servicing ----------------
      const scenarioRow = await this.prisma.loanScenario.findUnique({
        where: { loanId: loan.id },
      });

      const scenario = scenarioRow?.mode ?? ScenarioMode.BASE;

      const lastTest = await this.prisma.covenantTestResult.findFirst({
        where: { loanId: loan.id, scenario },
        orderBy: { testedAt: "desc" },
        select: { testedAt: true },
      });

      // Count failing covenants (latest per covenant, current scenario)
      const recentResults = await this.prisma.covenantTestResult.findMany({
        where: { loanId: loan.id, scenario },
        orderBy: { testedAt: "desc" },
        take: 200, // safe for demo; enough to cover latest-per-covenant
        select: { covenantId: true, status: true },
      });

      const seen = new Set<string>();
      let failingCount = 0;
      for (const r of recentResults) {
        if (seen.has(r.covenantId)) continue;
        seen.add(r.covenantId);
        if (r.status === "FAIL") failingCount++;
      }

      // ---------------- Trading ----------------
      const trading = await this.prisma.tradingReadinessSnapshot.findFirst({
        where: { loanId: loan.id },
        orderBy: { computedAt: "desc" },
        select: { score: true, band: true, computedAt: true },
      });

      const tradingScore = trading?.score ?? 0;
      const tradingBand = (trading?.band ?? ReadinessBand.RED) as any;
      const tradingComputedAt = trading?.computedAt ? trading.computedAt.toISOString() : null;

      // ---------------- ESG ----------------
      const kpis = await this.prisma.eSGKpi.findMany({
        where: { loanId: loan.id },
        select: { type: true, target: true, current: true },
      });

      const kpiCount = kpis.length;
      let offTrackCount = 0;
      for (const k of kpis) {
        if (k.target == null || k.current == null) continue;
        if (this.kpiOffTrack(String(k.type), k.target, k.current)) offTrackCount++;
      }

      // Evidence pending count: latest verification per evidence (N+1, ok for demo)
      const evidence = await this.prisma.eSGEvidence.findMany({
        where: { loanId: loan.id },
        select: { id: true },
        take: 50,
        orderBy: { uploadedAt: "desc" },
      });

      let evidencePendingCount = 0;
      for (const e of evidence) {
        const latestV = await this.prisma.eSGVerification.findFirst({
          where: { loanId: loan.id, evidenceId: e.id },
          orderBy: { checkedAt: "desc" },
          select: { status: true },
        });
        if (latestV?.status === "PENDING") evidencePendingCount++;
      }

      result.push({
        id: loan.id,
        borrower: loan.borrower,
        currency: loan.currency,
        facilityAmount: Number(loan.facilityAmount),
        status: loan.status,
        lastUpdatedAt: loan.lastUpdatedAt.toISOString(),

        documents: {
          count: documentCount,
          latestFacilityAgreementVersion,
        },

        servicing: {
          scenario: scenario === ScenarioMode.STRESS ? "STRESS" : "BASE",
          lastTestedAt: lastTest?.testedAt ? lastTest.testedAt.toISOString() : null,
          failingCount,
        },

        trading: {
          score: tradingScore,
          band: tradingBand,
          computedAt: tradingComputedAt,
        },

        esg: {
          kpiCount,
          offTrackCount,
          evidencePendingCount,
        },
      });
    }

    return { loans: result };
  }

  async getPortfolioSummary() {
    // reuse loans rollups (simple + consistent)
    const { loans } = await this.getPortfolioLoans();

    const totals = {
      loans: loans.length,
      facilityAmount: loans.reduce((s: number, l: any) => s + (l.facilityAmount ?? 0), 0),
    };

    const tradingBands = {
      green: loans.filter((l: any) => l.trading.band === "GREEN").length,
      amber: loans.filter((l: any) => l.trading.band === "AMBER").length,
      red: loans.filter((l: any) => l.trading.band === "RED").length,
    };

    const servicing = {
      loansWithFails: loans.filter((l: any) => l.servicing.failingCount > 0).length,
      totalFails: loans.reduce((s: number, l: any) => s + (l.servicing.failingCount ?? 0), 0),
    };

    const esg = {
      evidencePending: loans.reduce((s: number, l: any) => s + (l.esg.evidencePendingCount ?? 0), 0),
      offTrackKpis: loans.reduce((s: number, l: any) => s + (l.esg.offTrackCount ?? 0), 0),
    };

    return {
      totals,
      tradingBands,
      servicing,
      esg,
      lastRefreshedAt: new Date().toISOString(),
    };
  }
}

