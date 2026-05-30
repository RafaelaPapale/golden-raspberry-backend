import { ProdutorIntervalo } from 'src/application/premiacoes/domain/entities/output/produtor-intervalo.entity';

describe('ProdutorIntervalo Entity', () => {
  it('should be defined with empty partial', () => {
    expect(new ProdutorIntervalo({})).toBeDefined();
  });

  it('should be an instance of ProdutorIntervalo', () => {
    expect(new ProdutorIntervalo({})).toBeInstanceOf(ProdutorIntervalo);
  });

  it('should create an instance with all required properties', () => {
    const entity = new ProdutorIntervalo({
      producer: 'Joel Silver',
      interval: 1,
      previousWin: 2008,
      followingWin: 2009,
    });

    expect(entity.producer).toBe('Joel Silver');
    expect(entity.interval).toBe(1);
    expect(entity.previousWin).toBe(2008);
    expect(entity.followingWin).toBe(2009);
  });

  it('should accept interval as zero', () => {
    const entity = new ProdutorIntervalo({ interval: 0 });
    expect(entity.interval).toBe(0);
  });

  it('should accept large interval values', () => {
    const entity = new ProdutorIntervalo({
      interval: 99,
      previousWin: 1900,
      followingWin: 1999,
    });
    expect(entity.interval).toBe(99);
    expect(entity.previousWin).toBe(1900);
    expect(entity.followingWin).toBe(1999);
  });

  it('should accept empty string for producer', () => {
    const entity = new ProdutorIntervalo({ producer: '' });
    expect(entity.producer).toBe('');
  });
});
