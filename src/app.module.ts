import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { ScraperService } from './services/scraper/scraper.service';
import { LlmService } from './services/llm/llm.service';
import { JobsService } from './services/jobs/jobs.service';
import { I18nController } from './controllers/i18n/i18n.controller';
import { I18nService } from './services/i18n/i18n.service';
import { S3Service } from './services/s3/s3.service';

@Module({
  imports: [ConfigModule.forRoot({ cache: true }), FirebaseModule],
  controllers: [AppController, I18nController],
  providers: [AppService, ScraperService, LlmService, JobsService, I18nService, S3Service],
})
export class AppModule {}
