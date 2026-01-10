import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { QueueService } from "../queue/queue.service";
import { ESGVerificationStatus } from "@prisma/client";
import { TenantContext } from "../tenant/tenant-context";
import * as crypto from "crypto";

@Injectable()
export class EsgService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
    private readonly tenantContext: TenantContext,
  ) {}

  private sha256(buf: Buffer) {
    return crypto.createHash("sha256").update(buf).digest("hex");
  }

  async getSummary(params: { loanId: string }) {
    const { loanId } = params;

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const kpis = await this.prisma.eSGKpi.findMany({
      where: { loanId } as any, // tenantId injected by Prisma extension
      orderBy: { updatedAt: "desc" } as any, // tenantId injected by Prisma extension
    });

    const evidence = await this.prisma.eSGEvidence.findMany({
      where: { loanId } as any, // tenantId injected by Prisma extension
      orderBy: { uploadedAt: "desc" } as any, // tenantId injected by Prisma extension
      include: {
        verifications: { orderBy: { checkedAt: "desc" }, take: 1 } as any, // tenantId injected by Prisma extension
      } as any, // tenantId injected by Prisma extension
    });

    return {
      loanId,
      kpis: kpis.map((k) => ({
        id: k.id,
        type: k.type,
        title: k.title,
        unit: k.unit,
        target: k.target,
        current: k.current,
        asOfDate: k.asOfDate ? k.asOfDate.toISOString() : null,
      })),
      evidence: evidence.map((e) => ({
        id: e.id,
        kpiId: e.kpiId,
        type: e.type,
        title: e.title,
        fileName: e.fileName,
        contentType: e.contentType,
        fileKey: e.fileKey,
        checksum: e.checksum,
        uploadedAt: e.uploadedAt.toISOString(),
        latestVerification: e.verifications[0]
          ? {
              status: e.verifications[0].status as any,
              confidence: e.verifications[0].confidence,
              notes: e.verifications[0].notes,
              checkedAt: e.verifications[0].checkedAt.toISOString(),
            }
          : null,
      })),
    };
  }

  async createKpi(params: {
    loanId: string;
    body: { type: string; title: string; unit?: string; target?: number; current?: number; asOfDate?: string };
  }) {
    const { loanId } = params;

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const title = params.body.title?.trim();
    if (!title) throw new BadRequestException("title required");
    if (!params.body.type) throw new BadRequestException("type required");

    const kpi = await this.prisma.eSGKpi.create({
      data: {
        loanId,
        type: params.body.type as any,
        title,
        unit: params.body.unit ?? null,
        target: params.body.target ?? null,
        current: params.body.current ?? null,
        asOfDate: params.body.asOfDate ? new Date(params.body.asOfDate) : null,
      } as any, // tenantId injected by Prisma extension
    });

    await this.prisma.auditEvent.create({
      data: {
        type: "ESG_KPI_CREATED",
        summary: `Created ESG KPI "${title}"`,
        payload: { loanId, kpiId: kpi.id, type: kpi.type } as any, // tenantId injected by Prisma extension
      } as any, // tenantId injected by Prisma extension
    });

    return { id: kpi.id };
  }

  async uploadEvidence(params: {
    loanId: string;
    kpiId?: string;
    title: string;
    type?: string;
    file: Express.Multer.File;
  }) {
    const { loanId, file } = params;
    if (!file) throw new BadRequestException("Missing file");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");

    if (params.kpiId) {
      const kpi = await this.prisma.eSGKpi.findFirst({ where: { id: params.kpiId, loanId } });
      if (!kpi) throw new NotFoundException("KPI not found for this loan");
    }

    const checksum = this.sha256(file.buffer);
    const safeName = (file.originalname || "evidence").replace(/[^\w.\-]+/g, "_");
    const fileKey = `tenants/${this.tenantContext.tenantId}/loans/${loanId}/esg/evidence/${Date.now()}_${safeName}`;

    await this.storage.putObject({
      key: fileKey,
      body: file.buffer,
      contentType: file.mimetype || "application/octet-stream",
    });

    const evidence = await this.prisma.eSGEvidence.create({
      data: {
        loanId,
        kpiId: params.kpiId ?? null,
        type: (params.type as any) ?? "OTHER",
        title: params.title,
        fileKey,
        fileName: file.originalname || "evidence",
        contentType: file.mimetype || "application/octet-stream",
        checksum,
      } as any, // tenantId injected by Prisma extension
    });

    // Initial verification row = PENDING
    await this.prisma.eSGVerification.create({
      data: {
        loanId,
        evidenceId: evidence.id,
        status: ESGVerificationStatus.PENDING,
        notes: "Verification queued",
      } as any, // tenantId injected by Prisma extension
    });

    await this.prisma.auditEvent.create({
      data: {
        type: "ESG_EVIDENCE_UPLOADED",
        summary: `Uploaded ESG evidence "${params.title}"`,
        evidenceRef: evidence.id,
        payload: { loanId, evidenceId: evidence.id, kpiId: params.kpiId ?? null, fileKey, checksum } as any, // tenantId injected by Prisma extension
      } as any, // tenantId injected by Prisma extension
    });

    await this.queue.enqueueESGVerification({ tenantId: this.tenantContext.tenantId, loanId, evidenceId: evidence.id });

    return { evidenceId: evidence.id, fileKey, status: "PENDING" as const };
  }

  async requestVerify(params: { loanId: string; evidenceId: string; actorName?: string }) {
    const { loanId, evidenceId } = params;

    const evidence = await this.prisma.eSGEvidence.findFirst({ where: { id: evidenceId, loanId } });
    if (!evidence) throw new NotFoundException("Evidence not found");

    await this.prisma.eSGVerification.create({
      data: {
        loanId,
        evidenceId,
        status: "PENDING",
        notes: "Manual verification requested",
      } as any, // tenantId injected by Prisma extension
    });

    await this.prisma.auditEvent.create({
      data: {
        type: "ESG_VERIFY_REQUESTED",
        summary: `Manual ESG verification requested`,
        evidenceRef: evidenceId,
        payload: { loanId, evidenceId, fileKey: evidence.fileKey } as any, // tenantId injected by Prisma extension
      } as any, // tenantId injected by Prisma extension
    });

    await this.queue.enqueueESGVerification({ tenantId: this.tenantContext.tenantId, loanId, evidenceId });

    return { ok: true as const, evidenceId };
  }
}

