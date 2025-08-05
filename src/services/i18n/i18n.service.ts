import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { S3Service } from '../s3/s3.service';

export interface UpdateLangDto {
  path: string;
  value: string;
}

@Injectable()
export class I18nService {
  constructor(private s3Service: S3Service) {}
  async updateLang(lang: string, data: UpdateLangDto[]) {
    console.log('updating', lang);
    try {
      const content = await this.s3Service.getLang(lang);
      for (const { path, value } of data) {
        // Walk the path and assign the value
        const keys = path.split('.');
        let current = content;

        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];
          if (!current[key]) current[key] = {};
          current = current[key];
        }

        current[keys[keys.length - 1]] = value;
      }

      const updated = JSON.stringify(content, null, 2);
      await this.s3Service.updateLang(lang, updated);
      return { success: true };
    } catch (error) {
      console.log(error);
      return { success: false, error };
    }
  }
}
