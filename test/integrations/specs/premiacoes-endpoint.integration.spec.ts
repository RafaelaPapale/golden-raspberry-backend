import request from 'supertest';
import { IntegrationApp, createIntegrationApp } from '../setup/integration-app.setup';

/**
 * Expected values derived from docs/Movielist.csv analysis.
 *
 * Producers with multiple wins:
 *  - Joel Silver  : 1990 (Steven Perry and Joel Silver) + 1991 → interval = 1  (min)
 *  - Bo Derek     : 1984 + 1990                               → interval = 6
 *  - Buzz Feitshans: 1985 + 1994 (Buzz Feitshans and David Matalon) → interval = 9
 *  - Matthew Vaughn: 2002 + 2015                              → interval = 13 (max)
 */
const EXPECTED_MIN = {
  producer: 'Joel Silver',
  interval: 1,
  previousWin: 1990,
  followingWin: 1991,
};

const EXPECTED_MAX = {
  producer: 'Matthew Vaughn',
  interval: 13,
  previousWin: 2002,
  followingWin: 2015,
};

describe('[PremiacoesController] Integration — real CSV data', () => {
  let integrationApp: IntegrationApp;

  beforeAll(async () => {
    integrationApp = await createIntegrationApp();
  });

  afterAll(async () => {
    await integrationApp.app.close();
  });

  describe('GET /v1/premiacoes/intervalos', () => {
    it('should return 200', async () => {
      await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);
    });

    it('should return JSON content-type', async () => {
      await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect('Content-Type', /application\/json/);
    });

    it('should be accessible without authentication (public endpoint)', async () => {
      await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);
    });

    it('should return a body with "min" and "max" arrays', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      expect(Array.isArray(body.min)).toBe(true);
      expect(Array.isArray(body.max)).toBe(true);
    });

    it('should return non-empty min and max arrays (CSV has multi-win producers)', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      expect(body.min.length).toBeGreaterThan(0);
      expect(body.max.length).toBeGreaterThan(0);
    });

    it('should return items with the required ProdutorIntervaloDto shape', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const allItems = [...body.min, ...body.max];
      expect(allItems.length).toBeGreaterThan(0);

      for (const item of allItems) {
        expect(typeof item.producer).toBe('string');
        expect(typeof item.interval).toBe('number');
        expect(typeof item.previousWin).toBe('number');
        expect(typeof item.followingWin).toBe('number');
      }
    });

    it('should satisfy interval = followingWin - previousWin for every item', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const allItems = [...body.min, ...body.max];
      for (const item of allItems) {
        expect(item.interval).toBe(item.followingWin - item.previousWin);
      }
    });

    it('should return min interval no greater than max interval', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const minInterval = Math.min(...body.min.map((i) => i.interval));
      const maxInterval = Math.max(...body.max.map((i) => i.interval));

      expect(minInterval).toBeLessThanOrEqual(maxInterval);
    });

    it('should return all min items sharing the same (smallest) interval', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const intervals = body.min.map((i) => i.interval);
      const unique = new Set(intervals);
      expect(unique.size).toBe(1);
    });

    it('should return all max items sharing the same (largest) interval', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const intervals = body.max.map((i) => i.interval);
      const unique = new Set(intervals);
      expect(unique.size).toBe(1);
    });

    it('should return Joel Silver as the producer with the minimum interval (1 year)', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const joelSilver = body.min.find((i) => i.producer === EXPECTED_MIN.producer);
      expect(joelSilver).toBeDefined();
      expect(joelSilver.interval).toBe(EXPECTED_MIN.interval);
      expect(joelSilver.previousWin).toBe(EXPECTED_MIN.previousWin);
      expect(joelSilver.followingWin).toBe(EXPECTED_MIN.followingWin);
    });

    it('should return Matthew Vaughn as the producer with the maximum interval (13 years)', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const matthewVaughn = body.max.find(
        (i) => i.producer === EXPECTED_MAX.producer,
      );
      expect(matthewVaughn).toBeDefined();
      expect(matthewVaughn.interval).toBe(EXPECTED_MAX.interval);
      expect(matthewVaughn.previousWin).toBe(EXPECTED_MAX.previousWin);
      expect(matthewVaughn.followingWin).toBe(EXPECTED_MAX.followingWin);
    });

    it('should not include non-winner films in any result', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const allProducers = [
        ...body.min.map((i) => i.producer),
        ...body.max.map((i) => i.producer),
      ];

      // Non-winner-only producers must never appear in results
      expect(allProducers).not.toContain('Jerry Weintraub');
      expect(allProducers).not.toContain('Steve Shagan');
    });

    it('should return previousWin strictly less than followingWin for every item', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      for (const item of [...body.min, ...body.max]) {
        expect(item.previousWin).toBeLessThan(item.followingWin);
      }
    });

    it('should return the exact result shape required by the spec', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      expect(body).toEqual({
        min: expect.arrayContaining([
          expect.objectContaining(EXPECTED_MIN),
        ]),
        max: expect.arrayContaining([
          expect.objectContaining(EXPECTED_MAX),
        ]),
      });
    });
  });
});
