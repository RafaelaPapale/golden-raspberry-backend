import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { pinoLoggerConfig } from 'src/config/logger/pino-logger.config';

@Module({
  imports: [LoggerModule.forRoot(pinoLoggerConfig)],
  exports: [LoggerModule],
})
export class PinoLoggerModule {}
