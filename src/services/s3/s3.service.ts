import {
  DeleteObjectCommand,
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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
  constructor(private config: ConfigService) {}
  bucket = 'phonixhealth.i18n';
  backup_bucket = 'phonix';
  region = 'eu-west-3';
  cloudfrontId = 'E2J84C1SAM4SVY';
  s3Client = new S3Client({
    region: this.region, // e.g., 'eu-west-1'
  });
  ovhClient = new S3Client({
    region: 'sbg', // OVH region
    endpoint: 'https://s3.sbg.io.cloud.ovh.net', // OVH endpoint
    credentials: {
      accessKeyId: this.config.get('OVH_S3_ACCES_KEY'),
      secretAccessKey: this.config.get('OVH_S3_SECRET_KEY'),
    },
    forcePathStyle: true, // 🔑 très important pour compatibilité OVH
  });

  cloudfrontClient = new CloudFrontClient({ region: this.region });

  async getFirebaseDB(name: string) {
    try {
      const key = `backup/firebase/${name}.json`;
      const putCommand = new GetObjectCommand({
        Bucket: this.backup_bucket,
        Key: key,
        ResponseContentType: 'application/json',
      });

      const response = await this.ovhClient.send(putCommand);
      const stream = response.Body as Readable;
      const jsonString = await this.streamToString(stream);
      const content = JSON.parse(jsonString);
      return content;
    } catch (error) {
      return null;
    }
  }
  async getMongoDB(name: string) {
    try {
      const key = `backup/mongo/${name}.json`;
      const putCommand = new GetObjectCommand({
        Bucket: this.backup_bucket,
        Key: key,
        ResponseContentType: 'application/json',
      });

      const response = await this.ovhClient.send(putCommand);
      const stream = response.Body as Readable;
      const jsonString = await this.streamToString(stream);
      const content = JSON.parse(jsonString);
      return content;
    } catch (error) {
      return null;
    }
  }
  async uploadFirebaseDB(name: string, data: any) {
    const key = `backup/firebase/${name}.json`;
    const putCommand = new PutObjectCommand({
      Bucket: this.backup_bucket,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    });

    await this.ovhClient.send(putCommand);
  }
  async deleteFirebaseDB(name: string) {
    const key = `backup/firebase/${name}.json`;
    const putCommand = new DeleteObjectCommand({
      Bucket: this.backup_bucket,
      Key: key,
    });

    await this.ovhClient.send(putCommand);
  }
  async deleteMongoDB(name: string) {
    const key = `backup/mongo/${name}.json`;
    const putCommand = new DeleteObjectCommand({
      Bucket: this.backup_bucket,
      Key: key,
    });

    await this.ovhClient.send(putCommand);
  }
  async uploadMongoDB(name: string, data: any) {
    const key = `backup/mongo/${name}.json`;
    const putCommand = new PutObjectCommand({
      Bucket: this.backup_bucket,
      Key: key,
      Body: JSON.stringify(data),
      ContentType: 'application/json',
    });
    console.log('Uploading MongoDB backup:', key);

    await this.ovhClient.send(putCommand);
  }
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
