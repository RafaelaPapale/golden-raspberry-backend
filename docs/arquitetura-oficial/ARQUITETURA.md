# Arquitetura Oficial

> Documento de referência arquitetural do backend Golden Raspberry Awards.
> Baseado exclusivamente na análise do código-fonte existente em `src/`.

---

## Visão Geral

### Objetivo do sistema

O sistema é uma API REST responsável por processar e expor análises sobre os vencedores do **Golden Raspberry Awards** (Framboesa de Ouro), premiação dedicada aos piores filmes do cinema. A principal funcionalidade entregue é a identificação dos produtores com o **menor e o maior intervalo de anos entre duas vitórias consecutivas** na categoria Pior Filme.

### Problema resolvido

A base de dados dos vencedores do prêmio está disponível em formato CSV. O sistema resolve dois problemas concretos:

1. **Ingestão e persistência** dos dados históricos de premiações a partir de um arquivo CSV estruturado, realizada de forma automática na inicialização da aplicação.
2. **Consulta analítica** que calcula, a partir dos dados persistidos, quais produtores acumularam vitórias com o menor e o maior intervalo entre elas, retornando o resultado de forma estruturada e documentada via API REST.

### Motivação da solução

A solução foi construída sobre NestJS com arquitetura em camadas inspirada nos princípios de Clean Architecture e Domain-Driven Design, favorecendo o isolamento entre responsabilidades, a testabilidade de cada componente em separado e a capacidade de evolução sem impacto cruzado entre camadas. O banco de dados em memória elimina dependências de infraestrutura externa para execução local e em ambientes de teste.

---

## Arquitetura da Aplicação

### Estilo arquitetural

A aplicação adota uma **arquitetura limpa com separação explícita de responsabilidades**, organizada nos seguintes planos verticais:

```
┌──────────────────────────────────────────────────────────┐
│                     Presentation Layer                   │
│            Controllers · DTOs de saída · Swagger         │
├──────────────────────────────────────────────────────────┤
│                    Application Layer                     │
│               Use Cases · Entidades de domínio           │
├──────────────────────────────────────────────────────────┤
│                      Domain Layer                        │
│         Interfaces (Adapters) · Entidades compartilhadas │
├──────────────────────────────────────────────────────────┤
│                  Infrastructure Layer                    │
│     Models TypeORM · Repositories · Mappers · Loaders   │
│          Serviços · Auth · Decorators · Swagger          │
├──────────────────────────────────────────────────────────┤
│                    Configuration Layer                   │
│            Database Config · Logger Config               │
└──────────────────────────────────────────────────────────┘
```

### Separação de responsabilidades

| Camada | Responsabilidade | Localização |
|---|---|---|
| Presentation | Receber requisições HTTP, serializar respostas, documentar endpoints | `src/application/*/interfaces/` |
| Application | Orquestrar lógica de negócio via use cases | `src/application/*/use-cases/` |
| Domain | Definir entidades e contratos sem dependência de framework | `src/application/*/domain/`, `src/shared/domain/` |
| Infra | Implementar persistência, I/O, autenticação e serviços externos | `src/infra/` |
| Config | Centralizar configurações carregadas na inicialização | `src/config/` |

### Fluxo entre camadas

```
HTTP Request
     │
     ▼
Controller (Presentation)
     │  injeta
     ▼
Use Case (Application)
     │  injeta via interface
     ▼
Repository Interface (Domain / Shared Adapters)
     │  implementado por
     ▼
Repository Implementation (Infra)
     │  usa
     ▼
TypeORM Repository + Mapper + FilmeModel (Infra Database)
     │
     ▼
SQLite in-memory (Persistence)
```

### Regras de dependência

As dependências seguem a **Dependency Rule** da Clean Architecture: camadas internas nunca importam camadas externas.

- Controllers dependem de Use Cases.
- Use Cases dependem de interfaces de repositório (definidas em `src/shared/adapters/`), nunca de implementações concretas.
- Repositórios concretos (infra) implementam as interfaces do shared e dependem dos modelos TypeORM.
- O binding entre interface e implementação é feito nos módulos NestJS via token de injeção (`'IPremiacoesRepository'`).
- Entidades de domínio (`src/shared/domain/entities/`) não possuem dependência de nenhuma outra camada.

---

## Estrutura de Diretórios

### `src/application`

**Propósito:** Contém toda a lógica orientada ao domínio de negócio — use cases, entidades de domínio, interfaces de entrada/saída e módulos NestJS de feature.

**Responsabilidades:**
- Definir e executar os casos de uso da aplicação.
- Declarar as entidades de domínio específicas de cada feature.
- Expor os controllers e DTOs que representam a superfície pública da API.
- Registrar os módulos NestJS de cada domínio.

**Dependências permitidas:** `src/shared`, `src/infra` (apenas via token de injeção), `src/modules`.

**Estrutura real encontrada:**

```
src/application/
├── health/
│   └── health.controller.ts          # Endpoint de health check
└── premiacoes/
    ├── premiacoes.module.ts           # Módulo NestJS da feature
    ├── domain/
    │   └── entities/
    │       └── output/
    │           ├── produtor-intervalo.entity.ts
    │           └── resultado-intervalos.entity.ts
    ├── interfaces/
    │   ├── controllers/
    │   │   └── premiacoes.controller.ts
    │   └── dtos/
    │       └── output/
    │           ├── produtor-intervalo.dto.ts
    │           └── resultado-intervalos.dto.ts
    └── use-cases/
        └── buscar-intervalos-premios/
            └── buscar-intervalos-premios.use-case.ts
```

---

### `src/config`

**Propósito:** Centraliza as configurações da aplicação que são carregadas pelo `ConfigModule` do NestJS durante o bootstrap.

**Responsabilidades:**
- Registrar configurações tipadas via `registerAs()`.
- Isolar detalhes de configuração de infraestrutura (banco, logger) do restante da aplicação.

**Dependências permitidas:** Apenas bibliotecas externas (`@nestjs/config`, `typeorm`, `pino`). Nenhuma dependência de código interno do projeto.

**Estrutura real encontrada:**

```
src/config/
├── database/
│   └── database.config.ts    # Configuração TypeORM registrada como 'database'
└── logger/
    └── pino-logger.config.ts # Configuração Pino para nestjs-pino
```

---

### `src/infra`

**Propósito:** Implementa todos os detalhes técnicos de infraestrutura: persistência, serviços de I/O, autenticação, decorators e documentação Swagger.

**Responsabilidades:**
- Implementar os contratos definidos em `src/shared/adapters/`.
- Gerenciar a camada de banco de dados (models TypeORM, mappers, repositories).
- Inicializar dados (loaders com lifecycle hooks NestJS).
- Prover serviços de leitura de arquivos.
- Implementar mecanismos de autenticação JWT.
- Disponibilizar decorators reutilizáveis para controllers.

**Dependências permitidas:** `src/shared`, `src/config`, TypeORM, Passport, Pino.

**Estrutura real encontrada:**

```
src/infra/
├── auth/
│   ├── jwt-auth.guard.ts         # Guard global que verifica JWT ou @Public()
│   ├── jwt.strategy.ts           # Strategy Passport para validação de token
│   ├── jwt-payload.dto.ts        # DTO do payload JWT (campo sub)
│   └── public.decorator.ts       # Decorator @Public() para bypass de autenticação
├── database/
│   ├── loaders/
│   │   └── csv-import.loader.ts  # Loader OnApplicationBootstrap para importação CSV
│   ├── mappers/
│   │   └── premiacoes/
│   │       └── filme.mapper.ts   # Mapeamento FilmeModel ↔ Filme (entidade)
│   ├── models/
│   │   └── premiacoes/
│   │       └── filme.model.ts    # Entidade TypeORM da tabela 'filmes'
│   └── repository/
│       └── premiacoes/
│           └── premiacoes.repository.ts  # Implementação de IPremiacoesRepository
├── decorators/
│   ├── document-api-endpoint.decorator.ts  # Decorator composto para documentação Swagger
│   └── jwt.decorator.ts                    # Param decorator @JwtExport para injetar payload
├── services/
│   └── csv-reader.service.ts               # Leitura e parse de arquivos CSV
└── swagger/
    └── response-schemas.ts                 # Schemas OpenAPI para respostas padronizadas
```

---

### `src/modules`

**Propósito:** Declara os módulos NestJS de infraestrutura transversal que são importados pelo `AppModule` e disponibilizados globalmente ou como dependências de outros módulos.

**Responsabilidades:**
- Configurar e exportar o módulo de banco de dados.
- Configurar e exportar o módulo de logging.
- Configurar e exportar o módulo de autenticação.
- Compor o módulo raiz da aplicação (`AppModule`).

**Dependências permitidas:** `src/config`, `src/application`, bibliotecas externas.

**Estrutura real encontrada:**

```
src/modules/
├── app.module.ts        # Módulo raiz — ponto de composição de toda a aplicação
├── auth.module.ts       # Módulo JWT + Passport
├── database.module.ts   # Módulo TypeORM com inicialização assíncrona
└── logger.module.ts     # Módulo nestjs-pino
```

---

### `src/shared`

**Propósito:** Contém contratos, entidades e componentes utilizados por múltiplas camadas, sem pertencer a nenhum módulo de feature específico.

**Responsabilidades:**
- Definir interfaces de repositório (adapters) que desacoplam use cases de implementações de infra.
- Prover entidades de domínio compartilhadas (ex: `Filme`, `JwtPayload`, `Resposta<T>`).
- Expor módulo compartilhado para importação entre features.

**Dependências permitidas:** Nenhuma dependência de código interno fora do próprio `shared`. Apenas TypeScript nativo e tipos externos quando estritamente necessário.

**Estrutura real encontrada:**

```
src/shared/
├── adapters/
│   └── database/
│       └── premiacoes/
│           └── premiacoes.adapter.ts   # Interface IPremiacoesRepository
├── application/
│   └── shared.module.ts                # Módulo NestJS compartilhado
└── domain/
    └── entities/
        ├── database/
        │   └── premiacoes/
        │       └── filme.entity.ts     # Entidade Filme (domínio)
        ├── input/
        │   └── jwt-payload.entity.ts   # Entidade JwtPayload (domínio)
        └── output/
            └── resposta.entity.ts      # Envelope genérico Resposta<T>
```

---

## Fluxo de Inicialização

A sequência de inicialização completa da aplicação, desde a execução do processo Node.js até o servidor estar pronto para receber requisições:

### 1. Ponto de entrada — `src/main.ts`

O arquivo `main.ts` é o entrypoint do processo. Ele executa a função `bootstrap()` assíncrona, responsável por:

```
node dist/main.js
      │
      ▼
bootstrap()
      │
      ├── NestFactory.create(AppModule)   ← instancia o container IoC
      ├── app.use(cookieParser())          ← middleware de cookies
      ├── app.use(express.json())          ← parsing de body JSON
      ├── app.use(express.urlencoded())    ← parsing de body URL-encoded
      ├── server.set('query parser', 'extended')  ← parser de query string
      ├── app.useGlobalPipes(ValidationPipe)       ← validação e transformação globais
      ├── app.enableCors(originFn)         ← CORS com lógica por ambiente
      ├── SwaggerModule.setup('api-docs')  ← documentação OpenAPI em /api-docs
      └── app.listen(PORT ?? 3000)         ← servidor escutando
```

### 2. Configuração do `ValidationPipe`

O pipe global é registrado com:
- `whitelist: true` — remove propriedades não declaradas nos DTOs
- `forbidNonWhitelisted: true` — rejeita requisições com propriedades extras
- `transform: true` — transforma automaticamente tipos primitivos
- `enableImplicitConversion: true` — converte strings de query para tipos nativos

### 3. Política de CORS

A lógica de CORS em `main.ts` aplica regras por ambiente via variável `ENVIRONMENT`:

| Ambiente | Política |
|---|---|
| `local` ou `development` | Permite qualquer origem |
| Ausente (`undefined`) | Permite requisições sem `Origin` (ex: Postman, curl) |
| Produção | Permite apenas origens com sufixo `.golden-raspberry.com.br` |

### 4. Carregamento do `AppModule`

O NestJS processa `AppModule` e importa seus módulos na seguinte ordem:

```
AppModule
  ├── ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] })
  │       └── registra 'database' no ConfigService
  ├── PinoLoggerModule
  │       └── LoggerModule.forRoot(pinoLoggerConfig) → logger global
  ├── DatabaseModule
  │       └── TypeOrmModule.forRootAsync() → inicializa conexão SQLite in-memory
  ├── ScheduleModule.forRoot()  → inicializa scheduler de tarefas
  └── PremiacoesModule
          ├── TypeOrmModule.forFeature([FilmeModel]) → registra repositório TypeORM
          ├── providers: PremiacoesRepository, FilmeMapper, BuscarIntervalosPremiosUseCase,
          │             CsvReaderService, CsvImportLoader
          └── controllers: PremiacoesController
```

### 5. Inicialização do banco de dados

O `DatabaseModule` usa `TypeOrmModule.forRootAsync()`, que aguarda o `ConfigService` estar disponível antes de criar a conexão. A configuração resolvida é:

```typescript
{
  type: 'better-sqlite3',
  database: ':memory:',
  entities: [FilmeModel],
  synchronize: true,
}
```

Com `synchronize: true`, o schema da tabela `filmes` é criado automaticamente com base na definição do `FilmeModel`, sem necessidade de migrations.

### 6. Carregamento dos dados iniciais — `CsvImportLoader`

Após todos os módulos serem inicializados, o NestJS dispara o lifecycle hook `OnApplicationBootstrap`. O `CsvImportLoader` implementa esse hook e executa:

```
onApplicationBootstrap()
      │
      ├── repository.contarRegistros()     ← verifica se banco já tem dados
      │       ├── total > 0 → loga "banco já populado" e retorna (idempotente)
      │       └── total == 0 → prossegue com importação
      │
      ├── CsvReaderService.lerArquivo('docs/Movielist.csv')
      │       ├── lê o arquivo com fs/promises.readFile
      │       ├── divide por linhas (ignora header)
      │       ├── parseia colunas: year;title;studios;producer;winner
      │       └── expande produtores múltiplos ("Joel Silver, and Richard Donner")
      │               → gera um registro por produtor
      │
      ├── cria instâncias de Filme[] a partir das linhas parseadas
      │
      └── repository.criarEmLote(filmes[])  ← persiste todos os registros em lote
```

A importação é **idempotente**: se o banco já tiver registros, o loader não executa a carga novamente. Isso garante que reinicializações do módulo em ambiente de teste não causem duplicatas.

---

## Camada Application

### Health

**Arquivo:** `src/application/health/health.controller.ts`

Controller registrado diretamente no `AppModule`. Não possui use case dedicado — retorna um objeto estático diretamente:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "golden-raspberry-backend"
}
```

Decorado com `@Public()`, não exige autenticação.

---

### Premiacoes

#### Use Case: `BuscarIntervalosPremiosUseCase`

**Arquivo:** `src/application/premiacoes/use-cases/buscar-intervalos-premios/buscar-intervalos-premios.use-case.ts`

Único use case da aplicação. Responsável por calcular os intervalos entre vitórias consecutivas de cada produtor e identificar os produtores com menor e maior intervalo.

**Algoritmo implementado:**

```
executar()
  │
  ├── repo.listarVencedores()
  │       └── retorna todos os Filme[] onde winner = true
  │
  ├── agrupa filmes por produtor
  │       └── Map<string, number[]> → { "Joel Silver": [1980, 1995, 2000] }
  │
  ├── para cada produtor com >= 2 vitórias:
  │       ├── ordena anos em ordem crescente
  │       └── calcula intervalo entre anos consecutivos
  │               → ProdutorIntervalo { producer, interval, previousWin, followingWin }
  │
  ├── encontra menorIntervalo = Math.min(...todos os intervalos)
  ├── encontra maiorIntervalo = Math.max(...todos os intervalos)
  │
  └── retorna ResultadoIntervalos {
        min: ProdutorIntervalo[] (todos com interval == menorIntervalo),
        max: ProdutorIntervalo[] (todos com interval == maiorIntervalo)
      }
```

O use case injeta `IPremiacoesRepository` via token `'IPremiacoesRepository'` — nunca depende da implementação concreta `PremiacoesRepository`.

Retorna `Resposta<ResultadoIntervalos>` com `statusCode: 200` e `mensagem: 'INTERVALOS_ENCONTRADOS'`.

#### Entidades de domínio (feature-specific)

**`ProdutorIntervalo`** — `src/application/premiacoes/domain/entities/output/produtor-intervalo.entity.ts`

Representa um intervalo calculado entre duas vitórias consecutivas de um produtor:

| Campo | Tipo | Descrição |
|---|---|---|
| `producer` | `string` | Nome do produtor |
| `interval` | `number` | Diferença em anos entre as duas vitórias |
| `previousWin` | `number` | Ano da vitória anterior |
| `followingWin` | `number` | Ano da vitória seguinte |

**`ResultadoIntervalos`** — `src/application/premiacoes/domain/entities/output/resultado-intervalos.entity.ts`

Agrega os resultados da análise:

| Campo | Tipo | Descrição |
|---|---|---|
| `min` | `ProdutorIntervalo[]` | Produtores com menor intervalo |
| `max` | `ProdutorIntervalo[]` | Produtores com maior intervalo |

#### DTOs de saída

**`ProdutorIntervaloDto`** — `src/application/premiacoes/interfaces/dtos/output/produtor-intervalo.dto.ts`

DTO que representa um item da resposta HTTP. Campos idênticos à entidade `ProdutorIntervalo`, decorados com `@ApiProperty()` para documentação Swagger.

**`ResultadoIntervalosDto`** — `src/application/premiacoes/interfaces/dtos/output/resultado-intervalos.dto.ts`

DTO raiz da resposta HTTP. Contém `min: ProdutorIntervaloDto[]` e `max: ProdutorIntervaloDto[]`.

O controller realiza a conversão explícita de entidade para DTO, sem usar transformação automática, garantindo controle total sobre o formato da resposta.

---

## Camada Domain

A camada de domínio está distribuída em dois locais:

1. **Domínio da feature** (`src/application/premiacoes/domain/`) — entidades específicas do contexto de premiações.
2. **Domínio compartilhado** (`src/shared/domain/`) — entidades e contratos utilizados por múltiplas camadas.

### Entidades compartilhadas

**`Filme`** — `src/shared/domain/entities/database/premiacoes/filme.entity.ts`

Entidade de domínio que representa um filme na base de dados. Transitada entre infra (mapper, repository) e application (loader, use case):

| Campo | Tipo | Obrigatório |
|---|---|---|
| `id` | `number` | Não (opcional no domínio) |
| `year` | `number` | Sim |
| `title` | `string` | Sim |
| `studios` | `string` | Sim |
| `producer` | `string` | Sim |
| `winner` | `boolean` | Sim |

**`JwtPayload`** — `src/shared/domain/entities/input/jwt-payload.entity.ts`

Entidade de domínio que encapsula os dados do token JWT validado. Possui factory method `JwtPayload.fromDto(dto: JwtPayloadDto)` que valida a presença do campo `sub` antes de construir a instância.

**`Resposta<T>`** — `src/shared/domain/entities/output/resposta.entity.ts`

Envelope genérico para respostas internas dos use cases. Suporta:

| Campo | Tipo | Descrição |
|---|---|---|
| `statusCode` | `number` | Código HTTP da operação |
| `mensagem` | `string` | Identificador semântico do resultado |
| `dados` | `T` (genérico) | Payload da resposta |
| `error` | `string?` | Mensagem de erro, quando aplicável |
| `pagina`, `tamanho`, `totalItens`, etc. | `number?` | Metadados de paginação (disponíveis, não usados no use case atual) |

### Contratos (Adapters)

**`IPremiacoesRepository`** — `src/shared/adapters/database/premiacoes/premiacoes.adapter.ts`

Interface que define o contrato de acesso a dados para o domínio de premiações:

```typescript
interface IPremiacoesRepository {
  contarRegistros(): Promise<number>;
  criarEmLote(filmes: Filme[]): Promise<void>;
  listarVencedores(): Promise<Filme[]>;
}
```

Essa interface é o único ponto de acoplamento entre o use case e a infraestrutura de banco de dados. O binding é declarado no `PremiacoesModule` via token de string `'IPremiacoesRepository'`.

---

## Camada Infra

### Autenticação

#### `JwtAuthGuard` — `src/infra/auth/jwt-auth.guard.ts`

Guard global que intercepta todas as requisições. Antes de delegar para o guard padrão do Passport, verifica se o handler ou a classe do controller estão marcados com o metadata `isPublic` (definido pelo decorator `@Public()`). Endpoints públicos têm o guard completamente bypassed.

#### `JwtStrategy` — `src/infra/auth/jwt.strategy.ts`

Strategy Passport do tipo `passport-jwt`. Configurada para:
- Extrair o token do header `Authorization: Bearer <token>`
- Usar a chave secreta lida de `JWT_SECRET_KEY` via `ConfigService`
- Rejeitar tokens expirados (`ignoreExpiration: false`)
- Validar a presença do campo `sub` no payload; lança `HttpException(401)` se ausente

#### `@Public()` — `src/infra/auth/public.decorator.ts`

Decorator que aplica metadata `isPublic: true` via `SetMetadata`. Utilizado em todos os endpoints atualmente existentes, tornando-os acessíveis sem token JWT.

#### `@JwtExport` — `src/infra/decorators/jwt.decorator.ts`

Param decorator que extrai o `JwtPayload` a partir do objeto `request.user` preenchido pelo `JwtStrategy`. Lança `UnauthorizedException` se o payload estiver ausente. Disponível para uso em controllers que necessitem do contexto do usuário autenticado.

---

### Persistência

#### `FilmeModel` — `src/infra/database/models/premiacoes/filme.model.ts`

Entidade TypeORM mapeada para a tabela `filmes`:

| Coluna | Tipo SQL | Descrição |
|---|---|---|
| `id` | `INTEGER` (PK, auto-increment) | Identificador gerado pelo banco |
| `year` | `INT` | Ano de lançamento/premiação |
| `title` | `VARCHAR` | Título do filme |
| `studios` | `VARCHAR` | Estúdio(s) produtores |
| `producer` | `VARCHAR` | Nome de um produtor específico |
| `winner` | `BOOLEAN` | Indica se é vencedor do prêmio |

A relação entre `FilmeModel` (infra) e `Filme` (domínio) é bidirecional via `FilmeMapper`.

#### `FilmeMapper` — `src/infra/database/mappers/premiacoes/filme.mapper.ts`

Responsável pela conversão entre os dois modelos:

- `toDomain(model: FilmeModel): Filme` — converte registro TypeORM em entidade de domínio
- `toPersistence(entity: Filme): FilmeModel` — converte entidade de domínio em modelo TypeORM (sem `id`, pois é gerado pelo banco)

#### `PremiacoesRepository` — `src/infra/database/repository/premiacoes/premiacoes.repository.ts`

Implementação concreta de `IPremiacoesRepository`. Injeta o repositório TypeORM via `@InjectRepository(FilmeModel)` e o `FilmeMapper`.

Métodos implementados:

| Método | Descrição |
|---|---|
| `contarRegistros()` | Executa `COUNT(*)` na tabela `filmes` |
| `criarEmLote(filmes)` | Persiste um array de `Filme` via `repository.save()` do TypeORM |
| `listarVencedores()` | Executa `SELECT * FROM filmes WHERE winner = true`, converte via mapper |

#### `CsvImportLoader` — `src/infra/database/loaders/csv-import.loader.ts`

Serviço com ciclo de vida `OnApplicationBootstrap`. Coordena a carga inicial dos dados:

- Verifica se já existem registros (idempotência)
- Resolve o caminho absoluto para `docs/Movielist.csv` via `process.cwd()`
- Delega a leitura ao `CsvReaderService`
- Persiste os filmes resultantes via `PremiacoesRepository.criarEmLote()`
- Registra logs de início, conclusão e caso de banco já populado

#### `CsvReaderService` — `src/infra/services/csv-reader.service.ts`

Serviço de leitura e parse de arquivos CSV:

- Lê o arquivo com `fs/promises.readFile` (assíncrono)
- Divide por linhas e ignora o header
- Parseia colunas separadas por `;`: `year;title;studios;producer;winner`
- Interpreta `winner = 'yes'` como `true`, qualquer outro valor como `false`
- **Expansão de produtores múltiplos:** divide o campo `producer` usando `,` ou `and` como separadores, gerando um `CsvFilmeRow` por produtor — esse comportamento garante que um filme com múltiplos produtores contribua individualmente para a análise de intervalos de cada produtor

---

### Decorators

#### `DocumentApiEndpoint` / `DocumentPublicEndpoint`

`src/infra/decorators/document-api-endpoint.decorator.ts`

Decorator composto que aplica múltiplos decorators Swagger em um único ponto:

- `@ApiOperation({ summary, description })`
- `@ApiResponse(successStatus, successType ou responseSchema ou schema padrão)`
- `@ApiResponse(400)` e `@ApiResponse(500)` — sempre incluídos
- `@ApiBearerAuth('JWT-auth')`, `@ApiResponse(401)`, `@ApiResponse(403)` — apenas quando `requiresAuth: true`
- `@ApiBody(bodyType)` — quando `bodyType` informado

`DocumentPublicEndpoint` é um atalho que chama `DocumentApiEndpoint` com `requiresAuth: false`.

Valida em tempo de execução que `summary` e `description` não estão vazios, e que `successStatus` é um código HTTP válido (100–599).

---

### Swagger

#### `ResponseSchemas` — `src/infra/swagger/response-schemas.ts`

Define schemas OpenAPI reutilizáveis para os formatos de resposta padrão:

| Schema | Status | Campos |
|---|---|---|
| `success` | 200 | `statusCode`, `mensagem`, `dados?` |
| `created` | 201 | `statusCode`, `mensagem`, `dados?` |
| `simple` | 200 | `statusCode`, `mensagem` |
| `withArray` | 200 | `statusCode`, `mensagem`, `dados[]`, campos de paginação |
| `noContent` | 204 | `statusCode` |

A função `getDefaultResponseSchema(status)` seleciona automaticamente o schema correto pelo status HTTP, usada pelo `DocumentApiEndpoint` quando `responseSchema` e `successType` não são fornecidos.

---

## Camada Config

### `databaseConfig` — `src/config/database/database.config.ts`

Registrada com `registerAs('database', ...)`. Retorna um objeto `TypeOrmModuleOptions`:

```typescript
{
  type: 'better-sqlite3',
  database: ':memory:',
  entities: [FilmeModel],
  synchronize: true,
}
```

- **`better-sqlite3`**: driver SQLite síncrono para Node.js com excelente performance em operações locais e testes.
- **`:memory:`**: banco de dados volátil em memória — os dados existem apenas durante o tempo de vida do processo.
- **`synchronize: true`**: o schema é derivado automaticamente das entidades TypeORM a cada inicialização. Adequado para o ambiente de execução atual.
- **`entities: [FilmeModel]`**: declaração explícita da única entidade persistida.

Consumida pelo `DatabaseModule` via `ConfigService.getOrThrow<TypeOrmModuleOptions>('database')`.

### `pinoLoggerConfig` — `src/config/logger/pino-logger.config.ts`

Configuração do middleware HTTP da biblioteca `nestjs-pino`:

- **`base: undefined`**: remove campos padrão (`pid`, `hostname`) dos logs.
- **`timestamp: pino.stdTimeFunctions.isoTime`**: timestamps em formato ISO 8601.
- **`serializers: { req: () => undefined, res: () => undefined }`**: suprime a serialização automática de request e response nos logs HTTP, reduzindo ruído.
- **`transport.targets: [pinoTerminal]`**: saída direcionada para `stdout` (file descriptor 1).

---

## Módulos

### `AppModule` — `src/modules/app.module.ts`

**Módulo raiz** da aplicação. Ponto de composição de todos os módulos e controllers de nível global.

| Elemento | Descrição |
|---|---|
| **Imports** | `ConfigModule` (global), `PinoLoggerModule`, `DatabaseModule`, `ScheduleModule`, `PremiacoesModule` |
| **Controllers** | `HealthController` |
| **Providers** | Nenhum provider direto |
| **Exports** | Nenhum |

O `ConfigModule` é configurado com `isGlobal: true`, tornando o `ConfigService` disponível em toda a aplicação sem necessidade de importação explícita em cada módulo.

---

### `DatabaseModule` — `src/modules/database.module.ts`

**Módulo de infraestrutura de banco de dados.** Inicializa a conexão TypeORM de forma assíncrona, aguardando o `ConfigService`.

| Elemento | Descrição |
|---|---|
| **Imports** | `TypeOrmModule.forRootAsync(...)` |
| **Providers** | Nenhum |
| **Exports** | `TypeOrmModule` |

A estratégia `forRootAsync` garante que a conexão só é estabelecida após o `ConfigModule` processar e registrar a configuração `'database'`, evitando condições de corrida na inicialização.

---

### `PinoLoggerModule` — `src/modules/logger.module.ts`

**Módulo de logging estruturado.** Encapsula a configuração do `nestjs-pino`.

| Elemento | Descrição |
|---|---|
| **Imports** | `LoggerModule.forRoot(pinoLoggerConfig)` |
| **Providers** | Nenhum |
| **Exports** | `LoggerModule` |

Exporta `LoggerModule` para que módulos de feature possam injetar `PinoLogger` nos seus providers.

---

### `AuthModule` — `src/modules/auth.module.ts`

**Módulo de autenticação JWT.** Configura Passport.js e o módulo JWT do NestJS.

| Elemento | Descrição |
|---|---|
| **Imports** | `PassportModule`, `JwtModule.register(...)` |
| **Providers** | `JwtStrategy` |
| **Exports** | `JwtModule` |

O `JwtModule` é registrado com `secret: process.env.JWT_SECRET_KEY` e expiração de `1h`. **Observação importante:** o `AuthModule` não é importado pelo `AppModule` nem pelo `PremiacoesModule` na implementação atual. O `JwtAuthGuard` e a `JwtStrategy` existem como infraestrutura pronta para uso, mas nenhum endpoint protegido está ativamente configurado no momento.

---

### `PremiacoesModule` — `src/application/premiacoes/premiacoes.module.ts`

**Módulo de feature para o domínio de premiações.** Centraliza todos os providers necessários para o funcionamento do contexto de análise de prêmios.

| Elemento | Valor |
|---|---|
| **Imports** | `DatabaseModule`, `TypeOrmModule.forFeature([FilmeModel])`, `PinoLoggerModule` |
| **Controllers** | `PremiacoesController` |
| **Providers** | `{ provide: 'IPremiacoesRepository', useClass: PremiacoesRepository }`, `FilmeMapper`, `BuscarIntervalosPremiosUseCase`, `CsvReaderService`, `CsvImportLoader` |
| **Exports** | Nenhum |

O binding `'IPremiacoesRepository' → PremiacoesRepository` é a implementação do padrão de inversão de dependência: o use case e o loader dependem apenas da interface, enquanto o módulo decide qual implementação concreta injetar.

---

## Persistência

### Tecnologia utilizada

**TypeORM** com o driver **`better-sqlite3`**. O banco é instanciado em memória (`':memory:'`), portanto os dados não são persistidos entre reinicializações do processo.

### Configuração atual

| Parâmetro | Valor |
|---|---|
| Driver | `better-sqlite3` |
| Database | `:memory:` |
| Sincronização de schema | `synchronize: true` |
| Migrations | Não utilizadas |
| Pool de conexões | Não configurado (SQLite gerencia internamente) |

### Entidades persistidas

Apenas uma entidade é registrada no TypeORM:

**`FilmeModel`** → tabela `filmes`

```sql
CREATE TABLE filmes (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  year    INTEGER NOT NULL,
  title   VARCHAR NOT NULL,
  studios VARCHAR NOT NULL,
  producer VARCHAR NOT NULL,
  winner  BOOLEAN NOT NULL DEFAULT FALSE
);
```

### Estratégia de inicialização do schema

Com `synchronize: true`, o TypeORM compara as entidades declaradas com o schema atual e aplica as alterações necessárias na inicialização. Para o banco em memória, isso equivale a criar as tabelas do zero a cada inicialização do processo.

### Carregamento dos dados

Os dados são carregados **uma única vez** na inicialização via `CsvImportLoader`, que implementa `OnApplicationBootstrap`. A proteção contra dupla importação é garantida pela verificação `contarRegistros() > 0`. A fonte dos dados é o arquivo `docs/Movielist.csv`, lido via `CsvReaderService`.

---

## APIs Disponíveis

### `GET /health-check`

**Controller:** `HealthController`  
**Arquivo:** `src/application/health/health.controller.ts`

| Atributo | Valor |
|---|---|
| Autenticação | Não requerida (`@Public()`) |
| Tag Swagger | `Health` |

**Request:** Nenhum parâmetro.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "golden-raspberry-backend"
}
```

**Fluxo interno:** Resposta montada diretamente no controller, sem use case ou acesso a banco.

---

### `GET /v1/premiacoes/intervalos`

**Controller:** `PremiacoesController`  
**Arquivo:** `src/application/premiacoes/interfaces/controllers/premiacoes.controller.ts`

| Atributo | Valor |
|---|---|
| Autenticação | Não requerida (`@Public()`) |
| Tag Swagger | `Premiacoes` |
| Versão da API | `v1` |

**Request:** Nenhum parâmetro de query, path ou body.

**Response (200) — `ResultadoIntervalosDto`:**
```json
{
  "min": [
    {
      "producer": "Nome do Produtor",
      "interval": 1,
      "previousWin": 2008,
      "followingWin": 2009
    }
  ],
  "max": [
    {
      "producer": "Nome do Produtor",
      "interval": 13,
      "previousWin": 1980,
      "followingWin": 1993
    }
  ]
}
```

**Fluxo interno:**

```
PremiacoesController.buscarIntervalos()
        │
        ▼
BuscarIntervalosPremiosUseCase.executar()
        │
        ├── IPremiacoesRepository.listarVencedores()
        │       └── SELECT * FROM filmes WHERE winner = true
        │               └── FilmeMapper.toDomain() para cada registro
        │
        ├── Agrupa por produtor → Map<string, number[]>
        ├── Calcula intervalos entre anos consecutivos
        ├── Encontra mínimo e máximo global
        └── Retorna ResultadoIntervalos{ min[], max[] }
        │
        ▼
Controller serializa manualmente para ResultadoIntervalosDto
        │
        ▼
JSON Response 200
```

---

## Fluxos de Negócio

### Fluxo 1: Importação inicial de dados

```
Inicialização do processo Node.js
        │
        ▼
NestFactory.create(AppModule) — todos os módulos carregados
        │
        ▼
CsvImportLoader.onApplicationBootstrap()
        │
        ├── PremiacoesRepository.contarRegistros() → 0 registros
        │
        ├── CsvReaderService.lerArquivo('docs/Movielist.csv')
        │   │
        │   ├── fs/promises.readFile() → string com todo o CSV
        │   ├── split('\n') → array de linhas
        │   ├── ignora linha 0 (header: year;title;studios;producer;winner)
        │   └── para cada linha:
        │       ├── split(';') → [year, title, studios, producers, winner]
        │       ├── parsearProdutores(producers)
        │       │   └── split por /,\s*|\s+and\s+/ → ["Joel Silver", "Richard Donner"]
        │       └── gera um CsvFilmeRow por produtor encontrado
        │
        ├── Cria Filme[] a partir dos CsvFilmeRow[]
        │
        └── PremiacoesRepository.criarEmLote(filmes[])
                └── filmeRepository.save(models[]) via TypeORM
```

**Invariante:** Se o banco já contiver registros, toda essa sequência é pulada. A idempotência é garantida na linha de entrada do loader.

---

### Fluxo 2: Consulta de intervalos entre premiações

```
Cliente HTTP
        │   GET /v1/premiacoes/intervalos
        ▼
NestJS HTTP Pipeline
        ├── JwtAuthGuard.canActivate()
        │   └── reflector detecta isPublic = true → retorna true sem validar JWT
        ├── ValidationPipe → sem body/query/params para validar
        │
        ▼
PremiacoesController.buscarIntervalos()
        │
        ▼
BuscarIntervalosPremiosUseCase.executar()
        │
        ├── logger.info("BuscarIntervalosPremios INÍCIO")
        │
        ├── PremiacoesRepository.listarVencedores()
        │   └── TypeORM: find({ where: { winner: true } })
        │       └── FilmeMapper.toDomain() → Filme[]
        │
        ├── Construção do Map<produtor, anos[]>
        │   Exemplo: { "Joel Silver": [1980, 1995], "Allan Carr": [1980] }
        │
        ├── Para cada produtor com >= 2 anos:
        │   ├── anos.sort() → [1980, 1995]
        │   └── push ProdutorIntervalo { producer, interval: 15, previousWin: 1980, followingWin: 1995 }
        │
        ├── Se nenhum produtor com >= 2 vitórias: retorna { min: [], max: [] }
        │
        ├── Math.min(...intervalos) e Math.max(...intervalos)
        │
        ├── filter(i => i.interval === menorIntervalo) → min[]
        ├── filter(i => i.interval === maiorIntervalo) → max[]
        │
        ├── Monta Resposta<ResultadoIntervalos> { statusCode: 200, mensagem: 'INTERVALOS_ENCONTRADOS', dados }
        │
        └── logger.info("BuscarIntervalosPremios FIM")
        │
        ▼
Controller mapeia resultado para ResultadoIntervalosDto
        │
        ▼
NestJS serializa para JSON e retorna HTTP 200
```

---

## Decisões Arquiteturais

### DA-01: Banco de dados em memória

**Decisão:** Uso de `better-sqlite3` com `database: ':memory:'`.

**Vantagem:** Elimina dependência de infraestrutura externa. A aplicação é completamente autossuficiente — basta o processo Node.js estar rodando. Inicialização instantânea, ideal para testes de integração.

**Trade-off:** Os dados não sobrevivem ao término do processo. Em cada reinicialização, o banco é recriado e os dados são recarregados do CSV. Para o escopo atual do sistema (consultas analíticas sobre um dataset fixo), essa troca é aceitável.

---

### DA-02: Injeção de repositório por token de string

**Decisão:** O binding entre `IPremiacoesRepository` e `PremiacoesRepository` usa o token `'IPremiacoesRepository'` em vez de injeção por classe.

**Vantagem:** Isola completamente o use case da implementação concreta. O use case importa apenas a interface do `shared/adapters`, sem qualquer referência ao código de infra.

**Trade-off:** Exige que o token seja repetido em três pontos (declaração da interface, `@Inject()` no use case e loader, e declaração do provider no módulo). Erros de digitação no token só são detectados em runtime.

---

### DA-03: Separação entre entidade de domínio e model TypeORM

**Decisão:** Existência simultânea de `Filme` (domínio) e `FilmeModel` (TypeORM), conectados pelo `FilmeMapper`.

**Vantagem:** As entidades de domínio são POJOs TypeScript puros, sem decorators de framework. O use case opera sobre `Filme`, sem saber que TypeORM existe. Substituir o banco de dados exigiria apenas uma nova implementação de `IPremiacoesRepository` e um novo model — sem tocar no use case.

**Trade-off:** Overhead de manutenção de duas representações do mesmo dado e do mapper. Para um domínio simples como `Filme`, o custo é baixo.

---

### DA-04: Expansão de produtores múltiplos no CSV

**Decisão:** O `CsvReaderService` divide o campo `producer` por `,` e `and`, gerando um registro na tabela `filmes` por produtor.

**Vantagem:** Permite que a análise de intervalos trate cada produtor individualmente. Um filme coproduzido por "Joel Silver and Richard Donner" contribui para o histórico de ambos.

**Trade-off:** A tabela `filmes` não possui chave de unicidade sobre `(year, title, producer)`. Importações duplas (caso a proteção do loader falhe) gerariam dados duplicados.

---

### DA-05: Decorator `DocumentApiEndpoint` composto

**Decisão:** Criação de um decorator de documentação proprietário que encapsula múltiplos decorators Swagger.

**Vantagem:** Padroniza a documentação de todos os endpoints. Um único ponto de modificação para alterar as respostas padrão (400, 500) documentadas em todos os endpoints. Reduz repetição nos controllers.

**Trade-off:** Adiciona uma camada de indireção. Desenvolvedores precisam conhecer o decorator antes de adicionar novos endpoints.

---

### DA-06: Infraestrutura de autenticação JWT pronta, sem endpoints protegidos

**Decisão:** `JwtAuthGuard`, `JwtStrategy`, `AuthModule`, `@JwtExport` e `@Public()` estão implementados, mas todos os endpoints atuais usam `@Public()`.

**Vantagem:** A infraestrutura de autenticação está pronta para ser ativada sem alterações estruturais. Adicionar um endpoint protegido requer apenas remover `@Public()` e importar `AuthModule`.

**Trade-off:** O `AuthModule` não está importado no `AppModule` nem no `PremiacoesModule`, o que significa que o `JwtAuthGuard` não está registrado como guard global. Para ativar a proteção, será necessário registrá-lo via `APP_GUARD` no `AppModule` e importar o `AuthModule`.

---

## Evolução da Arquitetura

As sugestões a seguir respeitam a arquitetura em camadas existente e podem ser incorporadas sem reescrita estrutural.

### Ativação da autenticação JWT

A infraestrutura está implementada. Para ativar a proteção global de endpoints:

1. Registrar `JwtAuthGuard` como provider global no `AppModule` via token `APP_GUARD`.
2. Importar `AuthModule` no `AppModule`.
3. Criar um endpoint de login em um novo módulo `AutenticacaoModule` que gere e retorne o JWT.
4. Remover `@Public()` dos endpoints que devem ser protegidos.

A existência do decorator `@Public()` garante que endpoints como `/health-check` continuem acessíveis sem token após a ativação.

### Banco de dados persistente

A transição de `:memory:` para um arquivo SQLite em disco (ou para PostgreSQL/MySQL) exige apenas a alteração da `databaseConfig`:

- Para arquivo: `database: './data/golden-raspberry.db'`
- Para PostgreSQL: trocar `type` para `postgres` e adicionar `host`, `port`, `username`, `password`, `database`

O resto da aplicação — use cases, repositório, mapper — não sofre nenhuma alteração. A abstração via `IPremiacoesRepository` isola completamente essa decisão.

Com a mudança para banco persistente, `synchronize: true` deve ser substituído por migrations TypeORM gerenciadas explicitamente.

### Novos módulos de feature

A arquitetura atual estabelece o padrão para adição de novos domínios. Um novo módulo seguiria a mesma estrutura de `PremiacoesModule`:

```
src/application/novo-dominio/
├── novo-dominio.module.ts
├── domain/entities/
├── interfaces/controllers/
├── interfaces/dtos/
└── use-cases/
```

Com contratos em `src/shared/adapters/database/novo-dominio/` e implementações em `src/infra/database/repository/novo-dominio/`.

### Observabilidade

O logger Pino já está integrado em todos os providers críticos (use case, repository, loader). Evoluções naturais incluem:

- Adicionar **correlation ID** por requisição HTTP, propagado para todos os logs da request via `AsyncLocalStorage` ou middleware NestJS.
- Exportar logs estruturados para sistemas centralizados (ex: stdout com coleta via agente de infraestrutura).

### Versionamento de APIs

O prefixo `v1` já está aplicado na rota `/v1/premiacoes/intervalos`. Para suportar múltiplas versões, o NestJS oferece o módulo de versionamento nativo (`enableVersioning()`) que pode ser ativado no `main.ts` sem alteração dos controllers existentes.

### Cache de resultados

O endpoint `/v1/premiacoes/intervalos` é determinístico e os dados raramente mudam (apenas com reimportação). Um cache em memória com TTL (via `@nestjs/cache-manager`) sobre o resultado do use case eliminaria as queries ao SQLite em requests repetidas, sem alterar a lógica de negócio.

---

## Considerações Finais

O backend Golden Raspberry Awards entrega uma API REST focada, bem estruturada e tecnicamente consistente. A solução resolve com precisão o problema de análise de intervalos entre vitórias de produtores, com dados carregados automaticamente a partir de um CSV histórico.

A arquitetura limpa com inversão de dependência via interfaces está corretamente aplicada: o use case central nunca referencia diretamente nenhum detalhe de infraestrutura. O mapper isola o modelo de banco da entidade de domínio. O loader garante carga idempotente dos dados. O decorator de documentação padroniza a superfície da API.

A infraestrutura de autenticação JWT está implementada e pronta para ser ativada, o que demonstra planejamento para crescimento sem retrabalho. O banco em memória simplifica a execução local e em pipelines de testes, com caminho claro de migração para persistência permanente quando necessário.

O sistema está em condições de receber novos módulos de feature, novos endpoints e evolução da infraestrutura de dados sem comprometer os princípios arquiteturais estabelecidos.
