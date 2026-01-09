import { Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { TradingService } from "./trading.service";
import { TradingRecomputeResponseDto, TradingSummaryResponseDto } from "./dto/trading.dto";

@Controller("loans/:loanId/trading")
export class TradingController {
  constructor(private readonly trading: TradingService) {}

  @Get("summary")
  async summary(
    @Headers("x-tenant-id") tenantId: string,
    @Param("loanId") loanId: string,
  ): Promise<TradingSummaryResponseDto> {
    return this.trading.getSummary({ tenantId, loanId }) as any;
  }

  @Post("recompute")
  async recompute(
    @Headers("x-tenant-id") tenantId: string,
    @Headers("x-actor") actor: string | undefined,
    @Param("loanId") loanId: string,
  ): Promise<TradingRecomputeResponseDto> {
    return this.trading.requestRecompute({ tenantId, loanId, actorName: actor }) as any;
  }
}
