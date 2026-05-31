import { TestingModule } from '@nestjs/testing';
import { IPremiacoesRepository } from 'src/shared/adapters/database/premiacoes/premiacoes.adapter';
import { createIntegrationModule } from '../setup/integration-module.setup';
import { DatabaseHelper } from '../helpers/database.helper';
import { FilmeFactory } from '../factories/filme.factory';
import { filmeFixtures } from '../fixtures/filme.fixture';

describe('[PremiacoesRepository] Integration', () => {
  let module: TestingModule;
  let repository: IPremiacoesRepository;
  let db: DatabaseHelper;

  beforeAll(async () => {
    module = await createIntegrationModule();
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

  // ─── contarRegistros ──────────────────────────────────────────────────────

  describe('contarRegistros', () => {
    it('should return 0 when the database is empty', async () => {
      const count = await repository.contarRegistros();
      expect(count).toBe(0);
    });

    it('should return the exact count after inserting records', async () => {
      await db.insertFilmes(FilmeFactory.createBatch(5));
      const count = await repository.contarRegistros();
      expect(count).toBe(5);
    });

    it('should count both winners and non-winners', async () => {
      await db.insertFilmes([
        FilmeFactory.createWinner(2000, 'Prod A'),
        FilmeFactory.createLoser(2001, 'Prod B'),
        FilmeFactory.createLoser(2002, 'Prod C'),
      ]);
      const count = await repository.contarRegistros();
      expect(count).toBe(3);
    });

    it('should return updated count after inserting additional batches', async () => {
      await db.insertFilmes(FilmeFactory.createBatch(3));
      await db.insertFilmes(FilmeFactory.createBatch(2));
      const count = await repository.contarRegistros();
      expect(count).toBe(5);
    });
  });

  // ─── criarEmLote ─────────────────────────────────────────────────────────

  describe('criarEmLote', () => {
    it('should persist a single film to the database', async () => {
      const filme = FilmeFactory.create({ winner: true });
      await repository.criarEmLote([filme]);
      const count = await db.countAll();
      expect(count).toBe(1);
    });

    it('should persist multiple films in one call', async () => {
      const filmes = FilmeFactory.createBatch(10);
      await repository.criarEmLote(filmes);
      const count = await db.countAll();
      expect(count).toBe(10);
    });

    it('should correctly persist the winner flag as true', async () => {
      const winner = FilmeFactory.createWinner(2000, 'Winner Prod');
      await repository.criarEmLote([winner]);
      const rows = await db.findWinners();
      expect(rows).toHaveLength(1);
      expect(rows[0].winner).toBe(true);
    });

    it('should correctly persist the winner flag as false', async () => {
      const loser = FilmeFactory.createLoser(2000, 'Loser Prod');
      await repository.criarEmLote([loser]);
      const rows = await db.findAll();
      expect(rows).toHaveLength(1);
      expect(rows[0].winner).toBe(false);
    });

    it('should persist all fields accurately', async () => {
      const filme = FilmeFactory.create({
        year: 1999,
        title: 'Specific Title',
        studios: 'Specific Studios',
        producer: 'Specific Producer',
        winner: true,
      });
      await repository.criarEmLote([filme]);
      const rows = await db.findAll();
      expect(rows[0].year).toBe(1999);
      expect(rows[0].title).toBe('Specific Title');
      expect(rows[0].studios).toBe('Specific Studios');
      expect(rows[0].producer).toBe('Specific Producer');
      expect(rows[0].winner).toBe(true);
    });

    it('should be a no-op when called with an empty array', async () => {
      await repository.criarEmLote([]);
      const count = await db.countAll();
      expect(count).toBe(0);
    });

    it('should persist a mixed batch of winners and non-winners', async () => {
      const batch = filmeFixtures.mixedWinnersAndLosers();
      await repository.criarEmLote(batch);
      expect(await db.countAll()).toBe(batch.length);
      expect(await db.countWinners()).toBe(2);
    });

    it('should auto-assign a numeric id to each persisted record', async () => {
      const filmes = FilmeFactory.createBatch(3);
      await repository.criarEmLote(filmes);
      const rows = await db.findAll();
      rows.forEach((row) => {
        expect(typeof row.id).toBe('number');
        expect(row.id).toBeGreaterThan(0);
      });
    });
  });

  // ─── listarVencedores ─────────────────────────────────────────────────────

  describe('listarVencedores', () => {
    it('should return an empty array when no films exist', async () => {
      const vencedores = await repository.listarVencedores();
      expect(vencedores).toEqual([]);
    });

    it('should return an empty array when all films are non-winners', async () => {
      await db.insertFilmes([
        FilmeFactory.createLoser(2000, 'Prod A'),
        FilmeFactory.createLoser(2001, 'Prod B'),
      ]);
      const vencedores = await repository.listarVencedores();
      expect(vencedores).toEqual([]);
    });

    it('should return only winners, excluding non-winners', async () => {
      await db.insertFilmes(filmeFixtures.mixedWinnersAndLosers());
      const vencedores = await repository.listarVencedores();
      expect(vencedores.every((v) => v.winner === true)).toBe(true);
    });

    it('should return the exact number of winner records', async () => {
      await db.insertFilmes(filmeFixtures.mixedWinnersAndLosers());
      const vencedores = await repository.listarVencedores();
      expect(vencedores).toHaveLength(2);
    });

    it('should return domain Filme entities (not raw ORM models)', async () => {
      await db.insertFilmes([FilmeFactory.createWinner(2000, 'Prod')]);
      const vencedores = await repository.listarVencedores();
      expect(vencedores[0]).toHaveProperty('year');
      expect(vencedores[0]).toHaveProperty('title');
      expect(vencedores[0]).toHaveProperty('studios');
      expect(vencedores[0]).toHaveProperty('producer');
      expect(vencedores[0]).toHaveProperty('winner');
    });

    it('should map all fields correctly to domain entity', async () => {
      const filme = FilmeFactory.create({
        year: 2005,
        title: 'Domain Film',
        studios: 'Domain Studios',
        producer: 'Domain Producer',
        winner: true,
      });
      await db.insertFilmes([filme]);
      const vencedores = await repository.listarVencedores();
      expect(vencedores[0].year).toBe(2005);
      expect(vencedores[0].title).toBe('Domain Film');
      expect(vencedores[0].studios).toBe('Domain Studios');
      expect(vencedores[0].producer).toBe('Domain Producer');
      expect(vencedores[0].winner).toBe(true);
    });

    it('should return all winners when the entire batch wins', async () => {
      const winners = [
        FilmeFactory.createWinner(2000, 'A'),
        FilmeFactory.createWinner(2001, 'B'),
        FilmeFactory.createWinner(2002, 'C'),
      ];
      await db.insertFilmes(winners);
      const vencedores = await repository.listarVencedores();
      expect(vencedores).toHaveLength(3);
    });

    it('should return the same producer appearing multiple times if they won multiple times', async () => {
      await db.insertFilmes(filmeFixtures.consecutiveWins());
      const vencedores = await repository.listarVencedores();
      const joelEntries = vencedores.filter(
        (v) => v.producer === 'Joel Silver',
      );
      expect(joelEntries).toHaveLength(2);
    });
  });
});
