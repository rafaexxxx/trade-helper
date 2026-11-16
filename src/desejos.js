// v6.0: Lista de desejos. Itens que você quer receber, escolhidos SÓ pela busca
// no catálogo (a mesma do Avaliar trade). Na aba Anúncios, os anúncios que
// oferecem um item da lista e que dá para fechar ganham a etiqueta "Desejo".
// A lista fica no arquivo de ajustes do iPhone (ajustes.desejos), gravada pela
// ponte (PONTE + 'desejos?ids=...', atenderDesejos em painel.js), igual ao tema.
// Vale só para a conta principal: na conta 2 a lista continua salva, mas não é usada.
const avaliador = require('avaliador');

function esc(s) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => mapa[c]);
}

// Lista vinda do arquivo (ou da ponte): só ids numéricos, sem repetir, até o máximo.
function limpar(ids, max) {
  const r = [];
  const vistos = {};
  for (const x of Array.isArray(ids) ? ids : []) {
    const id = String(x == null ? '' : x).trim();
    if (!/^\d{1,20}$/.test(id) || vistos[id]) continue;
    vistos[id] = true;
    r.push(id);
    if (r.length >= max) break;
  }
  return r;
}

// Tela por cima (como a Ajuda) + folha do item (Remover / Rolimon's).
function secao() {
  return (
    '<div id="ds-tela" class="ds-tela oculto" role="dialog" aria-modal="true" aria-label="Lista de desejos">' +
    '<div class="ceu" aria-hidden="true"><i></i><b></b></div>' +
    '<div class="ds-barra"><h1>Lista de desejos</h1><button type="button" class="ds-fechar" id="ds-fechar">Fechar</button></div>' +
    '<div class="ds-corpo">' +
    '<p class="ds-lead">Os anúncios que oferecem estes itens <b>e que dá para fechar</b> ganham a etiqueta <b>Desejo</b> na aba Anúncios. Fica salvo neste iPhone.</p>' +
    '<button type="button" class="btn ds-add" id="ds-add">+ Adicionar item</button>' +
    '<div class="ds-cont"><span id="ds-n"></span><span id="ds-info"></span></div>' +
    '<p class="aviso oculto" id="ds-aviso"></p>' +
    '<div id="ds-lista"></div>' +
    '<p class="nota">Toque no item para remover ou abrir no Rolimon\'s. Na conta 2 a lista não é usada (continua salva).</p>' +
    '</div></div>' +
    '<div id="ds-fundo" class="fundo oculto"></div>' +
    '<div id="ds-folha" class="folha oculto">' +
    '<p id="ds-folha-nome"></p>' +
    '<button type="button" id="ds-remover" class="remover">Remover da lista</button>' +
    '<a id="ds-link" href="#">Ver no Rolimon\'s</a>' +
    '<button type="button" id="ds-cancelar" class="cancelar">Cancelar</button>' +
    '</div>'
  );
}

function css() {
  return `
.ds-tela{position:fixed;top:0;left:0;right:0;bottom:0;z-index:50;overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--bg);color:var(--fg)}
.ds-barra{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:max(12px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 10px max(16px,env(safe-area-inset-left));background:var(--bg);border-bottom:1px solid var(--borda)}
.ds-barra h1{font-size:28px}
.ds-fechar{border:0;background:none;padding:4px 0;font-size:16px;font-weight:600;color:var(--acc-t)}
.ds-corpo{max-width:560px;margin:0 auto;display:flex;flex-direction:column;gap:14px;padding:18px max(16px,env(safe-area-inset-right)) max(48px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
.ds-lead{margin:0;font-size:15px;color:var(--sub)}
.ds-lead b{color:var(--fg)}
.ds-add{width:100%}
.ds-cont{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px;color:var(--sub)}
.ds-grupo{display:flex;flex-direction:column;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.ds-grupo,.ds-add{-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}
.ds-grupo>.item+.item{border-top:1px solid var(--borda)}
.ds-ofe{align-self:flex-start;margin-top:3px;display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border:0;border-radius:999px;background:var(--pos-bg);color:var(--pos);font-size:12px;font-weight:700;line-height:1.3;text-align:left;-webkit-tap-highlight-color:transparent}
.ds-ofe.zero{background:var(--card2);color:var(--sub);font-weight:600}
.ds-ofe .s{opacity:.75}
/* A busca do catálogo e a folha do item abrem por cima da tela da lista. */
#fb-fundo,#fb-folha,#ds-fundo,#ds-folha{z-index:60}
.folha .remover{color:var(--neg)}
`;
}

// ---------- Código que roda DENTRO da página ----------
// D = dados do avaliador (TH_D), P = parâmetros do avaliador (TH_P), PD = desta tela.
function paginaDesejos(D, P, PD) {
  var C = D.catalogo;
  var THUMBS = D.miniaturas || {};
  var lista = PD.ids.slice();
  // Contagem vinda da aba Anúncios: { porItem: { id: { ofe, fecha } }, info: {...} }.
  var cont = null;
  var selecionado = null;

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
  function corDem(d) {
    return d === 0 ? 'neg' : d === 1 ? 'warn' : d >= 3 ? 'pos' : '';
  }
  function corTend(t) {
    return t === 0 ? 'neg' : t === 3 ? 'pos' : t === 1 || t === 4 ? 'warn' : '';
  }
  function miniatura(id) {
    return THUMBS[id] ? '<img class="thumb" src="' + esc(THUMBS[id]) + '" alt="">' : '<span class="thumb"></span>';
  }
  function mapa() {
    var m = {};
    lista.forEach(function (id) { m[id] = true; });
    return m;
  }

  // Grava no arquivo pela ponte (o Scriptable barra o endereço e grava em ajustes.desejos).
  function gravar() {
    try {
      var f = document.createElement('iframe');
      f.style.display = 'none';
      f.src = P.ponte + 'desejos?ids=' + lista.join(',') + '&t=' + Date.now();
      document.body.appendChild(f);
      setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    } catch (e) {}
  }
  // Avisa a aba Anúncios (refaz a análise com a lista nova) e atualiza o menu ⋯.
  function mudou() {
    gravar();
    desenhar();
    if (window.thAnunciosDesejos) {
      try { window.thAnunciosDesejos(); } catch (e) {}
    }
  }

  // ---------- Desenho ----------
  function linhaOfertas(id) {
    if (!cont) return '';
    if (!cont.porItem) return '';
    var c = cont.porItem[id];
    if (!c || !c.ofe) return '<span class="ds-ofe zero">nenhum anúncio agora</span>';
    var txt = 'em ' + c.ofe + (c.ofe === 1 ? ' anúncio' : ' anúncios') + ' <span class="s">·</span> ' +
      (c.fecha ? c.fecha + ' dá para fechar ›' : 'nenhum dá para fechar');
    return c.fecha
      ? '<button type="button" class="ds-ofe" data-filtrar="1">' + txt + '</button>'
      : '<span class="ds-ofe zero">' + txt + '</span>';
  }
  function linha(id, k) {
    var c = C[id];
    if (!c) {
      return '<div class="item" data-k="' + k + '"><span class="thumb"></span><div class="item-txt"><span class="nome">Item ' + esc(id) +
        '</span><span class="det">fora do catálogo do Rolimon\'s</span></div></div>';
    }
    var i = itemDoCatalogo(C, id);
    var d = [];
    if (i.dem >= 0) d.push('<span class="' + corDem(i.dem) + '">' + esc(P.demandaCurta[i.dem]) + '</span>');
    if (i.tend >= 0) d.push('<span class="' + corTend(i.tend) + '">' + esc(P.tendenciaCurta[i.tend]) + '</span>');
    if (i.projected) d.push('<span class="neg">projected</span>');
    return (
      '<div class="item" data-k="' + k + '">' + miniatura(id) +
      '<div class="item-txt"><span class="nome">' + esc(i.nome) + '</span>' +
      (d.length ? '<span class="det">' + d.join(' · ') + '</span>' : '') + linhaOfertas(id) + '</div>' +
      '<div class="item-num"><span class="v">' + fmtNum(valorEfetivo(i)) +
      (i.value == null ? '<small class="tag">RAP</small>' : '') + '</span>' +
      '<span class="r"><small>RAP</small>' + fmtNum(i.rap) + '</span></div></div>'
    );
  }
  function textoInfo() {
    if (!cont) return 'Buscando anúncios...';
    if (cont.info && cont.info.conta2) return 'Na conta 2 a lista não é usada.';
    if (cont.info && cont.info.erro && !cont.info.buscadoEm) return 'Os anúncios não foram buscados.';
    return 'Anúncios das últimas ' + P.horasAnuncios + 'h' + (cont.info && cont.info.buscadoEm ? ' · busca ' + hora(cont.info.buscadoEm) : '');
  }
  function desenhar() {
    var n = lista.length;
    var m = $('m-desejos-n');
    if (m) m.textContent = n ? n + (n === 1 ? ' item' : ' itens') : 'vazia';
    if ($('ds-tela').classList.contains('oculto')) return;
    $('ds-n').textContent = n + (n === 1 ? ' item' : ' itens');
    $('ds-info').textContent = n ? textoInfo() : '';
    $('ds-add').disabled = n >= PD.max;
    $('ds-aviso').classList.toggle('oculto', n < PD.max);
    $('ds-aviso').textContent = 'A lista chegou ao máximo de ' + PD.max + ' itens. Remova um para adicionar outro.';
    $('ds-lista').innerHTML = n
      ? '<div class="ds-grupo">' + lista.map(linha).join('') + '</div>'
      : '<p class="vazio">Sua lista está vazia. Toque em "Adicionar item" e procure pelo nome ou pela sigla.</p>';
    if (window.thPedirMiniaturas) {
      try { window.thPedirMiniaturas(lista.slice()); } catch (e) {}
    }
  }

  // ---------- Tela ----------
  function abrir() {
    $('ds-tela').classList.remove('oculto');
    $('ds-tela').scrollTop = 0;
    desenhar();
    // Busca os anúncios (mesmo cache da aba) para o contador aparecer.
    if (window.thAbrirAnuncios) {
      try { window.thAbrirAnuncios(); } catch (e) {}
    }
  }
  function fechar() {
    fecharFolha();
    $('ds-tela').classList.add('oculto');
  }
  function abrirFolha(k) {
    var id = lista[k];
    if (!id) return;
    selecionado = id;
    $('ds-folha-nome').textContent = C[id] ? C[id][0] : 'Item ' + id;
    $('ds-link').href = 'https://www.rolimons.com/item/' + id;
    $('ds-fundo').classList.remove('oculto');
    $('ds-folha').classList.remove('oculto');
  }
  function fecharFolha() {
    selecionado = null;
    $('ds-fundo').classList.add('oculto');
    $('ds-folha').classList.add('oculto');
  }
  function adicionar(id) {
    id = String(id);
    if (lista.indexOf(id) >= 0 || lista.length >= PD.max || !C[id]) return;
    lista.push(id);
    mudou();
  }

  // ---------- Ligações com as outras partes da página ----------
  window.thAbrirDesejos = abrir;
  // Mapa { assetId: true } da lista (a aba Anúncios usa).
  window.thDesejosIds = mapa;
  // A aba Anúncios manda a contagem depois de cada análise (null = ainda sem anúncios).
  window.thDesejosContagem = function (porItem, info) {
    cont = { porItem: porItem, info: info || {} };
    desenhar();
  };
  // Miniaturas novas chegaram pela ponte (avaliador).
  window.thDesejosMiniaturas = function () {
    if (!$('ds-tela').classList.contains('oculto')) desenhar();
  };

  // ---------- Toques ----------
  $('ds-fechar').addEventListener('click', fechar);
  $('ds-add').addEventListener('click', function () {
    if (lista.length >= PD.max || !window.thAbrirBuscaCatalogo) return;
    window.thAbrirBuscaCatalogo({ titulo: 'Adicionar à lista', marcados: mapa(), marca: '✓ já está na lista', aoEscolher: adicionar });
  });
  $('ds-lista').addEventListener('click', function (ev) {
    // Contador: abre os Anúncios já com o filtro da lista.
    if (ev.target.closest('[data-filtrar]')) {
      fechar();
      if (window.thAnunciosFiltrarDesejos) {
        try { window.thAnunciosFiltrarDesejos(); } catch (e) {}
      }
      var b = document.querySelector('#abas button[data-aba="anuncios"]');
      if (b) b.click();
      return;
    }
    var it = ev.target.closest('.item[data-k]');
    if (it) abrirFolha(Number(it.getAttribute('data-k')));
  });
  $('ds-remover').addEventListener('click', function () {
    var k = lista.indexOf(selecionado);
    fecharFolha();
    if (k < 0) return;
    lista.splice(k, 1);
    mudou();
  });
  $('ds-cancelar').addEventListener('click', fecharFolha);
  $('ds-fundo').addEventListener('click', fecharFolha);
  $('ds-link').addEventListener('click', function () { setTimeout(fecharFolha, 300); });

  desenhar();
  // A aba Anúncios desenhou antes desta tela existir: agora mostra o chip da lista.
  if (window.thAnunciosDesejos) {
    try { window.thAnunciosDesejos(); } catch (e) {}
  }
}

// <script> da tela. Vem depois do script do avaliador (usa TH_D, TH_P e as funções dele).
function script(ids, cfg) {
  const pd = { ids: limpar(ids, cfg.LISTA_DESEJOS_MAX), max: cfg.LISTA_DESEJOS_MAX };
  return (
    '<script>\n' +
    'if (typeof TH_D !== "undefined") (' + paginaDesejos.toString() + ')(TH_D, Object.assign({ horasAnuncios: ' +
    Number(cfg.ANUNCIOS_GUARDAR_HORAS) + ' }, TH_P), ' + avaliador.serializar(pd) + ');\n' +
    '</script>'
  );
}

module.exports = { limpar, secao, css, script };
