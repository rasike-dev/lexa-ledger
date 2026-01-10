import { Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { TradingService } from "./trading.service";
import { TradingRecomputeResponseDto, TradingSummaryResponseDto } from "./dto/trading.dto";
import { TenantContext } from "../tenant/tenant-context";

@Controller("loans/:loanId/trading")
export class TradingController {
  constructor(
    private readonly trading: TradingService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Get("summary")
  async summary(
    @Param("loanId") loanId: string,
  ): Promise<TradingSummaryResponseDto> {
    return this.trading.getSummary({ loanId }) as any;
  }

  @Post("recompute")
  async recompute(
    @Headers("x-actor") actor: string | undefined,
    @Param("loanId") loanId: string,
  ): Promise<TradingRecomputeResponseDto> {
    return this.trading.requestRecompute({ loanId, actorName: actor }) as any;
  }
}
