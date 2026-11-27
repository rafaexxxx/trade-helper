// Regras do Inventário (Vitrine) portadas do app do Scriptable.
// Mesma convenção de regras/valor.js: COPIADAS (não importadas), cada uma com
// a origem e o commit. Se mudar no app antes da fase Ouro, mude aqui também.

// copiado de src/config.js (LIMITE_MUDANCA_PCT, LIMITE_RAP_VALUE_PCT, CARTAO_DEMANDA_VENDAS) @ e21d9e4
export const LIMITE_MUDANCA_PCT = 5; // seta ▲▼ no item a partir desta variação em 24h
export const LIMITE_RAP_VALUE_PCT = 5; // etiqueta "RAP x% acima/abaixo do value"
export const DEMANDA_VENDAS = [0.3, 1, 3, 10]; // limites de Baixa, Normal, Alta e Incrível

// copiado de src/analise.js (DEMANDA_CURTA, fmtPct) @ e21d9e4
export const DEMANDA_CURTA = { '-1': '—', 0: 'Terrível', 1: 'Baixa', 2: 'Normal', 3: 'Alta', 4: 'Incrível' };
export function fmtPct(p) {
  return p.toFixed(1).replace('.', ',') + '%';
}

// copiado de src/html.js (pct) @ e21d9e4
export function pct(antes, depois) {
  return antes ? ((depois - antes) / antes) * 100 : null;
}

// copiado de src/html.js (corDemanda) @ e21d9e4
export function corDemanda(d) {
  if (d === 0) return 'neg';
  if (d === 1) return 'warn';
  if (d >= 3) return 'pos';
  return '';
}

// copiado de src/cartao.js (demandaPorVendas, fmtVendas, cor da linha) @ e21d9e4
export function demandaPorVendas(v) {
  let d = 0;
  for (const l of DEMANDA_VENDAS) if (v >= l) d++;
  return d;
}
export function fmtVendas(v) {
  const casas = v >= 10 ? 0 : v >= 1 ? 1 : 2;
  return String(Number(v.toFixed(casas))).replace('.', ',') + '/dia';
}
export function corVendas(v) {
  const n = demandaPorVendas(v);
  return n === 0 ? 'neg' : n === 1 ? 'warn' : n >= 3 ? 'pos' : '';
}

// adaptado de src/analise.js (encontrarRiscos) + src/html.js (etiqueta) @ e21d9e4
// Só as "pílulas": alertas que não aparecem em outro lugar do cartão.
// Devolve [[texto, cor], ...]. Item = saída de regras/valor.itemDoRolimons.
export function pilulas(i) {
  const p = [];
  if (i.projected) p.push(['Projected', 'neg']);
  if (i.value != null && i.value > 0) {
    const d = pct(i.value, i.rap);
    if (Math.abs(d) >= LIMITE_RAP_VALUE_PCT) {
      p.push(['RAP ' + fmtPct(Math.abs(d)) + (d > 0 ? ' acima' : ' abaixo') + ' do value', 'sub']);
    }
  }
  return p;
}

// adaptado de src/html.js (extrasItem) @ e21d9e4. Sem o serial: o Rolimon's não manda.
export function extras(i) {
  const x = [];
  if (i.hyped) x.push('hyped');
  if (i.rare) x.push('rare');
  return x.join(' · ');
}

// adaptado de src/html.js (periodoReal) @ e21d9e4
// "em 24h" quase sempre; "em Nh" no começo do histórico.
export function periodoReal(emBase, agora) {
  if (!emBase) return null;
  const h = (agora - emBase) / 3600000;
  if (h >= 20 && h <= 30) return 'em 24h';
  return 'em ' + Math.max(1, Math.round(h)) + 'h';
}
