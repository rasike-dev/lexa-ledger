import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ObligationDto } from './obligation.types';

function toIso(d: Date) {
  return d.toISOString();
}

function daysBetween(a: Date, b: Date) {
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function computeStatus(due: Date, now: Date): 'OK' | 'DUE_SOON' | 'OVERDUE' {
  const diff = daysBetween(now, due);
  if (diff < 0) return 'OVERDUE';
  if (diff <= 14) return 'DUE_SOON';
  return 'OK';
}

@Injectable()
export class ObligationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getLoanObligations(args: {
    tenantId: string;
    loanId: string;
    now?: Date;
  }): Promise<ObligationDto[]> {
    const now = args.now ?? new Date();

    // Validate loan exists (tenant scoped by Prisma extension)
    const loan = await this.prisma.loan.findFirst({
      where: { id: args.loanId },
      select: { id: true, updatedAt: true },
    });
    if (!loan) return [];

    const obligations: ObligationDto[] = [];

    // 1) Covenant-derived obligations (next test date)
    const covenants = await this.prisma.covenant.findMany({
      where: { loanId: args.loanId },
      select: {
        id: true,
        title: true,
        code: true,
        createdAt: true,
      },
      take: 20,
    });

    // Get latest test result for each covenant to determine last tested date
    for (const c of covenants) {
      const latestResult = await this.prisma.covenantTestResult.findFirst({
        where: { covenantId: c.id },
        orderBy: { testedAt: 'desc' },
        select: {
          testedAt: true,
          status: true,
        },
      });

      const freq = 90; // Default 90 days between tests
      const anchor = latestResult?.testedAt ?? c.createdAt ?? loan.updatedAt;
      const due = new Date(anchor.getTime() + freq * 24 * 60 * 60 * 1000);

      const status = computeStatus(due, now);
      const covenantStatus = latestResult?.status;
      const severity =
        covenantStatus === 'FAIL'
          ? 'HIGH'
          : covenantStatus === 'WARN'
            ? 'HIGH'
            : status === 'OVERDUE'
              ? 'HIGH'
              : status === 'DUE_SOON'
                ? 'MEDIUM'
                : 'LOW';

      obligations.push({
        id: `obl:covenant:${args.loanId}:${c.id}:${toIso(due).slice(0, 10)}`,
        tenantId: args.tenantId,
        loanId: args.loanId,
        title: `Covenant test due: ${c.title}`,
        dueDate: toIso(due),
        status,
        severity,
        sourceType: 'COVENANT',
        sourceId: c.id,
        sourceLabel: c.title ?? 'Covenant',
        rationale:
          covenantStatus === 'WARN'
            ? 'Covenant is at risk; next test date is important for trading and servicing.'
            : 'Next scheduled covenant test derived from servicing cadence.',
      });
    }

    // 2) ESG KPI-derived obligations (evidence refresh / verification cadence)
    const kpis = await this.prisma.eSGKpi.findMany({
      where: { loanId: args.loanId },
      select: {
        id: true,
        title: true,
        type: true,
        updatedAt: true,
        createdAt: true,
      },
      take: 20,
    });

    for (const k of kpis) {
      // Get latest evidence for this KPI
      const latestEvidence = await this.prisma.eSGEvidence.findFirst({
        where: { kpiId: k.id },
        orderBy: { uploadedAt: 'desc' },
        select: {
          uploadedAt: true,
        },
      });

      // Get latest verification status
      const latestVerification = await this.prisma.eSGVerification.findFirst({
        where: {
          evidence: {
            kpiId: k.id,
          },
        },
        orderBy: { checkedAt: 'desc' },
        select: {
          status: true,
        },
      });

      const anchor = latestEvidence?.uploadedAt ?? k.updatedAt ?? loan.updatedAt;
      const due = new Date(anchor.getTime() + 90 * 24 * 60 * 60 * 1000); // 90-day default
      const status = computeStatus(due, now);

      const isVerified = latestVerification?.status === 'VERIFIED';
      const severity =
        !isVerified
          ? status === 'OVERDUE'
            ? 'HIGH'
            : 'MEDIUM'
          : status === 'OVERDUE'
            ? 'MEDIUM'
            : 'LOW';

      obligations.push({
        id: `obl:esg:${args.loanId}:${k.id}:${toIso(due).slice(0, 10)}`,
        tenantId: args.tenantId,
        loanId: args.loanId,
        title: `ESG evidence refresh: ${k.title}`,
        dueDate: toIso(due),
        status,
        severity,
        sourceType: 'ESG_KPI',
        sourceId: k.id,
        sourceLabel: k.title ?? 'ESG KPI',
        rationale: !isVerified
          ? 'KPI is unverified; evidence update is due for audit confidence.'
          : 'Regular ESG evidence refresh cadence.',
      });
    }

    // 3) Clause-derived obligations (reporting & deliverables)
    // Get all documents for the loan, then get clauses from latest versions
    const documents = await this.prisma.document.findMany({
      where: { loanId: args.loanId },
      select: {
        id: true,
      },
      take: 10,
    });

    for (const doc of documents) {
      // Get latest document version
      const latestVersion = await this.prisma.documentVersion.findFirst({
        where: { documentId: doc.id },
        orderBy: { version: 'desc' },
        select: {
          id: true,
          uploadedAt: true,
        },
      });

      if (!latestVersion) continue;

      // Get clauses with REPORTING tag
      const clauses = await this.prisma.clause.findMany({
        where: {
          documentVersionId: latestVersion.id,
          riskTags: {
            hasSome: ['REPORTING'], // PostgreSQL array contains
          },
        },
        select: {
          id: true,
          title: true,
          riskTags: true,
          extractedAt: true,
        },
        take: 20,
      });

      for (const cl of clauses) {
        const anchor = cl.extractedAt ?? latestVersion.uploadedAt ?? loan.updatedAt;
        const due = new Date(anchor.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day default for demo
        const status = computeStatus(due, now);

        const isCompliance = cl.riskTags.some((tag) => tag.includes('COMPLIANCE') || tag.includes('CERT'));
        const isEsg = cl.riskTags.some((tag) => tag.includes('ESG'));

        const title = isCompliance
          ? 'Compliance certificate due'
          : isEsg
            ? 'ESG reporting deliverable due'
            : 'Periodic reporting deliverable due';

        const severity = status === 'OVERDUE' ? 'HIGH' : status === 'DUE_SOON' ? 'MEDIUM' : 'LOW';

        obligations.push({
          id: `obl:clause:${args.loanId}:${cl.id}:${toIso(due).slice(0, 10)}`,
          tenantId: args.tenantId,
          loanId: args.loanId,
          title,
          dueDate: toIso(due),
          status,
          severity,
          sourceType: 'CLAUSE',
          sourceId: cl.id,
          sourceLabel: cl.title ?? 'Document clause',
          rationale: 'Derived from structured document obligations (clauses/claims).',
        });
      }
    }

    // Sort by dueDate ascending (earliest first)
    obligations.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // Limit to a reasonable number for now
    return obligations.slice(0, 30);
  }
}
