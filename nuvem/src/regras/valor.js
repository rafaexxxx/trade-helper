// Regras de trade portadas do app do Scriptable.
//
// CONVENÇÃO desta pasta (decidida em 2026-11-26):
//   - As regras são COPIADAS de src/*.js (não importadas), só as funções puras.
//   - Cada função copiada diz de onde veio e em qual commit:
//       // copiado de src/arquivo.js (nomeDaFunção) @ <commit>
//   - Se uma regra mudar no app antes da fase Ouro, mude aqui também.
//   - Depois da fase Ouro (painel do Scriptable desligado), esta pasta vira a
//     fonte oficial das regras.

// copiado de src/avaliador.js (valorEfetivo) @ 01d236c
// value base: item com value usa o value (ignora o RAP); sem value, usa o RAP.
export function valorEfetivo(i) {
  return i.value != null ? i.value : i.rap;
}

// adaptado de src/avaliador.js (itemDoCatalogo) @ 01d236c
// Lá ele lê o catálogo "enxuto" do app; aqui lê a linha crua do v2 do Rolimon's:
//   [nome, sigla, rap, value, default_value, demanda, tendência, projected, hyped, rare]
// (-1 = sem dado). Sem rap24/val24: esses vêm dos retratos (armazem.lerRetrato).
export function itemDoRolimons(id, c) {
  if (!c) return null;
  return {
    id: String(id),
    nome: c[0],
    sigla: c[1] || '',
    rap: c[2] >= 0 ? c[2] : 0,
    value: c[3] > 0 ? c[3] : null,
    dem: c[5],
    tend: c[6],
    projected: c[7] === 1,
    hyped: c[8] === 1,
    rare: c[9] === 1,
  };
}
