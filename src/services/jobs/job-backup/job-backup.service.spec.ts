import { Test, TestingModule } from '@nestjs/testing';
import { JobBackupService } from './job-backup.service';

describe('JobBackupService', () => {
  let service: JobBackupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobBackupService],
    }).compile();

    service = module.get<JobBackupService>(JobBackupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
