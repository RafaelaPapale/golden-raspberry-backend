import request from 'supertest';
import { IntegrationApp, createIntegrationApp } from '../setup/integration-app.setup';

describe('[HealthController] Integration', () => {
  let integrationApp: IntegrationApp;

  beforeAll(async () => {
    integrationApp = await createIntegrationApp();
  });

  afterAll(async () => {
    await integrationApp.app.close();
  });

  describe('GET /health-check', () => {
    it('should return 200 with a valid health payload', async () => {
      const response = await request(integrationApp.app.getHttpServer())
        .get('/health-check')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'golden-raspberry-backend',
      });
    });

    it('should return status "ok"', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/health-check')
        .expect(200);

      expect(body.status).toBe('ok');
    });

    it('should return the correct service name', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/health-check')
        .expect(200);

      expect(body.service).toBe('golden-raspberry-backend');
    });

    it('should return a valid ISO 8601 timestamp', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/health-check')
        .expect(200);

      expect(body.timestamp).toBeDefined();
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });

    it('should return JSON content-type', async () => {
      await request(integrationApp.app.getHttpServer())
        .get('/health-check')
        .expect('Content-Type', /application\/json/);
    });

    it('should be accessible without authentication (public endpoint)', async () => {
      await request(integrationApp.app.getHttpServer())
        .get('/health-check')
        .expect(200);
    });

    it('should return 404 for a non-existent route', async () => {
      await request(integrationApp.app.getHttpServer())
        .get('/non-existent-route')
        .expect(404);
    });
  });
});
