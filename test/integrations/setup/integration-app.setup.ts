import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/modules/app.module';

export interface IntegrationApp {
  app: INestApplication;
  module: TestingModule;
}

/**
 * Bootstraps the full NestJS application for HTTP integration tests.
 * Triggers OnApplicationBootstrap lifecycle hooks (CSV import runs).
 * Mirrors the production bootstrap in src/main.ts.
 */
export async function createIntegrationApp(): Promise<IntegrationApp> {
  process.env.JWT_SECRET_KEY = 'integration-test-secret-key';

  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app.use(require('cookie-parser')());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();

  return { app, module };
}
