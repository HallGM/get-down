import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;
let _bucketName: string | null = null;

function getClient(): { client: S3Client; bucketName: string } {
  if (_client && _bucketName) return { client: _client, bucketName: _bucketName };

  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

  const missing = [
    !accountId && "CLOUDFLARE_R2_ACCOUNT_ID",
    !accessKeyId && "CLOUDFLARE_R2_ACCESS_KEY_ID",
    !secretAccessKey && "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    !bucketName && "CLOUDFLARE_R2_BUCKET_NAME",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(`Missing R2 configuration: ${missing.join(", ")}`);
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: accessKeyId!,
      secretAccessKey: secretAccessKey!,
    },
  });
  _bucketName = bucketName!;

  return { client: _client, bucketName: _bucketName };
}

export async function uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<void> {
  const { client, bucketName } = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
}

export async function deleteFile(key: string): Promise<void> {
  const { client, bucketName } = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
}

export async function getPresignedUrl(key: string, ttlSeconds = 3600): Promise<string> {
  if (!/^expenses\/\d+\/[0-9a-f-]{36}(\.[a-zA-Z0-9]+)?$/.test(key)) {
    throw new Error(`Invalid document key format: "${key}"`);
  }
  const { client, bucketName } = getClient();
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
    { expiresIn: ttlSeconds }
  );
}
