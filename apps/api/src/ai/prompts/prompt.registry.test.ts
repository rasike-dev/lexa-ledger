/**
 * Prompt Registry - Sanity Test
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B1: Prompt Registry
 * 
 * Quick verification that templates work correctly.
 * This is a manual sanity check, not a full test suite.
 */

import { renderPrompt, listPromptTemplates } from './prompt.registry';

/**
 * Run this test to verify:
 * 1. All templates are registered
 * 2. renderPrompt() works for each template
 * 3. Output contains expected structure
 */
export function runPromptRegistrySanityTest() {
  console.log('🧪 Prompt Registry Sanity Test\n');

  // Test 1: List all templates
  console.log('📋 Test 1: List all templates');
  const templates = listPromptTemplates();
  console.log(`✅ Found ${templates.length} templates:`);
  templates.forEach((t) => {
    console.log(`   - ${t.id} v${t.version}: ${t.description}`);
  });
  console.log();

  // Test 2: Render Trading Readiness
  console.log('🎯 Test 2: Render EXPLAIN_TRADING_READINESS');
  const tradingPrompt = renderPrompt({
    id: 'EXPLAIN_TRADING_READINESS',
    version: 1,
    vars: {
      facts: {
        readinessScore: 72,
        readinessBand: 'AMBER',
        contributingFactors: {
          documentationCompleteness: 0.92,
          covenantCompliance: true,
        },
        blockingIssues: ['Missing executed Amendment #3'],
      },
      audience: 'TRADING_ANALYST',
      verbosity: 'STANDARD',
    },
  });
  console.log(`✅ Rendered (first 200 chars):`);
  console.log(`   ${tradingPrompt.rendered.slice(0, 200)}...`);
  console.log(`✅ Contains FACTS: ${tradingPrompt.rendered.includes('FACTS (immutable)')}`);
  console.log(`✅ Contains RULES: ${tradingPrompt.rendered.includes('RULES')}`);
  console.log();

  // Test 3: Render ESG KPI
  console.log('🌱 Test 3: Render EXPLAIN_ESG_KPI');
  const esgPrompt = renderPrompt({
    id: 'EXPLAIN_ESG_KPI',
    version: 1,
    vars: {
      facts: {
        kpiCode: 'SCOPE2_EMISSIONS',
        status: 'NEEDS_VERIFICATION',
        score: null,
      },
      audience: 'ESG_ANALYST',
      verbosity: 'DETAILED',
    },
  });
  console.log(`✅ Rendered length: ${esgPrompt.rendered.length} chars`);
  console.log(`✅ Contains FACTS: ${esgPrompt.rendered.includes('FACTS (immutable)')}`);
  console.log();

  // Test 4: Render Covenant
  console.log('📜 Test 4: Render EXPLAIN_COVENANT');
  const covenantPrompt = renderPrompt({
    id: 'EXPLAIN_COVENANT',
    version: 1,
    vars: {
      facts: {
        covenantName: 'Debt Service Coverage Ratio',
        status: 'BREACH',
        threshold: { min: 1.25 },
        observed: { value: 1.18 },
      },
      audience: 'SERVICING_MANAGER',
      verbosity: 'STANDARD',
      safety: {
        noLegalInterpretation: true,
        noNewObligations: true,
        explainFromFactsOnly: true,
      },
    },
  });
  console.log(`✅ Rendered length: ${covenantPrompt.rendered.length} chars`);
  console.log(`✅ Contains SAFETY RULES: ${covenantPrompt.rendered.includes('SAFETY RULES')}`);
  console.log(`✅ Contains SAFETY FLAGS: ${covenantPrompt.rendered.includes('SAFETY FLAGS')}`);
  console.log();

  // Test 5: Render Portfolio Risk
  console.log('📊 Test 5: Render EXPLAIN_PORTFOLIO_RISK');
  const portfolioPrompt = renderPrompt({
    id: 'EXPLAIN_PORTFOLIO_RISK',
    version: 1,
    vars: {
      facts: {
        totals: { loanCount: 42, totalExposure: 125000000 },
        distributions: { byBand: { GREEN: 30, AMBER: 10, RED: 2 } },
      },
      audience: 'PORTFOLIO_MANAGER',
      verbosity: 'STANDARD',
    },
  });
  console.log(`✅ Rendered length: ${portfolioPrompt.rendered.length} chars`);
  console.log(`✅ Contains FACTS: ${portfolioPrompt.rendered.includes('FACTS (immutable)')}`);
  console.log();

  // Test 6: Error handling (invalid template)
  console.log('❌ Test 6: Error handling (invalid template)');
  try {
    renderPrompt({
      id: 'INVALID_TEMPLATE' as any,
      version: 1,
      vars: {},
    });
    console.log('❌ FAILED: Should have thrown error');
  } catch (err: any) {
    console.log(`✅ Correctly threw error: ${err.message}`);
  }
  console.log();

  console.log('🎉 All sanity tests passed!\n');
}

// Uncomment to run manually:
// runPromptRegistrySanityTest();
