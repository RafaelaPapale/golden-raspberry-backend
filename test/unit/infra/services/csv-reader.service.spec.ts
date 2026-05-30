import { CsvReaderService } from 'src/infra/services/csv-reader.service';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import { readFile } from 'fs/promises';

const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('CsvReaderService', () => {
  let service: CsvReaderService;

  beforeEach(() => {
    service = new CsvReaderService();
  });

  describe('parsearProdutores', () => {
    it('should return a single producer when no separator is present', () => {
      expect(service.parsearProdutores('Joel Silver')).toEqual(['Joel Silver']);
    });

    it('should split producers separated by comma and space', () => {
      expect(service.parsearProdutores('Joel Silver, Richard Donner')).toEqual([
        'Joel Silver',
        'Richard Donner',
      ]);
    });

    it('should split producers separated by " and "', () => {
      expect(
        service.parsearProdutores('Joel Silver and Richard Donner'),
      ).toEqual(['Joel Silver', 'Richard Donner']);
    });

    it('should split producers with comma without space', () => {
      expect(service.parsearProdutores('Joel Silver,Richard Donner')).toEqual([
        'Joel Silver',
        'Richard Donner',
      ]);
    });

    it('should handle mixed separators (comma and and)', () => {
      expect(service.parsearProdutores('A, B and C')).toEqual(['A', 'B', 'C']);
    });

    it('should trim whitespace from each producer', () => {
      expect(service.parsearProdutores('  Joel Silver  ')).toEqual([
        'Joel Silver',
      ]);
    });

    it('should filter out empty strings after splitting', () => {
      const result = service.parsearProdutores('Joel Silver');
      expect(result.every((p) => p.length > 0)).toBe(true);
    });

    it('should split by comma when "and" follows a comma (comma takes precedence)', () => {
      // Regex /,\s*|\s+and\s+/ — the comma at "B, and C" is consumed first,
      // leaving "and C" as the final token (no leading space for \s+and\s+ to match)
      const result = service.parsearProdutores('A, B, and C');
      expect(result).toEqual(['A', 'B', 'and C']);
    });
  });

  describe('lerArquivo', () => {
    const csvContent = [
      'year;title;studios;producer;winner',
      "1980;Can't Stop the Music;AFD;Allan Carr;yes",
      '1980;Cruising;Lorimar;Jerry Weintraub;',
      '1981;Mommie Dearest;Paramount;Frank Yablans;yes',
    ].join('\n');

    beforeEach(() => {
      mockReadFile.mockResolvedValue(csvContent);
    });

    it('should return an array of CsvFilmeRow', async () => {
      const result = await service.lerArquivo('/fake/path.csv');
      expect(Array.isArray(result)).toBe(true);
    });

    it('should skip the header line', async () => {
      const result = await service.lerArquivo('/fake/path.csv');
      expect(result.some((r) => r.title === 'year')).toBe(false);
    });

    it('should parse year as a number', async () => {
      const result = await service.lerArquivo('/fake/path.csv');
      expect(typeof result[0].year).toBe('number');
      expect(result[0].year).toBe(1980);
    });

    it('should parse winner as true when value is "yes"', async () => {
      const result = await service.lerArquivo('/fake/path.csv');
      const winner = result.find((r) => r.title === "Can't Stop the Music");
      expect(winner.winner).toBe(true);
    });

    it('should parse winner as false when value is not "yes"', async () => {
      const result = await service.lerArquivo('/fake/path.csv');
      const nonWinner = result.find((r) => r.title === 'Cruising');
      expect(nonWinner.winner).toBe(false);
    });

    it('should parse studios and title correctly', async () => {
      const result = await service.lerArquivo('/fake/path.csv');
      const row = result.find((r) => r.title === "Can't Stop the Music");
      expect(row.studios).toBe('AFD');
      expect(row.producer).toBe('Allan Carr');
    });

    it('should expand multiple producers into separate rows', async () => {
      mockReadFile.mockResolvedValue(
        'year;title;studios;producer;winner\n1980;Film A;Studio;Joel Silver and Richard Donner;yes',
      );

      const result = await service.lerArquivo('/fake/path.csv');

      expect(result).toHaveLength(2);
      expect(result[0].producer).toBe('Joel Silver');
      expect(result[1].producer).toBe('Richard Donner');
      expect(result[0].title).toBe('Film A');
      expect(result[1].title).toBe('Film A');
    });

    it('should handle a single line with one producer', async () => {
      mockReadFile.mockResolvedValue(
        'year;title;studios;producer;winner\n2000;Test Film;TestStudio;Single Producer;yes',
      );

      const result = await service.lerArquivo('/fake/path.csv');

      expect(result).toHaveLength(1);
      expect(result[0].producer).toBe('Single Producer');
      expect(result[0].year).toBe(2000);
      expect(result[0].winner).toBe(true);
    });

    it('should call readFile with the given path', async () => {
      const path = '/docs/Movielist.csv';
      await service.lerArquivo(path);
      expect(mockReadFile).toHaveBeenCalledWith(path, 'utf-8');
    });

    it('should return empty array when file has only the header', async () => {
      mockReadFile.mockResolvedValue('year;title;studios;producer;winner');

      const result = await service.lerArquivo('/fake/path.csv');

      expect(result).toEqual([]);
    });

    it('should ignore empty lines in the file', async () => {
      mockReadFile.mockResolvedValue(
        'year;title;studios;producer;winner\n\n1980;Film;Studio;Producer;yes\n',
      );

      const result = await service.lerArquivo('/fake/path.csv');
      expect(result).toHaveLength(1);
    });

    it('should use fallback empty strings when optional fields are missing (optional chaining false branches)', async () => {
      // A line with only the year — partes[1..4] are undefined, triggers all ?. false branches
      mockReadFile.mockResolvedValue(
        'year;title;studios;producer;winner\n1980',
      );

      // parsearProdutores('') returns [] so flatMap produces no rows for this line
      const result = await service.lerArquivo('/fake/path.csv');
      expect(result).toEqual([]);
    });

    it('should default winner to false when winner field is absent from the CSV line', async () => {
      // Line has 4 fields (no winner column) — partes[4] is undefined
      mockReadFile.mockResolvedValue(
        'year;title;studios;producer;winner\n1980;Film;Studio;Producer',
      );

      const result = await service.lerArquivo('/fake/path.csv');
      expect(result).toHaveLength(1);
      expect(result[0].winner).toBe(false);
    });
  });
});
