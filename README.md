# Golden Raspberry Awards — Backend API

API RESTful para leitura da lista de indicados e vencedores da categoria **Pior Filme** do Golden Raspberry Awards, com cálculo dos produtores com menor e maior intervalo entre vitórias consecutivas.

---

## Objetivo

Expor um endpoint que retorne:

- O produtor com o **menor intervalo** entre dois prêmios consecutivos
- O produtor com o **maior intervalo** entre dois prêmios consecutivos

Considerando todos os produtores empatados no menor e maior intervalo.

---

## Como executar

```bash
npm install
npm run start
```

A aplicação iniciará na porta `3000` e carregará automaticamente os dados do arquivo `docs/Movielist.csv`.

### Modo desenvolvimento (watch)

```bash
npm run start:dev
```

---

## Endpoint

### `GET /v1/premiacoes/intervalos`

Retorna os produtores com menor e maior intervalo entre vitórias consecutivas.

**Exemplo de resposta:**

```json
{
  "min": [
    {
      "producer": "Producer 1",
      "interval": 1,
      "previousWin": 2008,
      "followingWin": 2009
    }
  ],
  "max": [
    {
      "producer": "Producer 2",
      "interval": 99,
      "previousWin": 1900,
      "followingWin": 1999
    }
  ]
}
```

---

## Documentação Swagger

Disponível em: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

---

## Tecnologias utilizadas

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 20+ | Runtime |
| TypeScript | 5.9 | Linguagem |
| NestJS | 11 | Framework |
| TypeORM | 1.0 | ORM para SQLite |
| SQLite | in-memory | Banco de dados |
| class-validator | 0.15 | Validação de DTOs |
| nestjs-pino | 4 | Logging estruturado |
| Swagger / OpenAPI | 11 | Documentação da API |

---

## Arquitetura

O projeto segue **Clean Architecture** com organização **feature-based** em NestJS.

### Princípio de dependência

```
Controllers (HTTP)
    → Use Cases (negócio)
        → Domain (regras puras)
        ← Infra (implementações via interfaces)
```

### Estrutura de pastas relevante

```
src/
├── application/
│   └── premiacoes/                     ← Módulo de negócio
│       ├── domain/entities/output/     ← Entidades de saída do use case
│       ├── interfaces/
│       │   ├── controllers/            ← Controller HTTP
│       │   └── dtos/output/            ← Contratos da API (Swagger)
│       ├── use-cases/                  ← Lógica de negócio
│       └── premiacoes.module.ts
│
├── infra/
│   ├── database/
│   │   ├── loaders/                    ← Bootstrap: importação do CSV
│   │   ├── mappers/premiacoes/         ← Conversão Model ↔ Entidade
│   │   ├── models/premiacoes/          ← TypeORM Entity (tabela SQLite)
│   │   └── repository/premiacoes/      ← Implementação do repositório
│   └── services/
│       └── csv-reader.service.ts       ← Leitura e parse do CSV
│
├── modules/
│   ├── app.module.ts                   ← Módulo raiz
│   └── premiacoes-database.module.ts   ← TypeORM SQLite in-memory
│
└── shared/
    ├── adapters/database/premiacoes/   ← Interface do repositório (contrato)
    └── domain/entities/database/       ← Entidade de banco (domínio puro)
```

---

## Algoritmo de negócio

1. Ao iniciar, a aplicação verifica se o banco SQLite (in-memory) está vazio
2. Se vazio, lê e faz parse do arquivo `docs/Movielist.csv`
3. Cada linha com múltiplos produtores é expandida em uma linha por produtor
4. Apenas filmes vencedores são considerados para o cálculo
5. Vitórias são agrupadas por produtor e ordenadas por ano
6. Para cada produtor com 2+ vitórias, são calculados todos os intervalos consecutivos
7. O menor e maior intervalo global são identificados
8. Todos os produtores empatados no menor e no maior intervalo são retornados

### Parse de produtores

O campo `producers` do CSV pode conter múltiplos produtores separados por `, ` ou ` and `.

Exemplo: `"Joel Silver, Bob Weinstein and Harvey Weinstein"` → 3 produtores distintos.

---

## Banco de dados

O sistema utiliza **SQLite em memória** (`database: ':memory:'`), configurado via TypeORM. Os dados são carregados automaticamente do CSV no bootstrap da aplicação. Nenhum arquivo de banco é criado em disco e nenhuma configuração externa é necessária.

---

## Docker

### Build e execução

```bash
docker build -t golden-raspberry-backend .
docker run -p 3000:3000 golden-raspberry-backend
```

---

## Decisões técnicas

| Decisão | Justificativa |
|---|---|
| SQLite in-memory | Atende ao requisito de banco embutido sem dependências externas |
| TypeORM | Solicitado explicitamente no desafio |
| Um registro por produtor | Simplifica a query de vencedores e o cálculo de intervalos |
| `OnApplicationBootstrap` | Garante que o banco está pronto antes de carregar o CSV |
| Verificação de banco vazio | Evita duplicação de dados em reinicios |
| Módulo isolado `DatabaseModule` | Separa a configuração TypeORM/SQLite do restante do projeto |
| Resposta sem envelope | O formato exato da spec do desafio é retornado diretamente pelo controller |
