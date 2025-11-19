import { Module, Global } from '@nestjs/common';
import { WinstonLogger } from './logger';

@Global()
@Module({
  providers: [
    {
      provide: 'LOGGER',
      useClass: WinstonLogger,
    },
  ],
  exports: ['LOGGER'],
})
export class LoggerModule {}