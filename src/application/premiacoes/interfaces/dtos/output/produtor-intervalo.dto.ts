import { ApiProperty } from '@nestjs/swagger';

export class ProdutorIntervaloDto {
  @ApiProperty({ description: 'Nome do produtor', example: 'Producer 1' })
  producer!: string;

  @ApiProperty({
    description: 'Intervalo em anos entre as vitórias consecutivas',
    example: 1,
  })
  interval!: number;

  @ApiProperty({ description: 'Ano da vitória anterior', example: 2008 })
  previousWin!: number;

  @ApiProperty({ description: 'Ano da vitória seguinte', example: 2009 })
  followingWin!: number;
}
