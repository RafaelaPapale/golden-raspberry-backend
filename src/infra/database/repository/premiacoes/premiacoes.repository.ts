import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { FilmeMapper } from 'src/infra/database/mappers/premiacoes/filme.mapper';
import { FilmeModel } from 'src/infra/database/models/premiacoes/filme.model';
import { IPremiacoesRepository } from 'src/shared/adapters/database/premiacoes/premiacoes.adapter';
import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';

@Injectable()
export class PremiacoesRepository implements IPremiacoesRepository {
  constructor(
    @InjectRepository(FilmeModel)
    private readonly filmeRepository: Repository<FilmeModel>,
    private readonly mapper: FilmeMapper,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PremiacoesRepository.name);
  }

  async contarRegistros(): Promise<number> {
    return await this.filmeRepository.count();
  }

  async criarEmLote(filmes: Filme[]): Promise<void> {
    const models = filmes.map((f) => this.mapper.toPersistence(f));
    await this.filmeRepository.save(models);
  }

  async listarVencedores(): Promise<Filme[]> {
    const models = await this.filmeRepository.find({ where: { winner: true } });
    return models.map((m) => this.mapper.toDomain(m));
  }
}
