import { ApiProperty } from '@nestjs/swagger';
import { ProdutorIntervaloDto } from './produtor-intervalo.dto';

export class ResultadoIntervalosDto {
  @ApiProperty({
    type: [ProdutorIntervaloDto],
    description:
      'Produtores com o menor intervalo entre duas vitórias consecutivas',
  })
  min!: ProdutorIntervaloDto[];

  @ApiProperty({
    type: [ProdutorIntervaloDto],
    description:
      'Produtores com o maior intervalo entre duas vitórias consecutivas',
  })
  max!: ProdutorIntervaloDto[];
}
