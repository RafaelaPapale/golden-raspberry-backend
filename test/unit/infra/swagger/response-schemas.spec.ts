import {
  ResponseSchemas,
  getDefaultResponseSchema,
} from 'src/infra/swagger/response-schemas';

describe('ResponseSchemas', () => {
  describe('success schema', () => {
    it('should be defined', () => {
      expect(ResponseSchemas.success).toBeDefined();
    });

    it('should have type object', () => {
      expect(ResponseSchemas.success.type).toBe('object');
    });

    it('should have statusCode, mensagem and dados properties', () => {
      expect(ResponseSchemas.success.properties.statusCode).toBeDefined();
      expect(ResponseSchemas.success.properties.mensagem).toBeDefined();
      expect(ResponseSchemas.success.properties.dados).toBeDefined();
    });

    it('should require statusCode and mensagem', () => {
      expect(ResponseSchemas.success.required).toContain('statusCode');
      expect(ResponseSchemas.success.required).toContain('mensagem');
    });
  });

  describe('created schema', () => {
    it('should have statusCode example as 201', () => {
      expect(ResponseSchemas.created.properties.statusCode.example).toBe(201);
    });
  });

  describe('simple schema', () => {
    it('should not have dados property', () => {
      expect((ResponseSchemas.simple.properties as any).dados).toBeUndefined();
    });
  });

  describe('withArray schema', () => {
    it('should have dados as array type', () => {
      expect(ResponseSchemas.withArray.properties.dados.type).toBe('array');
    });

    it('should have pagination fields', () => {
      const props = ResponseSchemas.withArray.properties as any;
      expect(props.pagina).toBeDefined();
      expect(props.tamanho).toBeDefined();
      expect(props.totalItens).toBeDefined();
      expect(props.totalPaginas).toBeDefined();
      expect(props.tamanhoDados).toBeDefined();
    });
  });

  describe('noContent schema', () => {
    it('should have statusCode example as 204', () => {
      expect(ResponseSchemas.noContent.properties.statusCode.example).toBe(204);
    });
  });
});

describe('getDefaultResponseSchema', () => {
  it('should return created schema for status 201', () => {
    const schema = getDefaultResponseSchema(201);
    expect(schema).toBe(ResponseSchemas.created);
  });

  it('should return noContent schema for status 204', () => {
    const schema = getDefaultResponseSchema(204);
    expect(schema).toBe(ResponseSchemas.noContent);
  });

  it('should return success schema for status 200', () => {
    const schema = getDefaultResponseSchema(200);
    expect(schema).toBe(ResponseSchemas.success);
  });

  it('should return success schema as default for unknown status', () => {
    const schema = getDefaultResponseSchema(418);
    expect(schema).toBe(ResponseSchemas.success);
  });
});
