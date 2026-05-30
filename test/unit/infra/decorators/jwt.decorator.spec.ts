import { UnauthorizedException } from '@nestjs/common';

// Mock createParamDecorator to capture and expose the factory function for testing
let capturedFactory: (data: unknown, ctx: any) => any;

jest.mock('@nestjs/common', () => {
  const actual = jest.requireActual('@nestjs/common');
  return {
    ...actual,
    createParamDecorator: (factory: (data: unknown, ctx: any) => any) => {
      capturedFactory = factory;
      return actual.createParamDecorator(factory);
    },
  };
});

import { JwtExport } from 'src/infra/decorators/jwt.decorator';
import { JwtPayload } from 'src/shared/domain/entities/input/jwt-payload.entity';

const buildMockContext = (user: any) => ({
  switchToHttp: () => ({
    getRequest: () => ({ user }),
  }),
});

describe('JwtExport Decorator', () => {
  it('should export a defined value', () => {
    expect(JwtExport).toBeDefined();
  });

  describe('factory function', () => {
    it('should return a JwtPayload when request has a valid user', () => {
      const ctx = buildMockContext({ sub: 'user-123' });

      const result = capturedFactory(undefined, ctx);

      expect(result).toBeInstanceOf(JwtPayload);
      expect(result.sub).toBe('user-123');
    });

    it('should propagate error from JwtPayload.fromDto when sub is missing', () => {
      const ctx = buildMockContext({ sub: '' });

      expect(() => capturedFactory(undefined, ctx)).toThrow();
    });

    it('should throw when user is undefined in request', () => {
      const ctx = buildMockContext(undefined);

      expect(() => capturedFactory(undefined, ctx)).toThrow();
    });

    it('should return JwtPayload with correct sub value', () => {
      const ctx = buildMockContext({ sub: 'abc-def-ghi' });

      const result = capturedFactory(undefined, ctx);

      expect(result.sub).toBe('abc-def-ghi');
    });

    it('should throw UnauthorizedException when fromDto returns falsy (dead-code guard branch)', () => {
      // fromDto normally throws instead of returning falsy, so we mock it to cover line 15
      jest.spyOn(JwtPayload, 'fromDto').mockReturnValueOnce(null);
      const ctx = buildMockContext({ sub: 'user-123' });

      expect(() => capturedFactory(undefined, ctx)).toThrow(
        UnauthorizedException,
      );
    });
  });
});
