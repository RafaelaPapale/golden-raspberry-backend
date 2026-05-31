import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { databaseConfig } from 'src/config/database/database.config';

import { HealthController } from 'src/application/health/health.controller';
import { PremiacoesModule } from 'src/application/premiacoes/premiacoes.module';
import { JwtAuthGuard } from 'src/infra/auth/jwt-auth.guard';
import { PinoLoggerModule } from './logger.module';
import { DatabaseModule } from './database.module';
import { AuthModule } from './auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
    PinoLoggerModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    AuthModule,
    PremiacoesModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [],
})
export class AppModule {}
