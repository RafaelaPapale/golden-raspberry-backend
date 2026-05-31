import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';

let _counter = 0;

/**
 * Builder-style factory for Filme domain entities.
 * Use FilmeFactory.reset() in beforeEach if sequence predictability matters.
 */
export class FilmeFactory {
  static reset(): void {
    _counter = 0;
  }

  static create(overrides: Partial<Filme> = {}): Filme {
    _counter++;
    return new Filme({
      year: 2000 + _counter,
      title: `Test Film ${_counter}`,
      studios: 'Test Studios',
      producer: `Test Producer ${_counter}`,
      winner: false,
      ...overrides,
    });
  }

  static createWinner(
    year: number,
    producer: string,
    overrides: Partial<Filme> = {},
  ): Filme {
    return FilmeFactory.create({ year, producer, winner: true, ...overrides });
  }

  static createLoser(
    year: number,
    producer: string,
    overrides: Partial<Filme> = {},
  ): Filme {
    return FilmeFactory.create({ year, producer, winner: false, ...overrides });
  }

  static createBatch(count: number, overrides: Partial<Filme> = {}): Filme[] {
    return Array.from({ length: count }, () => FilmeFactory.create(overrides));
  }

  /**
   * Creates a pair of winning entries for the same producer with a given interval.
   * previousWin is `baseYear`, followingWin is `baseYear + interval`.
   */
  static createInterval(
    producer: string,
    baseYear: number,
    interval: number,
  ): [Filme, Filme] {
    return [
      FilmeFactory.createWinner(baseYear, producer, {
        title: `${producer} Win 1`,
      }),
      FilmeFactory.createWinner(baseYear + interval, producer, {
        title: `${producer} Win 2`,
      }),
    ];
  }
}
