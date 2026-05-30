import { ProdutorIntervaloDto } from 'src/application/premiacoes/interfaces/dtos/output/produtor-intervalo.dto';

describe('ProdutorIntervaloDto', () => {
  it('should be defined when assigned directly', () => {
    const dto = new ProdutorIntervaloDto();
    expect(dto).toBeDefined();
  });

  it('should be an instance of ProdutorIntervaloDto', () => {
    expect(new ProdutorIntervaloDto()).toBeInstanceOf(ProdutorIntervaloDto);
  });

  it('should accept all required fields', () => {
    const dto = Object.assign(new ProdutorIntervaloDto(), {
      producer: 'Producer 1',
      interval: 1,
      previousWin: 2008,
      followingWin: 2009,
    });

    expect(dto.producer).toBe('Producer 1');
    expect(dto.interval).toBe(1);
    expect(dto.previousWin).toBe(2008);
    expect(dto.followingWin).toBe(2009);
  });

  it('should accept interval as zero', () => {
    const dto = Object.assign(new ProdutorIntervaloDto(), { interval: 0 });
    expect(dto.interval).toBe(0);
  });

  it('should accept large year values', () => {
    const dto = Object.assign(new ProdutorIntervaloDto(), {
      previousWin: 1900,
      followingWin: 2100,
    });
    expect(dto.previousWin).toBe(1900);
    expect(dto.followingWin).toBe(2100);
  });
});
