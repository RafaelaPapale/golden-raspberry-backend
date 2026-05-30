import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { BuscarIntervalosPremiosUseCase } from 'src/application/premiacoes/use-cases/buscar-intervalos-premios/buscar-intervalos-premios.use-case';
import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';
import { MockRepositoryBuilderPremiacoes } from '../../../../helpers';

describe('BuscarIntervalosPremiosUseCase', () => {
  let useCase: BuscarIntervalosPremiosUseCase;
  let mockRepo: ReturnType<
    typeof MockRepositoryBuilderPremiacoes.buildPremiacoesRepository
  >;

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRepo = MockRepositoryBuilderPremiacoes.buildPremiacoesRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuscarIntervalosPremiosUseCase,
        { provide: 'IPremiacoesRepository', useValue: mockRepo },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    useCase = module.get<BuscarIntervalosPremiosUseCase>(
      BuscarIntervalosPremiosUseCase,
    );
  });

  describe('Instanciação', () => {
    it('deve ser definido', () => {
      expect(useCase).toBeDefined();
    });

    it('deve ser instância de BuscarIntervalosPremiosUseCase', () => {
      expect(useCase).toBeInstanceOf(BuscarIntervalosPremiosUseCase);
    });

    it('deve chamar setContext no construtor', () => {
      expect(mockLogger.setContext).toHaveBeenCalledWith(
        BuscarIntervalosPremiosUseCase.name,
      );
    });
  });

  describe('executar', () => {
    it('deve retornar min e max corretamente quando há produtores com múltiplas vitórias', async () => {
      const vencedores: Filme[] = [
        new Filme({
          year: 2000,
          title: 'Filme A',
          studios: 'S',
          producer: 'Joel Silver',
          winner: true,
        }),
        new Filme({
          year: 2001,
          title: 'Filme B',
          studios: 'S',
          producer: 'Joel Silver',
          winner: true,
        }),
        new Filme({
          year: 1980,
          title: 'Filme C',
          studios: 'S',
          producer: 'Matthew Vaughn',
          winner: true,
        }),
        new Filme({
          year: 1993,
          title: 'Filme D',
          studios: 'S',
          producer: 'Matthew Vaughn',
          winner: true,
        }),
      ];

      mockRepo.listarVencedores.mockResolvedValue(vencedores);

      const result = await useCase.executar();

      expect(result.statusCode).toBe(200);
      expect(result.mensagem).toBe('INTERVALOS_ENCONTRADOS');
      expect(result.dados).toBeDefined();
      expect(result.dados.min).toHaveLength(1);
      expect(result.dados.max).toHaveLength(1);
      expect(result.dados.min[0].producer).toBe('Joel Silver');
      expect(result.dados.min[0].interval).toBe(1);
      expect(result.dados.max[0].producer).toBe('Matthew Vaughn');
      expect(result.dados.max[0].interval).toBe(13);
    });

    it('deve retornar listas vazias quando não há vencedores', async () => {
      mockRepo.listarVencedores.mockResolvedValue([]);

      const result = await useCase.executar();

      expect(result.dados.min).toEqual([]);
      expect(result.dados.max).toEqual([]);
    });

    it('deve retornar listas vazias quando todos os produtores têm apenas uma vitória', async () => {
      const vencedores: Filme[] = [
        new Filme({
          year: 1980,
          title: 'A',
          studios: 'S',
          producer: 'Produtor A',
          winner: true,
        }),
        new Filme({
          year: 1990,
          title: 'B',
          studios: 'S',
          producer: 'Produtor B',
          winner: true,
        }),
      ];

      mockRepo.listarVencedores.mockResolvedValue(vencedores);

      const result = await useCase.executar();

      expect(result.dados.min).toEqual([]);
      expect(result.dados.max).toEqual([]);
    });

    it('deve calcular intervalos corretamente com anos fora de ordem', async () => {
      const vencedores: Filme[] = [
        new Filme({
          year: 2005,
          title: 'Filme X',
          studios: 'S',
          producer: 'Produtor X',
          winner: true,
        }),
        new Filme({
          year: 1995,
          title: 'Filme Y',
          studios: 'S',
          producer: 'Produtor X',
          winner: true,
        }),
        new Filme({
          year: 2010,
          title: 'Filme Z',
          studios: 'S',
          producer: 'Produtor X',
          winner: true,
        }),
      ];

      mockRepo.listarVencedores.mockResolvedValue(vencedores);

      const result = await useCase.executar();
      const intervalos = result.dados.min.concat(result.dados.max);

      expect(intervalos.some((i) => i.interval === 10)).toBe(true);
      expect(intervalos.some((i) => i.interval === 5)).toBe(true);
    });

    it('deve retornar múltiplos produtores no min quando há empate', async () => {
      const vencedores: Filme[] = [
        new Filme({
          year: 2000,
          title: 'A',
          studios: 'S',
          producer: 'Prod A',
          winner: true,
        }),
        new Filme({
          year: 2001,
          title: 'B',
          studios: 'S',
          producer: 'Prod A',
          winner: true,
        }),
        new Filme({
          year: 2010,
          title: 'C',
          studios: 'S',
          producer: 'Prod B',
          winner: true,
        }),
        new Filme({
          year: 2011,
          title: 'D',
          studios: 'S',
          producer: 'Prod B',
          winner: true,
        }),
      ];

      mockRepo.listarVencedores.mockResolvedValue(vencedores);

      const result = await useCase.executar();

      expect(result.dados.min).toHaveLength(2);
      expect(result.dados.max).toHaveLength(2);
      result.dados.min.forEach((m) => expect(m.interval).toBe(1));
    });

    it('deve propagar erro e logar quando repository lança exceção', async () => {
      const erro = new Error('DB_ERROR');
      mockRepo.listarVencedores.mockRejectedValue(erro);

      await expect(useCase.executar()).rejects.toThrow('DB_ERROR');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'BuscarIntervalosPremios ERRO' }),
      );
    });

    it('deve logar INÍCIO e FIM nos caminhos normais', async () => {
      mockRepo.listarVencedores.mockResolvedValue([]);

      await useCase.executar();

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'BuscarIntervalosPremios INÍCIO' }),
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'BuscarIntervalosPremios FIM' }),
      );
    });

    it('deve calcular previousWin e followingWin corretamente', async () => {
      const vencedores: Filme[] = [
        new Filme({
          year: 1980,
          title: 'A',
          studios: 'S',
          producer: 'Prod',
          winner: true,
        }),
        new Filme({
          year: 1985,
          title: 'B',
          studios: 'S',
          producer: 'Prod',
          winner: true,
        }),
      ];

      mockRepo.listarVencedores.mockResolvedValue(vencedores);

      const result = await useCase.executar();

      expect(result.dados.min[0].previousWin).toBe(1980);
      expect(result.dados.min[0].followingWin).toBe(1985);
      expect(result.dados.min[0].interval).toBe(5);
    });
  });
});
