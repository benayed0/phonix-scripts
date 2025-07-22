import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { UpdateLangDto } from '../i18n/i18n.service';

@Injectable()
export class S3Service {
  bucket = 'phonixhealth.i18n';
  client = new S3Client({
    region: 'eu-west-3', // e.g., 'eu-west-1'
  });
  constructor() {}
  async getLang(lang: string) {
    const key = `${lang}.json`;

    // Step 1: Download the file
    const getCommand = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const { Body } = await this.client.send(getCommand);
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

    await this.client.send(putCommand);
    return { success: true };
  }
}
