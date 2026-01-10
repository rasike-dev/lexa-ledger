import { Controller, Get, Param, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { TradingService } from "./trading.service";
import { TradingRecomputeResponseDto, TradingSummaryResponseDto } from "./dto/trading.dto";
import { Roles } from "../auth/roles.decorator";

@Controller("loans/:loanId/trading")
export class TradingController {
  constructor(private readonly trading: TradingService) {}

  @Get("summary")
  async summary(
    @Param("loanId") loanId: string,
  ): Promise<TradingSummaryResponseDto> {
    return this.trading.getSummary({ loanId }) as any;
  }

  @Roles('TRADING_ANALYST', 'TENANT_ADMIN')
  @Post("recompute")
  async recompute(
    @Req() req: Request,
    @Param("loanId") loanId: string,
  ): Promise<TradingRecomputeResponseDto> {
    return this.trading.requestRecompute({ loanId, req }) as any;
  }
}
