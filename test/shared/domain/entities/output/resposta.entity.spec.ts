import { Resposta } from 'src/shared/domain/entities/output/resposta.entity';

describe('Resposta Entity', () => {
  it('should be defined', () => {
    const resposta = new Resposta<string>();
    expect(resposta).toBeDefined();
  });

  it('should be an instance of Resposta', () => {
    expect(new Resposta<string>()).toBeInstanceOf(Resposta);
  });

  it('should allow assigning statusCode and mensagem', () => {
    const resposta = Object.assign(new Resposta<number>(), {
      statusCode: 200,
      mensagem: 'SUCESSO',
      dados: 42,
    });

    expect(resposta.statusCode).toBe(200);
    expect(resposta.mensagem).toBe('SUCESSO');
    expect(resposta.dados).toBe(42);
  });

  it('should support generic data type as object', () => {
    const dados = { id: 1, nome: 'Teste' };
    const resposta = Object.assign(new Resposta<typeof dados>(), {
      statusCode: 200,
      mensagem: 'OK',
      dados,
    });

    expect(resposta.dados).toEqual(dados);
  });

  it('should leave optional fields as undefined when not assigned', () => {
    const resposta = new Resposta<string>();
    expect(resposta.tamanhoDados).toBeUndefined();
    expect(resposta.pagina).toBeUndefined();
    expect(resposta.tamanho).toBeUndefined();
    expect(resposta.limite).toBeUndefined();
    expect(resposta.totalPaginas).toBeUndefined();
    expect(resposta.totalItens).toBeUndefined();
    expect(resposta.dados).toBeUndefined();
    expect(resposta.error).toBeUndefined();
  });

  it('should accept all pagination fields', () => {
    const resposta = Object.assign(new Resposta<string[]>(), {
      statusCode: 200,
      mensagem: 'LISTA',
      pagina: 1,
      tamanho: 10,
      limite: 100,
      totalPaginas: 5,
      totalItens: 50,
      tamanhoDados: 10,
      dados: ['a', 'b'],
    });

    expect(resposta.pagina).toBe(1);
    expect(resposta.tamanho).toBe(10);
    expect(resposta.limite).toBe(100);
    expect(resposta.totalPaginas).toBe(5);
    expect(resposta.totalItens).toBe(50);
    expect(resposta.tamanhoDados).toBe(10);
  });

  it('should accept error field', () => {
    const resposta = Object.assign(new Resposta<null>(), {
      statusCode: 500,
      mensagem: 'ERRO',
      error: 'Mensagem de erro',
    });

    expect(resposta.error).toBe('Mensagem de erro');
  });
});
