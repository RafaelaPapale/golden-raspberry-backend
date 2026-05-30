import { Test, TestingModule } from '@nestjs/testing';
import { CsvImportLoader } from 'src/infra/database/loaders/csv-import.loader';
import { AppModule } from 'src/modules/app.module';

/**
 * Creates a TestingModule backed by the real AppModule (same DB driver path
 * that works in integration-app.setup.ts), but with CsvImportLoader replaced
 * by a no-op so the database starts empty and tests control their own data.
 *
 * Does NOT create an INestApplication — lifecycle hooks (onApplicationBootstrap)
 * are never triggered, so the CSV import never runs.
 */
export async function createIntegrationModule(): Promise<TestingModule> {
  process.env.JWT_SECRET_KEY = 'integration-test-secret-key';

  return Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(CsvImportLoader)
    .useValue({ onApplicationBootstrap: () => Promise.resolve() })
    .compile();
}
