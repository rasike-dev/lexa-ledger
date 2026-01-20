// Load environment variables from .env file automatically
// This works in both development and production
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Try multiple .env file locations (development and production)
const envPaths = [
  path.resolve(__dirname, '../../.env'), // Root .env (development)
  path.resolve(__dirname, '../.env'), // apps/worker/.env (development)
  path.resolve(process.cwd(), '.env'), // Current working directory (production)
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      envLoaded = true;
      if (process.env.NODE_ENV !== 'production') {
        console.log(`✅ Loaded environment variables from: ${envPath}`);
      }
      break;
    }
  }
}

// Also load from process.env (for production where env vars are set directly)
// This ensures env vars work even if .env file doesn't exist
if (!envLoaded && process.env.NODE_ENV === 'production') {
  console.log('ℹ️  Using environment variables from process.env (production mode)');
}

import { Worker } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";
import { startServicingRecomputeWorker } from "./servicing.recompute";
import { startTradingRecomputeWorker } from "./trading.recompute";
import { startEsgVerifyWorker } from "./esg.verify";
import { startAiExplainWorker } from "./ai-explain.worker";
import { startOpsWorker } from "./ops.worker";
import { minioStorage } from "./storage/minioStorage";
import { SERVICE_CLIENT_ID, SERVICE_ACTOR_TYPE } from "./service-identity";
import { logError, logWorkerError, logJobFailure, logWarning } from "./utils/error-logger";
import { logJobFailureWithRetryInfo } from "./utils/retry-safeguard";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

/**
 * Validate critical environment variables are present
 */
function validateEnvVars() {
  const required = ['REDIS_URL', 'DATABASE_URL'];
  const missing: string[] = [];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('✅ Worker environment variables validated');
}

// Validate environment variables before starting
validateEnvVars();

const prisma = new PrismaClient();
const connection = new IORedis(must("REDIS_URL"), {
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    // Prevent infinite reconnection attempts
    const MAX_RECONNECT_ATTEMPTS = 100; // Maximum 100 reconnection attempts
    if (times > MAX_RECONNECT_ATTEMPTS) {
      logError(
        new Error(`Redis reconnection exceeded maximum attempts (${MAX_RECONNECT_ATTEMPTS})`),
        {
          component: 'Redis',
          event: 'max_reconnect_attempts_exceeded',
          attempts: times,
        }
      );
      // Return null to stop retrying
      return null;
    }
    
    const delay = Math.min(times * 50, 2000);
    console.log(`Redis reconnecting (attempt ${times}/${MAX_RECONNECT_ATTEMPTS}) after ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    // Safely check error message
    const errorMessage = err?.message || String(err || '');
    if (errorMessage.includes(targetError)) {
      // Only reconnect when the error contains "READONLY"
      return true;
    }
    return false;
  },
});

// Redis connection event handlers
connection.on('error', (error) => {
  logError(error, {
    component: 'Redis',
    event: 'connection_error',
  });
});

connection.on('connect', () => {
  console.log('Redis connected');
});

connection.on('ready', () => {
  console.log('Redis ready');
});

connection.on('close', () => {
  logWarning('Redis connection closed', {
    component: 'Redis',
    event: 'connection_closed',
  });
});

connection.on('reconnecting', (delay: number) => {
  console.log(`Redis reconnecting in ${delay}ms`);
});

type DocumentExtractJob = {
  tenantId: string;
  loanId: string;
  documentId: string;
  documentVersionId: string;
};

// Store worker references for graceful shutdown
const workers: Worker[] = [];

const documentExtractWorker = new Worker<DocumentExtractJob>(
  "document.extract",
  async (job) => {
    const { tenantId, loanId, documentVersionId } = job.data;

    // Validate required fields
    if (!tenantId || !loanId || !documentVersionId) {
      throw new Error(
        `Missing required job data fields: tenantId=${!!tenantId}, loanId=${!!loanId}, documentVersionId=${!!documentVersionId}`
      );
    }

    try {
      const dv = await prisma.documentVersion.findFirst({
        where: { id: documentVersionId, tenantId },
      });
      if (!dv) {
        throw new Error(`DocumentVersion not found: ${documentVersionId} for tenant ${tenantId}`);
      }

    // idempotency
    await prisma.clause.deleteMany({
      where: { tenantId, documentVersionId },
    });

    const clauses = [
      {
        clauseRef: "1.1",
        title: "Definitions",
        text: `In this Agreement, unless the context otherwise requires: "Business Day" means a day (other than a Saturday or Sunday) on which banks are open for general business in London and New York; "Facility" means the term loan facility made available under this Agreement; "Interest Period" means the period determined in accordance with Clause 8 (Interest Periods); "Margin" means the percentage rate per annum specified in Schedule 2; "Obligor" means the Borrower and each Guarantor.`,
        riskTags: ["basic"],
      },
      {
        clauseRef: "5.2",
        title: "Financial Covenants",
        text: `The Borrower shall ensure that: (a) Leverage Ratio: the ratio of Total Net Debt to EBITDA shall not exceed 3.50:1.00 at any time; (b) Interest Cover: the ratio of EBITDA to Net Finance Charges shall not be less than 4.00:1.00 for any Measurement Period; (c) Minimum Liquidity: maintain unrestricted cash and Cash Equivalent Investments of not less than USD 50,000,000 at all times.`,
        riskTags: ["covenant", "financial"],
      },
      {
        clauseRef: "5.3",
        title: "Information Covenants",
        text: `The Borrower shall supply to the Agent: (a) as soon as available, but in any event within 120 days after the end of each financial year, its audited consolidated financial statements; (b) as soon as available, but in any event within 45 days after the end of each quarter, its unaudited consolidated financial statements; (c) at the same time as they are dispatched, copies of all documents dispatched by the Borrower to its shareholders or creditors generally.`,
        riskTags: ["covenant", "reporting"],
      },
      {
        clauseRef: "8.7",
        title: "Negative Pledge",
        text: `The Borrower shall not, and shall procure that no member of the Group will, create or permit to subsist any Security over any of its assets, except for: (a) Permitted Security; (b) any Security created with the prior written consent of the Majority Lenders; (c) any Security arising by operation of law in the ordinary course of trading.`,
        riskTags: ["covenant", "security"],
      },
      {
        clauseRef: "9.4",
        title: "Disposals",
        text: `The Borrower shall not, and shall procure that no other member of the Group will, enter into a single transaction or a series of transactions (whether related or not) and whether voluntary or involuntary to sell, lease, transfer or otherwise dispose of any asset except: (a) disposals at arm's length in the ordinary course of trading; (b) disposals of assets in exchange for other assets comparable or superior as to type and value; (c) disposals not exceeding USD 10,000,000 in aggregate in any financial year.`,
        riskTags: ["covenant", "restrictions"],
      },
      {
        clauseRef: "12.1",
        title: "Events of Default - Non-Payment",
        text: `An Event of Default occurs if an Obligor does not pay on the due date any amount payable pursuant to a Finance Document at the place at and in the currency in which it is expressed to be payable unless: (a) its failure to pay is caused by administrative or technical error or a Disruption Event; and (b) payment is made within three Business Days of its due date.`,
        riskTags: ["risk", "default"],
      },
      {
        clauseRef: "12.3",
        title: "Events of Default - Financial Covenants",
        text: `An Event of Default occurs if any requirement of Clause 5.2 (Financial Covenants) is not satisfied or an Obligor does not comply with the provisions of Clause 5.3 (Information Covenants).`,
        riskTags: ["risk", "default"],
      },
      {
        clauseRef: "12.6",
        title: "Events of Default - Insolvency",
        text: `An Event of Default occurs if: (a) any Obligor is unable or admits inability to pay its debts as they fall due or is declared to be unable to pay its debts under applicable law; (b) any Obligor suspends making payments on any of its debts or announces an intention to do so; (c) by reason of actual or anticipated financial difficulties, any Obligor begins negotiations with one or more of its creditors with a view to rescheduling any of its indebtedness.`,
        riskTags: ["risk", "default", "insolvency"],
      },
    ];

    await prisma.clause.createMany({
      data: clauses.map((c) => ({
        tenantId,
        documentVersionId,
        clauseRef: c.clauseRef,
        title: c.title,
        text: c.text,
        riskTags: c.riskTags,
      })),
    });

    await prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: null, // No user for SERVICE actions
        actorType: SERVICE_ACTOR_TYPE,
        actorClientId: SERVICE_CLIENT_ID,
        type: "CLAUSES_EXTRACTED",
        summary: `Extracted ${clauses.length} clauses`,
        evidenceRef: documentVersionId,
        payload: { loanId, documentVersionId, clauseCount: clauses.length },
      },
    });

      await prisma.loan.update({
        where: { id: loanId },
        data: { lastUpdatedAt: new Date() },
      });

      return { clauseCount: clauses.length };
    } catch (error) {
      logJobFailureWithRetryInfo(
        error,
        job,
        'document.extract',
        {
          queueName: 'document.extract',
          tenantId,
          loanId,
          documentVersionId,
        }
      );
      
      throw error; // Re-throw to let BullMQ handle retry (if attempts remaining)
    }
  },
  { 
    connection: connection as any,
    // Note: Retry configuration (attempts, backoff) should be set at Queue level
    // when adding jobs, not in Worker options
  }
);

// Add error handlers for document extract worker
documentExtractWorker.on('error', (error) => {
  logWorkerError(error, 'document.extract', {
    queueName: 'document.extract',
  });
});

documentExtractWorker.on('failed', (job, err) => {
  logJobFailure(
    err,
    'document.extract',
    job?.id,
    job?.name,
    job?.data,
    {
      queueName: 'document.extract',
      tenantId: job?.data?.tenantId,
      loanId: job?.data?.loanId,
      documentVersionId: job?.data?.documentVersionId,
    }
  );
});

workers.push(documentExtractWorker);
console.log("🧠 Worker listening on queue: document.extract");

// Start servicing recompute worker
const servicingWorker = startServicingRecomputeWorker();
if (servicingWorker) workers.push(servicingWorker);

// Start trading recompute worker
const tradingWorker = startTradingRecomputeWorker();
if (tradingWorker) workers.push(tradingWorker);

// Start ESG verify worker
const esgWorker = startEsgVerifyWorker(minioStorage);
if (esgWorker) workers.push(esgWorker);

// Start AI explain worker (Week 3 - Track B Step B7)
const aiExplainWorker = startAiExplainWorker(prisma, connection);
if (aiExplainWorker) workers.push(aiExplainWorker);

// Start Ops worker (Week 3 - Track C Step C1)
const opsWorker = startOpsWorker(prisma, connection);
if (opsWorker) workers.push(opsWorker);

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  logError(reason, {
    component: 'Process',
    event: 'unhandledRejection',
    promise: String(promise),
  });
});

process.on('uncaughtException', (error) => {
  logError(error, {
    component: 'Process',
    event: 'uncaughtException',
  });
  // Note: After logging, the process will exit, but PM2 will restart it
  // Give brief time for error to be logged, then exit
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Graceful shutdown handler
let isShuttingDown = false;
let shutdownTimeout: NodeJS.Timeout | null = null;

const shutdown = async (signal: string) => {
  if (isShuttingDown) {
    console.log('Shutdown already in progress, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  console.log(`Received ${signal}, shutting down gracefully...`);

  // Set a maximum shutdown timeout (30 seconds)
  shutdownTimeout = setTimeout(() => {
    console.error('Shutdown timeout exceeded, forcing exit...');
    process.exit(1);
  }, 30000);

  try {
    // Close all workers with timeout protection
    console.log(`Closing ${workers.length} workers...`);
    await Promise.allSettled(
      workers.map(async (worker) => {
        try {
          // Add timeout for each worker close (5 seconds)
          await Promise.race([
            worker.close(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Worker close timeout')), 5000)
            ),
          ]);
          console.log(`Worker ${worker.name || 'unknown'} closed`);
        } catch (error) {
          logError(error, {
            component: 'Shutdown',
            workerName: worker.name || 'unknown',
            event: 'worker_close_error',
          });
          // Continue with shutdown even if worker close fails
        }
      })
    );

    // Close Prisma client with timeout
    console.log('Closing Prisma client...');
    try {
      await Promise.race([
        prisma.$disconnect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Prisma disconnect timeout')), 5000)
        ),
      ]);
      console.log('Prisma client closed');
    } catch (error) {
      logError(error, {
        component: 'Shutdown',
        event: 'prisma_disconnect_error',
      });
      // Continue with shutdown
    }

    // Close Redis connection with timeout
    console.log('Closing Redis connection...');
    try {
      await Promise.race([
        connection.quit(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis quit timeout')), 5000)
        ),
      ]);
      console.log('Redis connection closed');
    } catch (error) {
      // Connection might already be closed, ignore error
      logWarning('Redis connection close error (may already be closed)', {
        component: 'Shutdown',
        event: 'redis_close_error',
      });
    }

    // Clear shutdown timeout
    if (shutdownTimeout) {
      clearTimeout(shutdownTimeout);
      shutdownTimeout = null;
    }

    console.log('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logError(error, {
      component: 'Shutdown',
      event: 'shutdown_error',
    });
    
    // Clear timeout before exit
    if (shutdownTimeout) {
      clearTimeout(shutdownTimeout);
    }
    
    process.exit(1);
  }
};

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log('✅ Worker service started with error handling and graceful shutdown');
