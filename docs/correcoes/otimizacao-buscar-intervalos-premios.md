# Otimização: buscar-intervalos-premios

## O que estava errado

Olhando o `BuscarIntervalosPremiosUseCase`, identifiquei que o fluxo de cálculo percorria os dados em três etapas separadas:

1. Agrupa os vencedores por produtor
2. Monta um array `todosIntervalos` com todos os objetos `ProdutorIntervalo`
3. Passa esse array para `calcularResultado`, que fazia **6 iterações** sobre ele para encontrar min e max:

```typescript
const menorIntervalo = Math.min(...intervalos.map((i) => i.interval)); // map + spread
const maiorIntervalo = Math.max(...intervalos.map((i) => i.interval)); // map + spread de novo
min: intervalos.filter((i) => i.interval === menorIntervalo),          // filter
max: intervalos.filter((i) => i.interval === maiorIntervalo),          // filter
```

Dois problemas aqui. O primeiro é o array `todosIntervalos` em si — ele acumula todos os objetos calculados só para passá-los adiante, o que é memória desnecessária. O segundo é que `calcularResultado` recebia esse array pronto e ainda assim percorria tudo 6 vezes para chegar a um resultado que dá para calcular em uma passagem só.

Tem um terceiro problema menor: `Math.min(...array.map(...))` com spread em arrays grandes pode estourar a call stack, porque cada elemento vira um argumento de função.

## Como corrigi

Fundir as etapas 2 e 3 em uma única varredura. `calcularResultado` passa a receber o `Map<string, number[]>` diretamente e, no mesmo loop que calcula os intervalos consecutivos, já decide se o item entra no min, no max, ou em nenhum:

```typescript
for (let i = 1; i < anos.length; i++) {
  const interval = anos[i] - anos[i - 1];
  const item = new ProdutorIntervalo({ ... });

  if (interval < minInterval) {
    minInterval = interval;
    minItems.length = 0; // descarta candidatos anteriores sem realocar
    minItems.push(item);
  } else if (interval === minInterval) {
    minItems.push(item);
  }

  // mesma lógica para max
}
```

Com isso, `todosIntervalos` desaparece completamente. Os objetos que não são min nem max nunca chegam a ser acumulados — são criados, avaliados e descartados na hora. Extraí também o agrupamento em `agruparPorProdutor()` para deixar `executar()` mais limpo.

## Resultado

Antes eram 3 fases de loop com 6 passagens extras sobre os intervalos. Agora são 2 fases, e a busca por min/max acontece junto com o cálculo dos intervalos — zero passagens extras.

Build passando, testes passando, cobertura 100% no use case, nenhum contrato público alterado.
