import { ProdutorIntervalo } from './produtor-intervalo.entity';

export class ResultadoIntervalos {
  constructor(partial: Partial<ResultadoIntervalos>) {
    Object.assign(this, partial);
  }

  min!: ProdutorIntervalo[];
  max!: ProdutorIntervalo[];
}
