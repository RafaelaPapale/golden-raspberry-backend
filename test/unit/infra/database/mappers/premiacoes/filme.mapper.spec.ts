import { FilmeMapper } from 'src/infra/database/mappers/premiacoes/filme.mapper';
import { FilmeModel } from 'src/infra/database/models/premiacoes/filme.model';
import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';

describe('FilmeMapper', () => {
  let mapper: FilmeMapper;

  beforeEach(() => {
    mapper = new FilmeMapper();
  });

  describe('toDomain', () => {
    it('should convert a FilmeModel to a Filme domain entity', () => {
      const model = {
        id: 1,
        year: 1980,
        title: "Can't Stop the Music",
        studios: 'AFD',
        producer: 'Allan Carr',
        winner: true,
      };

      const result = mapper.toDomain(model);

      expect(result).toBeInstanceOf(Filme);
    });

    it('should map all fields correctly', () => {
      const model = {
        id: 5,
        year: 2000,
        title: 'Battlefield Earth',
        studios: 'Warner Bros',
        producer: 'Elie Samaha',
        winner: false,
      };

      const result = mapper.toDomain(model);

      expect(result.id).toBe(5);
      expect(result.year).toBe(2000);
      expect(result.title).toBe('Battlefield Earth');
      expect(result.studios).toBe('Warner Bros');
      expect(result.producer).toBe('Elie Samaha');
      expect(result.winner).toBe(false);
    });

    it('should map winner as true correctly', () => {
      const model = {
        id: 2,
        year: 1981,
        title: 'T',
        studios: 'S',
        producer: 'P',
        winner: true,
      };
      expect(mapper.toDomain(model).winner).toBe(true);
    });

    it('should map winner as false correctly', () => {
      const model = {
        id: 3,
        year: 1982,
        title: 'T',
        studios: 'S',
        producer: 'P',
        winner: false,
      };
      expect(mapper.toDomain(model).winner).toBe(false);
    });
  });

  describe('toPersistence', () => {
    it('should convert a Filme domain entity to a FilmeModel', () => {
      const entity = new Filme({
        year: 1980,
        title: "Can't Stop the Music",
        studios: 'AFD',
        producer: 'Allan Carr',
        winner: true,
      });

      const result = mapper.toPersistence(entity);

      expect(result).toBeInstanceOf(FilmeModel);
    });

    it('should map all fields except id to the model', () => {
      const entity = new Filme({
        year: 2000,
        title: 'Battlefield Earth',
        studios: 'Warner Bros',
        producer: 'Elie Samaha',
        winner: false,
      });

      const result = mapper.toPersistence(entity);

      expect(result.year).toBe(2000);
      expect(result.title).toBe('Battlefield Earth');
      expect(result.studios).toBe('Warner Bros');
      expect(result.producer).toBe('Elie Samaha');
      expect(result.winner).toBe(false);
    });

    it('should not set id on persistence model', () => {
      const entity = new Filme({
        year: 1980,
        title: 'T',
        studios: 'S',
        producer: 'P',
        winner: true,
      });
      const result = mapper.toPersistence(entity);
      expect(result.id).toBeUndefined();
    });

    it('should persist winner as true', () => {
      const entity = new Filme({
        year: 1980,
        title: 'T',
        studios: 'S',
        producer: 'P',
        winner: true,
      });
      expect(mapper.toPersistence(entity).winner).toBe(true);
    });

    it('should persist winner as false', () => {
      const entity = new Filme({
        year: 1980,
        title: 'T',
        studios: 'S',
        producer: 'P',
        winner: false,
      });
      expect(mapper.toPersistence(entity).winner).toBe(false);
    });
  });
});
