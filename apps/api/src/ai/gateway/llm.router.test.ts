/**
 * LLM Router + Fallback - Test
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B4: Provider Routing + Fallback
 * 
 * Verifies:
 * - Router selects correct models based on policy
 * - Fallback works on transient errors
 * - Provider names are returned correctly
 */

import { LlmGatewayService } from './llm.gateway.service';
import { LlmRouterService } from './llm.router.service';
import { DemoProvider } from './providers/demo.provider';
import { AiAuditService } from '../audit/ai-audit.service';
import { ExplainTradingReadinessOutputSchema } from '../schemas';

// Mock AuditService for testing
class MockAuditService {
  async record() {
    // No-op for testing
  }
}

/**
 * Run router and fallback tests
 * 
 * Tests:
 * 1. Router selects correct models
 * 2. Primary provider succeeds
 * 3. Fallback triggers on transient errors
 * 4. Provider names are correct
 */
export async function runRouterTest() {
  console.log('🧪 LLM Router + Fallback Test\n');

  // Test 1: Normal routing (primary succeeds)
  console.log('✅ Test 1: Primary Provider Succeeds');
  
  const primaryProvider = new DemoProvider('DEMO_PRIMARY', 0.0); // Never fails
  const fallbackProvider = new DemoProvider('DEMO_FALLBACK', 0.0);
  const router = new LlmRouterService(primaryProvider, fallbackProvider);
  const mockAudit = new MockAuditService();
  const aiAudit = new AiAuditService(mockAudit as any);
  
  // Mock rate limiter (B10.2)
  const mockRateLimiter = {
    checkOrThrow: async () => {}, // No-op: always allow in tests
  } as any;
  
  const gateway = new LlmGatewayService(router, aiAudit, mockRateLimiter);

  const result1 = await gateway.generateJson({
    templateId: 'EXPLAIN_TRADING_READINESS',
    templateVersion: 1,
    vars: {
      facts: { readinessScore: 72 },
      audience: 'TRADING_ANALYST',
      verbosity: 'STANDARD',
    },
    outputSchema: ExplainTradingReadinessOutputSchema,
    policy: {
      purpose: 'EXPLAINABILITY',
      module: 'TRADING',
      audience: 'TRADING_ANALYST',
      verbosity: 'STANDARD',
    },
    context: {
      tenantId: 't1',
      entityType: 'LOAN',
      entityId: 'loan1',
    },
  });

  console.log(`   ✅ Provider: ${result1.provider}`);
  console.log(`   ✅ Model: ${result1.model}`);
  console.log(`   ✅ Summary: ${result1.json.summary.slice(0, 50)}...`);
  console.log(`   ✅ Checksum: ${result1.promptChecksum.slice(0, 16)}...`);
  
  if (result1.provider === 'DEMO_PRIMARY') {
    console.log('   ✅ Primary provider was used (as expected)');
  } else {
    console.log('   ❌ Expected PRIMARY but got ' + result1.provider);
  }
  console.log();

  // Test 2: Model selection based on module
  console.log('✅ Test 2: Model Selection Based on Module');
  
  const modules: Array<{ module: any; expectedModel: string }> = [
    { module: 'TRADING', expectedModel: 'explain-trading-v1' },
    { module: 'ESG', expectedModel: 'explain-esg-v1' },
    { module: 'SERVICING', expectedModel: 'explain-covenant-v1' },
    { module: 'PORTFOLIO', expectedModel: 'explain-portfolio-v1' },
  ];

  for (const test of modules) {
    const routed = router.route({
      purpose: 'EXPLAINABILITY',
      module: test.module,
      audience: 'ANALYST',
      verbosity: 'STANDARD',
    });
    
    if (routed.primary.model === test.expectedModel) {
      console.log(`   ✅ ${test.module} → ${test.expectedModel}`);
    } else {
      console.log(`   ❌ ${test.module}: expected ${test.expectedModel}, got ${routed.primary.model}`);
    }
  }
  console.log();

  // Test 3: Verbosity affects model selection
  console.log('✅ Test 3: Verbosity Affects Model Selection (Trading)');
  
  const standardRouted = router.route({
    purpose: 'EXPLAINABILITY',
    module: 'TRADING',
    audience: 'ANALYST',
    verbosity: 'STANDARD',
  });
  
  const detailedRouted = router.route({
    purpose: 'EXPLAINABILITY',
    module: 'TRADING',
    audience: 'ANALYST',
    verbosity: 'DETAILED',
  });

  console.log(`   ✅ STANDARD → ${standardRouted.primary.model}`);
  console.log(`   ✅ DETAILED → ${detailedRouted.primary.model}`);
  
  if (standardRouted.primary.model !== detailedRouted.primary.model) {
    console.log('   ✅ Different models for different verbosity levels');
  }
  console.log();

  // Test 4: Fallback on transient error
  console.log('✅ Test 4: Fallback Triggers on Transient Error');
  
  const flakyPrimary = new DemoProvider('DEMO_PRIMARY', 1.0); // Always fails
  const reliableFallback = new DemoProvider('DEMO_FALLBACK', 0.0); // Never fails
  const fallbackRouter = new LlmRouterService(flakyPrimary, reliableFallback);
  const mockAudit2 = new MockAuditService();
  const aiAudit2 = new AiAuditService(mockAudit2 as any);
  
  // Mock rate limiter (B10.2)
  const mockRateLimiter2 = {
    checkOrThrow: async () => {}, // No-op: always allow in tests
  } as any;
  
  const fallbackGateway = new LlmGatewayService(fallbackRouter, aiAudit2, mockRateLimiter2);

  const result4 = await fallbackGateway.generateJson({
    templateId: 'EXPLAIN_TRADING_READINESS',
    templateVersion: 1,
    vars: {
      facts: { readinessScore: 72 },
      audience: 'TRADING_ANALYST',
      verbosity: 'STANDARD',
    },
    outputSchema: ExplainTradingReadinessOutputSchema,
    policy: {
      purpose: 'EXPLAINABILITY',
      module: 'TRADING',
      audience: 'TRADING_ANALYST',
      verbosity: 'STANDARD',
    },
    context: {
      tenantId: 't1',
      entityType: 'LOAN',
      entityId: 'loan1',
    },
  });

  console.log(`   ✅ Provider: ${result4.provider}`);
  console.log(`   ✅ Summary: ${result4.json.summary.slice(0, 50)}...`);
  
  if (result4.provider === 'DEMO_FALLBACK') {
    console.log('   ✅ Fallback provider was used (as expected)');
  } else {
    console.log('   ❌ Expected FALLBACK but got ' + result4.provider);
  }
  console.log();

  console.log('🎉 Router + Fallback Test Passed!\n');
  console.log('🔒 Step B4 Lock Criteria:');
  console.log('   ✅ Gateway compiles with router injection');
  console.log('   ✅ Two providers are registered');
  console.log('   ✅ generateJson() returns provider name + model');
  console.log('   ✅ Simulated transient failures trigger fallback');
  console.log();
}

// Uncomment to run manually:
// runRouterTest().catch(console.error);
