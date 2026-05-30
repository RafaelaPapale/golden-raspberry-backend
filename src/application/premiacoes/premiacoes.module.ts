import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CsvImportLoader } from 'src/infra/database/loaders/csv-import.loader';
import { FilmeMapper } from 'src/infra/database/mappers/premiacoes/filme.mapper';
import { FilmeModel } from 'src/infra/database/models/premiacoes/filme.model';
import { PremiacoesRepository } from 'src/infra/database/repository/premiacoes/premiacoes.repository';
import { CsvReaderService } from 'src/infra/services/csv-reader.service';
import { DatabaseModule } from 'src/modules/database.module';
import { PinoLoggerModule } from 'src/modules/logger.module';
import { BuscarIntervalosPremiosUseCase } from './use-cases/buscar-intervalos-premios/buscar-intervalos-premios.use-case';
import { PremiacoesController } from './interfaces/controllers/premiacoes.controller';

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([FilmeModel]),
    PinoLoggerModule,
  ],
  controllers: [PremiacoesController],
  providers: [
    { provide: 'IPremiacoesRepository', useClass: PremiacoesRepository },
    FilmeMapper,
    BuscarIntervalosPremiosUseCase,
    CsvReaderService,
    CsvImportLoader,
  ],
})
export class PremiacoesModule {}
