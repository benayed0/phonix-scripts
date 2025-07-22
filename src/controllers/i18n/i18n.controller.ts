import { Body, Controller, Get, Param, Put, Res } from '@nestjs/common';
import { Response } from 'express';
import { existsSync } from 'fs';
import { join } from 'path';
import { I18nService, UpdateLangDto } from 'src/services/i18n/i18n.service';

@Controller('i18n')
export class I18nController {
  constructor(private i18nService: I18nService) {}
  @Get(':lang')
  getLang(@Param('lang') lang: string, @Res() res: Response) {
    const filePath = join(
      __dirname,
      '..',
      '..',
      '..',
      'assets',
      'i18n',
      `${lang}.json`,
    );
    if (!existsSync(filePath)) {
      return res
        .status(404)
        .json({ error: `Language file ${lang}.json not found.` });
    }

    return res.sendFile(filePath);
  }
  @Put(':lang')
  updatelang(@Param('lang') lang: string, @Body() data: UpdateLangDto) {
    return this.i18nService.updateLang(lang, data);
  }
}
