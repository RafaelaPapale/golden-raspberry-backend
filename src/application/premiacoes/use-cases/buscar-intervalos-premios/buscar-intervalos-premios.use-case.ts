import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { IPremiacoesRepository } from 'src/shared/adapters/database/premiacoes/premiacoes.adapter';
import { Resposta } from 'src/shared/domain/entities/output/resposta.entity';
import { ProdutorIntervalo } from '../../domain/entities/output/produtor-intervalo.entity';
import { ResultadoIntervalos } from '../../domain/entities/output/resultado-intervalos.entity';

@Injectable()
export class BuscarIntervalosPremiosUseCase {
  constructor(
    @Inject('IPremiacoesRepository')
    private readonly repo: IPremiacoesRepository,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BuscarIntervalosPremiosUseCase.name);
  }

  async executar(): Promise<Resposta<ResultadoIntervalos>> {
    try {
      this.logger.info({ message: 'BuscarIntervalosPremios INÍCIO' });

      const vencedores = await this.repo.listarVencedores();

      const porProdutor = new Map<string, number[]>();
      for (const filme of vencedores) {
        const anos = porProdutor.get(filme.producer) ?? [];
        anos.push(filme.year);
        porProdutor.set(filme.producer, anos);
      }

      const todosIntervalos: ProdutorIntervalo[] = [];
      for (const [producer, anos] of porProdutor) {
        if (anos.length < 2) continue;
        anos.sort((a, b) => a - b);
        for (let i = 1; i < anos.length; i++) {
          todosIntervalos.push(
            new ProdutorIntervalo({
              producer,
              interval: anos[i] - anos[i - 1],
              previousWin: anos[i - 1],
              followingWin: anos[i],
            }),
          );
        }
      }

      const resultado =
        todosIntervalos.length === 0
          ? new ResultadoIntervalos({ min: [], max: [] })
          : this.calcularResultado(todosIntervalos);

      const resposta = Object.assign(new Resposta<ResultadoIntervalos>(), {
        statusCode: 200,
        mensagem: 'INTERVALOS_ENCONTRADOS',
        dados: resultado,
      });

      this.logger.info({
        message: 'BuscarIntervalosPremios FIM',
        result: resultado,
      });

      return resposta;
    } catch (error_: unknown) {
      this.logger.error({
        message: 'BuscarIntervalosPremios ERRO',
        erro: error_,
      });
      throw error_;
    }
  }

  private calcularResultado(
    intervalos: ProdutorIntervalo[],
  ): ResultadoIntervalos {
    const menorIntervalo = Math.min(...intervalos.map((i) => i.interval));
    const maiorIntervalo = Math.max(...intervalos.map((i) => i.interval));

    return new ResultadoIntervalos({
      min: intervalos.filter((i) => i.interval === menorIntervalo),
      max: intervalos.filter((i) => i.interval === maiorIntervalo),
    });
  }
}
