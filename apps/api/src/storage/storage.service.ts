import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { logApiError } from "../common/error-logger";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

@Injectable()
export class StorageService {
  private readonly bucket = must("S3_BUCKET");
  private readonly client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    endpoint: must("S3_ENDPOINT"),
    forcePathStyle: true, // required for MinIO
    credentials: {
      accessKeyId: must("S3_ACCESS_KEY"),
      secretAccessKey: must("S3_SECRET_KEY"),
    },
  });

  async putObject(params: { key: string; body: Buffer; contentType: string }) {
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: params.key,
          Body: params.body,
          ContentType: params.contentType,
        }),
      );
      return { key: params.key };
    } catch (error) {
      logApiError(error, {
        component: 'StorageService',
        event: 'put_object_failed',
        storageKey: params.key,
        contentType: params.contentType,
        fileSize: params.body.length,
      });
      throw new InternalServerErrorException("Failed to upload file to storage");
    }
  }
}

