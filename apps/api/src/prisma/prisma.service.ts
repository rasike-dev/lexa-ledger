import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { TenantContext } from "../tenant/tenant-context";

const TENANT_MODELS = new Set<string>([
  'Loan',
  'Document',
  'DocumentVersion',
  'Clause',
  'TradingChecklistItem',
  'TradingReadinessSnapshot',
  'Covenant',
  'CovenantTestResult',
  'LoanScenario',
  'ESGKpi',
  'ESGEvidence',
  'ESGVerification',
  'AuditEvent',
]);

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(private readonly tenantContext: TenantContext) {
    super();
  }

  async onModuleInit() {
    await this.$connect();

    // Register tenant enforcement middleware
    (this as any).$use(async (params: any, next: any) => {
      const model = params.model;
      if (!model || !TENANT_MODELS.has(model)) return next(params);

      const tenantId = this.tenantContext.tenantId;

      // For non-public routes, tenantId must exist. If it doesn't, block.
      // (Public endpoints should avoid hitting tenant models.)
      if (!tenantId) {
        throw new Error(`TenantContext missing tenantId for model ${model}`);
      }

      // Inject tenantId into reads
      if (['findFirst', 'findMany', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
        params.args ??= {};
        params.args.where ??= {};
        params.args.where.tenantId = tenantId;
      }

      // Inject tenantId into create
      if (params.action === 'create') {
        params.args ??= {};
        params.args.data ??= {};
        params.args.data.tenantId = tenantId;
      }

      // Inject tenantId into update/delete to prevent cross-tenant mutation
      if (['update', 'delete', 'updateMany', 'deleteMany'].includes(params.action)) {
        params.args ??= {};
        params.args.where ??= {};
        params.args.where.tenantId = tenantId;
      }

      return next(params);
    });
  }

  async enableShutdownHooks(app: any) {
    app.enableShutdownHooks();
    this.$on("beforeExit" as any, async () => {
      await this.$disconnect();
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

