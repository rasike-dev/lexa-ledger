import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { ServicingService } from "./servicing.service";
import { SetScenarioRequestDto, SetScenarioResponseDto, ServicingSummaryResponseDto } from "./dto/servicing.dto";
import { TenantContext } from "../tenant/tenant-context";

@Controller("loans/:loanId/servicing")
export class ServicingController {
  constructor(
    private readonly servicing: ServicingService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Get("summary")
  async summary(
    @Param("loanId") loanId: string,
  ): Promise<ServicingSummaryResponseDto> {
    return this.servicing.getSummary({ loanId }) as any;
  }

  @Post("scenario")
  async setScenario(
    @Headers("x-actor") actor: string | undefined,
    @Param("loanId") loanId: string,
    @Body() body: SetScenarioRequestDto,
  ): Promise<SetScenarioResponseDto> {
    return this.servicing.setScenario({
      loanId,
      scenario: body.scenario,
      actorName: actor,
    }) as any;
  }

  @Post("recompute")
  async recompute(
    @Headers("x-actor") actor: string | undefined,
    @Param("loanId") loanId: string,
    @Body() body: { scenario?: "BASE" | "STRESS" },
  ) {
    return this.servicing.requestRecompute({
      loanId,
      scenario: body?.scenario,
      actorName: actor,
    });
  }
}

