/**
 * Demo LLM Provider
 * 
 * Mock AI provider for development and demo purposes.
 * Returns deterministic, sensible explanations based on facts.
 * NO actual AI API calls.
 */

import { Injectable } from '@nestjs/common';
import { LlmProvider } from '../llm.provider';
import { ExplainResult, ExplainTradingReadinessInput } from '../explainability.types';

@Injectable()
export class DemoLlmProvider implements LlmProvider {
  name(): string {
    return 'DEMO_PROVIDER';
  }

  async explainTradingReadiness(input: ExplainTradingReadinessInput): Promise<ExplainResult> {
    const { facts, audience, verbosity } = input;

    const score = facts.readinessScore ?? 0;
    const band = facts.readinessBand ?? 'RED';
    const contributingFactors = facts.contributingFactors ?? {};
    const blockers = facts.blockingIssues ?? [];

    // ---- Generate summary based on band ----
    let summary = '';
    if (band === 'GREEN') {
      summary = `This loan is currently assessed as GREEN readiness (${score}/100), indicating strong preparedness for trading. The documentation is ${Math.round((contributingFactors.documentationCompleteness ?? 0) * 100)}% complete and covenant compliance is ${contributingFactors.covenantCompliance ? 'verified' : 'pending'}.`;
    } else if (band === 'AMBER') {
      summary = `This loan is assessed as AMBER readiness (${score}/100), suggesting moderate preparedness with some outstanding items. Documentation completeness is at ${Math.round((contributingFactors.documentationCompleteness ?? 0) * 100)}% and ${contributingFactors.servicingAlerts ?? 0} servicing alerts are active.`;
    } else {
      summary = `This loan is assessed as RED readiness (${score}/100), indicating significant gaps before trading. ${blockers.length} critical issues are currently blocking progress.`;
    }

    // Adjust summary based on audience
    if (audience === 'INVESTOR') {
      summary = `From an investor perspective: ${summary}`;
    } else if (audience === 'COMPLIANCE') {
      summary = `Compliance assessment: ${summary}`;
    }

    // ---- Build explanation points ----
    const explanation: string[] = [];

    if ((contributingFactors.documentationCompleteness ?? 0) < 0.8) {
      explanation.push(
        `Documentation coverage is ${Math.round((contributingFactors.documentationCompleteness ?? 0) * 100)}%, below the recommended 80% threshold for trading.`
      );
    }

    if (!contributingFactors.covenantCompliance) {
      explanation.push('Covenant compliance checks are incomplete or have failed.');
    }

    if ((contributingFactors.servicingAlerts ?? 0) > 0) {
      explanation.push(
        `${contributingFactors.servicingAlerts} servicing alert(s) are active, which may impact buyer confidence.`
      );
    }

    if (contributingFactors.amendmentStability === 'LOW') {
      explanation.push(
        'Recent amendment activity suggests the loan terms are still evolving, which adds transaction risk.'
      );
    }

    if (!contributingFactors.auditTrailCompleteness) {
      explanation.push('Audit trail is incomplete, reducing transparency for due diligence.');
    }

    // Add more detail for DETAILED verbosity
    if (verbosity === 'DETAILED') {
      explanation.push(
        `ESG disclosure coverage is at ${Math.round((contributingFactors.esgDisclosureCoverage ?? 0) * 100)}%.`
      );
      explanation.push(
        `Amendment stability is assessed as ${contributingFactors.amendmentStability ?? 'NONE'}.`
      );
    }

    // Trim for SHORT verbosity
    if (verbosity === 'SHORT' && explanation.length > 2) {
      explanation.splice(2);
    }

    // ---- Build recommendations ----
    const recommendations: string[] = [];

    blockers.forEach((issue: string) => {
      if (issue.startsWith('Missing:')) {
        recommendations.push(`Complete: ${issue.replace('Missing: ', '')}`);
      } else if (issue.startsWith('Blocked:')) {
        recommendations.push(`Unblock: ${issue.replace('Blocked: ', '')}`);
      } else {
        recommendations.push(`Address: ${issue}`);
      }
    });

    if ((contributingFactors.documentationCompleteness ?? 0) < 1.0) {
      recommendations.push('Upload or link all missing facility agreement documents.');
    }

    if (!contributingFactors.covenantCompliance) {
      recommendations.push('Run covenant compliance tests and resolve any failures.');
    }

    // Trim for SHORT verbosity
    if (verbosity === 'SHORT' && recommendations.length > 2) {
      recommendations.splice(2);
    }

    // ---- Confidence (based on data quality) ----
    const confidence = contributingFactors.auditTrailCompleteness ? 'HIGH' : 'MEDIUM';

    return {
      summary,
      explanation,
      recommendations,
      confidence,
      version: 1,
    };
  }

  /**
   * Explain ESG KPI assessment (Demo implementation)
   * 
   * Week 3 - Track A: ESG KPI Reasoning
   */
  async explainEsgKpi(input: any): Promise<any> {
    const f = input?.facts ?? {};
    const status = f.status ?? 'UNKNOWN';
    const kpiName = f.kpiName ?? 'KPI';
    const reasonCodes = Array.isArray(f.reasonCodes) ? f.reasonCodes : [];

    let summary = `${kpiName} is currently ${status}.`;
    const explanation: string[] = [
      'This explanation is generated strictly from a deterministic KPI fact snapshot.',
    ];
    let recommendations: string[] = [];

    if (reasonCodes.length > 0) {
      explanation.push(`Reason codes: ${reasonCodes.join(', ')}`);
    }

    switch (status) {
      case 'NEEDS_VERIFICATION':
        summary += ' Verification evidence is required.';
        recommendations.push('Attach verifier evidence and re-run verification.');
        break;
      case 'FAIL':
        summary += ' This KPI does not meet the target threshold.';
        recommendations.push('Review measurement methodology and evidence.');
        break;
      case 'PASS':
        summary += ' This KPI meets the target threshold.';
        recommendations.push('Continue monitoring to maintain compliance.');
        break;
      default:
        summary += ' Status could not be determined.';
        recommendations.push('Recompute KPI facts to get updated status.');
    }

    if (f.measurement) {
      explanation.push(
        `Measurement: ${JSON.stringify(f.measurement.value)} ${f.measurement.unit || ''} (${f.measurement.period || 'N/A'})`,
      );
    }

    return {
      summary,
      explanation,
      recommendations,
      confidence: 'HIGH',
      version: 1,
    };
  }

  /**
   * Explain Covenant breach assessment (Demo implementation)
   * 
   * Week 3 - Track A: Covenant Breach Explainability
   * 
   * SAFETY RULE:
   * ✅ Explains evaluated covenant logic + numeric triggers
   * ❌ Does NOT interpret raw legal text or invent obligations
   */
  async explainCovenant(input: any): Promise<any> {
    const f = input?.facts ?? {};
    const status = f.status ?? 'UNKNOWN';
    const name = f.covenantName ?? 'Covenant';
    const thr = f.threshold ?? {};
    const obs = f.observed ?? {};
    const delta = f.breachDetail?.delta;

    const thresholdText =
      thr?.metric && thr?.operator && thr?.value !== undefined
        ? `${thr.metric} ${thr.operator} ${thr.value}`
        : 'threshold not available';

    const observedText =
      obs?.metric && obs?.value !== undefined
        ? `${obs.metric} = ${obs.value} (as of ${obs.asOf ?? 'unknown'})`
        : 'observed value not available';

    let summary = `${name} status is ${status}.`;
    const explanation: string[] = [
      'This explanation is generated strictly from a deterministic covenant evaluation snapshot.',
      `Threshold: ${thresholdText}.`,
      `Observed: ${observedText}.`,
    ];

    if (delta !== undefined) {
      explanation.push(`Delta vs threshold: ${delta}.`);
    } else {
      explanation.push('Delta not available.');
    }

    explanation.push(
      'Note: This is not a legal interpretation; it explains evaluated metrics and triggers only.',
    );

    let recommendations: string[] = [];

    switch (status) {
      case 'BREACH':
        summary += ' Covenant is currently in breach.';
        recommendations.push('Review the underlying metric inputs and confirm evidence sources.');
        recommendations.push('Initiate internal breach workflow per policy.');
        break;
      case 'AT_RISK':
        summary += ' Covenant is at risk of breach.';
        recommendations.push('Monitor the metric trend and consider pre-emptive mitigation actions.');
        break;
      case 'COMPLIANT':
        summary += ' Covenant is currently compliant.';
        recommendations.push('Continue monitoring to maintain compliance.');
        break;
      default:
        summary += ' Status could not be determined.';
        recommendations.push('Recompute covenant facts to get updated status.');
    }

    return {
      summary,
      explanation,
      recommendations,
      confidence: 'HIGH',
      version: 1,
    };
  }

  /**
   * Explain Portfolio Risk Distribution (Demo implementation)
   * 
   * Week 3 - Track A: Portfolio-level Intelligence
   * 
   * Generates static explanations based on aggregated portfolio metrics.
   */
  async explainPortfolioRisk(input: any): Promise<any> {
    const f = input?.facts ?? {};
    const totals = f.totals ?? {};
    const dist = f.distributions ?? {};
    const drivers = Array.isArray(f.topDrivers) ? f.topDrivers : [];
    const anomalies = Array.isArray(f.anomalies) ? f.anomalies : [];

    const summary = `Portfolio risk overview: ${totals.loans ?? '?'} loans, exposure ${totals.exposure ?? '?'} ${totals.currency ?? ''}.`;

    const explanation: string[] = [];

    // Trading readiness distribution
    if (dist.readinessBands) {
      explanation.push(
        `Trading readiness distribution: ${JSON.stringify(dist.readinessBands)}.`,
      );
    }

    // Covenant health
    if (dist.covenantStatus) {
      explanation.push(`Covenant health distribution: ${JSON.stringify(dist.covenantStatus)}.`);
    }

    // ESG status
    if (dist.esgStatus) {
      explanation.push(`ESG status distribution: ${JSON.stringify(dist.esgStatus)}.`);
    }

    // Top drivers
    if (drivers.length > 0) {
      explanation.push(
        `Top drivers: ${drivers.map((d: any) => `${d.driver} (${d.count})`).join(", ")}.`,
      );
    } else {
      explanation.push("No ranked drivers available.");
    }

    explanation.push(
      'Note: This explanation is based solely on deterministic portfolio aggregates.',
    );

    return {
      summary,
      explanation,
      recommendations: [
        'Prioritize verification workflow for ESG items marked NEEDS_VERIFICATION.',
        'Review loans with covenant BREACH and confirm remediation actions per policy.',
        'Target documentation gaps to improve tradability across AMBER loans.',
      ],
      confidence: 'HIGH',
      version: 1,
    };
  }
}

