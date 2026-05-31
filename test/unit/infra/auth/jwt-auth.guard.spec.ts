// Mock @nestjs/passport BEFORE any imports so AuthGuard('jwt') uses a controlled
// base class instead of triggering real Passport/strategy initialization.
jest.mock('@nestjs/passport', () => ({
  AuthGuard: (_strategy: string) => {
    class MockPassportAuthGuard {
      canActivate(_ctx: unknown) {
        return true;
      }
    }
    return MockPassportAuthGuard;
  },
}));

import 'reflect-metadata';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from 'src/infra/auth/jwt-auth.guard';
import { IS_PUBLIC_KEY } from 'src/infra/auth/public.decorator';

const buildContext = (handler = {}, klass = {}): ExecutionContext =>
  ({
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
  }) as unknown as ExecutionContext;

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('deve ser definido', () => {
    expect(guard).toBeDefined();
  });

  it('deve ser instância de JwtAuthGuard', () => {
    expect(guard).toBeInstanceOf(JwtAuthGuard);
  });

  describe('canActivate', () => {
    it('deve retornar true imediatamente para endpoints marcados com @Public()', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const result = guard.canActivate(buildContext());

      expect(result).toBe(true);
    });

    it('deve verificar IS_PUBLIC_KEY no handler e na classe', () => {
      const handler = {};
      const klass = {};
      const spy = jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(true);

      void guard.canActivate(buildContext(handler, klass));

      expect(spy).toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, klass]);
    });

    it('deve delegar para AuthGuard pai quando o endpoint não é público', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const parentSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true as any);

      const ctx = buildContext();
      await guard.canActivate(ctx);

      expect(parentSpy).toHaveBeenCalledWith(ctx);
      parentSpy.mockRestore();
    });

    it('deve propagar o resultado do AuthGuard pai quando não público', async () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      const parentSpy = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(false as any);

      const result = await guard.canActivate(buildContext());

      expect(result).toBe(false);
      parentSpy.mockRestore();
    });

    it('não deve chamar o AuthGuard pai quando isPublic é true', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
      const parentSpy = jest.spyOn(
        Object.getPrototypeOf(JwtAuthGuard.prototype),
        'canActivate',
      );

      void guard.canActivate(buildContext());

      expect(parentSpy).not.toHaveBeenCalled();
      parentSpy.mockRestore();
    });
  });
});
