import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { ScraperService } from './services/scraper/scraper.service';
import { LlmService } from './services/llm/llm.service';
import { JobsService } from './services/jobs/jobs.service';

@Module({
  imports: [ConfigModule.forRoot({ cache: true }), FirebaseModule],
  controllers: [AppController],
  providers: [AppService, ScraperService, LlmService, JobsService],
})
export class AppModule {}
