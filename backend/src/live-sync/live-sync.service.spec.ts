import { Test, TestingModule } from '@nestjs/testing';
import { LiveSyncService } from './live-sync.service';

describe('LiveSyncService', () => {
  let service: LiveSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiveSyncService],
    }).compile();

    service = module.get<LiveSyncService>(LiveSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
