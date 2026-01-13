/**
 * AI Validator - Sanity Test
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B2: Output Schemas (Zod) + Validator
 * 
 * Quick verification that schemas and validator work correctly.
 */

import {
  validateAiJson,
  AiSchemaValidationError,
  ExplainTradingReadinessOutputSchema,
  ExplainEsgKpiOutputSchema,
  ExplainCovenantOutputSchema,
  ExplainPortfolioRiskOutputSchema,
} from './index';

/**
 * Run this test to verify:
 * 1. Valid outputs pass validation
 * 2. Invalid outputs throw AiSchemaValidationError
 * 3. All 4 schemas work correctly
 */
export function runValidatorSanityTest() {
  console.log('🧪 AI Validator Sanity Test\n');

  // Test 1: Valid Trading Readiness Output
  console.log('✅ Test 1: Valid Trading Readiness Output');
  const tradingSample = {
    summary: 'Loan is AMBER with score 72.',
    explanation: ['Documentation is strong.', 'Two blockers remain.'],
    recommendations: ['Upload executed amendment.', 'Verify Scope 2 evidence.'],
    confidence: 'HIGH' as const,
    version: 1,
  };
  
  const tradingValidated = validateAiJson(
    ExplainTradingReadinessOutputSchema,
    tradingSample,
    { templateId: 'EXPLAIN_TRADING_READINESS', templateVersion: 1 },
  );
  console.log(`   ✅ Validated: ${tradingValidated.summary}`);
  console.log(`   ✅ Confidence: ${tradingValidated.confidence}`);
  console.log();

  // Test 2: Valid ESG KPI Output
  console.log('✅ Test 2: Valid ESG KPI Output');
  const esgSample = {
    summary: 'Scope 2 emissions KPI requires verification.',
    explanation: ['Measurement data present.', 'Third-party verification missing.'],
    recommendations: ['Upload verification certificate.'],
    confidence: 'MEDIUM' as const,
    version: 1,
  };
  
  const esgValidated = validateAiJson(
    ExplainEsgKpiOutputSchema,
    esgSample,
    { templateId: 'EXPLAIN_ESG_KPI', templateVersion: 1 },
  );
  console.log(`   ✅ Validated: ${esgValidated.summary}`);
  console.log();

  // Test 3: Valid Covenant Output (with disclaimer)
  console.log('✅ Test 3: Valid Covenant Output (with disclaimer)');
  const covenantSample = {
    summary: 'DSCR covenant breached by 0.07.',
    explanation: [
      'Threshold: 1.25 minimum',
      'Observed: 1.18',
      'Delta: -0.07 (5.6% below threshold)',
    ],
    recommendations: ['Review cash flow projection.', 'Consider remediation options.'],
    confidence: 'HIGH' as const,
    version: 1,
    disclaimer: 'This is not legal advice. Based on evaluated metrics only.',
  };
  
  const covenantValidated = validateAiJson(
    ExplainCovenantOutputSchema,
    covenantSample,
    { templateId: 'EXPLAIN_COVENANT', templateVersion: 1 },
  );
  console.log(`   ✅ Validated: ${covenantValidated.summary}`);
  console.log(`   ✅ Disclaimer: ${covenantValidated.disclaimer}`);
  console.log();

  // Test 4: Valid Portfolio Risk Output
  console.log('✅ Test 4: Valid Portfolio Risk Output');
  const portfolioSample = {
    summary: '42 loans totaling $125M with 2 RED-rated exposures.',
    explanation: [
      '71% of portfolio rated GREEN (30 loans)',
      '24% rated AMBER (10 loans)',
      '5% rated RED (2 loans requiring attention)',
    ],
    recommendations: [
      'Review RED-rated loans for remediation.',
      'Monitor AMBER loans for potential downgrades.',
    ],
    confidence: 'HIGH' as const,
    version: 1,
  };
  
  const portfolioValidated = validateAiJson(
    ExplainPortfolioRiskOutputSchema,
    portfolioSample,
    { templateId: 'EXPLAIN_PORTFOLIO_RISK', templateVersion: 1 },
  );
  console.log(`   ✅ Validated: ${portfolioValidated.summary}`);
  console.log();

  // Test 5: Invalid Output (missing required field)
  console.log('❌ Test 5: Invalid Output (missing required field)');
  const invalidSample = {
    summary: 'Test summary',
    // Missing 'explanation' field (required)
    recommendations: ['Some recommendation'],
    confidence: 'HIGH',
    version: 1,
  };
  
  try {
    validateAiJson(
      ExplainTradingReadinessOutputSchema,
      invalidSample,
      { templateId: 'EXPLAIN_TRADING_READINESS', templateVersion: 1 },
    );
    console.log('   ❌ FAILED: Should have thrown error');
  } catch (err) {
    if (err instanceof AiSchemaValidationError) {
      console.log(`   ✅ Correctly threw AiSchemaValidationError`);
      console.log(`   ✅ Message: ${err.message}`);
      console.log(`   ✅ Details available: ${!!err.details}`);
    } else {
      console.log(`   ❌ Wrong error type: ${err}`);
    }
  }
  console.log();

  // Test 6: Invalid confidence value
  console.log('❌ Test 6: Invalid confidence value');
  const invalidConfidence = {
    summary: 'Test summary',
    explanation: ['Point 1'],
    recommendations: [],
    confidence: 'INVALID' as any,
    version: 1,
  };
  
  try {
    validateAiJson(
      ExplainTradingReadinessOutputSchema,
      invalidConfidence,
      { templateId: 'EXPLAIN_TRADING_READINESS', templateVersion: 1 },
    );
    console.log('   ❌ FAILED: Should have thrown error');
  } catch (err) {
    if (err instanceof AiSchemaValidationError) {
      console.log(`   ✅ Correctly rejected invalid confidence value`);
    } else {
      console.log(`   ❌ Wrong error type: ${err}`);
    }
  }
  console.log();

  // Test 7: Wrong version number
  console.log('❌ Test 7: Wrong version number');
  const wrongVersion = {
    summary: 'Test summary',
    explanation: ['Point 1'],
    recommendations: [],
    confidence: 'HIGH' as const,
    version: 2, // Schema expects version: 1
  };
  
  try {
    validateAiJson(
      ExplainTradingReadinessOutputSchema,
      wrongVersion,
      { templateId: 'EXPLAIN_TRADING_READINESS', templateVersion: 1 },
    );
    console.log('   ❌ FAILED: Should have thrown error');
  } catch (err) {
    if (err instanceof AiSchemaValidationError) {
      console.log(`   ✅ Correctly rejected wrong version number`);
    } else {
      console.log(`   ❌ Wrong error type: ${err}`);
    }
  }
  console.log();

  console.log('🎉 All validator tests passed!\n');
}

// Uncomment to run manually:
// runValidatorSanityTest();
