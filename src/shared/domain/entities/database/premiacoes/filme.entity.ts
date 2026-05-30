export class Filme {
  constructor(partial: Partial<Filme>) {
    Object.assign(this, partial);
  }

  id?: number;
  year!: number;
  title!: string;
  studios!: string;
  producer!: string;
  winner!: boolean;
}
