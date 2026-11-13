// Avaliador de trade: aba "Avaliar trade" do painel.
// O cálculo roda dentro da página (sem requisições extras): este módulo prepara
// um catálogo enxuto e gera o HTML, o CSS e o JS da aba.
const a = require('analise');

// Endereço falso usado pela página para pedir miniaturas ao Scriptable
// (interceptado em painel.js; nunca sai do iPhone).
const PONTE = 'https://trade-helper.invalid/';

function esc(s) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => mapa[c]);
}

function numero(x, padrao) {
  return typeof x === 'number' && isFinite(x) ? x : padrao;
}

// Variação em % com 1 casa; null quando não dá para comparar.
function pct1(antes, depois) {
  if (!(antes > 0) || !(depois >= 0)) return null;
  return Math.round(((depois - antes) / antes) * 1000) / 10;
}

// ---------- Value ajustado ----------
// ATENÇÃO: esta função também é injetada na página (toString), então não pode
// usar nada de fora dela. P = parâmetros vindos do config.js.
function valorAjustado(i, P) {
  var base;
  if (i.value != null) base = i.value;
  else if (i.projected) base = i.rap * P.projetadoSemValue;
  else base = i.rap * P.semValue;
  var d = P.demanda[String(i.dem)];
  var t = P.tendencia[String(i.tend)];
  if (d == null) d = 1;
  if (t == null) t = 1;
  return base * d * t * (i.hyped ? P.hyped : 1);
}

function parametros(cfg) {
  const demandaCurta = {};
  const tendenciaCurta = {};
  for (let k = -1; k <= 4; k++) {
    demandaCurta[k] = a.demandaCurta(k);
    tendenciaCurta[k] = a.tendenciaCurta(k);
  }
  return {
    demanda: cfg.PESO_DEMANDA,
    tendencia: cfg.PESO_TENDENCIA,
    hyped: cfg.PESO_HYPED,
    semValue: cfg.PESO_SEM_VALUE,
    projetadoSemValue: cfg.PESO_PROJECTED_SEM_VALUE,
    faixa: cfg.FAIXA_JUSTA_PCT,
    alertaRap24: cfg.ALERTA_RAP_24H_PCT,
    taxaRobux: cfg.TAXA_ROBUX,
    maxItens: cfg.MAX_ITENS_POR_LADO,
    maxBusca: cfg.BUSCA_MAX_RESULTADOS,
    demandaCurta,
    tendenciaCurta,
    ponte: PONTE,
  };
}

// ---------- Dados para a página ----------
// catalogo: items do Rolimon's; itens: inventário já montado (analise.montarItens);
// base: retrato do catálogo de ~24h atrás (ou null); miniaturas: { assetId: url }.
function prepararDados(catalogo, itens, base, miniaturas) {
  const C = {};
  const b24 = base ? base.itens : null;
  for (const id of Object.keys(catalogo)) {
    const r = catalogo[id];
    if (!Array.isArray(r)) continue;
    const rap = numero(r[2], -1);
    const value = numero(r[3], -1);
    const flags = (r[7] === 1 ? 1 : 0) | (r[8] === 1 ? 2 : 0) | (r[9] === 1 ? 4 : 0);
    const b = b24 && b24[id];
    // [nome, sigla, rap, value, demanda, tendência, flags, rap 24h %, value 24h %]
    C[id] = [
      String(r[0] || ''),
      String(r[1] || ''),
      rap,
      value,
      numero(r[5], -1),
      numero(r[6], -1),
      flags,
      b ? pct1(b[0], rap) : null,
      b && value > 0 ? pct1(b[1], value) : null,
    ];
  }
  // [uaid, assetId, serial, hold, nome, rap] (nome e rap servem para itens fora do Rolimon's)
  const inventario = itens.map((i) => [i.uaid, String(i.assetId), i.serial || null, i.hold ? 1 : 0, i.nome, i.rap]);
  return { catalogo: C, inventario, miniaturas: miniaturas || {} };
}

// JSON seguro para colocar dentro de <script>.
function serializar(dados) {
  return JSON.stringify(dados)
    .replace(/</g, '\\u003c')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');
}

// ---------- HTML ----------
function bloco(lado, titulo) {
  return (
    '<h2>' + titulo + '<span class="n" id="n-' + lado + '"></span></h2>' +
    '<table id="av-' + lado + '" class="av-t">' +
    '<thead><tr><th>Item</th><th class="num">Value</th><th class="num">RAP</th><th>Dem.</th><th class="num">24h</th></tr></thead>' +
    '<tbody></tbody></table>' +
    '<div class="av-acoes">' +
    '<button class="btn" id="add-' + lado + '">+ Adicionar item</button>' +
    '<label class="av-robux">Robux <input id="rb-' + lado + '" type="number" inputmode="numeric" min="0" step="1" placeholder="0"></label>' +
    '</div>'
  );
}

// Seção da aba. baseData = data do retrato do catálogo usado no 24h (ou null).
function secao(cfg, baseData, erro) {
  if (erro) {
    return '<div id="aba-avaliar" class="oculto"><p class="aviso">O avaliador não pôde ser montado: ' + esc(erro) + '</p></div>';
  }
  const linhaBase = baseData
    ? 'Variação 24h comparando com ' + a.fmtData(baseData)
    : 'Variação de 24h ainda em formação. Ela aparece depois de umas 24h de uso do painel ou do widget.';
  return (
    '<div id="aba-avaliar" class="oculto">' +
    '<p class="comp">' + esc(linhaBase) + '</p>' +
    '<p class="aviso oculto" id="av-aviso"></p>' +
    bloco('dou', 'Dou') +
    bloco('recebo', 'Recebo') +
    '<h2>Resumo</h2>' +
    '<p class="vazio" id="av-vazio">Monte a proposta acima para ver a comparação.</p>' +
    '<div id="av-resumo-bloco" class="oculto">' +
    '<table id="av-resumo" class="av-t">' +
    '<thead><tr><th></th><th class="num">Dou</th><th class="num">Recebo</th><th class="num">Diferença</th></tr></thead>' +
    '<tbody></tbody></table>' +
    '<p class="av-nota">Os totais incluem Robux, e quem recebe Robux fica com ' + Math.round((1 - cfg.TAXA_ROBUX) * 100) +
    '%. O value ajustado aplica os pesos de demanda, tendência e hyped (config.js). Faixa justa: ±' + cfg.FAIXA_JUSTA_PCT + '%.</p>' +
    '</div>' +
    '<h2>Alertas<span class="n" id="n-alertas"></span></h2>' +
    '<ul class="lista" id="av-alertas"></ul>' +
    '<button class="btn sec" id="av-limpar">Limpar proposta</button>' +
    '</div>'
  );
}

// Folhas (busca e menu do item) ficam fora da aba, no fim do <body>.
function folhas() {
  return (
    '<div id="fb-fundo" class="fundo oculto"></div>' +
    '<div id="fb-folha" class="folha-busca oculto">' +
    '<div class="fb-topo"><b id="fb-titulo">Adicionar</b><button id="fb-fechar">Fechar</button></div>' +
    '<div class="seg" id="fb-seg"><button data-f="inv" class="on">Meu inventário</button><button data-f="cat">Catálogo</button></div>' +
    '<input id="fb-q" type="search" placeholder="Nome ou sigla" autocomplete="off">' +
    '<p class="fb-info" id="fb-info"></p>' +
    '<div class="fb-lista" id="fb-lista"></div>' +
    '</div>' +
    '<div id="av-fundo" class="fundo oculto"></div>' +
    '<div id="av-folha" class="folha oculto">' +
    '<p id="av-folha-nome"></p>' +
    '<button id="av-remover" class="remover">Remover da proposta</button>' +
    '<a id="av-link" href="#">Ver no Rolimon\'s</a>' +
    '<button id="av-cancelar" class="cancelar">Cancelar</button>' +
    '</div>'
  );
}

function css() {
  return `
.av-acoes{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 0}
.btn{font:inherit;font-size:14px;font-weight:500;padding:8px 12px;border:1px solid var(--linha);border-radius:8px;background:var(--cab);color:var(--link)}
.btn:disabled{opacity:.45}
.btn.sec{display:block;width:100%;margin-top:24px;color:var(--neg)}
.av-robux{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--rotulo);text-transform:uppercase;letter-spacing:.04em}
.av-robux input{width:100px;font:inherit;font-size:15px;font-weight:400;text-transform:none;letter-spacing:0;text-align:right;padding:6px 8px;border:1px solid var(--linha);border-radius:8px;background:var(--cab);color:var(--fg);-webkit-appearance:none}
.av-t tr.vazia td{color:var(--sub);white-space:normal;font-size:13px}
#av-resumo td:first-child{white-space:normal}
#av-resumo td .det{color:inherit;opacity:.85}
#av-resumo tr.forte td{font-weight:600}
.av-nota{color:var(--sub);font-size:11px;margin:6px 0 0}
.folha-busca{position:fixed;left:0;right:0;bottom:0;top:max(44px,calc(env(safe-area-inset-top) + 28px));background:var(--bg);border-radius:14px 14px 0 0;display:flex;flex-direction:column;padding:12px 16px 0;box-shadow:0 -4px 20px rgba(0,0,0,.25)}
.fb-topo{display:flex;justify-content:space-between;align-items:center}
.fb-topo b{font-size:17px;font-weight:600}
.fb-topo button{font:inherit;font-size:15px;color:var(--link);background:none;border:0;padding:4px 0}
.folha-busca .seg{margin:10px 0 0}
.folha-busca input[type=search]{margin:10px 0 0}
.fb-info{color:var(--sub);font-size:13px;margin:8px 0 4px}
.fb-info:empty{display:none}
.fb-lista{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;margin-top:6px;border-top:1px solid var(--linha);padding-bottom:max(16px,env(safe-area-inset-bottom))}
.fb-item{display:flex;align-items:center;gap:10px;width:100%;padding:8px 0;border:0;border-bottom:1px solid var(--linha);background:none;color:var(--fg);font:inherit;font-size:14px;text-align:left;-webkit-tap-highlight-color:transparent}
.fb-item:active{background:var(--cab)}
.fb-txt{flex:1;min-width:0}
.fb-val{font-weight:600;white-space:nowrap}
.folha .remover{color:var(--neg)}
.diag-ponte{margin:8px 0 0}
`;
}

// ---------- Código que roda DENTRO da página ----------
// Recebe D (dados) e P (parâmetros). Usa fmtNum, fmtPct, fmtPctSinal e
// valorAjustado, que são injetados antes dela no <script>.
function paginaAvaliador(D, P) {
  var C = D.catalogo;
  var qtdCatalogo = Object.keys(C).length;
  var THUMBS = D.miniaturas || {};
  var INV = {};
  var ordemInv = [];
  D.inventario.forEach(function (x) {
    INV[x[0]] = x;
    ordemInv.push(x[0]);
  });

  var NOMES_LADO = { dou: 'Dou', recebo: 'Recebo' };
  var proposta = { dou: [], recebo: [], robuxDou: 0, robuxRecebo: 0 };
  var avisosCarga = [];
  var ponte = { pedidos: 0, respostas: 0, ultimoErro: null, tentados: {} };
  var salvaOk = false;

  function $(id) {
    return document.getElementById(id);
  }
  function esc(s) {
    var mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return mapa[c];
    });
  }
  function inteiro(v) {
    var n = Math.floor(Number(v));
    return isFinite(n) && n > 0 ? n : 0;
  }

  // ---------- Itens ----------
  function deCatalogo(id) {
    var c = C[id];
    if (!c) return null;
    return {
      id: String(id), nome: c[0], sigla: c[1], rap: c[2] >= 0 ? c[2] : 0, value: c[3] > 0 ? c[3] : null,
      dem: c[4], tend: c[5], projected: !!(c[6] & 1), hyped: !!(c[6] & 2), rare: !!(c[6] & 4),
      rap24: c[7], val24: c[8], doInventario: false, hold: false, serial: null, foraRolimons: false,
    };
  }
  function deInventario(uaid) {
    var x = INV[uaid];
    if (!x) return null;
    var i = deCatalogo(x[1]);
    if (!i) {
      i = {
        id: x[1], nome: x[4], sigla: '', rap: x[5] || 0, value: null, dem: -1, tend: -1,
        projected: false, hyped: false, rare: false, rap24: null, val24: null, foraRolimons: true,
      };
    } else if (!(C[x[1]][2] >= 0)) {
      i.rap = x[5] || 0;
    }
    i.uaid = uaid;
    i.doInventario = true;
    i.hold = !!x[3];
    i.serial = x[2];
    return i;
  }
  function resolver(e) {
    return e.u ? deInventario(e.u) : deCatalogo(e.id);
  }
  function valorEfetivo(i) {
    return i.value != null ? i.value : i.rap;
  }

  // ---------- Proposta salva ----------
  function salvar() {
    try {
      localStorage.setItem('proposta', JSON.stringify(proposta));
      salvaOk = true;
    } catch (e) {
      salvaOk = false;
    }
  }
  function carregar() {
    var s = null;
    try {
      s = JSON.parse(localStorage.getItem('proposta') || 'null');
    } catch (e) {}
    if (!s) return;
    ['dou', 'recebo'].forEach(function (lado) {
      (s[lado] || []).forEach(function (e) {
        if (!e || proposta[lado].length >= P.maxItens) return;
        var ent = e.u ? { u: String(e.u) } : { id: String(e.id) };
        if (resolver(ent)) proposta[lado].push(ent);
        else if (e.u) avisosCarga.push('Um item seu que estava na proposta não está mais no inventário e foi removido.');
        else avisosCarga.push('Um item da proposta não foi encontrado no catálogo e foi removido.');
      });
    });
    proposta.robuxDou = inteiro(s.robuxDou);
    proposta.robuxRecebo = inteiro(s.robuxRecebo);
  }

  // ---------- Desenho ----------
  function corDem(d) {
    return d === 0 ? 'neg' : d === 1 ? 'warn' : d >= 3 ? 'pos' : '';
  }
  function corTend(t) {
    return t === 0 ? 'neg' : t === 3 ? 'pos' : t === 1 || t === 4 ? 'warn' : '';
  }
  function variacao(p) {
    if (p == null) return '<span class="sub">—</span>';
    return '<span class="' + (p > 0 ? 'pos' : p < 0 ? 'neg' : 'sub') + '">' + fmtPctSinal(p) + '</span>';
  }
  function miniatura(id) {
    return THUMBS[id] ? '<img class="thumb" src="' + esc(THUMBS[id]) + '" alt="">' : '<span class="thumb"></span>';
  }
  function detalhes(i, lado) {
    var d = [];
    if (i.serial) d.push('#' + esc(i.serial));
    if (i.tend >= 0) d.push('<span class="' + corTend(i.tend) + '">' + esc(P.tendenciaCurta[i.tend]) + '</span>');
    if (i.projected) d.push('<span class="neg">projected</span>');
    if (i.hyped) d.push('hyped');
    if (i.rare) d.push('rare');
    if (i.hold) d.push('<span class="neg">hold</span>');
    if (i.value == null && !i.foraRolimons) d.push('sem value');
    if (i.foraRolimons) d.push("fora do Rolimon's");
    if (lado === 'dou' && !i.doInventario) d.push('<span class="warn">simulação</span>');
    return d.join(' · ');
  }
  function linha(i, lado, k) {
    var det = detalhes(i, lado);
    return (
      '<tr data-lado="' + lado + '" data-k="' + k + '">' +
      '<td class="item"><div class="cel">' + miniatura(i.id) + '<div><span class="nome">' + esc(i.nome) + '</span>' +
      (det ? '<span class="det">' + det + '</span>' : '') + '</div></div></td>' +
      '<td class="num">' + (i.value != null ? fmtNum(i.value) : '<span class="sub">—</span>') + '</td>' +
      '<td class="num">' + fmtNum(i.rap) + '</td>' +
      '<td class="' + corDem(i.dem) + '">' + esc(P.demandaCurta[i.dem] || '?') + '</td>' +
      '<td class="num">' + variacao(i.rap24) + '</td></tr>'
    );
  }
  function desenharLado(lado, itens) {
    var tb = $('av-' + lado).tBodies[0];
    tb.innerHTML = itens.length
      ? itens.map(function (i, k) { return linha(i, lado, k); }).join('')
      : '<tr class="vazia"><td colspan="5">Nenhum item. Toque em "Adicionar item".</td></tr>';
    $('n-' + lado).textContent = itens.length + '/' + P.maxItens;
    $('add-' + lado).disabled = itens.length >= P.maxItens;
  }

  function somar(itens, robuxBruto, recebe) {
    var robux = recebe ? Math.floor(robuxBruto * (1 - P.taxaRobux)) : robuxBruto;
    var t = { value: robux, ajustado: robux, rap: robux, robux: robux, qtd: itens.length };
    itens.forEach(function (i) {
      t.value += valorEfetivo(i);
      t.ajustado += valorAjustado(i, P);
      t.rap += i.rap;
    });
    return t;
  }
  function corDif(dif, base) {
    if (!(base > 0)) return dif > 0 ? 'pos' : dif < 0 ? 'neg' : 'sub';
    var p = (dif / base) * 100;
    return p >= P.faixa ? 'pos' : p <= -P.faixa ? 'neg' : 'warn';
  }
  function celDif(dif, base) {
    var txt = (dif > 0 ? '+' : '') + fmtNum(dif);
    var pct = base > 0 ? '<span class="det">' + fmtPctSinal((dif / base) * 100) + '</span>' : '';
    return '<td class="num ' + corDif(dif, base) + '">' + txt + pct + '</td>';
  }
  function tipoTroca(td, tr) {
    if (!td.qtd || !tr.qtd || td.qtd === tr.qtd) return null;
    return tr.qtd < td.qtd ? 'upgrade' : 'downgrade';
  }
  function desenharResumo(td, tr, tipo) {
    var vazio = !td.qtd && !tr.qtd && !td.robux && !tr.robux;
    $('av-resumo-bloco').classList.toggle('oculto', vazio);
    $('av-vazio').classList.toggle('oculto', !vazio);
    if (vazio) return;
    var linhas = [
      ['Value', td.value, tr.value, ''],
      ['Value ajustado', td.ajustado, tr.ajustado, 'forte'],
      ['RAP', td.rap, tr.rap, ''],
    ];
    var h = linhas.map(function (l) {
      return '<tr class="' + l[3] + '"><td>' + l[0] + '</td><td class="num">' + fmtNum(l[1]) + '</td><td class="num">' +
        fmtNum(l[2]) + '</td>' + celDif(l[2] - l[1], l[1]) + '</tr>';
    }).join('');
    h += '<tr><td>Robux</td><td class="num">' + fmtNum(td.robux) + '</td><td class="num">' + fmtNum(tr.robux) +
      (proposta.robuxRecebo ? '<span class="det">de ' + fmtNum(proposta.robuxRecebo) + '</span>' : '') + '</td>' +
      celDif(tr.robux - td.robux, 0) + '</tr>';
    h += '<tr><td>Itens</td><td class="num">' + td.qtd + '</td><td class="num">' + tr.qtd + '</td><td class="num sub">' +
      (tipo || '—') + '</td></tr>';
    $('av-resumo').tBodies[0].innerHTML = h;
  }

  function montarAlertas(dou, rec, tipo) {
    var L = [];
    function add(i, txt, cor) {
      L.push({ nome: i ? i.nome : null, txt: txt, cor: cor });
    }
    avisosCarga.forEach(function (t) { add(null, t, 'warn'); });
    rec.forEach(function (i) {
      if (i.projected) {
        add(i, i.value == null
          ? 'projected sem value: o RAP está inflado, contei só ' + Math.round(P.projetadoSemValue * 100) + '% dele'
          : 'projected: o RAP está inflado, confie no value', 'neg');
      }
      if (i.dem === 0) add(i, 'demanda terrível (difícil revender)', 'neg');
      else if (i.dem === 1) add(i, 'demanda baixa', 'warn');
      if (i.tend === 0) add(i, 'tendência de queda', 'warn');
      if (i.hyped) add(i, 'hyped: o preço pode estar inflado pela moda', 'warn');
      if (i.value == null && !i.projected) add(i, "sem value no Rolimon's, contei pelo RAP", 'warn');
      if (i.rap24 != null && i.rap24 >= P.alertaRap24) add(i, 'RAP subiu ' + fmtPct(i.rap24) + ' em 24h (pode ser manipulação)', 'neg');
      if (i.val24) add(i, 'value mudou ' + fmtPctSinal(i.val24) + ' em 24h', i.val24 > 0 ? 'pos' : 'warn');
    });
    dou.forEach(function (i) {
      if (i.hold) add(i, 'está em hold e não pode ser trocado agora', 'neg');
      if (!i.doInventario) add(i, 'não está no seu inventário (simulação)', 'sub');
      if (i.dem >= 3 && i.tend === 3) add(i, 'você está dando um item com demanda alta e em alta', 'warn');
      if (i.val24) add(i, 'value mudou ' + fmtPctSinal(i.val24) + ' em 24h', 'sub');
    });
    if (tipo === 'upgrade') add(null, 'Upgrade (você recebe menos itens, porém maiores): costuma exigir pagar um pouco a mais.', 'sub');
    if (tipo === 'downgrade') add(null, 'Downgrade (você recebe mais itens, porém menores): quem faz downgrade costuma receber um pouco a mais.', 'sub');
    if (proposta.robuxRecebo) add(null, 'Os Robux recebidos já estão com o desconto de ' + Math.round(P.taxaRobux * 100) + '% do Roblox.', 'sub');
    return L;
  }
  function desenharAlertas(L) {
    $('n-alertas').textContent = L.length;
    $('av-alertas').innerHTML = L.length
      ? L.map(function (x) {
          return '<li>' + (x.nome ? '<b>' + esc(x.nome) + '</b>: ' : '') + '<span class="' + x.cor + '">' + esc(x.txt) + '</span></li>';
        }).join('')
      : '<li class="sub">Nenhum alerta.</li>';
  }

  function atualizar() {
    var dou = proposta.dou.map(resolver);
    var rec = proposta.recebo.map(resolver);
    desenharLado('dou', dou);
    desenharLado('recebo', rec);
    var td = somar(dou, proposta.robuxDou, false);
    var tr = somar(rec, proposta.robuxRecebo, true);
    var tipo = tipoTroca(td, tr);
    desenharResumo(td, tr, tipo);
    desenharAlertas(montarAlertas(dou, rec, tipo));
    salvar();
    atualizarDiagPonte();
    pedirMiniaturas(dou.concat(rec).map(function (i) { return i.id; }));
  }

  // ---------- Busca (folha) ----------
  var busca = { lado: 'dou', fonte: 'inv', timer: null, resultados: [] };
  var indice = null; // [id, nome minúsculo, sigla minúscula, valor efetivo], do maior para o menor
  function montarIndice() {
    indice = Object.keys(C).map(function (id) {
      var c = C[id];
      return [id, c[0].toLowerCase(), c[1].toLowerCase(), c[3] > 0 ? c[3] : Math.max(c[2], 0)];
    });
    indice.sort(function (x, y) { return y[3] - x[3]; });
  }
  function detalheBusca(i) {
    var d = [];
    if (i.sigla) d.push(i.sigla);
    d.push('RAP ' + fmtNum(i.rap));
    d.push(P.demandaCurta[i.dem] || '?');
    if (i.serial) d.push('#' + i.serial);
    if (i.projected) d.push('projected');
    if (i.hold) d.push('hold');
    return d.join(' · ');
  }
  function listarBusca() {
    var q = $('fb-q').value.trim().toLowerCase();
    var res = [];
    var info = '';
    if (busca.fonte === 'inv') {
      var usados = {};
      proposta.dou.forEach(function (e) { if (e.u) usados[e.u] = 1; });
      ordemInv.forEach(function (u) {
        if (usados[u]) return;
        var i = deInventario(u);
        if (q && (i.nome + ' ' + i.sigla).toLowerCase().indexOf(q) < 0) return;
        res.push({ e: { u: u }, i: i });
      });
      if (!res.length) info = q ? 'Nada encontrado no seu inventário.' : 'Todos os seus itens já estão na proposta.';
    } else if (q.length < 2) {
      info = 'Digite pelo menos 2 letras do nome ou a sigla.';
    } else {
      if (!indice) montarIndice();
      var exatos = [];
      var outros = [];
      for (var k = 0; k < indice.length; k++) {
        var x = indice[k];
        if (x[2] && x[2] === q) exatos.push(x[0]);
        else if (outros.length < P.maxBusca && (x[1].indexOf(q) >= 0 || (x[2] && x[2].indexOf(q) === 0))) outros.push(x[0]);
      }
      exatos.concat(outros).slice(0, P.maxBusca).forEach(function (id) {
        res.push({ e: { id: id }, i: deCatalogo(id) });
      });
      if (!res.length) info = 'Nada encontrado no catálogo.';
    }
    busca.resultados = res;
    $('fb-info').textContent = info;
    $('fb-lista').innerHTML = res.map(function (r, k) {
      var i = r.i;
      return '<button class="fb-item" data-k="' + k + '">' + miniatura(i.id) +
        '<span class="fb-txt"><span class="nome">' + esc(i.nome) + '</span><span class="det">' + esc(detalheBusca(i)) + '</span></span>' +
        '<span class="fb-val">' + (i.value != null ? fmtNum(i.value) : '—') + '</span></button>';
    }).join('');
    if (busca.fonte === 'cat') pedirMiniaturas(res.map(function (r) { return r.i.id; }));
  }
  function fonteBusca(f) {
    busca.fonte = f;
    var bs = document.querySelectorAll('#fb-seg button');
    for (var k = 0; k < bs.length; k++) bs[k].classList.toggle('on', bs[k].getAttribute('data-f') === f);
    $('fb-q').placeholder = f === 'inv' ? 'Buscar no seu inventário' : 'Nome ou sigla do item';
    listarBusca();
  }
  function abrirBusca(lado) {
    if (proposta[lado].length >= P.maxItens) return;
    busca.lado = lado;
    $('fb-titulo').textContent = 'Adicionar em ' + NOMES_LADO[lado];
    $('fb-seg').classList.toggle('oculto', lado !== 'dou');
    $('fb-q').value = '';
    $('fb-fundo').classList.remove('oculto');
    $('fb-folha').classList.remove('oculto');
    fonteBusca(lado === 'dou' ? 'inv' : 'cat');
    if (lado === 'recebo') $('fb-q').focus();
  }
  function fecharBusca() {
    $('fb-q').blur();
    $('fb-fundo').classList.add('oculto');
    $('fb-folha').classList.add('oculto');
  }

  // ---------- Menu do item da proposta ----------
  var selecionado = null;
  function abrirMenu(lado, k) {
    var e = proposta[lado][k];
    var i = e && resolver(e);
    if (!i) return;
    selecionado = { lado: lado, k: k };
    $('av-folha-nome').textContent = i.nome;
    $('av-link').href = 'https://www.rolimons.com/item/' + i.id;
    $('av-fundo').classList.remove('oculto');
    $('av-folha').classList.remove('oculto');
  }
  function fecharMenu() {
    selecionado = null;
    $('av-fundo').classList.add('oculto');
    $('av-folha').classList.add('oculto');
  }

  // ---------- Ponte de miniaturas (página -> Scriptable -> página) ----------
  function atualizarDiagPonte() {
    var el = $('diag-ponte');
    if (!el) return;
    el.textContent = 'Avaliador: ' + qtdCatalogo + ' itens no catálogo · ponte das miniaturas: ' +
      ponte.pedidos + ' pedido(s), ' + ponte.respostas + ' resposta(s)' +
      (ponte.ultimoErro ? ' · erro: ' + ponte.ultimoErro : '') + ' · proposta salva: ' + (salvaOk ? 'sim' : 'não');
  }
  function pedirMiniaturas(ids) {
    var faltam = [];
    ids.forEach(function (id) {
      if (id && !THUMBS[id] && !ponte.tentados[id] && faltam.indexOf(id) < 0) faltam.push(id);
    });
    if (!faltam.length) return;
    faltam = faltam.slice(0, 100);
    faltam.forEach(function (id) { ponte.tentados[id] = 1; });
    ponte.pedidos++;
    var f = document.createElement('iframe');
    f.style.display = 'none';
    f.src = P.ponte + 'miniaturas?ids=' + faltam.join(',');
    document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    atualizarDiagPonte();
  }
  window.receberMiniaturas = function (m, erro) {
    ponte.respostas++;
    if (erro) ponte.ultimoErro = String(erro);
    var novas = 0;
    for (var id in m || {}) {
      if (m[id] && !THUMBS[id]) {
        THUMBS[id] = m[id];
        novas++;
      }
    }
    atualizarDiagPonte();
    if (novas) {
      atualizar();
      if (!$('fb-folha').classList.contains('oculto')) listarBusca();
    }
  };

  // ---------- Eventos ----------
  ['dou', 'recebo'].forEach(function (lado) {
    var chave = lado === 'dou' ? 'robuxDou' : 'robuxRecebo';
    var inp = $('rb-' + lado);
    $('add-' + lado).addEventListener('click', function () { abrirBusca(lado); });
    $('av-' + lado).tBodies[0].addEventListener('click', function (ev) {
      var tr = ev.target.closest('tr[data-k]');
      if (tr) abrirMenu(lado, Number(tr.getAttribute('data-k')));
    });
    inp.addEventListener('input', function () {
      proposta[chave] = inteiro(inp.value);
      atualizar();
    });
  });

  var fbSeg = document.querySelectorAll('#fb-seg button');
  for (var k = 0; k < fbSeg.length; k++) {
    fbSeg[k].addEventListener('click', function () { fonteBusca(this.getAttribute('data-f')); });
  }
  $('fb-q').addEventListener('input', function () {
    clearTimeout(busca.timer);
    busca.timer = setTimeout(listarBusca, 150);
  });
  $('fb-lista').addEventListener('click', function (ev) {
    var b = ev.target.closest('.fb-item');
    if (!b) return;
    var r = busca.resultados[Number(b.getAttribute('data-k'))];
    if (r && proposta[busca.lado].length < P.maxItens) proposta[busca.lado].push(r.e);
    fecharBusca();
    atualizar();
  });
  $('fb-fechar').addEventListener('click', fecharBusca);
  $('fb-fundo').addEventListener('click', fecharBusca);

  $('av-remover').addEventListener('click', function () {
    if (selecionado) proposta[selecionado.lado].splice(selecionado.k, 1);
    fecharMenu();
    atualizar();
  });
  $('av-cancelar').addEventListener('click', fecharMenu);
  $('av-fundo').addEventListener('click', fecharMenu);
  $('av-link').addEventListener('click', function () { setTimeout(fecharMenu, 300); });

  // Limpar pede um segundo toque (sem confirm(), que pode não existir no Scriptable).
  var limparArmado = null;
  $('av-limpar').addEventListener('click', function () {
    var b = this;
    if (!limparArmado) {
      b.textContent = 'Toque de novo para limpar';
      limparArmado = setTimeout(function () {
        limparArmado = null;
        b.textContent = 'Limpar proposta';
      }, 3000);
      return;
    }
    clearTimeout(limparArmado);
    limparArmado = null;
    b.textContent = 'Limpar proposta';
    proposta = { dou: [], recebo: [], robuxDou: 0, robuxRecebo: 0 };
    avisosCarga = [];
    $('rb-dou').value = '';
    $('rb-recebo').value = '';
    atualizar();
  });

  // ---------- Início ----------
  carregar();
  $('rb-dou').value = proposta.robuxDou || '';
  $('rb-recebo').value = proposta.robuxRecebo || '';
  atualizar();
}

// <script> completo da aba: funções auxiliares + dados + paginaAvaliador.
function script(json, cfg) {
  return (
    '<script>\n' +
    a.fmtNum.toString() + '\n' +
    a.fmtPct.toString() + '\n' +
    a.fmtPctSinal.toString() + '\n' +
    valorAjustado.toString() + '\n' +
    '(' + paginaAvaliador.toString() + ')(' + json + ', ' + serializar(parametros(cfg)) + ');\n' +
    '</script>'
  );
}

module.exports = {
  PONTE,
  valorAjustado,
  prepararDados,
  serializar,
  secao,
  folhas,
  css,
  script,
};
