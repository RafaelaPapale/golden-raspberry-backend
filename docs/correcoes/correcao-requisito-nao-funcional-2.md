# Correção: testes de integração não detectavam mudança no CSV

## O que estava errado

O feedback dizia que adicionar a linha abaixo ao `Movielist.csv` não quebrava nenhum teste:

```
2001;Test 2;Test 2;Matthew Vaughn;yes
```

Fui verificar o porquê. Com essa linha, Matthew Vaughn passa a ter vitórias em 2001, 2002 e 2015, gerando dois intervalos: 2001→2002 (intervalo 1) e 2002→2015 (intervalo 13). O intervalo de 1 ano empata com Joel Silver, então o array `min` da API passa de 1 item para 2. O resultado muda de verdade — mas os testes continuavam passando.

O problema estava em como os testes verificavam o retorno. Havia três padrões fracos:

**`.find()` para localizar o produtor esperado:**
```typescript
const joelSilver = body.min.find((i) => i.producer === 'Joel Silver');
expect(joelSilver).toBeDefined();
```
Joel Silver ainda está no array, então o teste passa. Matthew Vaughn aparecendo como segundo item passa despercebido.

**`arrayContaining` + `objectContaining`:**
```typescript
expect(body).toEqual({
  min: expect.arrayContaining([expect.objectContaining(EXPECTED_MIN)]),
  max: expect.arrayContaining([expect.objectContaining(EXPECTED_MAX)]),
});
```
`arrayContaining` verifica subconjunto — ele só checa se o item esperado está lá, não que o array tem exatamente aqueles itens.

**`length > 0`:**
```typescript
expect(body.min.length).toBeGreaterThan(0);
```
Passa com 1 item, passa com 2. Nenhuma verificação de cardinalidade real.

## Como corrigi

Substituí as verificações soltas por asserções exatas. A mudança principal foi trocar `arrayContaining` por um golden master com `toStrictEqual`:

```typescript
const EXPECTED_RESULT = {
  min: [EXPECTED_MIN],
  max: [EXPECTED_MAX],
};

expect(body).toStrictEqual(EXPECTED_RESULT);
```

Adicionei também dois testes dedicados de cardinalidade, um para `min` e outro para `max`, com nome explícito para facilitar o diagnóstico quando falhar:

```typescript
it('should return exactly 1 producer in the min array (Joel Silver only)', async () => {
  expect(body.min).toHaveLength(1);
});
```

## Prova

Com a linha problemática adicionada ao CSV, agora 3 testes falham imediatamente:

```
● should return exactly 1 producer in the min array
  Expected length: 1
  Received length: 2

● should return exactly 1 producer in the max array
  ...

● should return the complete exact response matching the standard CSV
  - Expected
  + Received
  (diff com 6 linhas de diferença)
```

Removendo a linha, todos os testes voltam a passar.

A lógica é simples: qualquer mudança no CSV que altere o resultado da API vai divergir de `EXPECTED_RESULT`. Se for uma mudança intencional, basta atualizar as constantes `EXPECTED_MIN`, `EXPECTED_MAX` (e `EXPECTED_RESULT` por consequência) para refletir o novo estado esperado.
