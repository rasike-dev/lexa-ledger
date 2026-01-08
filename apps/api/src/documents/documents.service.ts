import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { QueueService } from "../queue/queue.service";
import { DocumentType } from "@prisma/client";
import * as crypto from "crypto";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly queue: QueueService,
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
    tenantId: string;
    actorName?: string;
    loanId: string;
    type?: DocumentType;
    title?: string;
    file: Express.Multer.File;
  }) {
    const { tenantId, loanId, file } = params;
    if (!tenantId) throw new BadRequestException("Missing x-tenant-id");
    if (!file) throw new BadRequestException("Missing file");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, tenantId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const docType = params.type ?? DocumentType.OTHER;
    const title = params.title?.trim() || file.originalname || "Untitled";

    // Create or reuse a Document container per (loanId, title, type) - simple v1
    // Later: explicit doc creation + versions; for now upload creates container if needed.
    const document = await this.prisma.document.create({
      data: { tenantId, loanId, type: docType, title },
    });

    // Determine next version number (v1: always 1 since new document created)
    const version = 1;

    const checksum = this.checksum(file.buffer);

    // Storage key: tenant/loan/document/version/filename
    const safeName = (file.originalname || "document").replace(/[^\w.\-]+/g, "_");
    const fileKey = `tenants/${tenantId}/loans/${loanId}/documents/${document.id}/v${version}/${safeName}`;

    // Upload to object storage
    await this.storage.putObject({
      key: fileKey,
      body: file.buffer,
      contentType: file.mimetype || "application/octet-stream",
    });

    const docVersion = await this.prisma.documentVersion.create({
      data: {
        tenantId,
        documentId: document.id,
        version,
        fileKey,
        fileName: file.originalname || "document",
        contentType: file.mimetype || "application/octet-stream",
        checksum,
      },
    });

    // Resolve actor (Week 1)
    const actor =
      params.actorName
        ? await this.prisma.user.findFirst({
            where: { OR: [{ name: params.actorName }, { email: params.actorName }] },
          })
        : null;

    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: actor?.id ?? null,
        type: "DOCUMENT_UPLOADED",
        summary: `Uploaded new document container + v${version} for "${title}" (shortcut)`,
        evidenceRef: docVersion.id,
        payload: {
          mode: "create+v1", // Distinguishes shortcut endpoint from proper versioning
          loanId,
          documentId: document.id,
          documentVersionId: docVersion.id,
          fileKey,
          checksum,
        },
      },
    });

    // Enqueue extraction job
    await this.queue.enqueueDocumentExtraction({
      tenantId,
      loanId,
      documentId: document.id,
      documentVersionId: docVersion.id,
    });

    return {
      documentId: document.id,
      documentVersionId: docVersion.id,
      fileKey,
    };
  }

  async getClausesForVersion(tenantId: string, documentVersionId: string) {
    const clauses = await this.prisma.clause.findMany({
      where: { tenantId, documentVersionId },
      orderBy: { clauseRef: "asc" },
    });

    return clauses.map((c) => ({
      id: c.id,
      clauseRef: c.clauseRef,
      title: c.title,
      text: c.text,
      riskTags: c.riskTags,
    }));
  }

  async listLoanDocuments(params: { tenantId: string; loanId: string }) {
    const { tenantId, loanId } = params;
    if (!tenantId) throw new BadRequestException("Missing x-tenant-id");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, tenantId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const docs = await this.prisma.document.findMany({
      where: { tenantId, loanId },
      orderBy: { createdAt: "desc" },
      include: {
        versions: {
          orderBy: { uploadedAt: "desc" },
        },
      },
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
    tenantId: string;
    loanId: string;
    title: string;
    type?: DocumentType;
  }) {
    const { tenantId, loanId } = params;
    if (!tenantId) throw new BadRequestException("Missing x-tenant-id");
    const title = params.title?.trim();
    if (!title) throw new BadRequestException("title is required");

    const loan = await this.prisma.loan.findFirst({ where: { id: loanId, tenantId } });
    if (!loan) throw new NotFoundException("Loan not found");

    const document = await this.prisma.document.create({
      data: {
        tenantId,
        loanId,
        title,
        type: params.type ?? DocumentType.OTHER,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        type: "DOCUMENT_CREATED",
        summary: `Created document container "${title}"`,
        payload: { loanId, documentId: document.id },
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
    tenantId: string;
    actorName?: string;
    documentId: string;
    file: Express.Multer.File;
  }) {
    const { tenantId, documentId, file } = params;
    if (!tenantId) throw new BadRequestException("Missing x-tenant-id");
    if (!file) throw new BadRequestException("Missing file");

    const document = await this.prisma.document.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!document) throw new NotFoundException("Document not found");

    const latest = await this.prisma.documentVersion.findFirst({
      where: { tenantId, documentId },
      orderBy: { version: "desc" },
    });

    const version = (latest?.version ?? 0) + 1;

    const checksum = this.checksum(file.buffer);
    const safeName = (file.originalname || "document").replace(/[^\w.\-]+/g, "_");
    const fileKey = `tenants/${tenantId}/loans/${document.loanId}/documents/${document.id}/v${version}/${safeName}`;

    await this.storage.putObject({
      key: fileKey,
      body: file.buffer,
      contentType: file.mimetype || "application/octet-stream",
    });

    const docVersion = await this.prisma.documentVersion.create({
      data: {
        tenantId,
        documentId: document.id,
        version,
        fileKey,
        fileName: file.originalname || "document",
        contentType: file.mimetype || "application/octet-stream",
        checksum,
      },
    });

    const actor =
      params.actorName
        ? await this.prisma.user.findFirst({
            where: { OR: [{ name: params.actorName }, { email: params.actorName }] },
          })
        : null;

    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: actor?.id ?? null,
        type: "DOCUMENT_VERSION_UPLOADED",
        summary: `Uploaded "${document.title}" v${version}`,
        evidenceRef: docVersion.id,
        payload: {
          loanId: document.loanId,
          documentId: document.id,
          documentVersionId: docVersion.id,
          version,
          fileKey,
          checksum,
        },
      },
    });

    // enqueue extraction for this version
    await this.queue.enqueueDocumentExtraction({
      tenantId,
      loanId: document.loanId,
      documentId: document.id,
      documentVersionId: docVersion.id,
    });

    return {
      documentId: document.id,
      documentVersionId: docVersion.id,
      fileKey,
    };
  }
}

