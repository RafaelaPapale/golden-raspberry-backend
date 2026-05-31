# Testes Unitários

> Documentação de referência para a suíte de testes unitários do backend Golden Raspberry Awards.
> Baseada exclusivamente no código existente em `test/unit/`.

---

## Objetivo dos Testes Unitários

Os testes unitários garantem que cada classe da aplicação se comporta corretamente de forma isolada, sem dependências externas como banco de dados, sistema de arquivos ou servidor HTTP. Cada teste verifica um único comportamento de uma única unidade de código.

Os objetivos concretos desta suíte são:

- Validar a lógica de negócio do use case independentemente da persistência
- Verificar o comportamento de controllers quanto ao mapeamento de entidades para DTOs
- Confirmar as regras de validação e construção das entidades de domínio
- Garantir o comportamento dos serviços de infraestrutura (CSV reader, mappers)
- Cobrir casos de erro e condições de borda sem necessidade de infraestrutura real

---

## Estratégia Adotada

A estratégia central é o **isolamento por substituição de dependências**: todo colaborador externo de uma unidade é substituído por um mock ou spy controlado pelo teste. O NestJS Testing Module (`@nestjs/testing`) é usado para instanciar a unidade com suas dependências reais substituídas.

Para classes sem injeção de dependência (entidades e DTOs), as instâncias são criadas diretamente, sem o módulo NestJS.

O padrão **AAA (Arrange–Act–Assert)** é aplicado em todos os testes: primeiro o cenário é montado, depois a ação é executada e por último o resultado é verificado.

---

## Arquitetura dos Testes

A suíte está organizada para espelhar a estrutura de `src/`, garantindo que cada arquivo de fonte tenha um arquivo de teste correspondente no mesmo caminho relativo sob `test/unit/`.

```
test/unit/
├── helpers/
│   └── index.ts                               # MockRepositoryBuilderPremiacoes
├── application/
│   ├── health/
│   │   └── health.controller.spec.ts
│   └── premiacoes/
│       ├── domain/entities/output/
│       │   ├── produtor-intervalo.entity.spec.ts
│       │   └── resultado-intervalos.entity.spec.ts
│       ├── interfaces/
│       │   ├── controllers/
│       │   │   └── premiacoes.controller.spec.ts
│       │   └── dtos/output/
│       │       ├── produtor-intervalo.dto.spec.ts
│       │       └── resultado-intervalos.dto.spec.ts
│       └── use-cases/buscar-intervalos-premios/
│           └── buscar-intervalos-premios.use-case.spec.ts
├── infra/
│   ├── auth/
│   │   ├── jwt-auth.guard.spec.ts
│   │   ├── jwt-payload.dto.spec.ts
│   │   ├── jwt.strategy.spec.ts
│   │   └── public.decorator.spec.ts
│   ├── database/
│   │   ├── loaders/
│   │   │   └── csv-import.loader.spec.ts
│   │   └── mappers/premiacoes/
│   │       └── filme.mapper.spec.ts
│   ├── decorators/
│   │   ├── document-api-endpoint.decorator.spec.ts
│   │   └── jwt.decorator.spec.ts
│   ├── services/
│   │   └── csv-reader.service.spec.ts
│   └── swagger/
│       └── response-schemas.spec.ts
└── shared/
    └── domain/entities/
        ├── database/premiacoes/
        │   └── filme.entity.spec.ts
        ├── input/
        │   └── jwt-payload.entity.spec.ts
        └── output/
            └── resposta.entity.spec.ts
```

---

## Convenções Utilizadas

- Nomes de arquivo: `<nome-do-fonte>.spec.ts`
- Nomes de suite (`describe`): nome da classe ou módulo em destaque
- Nomes de caso (`it`/`test`): descrevem comportamento observável em linguagem clara
- Idioma misto: nomes de classes e campos em inglês (conforme o código); descrições de teste em português
- `beforeEach`: configura o estado inicial de cada teste; nunca compartilha estado entre testes

---

## Padrão AAA

Todos os testes seguem a estrutura **Arrange–Act–Assert**:

```typescript
it('deve calcular previousWin e followingWin corretamente', async () => {
  // Arrange
  const vencedores = [
    new Filme({ year: 1980, producer: 'Prod', winner: true, ... }),
    new Filme({ year: 1985, producer: 'Prod', winner: true, ... }),
  ];
  mockRepo.listarVencedores.mockResolvedValue(vencedores);

  // Act
  const result = await useCase.executar();

  // Assert
  expect(result.dados.min[0].previousWin).toBe(1980);
  expect(result.dados.min[0].followingWin).toBe(1985);
  expect(result.dados.min[0].interval).toBe(5);
});
```

---

## Helpers

### `MockRepositoryBuilderPremiacoes`

**Arquivo:** `test/unit/helpers/index.ts`

Builder estático que retorna um objeto com todos os métodos da interface `IPremiacoesRepository` substituídos por `jest.fn()`:

```typescript
{
  contarRegistros: jest.fn(),
  criarEmLote: jest.fn(),
  listarVencedores: jest.fn(),
}
```

Utilizado por `BuscarIntervalosPremiosUseCase.spec.ts` e `CsvImportLoader.spec.ts`. Centraliza a criação do mock do repositório para evitar repetição e garantir consistência.

---

## Mocks

Os mocks são criados inline nos testes ou via o helper acima. Os padrões utilizados:

**Mock de serviço por objeto literal:**
```typescript
const mockLogger = {
  setContext: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
```

**Mock via NestJS Testing Module:**
```typescript
await Test.createTestingModule({
  providers: [
    BuscarIntervalosPremiosUseCase,
    { provide: 'IPremiacoesRepository', useValue: mockRepo },
    { provide: PinoLogger, useValue: mockLogger },
  ],
}).compile();
```

**Mock de módulo com `jest.mock()`:**

Usado em `csv-reader.service.spec.ts` para interceptar chamadas a `fs/promises`:
```typescript
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));
```

Usado em `jwt.strategy.spec.ts` para substituir `passport-jwt` antes de qualquer import:
```typescript
jest.mock('passport-jwt', () => ({
  ExtractJwt: { fromAuthHeaderAsBearerToken: jest.fn().mockReturnValue(jest.fn()) },
  Strategy: class MockJwtStrategy { name = 'jwt'; },
}));
```

Usado em `jwt-auth.guard.spec.ts` para substituir `@nestjs/passport` antes de qualquer import, evitando a inicialização real do Passport ao criar a classe `JwtAuthGuard`:
```typescript
jest.mock('@nestjs/passport', () => ({
  AuthGuard: (_strategy: string) => {
    class MockPassportAuthGuard {
      canActivate(_ctx: unknown) { return true; }
    }
    return MockPassportAuthGuard;
  },
}));
```

---

## Spies

Em `jwt.decorator.spec.ts`, um spy é usado para cobrir a branch defensiva que nunca é atingida via fluxo normal:

```typescript
jest.spyOn(JwtPayload, 'fromDto').mockReturnValueOnce(null);
```

Isso permite verificar que o `UnauthorizedException` é lançado mesmo quando `fromDto` retorna `null` (embora o código real nunca faça isso).

---

## Casos Cobertos

### `HealthController`

| Caso | Verificação |
|---|---|
| Instanciação | `toBeDefined()` |
| `check()` retorna `status: 'ok'` | Campo `status` |
| `check()` retorna nome do serviço correto | Campo `service` |
| `check()` retorna timestamp ISO válido | `new Date(timestamp).toISOString() === timestamp` |
| Retorno contém todas as chaves esperadas | `arrayContaining(['status', 'timestamp', 'service'])` |

### `BuscarIntervalosPremiosUseCase`

| Caso | Verificação |
|---|---|
| Instanciação e contexto do logger | `setContext` chamado com nome da classe |
| Cálculo correto de min e max com produtores distintos | Producer, interval, statusCode, mensagem |
| Banco vazio → listas vazias | `min: [], max: []` |
| Produtores com apenas uma vitória → listas vazias | `min: [], max: []` |
| Anos fora de ordem → ordenação antes do cálculo | Intervalos corretos de 5 e 10 |
| Empate no min e max → múltiplos produtores em cada array | `toHaveLength(2)` |
| Erro do repositório → propagação + log de erro | `rejects.toThrow`, `mockLogger.error` chamado |
| Logs de INÍCIO e FIM no caminho feliz | `mockLogger.info` com mensagens específicas |
| `previousWin` e `followingWin` calculados corretamente | Valores exatos para intervalo = 5 |

### `PremiacoesController`

| Caso | Verificação |
|---|---|
| Instanciação | `toBeDefined()` |
| Mapeamento de entidade para DTO (campos corretos) | Todos os 4 campos de `ProdutorIntervaloDto` |
| Arrays vazios passados diretamente | `min: [], max: []` |
| Empate → múltiplos itens em min | `toHaveLength(2)` |
| Erro no use case → propagação | `rejects.toThrow` |
| Use case chamado exatamente uma vez | `toHaveBeenCalledTimes(1)` |

### `ProdutorIntervalo` (entity)

| Caso | Verificação |
|---|---|
| Instância com partial vazio | `toBeDefined()` |
| Atribuição de todos os campos obrigatórios | Cada campo individualmente |
| `interval` aceita zero | `0` |
| `interval` aceita valores grandes | `99` |
| `producer` aceita string vazia | `''` |

### `ResultadoIntervalos` (entity)

| Caso | Verificação |
|---|---|
| Instância com partial vazio | `toBeDefined()` |
| Arrays `min` e `max` atribuídos com conteúdo | `toHaveLength(1)` |
| Arrays vazios | `toEqual([])` |
| Múltiplos itens em min e max | `toHaveLength(2)` |
| Campos não fornecidos ficam `undefined` | `toBeUndefined()` |

### `ProdutorIntervaloDto` e `ResultadoIntervalosDto`

Cobrem a criação de instâncias, atribuição de campos e aceitação de valores limítrofes (zero, anos extremos, arrays vazios). Verificam compatibilidade com `ProdutorIntervaloDto` aninhado em `ResultadoIntervalosDto`.

### `FilmeMapper`

| Caso | Verificação |
|---|---|
| `toDomain`: converte `FilmeModel` em `Filme` | `toBeInstanceOf(Filme)` |
| `toDomain`: todos os campos mapeados corretamente | `id`, `year`, `title`, `studios`, `producer`, `winner` |
| `toDomain`: winner `true` e `false` | Ambos os valores |
| `toPersistence`: converte `Filme` em `FilmeModel` | `toBeInstanceOf(FilmeModel)` |
| `toPersistence`: campos mapeados corretamente | `year`, `title`, `studios`, `producer`, `winner` |
| `toPersistence`: `id` não é definido no model | `toBeUndefined()` |

### `CsvImportLoader`

| Caso | Verificação |
|---|---|
| Banco já populado → importação ignorada | `lerArquivo` não chamado; log de "banco já populado" |
| Banco vazio → leitura e persistência | `lerArquivo` e `criarEmLote` chamados |
| Entidades criadas corretamente a partir das linhas | Todos os campos verificados |
| Logs de início e conclusão | Mensagens específicas |
| Caminho do CSV contém `docs/Movielist.csv` | `toContain('docs')` e `toContain('Movielist.csv')` |
| Total de registros logado corretamente | `totalRegistros: 3` |

### `CsvReaderService`

| Caso (`parsearProdutores`) | Verificação |
|---|---|
| Produtor único sem separador | `['Joel Silver']` |
| Separador `, ` (vírgula + espaço) | Dois produtores |
| Separador ` and ` | Dois produtores |
| Separador `,` (sem espaço) | Dois produtores |
| Separadores mistos `, ` e ` and ` | Três produtores |
| Trim de espaços | Sem espaços extras |
| Filtro de strings vazias | `every(p => p.length > 0)` |
| Comportamento com `, and ` (vírgula antes de `and`) | `['A', 'B', 'and C']` (vírgula consome antes) |

| Caso (`lerArquivo`) | Verificação |
|---|---|
| Retorno é array | `Array.isArray` |
| Header ignorado | Nenhum item com `title === 'year'` |
| Ano parseado como número | `typeof year === 'number'` |
| `winner = 'yes'` → `true` | Campo `winner` |
| `winner` ausente ou diferente de 'yes' → `false` | Campo `winner` |
| Campos `studios` e `producer` corretos | Valores exatos |
| Múltiplos produtores → uma linha por produtor | `toHaveLength(2)` |
| CSV com apenas header → array vazio | `toEqual([])` |
| Linhas em branco ignoradas | `toHaveLength(1)` |
| Campos opcionais ausentes na linha → fallback para string vazia | `toEqual([])` |
| `readFile` chamado com o caminho informado | `toHaveBeenCalledWith(path, 'utf-8')` |

### `JwtStrategy`

| Caso | Verificação |
|---|---|
| Instanciação | `toBeDefined()` |
| `JWT_SECRET_KEY` lido da configuração | `getOrThrow` chamado com `'JWT_SECRET_KEY'` |
| `validate` com `sub` válido → retorna `JwtPayloadDto` | `{ sub: 'user-123' }` |
| `validate` sem `sub` → lança `HttpException` | `HttpException` com status `401` |
| `validate` com `sub` como número → lança `HttpException` | `HttpException` |
| `validate` com `sub: null` → lança `HttpException` | `HttpException` |
| Mensagem de erro `'Token inválido'` | `.message === 'Token inválido'` |
| Campos extras no payload são ignorados | `result.sub === 'user-abc'` |

### `JwtAuthGuard`

| Caso | Verificação |
|---|---|
| Instanciação | `toBeDefined()`, `toBeInstanceOf(JwtAuthGuard)` |
| `canActivate` retorna `true` para endpoints `@Public()` | `expect(result).toBe(true)` |
| `canActivate` consulta `IS_PUBLIC_KEY` no handler e na classe | `spy.toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, klass])` |
| `canActivate` delega para `AuthGuard` pai quando não público | `parentSpy.toHaveBeenCalledWith(ctx)` |
| Resultado do `AuthGuard` pai é propagado | `expect(result).toBe(false)` |
| `AuthGuard` pai não é chamado quando `isPublic = true` | `parentSpy.not.toHaveBeenCalled()` |

> `*.guard.ts` é excluído da coleta de cobertura pelo Jest (configurado em `package.json`), mas o teste existe para documentar e verificar o comportamento do guard.

### `@Public()` decorator

| Caso | Verificação |
|---|---|
| `IS_PUBLIC_KEY === 'isPublic'` | Valor exato da constante |
| `Public()` retorna função | `typeof decorator === 'function'` |
| Metadata `isPublic: true` aplicado em classe | `Reflect.getMetadata` |
| Metadata `isPublic: true` aplicado em método | `Reflect.getMetadata` |

### `@JwtExport` decorator

| Caso | Verificação |
|---|---|
| Decorator exportado e definido | `toBeDefined()` |
| Request com usuário válido → retorna `JwtPayload` | `toBeInstanceOf(JwtPayload)` |
| `sub` ausente → propaga erro de `JwtPayload.fromDto` | `toThrow()` |
| `user` undefined no request → lança | `toThrow()` |
| Branch defensiva (`fromDto` retorna `null`) → lança `UnauthorizedException` | `toThrow(UnauthorizedException)` |

### `DocumentApiEndpoint` / `DocumentPublicEndpoint` / `ApiPropertyNumeric`

| Caso | Verificação |
|---|---|
| `summary` vazio → lança erro | Mensagem específica |
| `description` vazia → lança erro | Mensagem específica |
| `successStatus < 100` → lança erro | Mensagem com código informado |
| `successStatus > 599` → lança erro | Mensagem com código informado |
| Status nos limites 100 e 599 → não lança | `not.toThrow()` |
| Chamada válida → retorna função | `typeof decorator === 'function'` |
| `requiresAuth: false` → não lança | `not.toThrow()` |
| `successType` fornecido → não lança | `not.toThrow()` |
| `responseSchema` fornecido → não lança | `not.toThrow()` |
| `bodyType` sem `bodyDescription` → usa fallback | `not.toThrow()` |
| `DocumentPublicEndpoint` com opções válidas → retorna função | `typeof decorator === 'function'` |
| `ApiPropertyNumeric` → retorna decorator com e sem `required` | `typeof decorator === 'function'` |

### `ResponseSchemas` / `getDefaultResponseSchema`

| Caso | Verificação |
|---|---|
| Schema `success` definido com type `object` | `toBe('object')` |
| Schema `success` tem `statusCode`, `mensagem`, `dados` | `toBeDefined()` para cada |
| Schema `created` tem `statusCode` exemplo `201` | Valor exato |
| Schema `simple` não tem `dados` | `toBeUndefined()` |
| Schema `withArray` tem `dados` como array | `toBe('array')` |
| Schema `withArray` tem campos de paginação | Cada campo verificado |
| Schema `noContent` tem `statusCode` exemplo `204` | Valor exato |
| `getDefaultResponseSchema(201)` → schema `created` | Referência ao objeto |
| `getDefaultResponseSchema(204)` → schema `noContent` | Referência ao objeto |
| `getDefaultResponseSchema(200)` → schema `success` | Referência ao objeto |
| `getDefaultResponseSchema(418)` → schema `success` (default) | Referência ao objeto |

### `Filme` (entity)

Cobre criação com todos os campos, `winner` como `true` e `false`, `id` opcional, valores limítrofes (`year: 0`, strings vazias).

### `JwtPayload` (entity)

| Caso | Verificação |
|---|---|
| Construtor com `sub` | `entity.sub === 'user-abc'` |
| `fromDto` com DTO válido → instância correta | `toBeInstanceOf(JwtPayload)` |
| `fromDto` com `sub` vazio → lança `'Campos obrigatórios ausentes'` | `.toThrow()` |
| `fromDto` com `sub: undefined` → lança | `.toThrow()` |

### `Resposta<T>` (entity)

Cobre criação, atribuição de `statusCode` e `mensagem`, campos de paginação opcionais, campo `error`, e que campos não atribuídos ficam `undefined`.

---

## Decisões Técnicas

**Substituição de PinoLogger por mock literal**

O `PinoLogger` do `nestjs-pino` exige um `LoggerModule` ativo para ser injetado corretamente. Nos testes unitários, ele é substituído por um objeto com os métodos `setContext`, `info`, `error` e `warn` como `jest.fn()`. Isso evita a inicialização do módulo de logging e permite assertivas sobre chamadas de log.

**Uso de `jest.mock()` no topo de `csv-reader.service.spec.ts`**

O `fs/promises` é mockado antes de qualquer import para que o `readFile` real nunca seja chamado. Isso torna os testes de leitura de arquivo completamente previsíveis e independentes do sistema de arquivos.

**Mock de `passport-jwt` antes dos imports em `jwt.strategy.spec.ts`**

A `PassportStrategy` exige que a `Strategy` do `passport-jwt` seja uma classe nomeada. O mock é declarado antes dos imports para garantir que o módulo carregado já usa a versão mockada, evitando erros de inicialização do Passport.

**Mock de `@nestjs/passport` antes dos imports em `jwt-auth.guard.spec.ts`**

`JwtAuthGuard extends AuthGuard('jwt')` — a extensão de classe ocorre em tempo de definição do módulo. `AuthGuard('jwt')` é uma factory de `@nestjs/passport` que tenta registrar estratégias Passport. O mock substitui essa factory por uma que retorna uma classe simples e controlada, permitindo testar exclusivamente a lógica `isPublic` do guard sem dependência de Passport ou `JwtStrategy`.

**Captura da factory do `createParamDecorator` em `jwt.decorator.spec.ts`**

O `@JwtExport` usa `createParamDecorator` internamente, cujo callback só é executado durante uma requisição HTTP. Para testar a lógica desse callback sem um servidor rodando, o módulo `@nestjs/common` é mockado para capturar a função factory em uma variável de closure, que é então invocada diretamente nos testes.

**Cobertura de branches defensivas**

Alguns testes cobrem branches de código que não são atingidas pelo fluxo normal (ex: `JwtPayload.fromDto` retornando `null`). Esses testes existem para garantir a cobertura de branches e documentar o comportamento contratual da classe, mesmo que a situação seja teoricamente impossível no fluxo atual.

---

## Benefícios

- **Velocidade:** Sem banco, sem I/O, sem servidor HTTP — a suíte completa executa em segundos
- **Isolamento:** Falhas no banco ou no sistema de arquivos não afetam esses testes
- **Documentação viva:** Cada caso de teste descreve um comportamento esperado da classe
- **Detecção precoce de regressões:** Mudanças na lógica de negócio ou nos contratos são detectadas imediatamente

---

## Como Executar

```bash
# Todos os testes (unitários + integração)
npm test

# Apenas testes unitários (por padrão todos os specs em test/ são executados)
npm test -- --testPathPattern="test/unit"

# Com cobertura
npm run test:cov

# Modo watch
npm run test:watch
```

O relatório HTML de cobertura é gerado em `coverage/lcov-report/index.html`.

---

## Como Criar Novos Testes

1. Criar o arquivo em `test/unit/` no mesmo caminho relativo do arquivo em `src/`
2. Importar a classe a ser testada com o alias `src/...`
3. Substituir todas as dependências injetadas por `jest.fn()` ou objetos literais
4. Usar `Test.createTestingModule` quando a classe usa injeção de dependência do NestJS
5. Para classes simples (entidades, DTOs), instanciar diretamente sem o módulo
6. Limpar mocks no `beforeEach` via `jest.clearAllMocks()` (configurado globalmente em `test/setup.ts`)

Exemplo para um novo use case:

```typescript
describe('NovoUseCase', () => {
  let useCase: NovoUseCase;
  let mockRepo: { metodo: jest.Mock };

  beforeEach(async () => {
    mockRepo = { metodo: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        NovoUseCase,
        { provide: 'INovoRepository', useValue: mockRepo },
        { provide: PinoLogger, useValue: { setContext: jest.fn(), info: jest.fn(), error: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(NovoUseCase);
  });

  it('deve ...', async () => {
    mockRepo.metodo.mockResolvedValue(/* dados */);
    const result = await useCase.executar();
    expect(result).toEqual(/* esperado */);
  });
});
```

---

## Boas Práticas

- Um `describe` por classe; `describe` aninhados por método ou grupo de comportamento
- Cada `it` testa exatamente uma coisa
- Nomes de testes descrevem o comportamento, não a implementação
- Assertivas explícitas: preferir `toBe` e `toEqual` a `toBeTruthy`
- Dados de teste mínimos: usar apenas o que o caso específico precisa
- `mockResolvedValue` e `mockRejectedValue` para promises; `mockReturnValue` para síncronos

---

## Anti-patterns Evitados

- **Testes que testam o mock**: as assertivas verificam o comportamento da unidade, não as chamadas do mock (exceto quando a chamada em si é o comportamento esperado)
- **Estado compartilhado entre testes**: cada `beforeEach` constrói o estado do zero
- **Testes frágeis por acoplamento à implementação**: os testes verificam contratos e resultados, não detalhes internos
- **Mocks incompletos**: o `MockRepositoryBuilderPremiacoes` garante que todos os métodos da interface são mockados

---

## Relação com a Arquitetura do Projeto

Os testes unitários seguem a mesma separação de camadas da aplicação:

- Testes de **controllers** verificam o mapeamento Entidade → DTO e a delegação para use cases
- Testes de **use cases** verificam a lógica de negócio pura via interface de repositório mockada
- Testes de **entidades** verificam a construção e as invariantes dos objetos de domínio
- Testes de **infra** verificam serviços, mappers e estratégias de forma isolada

Nenhum teste unitário importa código de outra camada além da que está testando, respeitando a Dependency Rule da Clean Architecture.

---

## Cobertura Obtida

Dados extraídos do relatório de cobertura gerado por `npm run test:cov`:

| Métrica | Resultado |
|---|---|
| Statements | ~100% (189/189) |
| Functions | 100% (40/40) |
| Branches | ~97% (56/58) |
| Lines | ~100% |

As 2 branches não cobertas pelos unitários são cobertas pelos testes de integração (fluxos que dependem de banco real ou do ciclo de vida do NestJS).

Os thresholds mínimos configurados (`branches: 70%`, `functions: 70%`, `lines: 80%`, `statements: 80%`) são amplamente superados.
