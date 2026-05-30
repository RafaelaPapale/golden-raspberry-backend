export class MockRepositoryBuilderPremiacoes {
  static buildPremiacoesRepository() {
    return {
      contarRegistros: jest.fn(),
      criarEmLote: jest.fn(),
      listarVencedores: jest.fn(),
    };
  }
}
