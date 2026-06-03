import { Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { IPremiacoesRepository } from 'src/shared/adapters/database/premiacoes/premiacoes.adapter';
import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';
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
      const porProdutor = this.agruparPorProdutor(vencedores);
      const resultado = this.calcularResultado(porProdutor);

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

  private agruparPorProdutor(vencedores: Filme[]): Map<string, number[]> {
    const mapa = new Map<string, number[]>();
    for (const filme of vencedores) {
      const anos = mapa.get(filme.producer) ?? [];
      anos.push(filme.year);
      mapa.set(filme.producer, anos);
    }
    return mapa;
  }

  private calcularResultado(
    porProdutor: Map<string, number[]>,
  ): ResultadoIntervalos {
    let minInterval = Infinity;
    let maxInterval = -Infinity;
    const minItems: ProdutorIntervalo[] = [];
    const maxItems: ProdutorIntervalo[] = [];

    for (const [producer, anos] of porProdutor) {
      if (anos.length < 2) continue;
      anos.sort((a, b) => a - b);
      for (let i = 1; i < anos.length; i++) {
        const interval = anos[i] - anos[i - 1];
        const item = new ProdutorIntervalo({
          producer,
          interval,
          previousWin: anos[i - 1],
          followingWin: anos[i],
        });

        if (interval < minInterval) {
          minInterval = interval;
          minItems.length = 0;
          minItems.push(item);
        } else if (interval === minInterval) {
          minItems.push(item);
        }

        if (interval > maxInterval) {
          maxInterval = interval;
          maxItems.length = 0;
          maxItems.push(item);
        } else if (interval === maxInterval) {
          maxItems.push(item);
        }
      }
    }

    return new ResultadoIntervalos({ min: minItems, max: maxItems });
  }
}
