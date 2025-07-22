import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface UpdateLangDto {
  path: string;
  value: string;
}

@Injectable()
export class I18nService {
  updateLang(lang: string, data: UpdateLangDto) {
    const { path, value } = data;
    try {
      const filePath = join(
        __dirname,
        '..',
        '..',
        '..',
        'assets',
        'i18n',
        `${lang}.json`,
      );
      console.log(filePath);

      if (!existsSync(filePath)) {
        throw new Error(`Language file ${lang}.json does not exist`);
      }

      const content = JSON.parse(readFileSync(filePath, 'utf-8'));

      // Walk the path and assign the value
      const keys = path.split('.');
      let current = content;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) current[key] = {};
        current = current[key];
      }

      current[keys[keys.length - 1]] = value;

      writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');

      return { success: true };
    } catch (error) {
      console.log(error);

      return { success: false, error };
    }
  }
}
