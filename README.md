# Golden Raspberry Awards — Backend API

API RESTful para leitura da lista de indicados e vencedores da categoria **Pior Filme** do Golden Raspberry Awards, com cálculo dos produtores com menor e maior intervalo entre vitórias consecutivas.

---

## Visão Geral

O sistema é uma API REST desenvolvida em NestJS que processa os dados históricos de vencedores do Golden Raspberry Awards (Framboesa de Ouro). A principal funcionalidade é a exposição de um endpoint que identifica os produtores com o menor e o maior intervalo de anos entre duas vitórias consecutivas na categoria Pior Filme.

Os dados são carregados automaticamente do arquivo CSV incluso no repositório durante a inicialização da aplicação. O banco de dados é SQLite em memória — sem dependências externas de infraestrutura para execução local ou em pipelines de teste.

---

## Objetivo do Projeto

Este projeto implementa um desafio técnico de backend. O requisito central é:

> Desenvolver uma API RESTful capaz de ler o arquivo de lista de filmes indicados e vencedores da categoria Pior Filme do Golden Raspberry Awards e possibilitar a consulta para obter o produtor com o maior intervalo entre dois prêmios consecutivos e o produtor que obteve dois prêmios mais rápido (menor intervalo entre duas vitórias consecutivas).

O endpoint deve retornar todos os produtores empatados no menor e no maior intervalo.

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

---

## Arquitetura

O projeto adota uma **arquitetura limpa com separação explícita de responsabilidades**, organizada em camadas inspiradas nos princípios de Clean Architecture e Domain-Driven Design.

```
Controllers (Presentation)
    → Use Cases (Application)
        → IPremiacoesRepository (Domain Interface)
            ← PremiacoesRepository (Infra)
                → TypeORM + SQLite in-memory
```

| Camada | Responsabilidade | Localização |
|---|---|---|
| Presentation | Controllers HTTP, DTOs, Swagger | `src/application/*/interfaces/` |
| Application | Use Cases, Entidades de domínio | `src/application/*/use-cases/`, `src/application/*/domain/` |
| Domain | Interfaces e contratos compartilhados | `src/shared/` |
| Infra | TypeORM, Mappers, Repositories, Auth, CSV | `src/infra/` |
| Config | Configurações de banco e logger | `src/config/` |

Toda a documentação arquitetural detalhada está em [docs/arquitetura-oficial/ARQUITETURA.md](docs/arquitetura-oficial/ARQUITETURA.md).

---

## Tecnologias Utilizadas

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 20+ | Runtime |
| TypeScript | ~5.7 | Linguagem |
| NestJS | 11 | Framework |
| TypeORM | 1.0 | ORM |
| better-sqlite3 | 12 | Driver SQLite in-memory |
| class-validator | 0.15 | Validação de DTOs |
| class-transformer | 0.5 | Transformação de tipos |
| nestjs-pino | 4 | Logging estruturado |
| pino | 10 | Logger |
| @nestjs/swagger | 11 | Documentação OpenAPI |
| passport-jwt | 4 | Estratégia de autenticação JWT |
| Jest | 30 | Framework de testes |
| Supertest | 7 | Testes HTTP de integração |
| ts-jest | 29 | Compilador TypeScript para Jest |

---

## Estrutura de Pastas

```
src/
├── application/
│   ├── health/
│   │   └── health.controller.ts           # Endpoint GET /health-check
│   └── premiacoes/
│       ├── premiacoes.module.ts            # Módulo NestJS da feature
│       ├── domain/entities/output/        # Entidades de domínio (ProdutorIntervalo, ResultadoIntervalos)
│       ├── interfaces/
│       │   ├── controllers/               # PremiacoesController
│       │   └── dtos/output/               # DTOs de resposta com anotações Swagger
│       └── use-cases/                     # BuscarIntervalosPremiosUseCase
│
├── config/
│   ├── database/                          # Configuração TypeORM (better-sqlite3 in-memory)
│   └── logger/                            # Configuração nestjs-pino
│
├── infra/
│   ├── auth/                              # JwtAuthGuard, JwtStrategy, @Public()
│   ├── database/
│   │   ├── loaders/                       # CsvImportLoader (OnApplicationBootstrap)
│   │   ├── mappers/                       # FilmeMapper (Model ↔ Entity)
│   │   ├── models/                        # FilmeModel (TypeORM Entity)
│   │   └── repository/                    # PremiacoesRepository
│   ├── decorators/                        # DocumentApiEndpoint, @JwtExport
│   ├── services/                          # CsvReaderService
│   └── swagger/                           # ResponseSchemas (schemas OpenAPI)
│
├── modules/
│   ├── app.module.ts                      # Módulo raiz
│   ├── auth.module.ts                     # Módulo JWT + Passport
│   ├── database.module.ts                 # Módulo TypeORM
│   └── logger.module.ts                   # Módulo nestjs-pino
│
├── shared/
│   ├── adapters/database/premiacoes/      # IPremiacoesRepository (interface)
│   ├── application/                       # SharedModule
│   └── domain/entities/                   # Filme, JwtPayload, Resposta<T>
│
└── main.ts                                # Bootstrap da aplicação

test/
├── integrations/
│   ├── factories/                         # FilmeFactory (builder de entidades)
│   ├── fixtures/                          # filmeFixtures (datasets determinísticos)
│   ├── helpers/                           # DatabaseHelper (acesso direto ao banco)
│   ├── setup/                             # createIntegrationApp, createIntegrationModule
│   └── specs/                             # Suítes de integração
└── unit/
    ├── helpers/                           # MockRepositoryBuilderPremiacoes
    └── ...                                # Suítes unitárias espelhando src/

docs/
├── arquitetura-oficial/
│   └── ARQUITETURA.md                     # Documento arquitetural completo
├── testes/
│   ├── testes-unitarios.md                # Documentação de testes unitários
│   └── testes-integracao.md               # Documentação de testes de integração
└── Movielist.csv                          # Dataset fonte (Golden Raspberry Awards)
```

---

## Como Executar

### Pré-requisitos

- Node.js 20 ou superior
- npm 10 ou superior

### Instalação

```bash
npm install
```

### Configuração

A variável `JWT_SECRET_KEY` é obrigatória — usada pela `JwtStrategy` para validar tokens e pelo `JwtModule` para assinar futuros tokens de login:

```
JWT_SECRET_KEY=seu-segredo-aqui
```

A variável `ENVIRONMENT` controla a política de CORS:
- `local` ou `development` (comportamento padrão): aceita qualquer origem
- Outros valores: restringe origens ao sufixo `.golden-raspberry.com.br`

### Execução local

```bash
npm run start
```

A aplicação iniciará na porta `3000`. A documentação Swagger estará disponível em `http://localhost:3000/api-docs`.

### Modo desenvolvimento (watch)

```bash
npm run start:dev
```

Reinicia automaticamente ao salvar arquivos.

### Via Docker

```bash
docker build -t golden-raspberry-backend .
docker run -p 3000:3000 golden-raspberry-backend
```

---

## Scripts Disponíveis

| Script | Comando | Descrição |
|---|---|---|
| `build` | `nest build` | Compila o projeto TypeScript para `dist/` |
| `format` | `prettier --write` | Formata os arquivos em `src/` e `test/` |
| `start` | `nest start` | Inicia a aplicação |
| `start:dev` | `nest start --watch` | Inicia em modo watch (desenvolvimento) |
| `start:debug` | `nest start --debug --watch` | Inicia em modo debug com watch |
| `start:prod` | `node dist/main` | Executa o build compilado diretamente |
| `lint` | `eslint --fix` | Analisa e corrige problemas de lint |
| `test` | `jest` | Executa todos os testes |
| `test:watch` | `jest --watch` | Executa testes em modo watch |
| `test:cov` | `jest --coverage` | Executa testes com relatório de cobertura |
| `test:debug` | `node --inspect-brk jest --runInBand` | Executa testes em modo debug |
| `test:e2e` | `jest --config ./test/jest-e2e.json` | Executa testes e2e (configuração separada) |

---

## Banco de Dados

O sistema utiliza **SQLite em memória** via TypeORM com o driver `better-sqlite3`.

### Como funciona

- O banco é criado em memória a cada inicialização do processo (`database: ':memory:'`)
- O schema é sincronizado automaticamente (`synchronize: true`) com base na entidade `FilmeModel`
- Os dados não são persistidos entre reinicializações do processo

### Tabela criada

```sql
CREATE TABLE filmes (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  year     INTEGER NOT NULL,
  title    VARCHAR NOT NULL,
  studios  VARCHAR NOT NULL,
  producer VARCHAR NOT NULL,
  winner   BOOLEAN NOT NULL DEFAULT FALSE
);
```

### Como popular

Os dados são carregados automaticamente na inicialização via `CsvImportLoader`. O processo:

1. Verifica se o banco já contém registros (`contarRegistros()`)
2. Se vazio, lê `docs/Movielist.csv`
3. Faz o parse das colunas separadas por `;`: `year;title;studios;producer;winner`
4. Expande produtores múltiplos (separados por `,` ou `and`) em um registro por produtor
5. Persiste todos os registros via `criarEmLote()`

A importação é **idempotente**: se o banco já tiver dados, a carga não é executada novamente.

### Como limpar

Como o banco é em memória, ele é zerado automaticamente ao reiniciar o processo. Em testes de integração, `DatabaseHelper.clearFilmes()` limpa a tabela entre testes.

---

## Testes

### Executar todos os testes

```bash
npm test
```

### Executar com relatório de cobertura

```bash
npm run test:cov
```

O relatório HTML é gerado em `coverage/lcov-report/index.html`.

### Modo watch

```bash
npm run test:watch
```

### Diferença entre os tipos de teste

| Tipo | Localização | Estratégia |
|---|---|---|
| **Unitários** | `test/unit/` | Cada classe é testada de forma isolada com mocks. Sem banco real, sem NestJS app. |
| **Integração** | `test/integrations/` | Banco SQLite real em memória. Dois modos: módulo sem HTTP (repositório e use case) e app completo com HTTP (endpoints via Supertest). |

Para documentação detalhada:
- [Testes Unitários](docs/testes/testes-unitarios.md)
- [Testes de Integração](docs/testes/testes-integracao.md)

---

## Cobertura

Thresholds mínimos configurados no `package.json`:

| Métrica | Threshold mínimo | Obtido |
|---|---|---|
| Statements | 80% | ~100% |
| Lines | 80% | ~100% |
| Functions | 70% | 100% |
| Branches | 70% | ~97% |

Arquivos excluídos da medição de cobertura:
- `*.module.ts` — composição NestJS sem lógica
- `*.repository.ts` — cobertos pelos testes de integração
- `*.guard.ts`, `*.config.ts`, `*.provider.ts` — configuração de infraestrutura
- `src/infra/database/models/**` — modelos TypeORM decorados
- `src/main.ts` — entrypoint

---

## Decisões Arquiteturais

| Decisão | Justificativa |
|---|---|
| SQLite in-memory via better-sqlite3 | Sem dependências externas; banco autossuficiente; inicialização instantânea para testes |
| TypeORM com `synchronize: true` | Adequado para banco em memória com schema derivado de entidade única |
| Injeção de repositório por token de string | Desacopla o use case da implementação concreta de infra |
| Entidade de domínio separada do model TypeORM | Use case opera sobre POJOs sem decorators de framework; substituição de banco não toca no use case |
| `CsvImportLoader` com `OnApplicationBootstrap` | Garante carga dos dados após todos os módulos estarem prontos |
| Verificação de banco vazio antes da importação | Garante idempotência; reinicializações parciais não duplicam dados |
| Expansão de produtores múltiplos no CSV | Um registro por produtor permite análise individual de intervalos |
| Decorator `DocumentApiEndpoint` composto | Padroniza documentação Swagger; ponto único para respostas padrão (400, 500) |
| `JwtAuthGuard` global via `APP_GUARD` + `@Public()` opt-out | Proteção automática de novos endpoints; endpoints públicos explicitamente marcados |

Para detalhes e trade-offs de cada decisão, consulte [ARQUITETURA.md — Decisões Arquiteturais](docs/arquitetura-oficial/ARQUITETURA.md#decisões-arquiteturais).

---

## Endpoint

### `GET /v1/premiacoes/intervalos`

Retorna os produtores com menor e maior intervalo entre vitórias consecutivas na categoria Pior Filme.

**Autenticação:** Não requerida.

**Exemplo de resposta (200):**

```json
{
  "min": [
    {
      "producer": "Joel Silver",
      "interval": 1,
      "previousWin": 1990,
      "followingWin": 1991
    }
  ],
  "max": [
    {
      "producer": "Matthew Vaughn",
      "interval": 13,
      "previousWin": 2002,
      "followingWin": 2015
    }
  ]
}
```

Quando múltiplos produtores empatam no menor ou maior intervalo, todos são retornados no respectivo array.

### `GET /health-check`

Verifica o status da aplicação.

**Autenticação:** Não requerida.

**Exemplo de resposta (200):**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "golden-raspberry-backend"
}
```

### Swagger

Documentação interativa disponível em `http://localhost:3000/api-docs` com a aplicação em execução.

---

## Troubleshooting

**`JWT_SECRET_KEY is not defined` ao iniciar**
Defina a variável antes de iniciar: `JWT_SECRET_KEY=qualquer-valor npm run start`

**Arquivo CSV não encontrado na inicialização**
O loader usa `process.cwd()` para resolver o caminho `docs/Movielist.csv`. Execute sempre a partir da raiz do projeto.

**Banco de dados vazio após reinicialização**
Comportamento esperado — o banco é em memória e recriado a cada inicialização. O CSV é reimportado automaticamente.

**Caminhos `src/` não resolvidos no IDE**
Verificar se o IDE está usando o `tsconfig.json` com o alias `"src/*": ["./src/*"]` configurado.

---

## Melhorias Futuras

- **Endpoint de login:** Criar módulo `AutenticacaoModule` com endpoint que receba credenciais, valide o usuário e retorne um token JWT assinado via `JwtService`.
- **Banco persistente:** Alterar `databaseConfig` para SQLite em disco ou PostgreSQL; substituir `synchronize: true` por migrations TypeORM.
- **Cache de resultado:** O endpoint de intervalos é determinístico; um cache em memória com TTL eliminaria queries repetidas ao banco.
- **Correlation ID:** Adicionar identificador por requisição HTTP propagado nos logs para rastreabilidade.
- **Versionamento nativo:** Ativar `enableVersioning()` no `main.ts` para suporte formal a múltiplas versões de API.
