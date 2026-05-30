import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { FilmeModel } from 'src/infra/database/models/premiacoes/filme.model';

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'better-sqlite3',
    database: ':memory:',
    entities: [FilmeModel],
    synchronize: true,
  }),
);
