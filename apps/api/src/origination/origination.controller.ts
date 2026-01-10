import { Body, Controller, Headers, Post } from "@nestjs/common";
import { OriginationService } from "./origination.service";
import { IngestLoanRequestDto, IngestLoanResponseDto } from "./dto/ingest-loan.dto";
import { TenantContext } from "../tenant/tenant-context";

@Controller("origination")
export class OriginationController {
  constructor(
    private readonly originationService: OriginationService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Post("ingest")
  async ingest(
    @Headers("x-actor") actor: string | undefined,
    @Body() body: IngestLoanRequestDto,
  ): Promise<IngestLoanResponseDto> {
    return this.originationService.ingestLoan(actor, body);
  }
}

