// Mock passport-jwt BEFORE any imports so PassportStrategy gets a properly named Strategy
jest.mock('passport-jwt', () => ({
  ExtractJwt: {
    fromAuthHeaderAsBearerToken: jest.fn().mockReturnValue(jest.fn()),
  },
  Strategy: class MockJwtStrategy {
    name = 'jwt';
    constructor(_options: any, _verify: any) {}
  },
}));

import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from 'src/infra/auth/jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret-key'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(mockConfigService as unknown as ConfigService);
  });

  it('deve ser definido', () => {
    expect(strategy).toBeDefined();
  });

  it('deve usar JWT_SECRET_KEY da configuração', () => {
    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('JWT_SECRET_KEY');
  });

  describe('validate', () => {
    it('deve retornar JwtPayloadDto quando o payload contém sub válido', () => {
      const payload = { sub: 'user-123', iat: 1234567890, exp: 9999999999 };

      const result = strategy.validate(payload);

      expect(result).toEqual({ sub: 'user-123' });
    });

    it('deve lançar HttpException 401 quando sub está ausente no payload', () => {
      expect(() => strategy.validate({ iat: 1234567890 })).toThrow(
        HttpException,
      );
    });

    it('deve lançar HttpException com status UNAUTHORIZED', () => {
      try {
        strategy.validate({});
        fail('Deveria ter lançado exceção');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(
          HttpStatus.UNAUTHORIZED,
        );
      }
    });

    it('deve lançar HttpException quando sub é um número (não string)', () => {
      expect(() => strategy.validate({ sub: 12345 })).toThrow(HttpException);
    });

    it('deve lançar HttpException quando sub é null', () => {
      expect(() => strategy.validate({ sub: null })).toThrow(HttpException);
    });

    it('deve lançar com mensagem "Token inválido"', () => {
      try {
        strategy.validate({});
      } catch (error) {
        expect((error as HttpException).message).toBe('Token inválido');
      }
    });

    it('deve retornar objeto com sub correto quando payload tem campos extras', () => {
      const result = strategy.validate({
        sub: 'user-abc',
        name: 'John',
        role: 'admin',
      });
      expect(result.sub).toBe('user-abc');
    });
  });
});
