import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3_PRESIGN_TTL_SECONDS } from '../constants';

/**
 * S3Service handles all interactions with AWS S3.
 *
 * Security invariants:
 * - Objects are stored in a private bucket — NEVER public.
 * - Clients always receive pre-signed URLs (1hr TTL), never raw S3 URLs.
 * - S3 keys are stored in the DB; pre-signed URLs are generated at request time.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly receiptsBucket: string;

  constructor(private readonly config: ConfigService) {
    this.client = new S3Client({
      region: config.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.receiptsBucket = config.getOrThrow<string>('S3_BUCKET_RECEIPTS');
  }

  /**
   * Uploads a file buffer to the receipts S3 bucket.
   * Returns the S3 key (not a URL). Callers must use getPresignedUrl() to serve the file.
   */
  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.receiptsBucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    this.logger.log(`Uploaded s3://${this.receiptsBucket}/${key}`);
    return key;
  }

  /**
   * Generates a pre-signed GET URL for a private S3 object.
   * Default TTL is 1 hour. NEVER return raw S3 URLs to clients.
   */
  async getPresignedUrl(
    key: string,
    ttlSeconds = S3_PRESIGN_TTL_SECONDS,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.receiptsBucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: ttlSeconds });
  }
}
