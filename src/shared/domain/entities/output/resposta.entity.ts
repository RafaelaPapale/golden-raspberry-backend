export class Resposta<T> {
  statusCode!: number;
  mensagem!: string;
  tamanhoDados?: number;
  pagina?: number;
  tamanho?: number;
  limite?: number;
  totalPaginas?: number;
  totalItens?: number;
  dados?: T;
  error?: string;
}
