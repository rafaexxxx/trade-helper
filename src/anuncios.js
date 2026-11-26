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

function parametros(cfg, meuId) {
  return {
    meuId: Number(meuId) || 0,
    horas: cfg.ANUNCIOS_GUARDAR_HORAS,
    // Do SEU ponto de vista (a tag do anúncio é do dono).
    // v6.16: degraus (abertura + teto). Padrões se o config.js for antigo.
    upTeto: cfg.ANUNCIO_SEU_UPGRADE_TETO_PCT != null ? cfg.ANUNCIO_SEU_UPGRADE_TETO_PCT : 9,
    upAbertura: cfg.ANUNCIO_SEU_UPGRADE_ABERTURA_PCT != null ? cfg.ANUNCIO_SEU_UPGRADE_ABERTURA_PCT : 2,
    downMin: cfg.ANUNCIO_SEU_DOWNGRADE_MIN_PCT != null ? cfg.ANUNCIO_SEU_DOWNGRADE_MIN_PCT : 7,
    downMax: cfg.ANUNCIO_SEU_DOWNGRADE_MAX_PCT != null ? cfg.ANUNCIO_SEU_DOWNGRADE_MAX_PCT : 16,
    downAbertura: cfg.ANUNCIO_SEU_DOWNGRADE_ABERTURA_PCT != null ? cfg.ANUNCIO_SEU_DOWNGRADE_ABERTURA_PCT : 14,
    degrauDist: cfg.ANUNCIO_DEGRAU_DISTANCIA_PCT != null ? cfg.ANUNCIO_DEGRAU_DISTANCIA_PCT : 2,
    // v6.6: forma da sugestão (o padrão vale se o config.js for antigo).
    addMax: cfg.ANUNCIO_ADD_MAX_VALUE != null ? cfg.ANUNCIO_ADD_MAX_VALUE : 500,
    addsMax: cfg.ANUNCIO_ADDS_MAX != null ? cfg.ANUNCIO_ADDS_MAX : 2,
    minMedios: cfg.ANUNCIO_SEU_DOWNGRADE_MIN_MEDIOS != null ? cfg.ANUNCIO_SEU_DOWNGRADE_MIN_MEDIOS : 2,
    pool: cfg.ANUNCIO_COMBINACAO_MAX_ITENS,
    // v6.17: Plano para seu inventário.
    planoItens: cfg.PLANO_ITENS_TESTADOS != null ? cfg.PLANO_ITENS_TESTADOS : 12,
    planoMax: cfg.PLANO_MAX != null ? cfg.PLANO_MAX : 5,
    planoAlvos: cfg.PLANO_ALVOS != null ? cfg.PLANO_ALVOS : 4,
    maxLista: cfg.ANUNCIOS_MAX_NA_LISTA,
  };
}

// ---------- HTML ----------
// v5.0: status + filtros (um item seu, ordem) + uma lista única de linhas curtas.
// A explicação das regras foi para a tela de Ajuda.
// v6.13 (Etapa 5, protótipo Q2): o topo virou três linhas curtas: a forma (com os
// números), os chips "Item ▾" e "Ordem ▾" (abrem folhas) e o status miúdo com ↻.
// O título "Anúncios N" saiu (o número já está na barra da forma).
// v7.0 (protótipo B · Um por vez): o chip "Um item" saiu; "Meus itens" vale para
// tudo (pedidos, sugestões e Plano). Embaixo: fila de anúncios + um aberto.
function secao(cfg, erro) {
  if (erro) {
    return '<div id="aba-anuncios" class="aba oculto"><p class="aviso">A aba Anúncios não pôde ser montada: ' + esc(erro) + '</p></div>';
  }
  return (
    '<div id="aba-anuncios" class="aba oculto">' +
    '<div class="an-topo">' +
    // v6.8: forma da trade do SEU ponto de vista. v7.1: virou o botão "Filtro ▾"
    // (folha com Todos, Upgrade e Downgrade e quantos anúncios cada um tem).
    // v7.2 (protótipo compacto, opção A): os chips numa linha só, que passa para
    // o lado, e o ↻ preso na direita. O texto "N anúncios analisados" foi para o
    // Diagnóstico; a hora da busca fica embaixo do título (window.thHoraAnuncios).
    '<div class="an-linha-t"><div class="an-sel"><button type="button" class="chip" id="an-filtro"></button>' +
    '<button type="button" class="chip" id="an-ordem"></button>' +
    // v6.20: quais itens seus entram (v7.0: nos pedidos, nas sugestões e no Plano).
    '<button type="button" class="chip" id="an-meus"></button></div>' +
    '<button type="button" class="an-atu" id="an-atualizar" aria-label="Atualizar anúncios">↻</button></div>' +
    '<p class="meta oculto" id="an-info"></p>' +
    '</div>' +
    '<p class="aviso oculto" id="an-erro"></p>' +
    '<p class="meta oculto" id="an-conta"></p>' +
    '<div id="an-lista"></div>' +
    // v5.4: as regras desta aba ficam na Ajuda (a tag é do dono do anúncio etc.).
    ajuda.link('aj-tags', 'Como as contas funcionam?') +
    '</div>'
  );
}

// v6.18: aba "Plano" (protótipo aprovado). O conteúdo é desenhado pela página
// (paginaAnuncios), porque usa as mesmas regras, cartões e anúncios desta aba.
function secaoPlano(erro) {
  if (erro) {
    return '<div id="aba-plano" class="aba oculto"><p class="aviso">A aba Plano não pôde ser montada: ' + esc(erro) + '</p></div>';
  }
  return (
    '<div id="aba-plano" class="aba oculto">' +
    '<div id="pz-corpo" class="pz-corpo"><p class="vazio">Montando o plano...</p></div>' +
    ajuda.link('aj-plano', 'Como o plano funciona?') +
    '</div>'
  );
}

// Folhas "Meus itens" e, v6.13, a da ordem. (v7.0: a folha "Um item seu" saiu.)
function folha() {
  return (
    // v6.20: folha "Meus itens" (marca e desmarca os itens que entram nos anúncios).
    '<div id="am-fundo" class="fundo oculto"></div>' +
    '<div id="am-folha" class="an-fl oculto">' +
    '<div class="an-fl-topo"><b>Meus itens</b><button type="button" id="am-fechar">Pronto</button></div>' +
    '<p class="an-fl-info">Só os itens marcados entram nos anúncios (pedidos e sugestões, inclusive como add) e no Plano. Marque só um para ver só os anúncios dele.</p>' +
    '<div class="an-fl-lista" id="am-lista"></div>' +
    '</div>' +
    // v7.1: folha do Filtro (forma da trade do seu lado).
    '<div id="af-fundo" class="fundo oculto"></div>' +
    '<div id="af-folha" class="folha oculto">' +
    '<p>Filtro dos anúncios</p>' +
    '<button type="button" class="op af-op" data-f="todos">Todos<small></small></button>' +
    '<button type="button" class="op af-op" data-f="upgrade"><span class="f-up">Upgrade</span><small></small></button>' +
    '<button type="button" class="op af-op" data-f="downgrade"><span class="f-down">Downgrade</span><small></small></button>' +
    '<button type="button" class="op cancelar" id="af-cancelar">Cancelar</button>' +
    '</div>' +
    '<div id="ao-fundo" class="fundo oculto"></div>' +
    '<div id="ao-folha" class="folha oculto">' +
    '<p>Ordem dos anúncios</p>' +
    '<button type="button" class="op" data-o="ganho">Maior ganho</button>' +
    '<button type="button" class="op" data-o="recentes">Recentes</button>' +
    '<button type="button" class="op" data-o="value">Maior value</button>' +
    '<button type="button" class="op cancelar" id="ao-cancelar">Cancelar</button>' +
    '</div>'
  );
}

function css() {
  return `
/* v6.13: topo em três linhas curtas (forma; chips Item e Ordem; status com ↻). */
.an-topo{display:flex;flex-direction:column;gap:10px}
.folha .af-op small{margin-left:6px;font-size:14px;font-weight:600;color:var(--sub)}
.an-linha-t{display:flex;align-items:center;gap:8px}
.an-sel{flex:1;min-width:0;display:flex;gap:6px;align-items:center;overflow-x:auto;-webkit-overflow-scrolling:touch;margin-left:-16px;padding:2px 0 2px 16px;scrollbar-width:none;-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}
.an-sel::-webkit-scrollbar{display:none}
.an-sel .chip{flex:none;display:inline-flex;align-items:center;gap:6px;min-width:0;padding:7px 11px;font-size:13px;font-weight:600;white-space:nowrap}
.an-sel .chip small{font-size:12.5px;font-weight:600;color:var(--sub)}
.an-sel .chip.on small{color:inherit}
.an-sel .chip .t{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.an-sel .chip .v{flex:none;font-size:11px;opacity:.75}
.an-status{display:flex;align-items:center;gap:10px}
.an-status .meta{flex:1;min-width:0;margin:0;font-size:12.5px}
.an-atu{flex:none;width:38px;height:38px;padding:0;border:1px solid var(--card-borda);border-radius:50%;background:var(--card);box-shadow:var(--sombra);color:var(--fg);font-size:19px;line-height:1;-webkit-tap-highlight-color:transparent}
.an-atu:active{background:var(--card2)}
.an-atu:disabled{opacity:.6}
.an-atu.buscando{animation:anGira .9s linear infinite}
@keyframes anGira{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion: reduce){.an-atu.buscando{animation:none}}
/* v7.0 (protótipo B · Um por vez): fila em cima e um anúncio aberto embaixo.
   O anúncio aberto é um .an-grupo (os temas já pintam essa classe). */
.an-um{display:flex;flex-direction:column;gap:10px}
#aba-anuncios{gap:12px}
.an-fila{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -16px;padding:2px 16px 4px;scrollbar-width:none}
.an-fila::-webkit-scrollbar{display:none}
/* v7.2 (opção A): fila baixa, tudo numa linha: Dou → Recebo, a % e a forma. */
.an-fila button{flex:none;display:flex;flex-direction:row;align-items:center;gap:8px;padding:6px 10px;border-radius:var(--r-card,16px);background:var(--card);border:2px solid var(--card-borda);color:var(--fg);text-align:left;-webkit-tap-highlight-color:transparent}
.an-fila button.on{border-color:var(--acc-t)}
.an-fila .m{display:flex;align-items:center;gap:3px}
.an-fila .m .g{display:flex;align-items:center;gap:1px}
.an-fila .m .thumb{width:28px;height:28px}
.an-fila .m i{font-style:normal;font-size:12px;font-weight:800;color:var(--sub)}
.an-fila .m .so-rbx{font-size:12px;font-weight:800;color:var(--pos)}
.an-fila .tx{display:flex;flex-direction:column;align-items:flex-start;line-height:1.15}
.an-fila b{font-size:16px;font-weight:800;color:var(--c);white-space:nowrap}
.an-fila small{font-size:11px;color:var(--sub);white-space:nowrap}
.an-fila small .f-up,.an-fila small .f-down,.an-cab .j span .f-up,.an-cab .j span .f-down{font-weight:700}
.an-cab{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 13px}
.an-cab .j{display:flex;flex-direction:column;gap:2px;min-width:0}
.an-cab .j b{font-size:15.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.an-cab .j span{font-size:12.5px;color:var(--sub)}
.an-cab .selo{flex:none;padding:3px 9px;font-size:12px;font-weight:800;white-space:nowrap}
.an-duelo{position:relative;display:grid;grid-template-columns:1fr 1fr}
/* v7.1 (opção C): o lado com mais itens ganha mais largura. */
.an-duelo.mais-r{grid-template-columns:1fr 1.7fr}
.an-duelo.mais-d{grid-template-columns:1.7fr 1fr}
.an-duelo>.an-cena+.an-cena{border-left:1px solid var(--borda)}
.an-cena{min-width:0;display:flex;flex-direction:column;padding:10px 8px 40px;background:var(--card2)}
.an-cena.r{background:var(--heroi);color:var(--on-heroi)}
.an-cena .q{font-size:12.5px;font-weight:600;opacity:.85}
.an-cena .q b{display:block;font-size:28px;font-weight:800;letter-spacing:-.02em;line-height:1.1;opacity:1}
.an-cena.r .q{text-align:right}
/* v7.1: fotos grandes, sem sobreposição: 1 item ocupa o lado; 2 ou mais ficam
   em grade de 2 com linhas finas entre eles. Selinhos (value e vendas/dia) por
   cima da parte de cima da foto; o nome curto embaixo. */
.an-fts{display:flex;flex-wrap:wrap;justify-content:center;align-content:center;min-height:178px;margin-top:6px}
.an-fts:is(.n2,.n3,.n4){display:grid;grid-template-columns:1fr 1fr;align-content:start}
.an-it{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:0;margin:0;padding:6px 5px 8px;border:0;background:none;color:inherit;font:inherit;-webkit-tap-highlight-color:transparent}
.an-fts.n1 .an-it{width:92%;max-width:180px}
.an-fts:is(.n2,.n3,.n4) .an-it:nth-child(odd){border-right:1px solid var(--heroi-linha,var(--borda))}
.an-fts:is(.n3,.n4) .an-it:nth-child(-n+2){border-bottom:1px solid var(--heroi-linha,var(--borda))}
.an-it .an-foto{display:block;width:100%;aspect-ratio:1}
.an-it .thumb{width:100%;height:100%}
.an-it>small{max-width:100%;font-size:12px;font-weight:700;line-height:1.2;opacity:.92;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.an-sl{position:absolute;top:4px;left:3px;right:3px;z-index:2;display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px;pointer-events:none}
.an-sl span{padding:2px 6px;border-radius:999px;font-size:11px;font-weight:800;line-height:1.3;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.an-sl .vv{background:var(--folha);color:var(--acc-t);border:1px solid var(--card-borda)}
.an-sl .vd.pos{background:var(--pos-bg);color:var(--pos)}
.an-sl .vd.neg{background:var(--neg-bg);color:var(--neg)}
.an-sl .vd.esp{background:var(--card2);color:var(--sub)}
.an-fts .so-rbx{align-self:center;font-size:20px;font-weight:800}
.an-cena .rbx{margin-top:2px;font-size:12.5px;font-weight:700;text-align:center;opacity:.9}
.an-vs{position:absolute;left:50%;bottom:-28px;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;align-items:center;padding:6px 14px;border-radius:16px;background:var(--folha);border:2px solid var(--c);color:var(--c);font-size:27px;font-weight:800;letter-spacing:-.02em;line-height:1.05;white-space:nowrap}
.an-vs small{margin-top:2px;font-size:14px;font-weight:800;letter-spacing:0}
.an-corpo{display:flex;flex-direction:column;gap:12px;padding:40px 13px 14px}
.an-tb{display:flex;flex-direction:column}
.an-tb>div{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--borda)}
.an-tb>div:last-child{border-bottom:0}
.an-tb>div>span{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sub);text-align:center}
.an-tb b{min-width:0;font-size:14.5px;font-weight:700;line-height:1.3;overflow-wrap:anywhere}
.an-tb b:last-child{text-align:right}
.an-dg{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.an-dg.um{grid-template-columns:1fr}
.an-dg>*{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0;padding:10px 12px;border-radius:var(--r-card,16px);background:var(--card2);border:2px solid transparent;color:var(--fg);text-align:left;font:inherit;-webkit-tap-highlight-color:transparent}
.an-dg>button.on{border-color:var(--c)}
.an-dg small{font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--sub)}
.an-dg b{font-size:22px;font-weight:800;color:var(--c)}
.an-dg i{font-style:normal;font-size:12.5px;color:var(--sub)}
.an-um .an-acoes .btn{padding:14px 8px;font-size:15px;font-weight:700}
.an-ftodos{display:grid;place-items:center;color:var(--sub);font-size:15px}
.folha .op.on{font-weight:700}
.folha .op.on::after{content:"  ✓"}
/* v6.13: selo de giro na linha fechada (vendas/dia do item principal que você
   recebe). Some quando o cartão abre: lá cada item mostra o número. */
.giro{flex:none;display:inline-flex;align-items:center;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;line-height:1.35;white-space:nowrap}
.giro.pos{background:var(--pos-bg);color:var(--pos)}
.giro.neg{background:var(--neg-bg);color:var(--neg)}
.giro.esp{background:var(--card2);color:var(--sub)}
.an-it.aberto .giro{display:none}

.an-grupo{display:flex;flex-direction:column;border-radius:18px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.an-grupo{-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}
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
button.an-i{width:100%;margin:0;border:0;background:none;font:inherit;text-align:left}
button.an-i:active{background:var(--card2)}
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
/* v6.16: degraus (abertura + teto/mínimo), do protótipo aprovado. */
.an-pct b{white-space:nowrap}
.dg-n{display:inline-grid;place-items:center;width:20px;height:20px;margin-right:6px;border-radius:50%;background:var(--dou-bg);color:var(--acc-t);font-size:11px;font-weight:700;vertical-align:1px}
.an-lado.rec .dg-n{background:var(--rec-bg);color:var(--pos)}
.an-lcab .dg-p{font-size:14px;font-weight:700;color:var(--c)}
.dg-pe{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dg-caixa{display:flex;flex-direction:column;gap:8px;min-width:0;padding:10px 12px;border-radius:14px;background:var(--card)}
.dg-caixa .rot{font-size:12px;font-weight:600;color:var(--sub)}
.dg-caixa b{font-size:24px;font-weight:700;line-height:1;letter-spacing:-.02em;color:var(--c)}
.dg-caixa small{font-size:13px;font-weight:700;color:var(--c)}
.dg-caixa .selo{align-self:flex-start;max-width:100%;font-size:12px;padding:4px 10px}
.dg-dica{margin:0;font-size:12px;color:var(--sub)}
/* v6.17/v6.18: aba Plano (protótipos aprovados). As trades do plano combinado
   usam .pl-*; os passos, .pz-*; a escadinha, .ez. */
.pz-corpo{display:flex;flex-direction:column;gap:22px}
.pz-sec{display:flex;flex-direction:column;gap:12px}
.pz-sec .sec-t{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.pz-sec .sec-t h2{margin:0;font-size:19px;font-weight:700}
.pz-sec .sec-t span{font-size:12px;color:var(--sub)}
.pz-res{display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;background:var(--heroi);color:var(--on-heroi);border:1px solid var(--heroi-borda);box-shadow:var(--sombra)}
.pz-res .num{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.pz-res small{font-size:12px;opacity:.85}
.pz-res b{font-size:26px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.pz-res .an-grp{flex-wrap:wrap;justify-content:flex-end;max-width:45%;background:rgba(255,255,255,.14)}
.pz{display:flex;flex-direction:column;border-radius:18px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.pz{-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}
.pz-cab{display:flex;flex-direction:column;gap:4px;padding:13px 14px 10px}
.pz-cab .l1{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.pz-cab b{font-size:16px;font-weight:700;overflow-wrap:anywhere}
.pz-cab .sub{font-size:12px}
.pz-tag{flex:none;padding:2px 7px;border-radius:6px;font-size:11px;font-weight:700;background:var(--card2);color:var(--sub)}
.pz-tag.acc{background:var(--acc-fundo);color:var(--on-acc)}
.pz-troca{display:flex;align-items:center;gap:10px;padding:4px 14px 12px}
.pz-lado{display:flex;flex-direction:column;gap:4px;min-width:0}
.pz-lado small{font-size:11px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:.04em}
.pz-lado b{font-size:15px;font-variant-numeric:tabular-nums}
.pz-faixa{flex:1;min-width:0;text-align:right}
.pz-faixa b{display:block;font-size:17px;font-weight:700;color:var(--acc-t);font-variant-numeric:tabular-nums}
.pz-faixa span{font-size:12px;color:var(--sub)}
.pz-ad{display:flex;align-items:center;gap:10px;width:100%;margin:0;padding:11px 14px;border:0;border-top:1px solid var(--borda);background:var(--rec-bg);color:inherit;font:inherit;text-align:left;-webkit-tap-highlight-color:transparent}
.pz-ad .t{flex:1;min-width:0;font-size:13px;color:var(--sub)}
.pz-ad .t b{display:block;font-size:14px;color:var(--fg);overflow-wrap:anywhere}
.pz-ad .p{flex:none;text-align:right;font-size:15px;font-weight:700;color:var(--c);white-space:nowrap}
.pz-ad .p small{display:block;font-size:11px;font-weight:600}
.pz-ad[aria-expanded="true"] .an-chev{transform:rotate(90deg)}
.pz-ad.nada{background:none;font-size:13px;color:var(--sub)}
.pz-alvos{border-top:1px solid var(--borda);padding-bottom:4px}
.pz-alvos>p{margin:0;padding:10px 14px 4px;font-size:12px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:.04em}
.pz-sem{display:block;padding:4px 14px 8px;font-size:13px;color:var(--sub)}
.pz-alvo{display:flex;align-items:center;gap:10px;width:100%;margin:0;padding:8px 14px;border:0;background:none;color:inherit;font:inherit;text-align:left;-webkit-tap-highlight-color:transparent}
.pz-alvo:active{background:var(--card2)}
.pz-alvo .thumb{width:34px;height:34px;border-radius:9px}
.pz-alvo .txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.pz-alvo .nome{font-size:14px;font-weight:600;overflow-wrap:anywhere}
.pz-alvo .det{font-size:12px;color:var(--sub)}
.pz-alvo .v{flex:none;font-size:15px;font-weight:700;font-variant-numeric:tabular-nums}
.pz-alvo .v small{margin-left:3px;font-size:11px;font-weight:500;color:var(--sub)}
.pz-seta{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:var(--card2);color:var(--acc-t);font-size:12px}
.ez{border-radius:18px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.ez table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}
.ez th,.ez td{padding:9px 10px;text-align:right;font-size:14px}
.ez th{font-size:12px;font-weight:600;color:var(--sub)}
.ez th:first-child,.ez td:first-child{text-align:left;color:var(--sub);font-weight:600}
.ez tr+tr td{border-top:1px solid var(--borda)}
.ez td.o{color:var(--pos);font-weight:700}
.ez td.p{color:var(--acc-t);font-weight:700}
.ez td.s{color:var(--neg);font-weight:700}
.ez-pe{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:10px;border-top:1px solid var(--borda);background:var(--card2)}
.ez-pe div{display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--sub)}
.ez-pe b{font-size:13px}
.pz-corpo .nota{margin:0;font-size:12px;line-height:1.45;color:var(--sub)}
/* v7.0 (protótipo B · Um passo por vez): resumo herói, barra dos passos, cenas
   com "?" no Recebo, faixa de value, alvos em carrossel e escadinha em 3 colunas. */
.pz-corpo{gap:14px}
.pz-res b{font-size:30px;font-weight:800}
.pz-mi{flex:none;display:grid;grid-template-columns:repeat(2,auto);gap:4px}
.pz-mi .thumb{width:44px;height:44px}
.seg.pz-passos button{flex:1;padding:10px 2px;font-size:14px;font-weight:700;white-space:nowrap}
.pz-cab b{font-size:17px;font-weight:800}
.pz-duelo .an-cena{padding-bottom:14px}
.pz-duelo .an-fts.n1:has(.pz-qq),.pz-duelo .an-fts.n2:has(.pz-qq){display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.pz-qq{width:56%;max-width:104px;aspect-ratio:1;display:grid;place-items:center;border-radius:50%;border:2.5px dashed currentColor;opacity:.75;font-size:34px;font-weight:800}
.an-fts.n1 .pz-qq{width:74%;max-width:140px}
.pz-fx{display:flex;flex-direction:column;align-items:center;gap:1px;padding:10px 13px;border-top:1px solid var(--borda);text-align:center}
.pz-fx small{font-size:12.5px;color:var(--sub)}
.pz-fx b{font-size:22px;font-weight:800;color:var(--acc-t)}
.pz-ad{background:var(--pos-bg)}
.pz-ad .p{font-size:20px;font-weight:800}
.pz-car{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding:2px 14px 8px;scrollbar-width:none}
.pz-car::-webkit-scrollbar{display:none}
.pz-al{flex:none;width:118px;display:flex;flex-direction:column;gap:4px;margin:0;padding:8px;border:0;border-radius:calc(var(--r-card,16px) * .7);background:var(--card2);color:inherit;font:inherit;text-align:left;-webkit-tap-highlight-color:transparent}
.pz-al .thumb{width:100%;height:78px;border-radius:0;background:none;object-fit:contain}
.pz-al .nm{font-size:12.5px;font-weight:700;line-height:1.2;min-height:2.4em;overflow-wrap:anywhere}
.pz-al b{font-size:17px;font-weight:800}
.pz-al small{font-size:11.5px;color:var(--sub)}
.ez3{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.ez3 .c{display:flex;flex-direction:column;gap:6px;min-width:0;padding:10px 8px;border-radius:var(--r-card,16px);background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra)}
.ez3 .c.m{background:var(--heroi);color:var(--on-heroi);border-color:var(--heroi-borda)}
.ez3 .c>small{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;opacity:.8;text-align:center}
.ez3 .v{display:flex;justify-content:space-between;gap:4px;font-size:12px;opacity:.85}
.ez3 .v b{font-size:14.5px;font-weight:800;opacity:1;font-variant-numeric:tabular-nums}
.ez3 .pv{text-align:center;font-size:16px;font-weight:800;padding-top:6px;border-top:1px solid var(--borda)}
.ez3 .c.m .pv{border-color:var(--heroi-linha)}
.ez3 .pv small{display:block;font-size:11px;font-weight:600;opacity:.8}
.pz .pl-tr,.pl-tr{border-top:1px solid var(--borda)}
.pl-linha{display:flex;align-items:center;gap:10px;width:100%;padding:11px 14px;border:0;background:none;text-align:left;-webkit-tap-highlight-color:transparent}
button.pl-linha:active,.pl-tr.aberto>.pl-linha{background:var(--card2)}
.pl-tr.aberto>.pl-linha .an-chev{transform:rotate(90deg)}
.pl-num{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--acc-fundo);color:var(--on-acc);font-size:13px;font-weight:700}
.pl-meta .pl-num{background:var(--card2);color:var(--sub)}
.pl-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
.pl-l1{display:flex;align-items:baseline;gap:6px;min-width:0;font-size:14px;font-weight:700}
.pl-t{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pl-l1 .an-tempo{font-weight:500}
.pl-q{display:grid;place-items:center;font-size:12px;font-weight:700;color:var(--sub)}
.pl-alvo{margin:0;font-size:13px;line-height:1.4;color:var(--sub)}
.pl-alvo b{color:var(--fg)}
.pl-pe{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;border-top:1px solid var(--borda)}
.pl-pe .meta{margin:0;font-size:12px}
.pl-outro{flex:none;border:0;background:none;padding:4px 0;font-size:14px;font-weight:600;color:var(--acc-t)}

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
/* v6.20: folha "Meus itens" (marcado = entra nas sugestões). */
#am-lista .an-fl-op:not(.on) :is(.thumb,.an-fl-txt){opacity:.5}
.am-ck{flex:none;display:grid;place-items:center;width:24px;height:24px;border:2px solid var(--borda);border-radius:50%;font-size:13px;font-weight:700;color:transparent}
#am-lista .an-fl-op.on .am-ck{background:var(--acc-fundo);border-color:var(--acc);color:var(--on-acc)}
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
  var A = { meus: [], porAsset: {}, emHold: {}, meusOrdenados: [], todosOrdenados: [], ocultos: {}, meuId: PA.meuId };
  var memoCombinacao = {};

  // Seus itens disponíveis (sem hold e com dados no Rolimon's).
  // v6.20 (filtro "Meus itens"), ocultos opcional = { assetId: 1 } itens que você
  // desmarcou: não entram em nenhuma sugestão (nem como add) nem no Plano.
  // todosOrdenados = todos os disponíveis, desmarcados inclusive (para a folha).
  A.montarMeus = function (inv, ocultos) {
    ocultos = ocultos || {};
    var meus = [];
    var todos = [];
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
      todos.push(i);
      if (ocultos[i.id]) return;
      meus.push(i);
      (porAsset[i.id] = porAsset[i.id] || []).push(i);
    });
    A.meus = meus;
    A.porAsset = porAsset;
    A.emHold = emHold;
    A.ocultos = ocultos;
    A.meusOrdenados = meus.slice().sort(function (x, y) { return y.vb - x.vb; });
    A.todosOrdenados = todos.sort(function (x, y) { return y.vb - x.vb; });
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
  // v6.17 (Plano para o inventário), op opcional:
  //   op.excluir = { uaid: 1 } cópias suas que não podem entrar (já vão no downgrade);
  //   op.mais = true: prefere usar MAIS itens (depois, o mais perto de alvo).
  function chaveOp(op) {
    if (!op) return '';
    return (op.mais ? 'm' : '') + '~' + Object.keys(op.excluir || {}).sort().join('.');
  }
  function melhorCombinacao(T, minQ, maxQ, lo, hi, alvo, proibidos, fixo, op) {
    var chave = [Math.round(T), minQ, maxQ, lo, hi, alvo, Object.keys(proibidos).sort().join(','), fixo || '', chaveOp(op)].join('|');
    if (!(chave in memoCombinacao)) memoCombinacao[chave] = calcularCombinacao(T, minQ, maxQ, lo, hi, alvo, proibidos, fixo, op);
    return memoCombinacao[chave];
  }
  function calcularCombinacao(T, minQ, maxQ, lo, hi, alvo, proibidos, fixo, op) {
    var excluir = (op && op.excluir) || {};
    var mais = !!(op && op.mais);
    minQ = Math.max(minQ, 1);
    maxQ = Math.min(maxQ, P.maxItens);
    if (!(T > 0) || maxQ < minQ) return null;
    var sMin = T / (1 + hi / 100);
    var sMax = T / (1 + lo / 100);
    var escolha = [];
    var soma0 = 0;
    var f = null;
    if (fixo) {
      f = (A.porAsset[fixo] || []).filter(function (c) { return !excluir[c.uaid]; })[0];
      if (!f || !(f.vb > 0) || f.vb > sMax || proibidos[f.id]) return null;
      escolha.push(f);
      soma0 = f.vb;
    }
    var pool = [];
    var ordenados = A.meusOrdenados;
    for (var k = 0; k < ordenados.length && pool.length < PA.pool; k++) {
      var x = ordenados[k];
      if (x === f || proibidos[x.id] || excluir[x.uaid]) continue;
      if (x.vb > 0 && soma0 + x.vb <= sMax) pool.push(x);
    }
    var melhor = null;
    function testar(soma) {
      if (escolha.length < minQ || soma < sMin) return;
      var p = ((T - soma) / soma) * 100;
      var nota = Math.abs(p - alvo);
      var n = escolha.length;
      var troca;
      if (!melhor) troca = true;
      else if (mais && n !== melhor.itens.length) troca = n > melhor.itens.length;
      else troca = nota < melhor.nota - 1e-9 || (Math.abs(nota - melhor.nota) < 1e-9 && n < melhor.itens.length);
      if (troca) melhor = { nota: nota, pct: p, itens: escolha.slice() };
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
  // os médios) já tem que ganhar PA.downMin; o total fica até PA.downMax.
  // v6.16: dois degraus com o MESMO item seu: a ABERTURA (a mais perto de
  // PA.downAbertura) e o MÍNIMO (a mais perto de PA.downMin, pelo menos
  // PA.degrauDist pontos abaixo da abertura). Empate: menos itens.
  // fixo = o item que você dá. Volta { dou, rec, segundo: { dou, rec } | null }.
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
    // A parte da oferta que dá para pedir pelo item x, com o ganho até hi%, a
    // mais perto de alvo%.
    function escolher(x, alvo, hi) {
      var m = null;
      for (var j2 = 0; j2 < ofertas.length; j2++) {
        var o = ofertas[j2];
        var pN = ((o.nucleo - x.vb) / x.vb) * 100;
        var p = ((o.soma - x.vb) / x.vb) * 100;
        if (pN < PA.downMin || p > hi + 1e-9) continue;
        // v6.6: o mesmo item nunca vai dos dois lados numa sugestão.
        if (o.ids[x.id]) continue;
        var nota = Math.abs(p - alvo);
        var qtd = o.itens.length + 1;
        if (!m || nota < m.nota - 1e-9 || (Math.abs(nota - m.nota) < 1e-9 && qtd < m.qtd)) {
          m = { nota: nota, qtd: qtd, x: x, rec: o.itens, p: p };
        }
      }
      return m;
    }
    var dar = fixo ? (A.porAsset[fixo] || []).slice(0, 1) : A.meusOrdenados;
    var melhor = null;
    for (var k = 0; k < dar.length; k++) {
      var x = dar[k];
      if (!(x.vb > 0)) continue;
      var a = escolher(x, PA.downAbertura, PA.downMax);
      if (a && (!melhor || a.nota < melhor.nota - 1e-9 || (Math.abs(a.nota - melhor.nota) < 1e-9 && a.qtd < melhor.qtd))) melhor = a;
    }
    if (!melhor) return null;
    var t = escolher(melhor.x, PA.downMin, melhor.p - PA.degrauDist);
    return { dou: [melhor.x], rec: melhor.rec, segundo: t ? { dou: [melhor.x], rec: t.rec } : null };
  }

  // v6.6: SEU UPGRADE (tag "downgrade" do dono). Você pede 1 item só da oferta e
  // dá de 2 a P.maxItens itens seus (sem limite de adds do seu lado), pagando de
  // 0 a PA.upTeto a mais. Empate: menos itens.
  // v6.16: dois degraus pelo MESMO item dele: a ABERTURA (a mais perto de pagar
  // PA.upAbertura) e o TETO (a mais perto de PA.upTeto, pagando pelo menos
  // PA.degrauDist pontos a mais que a abertura). Volta { dou, rec, segundo }.
  // v6.17: op (opcional, do Plano) = { excluir, mais }: a abertura prefere usar
  // mais itens; o teto só respeita o excluir.
  function melhorUpgrade(rec, fixo, op) {
    var mais = !!(op && op.mais);
    var melhor = null;
    for (var k = 0; k < rec.length; k++) {
      var r = rec[k];
      var vb = valorEfetivo(r);
      if (!(vb > 0)) continue;
      var proibidos = {};
      proibidos[r.id] = true;
      var c = melhorCombinacao(vb, 2, P.maxItens, -PA.upTeto, 0, -PA.upAbertura, proibidos, fixo, op);
      if (!c) continue;
      var qtd = c.itens.length + 1;
      var troca;
      if (!melhor) troca = true;
      else if (mais && qtd !== melhor.qtd) troca = qtd > melhor.qtd;
      else troca = c.nota < melhor.nota - 1e-9 || (Math.abs(c.nota - melhor.nota) < 1e-9 && qtd < melhor.qtd);
      if (troca) melhor = { nota: c.nota, qtd: qtd, dou: c.itens, rec: [r], vb: vb, proibidos: proibidos, pct: c.pct };
    }
    if (!melhor) return null;
    var opT = op && op.excluir ? { excluir: op.excluir } : null;
    var t = melhorCombinacao(melhor.vb, 2, P.maxItens, -PA.upTeto, melhor.pct - PA.degrauDist, -PA.upTeto, melhor.proibidos, fixo, opT);
    return { dou: melhor.dou, rec: melhor.rec, segundo: t ? { dou: t.itens, rec: melhor.rec } : null };
  }

  // ---------- Análise de um anúncio ----------
  // ad = [id, criadoMs, userId, username, oferta[], robux, pedido[], tags[]]
  // fixo = assetId do filtro "Um item seu" ('' = sem filtro).
  // forma (v6.8, opcional) = 'upgrade' ou 'downgrade' do SEU ponto de vista
  // (filtro da página): a sugestão é montada só nessa forma e o anúncio que pede
  // seus itens só passa se a trade tiver essa forma. Sem forma = como antes.
  // op (v6.17, opcional, só o Plano usa) = { excluir: { uaid: 1 }, mais: true }:
  // essas cópias suas não entram no seu lado, e o seu upgrade prefere mais itens.
  A.analisar = function (ad, fixo, forma, op) {
    var excluir = (op && op.excluir) || {};
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
        var livres = (porAsset[id] || []).filter(function (c) { return !excluir[c.uaid]; });
        var n = usados[id] || 0;
        if (n >= livres.length) {
          if (A.ocultos[id]) return { descarte: 'pede item seu desmarcado em Meus itens' };
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
      if (forma && tipo !== forma) return { descarte: 'fora da forma do filtro', forma: true };
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
    // v6.8: filtro de forma. Seu upgrade vem da tag "downgrade" do dono e o seu
    // downgrade, da tag "upgrade" (ver abaixo).
    if (forma === 'upgrade') querUp = false;
    else if (forma === 'downgrade') querDown = false;
    if (!querUp && !querDown) return { descarte: 'fora da forma do filtro', forma: true };
    var kq = rec.length;
    if (!kq) return { descarte: 'oferta só de Robux' };
    // A tag é do ponto de vista do DONO:
    // "upgrade" = ele dá mais itens = SEU DOWNGRADE: você dá 1 item e pede uma parte
    //   da oferta (ganha a mais, sem pesar a mão);
    // "downgrade" = ele dá menos itens = SEU UPGRADE: você pede 1 item dele e dá
    //   vários (paga o menor overpay que ele deve aceitar).
    // v6.6: os Robux do dono ficam de fora (a sugestão pede só itens).
    var opcoes = [];
    if (querUp) opcoes.push({ tag: 'upgrade', s: melhorDowngrade(rec, fixo), robux: 0 });
    if (querDown) opcoes.push({ tag: 'downgrade', s: melhorUpgrade(rec, fixo, op), robux: 0 });
    // v6.16: cada degrau com as próprias somas e veredito.
    function degrau(dou, rec) {
      var g = { dou: dou, rec: rec };
      g.tr = somarLado(rec, 0, true, P);
      g.td = somarLado(dou, 0, false, P);
      g.tipo = tipoTrocaLados(g.td, g.tr);
      g.v = calcularVeredito(dou, rec, g.td, g.tr, g.tipo, 0, P);
      g.pct = ganho(g.td, g.tr);
      return g;
    }
    // Entre as tags aceitas, fica a opção de melhor veredito (empate: maior ganho).
    // v6.16: o que vale é o ÚLTIMO degrau (teto/mínimo, o pior caso para você):
    // veredito, %, ordem "Maior ganho", filtro de forma e notificações.
    var melhor = null;
    opcoes.forEach(function (o) {
      if (!o.s) return;
      o.degraus = [degrau(o.s.dou, o.s.rec)];
      if (o.s.segundo) o.degraus.push(degrau(o.s.segundo.dou, o.s.segundo.rec));
      var u = o.degraus[o.degraus.length - 1];
      o.dou = u.dou;
      o.rec = u.rec;
      o.tr = u.tr;
      o.td = u.td;
      o.tipo = u.tipo;
      o.v = u.v;
      o.p = u.pct;
      o.nivel = o.v && o.v.nivel != null ? o.v.nivel : -2;
      if (!melhor || o.nivel > melhor.nivel || (o.nivel === melhor.nivel && (o.p == null ? -1e9 : o.p) > (melhor.p == null ? -1e9 : melhor.p))) melhor = o;
    });
    if (!melhor) {
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
    // v6.16: "o que você pede" pela abertura (a 1ª oferta que você manda); o
    // passo a passo dos degraus fica na dica embaixo das caixas.
    var nRec = melhor.degraus[0].rec.length;
    var pede = nRec === kq ?
      (kq === 1 ? 'pede o item dele' : 'pede os ' + kq + ' itens que ele oferece') :
      'pede só ' + nRec + ' dos ' + kq + ' itens que ele oferece';
    var semRobux = ad[5] && !melhor.robux ? ' Os Robux dele ficam de fora.' : '';
    var unica = melhor.degraus.length < 2 ? ' Só uma combinação sua cabe na faixa.' : '';
    var nota;
    if (melhor.tag === 'upgrade') {
      nota = 'Ele quer upgrade, então para você é downgrade: você dá 1 item e ' + pede + '.' + unica + semRobux;
    } else {
      nota = 'Ele quer downgrade, então para você é upgrade: você dá vários itens seus e ' + pede + '.' + unica + semRobux;
    }
    var mesmoS = [];
    melhor.degraus.forEach(function (g) {
      repetidos(g.dou, g.rec).forEach(function (n) { if (mesmoS.indexOf(n) < 0) mesmoS.push(n); });
    });
    return {
      modo: 'tag', tag: melhor.tag, ad: ad, dou: dou2, rec: rec2, robux: melhor.robux, td: td, tr: melhor.tr, tipo: tipo, v: v, pct: p,
      degraus: melhor.degraus, mesmo: mesmoS, nota: nota,
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
  var NOMES_ORDEM = { ganho: 'Maior ganho', recentes: 'Recentes', value: 'Maior value' };
  // v6.8: filtro de forma, do SEU ponto de vista (mesmo texto da etiqueta da linha).
  // v7.1: "Upgrade"/"Downgrade" (sempre do seu lado), sem o "Seu" na frente.
  var FORMAS = { todos: 'Todos', upgrade: 'Upgrade', downgrade: 'Downgrade' };

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
    // formas = as três listas (todos, upgrade, downgrade); lista = a do filtro.
    formas: { todos: [], upgrade: [], downgrade: [] },
    // v7.0: o filtro "Um item" saiu (item fica sempre vazio); quem escolhe os
    // itens é o "Meus itens". degrau = o degrau mostrado no anúncio aberto.
    item: '', ordem: lerSalvo('an-ordem', 'ganho'), aberto: null, degrau: 0,
    forma: lerSalvo('an-forma', 'todos'),
  };
  if (!ORDENS[estado.ordem]) estado.ordem = 'ganho';
  if (!FORMAS[estado.forma]) estado.forma = 'todos';

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
  // v6.20: itens desmarcados em "Meus itens" ({ assetId: 1 }), por conta (id do
  // dono do inventário). Item novo no inventário entra marcado.
  // v6.21: ficam num arquivo do iPhone (ponte 'meusitens'), porque o localStorage do
  // WebView não guarda depois de fechar o app; o widget lê o mesmo arquivo.
  var meusItens = PA.meusItens || {};
  function lerOcultos() {
    var r = {};
    var l = meusItens[String(AN.meuId)];
    if (Array.isArray(l)) l.forEach(function (id) { r[String(id)] = 1; });
    return r;
  }
  function gravarOcultos() {
    if (!AN.meuId) return;
    var ids = Object.keys(estado.ocultos);
    meusItens[String(AN.meuId)] = ids;
    var f = document.createElement('iframe');
    f.style.display = 'none';
    f.src = P.ponte + 'meusitens?u=' + AN.meuId + '&ids=' + ids.join(',') + '&t=' + Date.now();
    document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
  }
  estado.ocultos = lerOcultos();
  function invAtual() {
    return chaveConta ? estado.invConta || [] : D.inventario;
  }
  function montarMeus(inv) {
    AN.montarMeus(inv, estado.ocultos);
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
    var nRefeitos = 0;
    var formas = { todos: [], upgrade: [], downgrade: [] };
    function analisar(ad, forma) {
      try {
        return AN.analisar(ad, estado.item, forma);
      } catch (e) {
        return { descarte: 'erro na análise: ' + (e && e.message) };
      }
    }
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
      var r = analisar(ad, '');
      if (r.descarte) {
        if (r.filtro) foraDoFiltro++;
        else descartes[r.descarte] = (descartes[r.descarte] || 0) + 1;
        return;
      }
      if (r.modo === 'itens') nItens++;
      saida.push(r);
      // v6.8: listas dos filtros Upgrade/Downgrade. O resultado de "Todos" já
      // serve para a forma dele (r.tipo é do seu ponto de vista). Só o anúncio
      // com as DUAS tags é analisado de novo, montando a outra forma.
      if (formas[r.tipo]) formas[r.tipo].push(r);
      var tags = ad[7] || [];
      if (r.modo === 'tag' && tags.indexOf('upgrade') >= 0 && tags.indexOf('downgrade') >= 0) {
        var outra = r.tipo === 'upgrade' ? 'downgrade' : 'upgrade';
        var r2 = analisar(ad, outra);
        if (!r2.descarte && r2.tipo === outra) {
          formas[outra].push(r2);
          nRefeitos++;
        }
      }
    });
    formas.todos = saida;
    ['todos', 'upgrade', 'downgrade'].forEach(function (f) { ordenar(formas[f]); });
    estado.formas = formas;
    estado.lista = formas[estado.forma];
    estado.pedidos = pedidos;
    estado.diag = {
      descartes: descartes, contTags: contTags, ms: Date.now() - t0, analisados: lista.length,
      nItens: nItens, nTags: saida.length - nItens, foraDoFiltro: foraDoFiltro, nRefeitos: nRefeitos,
    };
    desenhar();
  }

  // ---------- v6.17/v6.18: aba Plano ----------
  // A estratégia do Rafael com vários itens: DOWNGRADE em um item seu (dar 1 e
  // receber 2–3 médios) e UPGRADE no resto (2 a 4 dos outros por 1), sem item
  // repetido nas duas trades. v6.18: virou a aba "Plano" (protótipo aprovado):
  // resumo, próximo degrau (o plano combinado, Subir e Descer, com metas em
  // números, o anúncio que serve agora e alvos do catálogo) e a escadinha.
  // Só calcula depois que a aba é aberta (plano.ativo), em partes (setTimeout).
  var plano = {
    // v7.0: passo = o passo mostrado ('comb', 'subir', 'descer' ou 'esc').
    ativo: false, lista: [], idx: 0, aberto: null, timer: null, chave: undefined, meus: null, passo: '',
    pronto: false, subir: null, descer: null, alvosSubir: [], alvosDescer: [],
  };
  function nivelDe(r) {
    return r && r.v && r.v.nivel != null ? r.v.nivel : -2;
  }
  function degrausDe(r) {
    return r.degraus && r.degraus.length ? r.degraus : [r];
  }
  // a é melhor que b? Veredito do 2º degrau; no upgrade do resto, depois o que
  // usa mais itens seus; por fim o maior ganho.
  function melhorPerna(a, b, contarItens) {
    if (!b) return true;
    if (nivelDe(a) !== nivelDe(b)) return nivelDe(a) > nivelDe(b);
    var na = primeiro(a).dou.length;
    var nb = primeiro(b).dou.length;
    if (contarItens && na !== nb) return na > nb;
    return (a.pct == null ? -1e9 : a.pct) > (b.pct == null ? -1e9 : b.pct);
  }
  function analisarPlano(ad, fixo, forma, op) {
    try {
      return AN.analisar(ad, fixo, forma, op);
    } catch (e) {
      return { descarte: 'erro' };
    }
  }
  // Seus itens que podem entrar (fora de hold, com value ou RAP), do maior.
  function livres() {
    return AN.meusOrdenados.filter(function (i) { return i.vb > 0; });
  }
  function somaVb(l) {
    var s = 0;
    l.forEach(function (i) { s += i.vb; });
    return s;
  }
  // Anúncios que podem servir (o analisar decide o resto). Downgrade: pede 1
  // item seu, ou só tags com "upgrade". Upgrade: pede 2+ itens seus, ou só
  // tags com "downgrade". Sem anúncios buscados, nenhum.
  function anunciosDoPlano() {
    var r = { down: [], up: [] };
    if (!estado.carregou) return r;
    ((estado.res && estado.res.lista) || []).forEach(function (ad) {
      if (AN.meuId && ad[2] === AN.meuId) return;
      var tags = ad[7] || [];
      var ped = ad[6] || [];
      var meusPed = ped.length > 0 && ped.every(function (id) { return AN.porAsset[id]; });
      if (ped.length ? meusPed && ped.length === 1 : tags.indexOf('upgrade') >= 0) r.down.push(ad);
      if (ped.length ? meusPed && ped.length >= 2 : tags.indexOf('downgrade') >= 0) r.up.push(ad);
    });
    return r;
  }
  // Melhor downgrade de X: o seu lado tem só 1 item em todos os degraus.
  function melhorDown(X, ads) {
    var down = null;
    ads.down.forEach(function (ad) {
      var r = analisarPlano(ad, X.id, 'downgrade');
      if (r.descarte || r.tipo !== 'downgrade') return;
      if (degrausDe(r).some(function (g) { return g.dou.length !== 1; })) return;
      if (melhorPerna(r, down, false)) down = r;
    });
    return down;
  }
  // Melhor upgrade sem as cópias de excl (prefere usar mais itens), fora do
  // anúncio "evitar" (o do downgrade do mesmo plano).
  function melhorUp(excl, ads, evitar) {
    var up = null;
    var op = { excluir: excl, mais: true };
    ads.up.forEach(function (ad) {
      if (evitar && ad[0] === evitar) return;
      var r = analisarPlano(ad, '', 'upgrade', op);
      if (r.descarte || r.tipo !== 'upgrade') return;
      if (degrausDe(r).some(function (g) { return g.dou.some(function (i) { return excl[i.uaid]; }); })) return;
      if (melhorPerna(r, up, true)) up = r;
    });
    return up;
  }
  // Metas em números (as faixas dos degraus) para as trades sem anúncio.
  function metaDescer(X) {
    return { de: X.vb * (1 + PA.downMin / 100), ate: X.vb * (1 + PA.downAbertura / 100) };
  }
  function metaSubir(dou) {
    var s = somaVb(dou);
    return { dou: dou, soma: s, de: s * (1 - PA.upTeto / 100), ate: s * (1 - PA.upAbertura / 100) };
  }
  function montarPlano(X, meus, ads, downs) {
    // 1. Downgrade de X.
    var down = melhorDown(X, ads);
    downs[X.uaid] = down;
    var excl = {};
    if (down) degrausDe(down).forEach(function (g) { g.dou.forEach(function (i) { excl[i.uaid] = 1; }); });
    else excl[X.uaid] = 1;
    var resto = meus.filter(function (i) { return !excl[i.uaid]; });
    if (resto.length < 2) return null;
    // 2. Upgrade do resto, noutro anúncio.
    var up = melhorUp(excl, ads, down && down.ad[0]);
    if (!down && !up) return null;
    var p = { x: down ? down.dou[0] : X, down: down, up: up, reais: (down ? 1 : 0) + (up ? 1 : 0) };
    if (!down) p.metaDown = metaDescer(X);
    if (!up) p.metaUp = metaSubir(resto.slice(0, P.maxItens));
    return p;
  }
  // Sem anúncio para nenhuma das trades: o plano só com metas (o maior desce).
  function planoSoMetas(meus) {
    var X = meus[0];
    return { x: X, down: null, up: null, reais: 0, metaDown: metaDescer(X), metaUp: metaSubir(meus.slice(1, 1 + P.maxItens)) };
  }
  // Itens do catálogo para mirar: value entre lo e hi, demanda Normal ou melhor,
  // sem projected nem hyped, tendência que não cai e RAP sem subir demais em
  // 24h. Ordem: maior demanda, depois o mais perto do meio da faixa.
  function alvosCatalogo(lo, hi, evitar) {
    var C = D.catalogo;
    var meio = (lo + hi) / 2;
    var l = [];
    for (var id in C) {
      var c = C[id];
      var v = c[3];
      if (!(v > 0) || v < lo || v > hi || evitar[id]) continue;
      if (!(c[4] >= 2) || c[5] === 0 || (c[6] & 3)) continue;
      if (c[7] != null && c[7] >= P.alertaRap24) continue;
      l.push({ id: id, dem: c[4], d: Math.abs(v - meio) });
    }
    l.sort(function (a, b) { return b.dem - a.dem || a.d - b.d; });
    return l.slice(0, PA.planoAlvos).map(function (x) { return itemDoCatalogo(C, x.id); });
  }
  // Primeiro os planos com as duas trades reais; depois o veredito das duas e o
  // ganho. Plano com uma trade real só: no máximo um por anúncio.
  function escolherPlanos(l) {
    function soma(p) { return (p.down ? p.down.pct || 0 : 0) + (p.up ? p.up.pct || 0 : 0); }
    l.sort(function (a, b) {
      if (a.reais !== b.reais) return b.reais - a.reais;
      var na = nivelDe(a.down) + nivelDe(a.up);
      var nb = nivelDe(b.down) + nivelDe(b.up);
      if (na !== nb) return nb - na;
      return soma(b) - soma(a);
    });
    var saida = [];
    var usados = {};
    l.forEach(function (p) {
      if (saida.length >= PA.planoMax) return;
      if (p.reais < 2) {
        var id = (p.down || p.up).ad[0];
        if (usados[id]) return;
        usados[id] = 1;
      }
      saida.push(p);
    });
    return saida;
  }
  function iniciarPlanos() {
    // Só depois que a aba Plano foi aberta (o cálculo pesa um pouco).
    if (!plano.ativo) return;
    // Mesmos anúncios e mesmo inventário: já está calculado (ou calculando).
    if (plano.chave === estado.res && plano.meus === AN.meus) return;
    clearTimeout(plano.timer);
    var chave = estado.res;
    var inv = AN.meus;
    plano.chave = chave;
    plano.meus = inv;
    plano.lista = [];
    plano.idx = 0;
    plano.aberto = null;
    plano.subir = null;
    plano.descer = null;
    plano.pronto = false;
    var meus = livres();
    // Alvos do catálogo (não dependem dos anúncios). Subir: 1 item na faixa do
    // upgrade dos seus até 4 maiores. Descer: médios (acima de um add) que,
    // em 2 ou 3, somam a faixa do downgrade do seu maior item.
    var dou = meus.slice(0, P.maxItens);
    plano.alvosSubir = [];
    plano.alvosDescer = [];
    if (dou.length >= 2) {
      var ms = metaSubir(dou);
      var ev = {};
      dou.forEach(function (i) { ev[i.id] = 1; });
      plano.alvosSubir = alvosCatalogo(ms.de, ms.ate, ev);
    }
    if (meus.length) {
      var md = metaDescer(meus[0]);
      var evd = {};
      evd[meus[0].id] = 1;
      plano.alvosDescer = alvosCatalogo(Math.max(PA.addMax, md.de / 3), md.ate / 2, evd);
    }
    // Anúncios: um passo por vez (cada item seu do plano combinado, depois o
    // Descer do maior e o Subir dos 4 maiores).
    var ads = anunciosDoPlano();
    var tarefas = [];
    var achados = [];
    var downs = {};
    if (estado.carregou) {
      if (meus.length >= 3) {
        var porId = {};
        var nCand = 0;
        meus.forEach(function (X) {
          if (porId[X.id] || nCand >= PA.planoItens) return;
          porId[X.id] = 1;
          nCand++;
          tarefas.push(function () {
            var p = montarPlano(X, meus, ads, downs);
            if (p) achados.push(p);
          });
        });
      }
      if (meus.length >= 1) {
        tarefas.push(function () {
          plano.descer = meus[0].uaid in downs ? downs[meus[0].uaid] : melhorDown(meus[0], ads);
        });
      }
      if (meus.length >= 2) {
        tarefas.push(function () {
          var excl = {};
          meus.forEach(function (i) { if (dou.indexOf(i) < 0) excl[i.uaid] = 1; });
          plano.subir = melhorUp(excl, ads, null);
        });
      }
    }
    var k = 0;
    function passo() {
      // Chegaram anúncios novos ou trocou a conta: outro cálculo assume.
      if (plano.chave !== chave || plano.meus !== inv) return;
      if (k < tarefas.length) {
        tarefas[k++]();
        plano.timer = setTimeout(passo, 0);
        return;
      }
      plano.lista = escolherPlanos(achados);
      plano.pronto = estado.carregou;
      desenharPlano();
      pedirMiniaturas(idsPlano());
    }
    desenharPlano();
    pedirMiniaturas(idsPlano());
    plano.timer = setTimeout(passo, 30);
  }
  // Itens da aba Plano (miniaturas).
  function idsPlano() {
    var ids = [];
    if (!plano.ativo) return ids;
    function add(r) {
      if (r) itensDe(r).forEach(function (i) { ids.push(i.id); });
    }
    livres().forEach(function (i) { ids.push(i.id); });
    plano.lista.forEach(function (p) { add(p.down); add(p.up); });
    add(plano.subir);
    add(plano.descer);
    plano.alvosSubir.concat(plano.alvosDescer).forEach(function (i) { ids.push(i.id); });
    return ids;
  }
  // A trade aberta na aba Plano (para pedir as vendas dos itens dela).
  function pernaAberta() {
    var a = plano.aberto;
    if (!a) return null;
    if (a === 's') return plano.subir;
    if (a === 'd') return plano.descer;
    var p = plano.lista[plano.idx];
    if (!p) return null;
    return a === 'c1' ? p.down : a === 'c2' ? p.up : null;
  }

  // ---------- Desenho ----------
  function corDem(d) {
    return d === 0 ? 'neg' : d === 1 ? 'warn' : d >= 3 ? 'pos' : '';
  }
  function miniatura(id) {
    return THUMBS[id] ? '<img class="thumb" src="' + esc(THUMBS[id]) + '" alt="">' : '<span class="thumb"></span>';
  }
  // ---------- v6.13: vendas/dia (selo de giro e itens do cartão aberto) ----------
  // As vendas vêm da mesma fila do Inventário e do Avaliar (PONTE + 'linhas?ids=',
  // que fura a fila; até 2 × MAX_ITENS_POR_LADO ids por pedido). LN = as linhas
  // guardadas no iPhone (D.linhas) mais as que chegam por window.thAoReceberLinhasAn.
  var LN = {};
  (function () { var l = D.linhas || {}; for (var id in l) LN[id] = l[id]; })();
  var vendasAn = { pedidosPor: {}, pendentes: {}, timer: null, redesenho: null };
  function nivelVendas(v) {
    var n = 0;
    (P.demVendas || []).forEach(function (l) { if (v >= l) n++; });
    return n;
  }
  function principal(itens) {
    var m = null;
    itens.forEach(function (i) { if (!m || valorEfetivo(i) > valorEfetivo(m)) m = i; });
    return m;
  }
  // Selo da linha fechada: "gira" a partir de 1 venda por dia (Normal na escala
  // da demanda), "parado" abaixo disso, "…" enquanto as vendas não chegam.
  // v6.16: a linha fechada mostra a abertura (o 1º degrau); sem degraus, a oferta.
  function primeiro(r) {
    return r.degraus && r.degraus.length ? r.degraus[0] : r;
  }
  // Todos os itens do anúncio (todos os degraus), sem repetir o mesmo objeto.
  function itensDe(r) {
    var l = [];
    (r.degraus && r.degraus.length ? r.degraus : [r]).forEach(function (g) {
      g.rec.concat(g.dou).forEach(function (i) { if (l.indexOf(i) < 0) l.push(i); });
    });
    return l;
  }
  // (v7.0: o selo "gira/parado" da linha fechada saiu; as vendas/dia do item
  // principal ficam na comparação linha a linha do anúncio aberto.)
  // Pede as vendas que faltam: o item principal de cada anúncio mostrado e os
  // itens do cartão aberto. Uma vez por item em cada abertura do painel.
  function pedirVendasAn() {
    var ids = [];
    function quer(i) {
      if (!i || !i.id || vendasAn.pedidosPor[i.id] || ids.indexOf(i.id) >= 0) return;
      var ln = LN[i.id];
      if (ln && ln.v != null) return;
      ids.push(i.id);
    }
    var aberto = null;
    estado.mostrados.forEach(function (r) {
      if (estado.aberto === r.ad[0]) aberto = r;
      quer(principal(primeiro(r).rec));
    });
    // v6.17: a trade aberta no Plano também conta como cartão aberto.
    if (!aberto) aberto = pernaAberta();
    // Os do cartão aberto vão primeiro.
    if (aberto) {
      var antes = ids;
      ids = [];
      itensDe(aberto).forEach(quer);
      antes.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
    }
    if (!ids.length) return;
    ids.forEach(function (id) { vendasAn.pedidosPor[id] = 1; vendasAn.pendentes[id] = 1; });
    // Cada pedido vai para a frente da fila: manda os pacotes do último para o
    // primeiro, para o primeiro pacote ser buscado primeiro.
    var tam = Math.max(1, (P.maxItens || 4) * 2);
    var pacotes = [];
    for (var k = 0; k < ids.length; k += tam) pacotes.push(ids.slice(k, k + tam));
    pacotes.reverse().forEach(function (p, n) {
      setTimeout(function () {
        var f = document.createElement('iframe');
        f.style.display = 'none';
        f.src = P.ponte + 'linhas?ids=' + p.join(',') + '&t=' + Date.now() + n;
        document.body.appendChild(f);
        setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
      }, n * 400);
    });
    // Sem resposta (Scriptable ocupado ou fechado): tira os "…" depois de 4 min.
    clearTimeout(vendasAn.timer);
    vendasAn.timer = setTimeout(function () {
      vendasAn.pendentes = {};
      if (estado.carregou) desenharLista();
    }, 240000);
  }
  window.thAoReceberLinhasAn = function (mapa) {
    var mexeu = false;
    for (var id in mapa) {
      if (mapa[id]) { LN[id] = mapa[id]; mexeu = true; }
      if (vendasAn.pendentes[id]) { delete vendasAn.pendentes[id]; mexeu = true; }
    }
    if (!mexeu || !estado.carregou) return;
    // Várias respostas seguidas = um redesenho só.
    clearTimeout(vendasAn.redesenho);
    vendasAn.redesenho = setTimeout(function () {
      desenharLista();
      desenharPlano();
    }, 300);
  };
  function faixaPctAn(l) {
    function c(p) { return String(Math.round(p * 10) / 10).replace('.', ','); }
    return (l[0] === l[1] ? c(l[0]) : c(l[0]) + '–' + c(l[1])) + '%';
  }
  // Embaixo do nome, no cartão aberto (v6.13, igual ao Avaliar): demanda ·
  // vendas/dia · só o OP do lado. Recebo = OP dar (laranja); Dou = OP pedir (verde).
  function detalhes(i, lado) {
    var d = [];
    var ln = LN[i.id];
    if (i.dem >= 0) d.push('<span class="' + corDem(i.dem) + '">' + esc(P.demandaCurta[i.dem]) + '</span>');
    if (ln && ln.tv) d.push('<span class="' + esc(ln.c) + '">' + esc(ln.tv) + '</span>');
    else if (vendasAn.pendentes[i.id]) d.push('<span class="sub">…/dia</span>');
    var dem = i.dem;
    if (!(dem >= 0) && ln && ln.v != null) dem = nivelVendas(ln.v);
    var base = valorEfetivo(i);
    if (base > 0 && P.opRegua && (dem >= 0 || !vendasAn.pendentes[i.id])) {
      var op = opFaixas(base, dem, P.opRegua);
      d.push(lado === 'rec'
        ? '<span class="warn">OP dar ' + faixaPctAn(op.dar.pct) + '</span>'
        : '<span class="pos">OP pedir ' + faixaPctAn(op.pedir.pct) + '</span>');
    }
    return d.length ? d.join(' · ') : '<span class="sub">Sem dados</span>';
  }
  // Valor com a fonte ao lado ("value" ou "RAP"); a fonte tem largura fixa
  // para os números ficarem alinhados.
  function valor(n, fonte) {
    return '<span class="an-val">' + fmtNum(n) + '<small>' + fonte + '</small></span>';
  }
  // Item do cartão aberto. v6.12: o toque abre a tela do item (cartao.js), que
  // tem o "Ver no Rolimon's" embaixo.
  function linhaItem(i, lado) {
    return (
      '<button type="button" class="an-i" data-item="' + esc(i.id) + '" data-nome="' + esc(i.nome) + '">' + miniatura(i.id) +
      '<span class="item-txt"><span class="nome">' + esc(i.nome) + '</span>' +
      '<span class="det">' + detalhes(i, lado) + '</span></span>' +
      valor(valorEfetivo(i), i.value != null ? 'value' : 'RAP') +
      '<span class="an-seta" aria-hidden="true">›</span></button>'
    );
  }
  // Mudanças de 24h que a lista já tem (sem busca extra), no fim da tela do item.
  function mudancas24(i) {
    var m = [];
    if (i && i.rap24) m.push(['RAP ' + fmtPctSinal(i.rap24) + ' em 24h', i.rap24 > 0 ? 'pos' : 'neg']);
    if (i && i.val24) m.push(['Value ' + fmtPctSinal(i.val24) + ' em 24h', i.val24 > 0 ? 'pos' : 'neg']);
    return m;
  }
  function abrirItem(b) {
    var id = b.getAttribute('data-item');
    if (!id || !window.thItem) return;
    window.thItem.abrir({
      id: id,
      nome: b.getAttribute('data-nome'),
      thumb: THUMBS[id] || null,
      mudancas: mudancas24(itemDoCatalogo(D.catalogo, id)),
      tituloMud: 'Mudanças em 24h',
    });
  }
  // Um lado (Recebo ou Dou) com a linha Total (value base, Robux já incluídos).
  // rotulo e direita são HTML (v6.16: direita = % do degrau no lugar de "Valor").
  function blocoLado(classe, rotulo, itens, robux, recebe, t, direita) {
    var h = '<div class="an-lado ' + classe + '"><div class="an-lcab"><span>' + rotulo + '</span>' + (direita || '<span>Valor</span>') + '</div>';
    h += itens.map(function (i) { return linhaItem(i, classe); }).join('');
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
  // v6.16: chave de um lado (para saber se ele muda entre os degraus).
  function chaveLado(l) {
    return l.map(function (i) { return i.id + ':' + (i.uaid || ''); }).join(',');
  }
  // v6.16.1: sugestão com uma combinação só: o 2º degrau vira o LIMITE em
  // número (Rafael). Seu upgrade: o máximo de value que você dá (teto);
  // seu downgrade: o mínimo que você aceita receber. Sem a caixa quando a
  // oferta já está a menos de PA.degrauDist pontos do limite.
  function limite(r) {
    if (r.modo !== 'tag' || r.pct == null) return null;
    if (r.tipo === 'upgrade' && r.tr.value > 0 && r.pct + PA.upTeto >= PA.degrauDist) {
      return { nome: 'Teto', pct: -PA.upTeto, txt: 'dê no máximo ' + fmtNum(Math.floor(r.tr.value / (1 - PA.upTeto / 100))) + ' de value' };
    }
    if (r.tipo === 'downgrade' && r.td.value > 0 && r.pct - PA.downMin >= PA.degrauDist) {
      return { nome: 'Mínimo', pct: PA.downMin, txt: 'aceite a partir de ' + fmtNum(Math.ceil(r.td.value * (1 + PA.downMin / 100))) + ' de value' };
    }
    return null;
  }
  function detalhe(r) {
    var ad = r.ad;
    var d = r.degraus || [];
    var h = '<div class="an-det">';
    if (r.nota) h += '<p class="an-nota">' + esc(r.nota) + '</p>';
    if (r.mesmo && r.mesmo.length) {
      h += '<p class="an-aviso">Tem <b>' + esc(r.mesmo.join(', ')) + '</b> dos dois lados. Continua na lista porque o ganho não é negativo.</p>';
    }
    var lim = d.length < 2 ? limite(r) : null;
    if (lim) {
      // v6.16.1: uma combinação só. A 1ª caixa é a oferta e a 2ª, o limite em
      // número (até onde você cede numa contraproposta).
      h += blocoLado('rec', 'Recebo', r.rec, r.robux, true, r.tr);
      h += blocoLado('dou', 'Dou (oferta)', r.dou, 0, false, r.td);
      var dl = r.tr.value - r.td.value;
      var corL = corVeredito(r.v);
      h += '<div class="dg-pe">' +
        '<div class="dg-caixa" data-cor="' + corL + '"><span class="rot">1 · Oferta</span><b>' + pctTxt(r.pct) + '</b>' +
        '<small>' + (dl > 0 ? '+' : '') + fmtNum(dl) + ' R$</small><span class="selo">' + esc(r.v ? tituloWFL(r.v) : '') + '</span></div>' +
        '<div class="dg-caixa" data-cor="justa"><span class="rot">2 · ' + lim.nome + '</span><b>' + pctTxt(lim.pct) + '</b>' +
        '<small>' + esc(lim.txt) + '</small></div></div>';
      h += '<p class="dg-dica">' + (r.tipo === 'downgrade'
        ? 'Mande a 1. Se ele fizer contraproposta, aceite só a partir do mínimo da 2.'
        : 'Mande a 1. Se ele fizer contraproposta, ceda só até o teto da 2.') + '</p>';
    } else if (d.length < 2) {
      h += blocoLado('rec', 'Recebo', r.rec, r.robux, true, r.tr);
      h += blocoLado('dou', r.modo === 'tag' ? 'Dou (oferta)' : 'Dou', r.dou, 0, false, r.td);
      var dif = r.tr.value - r.td.value;
      h += '<div class="an-pe" data-cor="' + corVeredito(r.v) + '"><span class="selo">' + esc(r.v ? tituloWFL(r.v) : '') + '</span>' +
        '<span class="an-ganho"><b>' + pctTxt(r.pct) + '</b><small>' + (dif > 0 ? '+' : '') + fmtNum(dif) + ' R$</small></span></div>';
    } else {
      // v6.16 (protótipo aprovado): o lado que não muda aparece uma vez; o que
      // muda aparece em cada degrau, com a % do degrau no cabeçalho. No seu
      // downgrade o 2º degrau é o "Mínimo" (o menor ganho que você aceita).
      var nomes = r.tipo === 'downgrade' ? ['Abertura', 'Mínimo'] : ['Abertura', 'Teto'];
      var recFixo = chaveLado(d[0].rec) === chaveLado(d[1].rec);
      var douFixo = chaveLado(d[0].dou) === chaveLado(d[1].dou);
      if (recFixo) h += blocoLado('rec', 'Recebo', d[0].rec, 0, true, d[0].tr);
      if (douFixo) h += blocoLado('dou', 'Dou', d[0].dou, 0, false, d[0].td);
      var caixas = '';
      d.forEach(function (g, k) {
        var cor = corVeredito(g.v);
        var dir = '<span class="dg-p" data-cor="' + cor + '">' + pctTxt(g.pct) + '</span>';
        var cab = '<span class="dg-n">' + (k + 1) + '</span>' + nomes[k];
        if (!recFixo) h += blocoLado('rec', 'Recebo · ' + cab, g.rec, 0, true, g.tr, douFixo ? dir : '');
        if (!douFixo) h += blocoLado('dou', 'Dou · ' + cab, g.dou, 0, false, g.td, dir);
        var dg = g.tr.value - g.td.value;
        caixas += '<div class="dg-caixa" data-cor="' + cor + '"><span class="rot">' + (k + 1) + ' · ' + nomes[k] + '</span>' +
          '<b>' + pctTxt(g.pct) + '</b><small>' + (dg > 0 ? '+' : '') + fmtNum(dg) + ' R$</small>' +
          '<span class="selo">' + esc(g.v ? tituloWFL(g.v) : '') + '</span></div>';
      });
      h += '<div class="dg-pe">' + caixas + '</div>';
      h += '<p class="dg-dica">' + (r.tipo === 'downgrade'
        ? 'Mande a 1. Se ele recusar ou fizer contraproposta, desça até a 2 e não aceite menos.'
        : 'Mande a 1. Se ele recusar ou fizer contraproposta, suba até a 2 e não passe dela.') + '</p>';
    }
    h += '<div class="an-acoes">' +
      '<a class="btn sec" href="https://www.rolimons.com/player/' + ad[2] + '">Ver jogador</a>' +
      '<a class="btn" href="https://www.roblox.com/users/' + ad[2] + '/trade">Abrir trade</a></div>';
    return h + '</div>';
  }
  // Etiqueta da linha: a forma da trade do SEU ponto de vista (a tag do dono fica
  // na nota do cartão). Azul = pede seus itens; cinza = combinação sugerida.
  // v7.1: "Upgrade" (roxo) e "Downgrade" (laranja), sem o "seu" (é sempre do seu lado).
  function etiqueta(r) {
    if (!r.rec.length) return 'por Robux';
    if (r.tipo === 'upgrade') return 'Upgrade';
    if (r.tipo === 'downgrade') return 'Downgrade';
    return 'Sidegrade';
  }
  function etiquetaHtml(r) {
    var c = r.tipo === 'upgrade' ? 'f-up' : r.tipo === 'downgrade' ? 'f-down' : '';
    return '<span class="' + c + '">' + esc(etiqueta(r)) + '</span>';
  }
  // Linha curta: jogador, etiqueta do tipo, tempo, miniaturas dos dois lados e a %.
  // O toque abre/fecha o cartão completo logo abaixo.
  // v6.16: com dois degraus, a linha mostra a faixa em números inteiros
  // ("-2 a -8%"); o veredito ao lado é o do teto/mínimo (r.v).
  function pctLinha(r) {
    var d = r.degraus;
    if (!d || d.length < 2) return pctTxt(r.pct);
    function n(p) {
      var x = Math.round(p);
      return (x > 0 ? '+' : '') + (x === 0 ? 0 : x);
    }
    return n(d[0].pct) + ' a ' + n(d[1].pct) + '%';
  }
  function desenharFiltro() {
    // v6.20: chip "Meus itens". Com algum desmarcado, destaca e mostra "2 de 3 itens".
    var nTodos = distintos(AN.todosOrdenados).length;
    var nUsa = distintos(AN.meusOrdenados).length;
    var bm = $('an-meus');
    bm.className = nUsa < nTodos ? 'chip filtro on' : 'chip';
    bm.setAttribute('aria-label', 'Escolher quais itens seus entram nos anúncios');
    bm.innerHTML = '<span class="t">' + (nUsa < nTodos ? nUsa + ' de ' + nTodos + ' itens' : 'Meus itens') +
      '</span><span class="v" aria-hidden="true">▾</span>';
    $('an-ordem').innerHTML = '<small>Ordem</small><span class="t">' + esc(NOMES_ORDEM[estado.ordem]) + '</span><span class="v" aria-hidden="true">▾</span>';
    // v7.1: botão "Filtro ▾" (forma do seu lado), com quantos anúncios a escolhida tem.
    var nf = estado.carregou ? ' · ' + estado.formas[estado.forma].length : '';
    var cf = estado.forma === 'upgrade' ? 'f-up' : estado.forma === 'downgrade' ? 'f-down' : '';
    $('an-filtro').innerHTML = '<small>Filtro</small><span class="t ' + cf + '">' + esc(FORMAS[estado.forma]) + nf + '</span><span class="v" aria-hidden="true">▾</span>';
    var fs = document.querySelectorAll('#af-folha .af-op');
    for (var k = 0; k < fs.length; k++) {
      var f = fs[k].getAttribute('data-f');
      fs[k].classList.toggle('on', f === estado.forma);
      fs[k].querySelector('small').textContent = estado.carregou ? estado.formas[f].length : '';
    }
  }
  // ---------- v6.18: desenho da aba Plano (protótipo aprovado) ----------
  function n0(v) {
    return fmtNum(Math.round(v));
  }
  function jogador(r) {
    return r.ad[3] || 'jogador ' + r.ad[2];
  }
  // Uma trade real do plano combinado: linha que abre o cartão da lista.
  function pernaReal(key, n, titulo, r) {
    var ab = plano.aberto === key;
    var g0 = primeiro(r);
    return (
      '<div class="pl-tr' + (ab ? ' aberto' : '') + '"><button type="button" class="pl-linha" data-pz="' + key + '" aria-expanded="' + ab + '">' +
      '<span class="pl-num">' + n + '</span><span class="pl-main"><span class="pl-l1"><span class="pl-t">' + esc(titulo) + '</span>' +
      '<span class="an-tempo">com ' + esc(jogador(r)) + '</span></span>' +
      '<span class="an-l2">' + grupo(g0.dou, 0, 'dou' + (r.modo === 'tag' ? ' sug' : '')) + '<span class="an-tr">⇄</span>' + grupo(g0.rec, r.robux, 'rec') + '</span></span>' +
      '<span class="an-pct" data-cor="' + corVeredito(r.v) + '"><b>' + pctLinha(r) + '</b><small>' + esc(r.v ? r.v.titulo : '') + '</small></span>' +
      '<span class="an-chev">›</span></button>' + (ab ? anuncioAberto(r) : '') + '</div>'
    );
  }
  // Uma trade sem anúncio: a meta em números.
  function pernaMeta(n, titulo, dou, nQ, texto) {
    var q = '';
    for (var k = 0; k < nQ; k++) q += '<span class="thumb pl-q">?</span>';
    return (
      '<div class="pl-tr pl-meta"><div class="pl-linha"><span class="pl-num">' + n + '</span><span class="pl-main">' +
      '<span class="pl-l1"><span class="pl-t">' + esc(titulo) + '</span><span class="an-tempo">meta</span></span>' +
      '<span class="an-l2">' + grupo(dou, 0, 'dou sug') + '<span class="an-tr">⇄</span><span class="an-grp rec sug">' + q + '</span></span>' +
      '<p class="pl-alvo">' + texto + '</p></span></div></div>'
    );
  }
  function txtMetaDescer(m) {
    return 'Peça 2 ou 3 itens médios (e até ' + PA.addsMax + ' adds) somando <b>' + n0(m.de) + ' a ' + n0(m.ate) +
      ' de value</b> (+' + PA.downMin + ' a +' + PA.downAbertura + '%).';
  }
  function txtMetaSubir(m) {
    return 'Procure <b>1 item de ' + n0(m.de) + ' a ' + n0(m.ate) + ' de value</b> por estes ' + m.dou.length +
      ' itens (-' + PA.upAbertura + ' a -' + PA.upTeto + '%).';
  }
  // Enquanto os anúncios não chegam (ou estão sendo cruzados), um aviso curto.
  function statusPlano() {
    if (!estado.carregou) return estado.carregando ? 'Buscando os anúncios...' : 'Os anúncios ainda não foram buscados.';
    if (!plano.pronto) return 'Procurando nos anúncios...';
    return '';
  }
  // "Serve agora": o melhor anúncio do momento para o passo (o toque abre o cartão).
  function serveAgora(key, r) {
    var st = statusPlano();
    if (st) return '<div class="pz-ad nada">' + st + '</div>';
    if (!r) return '<div class="pz-ad nada">Nenhum anúncio serve agora. Use os alvos abaixo para procurar ou anunciar.</div>';
    var ab = plano.aberto === key;
    var nomes = primeiro(r).rec.map(function (i) { return i.nome; }).join(' + ');
    return (
      '<button type="button" class="pz-ad" data-pz="' + key + '" aria-expanded="' + ab + '"><span class="t"><b>Serve agora: ' + esc(nomes) + '</b>' +
      'com ' + esc(jogador(r)) + ' · ' + haQuanto(r.ad[1]) + '</span>' +
      '<span class="p" data-cor="' + corVeredito(r.v) + '">' + pctLinha(r) + '<small>' + esc(r.v ? r.v.titulo : '') + '</small></span>' +
      '<span class="an-chev">›</span></button>' + (ab ? anuncioAberto(r) : '')
    );
  }
  // v7.0: alvo do catálogo = cartão do carrossel (foto, nome, value, demanda · N/dia).
  function linhaAlvo(i) {
    var d = [];
    if (i.dem >= 0) d.push('<span class="' + corDem(i.dem) + '">' + esc(P.demandaCurta[i.dem]) + '</span>');
    var ln = LN[i.id];
    if (ln && ln.tv) d.push('<span class="' + esc(ln.c) + '">' + esc(ln.tv) + '</span>');
    return (
      '<button type="button" class="pz-al" data-item="' + esc(i.id) + '" data-nome="' + esc(i.nome) + '">' + miniatura(i.id) +
      '<span class="nm">' + esc(i.nome) + '</span><b>' + fmtNum(valorEfetivo(i)) + '</b>' +
      (d.length ? '<small>' + d.join(' · ') + '</small>' : '') + '</button>'
    );
  }
  function blocoAlvos(titulo, l) {
    return (
      '<div class="pz-alvos"><p>' + titulo + '</p>' +
      (l.length ? '<div class="pz-car">' + l.map(linhaAlvo).join('') + '</div>' : '<span class="pz-sem">Nenhum item do catálogo nessa faixa com demanda Normal ou melhor.</span>') +
      '</div>'
    );
  }
  function etiquetas(rec, forma) {
    return '<span class="l1">' + (rec ? '<span class="pz-tag acc">Recomendado</span>' : '') + '<span class="pz-tag">' + forma + '</span></span>';
  }
  function cartaoCombinado(meus, rec) {
    var p = plano.lista[plano.idx] || planoSoMetas(meus);
    var n = plano.lista.length;
    var h = '<div class="pz"><div class="pz-cab">' + etiquetas(rec, '2 trades') + '<b>Downgrade em um, upgrade no resto</b>' +
      '<span class="sub">Nenhum item seu entra nas duas trades.</span></div>';
    var tD = 'Descer: ' + p.x.nome;
    h += p.down ? pernaReal('c1', 1, tD, p.down) : pernaMeta(1, tD, [p.x], 2, txtMetaDescer(p.metaDown));
    h += p.up ? pernaReal('c2', 2, 'Subir o resto', p.up) : pernaMeta(2, 'Subir o resto', p.metaUp.dou, 1, txtMetaSubir(p.metaUp));
    var st = statusPlano();
    if (st) h += '<div class="pz-ad nada">' + st + '</div>';
    if (n > 1) h += '<div class="pl-pe"><span class="meta">Plano ' + (plano.idx + 1) + ' de ' + n + '</span><button type="button" class="pl-outro" id="pl-outro">Outro plano ›</button></div>';
    return h + '</div>';
  }
  // v7.0 (protótipo B · Um passo por vez): cada passo em tela cheia, com as
  // cenas Dou | Recebo ("?" no Recebo), a faixa de value, o "Serve agora" e os
  // alvos do catálogo num carrossel.
  function cenaPasso(dou, nQ) {
    var q = '';
    for (var k = 0; k < nQ; k++) q += '<span class="pz-qq">?</span>';
    return '<div class="an-duelo pz-duelo' + classeDuelo(dou.length, nQ) + '">' +
      '<div class="an-cena"><div class="q">Dou<b>' + n0(somaVb(dou)) + '</b></div>' + fotosLado(dou) + '</div>' +
      '<div class="an-cena r"><div class="q">Recebo<b>?</b></div><div class="an-fts n' + nQ + '">' + q + '</div></div></div>';
  }
  function faixaPasso(rot, de, ate) {
    return '<div class="pz-fx"><small>' + rot + '</small><b>' + n0(de) + ' a ' + n0(ate) + '</b><small>de value</small></div>';
  }
  function cartaoSubir(dou, rec) {
    var m = metaSubir(dou);
    return (
      '<div class="pz"><div class="pz-cab">' + etiquetas(rec, 'upgrade') +
      '<b>Subir: junte ' + (dou.length === 2 ? 'os 2 itens' : dou.length + ' itens') + ' em 1</b>' +
      '<span class="sub">Você paga de ' + PA.upAbertura + '% a ' + PA.upTeto + '% a mais (abertura → teto).</span></div>' +
      cenaPasso(dou, 1) + faixaPasso('1 item de', m.de, m.ate) +
      serveAgora('s', plano.subir) + blocoAlvos('Alvos no catálogo · demanda Normal+', plano.alvosSubir) + '</div>'
    );
  }
  function cartaoDescer(X, rec) {
    var m = metaDescer(X);
    return (
      '<div class="pz"><div class="pz-cab">' + etiquetas(rec, 'downgrade') +
      '<b>Descer: ' + esc(X.nome) + ' em 2 ou 3 médios</b>' +
      '<span class="sub">Você pede de +' + PA.downMin + '% a +' + PA.downAbertura + '% a mais (mínimo → abertura).</span></div>' +
      cenaPasso([X], 2) + faixaPasso('2–3 médios somando', m.de, m.ate) +
      serveAgora('d', plano.descer) +
      blocoAlvos('Médios bons para pedir · ~' + n0(Math.max(PA.addMax, m.de / 3)) + ' a ' + n0(m.ate / 2) + ' cada', plano.alvosDescer) + '</div>'
    );
  }
  // Escadinha: cada volta = 1 upgrade + 1 downgrade, nos três cenários dos degraus.
  // v7.0: 3 colunas lado a lado (o Provável em destaque), Hoje até a 4ª volta.
  function escadinhaPlano(inicio) {
    var C = [
      ['o', 'Otimista', PA.upAbertura, PA.downAbertura],
      ['p', 'Provável', (PA.upAbertura + PA.upTeto) / 2, (PA.downAbertura + PA.downMin) / 2],
      ['s', 'Pessimista', PA.upTeto, PA.downMin],
    ];
    function f(c) { return (1 - c[2] / 100) * (1 + c[3] / 100); }
    function pc(x) { return String(Math.round(x * 10) / 10).replace('.', ','); }
    var h = '<div class="ez3">' + C.map(function (c) {
      var s = '<div class="c' + (c[0] === 'p' ? ' m' : '') + '"><small>' + c[1] + '</small>';
      for (var v = 0; v <= 4; v++) s += '<span class="v">' + (v ? v + 'ª' : 'Hoje') + '<b>' + n0(inicio * Math.pow(f(c), v)) + '</b></span>';
      var pv = (f(c) - 1) * 100;
      return s + '<span class="pv ' + (pv >= 0 ? 'pos' : 'neg') + '">' + (pv >= 0 ? '+' : '') + pc(pv) + '%<small>por volta</small></span></div>';
    }).join('') + '</div>';
    return h + '<p class="nota">Cada volta é 1 upgrade + 1 downgrade. ' + C.map(function (c) {
      return c[1] + ': paga ' + pc(c[2]) + '% e pede ' + pc(c[3]) + '%.';
    }).join(' ') + ' A conta supõe que os values não mudam. No pessimista você cede até o limite nos dois lados: por isso vale abrir pela oferta de abertura.</p>';
  }
  // Os passos que existem para esta quantidade de itens livres, o recomendado
  // primeiro na escolha inicial: 1 item = Descer; 2 = Subir; 3 ou mais = Combinado.
  function passosPlano(n) {
    var l = [];
    if (n >= 3) l.push(['comb', 'Combinado']);
    if (n >= 2) l.push(['subir', 'Subir']);
    l.push(['descer', 'Descer'], ['esc', 'Escadinha']);
    return l;
  }
  function desenharPlano() {
    var el = $('pz-corpo');
    if (!el || !plano.ativo) return;
    var meus = livres();
    var nHold = 0;
    for (var a in AN.emHold) nHold += AN.emHold[a];
    if (!meus.length) {
      el.innerHTML = '<p class="vazio">Nenhum item seu fora de hold agora' + (nHold ? ' (' + nHold + ' em hold)' : '') +
        '. O plano aparece quando eles saírem do hold.</p>';
      return;
    }
    var total = somaVb(meus);
    var ps = passosPlano(meus.length);
    var ids = ps.map(function (p) { return p[0]; });
    if (ids.indexOf(plano.passo) < 0) plano.passo = ids[0];
    var h = '<div class="pz-res"><span class="num"><small>' + meus.length + (meus.length === 1 ? ' item' : ' itens') + ' fora de hold' +
      (nHold ? ' · ' + nHold + ' em hold' : '') + '</small><b>' + n0(total) + '</b><small>value somado (RAP nos itens sem value)</small></span>' +
      '<span class="pz-mi">' + meus.slice(0, 4).map(function (i) { return miniatura(i.id); }).join('') + '</span></div>';
    h += '<div class="seg pz-passos">' + ps.map(function (p) {
      return '<button type="button" data-passo="' + p[0] + '"' + (plano.passo === p[0] ? ' class="on"' : '') + '>' + p[1] + '</button>';
    }).join('') + '</div>';
    if (plano.passo === 'comb') h += cartaoCombinado(meus, true);
    else if (plano.passo === 'subir') h += cartaoSubir(meus.slice(0, P.maxItens), meus.length === 2);
    else if (plano.passo === 'descer') h += cartaoDescer(meus[0], meus.length === 1);
    else h += '<div class="pz-sec"><div class="sec-t"><h2>Escadinha</h2><span>começando em ' + n0(total) + '</span></div>' + escadinhaPlano(total) + '</div>';
    el.innerHTML = h;
  }
  // ---------- v7.0 (protótipo B · Um por vez) ----------
  // Fila de anúncios em cima (passa para o lado) e UM anúncio aberto embaixo:
  // Dou | Recebo lado a lado com fotos grandes e a % no meio, a comparação
  // linha a linha, os degraus (tocar troca a cena) e os botões.
  function maiuscula(s) {
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  // O degrau mostrado (o 1º por padrão). Sem degraus, a própria oferta.
  function degrauAtual(r) {
    var d = degrausDe(r);
    return d[Math.max(0, Math.min(estado.degrau || 0, d.length - 1))];
  }
  // v7.1: nome curto embaixo da foto. Nome grande vira a sigla do Rolimon's ou a
  // primeira palavra com "…" (o nome inteiro fica na tela do item).
  function nomeCurto(i) {
    var n = String(i.nome || '');
    if (n.length <= 14) return n;
    if (i.sigla) return String(i.sigla);
    return n.split(' ')[0] + '…';
  }
  // v7.1: selinhos em cima da foto: o value e as vendas por dia ("23/d"; verde a
  // partir de 1 por dia, vermelho abaixo disso; "…/d" enquanto não chegam).
  function selos(i) {
    var h = '<span class="vv">' + fmtNum(valorEfetivo(i)) + '</span>';
    var ln = LN[i.id];
    if (ln && ln.v != null && ln.tv) {
      h += '<span class="vd ' + (nivelVendas(ln.v) >= 2 ? 'pos' : 'neg') + '">' + esc(String(ln.tv).replace('/dia', '/d')) + '</span>';
    } else if (vendasAn.pendentes[i.id]) {
      h += '<span class="vd esp">…/d</span>';
    }
    return '<span class="an-sl">' + h + '</span>';
  }
  function fotosLado(itens) {
    if (!itens.length) return '<div class="an-fts"><span class="so-rbx">R$</span></div>';
    return '<div class="an-fts n' + Math.min(4, itens.length) + '">' + itens.map(function (i) {
      return '<button type="button" class="an-it" data-item="' + esc(i.id) + '" data-nome="' + esc(i.nome) + '" aria-label="' + esc(i.nome) + '">' +
        selos(i) + '<span class="an-foto">' + miniatura(i.id) + '</span><small>' + esc(nomeCurto(i)) + '</small></button>';
    }).join('') + '</div>';
  }
  // v7.1 (opção C): o lado com mais itens ganha mais largura.
  function classeDuelo(nd, nr) {
    return nd > nr ? ' mais-d' : nr > nd ? ' mais-r' : '';
  }
  function duelo(g, robux, cor) {
    var liquido = robux ? Math.floor(robux * (1 - P.taxaRobux)) : 0;
    var dif = g.tr.value - g.td.value;
    return '<div class="an-duelo' + classeDuelo(g.dou.length, g.rec.length) + '">' +
      '<div class="an-cena"><div class="q">Dou<b>' + fmtNum(g.td.value) + '</b></div>' + fotosLado(g.dou) + '</div>' +
      '<div class="an-cena r"><div class="q">Recebo<b>' + fmtNum(g.tr.value) + '</b></div>' + fotosLado(g.rec) +
      (liquido && g.rec.length ? '<span class="rbx">+ ' + fmtNum(liquido) + ' Robux (líq.)</span>' : '') + '</div>' +
      '<div class="an-vs" data-cor="' + cor + '">' + pctTxt(g.pct) + '<small>' + (dif > 0 ? '+' : '') + fmtNum(dif) + '</small></div></div>';
  }
  function celVendas(i) {
    if (!i) return '<span class="sub">—</span>';
    var ln = LN[i.id];
    if (ln && ln.tv) return '<span class="' + esc(ln.c) + '">' + esc(ln.tv) + '</span>';
    return vendasAn.pendentes[i.id] ? '<span class="sub">…</span>' : '<span class="sub">—</span>';
  }
  function celDemanda(i) {
    return i && i.dem >= 0 ? '<span class="' + corDem(i.dem) + '">' + esc(P.demandaCurta[i.dem]) + '</span>' : '<span class="sub">—</span>';
  }
  // Mesmo OP do cartão de antes (v6.13): Recebo = OP para dar; Dou = OP para pedir.
  function celOp(i, lado) {
    if (!i) return '<span class="sub">—</span>';
    var ln = LN[i.id];
    var dem = i.dem;
    if (!(dem >= 0) && ln && ln.v != null) dem = nivelVendas(ln.v);
    var base = valorEfetivo(i);
    if (!(base > 0) || !P.opRegua || (!(dem >= 0) && vendasAn.pendentes[i.id])) return '<span class="sub">—</span>';
    var op = opFaixas(base, dem, P.opRegua);
    return lado === 'rec'
      ? '<span class="warn">dar ' + faixaPctAn(op.dar.pct) + '</span>'
      : '<span class="pos">pedir ' + faixaPctAn(op.pedir.pct) + '</span>';
  }
  function linhaTb(t, a, b) {
    return '<div><b>' + a + '</b><span>' + t + '</span><b>' + b + '</b></div>';
  }
  // Comparação linha a linha. v7.1: só o RAP e o OP do item principal de cada
  // lado (os nomes, o value e as vendas/dia já estão em cada foto; a demanda saiu).
  function tabela(g) {
    var pd = principal(g.dou);
    var pr = principal(g.rec);
    return '<div class="an-tb">' +
      linhaTb('RAP', fmtNum(g.td.rap), fmtNum(g.tr.rap)) +
      linhaTb('OP', celOp(pd, 'dou'), celOp(pr, 'rec')) +
      '</div>';
  }
  // Caixas dos degraus (v6.16 / v6.16.1): com dois degraus, cada caixa troca a
  // cena; com uma combinação só, a oferta + o limite em número.
  function caixasDegraus(r, n) {
    var d = r.degraus || [];
    var h;
    if (d.length >= 2) {
      var nomes = r.tipo === 'downgrade' ? ['Abertura', 'Mínimo'] : ['Abertura', 'Teto'];
      h = '<div class="an-dg">' + d.map(function (g, k) {
        var dl = g.tr.value - g.td.value;
        return '<button type="button" data-dg="' + k + '" data-cor="' + corVeredito(g.v) + '"' + (k === n ? ' class="on"' : '') + '>' +
          '<small>' + (k + 1) + ' · ' + nomes[k] + '</small><b>' + pctTxt(g.pct) + '</b><i>' + (dl > 0 ? '+' : '') + fmtNum(dl) + ' R$</i></button>';
      }).join('') + '</div>';
      return h + '<p class="dg-dica">' + (r.tipo === 'downgrade'
        ? 'Mande a 1. Se ele recusar ou fizer contraproposta, desça até a 2 e não aceite menos.'
        : 'Mande a 1. Se ele recusar ou fizer contraproposta, suba até a 2 e não passe dela.') + '</p>';
    }
    var lim = limite(r);
    var dl0 = r.tr.value - r.td.value;
    h = '<div class="an-dg' + (lim ? '' : ' um') + '"><div data-cor="' + corVeredito(r.v) + '"><small>' + (lim ? '1 · ' : '') + 'Oferta</small>' +
      '<b>' + pctTxt(r.pct) + '</b><i>' + (dl0 > 0 ? '+' : '') + fmtNum(dl0) + ' R$</i></div>';
    if (lim) h += '<div data-cor="justa"><small>2 · ' + lim.nome + '</small><b>' + pctTxt(lim.pct) + '</b><i>' + esc(lim.txt) + '</i></div>';
    h += '</div>';
    if (lim) h += '<p class="dg-dica">' + (r.tipo === 'downgrade'
      ? 'Mande a 1. Se ele fizer contraproposta, aceite só a partir do mínimo da 2.'
      : 'Mande a 1. Se ele fizer contraproposta, ceda só até o teto da 2.') + '</p>';
    return h;
  }
  function anuncioAberto(r) {
    var ad = r.ad;
    var d = degrausDe(r);
    var n = Math.max(0, Math.min(estado.degrau || 0, d.length - 1));
    var g = d[n];
    var robux = g === r ? r.robux : 0;
    var cor = corVeredito(g.v);
    var h = '<article class="an-grupo an-aberto">' +
      '<div class="an-cab"><span class="j"><b>' + esc(jogador(r)) + '</b><span>' + etiquetaHtml(r) +
      (r.modo === 'itens' ? ' · pede seu item' : '') + ' · ' + haQuanto(ad[1]) + '</span></span>' +
      '<span class="selo" data-cor="' + cor + '">' + esc(g.v ? tituloWFL(g.v) : '') + '</span></div>' +
      duelo(g, robux, cor) +
      '<div class="an-corpo">' + tabela(g);
    if (r.nota) h += '<p class="an-nota">' + esc(r.nota) + '</p>';
    if (r.mesmo && r.mesmo.length) {
      h += '<p class="an-aviso">Tem <b>' + esc(r.mesmo.join(', ')) + '</b> dos dois lados. Continua na lista porque o ganho não é negativo.</p>';
    }
    h += caixasDegraus(r, n);
    h += '<div class="an-acoes">' +
      '<a class="btn sec" href="https://www.rolimons.com/player/' + ad[2] + '">Ver jogador</a>' +
      '<a class="btn" href="https://www.roblox.com/users/' + ad[2] + '/trade">Abrir trade</a></div>';
    return h + '</div></article>';
  }
  // v7.1: o quadradinho da fila mostra o que você dá → o que você recebe.
  function botaoFila(r, k, on) {
    var g0 = primeiro(r);
    var mini = function (l) {
      return '<span class="g">' + (l.map(function (i) { return miniatura(i.id); }).join('') || '<span class="so-rbx">R$</span>') + '</span>';
    };
    // v7.2: fila baixa, tudo numa linha (fotos, a % e "forma · tempo").
    return '<button type="button" data-sel="' + k + '" data-cor="' + corVeredito(g0.v || r.v) + '"' + (on ? ' class="on"' : '') + '>' +
      '<span class="m">' + mini(g0.dou) + '<i>→</i>' + mini(g0.rec) + '</span>' +
      '<span class="tx"><b>' + pctTxt(g0.pct) + '</b><small>' + etiquetaHtml(r) + ' · ' + haQuanto(r.ad[1]).replace('há ', '') + '</small></span></button>';
  }
  function desenharLista() {
    var lista = estado.lista;
    estado.mostrados = [];
    if (!estado.carregou) {
      $('an-lista').innerHTML = '<p class="vazio">' + (estado.carregando ? 'Buscando...' : '—') + '</p>';
      return;
    }
    if (!lista.length) {
      var msg = estado.forma !== 'todos'
        ? 'Nenhum anúncio de ' + FORMAS[estado.forma].toLowerCase() + ' com esses itens agora.'
        : 'Nenhum anúncio com vantagem para você agora.';
      $('an-lista').innerHTML = '<p class="vazio">' + msg + '</p>';
      return;
    }
    estado.mostrados = lista.slice(0, PA.maxLista);
    // O aberto é o escolhido na fila; se ele saiu da lista, o primeiro.
    var sel = 0;
    for (var k = 0; k < estado.mostrados.length; k++) {
      if (estado.mostrados[k].ad[0] === estado.aberto) { sel = k; break; }
    }
    if (estado.mostrados[sel].ad[0] !== estado.aberto) { estado.aberto = estado.mostrados[sel].ad[0]; estado.degrau = 0; }
    // v6.13: antes de desenhar, pede as vendas que faltam (aparecem com "…").
    pedirVendasAn();
    var fila = $('an-lista').querySelector('.an-fila');
    var x = fila ? fila.scrollLeft : 0;
    var h = '<div class="an-um"><div class="an-fila">' + estado.mostrados.map(function (r, k) { return botaoFila(r, k, k === sel); }).join('') + '</div>' +
      anuncioAberto(estado.mostrados[sel]);
    if (lista.length > estado.mostrados.length) h += '<p class="an-mais">Mostrando ' + estado.mostrados.length + ' de ' + lista.length + '.</p>';
    $('an-lista').innerHTML = h + '</div>';
    var f2 = $('an-lista').querySelector('.an-fila');
    if (f2) f2.scrollLeft = x;
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
    // v7.2: embaixo do título só a hora da busca (o resto fica no Diagnóstico).
    var curta;
    if (estado.carregando) curta = 'buscando...';
    else if (res && res.buscadoEm) {
      curta = 'busca ' + hora(res.buscadoEm);
      if (estado.manual && res.origem === 'guardados' && res.liberaEm) curta += ' · próxima ' + hora(res.liberaEm);
    } else curta = '';
    window.thHoraAnuncios = curta;
    if (window.thMetaHora) { try { window.thMetaHora(); } catch (e) {} }
    $('an-atualizar').disabled = estado.carregando;
    $('an-atualizar').classList.toggle('buscando', estado.carregando);
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
    // v7.2: o texto que ficava no topo da aba ("N anúncios analisados · últimas 2h").
    L.push($('an-info').textContent);
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
      L.push('Análise: ' + estado.formas.todos.length + ' em Todos (' + dg.nItens + ' pedem seus itens, ' + dg.nTags + ' por tag)' +
        ' · seu upgrade ' + estado.formas.upgrade.length + ' · seu downgrade ' + estado.formas.downgrade.length +
        ' (' + dg.nRefeitos + ' refeitos na outra forma) · forma ' + estado.forma +
        ' · Meus itens: ' + AN.meus.length + ' de ' + AN.todosOrdenados.length +
        ', em ' + dg.ms + ' ms · ordem ' + estado.ordem + ' · seus itens livres: ' + AN.meus.length);
      var ds = Object.keys(dg.descartes).sort(function (x, y) { return dg.descartes[y] - dg.descartes[x]; });
      if (ds.length) L.push('Fora da lista: ' + ds.map(function (d) { return d + ' ' + dg.descartes[d]; }).join(' · '));
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
    // v6.18: refaz o plano se mudaram os anúncios ou o inventário (já aberto).
    iniciarPlanos();
    desenharPlano();
    desenharDiag();
    var ids = idsPlano();
    estado.mostrados.forEach(function (r) {
      itensDe(r).forEach(function (i) { ids.push(i.id); });
    });
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
    processar();
  };
  window.thAbrirAnuncios = function () {
    if (!estado.carregou && !estado.carregando) pedir(false);
  };
  // v6.18: aba Plano. Monta na hora com os seus itens (metas, alvos e escadinha)
  // e busca os anúncios, se ainda não buscou, para o "Serve agora".
  window.thAbrirPlano = function () {
    plano.ativo = true;
    if (!estado.carregou && !estado.carregando) pedir(false);
    iniciarPlanos();
    desenharPlano();
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
    estado.ocultos = lerOcultos();
    estado.aberto = null;
    estado.degrau = 0;
    // (montarMeus também limpa as combinações guardadas)
    montarMeus(invAtual());
    var el = $('an-conta');
    if (el) {
      el.textContent = dados ? 'Cruzados com os itens de ' + (dados.nome || 'conta 2') + '. O lado Dou mostra os itens dessa conta.' : '';
      el.classList.toggle('oculto', !dados);
    }
    fecharMeus();
    if (estado.carregou) processar();
    else desenhar();
  };
  window.thAoReceberMiniaturas = function () {
    if (estado.carregou) desenhar();
    else desenharFiltro();
    if (!$('am-folha').classList.contains('oculto')) desenharMeus();
  };

  // ---------- v6.20: folha "Meus itens" ----------
  // v7.0: vale para tudo (pedidos, sugestões e Plano); o "Um item" saiu.
  // Uma linha por item (as cópias contam juntas), do maior value.
  function distintos(l) {
    var vistos = {};
    return l.filter(function (i) {
      if (vistos[i.id]) return false;
      vistos[i.id] = true;
      return true;
    });
  }
  function desenharMeus() {
    var h = '';
    var todos = distintos(AN.todosOrdenados);
    todos.forEach(function (i) {
      var usa = !estado.ocultos[i.id];
      var copias = AN.todosOrdenados.filter(function (c) { return c.id === i.id; }).length;
      var ped = estado.pedidos[i.id] || 0;
      var sub = fmtNum(i.vb) + ' ' + (i.value != null ? 'value' : 'RAP') +
        (copias > 1 ? ' · ' + copias + ' cópias' : '') +
        (usa ? (ped ? ' · pedido em ' + ped + (ped === 1 ? ' anúncio' : ' anúncios') : '') : ' · fora dos anúncios');
      h += '<button type="button" class="an-fl-op' + (usa ? ' on' : '') + '" data-id="' + esc(i.id) + '" aria-pressed="' + usa + '">' +
        miniatura(i.id) + '<span class="an-fl-txt"><b>' + esc(i.nome) + '</b><span>' + sub + '</span></span>' +
        '<span class="am-ck" aria-hidden="true">✓</span></button>';
    });
    $('am-lista').innerHTML = h || '<p class="vazio">Nenhum item seu fora de hold.</p>';
  }
  function abrirMeus() {
    desenharMeus();
    $('am-fundo').classList.remove('oculto');
    $('am-folha').classList.remove('oculto');
    pedirMiniaturas(distintos(AN.todosOrdenados).map(function (i) { return i.id; }));
  }
  function fecharMeus() {
    $('am-fundo').classList.add('oculto');
    $('am-folha').classList.add('oculto');
  }
  function alternarMeu(id) {
    if (!id) return;
    if (estado.ocultos[id]) delete estado.ocultos[id];
    else estado.ocultos[id] = 1;
    gravarOcultos();
    estado.aberto = null;
    estado.degrau = 0;
    // (montarMeus refaz a lista e limpa as combinações guardadas)
    montarMeus(invAtual());
    desenharMeus();
    if (estado.carregou) processar();
    else desenhar();
  }

  // ---------- Toques ----------
  // v6.20: chip e folha "Meus itens".
  $('an-meus').addEventListener('click', abrirMeus);
  $('am-lista').addEventListener('click', function (ev) {
    var b = ev.target.closest('.an-fl-op');
    if (b) alternarMeu(b.getAttribute('data-id'));
  });
  $('am-fundo').addEventListener('click', fecharMeus);
  $('am-fechar').addEventListener('click', fecharMeus);
  // v6.13: a ordem fica numa folha pequena (chip "Ordem ▾").
  function fecharOrdem() {
    $('ao-fundo').classList.add('oculto');
    $('ao-folha').classList.add('oculto');
  }
  $('an-ordem').addEventListener('click', function () {
    var bs = document.querySelectorAll('#ao-folha [data-o]');
    for (var k = 0; k < bs.length; k++) bs[k].classList.toggle('on', bs[k].getAttribute('data-o') === estado.ordem);
    $('ao-fundo').classList.remove('oculto');
    $('ao-folha').classList.remove('oculto');
  });
  $('ao-fundo').addEventListener('click', fecharOrdem);
  $('ao-folha').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-o]');
    if (b && ORDENS[b.getAttribute('data-o')]) {
      estado.ordem = b.getAttribute('data-o');
      gravarSalvo('an-ordem', estado.ordem);
      ['todos', 'upgrade', 'downgrade'].forEach(function (f) { ordenar(estado.formas[f]); });
      estado.aberto = null;
      desenhar();
    }
    if (b || ev.target.closest('#ao-cancelar')) fecharOrdem();
  });
  // v6.8: filtro Todos / Upgrade / Downgrade (as três listas já estão prontas).
  // v7.1: escolhido numa folha, pelo botão "Filtro ▾".
  function fecharFiltro() {
    $('af-fundo').classList.add('oculto');
    $('af-folha').classList.add('oculto');
  }
  $('an-filtro').addEventListener('click', function () {
    desenharFiltro();
    $('af-fundo').classList.remove('oculto');
    $('af-folha').classList.remove('oculto');
  });
  $('af-fundo').addEventListener('click', fecharFiltro);
  $('af-folha').addEventListener('click', function (ev) {
    var b = ev.target.closest('button[data-f]');
    if (b && FORMAS[b.getAttribute('data-f')]) {
      estado.forma = b.getAttribute('data-f');
      gravarSalvo('an-forma', estado.forma);
      estado.lista = estado.formas[estado.forma];
      estado.aberto = null;
      desenhar();
    }
    if (b || ev.target.closest('#af-cancelar')) fecharFiltro();
  });
  // Links (jogador, trade) seguem sozinhos: o painel.js abre no Safari.
  // O toque no item abre a tela do item; o toque na linha abre e fecha o cartão.
  $('aba-anuncios').addEventListener('click', function (ev) {
    var bi = ev.target.closest('[data-item]');
    if (bi) {
      abrirItem(bi);
      return;
    }
    if (ev.target.closest('a')) return;
    // v7.0: toque na fila abre aquele anúncio; toque num degrau troca a cena.
    var s = ev.target.closest('[data-sel]');
    if (s) {
      var r = estado.mostrados[Number(s.getAttribute('data-sel'))];
      if (!r || r.ad[0] === estado.aberto) return;
      estado.aberto = r.ad[0];
      estado.degrau = 0;
      desenharLista();
      return;
    }
    var dg = ev.target.closest('[data-dg]');
    if (dg) {
      estado.degrau = Number(dg.getAttribute('data-dg')) || 0;
      desenharLista();
    }
  });
  $('an-atualizar').addEventListener('click', function () { pedir(true); });
  // v6.18: toques da aba Plano: item (tela do item), "Outro plano" e as trades
  // (abrem e fecham o cartão completo, como na lista).
  if ($('aba-plano')) {
    $('aba-plano').addEventListener('click', function (ev) {
      var bi = ev.target.closest('[data-item]');
      if (bi) {
        abrirItem(bi);
        return;
      }
      if (ev.target.closest('a')) return;
      if (ev.target.closest('#pl-outro')) {
        plano.idx = (plano.idx + 1) % Math.max(1, plano.lista.length);
        plano.aberto = null;
        desenharPlano();
        return;
      }
      // v7.0: barra dos passos (Combinado, Subir, Descer, Escadinha).
      var bp = ev.target.closest('[data-passo]');
      if (bp) {
        plano.passo = bp.getAttribute('data-passo');
        plano.aberto = null;
        desenharPlano();
        window.scrollTo(0, 0);
        return;
      }
      // Degrau do anúncio aberto dentro do passo (mesmo desenho dos Anúncios).
      var dg = ev.target.closest('[data-dg]');
      if (dg) {
        estado.degrau = Number(dg.getAttribute('data-dg')) || 0;
        desenharPlano();
        return;
      }
      var b = ev.target.closest('[data-pz]');
      if (b) {
        var key = b.getAttribute('data-pz');
        plano.aberto = plano.aberto === key ? null : key;
        estado.degrau = 0;
        desenharPlano();
        if (plano.aberto) pedirVendasAn();
      }
    });
  }

  // ---------- Início ----------
  desenhar();
  // Se o painel abriu direto nesta aba (aba lembrada), já busca.
  if (!$('aba-anuncios').classList.contains('oculto')) pedir(false);
  if ($('aba-plano') && !$('aba-plano').classList.contains('oculto')) window.thAbrirPlano();
}

// <script> da aba. Vem depois do script do avaliador (usa TH_D, TH_P e as funções dele).
// v6.2: criarAnalisador vai junto (é o mesmo código que o widget usa nas notificações).
// v6.21: meusItens = { userId: [assetIds desmarcados em "Meus itens"] }.
function script(cfg, meuId, meusItens) {
  const PA = parametros(cfg, meuId);
  PA.meusItens = meusItens || {};
  return (
    '<script>\n' +
    criarAnalisador.toString() + '\n' +
    'if (typeof TH_D !== "undefined") (' + paginaAnuncios.toString() + ')(TH_D, TH_P, ' +
    avaliador.serializar(PA) + ');\n' +
    '</script>'
  );
}

// ---------- v6.21: "Meus itens" em arquivo (dados/meusitens.json) ----------
// { userId: [assetIds desmarcados] }. A página grava pela ponte; o painel manda
// de volta ao abrir, e o widget usa nas notificações.
const ARQ_MEUS = 'meusitens';

function lerMeusItens(store) {
  const d = store.ler(ARQ_MEUS);
  return d && typeof d === 'object' && !Array.isArray(d) ? d : {};
}

function gravarMeusItens(store, userId, ids) {
  const d = lerMeusItens(store);
  if (ids.length) d[String(userId)] = ids.map(String);
  else delete d[String(userId)];
  store.gravar(ARQ_MEUS, d);
}

// { assetId: 1 } dos desmarcados de uma conta (formato do montarMeus).
function ocultosDe(store, userId) {
  const l = lerMeusItens(store)[String(userId)];
  const r = {};
  if (Array.isArray(l)) for (const id of l) r[String(id)] = 1;
  return r;
}

module.exports = {
  TAGS, lerAnuncio, carregar, parametros, criarAnalisador, secao, secaoPlano, folha, css, script,
  lerMeusItens, gravarMeusItens, ocultosDe,
};
