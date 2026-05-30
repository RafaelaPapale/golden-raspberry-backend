import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from 'src/infra/auth/public.decorator';
import { DocumentPublicEndpoint } from 'src/infra/decorators/document-api-endpoint.decorator';
import { BuscarIntervalosPremiosUseCase } from '../../use-cases/buscar-intervalos-premios/buscar-intervalos-premios.use-case';
import { ProdutorIntervaloDto } from '../dtos/output/produtor-intervalo.dto';
import { ResultadoIntervalosDto } from '../dtos/output/resultado-intervalos.dto';

@ApiTags('Premiacoes')
@Controller('v1/premiacoes')
export class PremiacoesController {
  constructor(
    private readonly buscarIntervalosPremiosUseCase: BuscarIntervalosPremiosUseCase,
  ) {}

  @DocumentPublicEndpoint({
    summary: 'Buscar intervalos entre prêmios',
    description:
      'Retorna o produtor com o menor e o maior intervalo entre dois prêmios consecutivos da categoria Pior Filme do Golden Raspberry Awards.',
    successType: ResultadoIntervalosDto,
  })
  @Public()
  @Get('/intervalos')
  async buscarIntervalos(): Promise<ResultadoIntervalosDto> {
    const resposta = await this.buscarIntervalosPremiosUseCase.executar();
    const resultado = resposta.dados;

    return {
      min: resultado.min.map(
        (p): ProdutorIntervaloDto => ({
          producer: p.producer,
          interval: p.interval,
          previousWin: p.previousWin,
          followingWin: p.followingWin,
        }),
      ),
      max: resultado.max.map(
        (p): ProdutorIntervaloDto => ({
          producer: p.producer,
          interval: p.interval,
          previousWin: p.previousWin,
          followingWin: p.followingWin,
        }),
      ),
    };
  }
}
