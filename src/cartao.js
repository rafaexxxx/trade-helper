// Tela do item (v6.10; o card nasceu na v6.9), no estilo dos bots de trade do Discord.
// Ao tocar num item (Inventário, das duas contas, e Avaliar), abre uma tela cheia
// só dele. A página pede os dados pela ponte (PONTE + 'cartao?id=<assetId>'); o
// Scriptable busca a página do item no Rolimon's (no toque, ou usa a que a fila
// da linha buscou há até CARTAO_CACHE_MIN), faz as contas aqui e devolve tudo
// pronto. A página só desenha.
// v6.11: a fila do painel.js busca as páginas por trás para a linha do
// Inventário (vendas/dia e Best Price) e guarda no iPhone (lerGuardados...).
//
// Ordem da tela (aprovada pelo Rafael):
// 1. Gráfico do RAP dos últimos CARTAO_DIAS dias (1 ponto por dia).
// 2. OP para dar | OP para pedir: réguas do veredito × demanda do item.
// 3. Best Price | Depois da venda: RAP + (Best − RAP) / 10 (regra do Roblox).
// 4. Vendas por dia | Demanda (do Rolimon's ou, sem ela, estimada pelas vendas).
// 5. Alertas e mudanças em 24h (do Inventário). 6. Links e, no Avaliar, Remover.
// v6.10: o RSI-21 saiu (não ajudava na decisão).
const cfg = require('config');
const a = require('analise');
const api = require('api');

// ---------- Leitura da página do Rolimon's ----------
// Valor de "var <nome> = ...;" no script da página: objeto/lista (pelo par de
// chaves, respeitando textos entre aspas) ou número/texto até o ";".
// undefined = a variável não existe; null = existe, mas não deu para ler.
function extrairVar(texto, nome) {
  const m = new RegExp('var\\s+' + nome + '\\s*=\\s*').exec(texto);
  if (!m) return undefined;
  const i = m.index + m[0].length;
  const c = texto.charAt(i);
  if (c === '{' || c === '[') {
    let prof = 0;
    let aspas = null;
    let barra = false;
    for (let j = i; j < texto.length; j++) {
      const ch = texto.charAt(j);
      if (aspas) {
        if (barra) barra = false;
        else if (ch === '\\') barra = true;
        else if (ch === aspas) aspas = null;
        continue;
      }
      if (ch === '"' || ch === "'") aspas = ch;
      else if (ch === '{' || ch === '[') prof++;
      else if (ch === '}' || ch === ']') {
        prof--;
        if (prof === 0) {
          try {
            return JSON.parse(texto.slice(i, j + 1));
          } catch (e) {
            return null;
          }
        }
      }
    }
    return null;
  }
  let fim = texto.length;
  for (const sep of [';', '\n', '<']) {
    const k = texto.indexOf(sep, i);
    if (k >= 0 && k < fim) fim = k;
  }
  const bruto = texto.slice(i, fim).trim().replace(/^["']|["']$/g, '');
  const n = Number(bruto);
  return bruto !== '' && isFinite(n) ? n : bruto || null;
}

// Série [[tempo em ms, RAP], ...] do history_data, em ordem de tempo.
// Aceita { timestamp: [...], rap: [...] } (o formato visto no iPhone) ou [[t, rap], ...].
function serieDoHistorico(h) {
  const s = [];
  function por(t, v) {
    t = Number(t);
    v = Number(v);
    // RAP 0, -1 ou vazio (null vira 0) = ponto sem dado: fica de fora.
    if (!(t > 0) || !(v > 0)) return;
    s.push([t < 1e12 ? t * 1000 : t, v]);
  }
  if (Array.isArray(h)) {
    for (const p of h) if (Array.isArray(p)) por(p[0], p[1]);
  } else if (h && typeof h === 'object') {
    const tempos = h.timestamp || h.timestamps || h.time || h.t;
    const raps = h.rap || h.raps;
    if (!Array.isArray(tempos) || !Array.isArray(raps)) return null;
    const n = Math.min(tempos.length, raps.length);
    for (let k = 0; k < n; k++) por(tempos[k], raps[k]);
  } else {
    return null;
  }
  s.sort((x, y) => x[0] - y[0]);
  return s.length ? s : null;
}

// v6.10: 1 ponto por dia (o último de cada dia, no fuso do iPhone). Os dias
// recentes vêm com vários pontos, e a linha ficava serrilhada no fim.
function porDia(serie) {
  const mapa = {};
  const ordem = [];
  for (const p of serie) {
    const d = new Date(p[0]);
    const k = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
    if (!(k in mapa)) ordem.push(k);
    mapa[k] = p;
  }
  return ordem.map((k) => mapa[k]);
}

// Últimos `dias` (com o ponto anterior, para a linha começar na borda).
function recortar(serie, dias) {
  const desde = Date.now() - dias * 86400000;
  let ini = serie.findIndex((p) => p[0] >= desde);
  if (ini < 0) ini = serie.length - 1;
  if (ini > 0) ini--;
  return serie.slice(ini);
}

// Último best price da lista do history_data (se houver).
function ultimoBest(h) {
  const l = h && !Array.isArray(h) && typeof h === 'object' ? h.best_price : null;
  if (!Array.isArray(l)) return null;
  for (let k = l.length - 1; k >= 0; k--) if (Number(l[k]) > 0) return Number(l[k]);
  return null;
}

// ---------- Contas ----------
// v6.10: demanda estimada pelas vendas por dia (só quando o Rolimon's não tem
// demanda, o que acontece com item sem value). CARTAO_DEMANDA_VENDAS = limites
// de Baixa, Normal, Alta e Incrível; abaixo do primeiro = Terrível.
function demandaPorVendas(v) {
  const limites = cfg.CARTAO_DEMANDA_VENDAS;
  let d = 0;
  for (const l of limites) if (v >= l) d++;
  return d;
}

// OP do item sobre o value base (value; sem value = RAP).
// dar = quanto pagar a mais para PEGAR o item (seu upgrade);
// pedir = quanto pedir a mais quando você DÁ o item (seu downgrade).
// v6.12: a conta ficou pura (R = reguaOp()) porque também roda na página do
// Avaliar (injetada por toString: não pode usar nada de fora dela).
function opFaixas(base, demanda, R) {
  var mult = R.mult && typeof R.mult[demanda] === 'number' ? R.mult[demanda] : 1;
  var dar = [0, -R.up[3] * mult];
  var pedir = [R.down[2] * mult, R.down[3] * mult];
  function robux(l) {
    return l.map(function (p) {
      var r = (base * p) / 100;
      return base >= 1000 ? Math.round(r / 10) * 10 : Math.round(r);
    });
  }
  return { base: base, mult: mult, dar: { pct: dar, robux: robux(dar) }, pedir: { pct: pedir, robux: robux(pedir) } };
}

function reguaOp() {
  return { up: cfg.VEREDITO_UPGRADE_PCT, down: cfg.VEREDITO_DOWNGRADE_PCT, mult: cfg.CARTAO_OP_DEMANDA_MULT || {} };
}

function opDoItem(base, demanda) {
  return opFaixas(base, demanda, reguaOp());
}

function kb(texto) {
  return Math.round((texto.length / 1024) * 10) / 10;
}

// v6.11: a parte que sai da página do Rolimon's, separada para servir também a
// linha do Inventário (e ser guardada no iPhone). Nunca lança erro.
// { id, em, paginaOk, status, erroPagina, best, vendasDia, serie, diag, faltou }
async function lerPagina(assetId) {
  const id = String(assetId);
  const pag = { id, em: Date.now(), paginaOk: false, status: 0, erroPagina: null, best: null, vendasDia: null, serie: null, diag: [], faltou: [] };
  let texto = null;
  try {
    const p = await api.buscarPaginaItem(id);
    texto = p.texto;
    pag.paginaOk = true;
    pag.status = p.status;
    pag.diag.push("Rolimon's HTTP " + p.status + ' · ' + kb(texto) + ' KB · ' + p.ms + ' ms');
  } catch (e) {
    pag.status = e.status || 0;
    pag.erroPagina = e.message || String(e);
    pag.diag.push("Rolimon's: " + pag.erroPagina);
    return pag;
  }

  const hist = extrairVar(texto, 'history_data');
  const det = extrairVar(texto, 'item_details_data');
  const vend = extrairVar(texto, 'avg_daily_sales_volume_30_days');

  // Best price: item_details_data, depois o "best_price": N da página, depois o histórico.
  let best = det && typeof det === 'object' && !Array.isArray(det) ? Number(det.best_price) : NaN;
  if (!(best > 0)) {
    const m = /"best_price"\s*:\s*(\d+)/.exec(texto);
    best = m ? Number(m[1]) : NaN;
  }
  if (!(best > 0)) best = ultimoBest(hist) || NaN;
  if (best > 0) pag.best = best;

  if (typeof vend === 'number' && vend >= 0) pag.vendasDia = Math.round(vend * 100) / 100;
  else pag.faltou.push('vendas/dia (' + (vend === undefined ? 'variável sumiu' : 'formato: ' + String(vend).slice(0, 30)) + ')');

  const serie = serieDoHistorico(hist);
  if (serie && serie.length >= 2) {
    const dias = porDia(serie);
    pag.serie = recortar(dias, cfg.CARTAO_DIAS);
    pag.diag.push('histórico ' + serie.length + ' pontos, ' + dias.length + ' dias (' + pag.serie.length + ' no gráfico)');
  } else {
    const chaves = hist && typeof hist === 'object' ? Object.keys(hist).slice(0, 12).join(', ') : String(hist);
    pag.faltou.push('histórico (' + (hist === undefined ? 'variável sumiu' : 'campos: ' + chaves) + ')');
  }
  return pag;
}

// Monta os dados da tela de um item. Nunca lança erro: o que faltar vai em
// `faltou` (a tela mostra "sem dado" naquele bloco) e o resumo vai em `diag`.
// v6.11: `pag` = o que lerPagina devolveu (buscado agora ou guardado); sem ele,
// a página é buscada aqui.
async function carregar(assetId, rolimons, pag) {
  const id = String(assetId);
  const linha = rolimons ? rolimons[id] : null;
  const rap = Array.isArray(linha) && typeof linha[2] === 'number' && linha[2] >= 0 ? linha[2] : null;
  const value = Array.isArray(linha) && typeof linha[3] === 'number' && linha[3] > 0 ? linha[3] : null;
  const demCatalogo = Array.isArray(linha) && typeof linha[5] === 'number' ? linha[5] : -1;
  const base = value != null ? value : rap;
  const res = {
    id,
    em: Date.now(),
    op: null,
    semValue: value == null,
    rap,
    vendasN: -1,
    demandaN: -1,
    demanda: null,
    demandaEstimada: false,
    best: null,
    bestFonte: null,
    depois: null,
    vendasDia: null,
    serie: null,
    dias: cfg.CARTAO_DIAS,
    faltou: [],
    diag: [],
    paginaOk: false,
  };

  if (!pag) pag = await lerPagina(id);
  res.paginaOk = !!pag.paginaOk;
  if (pag.erroPagina) res.erroPagina = pag.erroPagina;
  res.diag = res.diag.concat(pag.diag || []);
  res.faltou = res.faltou.concat(pag.faltou || []);
  if (pag.best > 0) {
    res.best = pag.best;
    res.bestFonte = "Rolimon's";
  }
  if (typeof pag.vendasDia === 'number') res.vendasDia = pag.vendasDia;
  if (pag.serie && pag.serie.length >= 2) res.serie = pag.serie;

  // Reserva do Best Price: Roblox.
  if (!res.best) {
    try {
      const r = await api.buscarMenorPreco(id);
      res.best = r.preco;
      res.bestFonte = 'Roblox';
      res.diag.push('Best Price pelo Roblox · ' + r.ms + ' ms');
    } catch (e) {
      res.faltou.push('Best Price (' + (e.message || e) + ')');
    }
  }
  if (res.best && rap != null) res.depois = Math.round(rap + (res.best - rap) / 10);

  // Demanda: a do Rolimon's; sem ela, a estimada pelas vendas por dia.
  // vendasN (mesma escala 0..4) só colore as vendas por dia na tela.
  if (res.vendasDia != null) res.vendasN = demandaPorVendas(res.vendasDia);
  let dem = demCatalogo;
  if (dem < 0 && res.vendasDia != null) {
    dem = res.vendasN;
    res.demandaEstimada = true;
  }
  res.demandaN = dem;
  res.demanda = dem >= 0 ? a.rotuloDemanda(dem) : null;
  if (base > 0) res.op = opDoItem(base, dem);

  if (res.faltou.length) res.diag.push('faltou: ' + res.faltou.join('; '));
  return res;
}

// ---------- v6.11: o que fica guardado no iPhone (dados/cartoes.json) ----------
// { v: 1, itens: { <assetId>: { p, b, semRbx } } }
// p = a página do Rolimon's lida (lerPagina, só quando respondeu);
// b = { em, preco, fonte } = o último Best Price (do Rolimon's ou do Roblox);
// semRbx = quando o Roblox respondeu sem preço (item clássico ou ninguém vendendo).
const ARQ = 'cartoes';

function lerGuardados(store) {
  let g = null;
  try {
    g = store.ler(ARQ);
  } catch (e) {
    g = null;
  }
  if (!g || g.v !== 1 || !g.itens || typeof g.itens !== 'object') g = { v: 1, itens: {} };
  // Tira o que não aparece há CARTAO_LINHA_GUARDA_DIAS (itens trocados).
  const limite = Date.now() - cfg.CARTAO_LINHA_GUARDA_DIAS * 86400000;
  for (const id of Object.keys(g.itens)) {
    const e = g.itens[id] || {};
    const ultimo = Math.max((e.p && e.p.em) || 0, (e.b && e.b.em) || 0, e.semRbx || 0);
    if (ultimo < limite) delete g.itens[id];
  }
  return g;
}

function gravarGuardados(store, g) {
  store.gravar(ARQ, g);
}

function entrada(g, id) {
  id = String(id);
  if (!g.itens[id]) g.itens[id] = {};
  return g.itens[id];
}

// Guarda a página lida (só quando respondeu). O Best dela vira o Best da linha.
function guardarPagina(g, pag) {
  if (!pag || !pag.paginaOk) return;
  const e = entrada(g, pag.id);
  e.p = { id: pag.id, em: pag.em, paginaOk: true, status: pag.status, best: pag.best, vendasDia: pag.vendasDia, serie: pag.serie, diag: pag.diag, faltou: pag.faltou };
  if (pag.best > 0) e.b = { em: pag.em, preco: pag.best, fonte: "Rolimon's" };
}

function guardarBest(g, id, preco, fonte) {
  if (!(preco > 0)) return;
  entrada(g, id).b = { em: Date.now(), preco, fonte };
}

// A página guardada, se tiver até `maxMin` minutos (para a tela do item abrir na hora).
function paginaGuardada(g, id, maxMin) {
  const e = g.itens[String(id)];
  const p = e && e.p;
  if (!p || Date.now() - p.em > maxMin * 60000) return null;
  const min = Math.max(0, Math.round((Date.now() - p.em) / 60000));
  return Object.assign({}, p, { diag: ['página guardada há ' + min + ' min (' + ((p.diag || [])[0] || '') + ')'].concat((p.diag || []).slice(1)) });
}

// "15/dia", "2,5/dia", "0,25/dia".
function fmtVendas(v) {
  const casas = v >= 10 ? 0 : v >= 1 ? 1 : 2;
  return String(Number(v.toFixed(casas))).replace('.', ',') + '/dia';
}

// O que a linha do Inventário mostra. Usa o último guardado, mesmo velho
// (decisão do Rafael); sem nada guardado = null (a linha fica como antes).
// c = cor pela mesma escala da demanda (0 terrível .. 4 incrível).
function linha(g, id) {
  const e = g.itens[String(id)];
  if (!e) return null;
  const v = e.p && typeof e.p.vendasDia === 'number' ? e.p.vendasDia : null;
  const b = e.b && e.b.preco > 0 ? e.b.preco : null;
  if (v == null && b == null) return null;
  const n = v != null ? demandaPorVendas(v) : -1;
  return {
    v,
    c: n === 0 ? 'neg' : n === 1 ? 'warn' : n >= 3 ? 'pos' : '',
    tv: v != null ? fmtVendas(v) : null,
    tb: b != null ? a.fmtNum(b) : null,
  };
}

// Mapa { assetId: linha } dos itens de uma lista (para desenhar na abertura).
function linhas(g, itens) {
  const r = {};
  for (const i of itens || []) {
    const id = String(i.assetId);
    if (id in r) continue;
    const l = linha(g, id);
    if (l) r[id] = l;
  }
  return r;
}

// ---------- Página ----------
// A tela do item (uma só, usada pelo Inventário e pelo Avaliar). Fica no fim do <body>.
function tela() {
  return (
    '<div id="tela-item" class="ti oculto" role="dialog" aria-modal="true" aria-labelledby="ti-nome">' +
    // v6.10.1: em cima só o item; o Voltar foi para uma barra fixa embaixo
    // (no topo ele ficava colado no "Close" do Scriptable).
    '<div class="ti-barra"><div class="ti-titulo"><img class="thumb oculto" id="ti-thumb" alt=""><b id="ti-nome"></b></div></div>' +
    '<div class="ti-corpo">' +
    '<div id="ti-card"></div>' +
    '<div id="ti-alertas" class="ti-bloco oculto"></div>' +
    '<div id="ti-mud" class="ti-bloco oculto"></div>' +
    '<div class="ti-links"><a class="ti-acao" id="ti-rol" href="#">Ver no Rolimon\'s</a><a class="ti-acao" id="ti-rbx" href="#">Ver no Roblox</a></div>' +
    '<button type="button" class="ti-acao ti-perigo oculto" id="ti-remover">Remover da proposta</button>' +
    '</div>' +
    '<div class="ti-pe"><button type="button" class="ti-voltar" id="ti-voltar">‹ Voltar</button></div>' +
    '</div>'
  );
}

function css() {
  return `
.ti{position:fixed;top:0;left:0;right:0;bottom:0;z-index:45;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;background:var(--bg);color:var(--fg)}
html.ti-aberta,html.ti-aberta body{overflow:hidden}
.ti-barra{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:10px;padding:max(12px,env(safe-area-inset-top)) 16px 12px;background:var(--bg);border-bottom:1px solid var(--borda)}
.ti-titulo{flex:1;min-width:0;display:flex;align-items:center;gap:10px}
.ti-pe{position:fixed;left:0;right:0;bottom:0;z-index:3;padding:10px 16px max(12px,env(safe-area-inset-bottom));background:var(--bg);border-top:1px solid var(--borda)}
.ti-voltar{display:block;width:100%;max-width:640px;margin:0 auto;padding:14px 16px;border-radius:14px;border:1px solid var(--card-borda);background:var(--card2);font:inherit;font-size:17px;font-weight:700;color:var(--acc-t);-webkit-tap-highlight-color:transparent}
.ti-voltar:active{opacity:.7}
.ti-titulo .thumb{flex:none;width:34px;height:34px;border-radius:9px}
.ti-titulo b{min-width:0;font-size:16px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ti-corpo{display:flex;flex-direction:column;gap:12px;max-width:640px;margin:0 auto;padding:14px 16px calc(96px + env(safe-area-inset-bottom))}
#ti-card{display:flex;flex-direction:column;gap:10px}
.ti-graf{display:flex;flex-direction:column;gap:6px;padding:12px 12px 8px;border-radius:16px;background:var(--card);border:1px solid var(--card-borda)}
.ti-graf small{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sub)}
.ti-graf svg{display:block;width:100%;height:auto;overflow:visible}
.ti-grade{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ct-c{display:flex;flex-direction:column;gap:2px;min-width:0;padding:10px 12px;border-radius:14px;background:var(--card);border:1px solid var(--card-borda)}
.ct-c small{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sub)}
.ct-c b{font-size:19px;font-weight:700;font-variant-numeric:tabular-nums}
.ct-c span{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.ct-c em{font-style:normal;font-size:11px;line-height:1.3;color:var(--sub)}
.ct-c i{font-style:normal}
:is(.ct-c,.ct-nota,.ti-leg) .pos{color:var(--pos)}
:is(.ct-c,.ct-nota,.ti-leg) .warn{color:var(--warn)}
:is(.ct-c,.ct-nota,.ti-leg) .neg{color:var(--neg)}
.ct-c .rap{color:var(--rap)}
.ct-c .sem{font-size:15px;font-weight:600;color:var(--sub)}
.ct-nota{font-size:12px;line-height:1.4;color:var(--sub)}
.ct-nota b{font-weight:700}
.ti-leg{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding-top:8px;border-top:1px solid var(--borda)}
.ti-leg span{display:flex;flex-direction:column;gap:1px;min-width:0}
.ti-leg small{font-size:10px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;color:var(--sub);white-space:nowrap}
.ti-leg b{font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.ct-esq{height:150px;border-radius:16px;background:var(--card);opacity:.6}
.ti-bloco{display:flex;flex-direction:column;gap:8px;padding:12px 14px;border-radius:16px;background:var(--card);border:1px solid var(--card-borda)}
.ti-bloco h3{margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--sub)}
.ti-links{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ti-acao{display:block;width:100%;padding:13px 8px;border-radius:14px;border:1px solid var(--card-borda);background:var(--card);font:inherit;font-size:15px;font-weight:600;text-align:center;text-decoration:none;color:var(--acc-t);-webkit-tap-highlight-color:transparent}
.ti-acao:active{background:var(--card2)}
.ti-perigo{color:var(--neg)}
#diag-cartao{white-space:pre-wrap;overflow-wrap:anywhere}
`;
}

// Roda na página (injetada por toString: não pode usar nada de fora dela).
// window.thItem.abrir({ id, nome, thumb, alertas, mudancas, tituloMud, remover })
// alertas/mudancas = [[texto, classe]]; remover = função (só no Avaliar).
function paginaItem(PONTE) {
  var atual = null;
  var timer = null;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return Math.round(n).toLocaleString('pt-BR'); }
  function pct(p) { return (Math.round(p * 10) / 10).toLocaleString('pt-BR'); }
  function faixa(l, f) { return l[0] === l[1] ? f(l[0]) : f(l[0]) + '–' + f(l[1]); }
  function caixa(rot, valor, linha2, nota) {
    return '<div class="ct-c"><small>' + rot + '</small>' + valor +
      (linha2 ? '<span>' + linha2 + '</span>' : '') + (nota ? '<em>' + nota + '</em>' : '') + '</div>';
  }
  var SEM = '<b class="sem">sem dado</b>';

  function dataCurta(t) {
    var d = new Date(t);
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
  }

  // Gráfico do RAP: área + linha, linhas tracejadas no maior e no menor RAP, o
  // ponto de hoje no fim e as datas do começo, do meio e do fim embaixo.
  // v6.10.1: os números saíram de dentro do gráfico (se atravessavam) e foram
  // para a legenda colorida logo abaixo (legenda()).
  function grafico(serie) {
    var W = 320, H = 132, E = 2, BAIXO = H + 18;
    var t0 = serie[0][0], t1 = serie[serie.length - 1][0];
    var min = Infinity, max = -Infinity;
    serie.forEach(function (p) { if (p[1] < min) min = p[1]; if (p[1] > max) max = p[1]; });
    var lo = min, hi = max;
    if (hi === lo) { hi += 1; lo -= 1; }
    function x(t) { return t1 === t0 ? W - E : E + ((t - t0) / (t1 - t0)) * (W - 2 * E); }
    function y(v) { return 8 + (1 - (v - lo) / (hi - lo)) * (H - 16); }
    var linha = '';
    serie.forEach(function (p, k) { linha += (k ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1); });
    var area = linha + 'L' + x(t1).toFixed(1) + ' ' + H + 'L' + x(t0).toFixed(1) + ' ' + H + 'Z';
    var ult = serie[serie.length - 1];
    var tm = t0 + (t1 - t0) / 2;
    // Cores por style (var() em atributo de SVG não é garantido no WebKit).
    var txt = 'font-size="10" style="fill:var(--sub)"';
    return '<svg viewBox="0 0 ' + W + ' ' + BAIXO + '" role="img" aria-label="Gráfico do RAP">' +
      '<line x1="0" x2="' + W + '" y1="' + y(max).toFixed(1) + '" y2="' + y(max).toFixed(1) + '" style="stroke:var(--pos);opacity:.55" stroke-dasharray="3 3"/>' +
      '<line x1="0" x2="' + W + '" y1="' + y(min).toFixed(1) + '" y2="' + y(min).toFixed(1) + '" style="stroke:var(--neg);opacity:.55" stroke-dasharray="3 3"/>' +
      '<path d="' + area + '" style="fill:var(--acc-t);opacity:.12"/>' +
      '<path d="' + linha + '" style="fill:none;stroke:var(--acc-t)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + x(ult[0]).toFixed(1) + '" cy="' + y(ult[1]).toFixed(1) + '" r="4" style="fill:var(--acc-t);stroke:var(--card)" stroke-width="2"/>' +
      '<text x="' + E + '" y="' + (BAIXO - 1) + '" ' + txt + '>' + dataCurta(t0) + '</text>' +
      '<text x="' + (W / 2) + '" y="' + (BAIXO - 1) + '" text-anchor="middle" ' + txt + '>' + dataCurta(tm) + '</text>' +
      '<text x="' + (W - E) + '" y="' + (BAIXO - 1) + '" text-anchor="end" ' + txt + '>' + dataCurta(t1) + '</text>' +
      '</svg>';
  }

  // Legenda do gráfico: maior (verde), menor (vermelho), hoje e a variação no período.
  function legenda(serie, dias) {
    var min = Infinity, max = -Infinity;
    serie.forEach(function (p) { if (p[1] < min) min = p[1]; if (p[1] > max) max = p[1]; });
    var hoje = serie[serie.length - 1][1];
    var ini = serie[0][1];
    var v = ini > 0 ? ((hoje - ini) / ini) * 100 : 0;
    var cv = v > 0.05 ? 'pos' : v < -0.05 ? 'neg' : '';
    var sv = v > 0.05 ? '▲ +' : v < -0.05 ? '▼ −' : '';
    return '<div class="ti-leg">' +
      '<span><small>Maior</small><b class="pos">' + num(max) + '</b></span>' +
      '<span><small>Menor</small><b class="neg">' + num(min) + '</b></span>' +
      '<span><small>Hoje</small><b>' + num(hoje) + '</b></span>' +
      '<span><small>Em ' + dias + ' dias</small><b class="' + cv + '">' + sv + pct(Math.abs(v)) + '%</b></span>' +
      '</div>';
  }

  // 0 terrível .. 4 incrível (a mesma escala serve para as vendas por dia).
  function corDemanda(d) { return d === 0 ? 'neg' : d === 1 ? 'warn' : d >= 3 ? 'pos' : ''; }

  function desenhar(res) {
    if (res.erro) return '<div class="ct-nota">Não consegui buscar os dados do item (' + esc(res.erro) + ').</div>';
    var h = '';
    if (res.serie && res.serie.length >= 2) {
      h += '<div class="ti-graf"><small>RAP em ' + res.dias + ' dias</small>' + grafico(res.serie) + legenda(res.serie, res.dias) + '</div>';
    } else {
      h += '<div class="ct-nota">' + (res.paginaOk ? 'Sem histórico do RAP para o gráfico.' :
        'A página do item no Rolimon\'s não respondeu (' + esc(res.erroPagina || '') + ').') + '</div>';
    }
    var op = res.op;
    h += '<div class="ti-grade">';
    // v6.10.1: cada cor tem um sentido. Laranja = o que você paga; verde = o
    // que você ganha (ou o que sobe); vermelho = o que desce ou não gira.
    if (op) {
      h += caixa('OP para dar', '<b class="warn">' + faixa(op.dar.pct, pct) + '%</b>', '<i class="warn">' + faixa(op.dar.robux, num) + '</i>', 'você paga a mais para pegar este item');
      h += caixa('OP para pedir', '<b class="pos">' + faixa(op.pedir.pct, pct) + '%</b>', '<i class="pos">' + faixa(op.pedir.robux, num) + '</i>', 'você pede a mais quando dá este item');
    } else {
      h += caixa('OP para dar', SEM) + caixa('OP para pedir', SEM);
    }
    h += caixa('Best Price', res.best ? '<b class="rap">' + num(res.best) + '</b>' : SEM, null,
      res.best ? 'menor preço à venda' + (res.bestFonte === 'Roblox' ? ' (Roblox)' : '') : '');
    if (res.depois != null && res.rap != null) {
      var dif = res.depois - res.rap;
      var cd = dif > 0 ? 'pos' : dif < 0 ? 'neg' : '';
      h += caixa('Depois da venda', '<b class="' + cd + '">' + num(res.depois) + '</b>',
        '<i class="' + cd + '">' + (dif > 0 ? '▲ +' + num(dif) : dif < 0 ? '▼ −' + num(-dif) : '=') + ' no RAP</i>', 'RAP se vender pelo Best Price');
    } else {
      h += caixa('Depois da venda', SEM);
    }
    h += caixa('Vendas por dia', res.vendasDia != null ? '<b class="' + corDemanda(res.vendasN) + '">' + res.vendasDia.toLocaleString('pt-BR') + '</b>' : SEM, null,
      res.vendasDia != null ? 'média de 30 dias' : '');
    h += caixa('Demanda', res.demanda ? '<b class="' + corDemanda(res.demandaN) + '">' + esc(res.demanda) + '</b>' : SEM, null,
      res.demanda ? (res.demandaEstimada ? 'estimada pelas vendas' : "do Rolimon's") : '');
    h += '</div>';
    if (op) {
      var aj = Math.round((op.mult - 1) * 100);
      var ca = aj > 0 ? 'pos' : aj < 0 ? 'neg' : '';
      h += '<div class="ct-nota">OP ' + (res.demanda ? 'ajustado pela demanda: <b class="' + ca + '">' + (aj > 0 ? '+' : aj < 0 ? '−' : '') + Math.abs(aj) + '%</b>' : 'sem ajuste (sem dado de demanda)') +
        ', sobre o ' + (res.semValue ? 'RAP (item sem value)' : 'value') + ' de ' + num(op.base) + '.</div>';
    }
    return h;
  }

  function bloco(id, titulo, linhas, simbolo) {
    var el = $(id);
    if (!linhas || !linhas.length) { el.classList.add('oculto'); el.innerHTML = ''; return; }
    el.innerHTML = '<h3>' + esc(titulo) + '</h3>' + linhas.map(function (x) {
      return '<div class="motivo"><span class="marca ' + esc(x[1]) + '">' + simbolo(x[1]) + '</span><span class="' + esc(x[1]) + '">' + esc(x[0]) + '</span></div>';
    }).join('');
    el.classList.remove('oculto');
  }

  function fechar() {
    clearTimeout(timer);
    atual = null;
    $('tela-item').classList.add('oculto');
    document.documentElement.classList.remove('ti-aberta');
  }

  function abrir(o) {
    var t = $('tela-item');
    if (!t || !o || !o.id) return;
    var id = String(o.id);
    clearTimeout(timer);
    atual = { id: id, remover: typeof o.remover === 'function' ? o.remover : null };
    $('ti-nome').textContent = o.nome || 'Item ' + id;
    var th = $('ti-thumb');
    if (o.thumb) { th.src = o.thumb; th.classList.remove('oculto'); }
    else { th.removeAttribute('src'); th.classList.add('oculto'); }
    bloco('ti-alertas', 'Alertas', o.alertas, function () { return '!'; });
    bloco('ti-mud', o.tituloMud || 'Mudanças', o.mudancas, function (c) { return c === 'pos' ? '▲' : c === 'neg' ? '▼' : '•'; });
    $('ti-rol').href = 'https://www.rolimons.com/item/' + id;
    $('ti-rbx').href = 'https://www.roblox.com/catalog/' + id;
    $('ti-remover').classList.toggle('oculto', !atual.remover);
    $('ti-card').innerHTML = '<div class="ct-esq"></div><div class="ct-nota">Buscando os dados do item no Rolimon\'s...</div>';
    t.classList.remove('oculto');
    t.scrollTop = 0;
    document.documentElement.classList.add('ti-aberta');
    // Pede ao Scriptable pela ponte (o endereço é barrado lá; só a página do item sai).
    var f = document.createElement('iframe');
    f.style.display = 'none';
    f.src = PONTE + 'cartao?id=' + encodeURIComponent(id) + '&t=' + Date.now();
    document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    timer = setTimeout(function () {
      if (atual && atual.id === id) $('ti-card').innerHTML = '<div class="ct-nota">Sem resposta do Scriptable. Volte e toque no item de novo.</div>';
    }, 60000);
  }

  $('ti-voltar').addEventListener('click', fechar);
  $('ti-remover').addEventListener('click', function () {
    var r = atual && atual.remover;
    fechar();
    if (r) r();
  });

  window.receberCartao = function (res) {
    var d = $('diag-cartao');
    if (d && res) d.textContent = 'Tela do item ' + res.id + ': ' + (res.erro || (res.diag || []).join(' · '));
    if (!res || !atual || String(res.id) !== atual.id) return;
    clearTimeout(timer);
    $('ti-card').innerHTML = desenhar(res);
  };
  window.thItem = { abrir: abrir, fechar: fechar };
}

function script(ponteJson) {
  return '<script>\n(' + paginaItem.toString() + ')(' + ponteJson + ');\n</script>';
}

module.exports = {
  carregar, lerPagina, tela, css, script, extrairVar, serieDoHistorico, porDia, demandaPorVendas,
  lerGuardados, gravarGuardados, entrada, guardarPagina, guardarBest, paginaGuardada, linha, linhas,
  opFaixas, reguaOp,
};
