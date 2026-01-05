import portfolio from "../../../mocks/fixtures/portfolio.json";
import { PortfolioDataSchema } from "../schemas";
import type { PortfolioData, PortfolioKpis } from "../types";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchPortfolio(): Promise<PortfolioData> {
  await sleep(250);
  return PortfolioDataSchema.parse(portfolio);
}

export function computePortfolioKpis(data: PortfolioData): PortfolioKpis {
  const now = new Date(data.asOf).getTime();
  const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

  const totalLoans = data.loans.length;
  const totalExposureBase = data.loans.reduce((sum, l) => sum + l.facilityAmount, 0);
  const loansAtRisk = data.loans.filter((l) => l.riskFlag !== "OK").length;
  const tradeReadyCount = data.loans.filter((l) => l.tradeReadyScore >= 85).length;
  const obligationsDueSoon = data.loans.filter((l) => {
    const due = new Date(l.nextObligationDue).getTime();
    return due >= now && due <= now + twoWeeksMs;
  }).length;
  const esgClausesTotal = data.loans.reduce((sum, l) => sum + l.esgClauses, 0);

  return {
    totalLoans,
    totalExposureBase,
    loansAtRisk,
    tradeReadyCount,
    obligationsDueSoon,
    esgClausesTotal,
  };
}
