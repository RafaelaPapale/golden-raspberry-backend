import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';

export interface CsvFilmeRow {
  year: number;
  title: string;
  studios: string;
  producer: string;
  winner: boolean;
}

@Injectable()
export class CsvReaderService {
  parsearProdutores(produtores: string): string[] {
    return produtores
      .split(/,\s*|\s+and\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  async lerArquivo(caminhoArquivo: string): Promise<CsvFilmeRow[]> {
    const conteudo = await readFile(caminhoArquivo, 'utf-8');
    const linhas = conteudo
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const [, ...linhasDados] = linhas;

    return linhasDados.flatMap((linha) => {
      const partes = linha.split(';');
      const year = parseInt(partes[0]?.trim() ?? '0', 10);
      const title = partes[1]?.trim() ?? '';
      const studios = partes[2]?.trim() ?? '';
      const produtoresRaw = partes[3]?.trim() ?? '';
      const winnerRaw = partes[4]?.trim()?.toLowerCase() ?? '';
      const winner = winnerRaw === 'yes';

      const produtores = this.parsearProdutores(produtoresRaw);

      return produtores.map((producer) => ({
        year,
        title,
        studios,
        producer,
        winner,
      }));
    });
  }
}
