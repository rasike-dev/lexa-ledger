import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { ServicingService } from "./servicing.service";
import { SetScenarioRequestDto, SetScenarioResponseDto, ServicingSummaryResponseDto } from "./dto/servicing.dto";

@Controller("loans/:loanId/servicing")
export class ServicingController {
  constructor(private readonly servicing: ServicingService) {}

  @Get("summary")
  async summary(
    @Headers("x-tenant-id") tenantId: string,
    @Param("loanId") loanId: string,
  ): Promise<ServicingSummaryResponseDto> {
    return this.servicing.getSummary({ tenantId, loanId }) as any;
  }

  @Post("scenario")
  async setScenario(
    @Headers("x-tenant-id") tenantId: string,
    @Headers("x-actor") actor: string | undefined,
    @Param("loanId") loanId: string,
    @Body() body: SetScenarioRequestDto,
  ): Promise<SetScenarioResponseDto> {
    return this.servicing.setScenario({
      tenantId,
      loanId,
      scenario: body.scenario,
      actorName: actor,
    }) as any;
  }
}

