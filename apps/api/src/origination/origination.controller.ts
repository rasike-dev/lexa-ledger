import { Body, Controller, Headers, Post } from "@nestjs/common";
import { OriginationService } from "./origination.service";
import { IngestLoanRequestDto, IngestLoanResponseDto } from "./dto/ingest-loan.dto";

@Controller("origination")
export class OriginationController {
  constructor(private readonly originationService: OriginationService) {}

  @Post("ingest")
  async ingest(
    @Headers("x-tenant-id") tenantId: string,
    @Headers("x-actor") actor: string | undefined,
    @Body() body: IngestLoanRequestDto,
  ): Promise<IngestLoanResponseDto> {
    return this.originationService.ingestLoan(tenantId, actor, body);
  }
}

