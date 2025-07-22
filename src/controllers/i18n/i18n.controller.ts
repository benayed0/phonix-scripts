import { Body, Controller, Param, Put } from '@nestjs/common';
import { I18nService, UpdateLangDto } from 'src/services/i18n/i18n.service';

@Controller('i18n')
export class I18nController {
  constructor(private i18nService: I18nService) {}
  @Put(':lang')
  updatelang(@Param('lang') lang: string, @Body() data: UpdateLangDto) {
    return this.i18nService.updateLang(lang, data);
  }
}
