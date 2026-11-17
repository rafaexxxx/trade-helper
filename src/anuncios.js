// Aba "Anúncios": cruza os Trade Ads recentes do Rolimon's com o seu inventário.
// Lado Scriptable: busca, lê (formato conferido com cuidado) e guarda os anúncios
// por algumas horas. Lado página: regras de match, combinações e desenho, usando
// as funções do avaliador (value base e veredito) já injetadas na página.
const api = require('api');
const avaliador = require('avaliador');
const ajuda = require('ajuda');
const analise = require('analise');

// v6.2: criarAnalisador também roda no Scriptable (notificações do widget).
// Na página ele usa as funções injetadas pelo avaliador; aqui, estes apelidos.
const fmtPct = analise.fmtPct;
const fmtPctSinal = analise.fmtPctSinal;
const { valorEfetivo, itemDoCatalogo, somarLado, tipoTrocaLados, calcularVeredito } = avaliador.compartilhadas;

// Tags numéricas do pedido, na ordem do formulário do Rolimon's
// (fonte de terceiros; a contagem aparece no Diagnóstico para conferir).
const TAGS = {
  1: 'demand', 2: 'rares', 3: 'robux', 4: 'any', 5: 'upgrade',
  6: 'downgrade', 7: 'rap', 8: 'wishlist', 9: 'projecteds', 10: 'adds',
};

function esc(s) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => mapa[c]);
}

function nomeTag(t) {
  if (typeof t === 'number' || /^\d+$/.test(String(t))) return TAGS[Number(t)] || 'tag ' + t;
  return String(t || '').toLowerCase();
}

// Lista de assetIds como texto; null se vier num formato inesperado.
function listaIds(x) {
  if (x == null) return [];
  if (!Array.isArray(x)) return null;
  const r = [];
  for (const v of x) {
    const n = v && typeof v === 'object' ? v.id || v.assetId : v;
    if (n == null || !/^\d+$/.test(String(n))) return null;
    r.push(String(n));
  }
  return r;
}

// Um anúncio bruto -> [id, criadoMs, userId, username, oferta[], robux, pedido[], tags[]]
function lerAnuncio(row) {
  let id;
  let criado;
  let userId;
  let nome;
  let oferta;
  let pedido;
  if (Array.isArray(row) && row.length >= 6) {
    id = row[0];
    criado = row[1];
    userId = row[2];
    nome = row[3];
    oferta = row[4];
    pedido = row[5];
  } else if (row && typeof row === 'object') {
    id = row.id != null ? row.id : row.ad_id;
    criado = row.created;
    userId = row.user_id != null ? row.user_id : row.userId;
    nome = row.username;
    oferta = row.offer;
    pedido = row.request;
  } else {
    return { erro: 'linha em formato desconhecido' };
  }
  if (id == null) return { erro: 'anúncio sem id' };
  if (!oferta || typeof oferta !== 'object') return { erro: 'oferta em formato inesperado' };
  if (!pedido || typeof pedido !== 'object') return { erro: 'pedido em formato inesperado' };
  const itensOferta = listaIds(oferta.items);
  const itensPedido = listaIds(pedido.items);
  if (itensOferta === null || itensPedido === null) return { erro: 'itens em formato inesperado' };
  const robux = Math.max(Math.floor(Number(oferta.robux) || 0), 0);
  const tags = Array.isArray(pedido.tags) ? pedido.tags.map(nomeTag) : [];
  let ms = Number(criado);
  if (!(ms > 0)) ms = null;
  else if (ms < 1e12) ms *= 1000; // veio em segundos
  return { ad: [String(id), ms, Number(userId) || 0, String(nome || ''), itensOferta, robux, itensPedido, tags] };
}

// Busca (respeitando o cache), junta com os guardados e apaga os antigos.
async function carregar(store, cfg) {
  const agora = Date.now();
  const salvo = store.ler('anuncios') || {};
  let lista = Array.isArray(salvo.lista) ? salvo.lista : [];
  let buscadoEm = salvo.buscadoEm || 0;
  const tentouEm = Math.max(salvo.tentouEm || 0, buscadoEm);
  let leitura = salvo.leitura || null;
  let origem = 'guardados';
  let erro = null;
  const intervalo = cfg.ANUNCIOS_CACHE_MIN * 60000;

  if (agora - tentouEm >= intervalo) {
    try {
      const r = await api.buscarAnunciosRecentes();
      const porId = {};
      for (const a of lista) if (Array.isArray(a)) porId[a[0]] = a;
      const descartes = {};
      let lidos = 0;
      let novos = 0;
      for (const row of r.lista) {
        const x = lerAnuncio(row);
        if (x.erro) {
          descartes[x.erro] = (descartes[x.erro] || 0) + 1;
          continue;
        }
        lidos++;
        const ad = x.ad;
        // Sem data no anúncio: usa a primeira vez que ele foi visto.
        if (!ad[1]) ad[1] = porId[ad[0]] ? porId[ad[0]][1] : agora;
        if (!porId[ad[0]]) novos++;
        porId[ad[0]] = ad;
      }
      if (r.lista.length && !lidos) {
        throw new Error('formato inesperado dos anúncios: ' + JSON.stringify(r.lista[0]).slice(0, 200));
      }
      lista = Object.keys(porId).map((k) => porId[k]);
      buscadoEm = agora;
      origem = 'rede';
      leitura = {
        em: agora,
        recebidos: r.lista.length,
        lidos,
        novos,
        descartes,
        resto: r.resto,
        amostra: r.lista.length ? JSON.stringify(r.lista[0]).slice(0, 300) : null,
      };
    } catch (e) {
      erro = e.message || String(e);
      origem = lista.length ? 'guardados (busca falhou)' : 'falhou';
    }
  }

  const limite = agora - cfg.ANUNCIOS_GUARDAR_HORAS * 3600000;
  lista = lista
    .filter((a) => Array.isArray(a) && a.length >= 8 && a[1] >= limite)
    .sort((x, y) => y[1] - x[1])
    .slice(0, cfg.ANUNCIOS_MAX_GUARDADOS);
  try {
    store.gravar('anuncios', { buscadoEm, tentouEm: erro ? agora : tentouEm, lista, leitura });
  } catch (e) {
    // segue sem guardar
  }
  return {
    lista,
    agora,
    buscadoEm,
    liberaEm: (erro ? agora : Math.max(tentouEm, buscadoEm)) + intervalo,
    origem,
    erro,
    leitura,
  };
}

// ---------- v6.7: vendas por dia (Scriptable) ----------
// Arquivo 'vendas': { itens: { assetId: [porDia, buscadoEmMs] }, rodada: { em, tentados, ok, falhas, erro, parou } }.
// Para a análise: { porId: { assetId: porDia } (só os ainda válidos), ativo, ... }.
// ativo = a regra vale. Desliga sozinha quando a última rodada falhou em TODOS
// os itens que tentou (ex.: o Roblox passou a pedir login).
function resumoVendas(salvo, cfg, agora, extra) {
  const validade = (cfg.ANUNCIO_VENDAS_CACHE_H || 24) * 3600000;
  const itens = (salvo && salvo.itens) || {};
  const porId = {};
  let guardados = 0;
  for (const id of Object.keys(itens)) {
    const x = itens[id];
    if (Array.isArray(x) && agora - x[1] <= validade) {
      porId[id] = x[0];
      guardados++;
    }
  }
  const rd = (salvo && salvo.rodada) || null;
  const ativo = !!rd && (rd.ok > 0 || rd.falhas === 0);
  return Object.assign({ porId, ativo, guardados, rodada: rd }, extra || {});
}

// Só o que já está guardado (notificações do widget: sem buscar nada).
function vendasGuardadas(store, cfg) {
  let salvo = null;
  try {
    salvo = store.ler('vendas');
  } catch (e) {
    // sem arquivo
  }
  return resumoVendas(salvo, cfg, Date.now());
}

// Busca as vendas que faltam dos itens MÉDIOS oferecidos nos anúncios que pedem
// só tags upgrade/downgrade (os que podem virar sugestão). Os anúncios mais
// novos primeiro; no máximo ANUNCIO_VENDAS_MAX_BUSCAS por vez.
// catalogo = itens do Rolimon's (bruto: [nome, sigla, rap, value, ...]).
async function carregarVendas(store, cfg, lista, catalogo) {
  const agora = Date.now();
  const validade = (cfg.ANUNCIO_VENDAS_CACHE_H || 24) * 3600000;
  const addMax = cfg.ANUNCIO_ADD_MAX_VALUE != null ? cfg.ANUNCIO_ADD_MAX_VALUE : 500;
  const ate = cfg.ANUNCIO_VENDAS_ATE_VALUE || 10000;
  const dias = cfg.ANUNCIO_VENDAS_DIAS || 30;
  let salvo = null;
  try {
    salvo = store.ler('vendas');
  } catch (e) {
    // começa vazio
  }
  const itens = (salvo && salvo.itens) || {};

  const faltam = [];
  const vistos = {};
  for (const ad of lista || []) {
    if (!Array.isArray(ad) || (ad[6] && ad[6].length)) continue;
    const tags = ad[7] || [];
    if (tags.indexOf('upgrade') < 0 && tags.indexOf('downgrade') < 0) continue;
    for (const id of ad[4] || []) {
      if (vistos[id]) continue;
      vistos[id] = true;
      const r = catalogo && catalogo[id];
      if (!Array.isArray(r)) continue;
      const vb = r[3] > 0 ? r[3] : r[2] > 0 ? r[2] : 0;
      if (!(vb > addMax) || vb > ate) continue;
      const x = itens[id];
      if (Array.isArray(x) && agora - x[1] <= validade) continue;
      faltam.push(id);
    }
  }

  const fila = faltam.slice(0, cfg.ANUNCIO_VENDAS_MAX_BUSCAS || 40);
  const juntos = Math.max(cfg.ANUNCIO_VENDAS_PARALELAS || 5, 1);
  const rodada = { em: agora, tentados: 0, ok: 0, falhas: 0, erro: null, parou: null, faltavam: faltam.length };
  for (let k = 0; k < fila.length && !rodada.parou; k += juntos) {
    const parte = fila.slice(k, k + juntos);
    const resp = await Promise.all(parte.map((id) =>
      api.buscarVendasPorDia(id, dias).then((v) => ({ id, v }), (e) => ({ id, e }))
    ));
    for (const x of resp) {
      rodada.tentados++;
      if (x.e) {
        rodada.falhas++;
        if (!rodada.erro) rodada.erro = (x.e.message || String(x.e)) + (x.e.trecho ? ': ' + x.e.trecho.slice(0, 120) : '');
        if (x.e.status === 429) rodada.parou = 'muitas requisições (429)';
      } else {
        rodada.ok++;
        itens[x.id] = [x.v, Date.now()];
      }
    }
  }

  // Apaga os muito antigos (3x a validade).
  for (const id of Object.keys(itens)) {
    if (!Array.isArray(itens[id]) || agora - itens[id][1] > validade * 3) delete itens[id];
  }
  // Rodada sem nada para buscar mantém o "ativo" da anterior (não liga uma regra que falhou).
  const novo = { itens, rodada: rodada.tentados ? rodada : (salvo && salvo.rodada) || rodada };
  try {
    store.gravar('vendas', novo);
  } catch (e) {
    // segue sem guardar
  }
  return resumoVendas(novo, cfg, agora, { agora: rodada });
}

function parametros(cfg, meuId) {
  return {
    meuId: Number(meuId) || 0,
    horas: cfg.ANUNCIOS_GUARDAR_HORAS,
    // Do SEU ponto de vista (a tag do anúncio é do dono).
    upPagarMax: cfg.ANUNCIO_SEU_UPGRADE_PAGAR_MAX_PCT,
    upPagarAlvo: cfg.ANUNCIO_SEU_UPGRADE_PAGAR_ALVO_PCT,
    downMin: cfg.ANUNCIO_SEU_DOWNGRADE_MIN_PCT,
    downMax: cfg.ANUNCIO_SEU_DOWNGRADE_MAX_PCT,
    downAlvo: cfg.ANUNCIO_SEU_DOWNGRADE_ALVO_PCT,
    // v6.6: forma da sugestão (o padrão vale se o config.js for antigo).
    addMax: cfg.ANUNCIO_ADD_MAX_VALUE != null ? cfg.ANUNCIO_ADD_MAX_VALUE : 500,
    addsMax: cfg.ANUNCIO_ADDS_MAX != null ? cfg.ANUNCIO_ADDS_MAX : 2,
    minMedios: cfg.ANUNCIO_SEU_DOWNGRADE_MIN_MEDIOS != null ? cfg.ANUNCIO_SEU_DOWNGRADE_MIN_MEDIOS : 2,
    // v6.7: vendas por dia dos itens médios que você recebe.
    vendasMinDia: cfg.ANUNCIO_VENDAS_MIN_DIA != null ? cfg.ANUNCIO_VENDAS_MIN_DIA : 1,
    vendasAte: cfg.ANUNCIO_VENDAS_ATE_VALUE != null ? cfg.ANUNCIO_VENDAS_ATE_VALUE : 10000,
    vendasDias: cfg.ANUNCIO_VENDAS_DIAS || 30,
    pool: cfg.ANUNCIO_COMBINACAO_MAX_ITENS,
    maxLista: cfg.ANUNCIOS_MAX_NA_LISTA,
  };
}

// ---------- HTML ----------
// v5.0: status + filtros (um item seu, ordem) + uma lista única de linhas curtas.
// A explicação das regras foi para a tela de Ajuda.
function secao(cfg, erro) {
  if (erro) {
    return '<div id="aba-anuncios" class="aba oculto"><p class="aviso">A aba Anúncios não pôde ser montada: ' + esc(erro) + '</p></div>';
  }
  return (
    '<div id="aba-anuncios" class="aba oculto">' +
    '<div class="an-status"><p class="meta" id="an-info">Os anúncios são buscados quando você abre esta aba.</p>' +
    '<button class="btn" id="an-atualizar">Atualizar</button></div>' +
    '<p class="aviso oculto" id="an-erro"></p>' +
    '<p class="meta oculto" id="an-conta"></p>' +
    '<div class="an-filtros">' +
    '<button type="button" class="an-fbtn" id="an-filtro"></button>' +
    '<div class="seg peq" id="an-ordem">' +
    '<button type="button" data-o="ganho">Maior ganho</button>' +
    '<button type="button" data-o="recentes">Recentes</button>' +
    '<button type="button" data-o="value">Maior value</button>' +
    '</div></div>' +
    '<section class="secao"><h2>Anúncios<span class="cont" id="an-n"></span></h2>' +
    '<div id="an-lista"></div></section>' +
    // v5.4: as regras desta aba ficam na Ajuda (a tag é do dono do anúncio etc.).
    ajuda.link('aj-tags', 'Como as contas funcionam?') +
    '</div>'
  );
}

// Folha "Um item seu" (escolhe o item do filtro).
function folha() {
  return (
    '<div id="an-fundo" class="fundo oculto"></div>' +
    '<div id="an-folha" class="an-fl oculto">' +
    '<div class="an-fl-topo"><b>Um item seu</b><button type="button" id="an-fechar">Fechar</button></div>' +
    '<p class="an-fl-info">Mostra só os anúncios em que esse item entra no seu lado (Dou). Nos de upgrade e downgrade, a sugestão é refeita com ele.</p>' +
    '<div class="an-fl-lista" id="an-fl-lista"></div>' +
    '</div>'
  );
}

function css() {
  return `
.an-status{display:flex;align-items:center;justify-content:space-between;gap:12px}
.an-status .meta{margin:0}
.an-filtros{display:flex;flex-direction:column;gap:8px}
.an-fbtn{display:flex;align-items:center;gap:10px;width:100%;padding:8px 12px 8px 8px;border:1px solid var(--borda);border-radius:14px;background:var(--card);text-align:left;-webkit-tap-highlight-color:transparent}
.an-fbtn.on{border-color:var(--acc-t);background:var(--dou-bg)}
.an-fbtn .thumb{width:32px;height:32px;border-radius:9px}
.an-ftodos{display:grid;place-items:center;color:var(--sub);font-size:15px}
.an-ftxt{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.2}
.an-ftxt small{font-size:12px;font-weight:500;color:var(--sub)}
.an-ftxt b{font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.an-fx{flex:none;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:var(--card2);color:var(--sub);font-size:15px;line-height:1}
.an-fseta{flex:none;color:var(--sub);font-size:13px}

.an-grupo{display:flex;flex-direction:column;border-radius:18px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.an-grupo,.an-fbtn{-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}
.an-it+.an-it{border-top:1px solid var(--borda)}
.an-linha{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border:0;background:none;text-align:left;-webkit-tap-highlight-color:transparent}
.an-linha:active,.an-it.aberto>.an-linha{background:var(--card2)}
.an-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
.an-l1{display:flex;align-items:center;gap:6px;min-width:0}
.an-l1 b{min-width:0;font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.an-tempo{flex:none;font-size:12px;color:var(--sub)}
.an-etq{flex:none;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.02em;background:var(--card2);color:var(--sub)}
.an-etq.seus{background:var(--dou-bg);color:var(--acc-t)}
.an-l2{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.an-grp{display:flex;align-items:center;gap:3px;padding:3px;border-radius:9px}
.an-grp.rec{background:var(--rec-bg)}
.an-grp.dou{background:var(--dou-bg)}
.an-grp.sug{outline:1.5px dashed var(--borda);outline-offset:-1.5px}
.an-grp .thumb{width:24px;height:24px;border-radius:6px}
.an-rbx{padding:0 4px;font-size:11px;font-weight:700;color:var(--pos)}
.an-tr{font-size:13px;color:var(--sub)}
.an-pct{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:3px;text-align:right}
.an-pct b{font-size:20px;font-weight:700;line-height:1;letter-spacing:-.01em;color:var(--c)}
.an-pct small{font-size:11px;font-weight:600;color:var(--c);white-space:nowrap}
.an-chev{flex:none;color:var(--sub);font-size:20px;line-height:1;transition:transform .15s}
.an-it.aberto .an-chev{transform:rotate(90deg)}

.an-det{display:flex;flex-direction:column;gap:12px;padding:4px 14px 14px;background:var(--card2)}
.an-nota{margin:0;font-size:13px;color:var(--sub)}
.an-aviso{margin:0;padding:8px 10px;border-radius:10px;background:var(--card);font-size:13px;color:var(--sub)}
.an-aviso b{color:var(--fg)}
.an-lado{border-radius:14px;overflow:hidden;background:var(--card)}
.an-lcab{display:flex;justify-content:space-between;align-items:center;padding:10px 12px 6px;font-size:14px;font-weight:700}
.an-lcab span:last-child{font-size:12px;font-weight:500;color:var(--sub)}
.an-lado.rec .an-lcab{color:var(--pos)}
.an-lado.dou .an-lcab{color:var(--acc-t)}
.an-i{display:flex;align-items:center;gap:10px;padding:8px 12px;color:inherit;text-decoration:none;-webkit-tap-highlight-color:transparent}
a.an-i:active{background:var(--card2)}
.an-i .thumb{width:34px;height:34px;border-radius:9px}
.an-i .item-txt{gap:1px}
.an-i .nome{font-size:14px}
.an-i .det{font-size:12px}
.an-val{flex:none;text-align:right;font-size:15px;font-weight:700;line-height:1;white-space:nowrap}
.an-val small{display:inline-block;width:36px;margin-left:4px;text-align:left;font-size:11px;font-weight:500;color:var(--sub)}
.an-seta{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--card2);color:var(--acc-t);font-size:12px}
.an-seta.vazia{visibility:hidden}
.an-tot{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid var(--borda);font-weight:700}
.an-tot span:first-child{flex:1}
.an-pe{display:flex;align-items:center;justify-content:space-between;gap:10px}
.an-pe .selo{font-size:14px;padding:6px 12px}
.an-ganho{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.an-ganho b{font-size:30px;font-weight:700;line-height:1;letter-spacing:-.02em;color:var(--c)}
.an-ganho small{font-size:15px;font-weight:700;color:var(--c)}
.an-acoes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.an-acoes .btn{display:block;padding:10px 8px;font-size:14px;text-align:center;text-decoration:none}
.an-mais{margin:8px 0 0;font-size:13px;color:var(--sub)}

.an-fl{position:fixed;left:0;right:0;bottom:0;max-height:75vh;display:flex;flex-direction:column;border-radius:18px 18px 0 0;background:var(--bg);box-shadow:0 -6px 24px rgba(0,0,0,.25);padding-bottom:max(12px,env(safe-area-inset-bottom))}
.an-fl-topo{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 8px}
.an-fl-topo b{font-size:19px;font-weight:700}
.an-fl-topo button{border:0;background:none;padding:4px 0;font-size:16px;font-weight:600;color:var(--acc-t)}
.an-fl-info{margin:0 16px 10px;font-size:13px;color:var(--sub)}
.an-fl-lista{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;margin:0 12px;border-radius:16px;background:var(--card)}
.an-fl-op{display:flex;align-items:center;gap:12px;width:100%;padding:10px 12px;border:0;border-bottom:1px solid var(--borda);background:none;text-align:left;-webkit-tap-highlight-color:transparent}
.an-fl-op:last-child{border-bottom:0}
.an-fl-op:active{background:var(--card2)}
.an-fl-op.on{background:var(--dou-bg)}
.an-fl-op .thumb{width:38px;height:38px;border-radius:10px}
.an-fl-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.an-fl-txt b{font-size:15px;font-weight:600;overflow-wrap:anywhere}
.an-fl-txt span{font-size:12px;color:var(--sub)}
#diag-anuncios{white-space:pre-wrap;overflow-wrap:anywhere}
`;
}

// ---------- Regras dos anúncios (página E Scriptable) ----------
// v6.2: a análise saiu de dentro de paginaAnuncios para rodar também no widget
// (notificações). Sem nada de tela. ATENÇÃO: é injetada na página por toString,
// então só pode usar as funções compartilhadas do avaliador e fmtPct/fmtPctSinal.
// D = { catalogo, inventario } (avaliador.prepararDados), P = parâmetros do
// avaliador, PA = parâmetros desta aba. Depois de criar, chame montarMeus(inv).
function criarAnalisador(D, P, PA) {
  var C = D.catalogo;
  // meuId = dono do inventário (os anúncios dele ficam de fora).
  var A = { meus: [], porAsset: {}, emHold: {}, meusOrdenados: [], meuId: PA.meuId, vendas: null };
  var memoCombinacao = {};

  // v6.7: vendas por dia ({ porId, ativo, ... } de carregarVendas/vendasGuardadas).
  A.definirVendas = function (v) {
    A.vendas = v && v.porId ? v : null;
  };
  // Vendas por dia de um item (null = sem dado).
  A.vendasDe = function (id) {
    var pd = A.vendas ? A.vendas.porId[id] : null;
    return pd == null ? null : pd;
  };
  // Item MÉDIO (acima dos adds e até PA.vendasAte) só entra numa sugestão se
  // vender PA.vendasMinDia por dia; sem dado, fica de fora. Regra desligada
  // (sem dados ou a busca falhou em tudo): todos passam.
  function vendeBem(i) {
    if (!A.vendas || !A.vendas.ativo) return true;
    var vb = valorEfetivo(i);
    if (!(vb > PA.addMax) || vb > PA.vendasAte) return true;
    var pd = A.vendasDe(i.id);
    return pd != null && pd >= PA.vendasMinDia;
  }

  // Seus itens disponíveis (sem hold e com dados no Rolimon's).
  A.montarMeus = function (inv) {
    var meus = [];
    var porAsset = {};
    var emHold = {};
    inv.forEach(function (x) {
      if (x[3]) {
        emHold[x[1]] = (emHold[x[1]] || 0) + 1;
        return;
      }
      var i = itemDoCatalogo(C, x[1]);
      if (!i) return;
      if (!(C[x[1]][2] >= 0)) i.rap = x[5] || 0;
      i.uaid = x[0];
      i.serial = x[2];
      i.doInventario = true;
      i.vb = valorEfetivo(i);
      meus.push(i);
      (porAsset[i.id] = porAsset[i.id] || []).push(i);
    });
    A.meus = meus;
    A.porAsset = porAsset;
    A.emHold = emHold;
    A.meusOrdenados = meus.slice().sort(function (x, y) { return y.vb - x.vb; });
    // As combinações guardadas valiam para o inventário anterior.
    memoCombinacao = {};
  };

  // Ganho em % (value base) de quem dá td e recebe tr; mesma conta do veredito.
  function ganho(td, tr) {
    return td.value > 0 ? ((tr.value - td.value) / td.value) * 100 : null;
  }

  // Nomes dos itens (mesmo assetId) que aparecem nos dois lados.
  function repetidos(dou, rec) {
    var noRec = {};
    rec.forEach(function (i) { noRec[i.id] = true; });
    var vistos = {};
    var r = [];
    dou.forEach(function (i) {
      if (noRec[i.id] && !vistos[i.id]) {
        vistos[i.id] = true;
        r.push(i.nome);
      }
    });
    return r;
  }

  // Melhor combinação dos seus itens para receber T (value base da oferta):
  // de minQ a maxQ itens, ganho entre lo% e hi%, o mais perto de alvo%.
  // Empate: a com menos itens. proibidos = assetIds que você recebe: v6.6, nunca
  // entram no seu lado (o mesmo item dos dois lados não é sugerido).
  // fixo = assetId que entra sempre (filtro "Um item seu").
  // Resultados guardados (ofertas repetidas são comuns).
  function melhorCombinacao(T, minQ, maxQ, lo, hi, alvo, proibidos, fixo) {
    var chave = [Math.round(T), minQ, maxQ, lo, hi, alvo, Object.keys(proibidos).sort().join(','), fixo || ''].join('|');
    if (!(chave in memoCombinacao)) memoCombinacao[chave] = calcularCombinacao(T, minQ, maxQ, lo, hi, alvo, proibidos, fixo);
    return memoCombinacao[chave];
  }
  function calcularCombinacao(T, minQ, maxQ, lo, hi, alvo, proibidos, fixo) {
    minQ = Math.max(minQ, 1);
    maxQ = Math.min(maxQ, P.maxItens);
    if (!(T > 0) || maxQ < minQ) return null;
    var sMin = T / (1 + hi / 100);
    var sMax = T / (1 + lo / 100);
    var escolha = [];
    var soma0 = 0;
    var f = null;
    if (fixo) {
      f = (A.porAsset[fixo] || [])[0];
      if (!f || !(f.vb > 0) || f.vb > sMax || proibidos[f.id]) return null;
      escolha.push(f);
      soma0 = f.vb;
    }
    var pool = [];
    var ordenados = A.meusOrdenados;
    for (var k = 0; k < ordenados.length && pool.length < PA.pool; k++) {
      var x = ordenados[k];
      if (x === f || proibidos[x.id]) continue;
      if (x.vb > 0 && soma0 + x.vb <= sMax) pool.push(x);
    }
    var melhor = null;
    function testar(soma) {
      if (escolha.length < minQ || soma < sMin) return;
      var p = ((T - soma) / soma) * 100;
      var nota = Math.abs(p - alvo);
      if (!melhor || nota < melhor.nota - 1e-9 || (Math.abs(nota - melhor.nota) < 1e-9 && escolha.length < melhor.itens.length)) {
        melhor = { nota: nota, pct: p, itens: escolha.slice() };
      }
    }
    function descer(inicio, soma) {
      testar(soma);
      if (escolha.length >= maxQ) return;
      for (var k = inicio; k < pool.length; k++) {
        var s = soma + pool[k].vb;
        if (s > sMax) continue;
        escolha.push(pool[k]);
        descer(k + 1, s);
        escolha.pop();
      }
    }
    descer(0, soma0);
    return melhor;
  }

  // v6.6: SEU DOWNGRADE (tag "upgrade" do dono). Você dá 1 item só e pede uma
  // PARTE da oferta: pelo menos PA.minMedios itens médios (value acima de
  // PA.addMax) e no máximo PA.addsMax adds, até P.maxItens itens. O núcleo (só
  // os médios) já tem que ganhar PA.downMin; o total fica até PA.downMax, o mais
  // perto de PA.downAlvo. Empate: menos itens. fixo = o item que você dá.
  function melhorDowngrade(rec, fixo) {
    var ofertas = [];
    var n = Math.min(rec.length, 8);
    var m;
    var j;
    for (m = 1; m < (1 << n); m++) {
      var itens = [];
      var ids = {};
      var soma = 0;
      var nucleo = 0;
      var medios = 0;
      var adds = 0;
      var ok = true;
      for (j = 0; j < n; j++) {
        if (!(m & (1 << j))) continue;
        var vb = valorEfetivo(rec[j]);
        if (!(vb > 0)) { ok = false; break; }
        itens.push(rec[j]);
        ids[rec[j].id] = true;
        soma += vb;
        if (vb > PA.addMax) { medios++; nucleo += vb; } else adds++;
      }
      if (!ok || medios < PA.minMedios || adds > PA.addsMax || itens.length > P.maxItens) continue;
      ofertas.push({ itens: itens, ids: ids, soma: soma, nucleo: nucleo });
    }
    if (!ofertas.length) return null;
    var dar = fixo ? (A.porAsset[fixo] || []).slice(0, 1) : A.meusOrdenados;
    var melhor = null;
    for (var k = 0; k < dar.length; k++) {
      var x = dar[k];
      if (!(x.vb > 0)) continue;
      for (j = 0; j < ofertas.length; j++) {
        var o = ofertas[j];
        var pN = ((o.nucleo - x.vb) / x.vb) * 100;
        var p = ((o.soma - x.vb) / x.vb) * 100;
        if (pN < PA.downMin || p > PA.downMax) continue;
        // v6.6: o mesmo item nunca vai dos dois lados numa sugestão.
        if (o.ids[x.id]) continue;
        var nota = Math.abs(p - PA.downAlvo);
        var qtd = o.itens.length + 1;
        if (!melhor || nota < melhor.nota - 1e-9 || (Math.abs(nota - melhor.nota) < 1e-9 && qtd < melhor.qtd)) {
          melhor = { nota: nota, qtd: qtd, dou: [x], rec: o.itens };
        }
      }
    }
    return melhor;
  }

  // v6.6: SEU UPGRADE (tag "downgrade" do dono). Você pede 1 item só da oferta e
  // dá de 2 a P.maxItens itens seus (sem limite de adds do seu lado), pagando de
  // 0 a PA.upPagarMax a mais, o mais perto de PA.upPagarAlvo. Empate: menos itens.
  function melhorUpgrade(rec, fixo) {
    var melhor = null;
    for (var k = 0; k < rec.length; k++) {
      var r = rec[k];
      var vb = valorEfetivo(r);
      if (!(vb > 0)) continue;
      var proibidos = {};
      proibidos[r.id] = true;
      var c = melhorCombinacao(vb, 2, P.maxItens, -PA.upPagarMax, 0, -PA.upPagarAlvo, proibidos, fixo);
      if (!c) continue;
      var qtd = c.itens.length + 1;
      if (!melhor || c.nota < melhor.nota - 1e-9 || (Math.abs(c.nota - melhor.nota) < 1e-9 && qtd < melhor.qtd)) {
        melhor = { nota: c.nota, qtd: qtd, dou: c.itens, rec: [r] };
      }
    }
    return melhor;
  }

  // ---------- Análise de um anúncio ----------
  // ad = [id, criadoMs, userId, username, oferta[], robux, pedido[], tags[]]
  // fixo = assetId do filtro "Um item seu" ('' = sem filtro).
  A.analisar = function (ad, fixo) {
    var meuId = A.meuId;
    var porAsset = A.porAsset;
    var emHold = A.emHold;
    if (meuId && ad[2] === meuId) return { descarte: 'anúncio seu' };
    var rec = [];
    var k;
    for (k = 0; k < ad[4].length; k++) {
      var i = itemDoCatalogo(C, ad[4][k]);
      if (!i) return { descarte: 'oferece item fora do catálogo' };
      rec.push(i);
    }
    if (!rec.length && !ad[5]) return { descarte: 'oferta vazia' };
    for (k = 0; k < rec.length; k++) {
      if (rec[k].projected) return { descarte: 'oferece item projected' };
      if (rec[k].dem === 0) return { descarte: 'oferece item com demanda terrível' };
      if (rec[k].rap24 != null && rec[k].rap24 >= P.alertaRap24) return { descarte: 'oferece item com RAP subindo demais em 24h' };
    }
    var tr = somarLado(rec, ad[5], true, P);
    var tags = ad[7] || [];
    var td;
    var tipo;
    var v;
    var p;
    var mesmo;

    // 1. Pede itens: você precisa ter todos (cópias sem hold).
    if (ad[6].length) {
      if (fixo && ad[6].indexOf(fixo) < 0) return { descarte: 'não pede o item do filtro', filtro: true };
      var usados = {};
      var dou = [];
      for (k = 0; k < ad[6].length; k++) {
        var id = ad[6][k];
        var livres = porAsset[id] || [];
        var n = usados[id] || 0;
        if (n >= livres.length) {
          return { descarte: emHold[id] && n < livres.length + emHold[id] ? 'pede item seu que está em hold' : 'pede itens que você não tem' };
        }
        dou.push(livres[n]);
        usados[id] = n + 1;
      }
      td = somarLado(dou, 0, false, P);
      p = ganho(td, tr);
      mesmo = repetidos(dou, rec);
      if (mesmo.length && p != null && p < 0) return { descarte: 'mesmo item dos dois lados com ganho negativo' };
      tipo = tipoTrocaLados(td, tr);
      v = calcularVeredito(dou, rec, td, tr, tipo, ad[5], P);
      if (!v || v.nivel == null || v.nivel < 3) return { descarte: 'pede seus itens, mas não vale a pena' };
      return {
        modo: 'itens', ad: ad, dou: dou, rec: rec, robux: ad[5], td: td, tr: tr, tipo: tipo, v: v, pct: p, mesmo: mesmo,
        nota: 'Ele pede itens que você tem' + (tipo ? ' (' + tipo + ' para você)' : '') + '.' +
          (tags.length ? ' Também pede: ' + tags.join(', ') + '.' : ''),
      };
    }

    // 2. Pede só tags: procura uma combinação sua.
    if (!tags.length) return { descarte: 'não pede nada' };
    var querUp = tags.indexOf('upgrade') >= 0;
    var querDown = tags.indexOf('downgrade') >= 0;
    // v6.6: a tag "any" (sidegrade) não gera sugestão: quase ninguém aceita.
    if (!querUp && !querDown) {
      return { descarte: tags.indexOf('any') >= 0 ? 'pede só any (sidegrade não é sugerido)' : 'pede só outras tags' };
    }
    var kq = rec.length;
    if (!kq) return { descarte: 'oferta só de Robux' };
    // A tag é do ponto de vista do DONO:
    // "upgrade" = ele dá mais itens = SEU DOWNGRADE: você dá 1 item e pede uma parte
    //   da oferta (ganha a mais, sem pesar a mão);
    // "downgrade" = ele dá menos itens = SEU UPGRADE: você pede 1 item dele e dá
    //   vários (paga o menor overpay que ele deve aceitar).
    // v6.6: os Robux do dono ficam de fora (a sugestão pede só itens).
    // v6.7: itens médios que vendem pouco (ou sem dado de vendas) não são pedidos.
    var recOk = rec.filter(vendeBem);
    var opcoes = [];
    var s;
    if (querUp) {
      s = melhorDowngrade(recOk, fixo);
      opcoes.push({ tag: 'upgrade', dou: s && s.dou, rec: s && s.rec, robux: 0 });
    }
    if (querDown) {
      s = melhorUpgrade(recOk, fixo);
      opcoes.push({ tag: 'downgrade', dou: s && s.dou, rec: s && s.rec, robux: 0 });
    }
    // Entre as tags aceitas, fica a opção de melhor veredito (empate: maior ganho).
    var melhor = null;
    opcoes.forEach(function (o) {
      if (!o.dou) return;
      o.tr = somarLado(o.rec, o.robux, true, P);
      o.td = somarLado(o.dou, 0, false, P);
      o.tipo = tipoTrocaLados(o.td, o.tr);
      o.v = calcularVeredito(o.dou, o.rec, o.td, o.tr, o.tipo, o.robux, P);
      o.p = ganho(o.td, o.tr);
      o.nivel = o.v && o.v.nivel != null ? o.v.nivel : -2;
      if (!melhor || o.nivel > melhor.nivel || (o.nivel === melhor.nivel && (o.p == null ? -1e9 : o.p) > (melhor.p == null ? -1e9 : melhor.p))) melhor = o;
    });
    if (!melhor) {
      if (recOk.length < rec.length) {
        return { descarte: 'itens médios com menos de ' + PA.vendasMinDia + ' venda/dia (ou sem dado de vendas)' };
      }
      return {
        descarte: (fixo ? 'nenhuma combinação com o item do filtro' : 'nenhuma combinação sua na faixa') +
          ' (' + opcoes.map(function (o) { return o.tag; }).join('/') + ')',
      };
    }
    var dou2 = melhor.dou;
    var rec2 = melhor.rec;
    td = melhor.td;
    tipo = melhor.tipo;
    v = melhor.v;
    p = melhor.p;
    // v6.6: a nota diz a forma e o que você pede; a % fica só no rodapé do cartão.
    var pede = rec2.length === kq ?
      (kq === 1 ? 'pede o item dele' : 'pede os ' + kq + ' itens que ele oferece') :
      'pede só ' + rec2.length + ' dos ' + kq + ' itens que ele oferece';
    var semRobux = ad[5] && !melhor.robux ? ' Os Robux dele ficam de fora.' : '';
    var nota;
    if (melhor.tag === 'upgrade') {
      nota = 'Ele quer upgrade, então para você é downgrade: você dá 1 item e ' + pede + '.' + semRobux;
    } else {
      nota = 'Ele quer downgrade, então para você é upgrade: você dá ' + dou2.length + ' itens e ' + pede +
        (p < 0 ? ', pagando perto do menor overpay que ele deve aceitar.' : ', sem pagar nada a mais.') + semRobux;
    }
    return {
      modo: 'tag', tag: melhor.tag, ad: ad, dou: dou2, rec: rec2, robux: melhor.robux, td: td, tr: melhor.tr, tipo: tipo, v: v, pct: p,
      mesmo: repetidos(dou2, rec2), nota: nota,
    };
  };

  return A;
}

// ---------- Código que roda DENTRO da página ----------
// D = dados do avaliador (TH_D), P = parâmetros do avaliador (TH_P),
// PA = parâmetros desta aba. Usa as funções injetadas pelo avaliador
// e criarAnalisador (injetado antes, no mesmo <script>).
function paginaAnuncios(D, P, PA) {
  var THUMBS = D.miniaturas || {};
  var ORDENS = { ganho: 1, recentes: 1, value: 1 };

  function lerSalvo(k, padrao) {
    try {
      var v = localStorage.getItem(k);
      return v == null ? padrao : v;
    } catch (e) {
      return padrao;
    }
  }
  function gravarSalvo(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
  }

  var estado = {
    carregando: false, carregou: false, manual: false, res: null, timer: null,
    lista: [], mostrados: [], diag: null, pedidos: {},
    item: lerSalvo('an-filtro-item', ''), ordem: lerSalvo('an-ordem', 'ganho'), aberto: null,
  };
  if (!ORDENS[estado.ordem]) estado.ordem = 'ganho';

  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    var mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return mapa[c];
    });
  }
  function dois(n) {
    return (n < 10 ? '0' : '') + n;
  }
  function hora(ms) {
    var d = new Date(ms);
    return dois(d.getHours()) + ':' + dois(d.getMinutes());
  }
  function haQuanto(ms) {
    var m = Math.max(0, Math.round((Date.now() - ms) / 60000));
    if (m < 1) return 'agora';
    if (m < 60) return 'há ' + m + ' min';
    return 'há ' + Math.floor(m / 60) + 'h' + (m % 60 ? dois(m % 60) : '');
  }
  function pctTxt(p) {
    return p == null ? '—' : fmtPctSinal(p);
  }

  // ---------- Seus itens disponíveis (sem hold e com dados no Rolimon's) ----------
  // v5.2: o inventário pode ser trocado pelo da conta 2 (window.thAnunciosConta).
  // v6.2: as regras (itens, combinações e análise) ficam em criarAnalisador (AN).
  // AN.meuId = dono do inventário (os anúncios dele ficam de fora); chave = sufixo
  // do filtro "Um item seu" guardado no iPhone ('' na sua conta, '-c2' na outra).
  var AN = criarAnalisador(D, P, PA);
  var chaveConta = '';
  function montarMeus(inv) {
    AN.montarMeus(inv);
    // O item salvo no filtro pode ter saído do inventário (ou entrado em hold).
    if (estado.item && !AN.porAsset[estado.item]) estado.item = '';
  }
  montarMeus(D.inventario);

  function ordenar(lista) {
    var o = estado.ordem;
    lista.sort(function (x, y) {
      if (o === 'recentes') return (y.ad[1] || 0) - (x.ad[1] || 0);
      if (o === 'value') return y.tr.value - x.tr.value;
      return (y.pct == null ? -1e9 : y.pct) - (x.pct == null ? -1e9 : x.pct);
    });
  }

  function processar() {
    var t0 = Date.now();
    var lista = (estado.res && estado.res.lista) || [];
    var saida = [];
    var descartes = {};
    var contTags = {};
    var pedidos = {};
    var foraDoFiltro = 0;
    var nItens = 0;
    lista.forEach(function (ad) {
      (ad[7] || []).forEach(function (t) { contTags[t] = (contTags[t] || 0) + 1; });
      // Quantos anúncios pedem cada item seu (para a folha do filtro).
      if (!(AN.meuId && ad[2] === AN.meuId)) {
        var vistos = {};
        (ad[6] || []).forEach(function (id) {
          if (AN.porAsset[id] && !vistos[id]) {
            vistos[id] = true;
            pedidos[id] = (pedidos[id] || 0) + 1;
          }
        });
      }
      var r;
      try {
        r = AN.analisar(ad, estado.item);
      } catch (e) {
        r = { descarte: 'erro na análise: ' + (e && e.message) };
      }
      if (r.descarte) {
        if (r.filtro) foraDoFiltro++;
        else descartes[r.descarte] = (descartes[r.descarte] || 0) + 1;
        return;
      }
      if (r.modo === 'itens') nItens++;
      saida.push(r);
    });
    ordenar(saida);
    estado.lista = saida;
    estado.pedidos = pedidos;
    estado.diag = {
      descartes: descartes, contTags: contTags, ms: Date.now() - t0, analisados: lista.length,
      nItens: nItens, nTags: saida.length - nItens, foraDoFiltro: foraDoFiltro,
    };
    desenhar();
  }

  // ---------- Desenho ----------
  function corDem(d) {
    return d === 0 ? 'neg' : d === 1 ? 'warn' : d >= 3 ? 'pos' : '';
  }
  function miniatura(id) {
    return THUMBS[id] ? '<img class="thumb" src="' + esc(THUMBS[id]) + '" alt="">' : '<span class="thumb"></span>';
  }
  // Vendas por dia: 2 casas abaixo de 1, 1 casa até 10, inteiro acima.
  function fmtVendas(pd) {
    var c = pd < 1 ? 2 : pd < 10 ? 1 : 0;
    return (Math.round(pd * Math.pow(10, c)) / Math.pow(10, c)).toFixed(c).replace('.', ',');
  }
  // Embaixo do nome: a demanda e (v6.7) as vendas por dia, quando o app tem o dado.
  function detalhes(i) {
    var pd = AN.vendasDe(i.id);
    var v = pd == null ? '' : '<span class="' + (pd < PA.vendasMinDia ? 'warn' : '') + '">' + fmtVendas(pd) + ' vendas/dia</span>';
    if (!(i.dem >= 0)) return v || '<span class="sub">Sem dados</span>';
    return '<span class="' + corDem(i.dem) + '">' + esc(P.demandaCurta[i.dem]) + '</span>' + (v ? ' · ' + v : '');
  }
  // Valor com a fonte ao lado ("value" ou "RAP"); a fonte tem largura fixa
  // para os números ficarem alinhados.
  function valor(n, fonte) {
    return '<span class="an-val">' + fmtNum(n) + '<small>' + fonte + '</small></span>';
  }
  // Item do cartão aberto: o toque abre a página do item no Rolimon's
  // (o painel.js manda o link para o Safari).
  function linhaItem(i) {
    return (
      '<a class="an-i" href="https://www.rolimons.com/item/' + esc(i.id) + '">' + miniatura(i.id) +
      '<span class="item-txt"><span class="nome">' + esc(i.nome) + '</span>' +
      '<span class="det">' + detalhes(i) + '</span></span>' +
      valor(valorEfetivo(i), i.value != null ? 'value' : 'RAP') +
      '<span class="an-seta" aria-hidden="true">↗</span></a>'
    );
  }
  // Um lado (Recebo ou Dou) com a linha Total (value base, Robux já incluídos).
  function blocoLado(classe, rotulo, itens, robux, recebe, t) {
    var h = '<div class="an-lado ' + classe + '"><div class="an-lcab"><span>' + rotulo + '</span><span>Valor</span></div>';
    h += itens.map(linhaItem).join('');
    if (robux) {
      var liquido = recebe ? Math.floor(robux * (1 - P.taxaRobux)) : robux;
      h += '<div class="an-i"><span class="item-txt"><span class="nome">+ ' + fmtNum(robux) + ' Robux</span>' +
        (recebe ? '<span class="det">já sem a taxa de ' + Math.round(P.taxaRobux * 100) + '%</span>' : '') + '</span>' +
        valor(liquido, recebe ? 'líq.' : '') + '<span class="an-seta vazia"></span></div>';
    }
    h += '<div class="an-tot"><span>Total</span>' + valor(t.value, '') + '<span class="an-seta vazia"></span></div>';
    return h + '</div>';
  }
  // Miniaturas pequenas de um lado, na linha fechada.
  function grupo(itens, robux, classe) {
    return (
      '<span class="an-grp ' + classe + '">' +
      itens.map(function (i) { return miniatura(i.id); }).join('') +
      (robux ? '<span class="an-rbx">R$</span>' : '') + '</span>'
    );
  }
  // Cartão aberto: nota, aviso do mesmo item, Recebo, Dou, veredito com a % e o
  // ganho em R$ (value base), e os botões do jogador e do trade.
  function detalhe(r) {
    var ad = r.ad;
    var h = '<div class="an-det">';
    if (r.nota) h += '<p class="an-nota">' + esc(r.nota) + '</p>';
    if (r.mesmo && r.mesmo.length) {
      h += '<p class="an-aviso">Tem <b>' + esc(r.mesmo.join(', ')) + '</b> dos dois lados. Continua na lista porque o ganho não é negativo.</p>';
    }
    h += blocoLado('rec', 'Recebo', r.rec, r.robux, true, r.tr);
    h += blocoLado('dou', r.modo === 'tag' ? 'Dou (sugestão)' : 'Dou', r.dou, 0, false, r.td);
    var dif = r.tr.value - r.td.value;
    h += '<div class="an-pe" data-cor="' + corVeredito(r.v) + '"><span class="selo">' + esc(r.v ? tituloWFL(r.v) : '') + '</span>' +
      '<span class="an-ganho"><b>' + pctTxt(r.pct) + '</b><small>' + (dif > 0 ? '+' : '') + fmtNum(dif) + ' R$</small></span></div>';
    h += '<div class="an-acoes">' +
      '<a class="btn sec" href="https://www.rolimons.com/player/' + ad[2] + '">Ver jogador</a>' +
      '<a class="btn" href="https://www.roblox.com/users/' + ad[2] + '/trade">Abrir trade</a></div>';
    return h + '</div>';
  }
  // Etiqueta da linha: a forma da trade do SEU ponto de vista (a tag do dono fica
  // na nota do cartão). Azul = pede seus itens; cinza = combinação sugerida.
  function etiqueta(r) {
    if (!r.rec.length) return 'por Robux';
    if (r.tipo === 'upgrade') return 'seu upgrade';
    if (r.tipo === 'downgrade') return 'seu downgrade';
    return 'sidegrade';
  }
  // Linha curta: jogador, etiqueta do tipo, tempo, miniaturas dos dois lados e a %.
  // O toque abre/fecha o cartão completo logo abaixo.
  function linha(r, k) {
    var ad = r.ad;
    var aberto = estado.aberto === ad[0];
    var sug = r.modo === 'tag';
    var cor = corVeredito(r.v);
    return (
      '<div class="an-it' + (aberto ? ' aberto' : '') + '">' +
      '<button type="button" class="an-linha" data-k="' + k + '" aria-expanded="' + aberto + '">' +
      '<span class="an-main"><span class="an-l1"><b>' + esc(ad[3] || 'Jogador ' + ad[2]) + '</b>' +
      '<span class="an-etq' + (sug ? '' : ' seus') + '">' + esc(etiqueta(r)) + '</span>' +
      '<span class="an-tempo">' + haQuanto(ad[1]) + '</span></span>' +
      '<span class="an-l2">' + grupo(r.rec, r.robux, 'rec') + '<span class="an-tr">⇄</span>' +
      grupo(r.dou, 0, 'dou' + (sug ? ' sug' : '')) + '</span></span>' +
      '<span class="an-pct" data-cor="' + cor + '"><b>' + pctTxt(r.pct) + '</b><small>' + esc(r.v ? r.v.titulo : '') + '</small></span>' +
      '<span class="an-chev">›</span></button>' +
      (aberto ? detalhe(r) : '') + '</div>'
    );
  }
  function nomeDoItem(id) {
    var l = AN.porAsset[id];
    return l && l[0] ? l[0].nome : '';
  }
  function desenharFiltro() {
    var b = $('an-filtro');
    if (estado.item && AN.porAsset[estado.item]) {
      var i = AN.porAsset[estado.item][0];
      b.className = 'an-fbtn on';
      b.innerHTML = miniatura(i.id) + '<span class="an-ftxt"><small>Só anúncios com</small><b>' + esc(i.nome) + '</b></span>' +
        '<span class="an-fx" data-limpar="1" aria-label="Tirar filtro">✕</span>';
    } else {
      b.className = 'an-fbtn';
      b.innerHTML = '<span class="thumb an-ftodos">☰</span><span class="an-ftxt"><small>Um item seu</small><b>Todos os seus itens</b></span>' +
        '<span class="an-fseta">▼</span>';
    }
    var bs = document.querySelectorAll('#an-ordem button');
    for (var k = 0; k < bs.length; k++) bs[k].classList.toggle('on', bs[k].getAttribute('data-o') === estado.ordem);
  }
  function desenharLista() {
    var lista = estado.lista;
    estado.mostrados = [];
    $('an-n').textContent = estado.carregou ? lista.length : '';
    $('an-n').className = 'cont' + (estado.carregou && lista.length ? ' pos' : '');
    if (!estado.carregou) {
      $('an-lista').innerHTML = '<p class="vazio">' + (estado.carregando ? 'Buscando...' : '—') + '</p>';
      return;
    }
    if (!lista.length) {
      $('an-lista').innerHTML = '<p class="vazio">' + (estado.item
        ? 'Nenhum anúncio serve para ' + esc(nomeDoItem(estado.item)) + ' agora.'
        : 'Nenhum anúncio com vantagem para você agora.') + '</p>';
      return;
    }
    estado.mostrados = lista.slice(0, PA.maxLista);
    var h = '<div class="an-grupo">' + estado.mostrados.map(linha).join('') + '</div>';
    if (lista.length > estado.mostrados.length) h += '<p class="an-mais">Mostrando ' + estado.mostrados.length + ' de ' + lista.length + '.</p>';
    $('an-lista').innerHTML = h;
  }
  function desenharStatus() {
    var res = estado.res;
    var info;
    if (estado.carregando) info = 'Buscando anúncios...';
    else if (!res) info = 'Os anúncios são buscados quando você abre esta aba.';
    else {
      info = fmtNum((res.lista || []).length) + ' anúncios analisados · últimas ' + PA.horas + 'h';
      if (res.buscadoEm) info += ' · busca ' + hora(res.buscadoEm);
      if (estado.manual && res.origem === 'guardados' && res.liberaEm) info += ' · nova busca às ' + hora(res.liberaEm);
    }
    $('an-info').textContent = info;
    $('an-atualizar').disabled = estado.carregando;
    var erro = res && res.erro;
    $('an-erro').classList.toggle('oculto', !erro);
    if (erro) {
      $('an-erro').textContent = 'Não consegui buscar anúncios novos (' + erro + ').' +
        ((res.lista || []).length ? ' Mostrando os guardados.' : '');
    }
  }
  function desenharDiag() {
    var el = $('diag-anuncios');
    if (!el) return;
    var res = estado.res;
    if (!res) {
      el.textContent = 'Anúncios: ainda não buscados nesta abertura.';
      return;
    }
    var L = [];
    L.push('Anúncios: origem ' + res.origem + ' · guardados ' + (res.lista || []).length +
      (res.buscadoEm ? ' · busca ' + hora(res.buscadoEm) : '') + (res.erro ? ' · erro: ' + res.erro : ''));
    var lt = res.leitura;
    if (lt) {
      L.push('Última leitura (' + hora(lt.em) + '): recebidos ' + lt.recebidos + ', lidos ' + lt.lidos + ', novos ' + lt.novos +
        (Object.keys(lt.descartes || {}).length ? ', descartes ' + JSON.stringify(lt.descartes) : ''));
      if (lt.resto) L.push('Resto da resposta: ' + lt.resto);
    }
    var dg = estado.diag;
    if (dg) {
      var tg = Object.keys(dg.contTags).sort(function (x, y) { return dg.contTags[y] - dg.contTags[x]; });
      L.push('Tags vistas: ' + (tg.length ? tg.map(function (t) { return t + ' ' + dg.contTags[t]; }).join(' · ') : 'nenhuma'));
      L.push('Análise: ' + estado.lista.length + ' na lista (' + dg.nItens + ' pedem seus itens, ' + dg.nTags + ' por tag)' +
        (estado.item ? ' · filtro ' + nomeDoItem(estado.item) + ' (' + dg.foraDoFiltro + ' não pedem o item)' : '') +
        ', em ' + dg.ms + ' ms · ordem ' + estado.ordem + ' · seus itens livres: ' + AN.meus.length);
      var ds = Object.keys(dg.descartes).sort(function (x, y) { return dg.descartes[y] - dg.descartes[x]; });
      if (ds.length) L.push('Fora da lista: ' + ds.map(function (d) { return d + ' ' + dg.descartes[d]; }).join(' · '));
    }
    // v6.7: vendas por dia (Roblox resale-data).
    var vd = res.vendas;
    if (vd) {
      var rd = vd.agora && vd.agora.tentados ? vd.agora : vd.rodada;
      L.push('Vendas/dia: ' + (vd.ativo ? 'regra ligada' : 'regra DESLIGADA') + ' · ' + (vd.guardados || 0) + ' itens guardados' +
        (rd ? ' · última busca ' + hora(rd.em) + ': ' + rd.tentados + ' tentados, ' + rd.ok + ' ok, ' + rd.falhas + ' falhas' +
          (rd.faltavam > rd.tentados ? ' (faltavam ' + rd.faltavam + ')' : '') + (rd.parou ? ' · parou: ' + rd.parou : '') +
          (rd.erro ? ' · erro: ' + rd.erro : '') : '') +
        (vd.erroGeral ? ' · erro: ' + vd.erroGeral : ''));
    }
    if (lt && lt.amostra) L.push('Amostra bruta: ' + lt.amostra);
    el.textContent = L.join('\n');
  }
  function pedirMiniaturas(ids) {
    if (!window.thPedirMiniaturas || !ids.length) return;
    try { window.thPedirMiniaturas(ids); } catch (e) {}
  }
  function desenhar() {
    desenharStatus();
    desenharFiltro();
    desenharLista();
    desenharDiag();
    var ids = [];
    estado.mostrados.forEach(function (r) {
      r.rec.concat(r.dou).forEach(function (i) { ids.push(i.id); });
    });
    if (estado.item) ids.push(estado.item);
    pedirMiniaturas(ids);
  }

  // ---------- Busca pela ponte (página -> Scriptable -> página) ----------
  function pedir(manual) {
    if (estado.carregando) return;
    estado.carregando = true;
    estado.manual = !!manual;
    desenhar();
    var f = document.createElement('iframe');
    f.style.display = 'none';
    f.src = P.ponte + 'anuncios?t=' + Date.now();
    document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    clearTimeout(estado.timer);
    estado.timer = setTimeout(function () {
      if (!estado.carregando) return;
      estado.carregando = false;
      estado.res = estado.res || { lista: [], origem: 'falhou' };
      estado.res.erro = 'sem resposta do Scriptable';
      desenhar();
    }, 120000);
  }
  window.receberAnuncios = function (res) {
    clearTimeout(estado.timer);
    estado.carregando = false;
    estado.carregou = true;
    estado.res = res || { lista: [], origem: 'falhou', erro: 'resposta vazia' };
    AN.definirVendas(estado.res.vendas);
    processar();
  };
  window.thAbrirAnuncios = function () {
    if (!estado.carregou && !estado.carregando) pedir(false);
  };
  // v5.2: troca o inventário cruzado com os anúncios.
  // dados = { inventario, meuId, chave, nome } da conta 2, ou null para voltar à sua.
  // A lista de anúncios é a mesma; só a análise é refeita.
  window.thAnunciosConta = function (dados) {
    var nova = dados ? dados.chave || '-c2' : '';
    if (nova === chaveConta && (!dados || dados.inventario === estado.invConta)) return;
    chaveConta = nova;
    estado.invConta = dados ? dados.inventario : null;
    AN.meuId = dados ? Number(dados.meuId) || 0 : PA.meuId;
    estado.item = lerSalvo('an-filtro-item' + chaveConta, '');
    estado.aberto = null;
    // (montarMeus também limpa as combinações guardadas)
    montarMeus(dados ? dados.inventario || [] : D.inventario);
    var el = $('an-conta');
    if (el) {
      el.textContent = dados ? 'Cruzados com os itens de ' + (dados.nome || 'conta 2') + '. O lado Dou mostra os itens dessa conta.' : '';
      el.classList.toggle('oculto', !dados);
    }
    fecharFolha();
    if (estado.carregou) processar();
    else desenhar();
  };
  window.thAoReceberMiniaturas = function () {
    if (estado.carregou) desenhar();
    else desenharFiltro();
    if (!$('an-folha').classList.contains('oculto')) desenharFolha();
  };

  // ---------- Filtro "Um item seu" ----------
  function desenharFolha() {
    var h = '<button type="button" class="an-fl-op' + (estado.item ? '' : ' on') + '" data-id="">' +
      '<span class="thumb an-ftodos">☰</span><span class="an-fl-txt"><b>Todos os seus itens</b><span>Sem filtro</span></span></button>';
    var vistos = {};
    AN.meusOrdenados.forEach(function (i) {
      if (vistos[i.id]) return;
      vistos[i.id] = true;
      var copias = AN.porAsset[i.id].length;
      var ped = estado.pedidos[i.id] || 0;
      var sub = fmtNum(i.vb) + ' ' + (i.value != null ? 'value' : 'RAP') +
        (copias > 1 ? ' · ' + copias + ' cópias' : '') +
        (ped ? ' · pedido em ' + ped + (ped === 1 ? ' anúncio' : ' anúncios') : '');
      h += '<button type="button" class="an-fl-op' + (estado.item === i.id ? ' on' : '') + '" data-id="' + esc(i.id) + '">' +
        miniatura(i.id) + '<span class="an-fl-txt"><b>' + esc(i.nome) + '</b><span>' + sub + '</span></span></button>';
    });
    $('an-fl-lista').innerHTML = h;
  }
  function abrirFolha() {
    desenharFolha();
    $('an-fundo').classList.remove('oculto');
    $('an-folha').classList.remove('oculto');
    var ids = [];
    AN.meusOrdenados.forEach(function (i) { ids.push(i.id); });
    pedirMiniaturas(ids);
  }
  function fecharFolha() {
    $('an-fundo').classList.add('oculto');
    $('an-folha').classList.add('oculto');
  }
  function escolherItem(id) {
    estado.item = id && AN.porAsset[id] ? id : '';
    gravarSalvo('an-filtro-item' + chaveConta, estado.item);
    estado.aberto = null;
    if (estado.carregou) processar();
    else desenhar();
  }

  // ---------- Toques ----------
  $('an-filtro').addEventListener('click', function (ev) {
    if (ev.target.closest('[data-limpar]')) {
      escolherItem('');
      return;
    }
    abrirFolha();
  });
  $('an-fl-lista').addEventListener('click', function (ev) {
    var b = ev.target.closest('.an-fl-op');
    if (!b) return;
    fecharFolha();
    escolherItem(b.getAttribute('data-id'));
  });
  $('an-fundo').addEventListener('click', fecharFolha);
  $('an-fechar').addEventListener('click', fecharFolha);
  $('an-ordem').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-o]');
    if (!b) return;
    estado.ordem = b.getAttribute('data-o');
    gravarSalvo('an-ordem', estado.ordem);
    ordenar(estado.lista);
    desenhar();
  });
  // Links (item, jogador, trade) seguem sozinhos: o painel.js abre no Safari.
  // O toque na linha só abre e fecha o cartão.
  $('aba-anuncios').addEventListener('click', function (ev) {
    if (ev.target.closest('a')) return;
    var l = ev.target.closest('.an-linha');
    if (!l) return;
    var r = estado.mostrados[Number(l.getAttribute('data-k'))];
    if (!r) return;
    estado.aberto = estado.aberto === r.ad[0] ? null : r.ad[0];
    desenharLista();
  });
  $('an-atualizar').addEventListener('click', function () { pedir(true); });

  // ---------- Início ----------
  desenhar();
  // Se o painel abriu direto nesta aba (aba lembrada), já busca.
  if (!$('aba-anuncios').classList.contains('oculto')) pedir(false);
}

// <script> da aba. Vem depois do script do avaliador (usa TH_D, TH_P e as funções dele).
// v6.2: criarAnalisador vai junto (é o mesmo código que o widget usa nas notificações).
function script(cfg, meuId) {
  return (
    '<script>\n' +
    criarAnalisador.toString() + '\n' +
    'if (typeof TH_D !== "undefined") (' + paginaAnuncios.toString() + ')(TH_D, TH_P, ' +
    avaliador.serializar(parametros(cfg, meuId)) + ');\n' +
    '</script>'
  );
}

module.exports = { TAGS, lerAnuncio, carregar, carregarVendas, vendasGuardadas, parametros, criarAnalisador, secao, folha, css, script };
