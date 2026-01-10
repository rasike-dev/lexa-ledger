import { Body, Controller, Get, Param, Post, Req, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Request } from "express";
import { EsgService } from "./esg.service";
import { CreateKpiRequestDto, ESGSummaryResponseDto, UploadEvidenceResponseDto } from "./dto/esg.dto";
import { Roles } from "../auth/roles.decorator";

@Controller("loans/:loanId/esg")
export class EsgController {
  constructor(private readonly esg: EsgService) {}

  @Get("summary")
  async summary(
    @Param("loanId") loanId: string,
  ): Promise<ESGSummaryResponseDto> {
    return this.esg.getSummary({ loanId }) as any;
  }

  @Roles('ESG_ANALYST', 'ESG_VERIFIER', 'TENANT_ADMIN')
  @Post("kpis")
  async createKpi(
    @Req() req: Request,
    @Param("loanId") loanId: string,
    @Body() body: CreateKpiRequestDto,
  ) {
    return this.esg.createKpi({ loanId, body, req });
  }

  @Roles('ESG_ANALYST', 'ESG_VERIFIER', 'TENANT_ADMIN')
  @Post("evidence/upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadEvidence(
    @Req() req: Request,
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
      req,
    }) as any;
  }

  @Roles('ESG_ANALYST', 'ESG_VERIFIER', 'TENANT_ADMIN')
  @Post("evidence/:evidenceId/verify")
  async verifyNow(
    @Req() req: Request,
    @Param("loanId") loanId: string,
    @Param("evidenceId") evidenceId: string,
  ) {
    return this.esg.requestVerify({ loanId, evidenceId, req });
  }
}

