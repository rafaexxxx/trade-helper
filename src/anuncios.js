// Aba "Anúncios": cruza os Trade Ads recentes do Rolimon's com o seu inventário.
// Lado Scriptable: busca, lê (formato conferido com cuidado) e guarda os anúncios
// por algumas horas. Lado página: regras de match, combinações e desenho, usando
// as funções do avaliador (value base e veredito) já injetadas na página.
const api = require('api');
const avaliador = require('avaliador');

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

function parametros(cfg, meuId) {
  return {
    meuId: Number(meuId) || 0,
    horas: cfg.ANUNCIOS_GUARDAR_HORAS,
    upMin: cfg.ANUNCIO_UPGRADE_MIN_PCT,
    upMax: cfg.ANUNCIO_UPGRADE_MAX_PCT,
    upAlvo: cfg.ANUNCIO_UPGRADE_ALVO_PCT,
    downPagar: cfg.ANUNCIO_DOWNGRADE_PAGAR_MAX_PCT,
    any: cfg.ANUNCIO_ANY_PCT,
    pool: cfg.ANUNCIO_COMBINACAO_MAX_ITENS,
    maxLista: cfg.ANUNCIOS_MAX_NA_LISTA,
  };
}

// ---------- HTML ----------
function secao(cfg, erro) {
  if (erro) {
    return '<div id="aba-anuncios" class="oculto"><p class="aviso">A aba Anúncios não pôde ser montada: ' + esc(erro) + '</p></div>';
  }
  return (
    '<div id="aba-anuncios" class="oculto">' +
    '<div class="an-status"><p class="meta" id="an-info">Os anúncios são buscados quando você abre esta aba.</p>' +
    '<button class="btn" id="an-atualizar">Atualizar</button></div>' +
    '<p class="aviso oculto" id="an-erro"></p>' +
    '<details class="bloco" data-chave="an-itens" open><summary>Pedem seus itens<span class="n" id="an-n-itens"></span></summary>' +
    '<div id="an-lista-itens"></div></details>' +
    '<details class="bloco" data-chave="an-tags" open><summary>Upgrade, downgrade e any<span class="n" id="an-n-tags"></span></summary>' +
    '<div id="an-lista-tags"></div></details>' +
    '<p class="av-nota">Ficam de fora anúncios que oferecem item projected, com demanda terrível ou com o RAP subindo mais de ' +
    cfg.ALERTA_RAP_24H_PCT + '% em 24h. As contas usam o value (item sem value entra pelo RAP). "Pedem seus itens": só com veredito "Vale a pena" ou melhor. Upgrade: você ganha de ' +
    cfg.ANUNCIO_UPGRADE_MIN_PCT + '% a ' + cfg.ANUNCIO_UPGRADE_MAX_PCT + '%. Downgrade: você paga até ' +
    cfg.ANUNCIO_DOWNGRADE_PAGAR_MAX_PCT + '% a mais. Any: mesmo número de itens, ±' + cfg.ANUNCIO_ANY_PCT +
    '%. Itens em hold não entram. Os anúncios guardados (últimas ' + cfg.ANUNCIOS_GUARDAR_HORAS +
    'h) podem já ter sido fechados. Combinações são sugestões: a decisão é sua.</p>' +
    '</div>'
  );
}

function folha() {
  return (
    '<div id="an-fundo" class="fundo oculto"></div>' +
    '<div id="an-folha" class="folha oculto">' +
    '<p id="an-folha-nome"></p>' +
    '<a id="an-link-rol" href="#">Ver jogador no Rolimon\'s</a>' +
    '<a id="an-link-trade" href="#">Abrir trade no Roblox</a>' +
    '<button id="an-cancelar" class="cancelar">Cancelar</button>' +
    '</div>'
  );
}

function css() {
  return `
.an-status{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:14px 0 0}
.an-status .meta{margin:0}
.an-card{margin:12px 0 0;padding:10px 12px 12px;background:var(--av-cartao,var(--cab));border:1px solid var(--linha);border-left:4px solid var(--sub);border-radius:12px;-webkit-tap-highlight-color:transparent}
.an-card[data-cor=pos]{border-left-color:var(--pos)}
.an-card[data-cor=warn]{border-left-color:var(--warn)}
.an-card[data-cor=neg]{border-left-color:var(--neg)}
.an-card:active{opacity:.8}
.an-topo{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.an-topo b{font-weight:600;overflow-wrap:anywhere}
.an-topo .sub{font-size:12px;white-space:nowrap}
.an-rotulo{margin:2px 0 0;font-size:11px;font-weight:600;color:var(--rotulo);text-transform:uppercase;letter-spacing:.04em}
.an-t{margin:12px 0 0}
.an-t th{position:static;background:none;padding:3px 4px}
.an-t td{padding:6px 4px}
.an-t tfoot td{padding:8px 4px 2px}
.an-t .thumb{width:26px;height:26px}
.an-fonte{display:inline-block;width:34px;margin-left:5px;text-align:left;font-size:11px;font-weight:500;color:var(--sub)}
.an-div{height:3px;margin:16px -12px 4px;background:var(--av-divisor,var(--linha))}
.an-pct{margin:14px 0 0;padding:10px 0 0;border-top:1px solid var(--linha);text-align:center;font-size:30px;font-weight:700;letter-spacing:-.02em;color:var(--fg)}
.an-pct[data-cor=pos]{color:var(--pos)}
.an-pct[data-cor=warn]{color:var(--warn)}
.an-pct[data-cor=neg]{color:var(--neg)}
.an-mais{margin:10px 0 0;font-size:12px;color:var(--sub)}
#diag-anuncios{white-space:pre-wrap;overflow-wrap:anywhere}
`;
}

// ---------- Código que roda DENTRO da página ----------
// D = dados do avaliador (TH_D), P = parâmetros do avaliador (TH_P),
// PA = parâmetros desta aba. Usa as funções injetadas pelo avaliador.
function paginaAnuncios(D, P, PA) {
  var C = D.catalogo;
  var THUMBS = D.miniaturas || {};
  var estado = { carregando: false, carregou: false, manual: false, res: null, itens: [], tags: [], cartoes: [], diag: null, timer: null };

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
  var meus = [];
  var porAsset = {};
  var emHold = {};
  D.inventario.forEach(function (x) {
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
  var meusOrdenados = meus.slice().sort(function (x, y) { return y.vb - x.vb; });

  // Ganho em % (value base) de quem dá td e recebe tr; mesma conta do veredito.
  function ganho(td, tr) {
    return td.value > 0 ? ((tr.value - td.value) / td.value) * 100 : null;
  }

  // Melhor combinação dos seus itens para receber T (value base da oferta):
  // de minQ a maxQ itens, ganho entre lo% e hi%, o mais perto de alvo%.
  // Empate: a com menos itens. Resultados guardados (ofertas repetidas são comuns).
  var memoCombinacao = {};
  function melhorCombinacao(T, minQ, maxQ, lo, hi, alvo) {
    var chave = [Math.round(T), minQ, maxQ, lo, hi, alvo].join('|');
    if (!(chave in memoCombinacao)) memoCombinacao[chave] = calcularCombinacao(T, minQ, maxQ, lo, hi, alvo);
    return memoCombinacao[chave];
  }
  function calcularCombinacao(T, minQ, maxQ, lo, hi, alvo) {
    minQ = Math.max(minQ, 1);
    maxQ = Math.min(maxQ, P.maxItens);
    if (!(T > 0) || maxQ < minQ) return null;
    var sMin = T / (1 + hi / 100);
    var sMax = T / (1 + lo / 100);
    var pool = [];
    for (var k = 0; k < meusOrdenados.length && pool.length < PA.pool; k++) {
      var vb = meusOrdenados[k].vb;
      if (vb > 0 && vb <= sMax) pool.push(meusOrdenados[k]);
    }
    var melhor = null;
    var escolha = [];
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
    descer(0, 0);
    return melhor;
  }

  // ---------- Análise de um anúncio ----------
  // ad = [id, criadoMs, userId, username, oferta[], robux, pedido[], tags[]]
  function analisar(ad) {
    if (PA.meuId && ad[2] === PA.meuId) return { descarte: 'anúncio seu' };
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

    // 1. Pede itens: você precisa ter todos (cópias sem hold).
    if (ad[6].length) {
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
      tipo = tipoTrocaLados(td, tr);
      v = calcularVeredito(dou, rec, td, tr, tipo, ad[5], P);
      if (!v || v.nivel == null || v.nivel < 3) return { descarte: 'pede seus itens, mas não vale a pena' };
      return {
        modo: 'itens', ad: ad, dou: dou, rec: rec, td: td, tr: tr, tipo: tipo, v: v, pct: ganho(td, tr),
        nota: tags.length ? 'Também pede: ' + tags.join(', ') + '.' : '',
      };
    }

    // 2. Pede só tags: procura uma combinação sua.
    if (!tags.length) return { descarte: 'não pede nada' };
    var querUp = tags.indexOf('upgrade') >= 0;
    var querDown = tags.indexOf('downgrade') >= 0;
    var querAny = tags.indexOf('any') >= 0;
    if (!querUp && !querDown && !querAny) return { descarte: 'pede só outras tags' };
    var kq = rec.length;
    if (!kq) return { descarte: 'oferta só de Robux' };
    var opcoes = [];
    if (querUp) opcoes.push({ tag: 'upgrade', c: melhorCombinacao(tr.value, 1, kq - 1, PA.upMin, PA.upMax, PA.upAlvo) });
    if (querDown) opcoes.push({ tag: 'downgrade', c: melhorCombinacao(tr.value, kq + 1, P.maxItens, -PA.downPagar, 0, 0) });
    if (querAny) opcoes.push({ tag: 'any', c: melhorCombinacao(tr.value, kq, kq, -PA.any, PA.any, PA.any) });
    var melhor = null;
    opcoes.forEach(function (o) {
      if (o.c && (!melhor || o.c.pct > melhor.c.pct)) melhor = o;
    });
    if (!melhor) return { descarte: 'nenhuma combinação sua na faixa (' + opcoes.map(function (o) { return o.tag; }).join('/') + ')' };
    var dou2 = melhor.c.itens;
    td = somarLado(dou2, 0, false, P);
    tipo = tipoTrocaLados(td, tr);
    v = calcularVeredito(dou2, rec, td, tr, tipo, ad[5], P);
    var p = ganho(td, tr);
    var nota;
    if (melhor.tag === 'upgrade') {
      nota = 'Ele quer upgrade: você dá menos itens e ganha ' + fmtPct(p) + ' em value.';
    } else if (melhor.tag === 'downgrade') {
      nota = 'Ele quer downgrade: você dá mais itens e ' + (p < 0 ? 'paga ' + fmtPct(-p) + ' a mais (normal para quem sobe de item).' : 'não paga nada a mais.');
    } else {
      nota = 'Ele aceita qualquer item: combinação com o mesmo número de itens (' + fmtPctSinal(p) + ').';
    }
    return { modo: 'tag', tag: melhor.tag, ad: ad, dou: dou2, rec: rec, td: td, tr: tr, tipo: tipo, v: v, pct: p, nota: nota };
  }

  function processar() {
    var t0 = Date.now();
    var lista = (estado.res && estado.res.lista) || [];
    var itens = [];
    var tags = [];
    var descartes = {};
    var contTags = {};
    lista.forEach(function (ad) {
      (ad[7] || []).forEach(function (t) { contTags[t] = (contTags[t] || 0) + 1; });
      var r;
      try {
        r = analisar(ad);
      } catch (e) {
        r = { descarte: 'erro na análise: ' + (e && e.message) };
      }
      if (r.descarte) {
        descartes[r.descarte] = (descartes[r.descarte] || 0) + 1;
        return;
      }
      (r.modo === 'itens' ? itens : tags).push(r);
    });
    function porGanho(x, y) {
      return (y.pct == null ? -1e9 : y.pct) - (x.pct == null ? -1e9 : x.pct);
    }
    itens.sort(porGanho);
    tags.sort(porGanho);
    estado.itens = itens;
    estado.tags = tags;
    estado.diag = { descartes: descartes, contTags: contTags, ms: Date.now() - t0, analisados: lista.length };
    desenhar();
  }

  // ---------- Desenho ----------
  function corDem(d) {
    return d === 0 ? 'neg' : d === 1 ? 'warn' : d >= 3 ? 'pos' : '';
  }
  function miniatura(id) {
    return THUMBS[id] ? '<img class="thumb" src="' + esc(THUMBS[id]) + '" alt="">' : '<span class="thumb"></span>';
  }
  // Embaixo do nome: só a demanda.
  function detalhes(i) {
    if (!(i.dem >= 0)) return '<span class="sub">Sem dados</span>';
    return '<span class="' + corDem(i.dem) + '">' + esc(P.demandaCurta[i.dem]) + '</span>';
  }
  // Valor com a fonte ao lado ("value" ou "RAP"); a fonte tem largura fixa
  // para os números ficarem alinhados.
  function celValor(n, fonte) {
    return '<td class="num">' + fmtNum(n) + '<span class="an-fonte">' + fonte + '</span></td>';
  }
  function linhaItem(i) {
    return (
      '<tr><td class="item"><div class="cel">' + miniatura(i.id) + '<div><span class="nome">' + esc(i.nome) + '</span>' +
      '<span class="det">' + detalhes(i) + '</span></div></div></td>' +
      celValor(valorEfetivo(i), i.value != null ? 'value' : 'RAP') + '</tr>'
    );
  }
  // Um lado (Recebo ou Dou) com a linha Total (value base, Robux já incluídos).
  function tabelaLado(rotulo, itens, robux, recebe, t) {
    var h = '<table class="an-t"><thead><tr><th>' + rotulo + '</th><th class="num">Valor</th></tr></thead><tbody>';
    h += itens.map(linhaItem).join('');
    if (robux) {
      var liquido = recebe ? Math.floor(robux * (1 - P.taxaRobux)) : robux;
      h += '<tr><td class="item">+ ' + fmtNum(robux) + ' Robux</td>' + celValor(liquido, recebe ? 'líq.' : '') + '</tr>';
    }
    h += '</tbody><tfoot><tr><td>Total</td>' + celValor(t.value, '') + '</tr></tfoot>';
    return h + '</table>';
  }
  // Cartão minimalista: topo, Recebo, divisória, Dou e só a % (na cor do veredito).
  function cartao(r, k) {
    var ad = r.ad;
    var rotulo = r.modo === 'itens'
      ? 'Pede seus itens' + (r.tipo ? ' · ' + r.tipo + ' para você' : '')
      : 'Pede ' + r.tag;
    return (
      '<div class="an-card" data-k="' + k + '" data-cor="' + r.v.cor + '">' +
      '<div class="an-topo"><b>' + esc(ad[3] || 'Jogador ' + ad[2]) + '</b><span class="sub">' + haQuanto(ad[1]) + '</span></div>' +
      '<p class="an-rotulo">' + esc(rotulo) + '</p>' +
      tabelaLado('Recebo', r.rec, ad[5], true, r.tr) +
      '<div class="an-div"></div>' +
      tabelaLado(r.modo === 'tag' ? 'Dou (sugestão)' : 'Dou', r.dou, 0, false, r.td) +
      '<div class="an-pct" data-cor="' + r.v.cor + '">' + pctTxt(r.pct) + '</div>' +
      '</div>'
    );
  }
  function desenharBloco(lista, idLista, idN, vazio) {
    $(idN).textContent = estado.carregou ? lista.length : '';
    $(idN).className = 'n' + (lista.length ? ' pos' : '');
    if (!estado.carregou) {
      $(idLista).innerHTML = '<p class="vazio">' + (estado.carregando ? 'Buscando...' : '—') + '</p>';
      return [];
    }
    if (!lista.length) {
      $(idLista).innerHTML = '<p class="vazio">' + vazio + '</p>';
      return [];
    }
    var mostrados = lista.slice(0, PA.maxLista);
    var h = mostrados.map(function (r) {
      estado.cartoes.push(r);
      return cartao(r, estado.cartoes.length - 1);
    }).join('');
    if (lista.length > mostrados.length) h += '<p class="an-mais">Mostrando ' + mostrados.length + ' de ' + lista.length + '.</p>';
    $(idLista).innerHTML = h;
    return mostrados;
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
      L.push('Análise: ' + estado.itens.length + ' pedem seus itens, ' + estado.tags.length + ' por tag, em ' + dg.ms + ' ms · seus itens livres: ' + meus.length);
      var ds = Object.keys(dg.descartes).sort(function (x, y) { return dg.descartes[y] - dg.descartes[x]; });
      if (ds.length) L.push('Fora da lista: ' + ds.map(function (d) { return d + ' ' + dg.descartes[d]; }).join(' · '));
    }
    if (lt && lt.amostra) L.push('Amostra bruta: ' + lt.amostra);
    el.textContent = L.join('\n');
  }
  function desenhar() {
    estado.cartoes = [];
    desenharStatus();
    var a = desenharBloco(estado.itens, 'an-lista-itens', 'an-n-itens', 'Nenhum anúncio pede itens seus com vantagem agora.');
    var b = desenharBloco(estado.tags, 'an-lista-tags', 'an-n-tags', 'Nenhuma combinação sua serve para os anúncios de upgrade, downgrade ou any agora.');
    desenharDiag();
    if (window.thPedirMiniaturas) {
      var ids = [];
      a.concat(b).forEach(function (r) {
        r.rec.concat(r.dou).forEach(function (i) { ids.push(i.id); });
      });
      try { window.thPedirMiniaturas(ids); } catch (e) {}
    }
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
    processar();
  };
  window.thAbrirAnuncios = function () {
    if (!estado.carregou && !estado.carregando) pedir(false);
  };
  window.thAoReceberMiniaturas = function () {
    if (estado.carregou) desenhar();
  };

  // ---------- Menu do cartão ----------
  function fecharMenu() {
    $('an-fundo').classList.add('oculto');
    $('an-folha').classList.add('oculto');
  }
  $('aba-anuncios').addEventListener('click', function (ev) {
    var c = ev.target.closest('.an-card');
    if (!c) return;
    var r = estado.cartoes[Number(c.getAttribute('data-k'))];
    if (!r) return;
    var ad = r.ad;
    $('an-folha-nome').textContent = (ad[3] || 'Jogador ' + ad[2]) + ' · ' + r.v.titulo;
    $('an-link-rol').href = 'https://www.rolimons.com/player/' + ad[2];
    $('an-link-trade').href = 'https://www.roblox.com/users/' + ad[2] + '/trade';
    $('an-fundo').classList.remove('oculto');
    $('an-folha').classList.remove('oculto');
  });
  $('an-atualizar').addEventListener('click', function () { pedir(true); });
  $('an-fundo').addEventListener('click', fecharMenu);
  $('an-cancelar').addEventListener('click', fecharMenu);
  $('an-link-rol').addEventListener('click', function () { setTimeout(fecharMenu, 300); });
  $('an-link-trade').addEventListener('click', function () { setTimeout(fecharMenu, 300); });

  // ---------- Início ----------
  desenhar();
  // Se o painel abriu direto nesta aba (aba lembrada), já busca.
  if (!$('aba-anuncios').classList.contains('oculto')) pedir(false);
}

// <script> da aba. Vem depois do script do avaliador (usa TH_D, TH_P e as funções dele).
function script(cfg, meuId) {
  return (
    '<script>\n' +
    'if (typeof TH_D !== "undefined") (' + paginaAnuncios.toString() + ')(TH_D, TH_P, ' +
    avaliador.serializar(parametros(cfg, meuId)) + ');\n' +
    '</script>'
  );
}

module.exports = { TAGS, lerAnuncio, carregar, secao, folha, css, script };
