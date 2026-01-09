import { Body, Controller, Get, Headers, Param, Post, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { EsgService } from "./esg.service";
import { CreateKpiRequestDto, ESGSummaryResponseDto, UploadEvidenceResponseDto } from "./dto/esg.dto";

@Controller("loans/:loanId/esg")
export class EsgController {
  constructor(private readonly esg: EsgService) {}

  @Get("summary")
  async summary(
    @Headers("x-tenant-id") tenantId: string,
    @Param("loanId") loanId: string,
  ): Promise<ESGSummaryResponseDto> {
    return this.esg.getSummary({ tenantId, loanId }) as any;
  }

  @Post("kpis")
  async createKpi(
    @Headers("x-tenant-id") tenantId: string,
    @Param("loanId") loanId: string,
    @Body() body: CreateKpiRequestDto,
  ) {
    return this.esg.createKpi({ tenantId, loanId, body });
  }

  @Post("evidence/upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadEvidence(
    @Headers("x-tenant-id") tenantId: string,
    @Param("loanId") loanId: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadEvidenceResponseDto> {
    return this.esg.uploadEvidence({
      tenantId,
      loanId,
      kpiId: body.kpiId,
      title: body.title ?? file?.originalname ?? "Evidence",
      type: body.type,
      file,
    }) as any;
  }

  @Post("evidence/:evidenceId/verify")
  async verifyNow(
    @Headers("x-tenant-id") tenantId: string,
    @Headers("x-actor") actor: string | undefined,
    @Param("loanId") loanId: string,
    @Param("evidenceId") evidenceId: string,
  ) {
    return this.esg.requestVerify({ tenantId, loanId, evidenceId, actorName: actor });
  }
}

