export type ScenarioModeDto = "BASE" | "STRESS";
export type CovenantStatusDto = "PASS" | "WARN" | "FAIL";

export class ServicingSummaryResponseDto {
  loanId!: string;
  scenario!: ScenarioModeDto;
  lastTestedAt!: string | null;

  covenants!: Array<{
    covenantId: string;
    code: string;
    title: string;
    threshold: number;
    unit?: string | null;

    value: number;
    status: CovenantStatusDto;
    testedAt: string;
    notes?: string | null;
  }>;
}

export class SetScenarioRequestDto {
  scenario!: ScenarioModeDto; // "BASE" | "STRESS"
}

export class SetScenarioResponseDto {
  loanId!: string;
  scenario!: ScenarioModeDto;
}

