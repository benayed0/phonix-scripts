import { Test, TestingModule } from '@nestjs/testing';
import { JobUserService } from './job-user.service';

describe('JobUserService', () => {
  let service: JobUserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobUserService],
    }).compile();

    service = module.get<JobUserService>(JobUserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
