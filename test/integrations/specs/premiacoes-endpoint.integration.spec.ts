import request from 'supertest';
import {
  IntegrationApp,
  createIntegrationApp,
} from '../setup/integration-app.setup';

type ProdutorIntervaloResponse = {
  producer: string;
  interval: number;
  previousWin: number;
  followingWin: number;
};

/**
 * Valores de referência extraídos de docs/Movielist.csv.
 * Qualquer modificação no Movielist.csv que altere produtores com múltiplas
 * vitórias, anos de vitória ou os valores min/max resultantes DEVE quebrar
 * as asserções determinísticas abaixo — atualizando EXPECTED_MIN/MAX/RESULT.
 *
 * Produtores com múltiplas vitórias (todos os intervalos, não só os extremos):
 *  Joel Silver   : 1990 → 1991  interval =  1  (mínimo global)
 *  Bo Derek      : 1984 → 1990  interval =  6
 *  Buzz Feitshans: 1985 → 1994  interval =  9
 *  Matthew Vaughn: 2002 → 2015  interval = 13  (máximo global)
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

const EXPECTED_RESULT = {
  min: [EXPECTED_MIN],
  max: [EXPECTED_MAX],
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
    // ─── Contrato HTTP ─────────────────────────────────────────────────────

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

    // ─── Esquema ───────────────────────────────────────────────────────────

    it('should return a body with "min" and "max" arrays', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      expect(Array.isArray(body.min)).toBe(true);
      expect(Array.isArray(body.max)).toBe(true);
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

    // ─── Invariantes ───────────────────────────────────────────────────────

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

      const minInterval = Math.min(
        ...body.min.map((i: ProdutorIntervaloResponse) => i.interval),
      );
      const maxInterval = Math.max(
        ...body.max.map((i: ProdutorIntervaloResponse) => i.interval),
      );

      expect(minInterval).toBeLessThanOrEqual(maxInterval);
    });

    it('should return all min items sharing the same (smallest) interval', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const intervals = body.min.map(
        (i: ProdutorIntervaloResponse) => i.interval,
      );
      const unique = new Set(intervals);
      expect(unique.size).toBe(1);
    });

    it('should return all max items sharing the same (largest) interval', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const intervals = body.max.map(
        (i: ProdutorIntervaloResponse) => i.interval,
      );
      const unique = new Set(intervals);
      expect(unique.size).toBe(1);
    });

    it('should return previousWin strictly less than followingWin for every item', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      for (const item of [...body.min, ...body.max]) {
        expect(item.previousWin).toBeLessThan(item.followingWin);
      }
    });

    // ─── Validações do dataset — cardinalidade exata + golden master ───────

    it('should return exactly 1 producer in the min array (Joel Silver only)', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      expect(body.min).toHaveLength(1);
    });

    it('should return exactly 1 producer in the max array (Matthew Vaughn only)', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      expect(body.max).toHaveLength(1);
    });

    it('should not include non-winner films in any result', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      const allProducers = [
        ...body.min.map((i: ProdutorIntervaloResponse) => i.producer),
        ...body.max.map((i: ProdutorIntervaloResponse) => i.producer),
      ];

      expect(allProducers).not.toContain('Jerry Weintraub');
      expect(allProducers).not.toContain('Steve Shagan');
    });

    it('should return the complete exact response matching the standard CSV', async () => {
      const { body } = await request(integrationApp.app.getHttpServer())
        .get('/v1/premiacoes/intervalos')
        .expect(200);

      expect(body).toStrictEqual(EXPECTED_RESULT);
    });
  });
});
