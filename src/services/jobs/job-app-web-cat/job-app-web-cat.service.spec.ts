import { Test, TestingModule } from '@nestjs/testing';
import { JobAppWebCatService } from './job-app-web-cat.service';

describe('JobAppWebCatService', () => {
  let service: JobAppWebCatService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobAppWebCatService],
    }).compile();

    service = module.get<JobAppWebCatService>(JobAppWebCatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
