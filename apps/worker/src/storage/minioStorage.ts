import { Client } from "minio";

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const client = new Client({
  endPoint: must("MINIO_ENDPOINT").replace(/^https?:\/\//, ""),
  port: Number(process.env.MINIO_PORT ?? "9000"),
  useSSL: (process.env.MINIO_SSL ?? "false") === "true",
  accessKey: must("MINIO_ACCESS_KEY"),
  secretKey: must("MINIO_SECRET_KEY"),
});

const bucket = must("MINIO_BUCKET");

export const minioStorage = {
  async getObject({ key }: { key: string }): Promise<Buffer> {
    const stream = await client.getObject(bucket, key);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });
    return Buffer.concat(chunks);
  },
};

