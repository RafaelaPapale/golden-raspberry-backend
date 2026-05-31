# Testes de Integração

> Documentação de referência para a suíte de testes de integração do backend Golden Raspberry Awards.
> Baseada exclusivamente no código existente em `test/integrations/`.

---

## Objetivo dos Testes de Integração

Os testes de integração verificam se os componentes reais da aplicação funcionam corretamente quando conectados entre si. Diferentemente dos testes unitários, aqui nenhum colaborador crítico é substituído por mock: o banco de dados SQLite real é usado, os repositórios executam queries reais e os use cases operam sobre dados persistidos de verdade.

Os objetivos concretos desta suíte são:

- Verificar que o `PremiacoesRepository` persiste e consulta dados corretamente no banco SQLite
- Verificar que o `BuscarIntervalosPremiosUseCase` produz resultados corretos quando alimentado com dados reais do banco
- Verificar que os endpoints HTTP respondem com o formato e os valores esperados
- Confirmar que a carga inicial do CSV produz os resultados esperados na API
- Validar invariantes matemáticos do cálculo de intervalos com dados controlados

---

## O Que Está Sendo Integrado

| Componente 1 | Componente 2 | O que verifica |
|---|---|---|
| `PremiacoesRepository` | SQLite in-memory (TypeORM) | Persistência e consulta real de `FilmeModel` |
| `BuscarIntervalosPremiosUseCase` | `PremiacoesRepository` (real) | Cálculo de intervalos sobre dados reais do banco |
| `PremiacoesController` (HTTP) | `BuscarIntervalosPremiosUseCase` → banco | Resposta HTTP completa com dados do CSV |
| `HealthController` (HTTP) | NestJS app | Resposta HTTP do endpoint de health check |

---

## Estratégia Adotada

A suíte usa dois modos distintos de integração, escolhidos de acordo com o que cada suíte precisa verificar:

### Modo 1: Módulo sem aplicação HTTP (`createIntegrationModule`)

Cria um `TestingModule` com o `AppModule` real, mas com o `CsvImportLoader` substituído por um no-op. O banco começa vazio e cada teste insere exatamente os dados que precisa. Nenhuma aplicação NestJS (`INestApplication`) é criada — os lifecycle hooks `OnApplicationBootstrap` não são disparados.

Usado por: `premiacoes-repository.integration.spec.ts` e `buscar-intervalos-premios.integration.spec.ts`.

**Vantagem:** Controle total sobre os dados; sem custo de inicialização HTTP; testes mais rápidos.

### Modo 2: Aplicação HTTP completa (`createIntegrationApp`)

Cria um `INestApplication` completo com `AppModule`, incluindo o `CsvImportLoader` ativo. O CSV real (`docs/Movielist.csv`) é importado na inicialização via `OnApplicationBootstrap`. As requisições HTTP são feitas via Supertest.

Usado por: `health.integration.spec.ts` e `premiacoes-endpoint.integration.spec.ts`.

**Vantagem:** Testa o fluxo completo de ponta a ponta, incluindo parsing do CSV real, pipeline HTTP, validação de payload e serialização JSON.

---

## Arquitetura dos Testes

```
test/integrations/
├── setup/
│   ├── integration-app.setup.ts       # createIntegrationApp() — app HTTP completo
│   └── integration-module.setup.ts    # createIntegrationModule() — módulo sem HTTP
├── helpers/
│   └── database.helper.ts             # DatabaseHelper — acesso direto ao TypeORM
├── factories/
│   └── filme.factory.ts               # FilmeFactory — builder de entidades Filme
├── fixtures/
│   └── filme.fixture.ts               # filmeFixtures — datasets determinísticos
└── specs/
    ├── health.integration.spec.ts
    ├── premiacoes-endpoint.integration.spec.ts
    ├── premiacoes-repository.integration.spec.ts
    └── buscar-intervalos-premios.integration.spec.ts
```

---

## Setup

### `createIntegrationApp`

**Arquivo:** `test/integrations/setup/integration-app.setup.ts`

```typescript
export async function createIntegrationApp(): Promise<IntegrationApp> {
  process.env.JWT_SECRET_KEY = 'integration-test-secret-key';

  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication();
  app.use(require('cookie-parser')());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, ... }));
  await app.init();  // dispara OnApplicationBootstrap → CsvImportLoader executa

  return { app, module };
}
```

O `ValidationPipe` é registrado com os mesmos parâmetros do `main.ts` para fidelidade com o ambiente de produção. Como o `AppModule` registra o `JwtAuthGuard` via `APP_GUARD`, o guard está ativo neste app de testes — os endpoints continuam acessíveis porque estão decorados com `@Public()`.

### `createIntegrationModule`

**Arquivo:** `test/integrations/setup/integration-module.setup.ts`

```typescript
export async function createIntegrationModule(): Promise<TestingModule> {
  process.env.JWT_SECRET_KEY = 'integration-test-secret-key';

  return Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(CsvImportLoader)
    .useValue({ onApplicationBootstrap: () => Promise.resolve() })
    .compile();
}
```

O `CsvImportLoader` é substituído por um no-op para que o banco comece vazio. O `TestingModule` não chama `createNestApplication()`, portanto lifecycle hooks não são disparados.

---

## Banco de Dados

O banco usado nos testes de integração é o mesmo banco em memória configurado em `database.config.ts`:

```typescript
{
  type: 'better-sqlite3',
  database: ':memory:',
  entities: [FilmeModel],
  synchronize: true,
}
```

Cada `TestingModule` ou `INestApplication` criado instancia seu próprio banco em memória isolado. O banco é completamente destruído ao fechar o módulo/app com `module.close()` ou `app.close()`.

---

## Controle de Estado

### `DatabaseHelper`

**Arquivo:** `test/integrations/helpers/database.helper.ts`

Classe utilitária que encapsula operações diretas no banco via TypeORM, usada para setup e teardown nos testes:

| Método | Descrição |
|---|---|
| `insertFilmes(filmes)` | Persiste um array de entidades `Filme` via mapper + `repo.save()` |
| `clearFilmes()` | Executa `repo.clear()` — trunca a tabela `filmes` |
| `countAll()` | Retorna `repo.count()` |
| `countWinners()` | Retorna `repo.count({ where: { winner: true } })` |
| `findAll()` | Retorna todos os registros ordenados por `year` |
| `findWinners()` | Retorna apenas vencedores ordenados por `year` |

### Ciclo de vida por suíte

```
beforeAll  → inicializa módulo/app (uma vez por suíte)
beforeEach → FilmeFactory.reset() + db.clearFilmes() (antes de cada teste)
afterAll   → module.close() / app.close() (uma vez por suíte)
```

Esse padrão garante que cada teste começa com banco vazio, sem dependência de ordem de execução.

---

## Isolamento Entre Testes

- O banco é zerado via `db.clearFilmes()` no `beforeEach` de todas as suítes que usam `createIntegrationModule`
- Suítes que usam `createIntegrationApp` não zeran o banco entre testes — os dados do CSV são inseridos uma única vez no `beforeAll` e são apenas lidos (nunca modificados) pelos testes da suíte
- Cada suíte tem seu próprio `TestingModule` ou `INestApplication` — não há compartilhamento de instâncias entre arquivos de spec

---

## Factories

### `FilmeFactory`

**Arquivo:** `test/integrations/factories/filme.factory.ts`

Builder estático para criação de entidades `Filme` com estado controlado:

| Método | Descrição |
|---|---|
| `FilmeFactory.create(overrides?)` | Cria um filme com dados sequenciais (`year = 2001, 2002, ...`); aceita overrides |
| `FilmeFactory.createWinner(year, producer, overrides?)` | Atalho para criar vencedor com ano e produtor específicos |
| `FilmeFactory.createLoser(year, producer, overrides?)` | Atalho para criar não-vencedor |
| `FilmeFactory.createBatch(count, overrides?)` | Cria N filmes em lote |
| `FilmeFactory.createInterval(producer, baseYear, interval)` | Cria par de vitórias para o mesmo produtor com intervalo exato |
| `FilmeFactory.reset()` | Reseta o contador interno de sequência |

`reset()` é chamado no `beforeEach` de todas as suítes que usam a factory para garantir sequências previsíveis.

---

## Fixtures

### `filmeFixtures`

**Arquivo:** `test/integrations/fixtures/filme.fixture.ts`

Conjunto de funções que retornam arrays de `Filme` com cenários determinísticos e documentados. Cada chamada retorna um array novo (sem compartilhamento de estado):

| Fixture | Cenário | Resultado esperado |
|---|---|---|
| `empty()` | Banco vazio | `min: [], max: []` |
| `singleWinnerPerProducer()` | Nenhum produtor vence mais de uma vez | `min: [], max: []` |
| `consecutiveWins()` | Joel Silver vence em 2000 e 2001 | `interval = 1` |
| `longIntervalWins()` | Matthew Vaughn vence em 2002 e 2015 | `interval = 13` |
| `minMaxScenario()` | Joel Silver (1) e Matthew Vaughn (13) | min = Joel, max = Matthew |
| `tieScenario()` | Prod A e Prod B ambos com interval = 1 | `min.length = 2, max.length = 2` |
| `mixedWinnersAndLosers()` | Vencedores e não-vencedores intercalados | Apenas vencedores nos resultados |
| `outOfOrderYears()` | Anos inseridos fora de ordem cronológica | Intervalos 5 e 10 (após ordenação) |
| `threeWins()` | Um produtor com 3 vitórias | Dois intervalos: 10 e 5 |
| `complexScenario()` | 3 produtores com intervalos 1, 6 e 13 + não-vencedor | min = 1, max = 13; não-vencedor excluído |

---

## Fluxos Cobertos

### Endpoint `GET /health-check`

- Resposta 200 com payload `{ status: 'ok', service: 'golden-raspberry-backend', timestamp }`
- Content-Type `application/json`
- Acessível sem autenticação — `@Public()` faz o `JwtAuthGuard` global liberar o acesso
- Rota inexistente retorna 404

### Endpoint `GET /v1/premiacoes/intervalos`

- Resposta 200 com dados do CSV real
- Content-Type `application/json`
- Acessível sem autenticação — `@Public()` faz o `JwtAuthGuard` global liberar o acesso
- Estrutura `{ min: [...], max: [...] }` com arrays não vazios
- Cada item com shape `{ producer, interval, previousWin, followingWin }`
- Resultado exato com Joel Silver no min e Matthew Vaughn no max

### `PremiacoesRepository` (banco real)

- `contarRegistros()`: retorna 0 com banco vazio; count exato após inserts
- `criarEmLote()`: persiste um ou vários filmes; persiste `winner: true/false`; persiste todos os campos; no-op para array vazio; auto-assign de `id`
- `listarVencedores()`: retorna vazio com banco vazio; retorna apenas `winner = true`; retorna entidades de domínio (`Filme`); todos os campos mapeados

### `BuscarIntervalosPremiosUseCase` (módulo real)

- Injeção de dependência via DI container
- Caminho feliz com `minMaxScenario`
- Banco vazio → `statusCode: 200` com `min: [], max: []`
- Produtor com vitória única → listas vazias
- Banco apenas com não-vencedores → listas vazias
- Anos fora de ordem → `previousWin < followingWin` em todos os itens
- 3 vitórias para um produtor → dois intervalos gerados
- Empate → múltiplos produtores em min e max
- Cenário complexo → mínimo e máximo globais corretos; não-vencedores excluídos
- Invariantes matemáticos: `interval = followingWin - previousWin`, `min.interval ≤ max.interval`, `previousWin < followingWin`
- Dados refletem a persistência imediata: `criarEmLote` → `executar` retorna resultados atualizados
- Sem caching: alterar os dados do banco muda o resultado na próxima chamada

---

## Endpoints Cobertos

| Endpoint | Método | Autenticação | Spec |
|---|---|---|---|
| `/health-check` | GET | Não requerida | `health.integration.spec.ts` |
| `/v1/premiacoes/intervalos` | GET | Não requerida | `premiacoes-endpoint.integration.spec.ts` |

---

## Casos de Erro Cobertos

| Caso | Onde verificado |
|---|---|
| Rota inexistente → 404 | `health.integration.spec.ts` |

---

## Casos de Sucesso Cobertos

| Caso | Onde verificado |
|---|---|
| Health check com payload correto | `health.integration.spec.ts` |
| Intervalos calculados a partir do CSV real | `premiacoes-endpoint.integration.spec.ts` |
| Invariante `interval = followingWin - previousWin` para todos os itens | `premiacoes-endpoint.integration.spec.ts`, `buscar-intervalos-premios.integration.spec.ts` |
| Todos os itens em `min` compartilham o mesmo intervalo (menor) | `premiacoes-endpoint.integration.spec.ts` |
| Todos os itens em `max` compartilham o mesmo intervalo (maior) | `premiacoes-endpoint.integration.spec.ts` |
| Joel Silver: interval=1, previousWin=1990, followingWin=1991 | `premiacoes-endpoint.integration.spec.ts` |
| Matthew Vaughn: interval=13, previousWin=2002, followingWin=2015 | `premiacoes-endpoint.integration.spec.ts` |
| Não-vencedores (ex: Jerry Weintraub) ausentes dos resultados | `premiacoes-endpoint.integration.spec.ts` |
| `criarEmLote` persiste corretamente todos os campos | `premiacoes-repository.integration.spec.ts` |
| `listarVencedores` retorna apenas `winner = true` | `premiacoes-repository.integration.spec.ts` |
| Use case com banco vazio → 200 e listas vazias | `buscar-intervalos-premios.integration.spec.ts` |
| Use case com empate → múltiplos produtores em min e max | `buscar-intervalos-premios.integration.spec.ts` |

---

## Integrações Externas

Nenhuma integração externa é testada. A suíte é completamente autossuficiente:

- Banco de dados: SQLite in-memory — sem servidor externo
- CSV: arquivo local `docs/Movielist.csv` — lido do sistema de arquivos
- Autenticação: `JWT_SECRET_KEY` setada inline no setup — obrigatória porque o `JwtAuthGuard` está ativo globalmente e a `JwtStrategy` lê a chave na inicialização via `ConfigService`

---

## Decisões Arquiteturais

**Dois modos de setup**

A separação entre `createIntegrationModule` e `createIntegrationApp` é intencional. O modo módulo testa a lógica de negócio e a camada de persistência com máximo controle sobre os dados e sem overhead de HTTP. O modo app testa o contrato HTTP real, incluindo serialização, routing e o CSV de produção.

**CsvImportLoader substituído no modo módulo**

O `CsvImportLoader` implementa `OnApplicationBootstrap`, que só dispara quando `app.init()` é chamado. No modo módulo (`TestingModule.compile()` sem `createNestApplication()`), os lifecycle hooks não são disparados. A substituição explícita via `.overrideProvider(CsvImportLoader).useValue(...)` é usada por clareza e para garantir o comportamento mesmo que o comportamento padrão mude.

**`DatabaseHelper` usa TypeORM diretamente**

O helper acessa o repositório TypeORM via `getRepositoryToken(FilmeModel)` para inserir e limpar dados sem passar pela camada de domínio. Isso garante que o setup dos testes não depende do comportamento correto do `PremiacoesRepository` — a classe que está sendo testada.

**Fixtures com funções, não arrays estáticos**

Cada fixture é uma função (`(): Filme[]`) em vez de um array constante. Isso garante que cada chamada retorna um novo array de novas instâncias, evitando que mutações em um teste afetem outros.

---

## Trade-offs

| Trade-off | Decisão tomada |
|---|---|
| Testes de endpoint usam o CSV real | Garante que o resultado reflete os dados históricos reais; torna os testes dependentes do arquivo CSV |
| Banco zerrado entre testes via `clearFilmes()` | Garante isolamento; requer que cada teste seja autossuficiente na inserção de dados |
| Módulo compartilhado entre testes de uma suíte (`beforeAll`) | Evita o overhead de criar/destruir o módulo por teste; exige que os testes da suíte não acumulem estado |
| `JWT_SECRET_KEY` hardcoded no setup | Elimina dependência de `.env`; aceitável para ambiente de teste |

---

## Benefícios

- **Confiança real:** Testa as queries SQL reais, o mapeamento real e o parser CSV real — não uma simulação deles
- **Detecção de divergências de contrato:** Mudanças na interface `IPremiacoesRepository` que quebrem a implementação são detectadas imediatamente
- **Validação do CSV:** Os testes de endpoint validam que o CSV atual produz os resultados esperados pela especificação do desafio
- **Cobertura de caminho completo:** Desde a requisição HTTP até o banco de dados e de volta à resposta JSON serializada

---

## Como Executar

```bash
# Todos os testes (unitários + integração)
npm test

# Apenas testes de integração
npm test -- --testPathPattern="test/integrations"

# Com cobertura
npm run test:cov

# Modo watch
npm run test:watch
```

---

## Como Criar Novos Testes

### Novo teste de repositório (modo módulo)

```typescript
import { createIntegrationModule } from '../setup/integration-module.setup';
import { DatabaseHelper } from '../helpers/database.helper';
import { FilmeFactory } from '../factories/filme.factory';

describe('[MinhaEntidade] Integration', () => {
  let module: TestingModule;
  let db: DatabaseHelper;

  beforeAll(async () => {
    module = await createIntegrationModule();
    db = new DatabaseHelper(module);
  });

  afterAll(async () => { await module.close(); });

  beforeEach(async () => {
    FilmeFactory.reset();
    await db.clearFilmes();
  });

  it('deve ...', async () => {
    await db.insertFilmes(FilmeFactory.createBatch(3));
    // assertivas
  });
});
```

### Novo teste de endpoint (modo app)

```typescript
import request from 'supertest';
import { createIntegrationApp, IntegrationApp } from '../setup/integration-app.setup';

describe('[MeuController] Integration', () => {
  let integrationApp: IntegrationApp;

  beforeAll(async () => { integrationApp = await createIntegrationApp(); });
  afterAll(async () => { await integrationApp.app.close(); });

  it('deve retornar 200', async () => {
    await request(integrationApp.app.getHttpServer())
      .get('/meu-endpoint')
      .expect(200);
  });
});
```

---

## Boas Práticas

- Usar `beforeAll` para inicializar módulo/app; `beforeEach` para limpar estado do banco
- Não compartilhar variáveis mutáveis entre testes sem zerá-las no `beforeEach`
- Usar fixtures nomeadas para cenários reutilizáveis; `FilmeFactory` para dados ad hoc
- Chamar `FilmeFactory.reset()` no `beforeEach` para garantir sequências previsíveis
- Manter cada suíte focada em uma única camada ou componente
- Documentar nos comentários os valores esperados derivados do CSV quando os testes dependem do arquivo real

---

## Anti-patterns Evitados

- **Testes que dependem de ordem:** cada teste começa com banco zerado e insere os seus próprios dados
- **Dados compartilhados mutáveis entre specs:** fixtures retornam novos arrays a cada chamada
- **Assertivas em dados do CSV sem comentário explicativo:** os valores esperados (`Joel Silver: interval=1`) são documentados nos testes com comentários que explicam de onde vêm
- **Setup HTTP em testes que não precisam de HTTP:** suítes de repositório e use case usam `createIntegrationModule` (mais rápido), não `createIntegrationApp`

---

## Relação com a Arquitetura da Aplicação

Os testes de integração exercitam exatamente as fronteiras entre camadas descritas em ARQUITETURA.md:

- **Infra ↔ Banco:** `premiacoes-repository.integration.spec.ts` verifica que `PremiacoesRepository` cumpre o contrato de `IPremiacoesRepository` usando TypeORM real
- **Application ↔ Infra:** `buscar-intervalos-premios.integration.spec.ts` verifica que o use case produz resultados corretos quando conectado ao repositório real
- **Presentation ↔ Application ↔ Infra:** `premiacoes-endpoint.integration.spec.ts` verifica o fluxo completo desde a requisição HTTP até a resposta JSON
- **Bootstrap ↔ Infra:** `premiacoes-endpoint.integration.spec.ts` usa `createIntegrationApp`, que dispara o `CsvImportLoader` e verifica que o CSV real produz o resultado correto

---

## Cobertura Obtida

Os testes de integração cobrem os caminhos de execução que os testes unitários não podem cobrir sem infraestrutura real:

- Queries TypeORM reais (`find`, `save`, `count`, `clear`)
- Mapeamento bidirecional `FilmeModel ↔ Filme` em operações reais do banco
- Carga do CSV real e os resultados produzidos pelo dataset histórico
- Pipeline HTTP completo: roteamento, `ValidationPipe`, serialização JSON, headers

As branches e statements cobertas exclusivamente pela suíte de integração completam o conjunto para atingir os thresholds globais do projeto.
