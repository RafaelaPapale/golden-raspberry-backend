import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';

describe('Filme Entity', () => {
  it('should be defined with empty partial', () => {
    expect(new Filme({})).toBeDefined();
  });

  it('should be an instance of Filme', () => {
    expect(new Filme({})).toBeInstanceOf(Filme);
  });

  it('should create an instance with all required properties', () => {
    const entity = new Filme({
      year: 1980,
      title: "Can't Stop the Music",
      studios: 'AFD',
      producer: 'Allan Carr',
      winner: true,
    });

    expect(entity.year).toBe(1980);
    expect(entity.title).toBe("Can't Stop the Music");
    expect(entity.studios).toBe('AFD');
    expect(entity.producer).toBe('Allan Carr');
    expect(entity.winner).toBe(true);
  });

  it('should accept winner as false', () => {
    const entity = new Filme({ winner: false });
    expect(entity.winner).toBe(false);
  });

  it('should accept winner as true', () => {
    const entity = new Filme({ winner: true });
    expect(entity.winner).toBe(true);
  });

  it('should accept id as optional when provided', () => {
    const entity = new Filme({ id: 42 });
    expect(entity.id).toBe(42);
  });

  it('should leave id as undefined when not provided', () => {
    const entity = new Filme({
      year: 1980,
      title: 'Test',
      studios: 'Studio',
      producer: 'Producer',
      winner: false,
    });
    expect(entity.id).toBeUndefined();
  });

  it('should accept year as zero', () => {
    const entity = new Filme({ year: 0 });
    expect(entity.year).toBe(0);
  });

  it('should accept empty strings for title, studios and producer', () => {
    const entity = new Filme({ title: '', studios: '', producer: '' });
    expect(entity.title).toBe('');
    expect(entity.studios).toBe('');
    expect(entity.producer).toBe('');
  });
});
