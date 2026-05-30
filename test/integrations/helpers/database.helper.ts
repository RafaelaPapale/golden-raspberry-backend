import { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FilmeMapper } from 'src/infra/database/mappers/premiacoes/filme.mapper';
import { FilmeModel } from 'src/infra/database/models/premiacoes/filme.model';
import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';

/**
 * Provides direct database access for integration test setup and teardown.
 * Operates on the real TypeORM repository — no mocking.
 */
export class DatabaseHelper {
  private readonly repo: Repository<FilmeModel>;
  private readonly mapper: FilmeMapper;

  constructor(module: TestingModule) {
    this.repo = module.get<Repository<FilmeModel>>(
      getRepositoryToken(FilmeModel),
    );
    this.mapper = module.get<FilmeMapper>(FilmeMapper);
  }

  async insertFilmes(filmes: Filme[]): Promise<FilmeModel[]> {
    const models = filmes.map((f) => this.mapper.toPersistence(f));
    return this.repo.save(models);
  }

  async clearFilmes(): Promise<void> {
    await this.repo.clear();
  }

  async countAll(): Promise<number> {
    return this.repo.count();
  }

  async countWinners(): Promise<number> {
    return this.repo.count({ where: { winner: true } });
  }

  async findAll(): Promise<FilmeModel[]> {
    return this.repo.find({ order: { year: 'ASC' } });
  }

  async findWinners(): Promise<FilmeModel[]> {
    return this.repo.find({ where: { winner: true }, order: { year: 'ASC' } });
  }
}
