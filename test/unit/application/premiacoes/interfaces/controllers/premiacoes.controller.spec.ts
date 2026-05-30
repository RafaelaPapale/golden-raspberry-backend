import { Test, TestingModule } from '@nestjs/testing';
import { PremiacoesController } from 'src/application/premiacoes/interfaces/controllers/premiacoes.controller';
import { BuscarIntervalosPremiosUseCase } from 'src/application/premiacoes/use-cases/buscar-intervalos-premios/buscar-intervalos-premios.use-case';

describe('PremiacoesController', () => {
  let controller: PremiacoesController;
  let mockUseCase: { executar: jest.Mock };

  beforeEach(async () => {
    mockUseCase = { executar: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PremiacoesController],
      providers: [
        { provide: BuscarIntervalosPremiosUseCase, useValue: mockUseCase },
      ],
    }).compile();

    controller = module.get<PremiacoesController>(PremiacoesController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  describe('buscarIntervalos', () => {
    it('deve chamar o use case e retornar resultado mapeado para DTO', async () => {
      mockUseCase.executar.mockResolvedValue({
        statusCode: 200,
        mensagem: 'INTERVALOS_ENCONTRADOS',
        dados: {
          min: [
            {
              producer: 'Joel Silver',
              interval: 1,
              previousWin: 2008,
              followingWin: 2009,
            },
          ],
          max: [
            {
              producer: 'Matthew Vaughn',
              interval: 13,
              previousWin: 1980,
              followingWin: 1993,
            },
          ],
        },
      });

      const result = await controller.buscarIntervalos();

      expect(mockUseCase.executar).toHaveBeenCalledTimes(1);
      expect(result.min).toHaveLength(1);
      expect(result.max).toHaveLength(1);
      expect(result.min[0]).toEqual({
        producer: 'Joel Silver',
        interval: 1,
        previousWin: 2008,
        followingWin: 2009,
      });
      expect(result.max[0]).toEqual({
        producer: 'Matthew Vaughn',
        interval: 13,
        previousWin: 1980,
        followingWin: 1993,
      });
    });

    it('deve retornar arrays vazios quando não há intervalos', async () => {
      mockUseCase.executar.mockResolvedValue({
        statusCode: 200,
        mensagem: 'INTERVALOS_ENCONTRADOS',
        dados: { min: [], max: [] },
      });

      const result = await controller.buscarIntervalos();

      expect(result.min).toEqual([]);
      expect(result.max).toEqual([]);
    });

    it('deve retornar múltiplos itens no min e max quando há empate', async () => {
      mockUseCase.executar.mockResolvedValue({
        statusCode: 200,
        mensagem: 'INTERVALOS_ENCONTRADOS',
        dados: {
          min: [
            {
              producer: 'Prod A',
              interval: 1,
              previousWin: 2000,
              followingWin: 2001,
            },
            {
              producer: 'Prod B',
              interval: 1,
              previousWin: 2010,
              followingWin: 2011,
            },
          ],
          max: [
            {
              producer: 'Prod C',
              interval: 20,
              previousWin: 1970,
              followingWin: 1990,
            },
          ],
        },
      });

      const result = await controller.buscarIntervalos();

      expect(result.min).toHaveLength(2);
      expect(result.max).toHaveLength(1);
    });

    it('deve propagar o erro quando o use case lança exceção', async () => {
      mockUseCase.executar.mockRejectedValue(new Error('USE_CASE_ERROR'));

      await expect(controller.buscarIntervalos()).rejects.toThrow(
        'USE_CASE_ERROR',
      );
    });

    it('deve mapear corretamente todos os campos de ProdutorIntervaloDto', async () => {
      const item = {
        producer: 'Test Producer',
        interval: 5,
        previousWin: 1995,
        followingWin: 2000,
      };
      mockUseCase.executar.mockResolvedValue({
        statusCode: 200,
        mensagem: 'INTERVALOS_ENCONTRADOS',
        dados: { min: [item], max: [item] },
      });

      const result = await controller.buscarIntervalos();

      expect(result.min[0].producer).toBe('Test Producer');
      expect(result.min[0].interval).toBe(5);
      expect(result.min[0].previousWin).toBe(1995);
      expect(result.min[0].followingWin).toBe(2000);
    });
  });
});
