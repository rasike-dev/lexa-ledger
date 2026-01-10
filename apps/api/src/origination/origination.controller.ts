import { Body, Controller, Post, Req } from "@nestjs/common";
import { Request } from "express";
import { OriginationService } from "./origination.service";
import { IngestLoanRequestDto, IngestLoanResponseDto } from "./dto/ingest-loan.dto";
import { Roles } from "../auth/roles.decorator";

@Controller("origination")
export class OriginationController {
  constructor(private readonly originationService: OriginationService) {}

  @Roles('LOAN_OFFICER', 'TENANT_ADMIN')
  @Post("ingest")
  async ingest(
    @Req() req: Request,
    @Body() body: IngestLoanRequestDto,
  ): Promise<IngestLoanResponseDto> {
    return this.originationService.ingestLoan(req, body);
  }
}

