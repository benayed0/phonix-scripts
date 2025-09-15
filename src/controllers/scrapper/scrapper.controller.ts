import { Body, Controller, Post } from '@nestjs/common';
import { JobAppWebCatService } from 'src/services/jobs/job-app-web-cat/job-app-web-cat.service';
import { ScraperService } from 'src/services/scraper/scraper.service';

@Controller('scrapper')
export class ScrapperController {
  constructor(private jobs: JobAppWebCatService) {}

  @Post('check')
  checkHostname(@Body('hostname') hostname: string) {
    console.log('categorizing', hostname);

    return this.jobs.processWebsite(hostname);
  }
}
