import { Injectable, OnModuleInit } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { ScraperService } from '../scraper/scraper.service';
import { LlmService } from '../llm/llm.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { JobAppWebCatService } from './job-app-web-cat/job-app-web-cat.service';
import { JobBackupService } from './job-backup/job-backup.service';

@Injectable()
export class JobsService {
  constructor(
    private appWebCat: JobAppWebCatService,
    private backup: JobBackupService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCron4AM() {
    await this.appWebCat.processUncuratedWebsitesBatch();
  }
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleCron8AM() {
    await this.appWebCat.getUncuratedAppsCategory();
    await this.backup.downloadFirebaseAndMongo();
  }
}
