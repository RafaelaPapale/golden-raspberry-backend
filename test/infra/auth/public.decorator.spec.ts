import 'reflect-metadata';
import { IS_PUBLIC_KEY, Public } from 'src/infra/auth/public.decorator';

describe('Public Decorator', () => {
  describe('IS_PUBLIC_KEY', () => {
    it('should equal "isPublic"', () => {
      expect(IS_PUBLIC_KEY).toBe('isPublic');
    });
  });

  describe('Public()', () => {
    it('should return a function (decorator)', () => {
      const decorator = Public();
      expect(typeof decorator).toBe('function');
    });

    it('should set isPublic metadata to true on a class', () => {
      @Public()
      class TestClass {}

      const metadata = Reflect.getMetadata(IS_PUBLIC_KEY, TestClass);
      expect(metadata).toBe(true);
    });

    it('should set isPublic metadata to true on a method descriptor', () => {
      class TestController {
        method() {}
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        TestController.prototype,
        'method',
      );
      Public()(TestController.prototype, 'method', descriptor);

      const metadata = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        TestController.prototype.method,
      );
      expect(metadata).toBe(true);
    });
  });
});
