import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';

const f = (
  year: number,
  title: string,
  producer: string,
  winner: boolean,
  studios = 'Test Studios',
): Filme => new Filme({ year, title, studios, producer, winner });

/**
 * Pre-defined deterministic datasets for integration test scenarios.
 * Every factory function returns a fresh array to prevent state sharing.
 */
export const filmeFixtures = {
  /** No producer wins more than once — min/max arrays must be empty. */
  singleWinnerPerProducer: (): Filme[] => [
    f(1980, 'Film A', 'Producer A', true),
    f(1990, 'Film B', 'Producer B', true),
    f(1999, 'Film C', 'Producer C', false),
  ],

  /** One producer wins in consecutive years — interval = 1. */
  consecutiveWins: (): Filme[] => [
    f(2000, 'Win 1', 'Joel Silver', true),
    f(2001, 'Win 2', 'Joel Silver', true),
  ],

  /** One producer with a long gap — interval = 13. */
  longIntervalWins: (): Filme[] => [
    f(2002, 'Win A', 'Matthew Vaughn', true),
    f(2015, 'Win B', 'Matthew Vaughn', true),
  ],

  /**
   * Two producers with different intervals.
   * min = Joel Silver (1), max = Matthew Vaughn (13).
   */
  minMaxScenario: (): Filme[] => [
    f(2000, 'A', 'Joel Silver', true),
    f(2001, 'B', 'Joel Silver', true),
    f(2002, 'C', 'Matthew Vaughn', true),
    f(2015, 'D', 'Matthew Vaughn', true),
  ],

  /** Two producers tied at interval = 1 — both appear in min AND max. */
  tieScenario: (): Filme[] => [
    f(2000, 'A', 'Prod A', true),
    f(2001, 'B', 'Prod A', true),
    f(2010, 'C', 'Prod B', true),
    f(2011, 'D', 'Prod B', true),
  ],

  /** Winners interspersed with non-winners — repo must filter correctly. */
  mixedWinnersAndLosers: (): Filme[] => [
    f(2000, 'Winner 1', 'Winner Prod', true),
    f(2000, 'Loser 1', 'Loser Prod', false),
    f(2001, 'Loser 2', 'Another Loser', false),
    f(2003, 'Winner 2', 'Winner Prod', true),
  ],

  /**
   * Years out of chronological order per producer.
   * Use case must sort before calculating intervals.
   */
  outOfOrderYears: (): Filme[] => [
    f(2010, 'Z', 'Prod X', true),
    f(1995, 'Y', 'Prod X', true),
    f(2005, 'X', 'Prod X', true),
  ],

  /**
   * Three wins for one producer — generates two consecutive intervals.
   * interval[0] = 10 (1995→2005), interval[1] = 5 (2005→2010).
   */
  threeWins: (): Filme[] => [
    f(1995, 'First', 'Triple Prod', true),
    f(2005, 'Second', 'Triple Prod', true),
    f(2010, 'Third', 'Triple Prod', true),
  ],

  /** Complex scenario with 3 producers at different intervals. */
  complexScenario: (): Filme[] => [
    f(2000, 'JS1', 'Joel Silver', true),
    f(2001, 'JS2', 'Joel Silver', true),
    f(1984, 'BD1', 'Bo Derek', true),
    f(1990, 'BD2', 'Bo Derek', true),
    f(2002, 'MV1', 'Matthew Vaughn', true),
    f(2015, 'MV2', 'Matthew Vaughn', true),
    f(1999, 'NR1', 'No Repeat', false),
  ],

  /** Completely empty database. */
  empty: (): Filme[] => [],
};
