import { Test, TestingModule } from '@nestjs/testing';
import { LiveSyncController } from './live-sync.controller';

describe('LiveSyncController', () => {
  let controller: LiveSyncController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiveSyncController],
    }).compile();

    controller = module.get<LiveSyncController>(LiveSyncController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
