import { JwtPayloadDto } from 'src/infra/auth/jwt-payload.dto';

describe('JwtPayloadDto', () => {
  it('should be defined', () => {
    expect(new JwtPayloadDto()).toBeDefined();
  });

  it('should be an instance of JwtPayloadDto', () => {
    expect(new JwtPayloadDto()).toBeInstanceOf(JwtPayloadDto);
  });

  it('should accept a sub field', () => {
    const dto = Object.assign(new JwtPayloadDto(), { sub: 'user-123' });
    expect(dto.sub).toBe('user-123');
  });

  it('should accept a UUID-style sub', () => {
    const dto = Object.assign(new JwtPayloadDto(), {
      sub: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });
    expect(dto.sub).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });
});
