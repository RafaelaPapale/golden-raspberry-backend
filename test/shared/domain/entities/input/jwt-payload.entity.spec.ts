import { JwtPayload } from 'src/shared/domain/entities/input/jwt-payload.entity';
import { JwtPayloadDto } from 'src/infra/auth/jwt-payload.dto';

describe('JwtPayload Entity', () => {
  describe('constructor', () => {
    it('should be defined when created with a sub', () => {
      expect(new JwtPayload('user-123')).toBeDefined();
    });

    it('should be an instance of JwtPayload', () => {
      expect(new JwtPayload('user-123')).toBeInstanceOf(JwtPayload);
    });

    it('should assign sub correctly', () => {
      const entity = new JwtPayload('user-abc');
      expect(entity.sub).toBe('user-abc');
    });
  });

  describe('fromDto', () => {
    it('should create a JwtPayload from a valid DTO', () => {
      const dto: JwtPayloadDto = { sub: 'user-123' };
      const entity = JwtPayload.fromDto(dto);

      expect(entity).toBeInstanceOf(JwtPayload);
      expect(entity.sub).toBe('user-123');
    });

    it('should throw an error when sub is missing', () => {
      const dto = { sub: '' };
      expect(() => JwtPayload.fromDto(dto)).toThrow(
        'Campos obrigatórios ausentes',
      );
    });

    it('should throw when dto has falsy sub (undefined cast)', () => {
      const dto = { sub: undefined } as unknown as JwtPayloadDto;
      expect(() => JwtPayload.fromDto(dto)).toThrow();
    });
  });
});
