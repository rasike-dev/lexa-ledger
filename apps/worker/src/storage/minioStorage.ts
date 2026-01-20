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
  async getObject({ key }: { key: string }, retries = 3): Promise<Buffer> {
    // Validate key
    if (!key || typeof key !== 'string') {
      throw new Error(`Invalid storage key: ${key}`);
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Get stream with timeout
        const stream = await Promise.race([
          client.getObject(bucket, key),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('MinIO getObject timeout (30s)')), 30000)
          )
        ]);
        
        const chunks: Buffer[] = [];
        await Promise.race([
          new Promise<void>((resolve, reject) => {
            stream.on("data", (c) => {
              chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
            });
            stream.on("end", () => resolve());
            stream.on("error", reject);
          }),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Stream processing timeout (60s)')), 60000)
          )
        ]);
        
        return Buffer.concat(chunks);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`MinIO getObject attempt ${attempt}/${retries} failed for key ${key}:`, lastError.message);
        
        if (attempt < retries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw new Error(`Failed to get object ${key} after ${retries} attempts: ${lastError?.message}`);
  },
};

