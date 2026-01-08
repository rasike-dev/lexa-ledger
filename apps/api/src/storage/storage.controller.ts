import { Controller, Get } from "@nestjs/common";
import { StorageService } from "./storage.service";

@Controller("storage")
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get("smoke")
  async smoke() {
    const result = await this.storageService.putObject({
      key: `smoke/${Date.now()}.txt`,
      body: Buffer.from("MinIO smoke test"),
      contentType: "text/plain",
    });
    return { ok: true, key: result.key };
  }
}

