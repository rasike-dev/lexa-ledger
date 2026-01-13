import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantALS } from '../tenant/tenant-als';

/**
 * List of models that require tenant isolation.
 * IMPORTANT: Keep this in sync with your schema. Any tenant-scoped model must be listed here.
 */
const TENANT_MODELS = new Set([
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
  'TradingReadinessFactSnapshot',
  'TradingReadinessExplanation',
  'EsgKpiFactSnapshot',
  'EsgKpiExplanation',
  'CovenantEvaluationFactSnapshot',
  'CovenantExplanation',
  'PortfolioRiskFactSnapshot',
  'PortfolioRiskExplanation',
  'ImpactEvent', // Week 3 Track C
]);

/**
 * Creates a Prisma Client with tenant enforcement extension.
 * The extension automatically injects tenantId into all queries for tenant-scoped models.
 */
const createExtendedPrismaClient = () => {
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === 'production' 
      ? ['error'] 
      : ['warn', 'error'],
  });

  return baseClient.$extends({
    name: 'tenant-enforcement',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          // Skip non-tenant models
          if (!TENANT_MODELS.has(model)) {
            return query(args);
          }

          // Get tenant context from AsyncLocalStorage
          const store = tenantALS.getStore();
          
          if (!store?.tenantId) {
            throw new Error(
              `[TenantEnforcement] Tenant context missing for ${model}.${operation}. ` +
              `Ensure the request is authenticated and tenant context is set.`
            );
          }

          const { tenantId } = store;
          
          // Clone args to avoid mutation
          const modifiedArgs: any = { ...args };

          // Handle different operation types
          switch (operation) {
            case 'findFirst':
            case 'findMany':
            case 'findUnique':
            case 'count':
            case 'aggregate':
            case 'groupBy':
              // Inject tenantId into WHERE clause for reads
              modifiedArgs.where = { ...modifiedArgs.where, tenantId };
              break;

            case 'create':
              // Inject tenantId into DATA for create
              modifiedArgs.data = { ...modifiedArgs.data, tenantId };
              break;

            case 'createMany':
              // Inject tenantId into each item in DATA array
              if (Array.isArray(modifiedArgs.data)) {
                modifiedArgs.data = modifiedArgs.data.map((item: any) => ({
                  ...item,
                  tenantId,
                }));
              }
              break;

            case 'update':
            case 'delete':
            case 'updateMany':
            case 'deleteMany':
              // Inject tenantId into WHERE clause for updates/deletes
              modifiedArgs.where = { ...modifiedArgs.where, tenantId };
              break;

            case 'upsert':
              // For upsert, inject into both WHERE and CREATE
              modifiedArgs.where = { ...modifiedArgs.where, tenantId };
              modifiedArgs.create = { ...modifiedArgs.create, tenantId };
              break;

            default:
              // Log unknown operation in development
              if (process.env.NODE_ENV !== 'production') {
                Logger.warn(
                  `[TenantEnforcement] Unknown operation "${operation}" on model "${model}". ` +
                  `TenantId may not be enforced.`,
                  'PrismaService'
                );
              }
          }

          return query(modifiedArgs);
        },
      },
    },
  });
};

type ExtendedClient = ReturnType<typeof createExtendedPrismaClient>;

// Singleton pattern with proper typing
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedClient | undefined;
};

const prisma = globalForPrisma.prisma ?? createExtendedPrismaClient();

// Cache in development to avoid reconnection on hot reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Prisma Service with automatic tenant enforcement via Client Extensions.
 * 
 * All queries on tenant-scoped models automatically have tenantId injected.
 * Tenant context is retrieved from AsyncLocalStorage set by TenantInterceptor.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Expose all Prisma models through the extended client
  loan = prisma.loan;
  document = prisma.document;
  documentVersion = prisma.documentVersion;
  clause = prisma.clause;
  tradingChecklistItem = prisma.tradingChecklistItem;
  tradingReadinessSnapshot = prisma.tradingReadinessSnapshot;
  covenant = prisma.covenant;
  covenantTestResult = prisma.covenantTestResult;
  loanScenario = prisma.loanScenario;
  eSGKpi = prisma.eSGKpi;
  eSGEvidence = prisma.eSGEvidence;
  eSGVerification = prisma.eSGVerification;
  auditEvent = prisma.auditEvent;
  tenant = prisma.tenant;
  user = prisma.user;
  
  // Week 3 - Track A: Explainable Intelligence Models
  tradingReadinessFactSnapshot = prisma.tradingReadinessFactSnapshot;
  tradingReadinessExplanation = prisma.tradingReadinessExplanation;
  esgKpiFactSnapshot = prisma.esgKpiFactSnapshot;
  esgKpiExplanation = prisma.esgKpiExplanation;
  covenantEvaluationFactSnapshot = prisma.covenantEvaluationFactSnapshot;
  covenantExplanation = prisma.covenantExplanation;
  portfolioRiskFactSnapshot = prisma.portfolioRiskFactSnapshot;
  portfolioRiskExplanation = prisma.portfolioRiskExplanation;
  
  // Week 3 - Track C: Operational Intelligence Models
  impactEvent = prisma.impactEvent;

  async onModuleInit() {
    try {
      await (prisma as any).$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await (prisma as any).$disconnect();
    this.logger.log('Database connection closed');
  }

  async enableShutdownHooks(app: any) {
    app.enableShutdownHooks();
  }

  /**
   * Execute queries in a transaction.
   * Note: The transaction callback receives the extended client, so tenant enforcement applies.
   */
  $transaction<R>(
    fn: (prisma: ExtendedClient) => Promise<R>,
    options?: any
  ): Promise<R> {
    return (prisma as any).$transaction(fn, options);
  }

  /**
   * Execute raw queries.
   * WARNING: Raw queries bypass tenant enforcement. Use with caution.
   */
  $queryRaw(query: any, ...values: any[]) {
    this.logger.warn('Executing raw query - tenant enforcement bypassed');
    return (prisma as any).$queryRaw(query, ...values);
  }

  /**
   * Execute raw commands.
   * WARNING: Raw commands bypass tenant enforcement. Use with caution.
   */
  $executeRaw(query: any, ...values: any[]) {
    this.logger.warn('Executing raw command - tenant enforcement bypassed');
    return (prisma as any).$executeRaw(query, ...values);
  }
}
