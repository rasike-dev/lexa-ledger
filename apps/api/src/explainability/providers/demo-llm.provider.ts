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
    const blockers = Array.isArray(facts.blockingIssues) ? facts.blockingIssues : [];

    // Extract specific metrics from contributing factors
    const checklistScore = contributingFactors.checklistScore ?? 0;
    const checklistMax = contributingFactors.checklistMax ?? 100;
    const covenantHealth = contributingFactors.covenantHealth ?? 'UNKNOWN';
    const documentationComplete = contributingFactors.documentationComplete ?? false;
    const esgStatus = contributingFactors.esgStatus ?? 'UNKNOWN';

    // ---- Generate realistic summary based on actual data ----
    let summary = '';
    if (band === 'GREEN') {
      summary = `This loan demonstrates strong trading readiness (${score}/100), with ${Math.round((checklistScore / checklistMax) * 100)}% of due diligence checklist items completed. All critical documentation is in place and covenant compliance is verified.`;
    } else if (band === 'AMBER') {
      const completionPct = Math.round((checklistScore / checklistMax) * 100);
      summary = `This loan shows moderate trading readiness (${score}/100) with ${completionPct}% checklist completion. ${blockers.length > 0 ? `${blockers.length} outstanding issue${blockers.length > 1 ? 's' : ''} require${blockers.length === 1 ? 's' : ''} attention before optimal trading conditions can be achieved.` : 'Some documentation or compliance items remain outstanding.'}`;
    } else {
      summary = `This loan currently shows limited trading readiness (${score}/100) with ${blockers.length} critical blocking issue${blockers.length > 1 ? 's' : ''}. Significant remediation is required before this loan can be considered trade-ready.`;
    }

    // Adjust summary based on audience
    if (audience === 'INVESTOR') {
      summary = `From an investor perspective: ${summary}`;
    } else if (audience === 'COMPLIANCE') {
      summary = `Compliance assessment: ${summary}`;
    }

    // ---- Build realistic explanation points based on actual data ----
    const explanation: string[] = [];

    // Reference specific blocking issues
    if (blockers.length > 0) {
      blockers.slice(0, verbosity === 'SHORT' ? 2 : blockers.length).forEach((issue: string) => {
        if (issue.includes('Leverage ratio')) {
          explanation.push(issue + ' This financial metric requires monitoring and may impact buyer confidence in secondary market transactions.');
        } else if (issue.includes('amendment')) {
          explanation.push(issue + ' Recent changes to loan terms introduce additional due diligence requirements for potential buyers.');
        } else if (issue.includes('documentation') || issue.includes('Security')) {
          explanation.push(issue + ' Incomplete documentation creates legal and operational risks that must be resolved before trading.');
        } else if (issue.includes('ESG')) {
          explanation.push(issue + ' ESG verification is increasingly important for secondary market participants and institutional investors.');
        } else {
          explanation.push(issue);
        }
      });
    }

    // Checklist completion status
    const checklistPct = Math.round((checklistScore / checklistMax) * 100);
    if (checklistPct < 100) {
      const remaining = checklistMax - checklistScore;
      explanation.push(
        `Due diligence checklist is ${checklistPct}% complete (${checklistScore}/${checklistMax} items). ${remaining} item${remaining > 1 ? 's remain' : ' remains'} outstanding, which may delay or complicate trading processes.`
      );
    }

    // Covenant health status
    if (covenantHealth === 'WARN' || covenantHealth === 'BREACH') {
      explanation.push(
        `Covenant health is currently ${covenantHealth === 'BREACH' ? 'in breach' : 'at warning level'}. This status must be resolved or clearly disclosed to potential buyers, as it represents a material risk factor.`
      );
    } else if (covenantHealth === 'OK' && verbosity === 'DETAILED') {
      explanation.push('All monitored covenants are currently in compliance, which supports trading readiness.');
    }

    // Documentation completeness
    if (!documentationComplete) {
      explanation.push(
        'Key documentation items are incomplete or missing. Complete facility agreements, security documents, and amendments must be available for buyer due diligence.'
      );
    }

    // ESG status
    if (esgStatus === 'MIXED' || esgStatus === 'FAIL') {
      explanation.push(
        `ESG status is ${esgStatus.toLowerCase()}, with some KPIs not meeting targets or pending verification. This may limit appeal to ESG-focused investors.`
      );
    }

    // Add more detail for DETAILED verbosity
    if (verbosity === 'DETAILED') {
      if (checklistScore > 0) {
        explanation.push(
          `Checklist score breakdown: ${checklistScore} points achieved out of ${checklistMax} maximum, representing ${checklistPct}% completion.`
        );
      }
      if (blockers.length > 0) {
        explanation.push(
          `${blockers.length} blocking issue${blockers.length > 1 ? 's have' : ' has'} been identified that directly impact trading readiness assessment.`
        );
      }
    }

    // Trim for SHORT verbosity
    if (verbosity === 'SHORT' && explanation.length > 3) {
      explanation.splice(3);
    }

    // ---- Build realistic, actionable recommendations ----
    const recommendations: string[] = [];

    // Address specific blocking issues with actionable recommendations
    blockers.forEach((issue: string) => {
      if (issue.includes('Leverage ratio')) {
        recommendations.push('Review and update financial covenants; consider borrower discussions if threshold is approaching breach level.');
      } else if (issue.includes('amendment') || issue.includes('Amendment')) {
        recommendations.push('Ensure all amendments are fully executed, documented, and integrated into the loan record before marketing.');
      } else if (issue.includes('documentation') || issue.includes('Security') || issue.includes('security')) {
        recommendations.push('Complete and execute all security documentation; obtain legal confirmation of perfection before trading.');
      } else if (issue.includes('ESG')) {
        recommendations.push('Complete ESG KPI verification process; attach required evidence and obtain verifier sign-off.');
      } else {
        recommendations.push(`Resolve: ${issue}`);
      }
    });

    // Checklist-specific recommendations
    if (checklistScore < checklistMax) {
      const remaining = checklistMax - checklistScore;
      recommendations.push(
        `Complete the ${remaining} remaining due diligence checklist item${remaining > 1 ? 's' : ''} to improve trading readiness score.`
      );
    }

    // Covenant-specific recommendations
    if (covenantHealth === 'WARN' || covenantHealth === 'BREACH') {
      recommendations.push(
        covenantHealth === 'BREACH'
          ? 'Address covenant breach immediately; document remediation plan and obtain lender consent before considering trade.'
          : 'Monitor covenant metrics closely; engage with borrower to prevent breach and maintain compliance.'
      );
    }

    // Documentation recommendations
    if (!documentationComplete) {
      recommendations.push('Upload all missing facility agreement documents, executed amendments, and security instruments to complete the documentation package.');
    }

    // ESG recommendations
    if (esgStatus === 'MIXED' || esgStatus === 'FAIL') {
      recommendations.push('Complete ESG KPI verification and address any failing metrics to improve marketability to ESG-focused investors.');
    }

    // Trim for SHORT verbosity
    if (verbosity === 'SHORT' && recommendations.length > 3) {
      recommendations.splice(3);
    }

    // ---- Confidence (based on data quality and completeness) ----
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (documentationComplete && covenantHealth === 'OK' && blockers.length === 0) {
      confidence = 'HIGH';
    } else if (blockers.length > 3 || !documentationComplete) {
      confidence = 'LOW';
    }

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

