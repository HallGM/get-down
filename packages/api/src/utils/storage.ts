import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _client: S3Client | null = null;
let _bucketName: string | null = null;

function getClient(): { client: S3Client; bucketName: string } {
  if (_client && _bucketName) return { client: _client, bucketName: _bucketName };

  const r2AccountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;

  if (r2AccountId) {
    // Production: Cloudflare R2
    const accessKeyId     = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucketName      = process.env.CLOUDFLARE_R2_BUCKET_NAME;

    const missing = [
      !accessKeyId     && "CLOUDFLARE_R2_ACCESS_KEY_ID",
      !secretAccessKey && "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
      !bucketName      && "CLOUDFLARE_R2_BUCKET_NAME",
    ].filter(Boolean);

    if (missing.length > 0) {
      throw new Error(`Missing R2 configuration: ${missing.join(", ")}`);
    }

    _client = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
    _bucketName = bucketName!;
  } else {
    // Local dev: MinIO (S3-compatible, path-style URLs required)
    const endpoint        = process.env.LOCAL_S3_ENDPOINT         ?? "http://localhost:9000";
    const accessKeyId     = process.env.LOCAL_S3_ACCESS_KEY_ID    ?? "minioadmin";
    const secretAccessKey = process.env.LOCAL_S3_SECRET_ACCESS_KEY ?? "minioadmin";
    const bucketName      = process.env.LOCAL_S3_BUCKET_NAME      ?? "get-down-local";

    console.info(`[storage] Using MinIO at ${endpoint}, bucket: ${bucketName}`);

    _client = new S3Client({
      region: "auto",
      endpoint, // Must be browser-accessible — presigned URLs embed this host.
      credentials: { accessKeyId, secretAccessKey },
      // MinIO requires path-style URLs; virtual-hosted style is not supported by default.
      forcePathStyle: true,
    });
    _bucketName = bucketName;
  }

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

/**
 * Check whether an R2 object exists without downloading it.
 * Returns false on NoSuchKey / NotFound; re-throws all other errors.
 */
export async function headFile(key: string): Promise<boolean> {
  const { client, bucketName } = getClient();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    return true;
  } catch (err: unknown) {
    const name = (err as { name?: string })?.name;
    const code = (err as { Code?: string })?.Code;
    if (name === "NoSuchKey" || name === "NotFound" || code === "NoSuchKey" || code === "NotFound") {
      return false;
    }
    // HeadObject returns a generic 404 with no error code on some S3-compatible stores
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    if (status === 404) return false;
    throw err;
  }
}

/**
 * Delete all R2 objects whose keys start with the given prefix.
 * Paginates through the full listing in batches of up to 1000.
 */
export async function deletePrefix(prefix: string): Promise<void> {
  const { client, bucketName } = getClient();
  let continuationToken: string | undefined;

  do {
    const listRes = await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const objects = listRes.Contents ?? [];
    if (objects.length > 0) {
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objects.map((obj) => ({ Key: obj.Key! })),
            Quiet: true,
          },
        })
      );
    }

    continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
  } while (continuationToken);
}

export async function getPresignedUrl(key: string, ttlSeconds = 3600): Promise<string> {
  if (
    !/^(?:expenses\/\d+\/[0-9a-f-]{36}(?:\.[a-zA-Z0-9]+)?|legacy-invoices\/\d+\/[0-9a-f-]{36}(?:\.[a-zA-Z0-9]+)?|(?:thumbnails|display)\/\d+\/[^/]+)$/.test(
      key
    )
  ) {
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

/**
 * Best-effort delete: attempts to delete a file but logs and swallows errors.
 * Used when file deletion is not critical to operation success.
 */
export async function tryDeleteFile(key: string): Promise<void> {
  try {
    await deleteFile(key);
  } catch (err) {
    console.error(`[storage] Failed to delete R2 object "${key}":`, err);
  }
}

/**
 * Best-effort presigned URL: generates a presigned URL but returns undefined on failure.
 * Used when the URL is not critical (e.g., display purposes with fallback UI).
 */
export async function tryGetPresignedUrl(key: string | null, ttlSeconds = 3600): Promise<string | undefined> {
  if (!key) return undefined;
  try {
    return await getPresignedUrl(key, ttlSeconds);
  } catch (err) {
    console.error(`[storage] Failed to generate presigned URL for "${key}":`, err);
    return undefined;
  }
}
