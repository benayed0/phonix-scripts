import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { ScraperService } from './services/scraper/scraper.service';
import { LlmService } from './services/llm/llm.service';
import { JobsService } from './services/jobs/jobs.service';
import { I18nController } from './controllers/i18n/i18n.controller';
import { I18nService } from './services/i18n/i18n.service';
import { S3Service } from './services/s3/s3.service';
import { ScheduleModule } from '@nestjs/schedule';
import { JobAppWebCatService } from './services/jobs/job-app-web-cat/job-app-web-cat.service';
import { JobUserService } from './services/jobs/job-user/job-user.service';
import { JobBackupService } from './services/jobs/job-backup/job-backup.service';
import { MailService } from './services/mail/mail.service';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChallengesImages,
  ChallengesImagesSchema,
} from './schemas/challengesImages/challengesImages.schema';
import { User, UserSchema } from './schemas/user/user.schema';
import { QrService } from './services/qr/qr.service';
import { PdfService } from './services/pdf/pdf.service';
import { QrController } from './controllers/qr/qr.controller';
import { ScrapperController } from './controllers/scrapper/scrapper.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ cache: true }),
    ScheduleModule.forRoot(),
    FirebaseModule,
    HttpModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: `${configService.get<string>('MONGODB_URL')}`,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: ChallengesImages.name, schema: ChallengesImagesSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [
    AppController,
    I18nController,
    QrController,
    ScrapperController,
  ],
  providers: [
    AppService,
    ScraperService,
    LlmService,
    JobsService,
    I18nService,
    S3Service,
    JobAppWebCatService,
    JobUserService,
    JobBackupService,
    MailService,
    QrService,
    PdfService,
  ],
})
export class AppModule {}
