import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { UpdateLangDto } from '../i18n/i18n.service';
import {
  CloudFrontClient,
  CreateInvalidationCommand,
  ListCachePoliciesCommand,
} from '@aws-sdk/client-cloudfront';

@Injectable()
export class S3Service {
  bucket = 'phonixhealth.i18n';
  region = 'eu-west-3';
  cloudfrontId = 'E2J84C1SAM4SVY';
  s3Client = new S3Client({
    region: this.region, // e.g., 'eu-west-1'
  });
  cloudfrontClient = new CloudFrontClient({ region: this.region });

  constructor() {}
  async getLang(lang: string) {
    const key = `${lang}.json`;

    // Step 1: Download the file
    const getCommand = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const { Body } = await this.s3Client.send(getCommand);
    const jsonString = await this.streamToString(Body as Readable);
    const content = JSON.parse(jsonString);
    return content;
  }

  async streamToString(stream: Readable): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
  }
  async updateLang(lang: string, updatedJson: any) {
    // Step 3: Upload it back to S3
    const key = `${lang}.json`;
    const putCommand = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: updatedJson,
      ContentType: 'application/json',
    });

    await this.s3Client.send(putCommand);

    await this.cloudfrontClient.send(
      new CreateInvalidationCommand({
        DistributionId: this.cloudfrontId,
        InvalidationBatch: {
          CallerReference: `${Date.now()}`,
          Paths: {
            Quantity: 1,
            Items: [`/${lang}.json`],
          },
        },
      }),
    );
    return { success: true };
  }
}
