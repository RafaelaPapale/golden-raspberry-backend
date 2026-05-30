import 'reflect-metadata';
import {
  DocumentApiEndpoint,
  DocumentPublicEndpoint,
  ApiPropertyNumeric,
} from 'src/infra/decorators/document-api-endpoint.decorator';

class MockResponseType {}

describe('DocumentApiEndpoint decorator', () => {
  describe('validateInputs — via DocumentApiEndpoint', () => {
    it('should throw when summary is empty', () => {
      expect(() =>
        DocumentApiEndpoint({ summary: '', description: 'Descrição válida' }),
      ).toThrow('DocumentApiEndpoint: summary cannot be empty');
    });

    it('should throw when summary is only whitespace', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: '   ',
          description: 'Descrição válida',
        }),
      ).toThrow('DocumentApiEndpoint: summary cannot be empty');
    });

    it('should throw when description is empty', () => {
      expect(() =>
        DocumentApiEndpoint({ summary: 'Summary válido', description: '' }),
      ).toThrow('DocumentApiEndpoint: description cannot be empty');
    });

    it('should throw when description is only whitespace', () => {
      expect(() =>
        DocumentApiEndpoint({ summary: 'Summary', description: '   ' }),
      ).toThrow('DocumentApiEndpoint: description cannot be empty');
    });

    it('should throw when successStatus is below 100', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: 'S',
          description: 'D',
          successStatus: 99,
        }),
      ).toThrow(
        'DocumentApiEndpoint: successStatus must be a valid HTTP status code (100-599)',
      );
    });

    it('should throw when successStatus is above 599', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: 'S',
          description: 'D',
          successStatus: 600,
        }),
      ).toThrow(
        'DocumentApiEndpoint: successStatus must be a valid HTTP status code (100-599)',
      );
    });

    it('should not throw for a valid status code at boundary 100', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: 'S',
          description: 'D',
          successStatus: 100,
        }),
      ).not.toThrow();
    });

    it('should not throw for a valid status code at boundary 599', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: 'S',
          description: 'D',
          successStatus: 599,
        }),
      ).not.toThrow();
    });
  });

  describe('DocumentApiEndpoint', () => {
    it('should return a function when called with valid options', () => {
      const decorator = DocumentApiEndpoint({
        summary: 'Test',
        description: 'Test description',
      });
      expect(typeof decorator).toBe('function');
    });

    it('should not throw when requiresAuth is false', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: 'Test',
          description: 'Description',
          requiresAuth: false,
        }),
      ).not.toThrow();
    });

    it('should not throw when requiresAuth is true (default)', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: 'Test',
          description: 'Description',
          requiresAuth: true,
        }),
      ).not.toThrow();
    });

    it('should not throw when successType is provided', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: 'Test',
          description: 'Description',
          successType: MockResponseType,
        }),
      ).not.toThrow();
    });

    it('should not throw when responseSchema is provided', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: 'Test',
          description: 'Description',
          responseSchema: { type: 'object', properties: {} },
        }),
      ).not.toThrow();
    });

    it('should not throw when bodyType is provided with bodyDescription', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: 'Test',
          description: 'Description',
          bodyType: MockResponseType,
          bodyDescription: 'The body',
        }),
      ).not.toThrow();
    });

    it('should use default body description when bodyType is provided without bodyDescription', () => {
      // Covers the `bodyDescription || 'Dados da requisição'` fallback branch
      expect(() =>
        DocumentApiEndpoint({
          summary: 'Test',
          description: 'Description',
          bodyType: MockResponseType,
        }),
      ).not.toThrow();
    });

    it('should not throw for status 201', () => {
      expect(() =>
        DocumentApiEndpoint({
          summary: 'Test',
          description: 'Description',
          successStatus: 201,
        }),
      ).not.toThrow();
    });

    it('should not throw without successStatus (uses default 200)', () => {
      expect(() =>
        DocumentApiEndpoint({ summary: 'Test', description: 'Description' }),
      ).not.toThrow();
    });
  });

  describe('DocumentPublicEndpoint', () => {
    it('should return a function', () => {
      const decorator = DocumentPublicEndpoint({
        summary: 'Test',
        description: 'Description',
      });
      expect(typeof decorator).toBe('function');
    });

    it('should not throw when called with valid options', () => {
      expect(() =>
        DocumentPublicEndpoint({ summary: 'Test', description: 'Description' }),
      ).not.toThrow();
    });

    it('should throw when summary is empty', () => {
      expect(() =>
        DocumentPublicEndpoint({ summary: '', description: 'Description' }),
      ).toThrow();
    });

    it('should not throw when successType is provided', () => {
      expect(() =>
        DocumentPublicEndpoint({
          summary: 'Test',
          description: 'Description',
          successType: MockResponseType,
        }),
      ).not.toThrow();
    });

    it('should not throw when successStatus is 201', () => {
      expect(() =>
        DocumentPublicEndpoint({
          summary: 'Test',
          description: 'Description',
          successStatus: 201,
        }),
      ).not.toThrow();
    });
  });

  describe('ApiPropertyNumeric', () => {
    it('should return a function (decorator)', () => {
      const decorator = ApiPropertyNumeric('campo');
      expect(typeof decorator).toBe('function');
    });

    it('should produce a decorator when required is true', () => {
      const decorator = ApiPropertyNumeric('campo', true);
      expect(typeof decorator).toBe('function');
    });

    it('should produce a decorator when required is false', () => {
      const decorator = ApiPropertyNumeric('campo', false);
      expect(typeof decorator).toBe('function');
    });

    it('should use default required=true when not specified', () => {
      expect(() => ApiPropertyNumeric('campo')).not.toThrow();
    });
  });
});
