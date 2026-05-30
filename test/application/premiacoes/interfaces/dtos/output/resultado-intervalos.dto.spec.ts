import { ProdutorIntervaloDto } from 'src/application/premiacoes/interfaces/dtos/output/produtor-intervalo.dto';
import { ResultadoIntervalosDto } from 'src/application/premiacoes/interfaces/dtos/output/resultado-intervalos.dto';

describe('ResultadoIntervalosDto', () => {
  it('should be defined', () => {
    expect(new ResultadoIntervalosDto()).toBeDefined();
  });

  it('should be an instance of ResultadoIntervalosDto', () => {
    expect(new ResultadoIntervalosDto()).toBeInstanceOf(ResultadoIntervalosDto);
  });

  it('should accept min and max arrays of ProdutorIntervaloDto', () => {
    const item = Object.assign(new ProdutorIntervaloDto(), {
      producer: 'Joel Silver',
      interval: 1,
      previousWin: 2008,
      followingWin: 2009,
    });

    const dto = Object.assign(new ResultadoIntervalosDto(), {
      min: [item],
      max: [item],
    });

    expect(dto.min).toHaveLength(1);
    expect(dto.max).toHaveLength(1);
    expect(dto.min[0].producer).toBe('Joel Silver');
  });

  it('should accept empty arrays for min and max', () => {
    const dto = Object.assign(new ResultadoIntervalosDto(), {
      min: [],
      max: [],
    });

    expect(dto.min).toEqual([]);
    expect(dto.max).toEqual([]);
  });
});
