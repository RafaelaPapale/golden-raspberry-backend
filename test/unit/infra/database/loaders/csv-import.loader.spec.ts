import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { CsvImportLoader } from 'src/infra/database/loaders/csv-import.loader';
import { CsvReaderService } from 'src/infra/services/csv-reader.service';
import { MockRepositoryBuilderPremiacoes } from '../../../helpers';

describe('CsvImportLoader', () => {
  let loader: CsvImportLoader;
  let mockRepo: ReturnType<
    typeof MockRepositoryBuilderPremiacoes.buildPremiacoesRepository
  >;
  let mockCsvReader: { lerArquivo: jest.Mock; parsearProdutores: jest.Mock };

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo = MockRepositoryBuilderPremiacoes.buildPremiacoesRepository();
    mockCsvReader = {
      lerArquivo: jest.fn(),
      parsearProdutores: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsvImportLoader,
        { provide: 'IPremiacoesRepository', useValue: mockRepo },
        { provide: CsvReaderService, useValue: mockCsvReader },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    loader = module.get<CsvImportLoader>(CsvImportLoader);
  });

  it('deve ser definido', () => {
    expect(loader).toBeDefined();
  });

  it('deve chamar setContext no construtor', () => {
    expect(mockLogger.setContext).toHaveBeenCalledWith(CsvImportLoader.name);
  });

  describe('onApplicationBootstrap', () => {
    it('deve ignorar importação quando banco já está populado', async () => {
      mockRepo.contarRegistros.mockResolvedValue(10);

      await loader.onApplicationBootstrap();

      expect(mockCsvReader.lerArquivo).not.toHaveBeenCalled();
      expect(mockRepo.criarEmLote).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'CsvImportLoader: banco já populado, importação ignorada',
        }),
      );
    });

    it('deve importar dados do CSV quando banco está vazio', async () => {
      mockRepo.contarRegistros.mockResolvedValue(0);
      mockCsvReader.lerArquivo.mockResolvedValue([
        {
          year: 1980,
          title: 'Film A',
          studios: 'Studio',
          producer: 'Producer A',
          winner: true,
        },
        {
          year: 1981,
          title: 'Film B',
          studios: 'Studio',
          producer: 'Producer B',
          winner: false,
        },
      ]);
      mockRepo.criarEmLote.mockResolvedValue(undefined);

      await loader.onApplicationBootstrap();

      expect(mockCsvReader.lerArquivo).toHaveBeenCalledTimes(1);
      expect(mockRepo.criarEmLote).toHaveBeenCalledTimes(1);
    });

    it('deve criar entidades Filme corretamente a partir das linhas CSV', async () => {
      mockRepo.contarRegistros.mockResolvedValue(0);
      mockCsvReader.lerArquivo.mockResolvedValue([
        {
          year: 1980,
          title: 'Film A',
          studios: 'Studio',
          producer: 'Producer A',
          winner: true,
        },
      ]);
      mockRepo.criarEmLote.mockResolvedValue(undefined);

      await loader.onApplicationBootstrap();

      const chamada = mockRepo.criarEmLote.mock.calls[0][0];
      expect(chamada).toHaveLength(1);
      expect(chamada[0].year).toBe(1980);
      expect(chamada[0].title).toBe('Film A');
      expect(chamada[0].studios).toBe('Studio');
      expect(chamada[0].producer).toBe('Producer A');
      expect(chamada[0].winner).toBe(true);
    });

    it('deve logar início e conclusão da importação', async () => {
      mockRepo.contarRegistros.mockResolvedValue(0);
      mockCsvReader.lerArquivo.mockResolvedValue([
        {
          year: 1980,
          title: 'Film',
          studios: 'S',
          producer: 'P',
          winner: false,
        },
      ]);
      mockRepo.criarEmLote.mockResolvedValue(undefined);

      await loader.onApplicationBootstrap();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'CsvImportLoader: iniciando importação do CSV',
        }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'CsvImportLoader: importação concluída',
        }),
      );
    });

    it('deve passar o caminho correto do CSV para o lerArquivo', async () => {
      mockRepo.contarRegistros.mockResolvedValue(0);
      mockCsvReader.lerArquivo.mockResolvedValue([]);
      mockRepo.criarEmLote.mockResolvedValue(undefined);

      await loader.onApplicationBootstrap();

      const pathArg: string = mockCsvReader.lerArquivo.mock.calls[0][0];
      expect(pathArg).toContain('docs');
      expect(pathArg).toContain('Movielist.csv');
    });

    it('deve logar o total de registros importados', async () => {
      const rows = [
        { year: 1980, title: 'A', studios: 'S', producer: 'P1', winner: true },
        { year: 1981, title: 'B', studios: 'S', producer: 'P2', winner: false },
        { year: 1982, title: 'C', studios: 'S', producer: 'P3', winner: true },
      ];
      mockRepo.contarRegistros.mockResolvedValue(0);
      mockCsvReader.lerArquivo.mockResolvedValue(rows);
      mockRepo.criarEmLote.mockResolvedValue(undefined);

      await loader.onApplicationBootstrap();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ totalRegistros: 3 }),
      );
    });
  });
});
