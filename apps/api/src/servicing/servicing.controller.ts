import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { ServicingService } from "./servicing.service";
import { SetScenarioRequestDto, SetScenarioResponseDto, ServicingSummaryResponseDto } from "./dto/servicing.dto";
import { Roles } from "../auth/roles.decorator";

@Controller("loans/:loanId/servicing")
export class ServicingController {
  constructor(private readonly servicing: ServicingService) {}

  @Get("summary")
  async summary(
    @Param("loanId") loanId: string,
  ): Promise<ServicingSummaryResponseDto> {
    return this.servicing.getSummary({ loanId }) as any;
  }

  @Roles('SERVICING_MANAGER', 'TENANT_ADMIN')
  @Post("scenario")
  async setScenario(
    @Req() req: Request,
    @Param("loanId") loanId: string,
    @Body() body: SetScenarioRequestDto,
  ): Promise<SetScenarioResponseDto> {
    return this.servicing.setScenario({
      loanId,
      scenario: body.scenario,
      req,
    }) as any;
  }

  @Roles('SERVICING_MANAGER', 'TENANT_ADMIN')
  @Post("recompute")
  async recompute(
    @Req() req: Request,
    @Param("loanId") loanId: string,
    @Body() body: { scenario?: "BASE" | "STRESS" },
  ) {
    return this.servicing.requestRecompute({
      loanId,
      scenario: body?.scenario,
      req,
    });
  }
}

