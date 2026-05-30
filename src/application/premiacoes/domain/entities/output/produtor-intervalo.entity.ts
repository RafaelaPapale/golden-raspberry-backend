export class ProdutorIntervalo {
  constructor(partial: Partial<ProdutorIntervalo>) {
    Object.assign(this, partial);
  }

  producer!: string;
  interval!: number;
  previousWin!: number;
  followingWin!: number;
}
