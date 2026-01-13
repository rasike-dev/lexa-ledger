import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { QueueService } from "../queue/queue.service";
import { DocumentType } from "@prisma/client";
import { TenantContext } from "../tenant/tenant-context";
import { AuditService } from "../audit/audit.service";
import { ImpactService } from "../ops/impact/impact.service";
import * as crypto from "crypto";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
    private readonly tenantContext: TenantContext,
    private readonly auditService: AuditService,
    private readonly impactService: ImpactService, // C2: Impact detection
  ) {}

  private checksum(buf: Buffer) {
    return crypto.createHash("sha256").update(buf).digest("hex");
  }

  /**
   * Shortcut endpoint: creates Document container + v1 in one call.
   * Soft-deprecated in favor of separate create + upload-version workflow.
   * 
   * TODO: Add idempotency support via x-idempotency-key header to prevent
   * duplicate uploads on client retry. Store key in DocumentVersion.payload
   * or separate IdempotencyKey table with TTL.
   */
  async uploadForLoan(params: {
    loanId: string;
    type?: DocumentType;
    title?: string;
    file: Express.Multer.File;
    req: Request;
  }) {
    const { loanId, file } = params;
    if (!file) throw new BadRequestException("Missing file");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const docType = params.type ?? DocumentType.OTHER;
    const title = params.title?.trim() || file.originalname || "Untitled";

    // Create or reuse a Document container per (loanId, title, type) - simple v1
    // Later: explicit doc creation + versions; for now upload creates container if needed.
    const document = await this.prisma.document.create({
      data: { loanId, type: docType, title } as any, // tenantId injected by Prisma extension
    });

    // Determine next version number (v1: always 1 since new document created)
    const version = 1;

    const checksum = this.checksum(file.buffer);

    // Storage key: tenant/loan/document/version/filename
    const safeName = (file.originalname || "document").replace(/[^\w.\-]+/g, "_");
    const fileKey = `tenants/${this.tenantContext.tenantId}/loans/${loanId}/documents/${document.id}/v${version}/${safeName}`;

    // Upload to object storage
    await this.storage.putObject({
      key: fileKey,
      body: file.buffer,
      contentType: file.mimetype || "application/octet-stream",
    });

    const docVersion = await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version,
        fileKey,
        fileName: file.originalname || "document",
        contentType: file.mimetype || "application/octet-stream",
        checksum,
      } as any, // tenantId injected by Prisma extension
    });

    // Record audit event with enterprise-grade context
    const ctx = this.auditService.actorFromRequest(params.req);
    await this.auditService.record({
      ...ctx,
      type: "DOCUMENT_UPLOADED",
      summary: `Uploaded new document container + v${version} for "${title}" (shortcut create+v1)`,
      evidenceRef: docVersion.id,
      payload: {
        mode: "create+v1", // Distinguishes shortcut endpoint from proper versioning
        loanId,
        documentId: document.id,
        documentVersionId: docVersion.id,
        fileKey,
        fileName: file.originalname,
        contentType: file.mimetype,
        fileSize: file.size,
        checksum,
      },
    });

    // Enqueue extraction job with correlation ID for tracing
    await this.queue.enqueueDocumentExtraction({
      tenantId: this.tenantContext.tenantId,
      loanId,
      documentId: document.id,
      documentVersionId: docVersion.id,
      correlationId: ctx.correlationId,
    });

    // C2: Impact detection - document created affects downstream facts
    await this.impactService.onSourceChanged({
      tenantId: this.tenantContext.tenantId,
      correlationId: ctx.correlationId,
      actorUserId: ctx.actor.type === 'USER' ? ctx.actor.userId : undefined,
      sourceType: 'DOCUMENT',
      sourceId: document.id,
      sourceAction: 'CREATED',
      loanId,
    });

    return {
      documentId: document.id,
      documentVersionId: docVersion.id,
      fileKey,
    };
  }

  async getClausesForVersion(documentVersionId: string) {
    const clauses = await this.prisma.clause.findMany({
      where: { documentVersionId } as any, // tenantId injected by Prisma extension
      orderBy: { clauseRef: "asc" } as any, // tenantId injected by Prisma extension
    });

    return clauses.map((c) => ({
      id: c.id,
      clauseRef: c.clauseRef,
      title: c.title,
      text: c.text,
      riskTags: c.riskTags,
    }));
  }

  async listLoanDocuments(params: { loanId: string }) {
    const { loanId } = params;

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const docs = await this.prisma.document.findMany({
      where: { loanId } as any, // tenantId injected by Prisma extension
      orderBy: { createdAt: "desc" } as any, // tenantId injected by Prisma extension
      include: {
        versions: {
          orderBy: { uploadedAt: "desc" } as any, // tenantId injected by Prisma extension
        } as any, // tenantId injected by Prisma extension
      } as any, // tenantId injected by Prisma extension
    });

    return docs.map((d) => {
      const latest = d.versions[0];

      return {
        documentId: d.id,
        type: d.type,
        title: d.title,
        createdAt: d.createdAt.toISOString(),
        latestVersion: latest
          ? {
              documentVersionId: latest.id,
              version: latest.version,
              fileName: latest.fileName,
              contentType: latest.contentType,
              checksum: latest.checksum ?? undefined,
              uploadedAt: latest.uploadedAt.toISOString(),
              fileKey: latest.fileKey,
            }
          : null,
        versions: d.versions.map((v) => ({
          documentVersionId: v.id,
          version: v.version,
          fileName: v.fileName,
          contentType: v.contentType,
          uploadedAt: v.uploadedAt.toISOString(),
          checksum: v.checksum ?? undefined,
          fileKey: v.fileKey,
        })),
      };
    });
  }

  async createDocumentContainer(params: {
    loanId: string;
    title: string;
    type?: DocumentType;
    req: Request;
  }) {
    const { loanId, req } = params;
    const title = params.title?.trim();
    if (!title) throw new BadRequestException("title is required");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const document = await this.prisma.document.create({
      data: {
        loanId,
        title,
        type: params.type ?? DocumentType.OTHER,
      } as any, // tenantId injected by Prisma extension
    });

    // Record audit event with enterprise-grade context
    const ctx = this.auditService.actorFromRequest(req);
    await this.auditService.record({
      ...ctx,
      type: "DOCUMENT_CREATED",
      summary: `Created document container "${title}" for loan ${loanId}`,
      evidenceRef: document.id,
      payload: {
        loanId,
        documentId: document.id,
        type: params.type ?? DocumentType.OTHER,
        title,
      },
    });

    return { documentId: document.id };
  }

  /**
   * Upload a new version to an existing Document container.
   * Automatically increments version number (v1, v2, v3...).
   * 
   * TODO: Add idempotency support via x-idempotency-key header to prevent
   * duplicate versions on client retry. Check if version with same key exists
   * before creating new version.
   */
  async uploadNewVersion(params: {
    documentId: string;
    file: Express.Multer.File;
    req: Request;
  }) {
    const { documentId, file } = params;
    if (!file) throw new BadRequestException("Missing file");

    const document = await this.prisma.document.findFirst({
      where: { id: documentId } as any, // tenantId injected by Prisma extension
    });
    if (!document) throw new NotFoundException("Document not found");

    const latest = await this.prisma.documentVersion.findFirst({
      where: { documentId } as any, // tenantId injected by Prisma extension
      orderBy: { version: "desc" } as any, // tenantId injected by Prisma extension
    });

    const version = (latest?.version ?? 0) + 1;

    const checksum = this.checksum(file.buffer);
    const safeName = (file.originalname || "document").replace(/[^\w.\-]+/g, "_");
    const fileKey = `tenants/${this.tenantContext.tenantId}/loans/${document.loanId}/documents/${document.id}/v${version}/${safeName}`;

    await this.storage.putObject({
      key: fileKey,
      body: file.buffer,
      contentType: file.mimetype || "application/octet-stream",
    });

    const docVersion = await this.prisma.documentVersion.create({
      data: {
        documentId: document.id,
        version,
        fileKey,
        fileName: file.originalname || "document",
        contentType: file.mimetype || "application/octet-stream",
        checksum,
      } as any, // tenantId injected by Prisma extension
    });

    // Record audit event with enterprise-grade context
    const ctx = this.auditService.actorFromRequest(params.req);
    await this.auditService.record({
      ...ctx,
      type: "DOCUMENT_VERSION_UPLOADED",
      summary: `Uploaded "${document.title}" v${version}`,
      evidenceRef: docVersion.id,
      payload: {
        loanId: document.loanId,
        documentId: document.id,
        documentVersionId: docVersion.id,
        version,
        fileKey,
        fileName: file.originalname,
        contentType: file.mimetype,
        fileSize: file.size,
        checksum,
      },
    });

    // Enqueue extraction for this version with correlation ID for tracing
    await this.queue.enqueueDocumentExtraction({
      tenantId: this.tenantContext.tenantId,
      loanId: document.loanId,
      documentId: document.id,
      documentVersionId: docVersion.id,
      correlationId: ctx.correlationId,
    });

    // C2: Impact detection - document version updated affects downstream facts
    await this.impactService.onSourceChanged({
      tenantId: this.tenantContext.tenantId,
      correlationId: ctx.correlationId,
      actorUserId: ctx.actor.type === 'USER' ? ctx.actor.userId : undefined,
      sourceType: 'DOCUMENT',
      sourceId: document.id,
      sourceAction: 'UPDATED',
      loanId: document.loanId,
    });

    return {
      documentId: document.id,
      documentVersionId: docVersion.id,
      fileKey,
    };
  }
}

