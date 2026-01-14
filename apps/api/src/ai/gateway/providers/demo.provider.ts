/**
 * Demo LLM Provider
 * 
 * Week 3 - Track B: AI-Ready Architecture
 * Step B4: Provider Routing + Fallback
 * 
 * Deterministic provider for testing the gateway pipeline.
 * Now supports:
 * - Named instances (PRIMARY, FALLBACK)
 * - Model selection
 * - Simulated transient failures
 */

import { LlmProvider, LlmProviderResponse } from '../llm.provider';
import { LlmTransientError } from '../errors';

/**
 * Demo Provider
 * 
 * Returns a deterministic, schema-valid JSON response.
 * 
 * New features (B4):
 * - Named provider instances (for primary/fallback testing)
 * - Model parameter support
 * - Optional transient failure simulation
 * 
 * Usage:
 * ```typescript
 * const primary = new DemoProvider('DEMO_PRIMARY', 0.0);    // Never fails
 * const fallback = new DemoProvider('DEMO_FALLBACK', 0.0); // Never fails
 * 
 * // Or test fallback logic:
 * const primary = new DemoProvider('DEMO_PRIMARY', 0.3);    // Fails 30% of time
 * ```
 */
export class DemoProvider implements LlmProvider {
  constructor(
    private readonly providerName: string,
    private readonly failTransientRate: number = 0, // 0..1 (0 = never fail, 1 = always fail)
  ) {}

  name() {
    return this.providerName;
  }

  async generateJson(params: { prompt: string; model: string; vars?: any }): Promise<LlmProviderResponse> {
    // Optional: simulate transient failure for proving fallback logic
    if (this.failTransientRate > 0 && Math.random() < this.failTransientRate) {
      throw new LlmTransientError(
        `Simulated transient failure in ${this.providerName} (rate: ${this.failTransientRate})`,
      );
    }

    // Extract facts from prompt (facts are embedded in the rendered prompt as JSON)
    let facts: any = null;
    let audience = 'TRADING_ANALYST';
    let verbosity = 'STANDARD';

    // Try to extract facts from vars first (if passed directly)
    if (params.vars?.facts) {
      facts = params.vars.facts;
      audience = params.vars.audience || audience;
      verbosity = params.vars.verbosity || verbosity;
    } else {
      // Parse facts from prompt (prompt contains "FACTS (immutable):" followed by JSON)
      try {
        const factsMatch = params.prompt.match(/FACTS \(immutable\):\s*\n([\s\S]*?)(?:\n\n|$)/);
        if (factsMatch) {
          facts = JSON.parse(factsMatch[1].trim());
        }
        // Extract audience and verbosity from prompt
        const audienceMatch = params.prompt.match(/AUDIENCE:\s*(\w+)/);
        if (audienceMatch) audience = audienceMatch[1];
        const verbosityMatch = params.prompt.match(/VERBOSITY:\s*(\w+)/);
        if (verbosityMatch) verbosity = verbosityMatch[1];
      } catch (e) {
        // If parsing fails, continue with fallback
      }
    }

    // Generate realistic explanation based on facts if available
    if (facts && params.model.includes('explain-trading')) {
      return this.generateTradingReadinessExplanation(facts, audience, verbosity, params.model);
    }

    // Fallback for other explanation types or when facts are not available
    // In a real provider (OpenAI, Anthropic), you'd:
    // 1. Call external API with the model parameter
    // 2. Parse response
    // 3. Extract token counts
    // 4. Return standardized format
    
    return {
      model: params.model,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      json: {
        summary: `Explanation generated using model ${params.model}.`,
        explanation: [
          'This explanation is based on deterministic fact snapshots.',
          'All recommendations are derived from actual loan data.',
        ],
        recommendations: [
          'Review the fact snapshot details for complete context.',
          'Address any blocking issues identified in the assessment.',
        ],
        confidence: 'HIGH',
        version: 1,
      },
    };
  }

  /**
   * Generate realistic trading readiness explanation based on facts
   */
  private generateTradingReadinessExplanation(
    facts: any,
    audience: string,
    verbosity: string,
    model: string,
  ): LlmProviderResponse {
    const score = facts.readinessScore ?? 0;
    const band = facts.readinessBand ?? 'RED';
    const contributingFactors = facts.contributingFactors ?? {};
    const blockers = Array.isArray(facts.blockingIssues) ? facts.blockingIssues : [];

    const checklistScore = contributingFactors.checklistScore ?? 0;
    const checklistMax = contributingFactors.checklistMax ?? 100;
    const covenantHealth = contributingFactors.covenantHealth ?? 'UNKNOWN';
    const documentationComplete = contributingFactors.documentationComplete ?? false;
    const esgStatus = contributingFactors.esgStatus ?? 'UNKNOWN';

    // Generate realistic summary
    let summary = '';
    if (band === 'GREEN') {
      summary = `This loan demonstrates strong trading readiness (${score}/100), with ${Math.round((checklistScore / checklistMax) * 100)}% of due diligence checklist items completed. All critical documentation is in place and covenant compliance is verified.`;
    } else if (band === 'AMBER') {
      const completionPct = Math.round((checklistScore / checklistMax) * 100);
      summary = `This loan shows moderate trading readiness (${score}/100) with ${completionPct}% checklist completion. ${blockers.length > 0 ? `${blockers.length} outstanding issue${blockers.length > 1 ? 's' : ''} require${blockers.length === 1 ? 's' : ''} attention before optimal trading conditions can be achieved.` : 'Some documentation or compliance items remain outstanding.'}`;
    } else {
      summary = `This loan currently shows limited trading readiness (${score}/100) with ${blockers.length} critical blocking issue${blockers.length > 1 ? 's' : ''}. Significant remediation is required before this loan can be considered trade-ready.`;
    }

    // Build explanation points
    const explanation: string[] = [];

    if (blockers.length > 0) {
      blockers.slice(0, verbosity === 'SHORT' ? 2 : blockers.length).forEach((issue: string) => {
        if (issue.includes('Leverage ratio')) {
          explanation.push(issue + ' This financial metric requires monitoring and may impact buyer confidence in secondary market transactions.');
        } else if (issue.includes('amendment') || issue.includes('Amendment')) {
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

    const checklistPct = Math.round((checklistScore / checklistMax) * 100);
    if (checklistPct < 100) {
      const remaining = checklistMax - checklistScore;
      explanation.push(
        `Due diligence checklist is ${checklistPct}% complete (${checklistScore}/${checklistMax} items). ${remaining} item${remaining > 1 ? 's remain' : ' remains'} outstanding, which may delay or complicate trading processes.`
      );
    }

    if (covenantHealth === 'WARN' || covenantHealth === 'BREACH') {
      explanation.push(
        `Covenant health is currently ${covenantHealth === 'BREACH' ? 'in breach' : 'at warning level'}. This status must be resolved or clearly disclosed to potential buyers, as it represents a material risk factor.`
      );
    }

    if (!documentationComplete) {
      explanation.push(
        'Key documentation items are incomplete or missing. Complete facility agreements, security documents, and amendments must be available for buyer due diligence.'
      );
    }

    if (verbosity === 'SHORT' && explanation.length > 3) {
      explanation.splice(3);
    }

    // Build recommendations
    const recommendations: string[] = [];

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

    if (checklistScore < checklistMax) {
      const remaining = checklistMax - checklistScore;
      recommendations.push(
        `Complete the ${remaining} remaining due diligence checklist item${remaining > 1 ? 's' : ''} to improve trading readiness score.`
      );
    }

    if (covenantHealth === 'WARN' || covenantHealth === 'BREACH') {
      recommendations.push(
        covenantHealth === 'BREACH'
          ? 'Address covenant breach immediately; document remediation plan and obtain lender consent before considering trade.'
          : 'Monitor covenant metrics closely; engage with borrower to prevent breach and maintain compliance.'
      );
    }

    if (!documentationComplete) {
      recommendations.push('Upload all missing facility agreement documents, executed amendments, and security instruments to complete the documentation package.');
    }

    if (verbosity === 'SHORT' && recommendations.length > 3) {
      recommendations.splice(3);
    }

    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    if (documentationComplete && covenantHealth === 'OK' && blockers.length === 0) {
      confidence = 'HIGH';
    } else if (blockers.length > 3 || !documentationComplete) {
      confidence = 'LOW';
    }

    return {
      model,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      json: {
        summary,
        explanation,
        recommendations,
        confidence,
        version: 1,
      },
    };
  }
}
