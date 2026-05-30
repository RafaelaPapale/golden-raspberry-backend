import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from 'src/config/database/database.config';

import { HealthController } from 'src/application/health/health.controller';
import { PremiacoesModule } from 'src/application/premiacoes/premiacoes.module';
import { PinoLoggerModule } from './logger.module';
import { DatabaseModule } from './database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
    PinoLoggerModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    PremiacoesModule,
  ],
  controllers: [HealthController],
  providers: [],
  exports: [],
})
export class AppModule {}
