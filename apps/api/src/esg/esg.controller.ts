import { Body, Controller, Get, Headers, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { EsgService } from "./esg.service";
import { CreateKpiRequestDto, ESGSummaryResponseDto, UploadEvidenceResponseDto } from "./dto/esg.dto";
import { TenantContext } from "../tenant/tenant-context";
import { Roles } from "../auth/roles.decorator";

@Controller("loans/:loanId/esg")
export class EsgController {
  constructor(
    private readonly esg: EsgService,
    private readonly tenantContext: TenantContext,
  ) {}

  @Get("summary")
  async summary(
    @Param("loanId") loanId: string,
  ): Promise<ESGSummaryResponseDto> {
    return this.esg.getSummary({ loanId }) as any;
  }

  @Roles('ESG_ANALYST', 'ESG_VERIFIER', 'TENANT_ADMIN')
  @Post("kpis")
  async createKpi(
    @Param("loanId") loanId: string,
    @Body() body: CreateKpiRequestDto,
  ) {
    return this.esg.createKpi({ loanId, body });
  }

  @Roles('ESG_ANALYST', 'ESG_VERIFIER', 'TENANT_ADMIN')
  @Post("evidence/upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadEvidence(
    @Param("loanId") loanId: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadEvidenceResponseDto> {
    return this.esg.uploadEvidence({
      loanId,
      kpiId: body.kpiId,
      title: body.title ?? file?.originalname ?? "Evidence",
      type: body.type,
      file,
    }) as any;
  }

  @Roles('ESG_ANALYST', 'ESG_VERIFIER', 'TENANT_ADMIN')
  @Post("evidence/:evidenceId/verify")
  async verifyNow(
    @Headers("x-actor") actor: string | undefined,
    @Param("loanId") loanId: string,
    @Param("evidenceId") evidenceId: string,
  ) {
    return this.esg.requestVerify({ loanId, evidenceId, actorName: actor });
  }
}

