import { ProdutorIntervalo } from 'src/application/premiacoes/domain/entities/output/produtor-intervalo.entity';
import { ResultadoIntervalos } from 'src/application/premiacoes/domain/entities/output/resultado-intervalos.entity';

describe('ResultadoIntervalos Entity', () => {
  it('should be defined with empty partial', () => {
    expect(new ResultadoIntervalos({})).toBeDefined();
  });

  it('should be an instance of ResultadoIntervalos', () => {
    expect(new ResultadoIntervalos({})).toBeInstanceOf(ResultadoIntervalos);
  });

  it('should create an instance with min and max arrays', () => {
    const min = [
      new ProdutorIntervalo({
        producer: 'A',
        interval: 1,
        previousWin: 2000,
        followingWin: 2001,
      }),
    ];
    const max = [
      new ProdutorIntervalo({
        producer: 'B',
        interval: 13,
        previousWin: 1980,
        followingWin: 1993,
      }),
    ];

    const entity = new ResultadoIntervalos({ min, max });

    expect(entity.min).toHaveLength(1);
    expect(entity.max).toHaveLength(1);
    expect(entity.min[0].producer).toBe('A');
    expect(entity.max[0].producer).toBe('B');
  });

  it('should accept empty arrays for min and max', () => {
    const entity = new ResultadoIntervalos({ min: [], max: [] });

    expect(entity.min).toEqual([]);
    expect(entity.max).toEqual([]);
    expect(entity.min).toHaveLength(0);
    expect(entity.max).toHaveLength(0);
  });

  it('should accept multiple items in min and max', () => {
    const items = [
      new ProdutorIntervalo({
        producer: 'A',
        interval: 1,
        previousWin: 2000,
        followingWin: 2001,
      }),
      new ProdutorIntervalo({
        producer: 'B',
        interval: 1,
        previousWin: 2010,
        followingWin: 2011,
      }),
    ];

    const entity = new ResultadoIntervalos({ min: items, max: items });

    expect(entity.min).toHaveLength(2);
    expect(entity.max).toHaveLength(2);
  });

  it('should leave min and max as undefined when not provided', () => {
    const entity = new ResultadoIntervalos({});
    expect(entity.min).toBeUndefined();
    expect(entity.max).toBeUndefined();
  });
});
