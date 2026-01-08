import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: any) {
    app.enableShutdownHooks();
    this.$on("beforeExit" as any, async () => {
      await this.$disconnect();
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

