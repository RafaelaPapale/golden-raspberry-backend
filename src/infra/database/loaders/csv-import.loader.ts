import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { join } from 'path';
import { PinoLogger } from 'nestjs-pino';
import { CsvReaderService } from 'src/infra/services/csv-reader.service';
import type { IPremiacoesRepository } from 'src/shared/adapters/database/premiacoes/premiacoes.adapter';
import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';

@Injectable()
export class CsvImportLoader implements OnApplicationBootstrap {
  constructor(
    @Inject('IPremiacoesRepository')
    private readonly repository: IPremiacoesRepository,
    private readonly csvReaderService: CsvReaderService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(CsvImportLoader.name);
  }

  async onApplicationBootstrap(): Promise<void> {
    const total = await this.repository.contarRegistros();
    if (total > 0) {
      this.logger.info({
        message: 'CsvImportLoader: banco já populado, importação ignorada',
        total,
      });
      return;
    }

    const caminhoCsv = join(process.cwd(), 'docs', 'Movielist.csv');

    this.logger.info({
      message: 'CsvImportLoader: iniciando importação do CSV',
      caminhoCsv,
    });

    const linhas = await this.csvReaderService.lerArquivo(caminhoCsv);

    const filmes = linhas.map(
      (linha) =>
        new Filme({
          year: linha.year,
          title: linha.title,
          studios: linha.studios,
          producer: linha.producer,
          winner: linha.winner,
        }),
    );

    await this.repository.criarEmLote(filmes);

    this.logger.info({
      message: 'CsvImportLoader: importação concluída',
      totalRegistros: filmes.length,
    });
  }
}
