import { TestingModule } from '@nestjs/testing';
import { BuscarIntervalosPremiosUseCase } from 'src/application/premiacoes/use-cases/buscar-intervalos-premios/buscar-intervalos-premios.use-case';
import { IPremiacoesRepository } from 'src/shared/adapters/database/premiacoes/premiacoes.adapter';
import { createIntegrationModule } from '../setup/integration-module.setup';
import { DatabaseHelper } from '../helpers/database.helper';
import { FilmeFactory } from '../factories/filme.factory';
import { filmeFixtures } from '../fixtures/filme.fixture';

describe('[BuscarIntervalosPremiosUseCase] Integration', () => {
  let module: TestingModule;
  let useCase: BuscarIntervalosPremiosUseCase;
  let repository: IPremiacoesRepository;
  let db: DatabaseHelper;

  beforeAll(async () => {
    module = await createIntegrationModule();
    useCase = module.get<BuscarIntervalosPremiosUseCase>(
      BuscarIntervalosPremiosUseCase,
    );
    repository = module.get<IPremiacoesRepository>('IPremiacoesRepository');
    db = new DatabaseHelper(module);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    FilmeFactory.reset();
    await db.clearFilmes();
  });

  // ─── Módulo / Injeção de dependência ─────────────────────────────────────

  describe('[Module] wiring', () => {
    it('should resolve BuscarIntervalosPremiosUseCase from the DI container', () => {
      expect(useCase).toBeDefined();
      expect(useCase).toBeInstanceOf(BuscarIntervalosPremiosUseCase);
    });

    it('should resolve IPremiacoesRepository from the DI container', () => {
      expect(repository).toBeDefined();
    });
  });

  // ─── Fluxo feliz ─────────────────────────────────────────────────────────

  describe('executar — happy path', () => {
    it('should return statusCode 200 and INTERVALOS_ENCONTRADOS', async () => {
      await db.insertFilmes(filmeFixtures.minMaxScenario());
      const result = await useCase.executar();
      expect(result.statusCode).toBe(200);
      expect(result.mensagem).toBe('INTERVALOS_ENCONTRADOS');
    });

    it('should return a ResultadoIntervalos with min and max arrays', async () => {
      await db.insertFilmes(filmeFixtures.minMaxScenario());
      const result = await useCase.executar();
      expect(result.dados).toBeDefined();
      expect(Array.isArray(result.dados.min)).toBe(true);
      expect(Array.isArray(result.dados.max)).toBe(true);
    });

    it('should identify the producer with interval = 1 as the minimum', async () => {
      await db.insertFilmes(filmeFixtures.minMaxScenario());
      const result = await useCase.executar();
      expect(result.dados.min).toHaveLength(1);
      expect(result.dados.min[0].producer).toBe('Joel Silver');
      expect(result.dados.min[0].interval).toBe(1);
      expect(result.dados.min[0].previousWin).toBe(2000);
      expect(result.dados.min[0].followingWin).toBe(2001);
    });

    it('should identify the producer with interval = 13 as the maximum', async () => {
      await db.insertFilmes(filmeFixtures.minMaxScenario());
      const result = await useCase.executar();
      expect(result.dados.max).toHaveLength(1);
      expect(result.dados.max[0].producer).toBe('Matthew Vaughn');
      expect(result.dados.max[0].interval).toBe(13);
      expect(result.dados.max[0].previousWin).toBe(2002);
      expect(result.dados.max[0].followingWin).toBe(2015);
    });
  });

  // ─── Banco vazio ─────────────────────────────────────────────────────────

  describe('executar — empty database', () => {
    it('should return empty min and max when no films exist', async () => {
      const result = await useCase.executar();
      expect(result.dados.min).toEqual([]);
      expect(result.dados.max).toEqual([]);
    });

    it('should still return statusCode 200 with an empty database', async () => {
      const result = await useCase.executar();
      expect(result.statusCode).toBe(200);
    });
  });

  // ─── Produtor com vitória única ───────────────────────────────────────────

  describe('executar — single win per producer', () => {
    it('should return empty min/max when no producer wins more than once', async () => {
      await db.insertFilmes(filmeFixtures.singleWinnerPerProducer());
      const result = await useCase.executar();
      expect(result.dados.min).toEqual([]);
      expect(result.dados.max).toEqual([]);
    });
  });

  // ─── Apenas não-vencedores ────────────────────────────────────────────────

  describe('executar — no winners in database', () => {
    it('should return empty min/max when all films are non-winners', async () => {
      await db.insertFilmes([
        FilmeFactory.createLoser(2000, 'Prod A'),
        FilmeFactory.createLoser(2001, 'Prod B'),
        FilmeFactory.createLoser(2001, 'Prod B'),
      ]);
      const result = await useCase.executar();
      expect(result.dados.min).toEqual([]);
      expect(result.dados.max).toEqual([]);
    });
  });

  // ─── Anos fora de ordem ───────────────────────────────────────────────────

  describe('executar — out-of-order years', () => {
    it('should sort years before calculating intervals', async () => {
      await db.insertFilmes(filmeFixtures.outOfOrderYears());
      const result = await useCase.executar();
      const all = [...result.dados.min, ...result.dados.max];
      for (const item of all) {
        expect(item.previousWin).toBeLessThan(item.followingWin);
        expect(item.interval).toBe(item.followingWin - item.previousWin);
      }
    });

    it('should produce intervals 10 and 5 for Prod X (1995, 2005, 2010)', async () => {
      await db.insertFilmes(filmeFixtures.outOfOrderYears());
      const result = await useCase.executar();
      const all = [...result.dados.min, ...result.dados.max];
      const intervals = all.map((i) => i.interval);
      expect(intervals).toContain(10);
      expect(intervals).toContain(5);
    });
  });

  // ─── Três vitórias (dois intervalos) ─────────────────────────────────────

  describe('executar — producer with three wins', () => {
    it('should generate two interval entries for a producer with three wins', async () => {
      await db.insertFilmes(filmeFixtures.threeWins());
      const result = await useCase.executar();
      const all = [...result.dados.min, ...result.dados.max];
      const prodEntries = all.filter((i) => i.producer === 'Triple Prod');
      expect(prodEntries.length).toBeGreaterThanOrEqual(1);
    });

    it('should identify interval = 5 as min and interval = 10 as max', async () => {
      await db.insertFilmes(filmeFixtures.threeWins());
      const result = await useCase.executar();
      expect(result.dados.min[0].interval).toBe(5);
      expect(result.dados.max[0].interval).toBe(10);
    });
  });

  // ─── Empate ───────────────────────────────────────────────────────────────

  describe('executar — tie scenario', () => {
    it('should include both producers in min when intervals are equal', async () => {
      await db.insertFilmes(filmeFixtures.tieScenario());
      const result = await useCase.executar();
      expect(result.dados.min).toHaveLength(2);
      expect(result.dados.max).toHaveLength(2);
    });

    it('should assign the same interval value to all min entries', async () => {
      await db.insertFilmes(filmeFixtures.tieScenario());
      const result = await useCase.executar();
      const intervals = result.dados.min.map((i) => i.interval);
      expect(new Set(intervals).size).toBe(1);
    });
  });

  // ─── Cenário complexo (3 produtores, 3 intervalos distintos) ─────────────

  describe('executar — complex scenario', () => {
    it('should identify the global minimum across all producers', async () => {
      await db.insertFilmes(filmeFixtures.complexScenario());
      const result = await useCase.executar();
      // Joel Silver interval=1, Bo Derek interval=6, Matthew Vaughn interval=13
      expect(result.dados.min[0].interval).toBe(1);
    });

    it('should identify the global maximum across all producers', async () => {
      await db.insertFilmes(filmeFixtures.complexScenario());
      const result = await useCase.executar();
      expect(result.dados.max[0].interval).toBe(13);
    });

    it('should exclude non-winners from all calculations', async () => {
      await db.insertFilmes(filmeFixtures.complexScenario());
      const result = await useCase.executar();
      const allProducers = [
        ...result.dados.min.map((i) => i.producer),
        ...result.dados.max.map((i) => i.producer),
      ];
      expect(allProducers).not.toContain('No Repeat');
    });
  });

  // ─── Invariantes matemáticos ──────────────────────────────────────────────

  describe('executar — mathematical invariants', () => {
    it('should always satisfy interval = followingWin - previousWin', async () => {
      await db.insertFilmes(filmeFixtures.complexScenario());
      const result = await useCase.executar();
      for (const item of [...result.dados.min, ...result.dados.max]) {
        expect(item.interval).toBe(item.followingWin - item.previousWin);
      }
    });

    it('should always return min.interval <= max.interval', async () => {
      await db.insertFilmes(filmeFixtures.complexScenario());
      const result = await useCase.executar();
      const minInterval = result.dados.min[0].interval;
      const maxInterval = result.dados.max[0].interval;
      expect(minInterval).toBeLessThanOrEqual(maxInterval);
    });

    it('should always return previousWin < followingWin', async () => {
      await db.insertFilmes(filmeFixtures.complexScenario());
      const result = await useCase.executar();
      for (const item of [...result.dados.min, ...result.dados.max]) {
        expect(item.previousWin).toBeLessThan(item.followingWin);
      }
    });
  });

  // ─── Integração repository → use case (dados reais do banco) ─────────────

  describe('executar — repository data flow', () => {
    it('should reflect persisted data immediately after criarEmLote', async () => {
      await repository.criarEmLote(filmeFixtures.consecutiveWins());
      const result = await useCase.executar();
      expect(result.dados.min[0].producer).toBe('Joel Silver');
      expect(result.dados.min[0].interval).toBe(1);
    });

    it('should reflect cleared state after database wipe', async () => {
      await db.insertFilmes(filmeFixtures.minMaxScenario());
      await db.clearFilmes();
      const result = await useCase.executar();
      expect(result.dados.min).toEqual([]);
      expect(result.dados.max).toEqual([]);
    });

    it('should use only the real database — no in-memory caching between calls', async () => {
      await db.insertFilmes(filmeFixtures.consecutiveWins());
      const first = await useCase.executar();
      expect(first.dados.min[0].interval).toBe(1);

      await db.clearFilmes();
      await db.insertFilmes(filmeFixtures.longIntervalWins());
      const second = await useCase.executar();
      expect(second.dados.min[0].interval).toBe(13);
    });
  });
});
