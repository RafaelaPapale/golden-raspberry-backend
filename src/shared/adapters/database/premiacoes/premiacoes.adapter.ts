import { Filme } from 'src/shared/domain/entities/database/premiacoes/filme.entity';

export interface IPremiacoesRepository {
  contarRegistros(): Promise<number>;
  criarEmLote(filmes: Filme[]): Promise<void>;
  listarVencedores(): Promise<Filme[]>;
}
