// Avaliador de trade: aba "Avaliar trade" do painel.
// O cálculo roda dentro da página (sem requisições extras): este módulo prepara
// um catálogo enxuto e gera o HTML, o CSS e o JS da aba.
const a = require('analise');
const ajuda = require('ajuda');

// v6.2: as funções compartilhadas abaixo também rodam no Scriptable (notificações
// do widget). Na página elas usam as cópias injetadas de fmtNum/fmtPct/fmtPctSinal;
// aqui, estes apelidos (o texto das funções, usado no toString, não muda).
const fmtNum = a.fmtNum;
const fmtPct = a.fmtPct;
const fmtPctSinal = a.fmtPctSinal;

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

// ---------- Funções compartilhadas pelas abas (também injetadas na página) ----------
// ATENÇÃO: são injetadas na página (toString), então não podem usar nada de fora
// delas, exceto as outras funções injetadas (fmtNum, fmtPct, fmtPctSinal e estas).
// P = parâmetros vindos do config.js.

// Value base (o que vale na troca): o value do Rolimon's; sem value, o RAP.
// Item com value ignora o próprio RAP.
function valorEfetivo(i) {
  return i.value != null ? i.value : i.rap;
}

// Item a partir do catálogo enxuto (formato de prepararDados).
function itemDoCatalogo(C, id) {
  var c = C[id];
  if (!c) return null;
  return {
    id: String(id), nome: c[0], sigla: c[1], rap: c[2] >= 0 ? c[2] : 0, value: c[3] > 0 ? c[3] : null,
    dem: c[4], tend: c[5], projected: !!(c[6] & 1), hyped: !!(c[6] & 2), rare: !!(c[6] & 4),
    rap24: c[7], val24: c[8], doInventario: false, hold: false, serial: null, foraRolimons: false,
  };
}

// Totais de um lado da troca. Quem RECEBE Robux fica só com a parte sem a taxa.
function somarLado(itens, robuxBruto, recebe, P) {
  var robux = recebe ? Math.floor(robuxBruto * (1 - P.taxaRobux)) : robuxBruto;
  var t = { value: robux, rap: robux, robux: robux, qtd: itens.length };
  itens.forEach(function (i) {
    t.value += valorEfetivo(i);
    t.rap += i.rap;
  });
  return t;
}

// Do ponto de vista de quem dá "td" e recebe "tr".
function tipoTrocaLados(td, tr) {
  if (!td.qtd || !tr.qtd || td.qtd === tr.qtd) return null;
  return tr.qtd < td.qtd ? 'upgrade' : 'downgrade';
}

// Demanda média de um lado, ponderada pelo valor de cada item (ignora itens sem dado).
function demandaMediaLado(itens) {
  var soma = 0;
  var peso = 0;
  itens.forEach(function (i) {
    if (i.dem >= 0) {
      var w = Math.max(valorEfetivo(i), 1);
      soma += i.dem * w;
      peso += w;
    }
  });
  return peso ? soma / peso : null;
}

// Veredito ("vale ou não a pena"): 5 níveis + "Cuidado".
// nivel: 0..4 (índice de NIVEIS), -1 = Cuidado, null = proposta incompleta.
function calcularVeredito(dou, rec, td, tr, tipo, robuxRecebo, P) {
  var NIVEIS = [
    { titulo: 'Não vale de jeito nenhum', cor: 'neg' },
    { titulo: 'Não vale a pena', cor: 'neg' },
    { titulo: 'Troca justa', cor: 'warn' },
    { titulo: 'Vale a pena', cor: 'pos' },
    { titulo: 'Vale muito a pena', cor: 'pos' },
  ];
  function nomeDemanda(m) {
    return String(P.demandaCurta[Math.round(m)] || '?').toLowerCase();
  }
  var temDou = td.qtd || td.robux;
  var temRec = tr.qtd || tr.robux;
  if (!temDou && !temRec) return null;
  if (!temDou || !temRec) {
    return { titulo: 'Proposta incompleta', cor: 'sub', nivel: null, motivos: ['Adicione itens (ou Robux) nos dois lados para avaliar.'] };
  }

  // 1. Nível pela diferença do value base (Robux já com a taxa), com a régua
  // da FORMA da trade (do seu ponto de vista): upgrade, downgrade ou sidegrade.
  var dif = tr.value - td.value;
  var temBase = td.value > 0;
  var pct = temBase ? (dif / td.value) * 100 : dif > 0 ? 100 : 0;
  var regua = tipo === 'upgrade' ? P.reguaUp : tipo === 'downgrade' ? P.reguaDown : null;
  var n;
  if (regua) n = pct >= regua[3] ? 4 : pct >= regua[2] ? 3 : pct >= regua[1] ? 2 : pct >= regua[0] ? 1 : 0;
  else n = pct >= P.forte ? 4 : pct >= P.faixa ? 3 : pct > -P.faixa ? 2 : pct > -P.forte ? 1 : 0;
  var difTxt = (dif > 0 ? '+' : '') + fmtNum(dif);
  var valorTxt;
  if (!regua && Math.abs(pct) < P.faixa) valorTxt = 'Os dois lados valem quase o mesmo em value (' + difTxt + (temBase ? ', ' + fmtPctSinal(pct) : '') + ').';
  else if (dif > 0) valorTxt = 'Você ganha cerca de ' + (temBase ? fmtPctSinal(pct) + ' ' : '') + 'em value (' + difTxt + ').';
  else if (dif < 0) valorTxt = 'Você paga cerca de ' + (temBase ? fmtPct(-pct) + ' ' : '') + 'a mais em value (' + difTxt + ').';
  else valorTxt = 'Os dois lados valem o mesmo em value.';

  // 1a. A régua da forma, explicada (fica logo depois do value).
  function pctRegua(x) {
    return String(Math.abs(x)).replace('.', ',') + '%';
  }
  var formaTxt = null;
  if (tipo === 'upgrade') {
    formaTxt = 'É um upgrade (você dá mais itens e recebe menos, porém maiores): pagar um pouco a mais é normal. Pagar até ' +
      pctRegua(regua[3]) + ' a mais é ótimo, até ' + pctRegua(regua[2]) + ' ainda vale a pena, e acima de ' + pctRegua(regua[1]) + ' não vale.';
  } else if (tipo === 'downgrade') {
    formaTxt = 'É um downgrade (você recebe mais itens, porém menores): o normal é receber a mais. Abaixo de +' +
      pctRegua(regua[1]) + ' não compensa, de +' + pctRegua(regua[2]) + ' vale a pena, e de +' + pctRegua(regua[3]) + ' vale muito.';
  }

  // 1b. RAP só como informação (não muda o veredito).
  var difRap = tr.rap - td.rap;
  var temBaseRap = td.rap > 0;
  var pctRap = temBaseRap ? (difRap / td.rap) * 100 : difRap > 0 ? 100 : 0;
  var difRapTxt = (difRap > 0 ? '+' : '') + fmtNum(difRap);
  var rapTxt;
  if (pctRap >= P.faixa) rapTxt = 'Em RAP você ganha cerca de ' + (temBaseRap ? fmtPctSinal(pctRap) + ' ' : '') + '(' + difRapTxt + ').';
  else if (pctRap <= -P.faixa) rapTxt = 'Em RAP você perde cerca de ' + (temBaseRap ? fmtPct(-pctRap) + ' ' : '') + '(' + difRapTxt + ').';
  else rapTxt = 'Em RAP os dois lados ficam quase iguais (' + difRapTxt + (temBaseRap ? ', ' + fmtPctSinal(pctRap) : '') + ').';

  // 2. Demanda média dos dois lados.
  var mD = demandaMediaLado(dou);
  var mR = demandaMediaLado(rec);
  var motivoDem = null;
  if (mD != null && mR != null) {
    var dd = mR - mD;
    var rebaixou = false;
    if (dd <= -P.demRebaixa && n > 0) {
      n--;
      rebaixou = true;
    }
    if (Math.abs(dd) >= P.demMotivo) {
      var nR = nomeDemanda(mR);
      var nD = nomeDemanda(mD);
      var comp = nR !== nD ? ' (' + nR + ' contra ' + nD + ')' : '';
      motivoDem = dd > 0
        ? 'O que você recebe tem demanda maior que o que você dá' + comp + ': fica mais fácil revender.'
        : 'O que você recebe tem demanda menor que o que você dá' + comp + ': vai ser mais difícil revender' +
          (rebaixou ? ', por isso o veredito caiu um nível.' : '.');
    }
  }

  // 2b. Você dá itens com demanda conhecida e a maior parte do value que recebe
  // é de itens sem dados de demanda: aviso e o veredito cai um nível.
  var motivoSemDem = null;
  var valorItensRec = tr.value - tr.robux;
  var valorSemDem = 0;
  rec.forEach(function (i) {
    if (!(i.dem >= 0)) valorSemDem += valorEfetivo(i);
  });
  if (mD != null && valorItensRec > 0 && valorSemDem / valorItensRec > P.semDadosFracao) {
    var caiu = n > 0;
    if (caiu) n--;
    motivoSemDem = 'A maior parte do value que você recebe é de itens sem dados de demanda: podem ser difíceis de revender' +
      (caiu ? ', por isso o veredito caiu um nível.' : '.');
  }

  // 3. Alertas fortes viram "Cuidado".
  // Cópias do mesmo item geram um aviso só: "Nome (2 cópias) ...".
  var listaFortes = [];
  var fortesPorChave = {};
  function addForte(i, resto) {
    var chave = i.nome + '|' + resto;
    if (fortesPorChave[chave]) {
      fortesPorChave[chave].n++;
      return;
    }
    fortesPorChave[chave] = { nome: i.nome, resto: resto, n: 1 };
    listaFortes.push(fortesPorChave[chave]);
  }
  rec.forEach(function (i) {
    if (i.projected) {
      addForte(i, ' é projected' + (i.value == null
        ? ' e não tem value: o RAP está inflado, então o ganho pode não ser real.'
        : ': o RAP está inflado, confie só no value.'));
    }
    if (i.dem === 0) addForte(i, ' tem demanda terrível: pode ser muito difícil revender.');
    if (i.rap24 != null && i.rap24 >= P.alertaRap24) {
      addForte(i, ' teve o RAP subindo ' + fmtPct(i.rap24) + ' em 24h: pode ser manipulação.');
    }
  });
  dou.forEach(function (i) {
    if (i.hold) addForte(i, ' está em hold e não pode ser trocado agora.');
  });
  var fortes = listaFortes.map(function (f) {
    return f.nome + (f.n > 1 ? ' (' + f.n + ' cópias)' : '') + f.resto;
  });

  // 4. Motivo extra (o mais importante que sobrar).
  var extras = [];
  if (robuxRecebo) extras.push('Os Robux recebidos já contam com o desconto de ' + Math.round(P.taxaRobux * 100) + '% do Roblox.');
  if (dou.some(function (i) { return !i.doInventario; })) extras.push('Proposta simulada: há item no lado Dou que não está no seu inventário.');

  var forma = tipo || (td.qtd && tr.qtd ? 'sidegrade' : null);
  var motivos;
  if (fortes.length) {
    motivos = [fortes[0], valorTxt + ' Sem esse alerta, o veredito seria "' + NIVEIS[n].titulo + '".', rapTxt];
    if (fortes[1]) motivos.push(fortes[1]);
    else if (motivoSemDem) motivos.push(motivoSemDem);
    else if (motivoDem) motivos.push(motivoDem);
    else if (formaTxt) motivos.push(formaTxt);
    return { titulo: 'Cuidado', cor: 'neg', nivel: -1, motivos: motivos, semDemanda: !!motivoSemDem, forma: forma };
  }
  // Até 4 motivos: value, forma (upgrade/downgrade), RAP, demanda (sem dados e média) e o extra mais importante.
  motivos = [valorTxt];
  if (formaTxt) motivos.push(formaTxt);
  motivos.push(rapTxt);
  if (motivoSemDem) motivos.push(motivoSemDem);
  if (motivoDem) motivos.push(motivoDem);
  for (var k = 0; k < extras.length && motivos.length < 4; k++) motivos.push(extras[k]);
  return { titulo: NIVEIS[n].titulo, cor: NIVEIS[n].cor, nivel: n, motivos: motivos.slice(0, 4), semDemanda: !!motivoSemDem, forma: forma };
}

// Chave de cor/estilo do veredito (v4): pílula cheia para os extremos.
function corVeredito(v) {
  if (!v || v.nivel == null) return 'incompleta';
  return ['nenhum', 'neg', 'justa', 'pos', 'muito'][v.nivel] || 'cuidado';
}

// v6.2.1: título do veredito com a gíria dos traders: W (ganhou), F (justa),
// L (perdeu). "Cuidado" e "Proposta incompleta" ficam sem letra.
function tituloWFL(v) {
  if (!v) return '';
  var s = v.nivel == null || v.nivel < 0 ? '' : v.nivel >= 3 ? 'W' : v.nivel === 2 ? 'F' : 'L';
  return v.titulo + (s ? ' · ' + s : '');
}

function parametros(cfg) {
  const demandaCurta = {};
  const tendenciaCurta = {};
  for (let k = -1; k <= 4; k++) {
    demandaCurta[k] = a.demandaCurta(k);
    tendenciaCurta[k] = a.tendenciaCurta(k);
  }
  return {
    semDadosFracao: cfg.DEMANDA_SEM_DADOS_FRACAO,
    faixa: cfg.FAIXA_JUSTA_PCT,
    forte: cfg.VEREDITO_FORTE_PCT,
    reguaUp: cfg.VEREDITO_UPGRADE_PCT,
    reguaDown: cfg.VEREDITO_DOWNGRADE_PCT,
    demMotivo: cfg.DEMANDA_DIF_MOTIVO,
    demRebaixa: cfg.DEMANDA_DIF_REBAIXA,
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
  return { catalogo: C, inventario: inventarioCompacto(itens), miniaturas: miniaturas || {} };
}

// [uaid, assetId, serial, hold, nome, rap] (nome e rap servem para itens fora do Rolimon's).
// Também usado para a conta 2 na aba Anúncios.
function inventarioCompacto(itens) {
  return itens.map((i) => [i.uaid, String(i.assetId), i.serial || null, i.hold ? 1 : 0, i.nome, i.rap]);
}

// JSON seguro para colocar dentro de <script>.
function serializar(dados) {
  return JSON.stringify(dados)
    .replace(/</g, '\\u003c')
    .split(String.fromCharCode(0x2028)).join('\\u2028')
    .split(String.fromCharCode(0x2029)).join('\\u2029');
}

// ---------- HTML ----------
// Um lado da proposta: itens, botões e o Total (value base) em destaque.
function bloco(lado, titulo) {
  return (
    '<div class="av-lado av-' + lado + '">' +
    '<div class="av-lado-topo"><h3>' + titulo + '</h3><span class="cont" id="n-' + lado + '"></span></div>' +
    '<div class="av-itens" id="av-' + lado + '"></div>' +
    '<div class="av-acoes">' +
    '<button class="btn sec" id="add-' + lado + '">+ Adicionar item</button>' +
    '<label class="av-robux">Robux <input id="rb-' + lado + '" type="number" inputmode="numeric" min="0" step="1" placeholder="0"></label>' +
    '</div>' +
    '<div class="av-total"><span class="av-total-rot">Total<small id="tot-' + lado + '-sub">value base</small></span>' +
    '<span class="av-total-v" id="tot-' + lado + '">0</span></div>' +
    '</div>'
  );
}

// Seção da aba. A data base das 24h fica só no Diagnóstico.
function secao(cfg, baseData, erro) {
  if (erro) {
    return '<div id="aba-avaliar" class="aba oculto"><p class="aviso">O avaliador não pôde ser montado: ' + esc(erro) + '</p></div>';
  }
  return (
    '<div id="aba-avaliar" class="aba oculto">' +
    // Dou e Recebo juntos num cartão só, separados pelo divisor de troca.
    '<div class="av-proposta">' +
    bloco('dou', 'Dou') +
    '<div class="troca"><span>⇅</span></div>' +
    bloco('recebo', 'Recebo') +
    '</div>' +
    '<p class="nota">Value base: o value do Rolimon\'s; item sem value entra pelo RAP (marcado com "RAP" ao lado do número). ' +
    'Os totais incluem Robux, e quem recebe Robux fica com ' + Math.round((1 - cfg.TAXA_ROBUX) * 100) + '%.</p>' +
    // v5.4: atalho para a régua do veredito na tela de Ajuda.
    ajuda.link('aj-regua', 'Como o veredito funciona?') +
    '<div id="av-veredito" class="veredito oculto">' +
    '<span class="selo" id="av-ver-titulo"></span>' +
    '<div class="ver-pct" id="av-ver-pct"></div>' +
    '<div class="ver-sub" id="av-ver-sub"></div>' +
    '<ul class="motivos" id="av-ver-motivos"></ul>' +
    '<p class="nota">Segunda opinião automática pelo value (item sem value entra pelo RAP). A decisão é sua.</p>' +
    '</div>' +
    '<details class="bloco" data-chave="av-resumo"><summary>Resumo</summary><div class="dentro">' +
    '<p class="vazio" id="av-vazio">Monte a proposta acima para ver a comparação.</p>' +
    '<div id="av-resumo-bloco" class="oculto">' +
    '<table id="av-resumo" class="av-resumo">' +
    '<thead><tr><th></th><th>Dou</th><th>Recebo</th><th>Diferença</th></tr></thead>' +
    '<tbody></tbody></table>' +
    '<p class="nota av-nota">O RAP é só informativo. O veredito usa a régua da forma da trade: upgrade, downgrade ou sidegrade (mesmo número de itens, faixa justa ±' + cfg.FAIXA_JUSTA_PCT + '%).</p>' +
    '</div>' +
    '</div></details>' +
    '<details class="bloco" data-chave="av-alertas"><summary>Alertas<span class="cont" id="n-alertas"></span></summary><div class="dentro">' +
    '<ul class="grupo" id="av-alertas"></ul>' +
    '</div></details>' +
    '<button class="btn sec av-limpar" id="av-limpar">Limpar proposta</button>' +
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
    '<div class="seg mini" id="fb-ordem"><button data-o="value" class="on">Por value</button><button data-o="rap">Por RAP</button></div>' +
    '<p class="fb-info" id="fb-info"></p>' +
    '<div class="fb-lista" id="fb-lista"></div>' +
    '</div>' +
    '<div id="av-fundo" class="fundo oculto"></div>' +
    '<div id="av-folha" class="folha oculto">' +
    '<p id="av-folha-nome"></p>' +
    // v6.9: lugar do card do item (o mesmo de cartao.lugar; preenchido pelo cartao.js).
    '<div id="av-cartao" class="folha-bloco cartao oculto"></div>' +
    '<button id="av-remover" class="remover">Remover da proposta</button>' +
    '<a id="av-link" href="#">Ver no Rolimon\'s</a>' +
    '<button id="av-cancelar" class="cancelar">Cancelar</button>' +
    '</div>'
  );
}

function css() {
  return `
.av-proposta{display:flex;flex-direction:column;border-radius:20px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.av-proposta,.veredito,.av-resumo{-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}
.av-lado{display:flex;flex-direction:column;gap:12px;padding:16px}
.av-dou{background:var(--dou-bg)}
.av-recebo{background:var(--rec-bg)}
.av-lado-topo{display:flex;align-items:center;justify-content:space-between;gap:8px}
.av-lado-topo h3{margin:0;font-size:19px;font-weight:700;line-height:1}
.av-dou h3{color:var(--acc-t)}
.av-recebo h3{color:var(--pos)}
.av-itens{border-radius:14px;background:var(--card);overflow:hidden}
.av-itens>.item+.item{border-top:1px solid var(--borda)}
.av-itens .item{padding:11px 14px}
.av-vazia{margin:0;padding:14px;color:var(--sub);font-size:14px}
.av-acoes{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.av-robux{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--sub)}
.av-robux input{width:108px;font:inherit;font-size:16px;font-weight:600;text-align:right;padding:10px 12px;border:1px solid var(--borda);border-radius:10px;background:var(--card);color:var(--fg);-webkit-appearance:none}
.av-total{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding-top:4px}
.av-total-rot{font-size:14px;font-weight:600;color:var(--sub)}
.av-total-rot small{display:block;font-size:13px;font-weight:400}
.av-total-v{font-size:30px;font-weight:700;line-height:1;letter-spacing:-.01em}
.av-dou .av-total-v{color:var(--acc-t)}
.av-recebo .av-total-v{color:var(--pos)}
.troca{position:relative;height:1px;background:var(--borda)}
.troca span{position:absolute;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;display:grid;place-items:center;background:var(--card);border:1px solid var(--borda);color:var(--sub);font-size:17px}
.av-limpar{width:100%;color:var(--neg)}

[data-cor]{--c:var(--sub);--sf:var(--card2);--cf:var(--fg)}
[data-cor=muito]{--c:var(--pos);--sf:var(--pos);--cf:var(--on-status)}
[data-cor=pos]{--c:var(--pos);--sf:var(--pos-bg);--cf:var(--pos)}
[data-cor=justa]{--c:var(--acc-t);--sf:var(--card2);--cf:var(--acc-t)}
[data-cor=cuidado]{--c:var(--warn);--sf:var(--warn-bg);--cf:var(--warn)}
[data-cor=neg]{--c:var(--neg);--sf:var(--neg-bg);--cf:var(--neg)}
[data-cor=nenhum]{--c:var(--neg);--sf:var(--neg);--cf:var(--on-status)}
.selo{display:inline-block;padding:7px 14px;border-radius:999px;background:var(--sf);color:var(--cf);font-size:15px;font-weight:700}
.veredito{padding:22px 18px 18px;border-radius:20px;background:var(--card);box-shadow:var(--sombra);text-align:center}
.ver-pct{margin:14px 0 4px;font-size:52px;font-weight:700;line-height:1;letter-spacing:-.02em;color:var(--c)}
.ver-sub{font-size:15px;color:var(--sub)}
.ver-pct:empty,.ver-sub:empty{display:none}
.motivos{margin:18px 0 12px;padding:0;list-style:none;text-align:left;border-top:1px solid var(--borda)}
.motivos li{padding:11px 0;border-bottom:1px solid var(--borda);font-size:15px}

.av-resumo{width:100%;border-collapse:separate;border-spacing:0;font-size:15px;background:var(--card);border-radius:16px;overflow:hidden;box-shadow:var(--sombra)}
.av-resumo th{padding:12px 12px 6px;text-align:right;font-size:13px;font-weight:600;color:var(--sub)}
.av-resumo th:first-child,.av-resumo td:first-child{text-align:left}
.av-resumo td{padding:10px 12px;text-align:right;border-top:1px solid var(--borda);white-space:nowrap}
.av-resumo td .det{display:block;color:inherit;opacity:.85}
.av-resumo tr.forte td{font-weight:700}
.av-nota{margin-top:8px}

.folha-busca{position:fixed;left:0;right:0;bottom:0;top:max(44px,calc(env(safe-area-inset-top) + 28px));background:var(--bg);border-radius:18px 18px 0 0;display:flex;flex-direction:column;gap:10px;padding:14px 16px 0;box-shadow:0 -6px 24px rgba(0,0,0,.25)}
.fb-topo{display:flex;justify-content:space-between;align-items:center}
.fb-topo b{font-size:19px;font-weight:700}
.fb-topo button{font:inherit;font-size:16px;font-weight:600;color:var(--acc-t);background:none;border:0;padding:4px 0}
.fb-info{color:var(--sub);font-size:14px;margin:0}
.fb-info:empty{display:none}
.fb-lista{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;border-radius:16px 16px 0 0;background:var(--card);padding-bottom:max(16px,env(safe-area-inset-bottom))}
.fb-item{display:flex;align-items:center;gap:12px;width:100%;padding:11px 14px;border:0;border-bottom:1px solid var(--borda);background:none;color:var(--fg);font:inherit;font-size:15px;text-align:left;-webkit-tap-highlight-color:transparent}
.fb-item:active{background:var(--card2)}
.fb-item .thumb{width:40px;height:40px;border-radius:10px}
.fb-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.fb-num{display:flex;flex-direction:column;align-items:flex-end;gap:3px;min-width:58px;font-weight:700;white-space:nowrap}
.fb-rot{font-size:12px;font-weight:500;color:var(--sub)}
.folha .remover{color:var(--neg)}
`;
}

// ---------- Código que roda DENTRO da página ----------
// Recebe D (dados) e P (parâmetros). Usa fmtNum, fmtPct, fmtPctSinal e as
// funções compartilhadas, que são injetadas antes dela no <script>.
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
    return itemDoCatalogo(C, id);
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
  // Variação de 24h do RAP, mostrada na linha pequena só quando existe.
  function variacao24(p) {
    return '<span class="' + (p > 0 ? 'pos' : p < 0 ? 'neg' : 'sub') + '">24h ' + fmtPctSinal(p) + '</span>';
  }
  function miniatura(id) {
    return THUMBS[id] ? '<img class="thumb" src="' + esc(THUMBS[id]) + '" alt="">' : '<span class="thumb"></span>';
  }
  function detalhes(i, lado) {
    var d = [];
    if (i.dem >= 0) d.push('<span class="' + corDem(i.dem) + '">' + esc(P.demandaCurta[i.dem]) + '</span>');
    if (i.serial) d.push('#' + esc(i.serial));
    if (i.tend >= 0) d.push('<span class="' + corTend(i.tend) + '">' + esc(P.tendenciaCurta[i.tend]) + '</span>');
    if (i.rap24 != null) d.push(variacao24(i.rap24));
    if (i.projected) d.push('<span class="neg">projected</span>');
    if (i.hyped) d.push('hyped');
    if (i.rare) d.push('rare');
    if (i.hold) d.push('<span class="neg">hold</span>');
    if (i.value == null && !i.foraRolimons) d.push('sem value');
    if (i.foraRolimons) d.push("fora do Rolimon's");
    if (lado === 'dou' && !i.doInventario) d.push('<span class="warn">simulação</span>');
    return d.join(' · ');
  }
  // Linha do item: o número grande é o value base ("RAP" ao lado quando o item
  // não tem value); embaixo, o RAP como informação.
  function linha(i, lado, k) {
    var det = detalhes(i, lado);
    return (
      '<div class="item" data-lado="' + lado + '" data-k="' + k + '">' + miniatura(i.id) +
      '<div class="item-txt"><span class="nome">' + esc(i.nome) + '</span>' +
      (det ? '<span class="det">' + det + '</span>' : '') + '</div>' +
      '<div class="item-num"><span class="v">' + fmtNum(valorEfetivo(i)) +
      (i.value == null ? '<small class="tag">RAP</small>' : '') + '</span>' +
      '<span class="r"><small>RAP</small>' + fmtNum(i.rap) + '</span></div></div>'
    );
  }
  function desenharLado(lado, itens) {
    $('av-' + lado).innerHTML = itens.length
      ? itens.map(function (i, k) { return linha(i, lado, k); }).join('')
      : '<p class="av-vazia">Nenhum item. Toque em "Adicionar item".</p>';
    $('n-' + lado).textContent = itens.length + '/' + P.maxItens;
    $('add-' + lado).disabled = itens.length >= P.maxItens;
  }
  // Total do lado em value base (Robux incluídos; quem recebe já está com a taxa).
  function desenharTotal(lado, t) {
    $('tot-' + lado).textContent = fmtNum(t.value);
    $('tot-' + lado + '-sub').textContent = t.robux ? 'value base · inclui ' + fmtNum(t.robux) + ' Robux' : 'value base';
  }

  function somar(itens, robuxBruto, recebe) {
    return somarLado(itens, robuxBruto, recebe, P);
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
    return tipoTrocaLados(td, tr);
  }
  function desenharResumo(td, tr, tipo) {
    var vazio = !td.qtd && !tr.qtd && !td.robux && !tr.robux;
    $('av-resumo-bloco').classList.toggle('oculto', vazio);
    $('av-vazio').classList.toggle('oculto', !vazio);
    if (vazio) return;
    var linhas = [
      ['Value', td.value, tr.value, 'forte'],
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
      (tipo || (td.qtd && tr.qtd ? 'sidegrade' : '—')) + '</td></tr>';
    $('av-resumo').tBodies[0].innerHTML = h;
  }

  function montarAlertas(dou, rec, tipo) {
    var L = [];
    var porChave = {};
    // Avisos iguais (cópias do mesmo item) aparecem uma vez só, com a contagem.
    function add(i, txt, cor) {
      var chave = (i ? i.nome : '') + '|' + txt;
      if (porChave[chave]) {
        porChave[chave].n++;
        return;
      }
      porChave[chave] = { nome: i ? i.nome : null, txt: txt, cor: cor, n: 1 };
      L.push(porChave[chave]);
    }
    avisosCarga.forEach(function (t) { add(null, t, 'warn'); });
    rec.forEach(function (i) {
      if (i.projected) {
        add(i, i.value == null
          ? 'projected sem value: o RAP está inflado e entra inteiro no value'
          : 'projected: o RAP está inflado, confie no value', 'neg');
      }
      if (i.dem === 0) add(i, 'demanda terrível (difícil revender)', 'neg');
      else if (i.dem === 1) add(i, 'demanda baixa', 'warn');
      if (i.tend === 0) add(i, 'tendência de queda', 'warn');
      if (i.hyped) add(i, 'hyped: o preço pode estar inflado pela moda', 'warn');
      if (i.rap24 != null && i.rap24 >= P.alertaRap24) add(i, 'RAP subiu ' + fmtPct(i.rap24) + ' em 24h (pode ser manipulação)', 'neg');
      if (i.val24) add(i, 'value mudou ' + fmtPctSinal(i.val24) + ' em 24h', i.val24 > 0 ? 'pos' : 'warn');
    });
    dou.forEach(function (i) {
      if (i.hold) add(i, 'está em hold e não pode ser trocado agora', 'neg');
      if (!i.doInventario) add(i, 'não está no seu inventário (simulação)', 'sub');
      if (i.dem >= 3 && i.tend === 3) add(i, 'você está dando um item com demanda alta e em alta', 'warn');
      if (i.val24) add(i, 'value mudou ' + fmtPctSinal(i.val24) + ' em 24h', 'sub');
    });
    if (tipo === 'upgrade') {
      add(null, 'Upgrade (você dá mais itens e recebe menos, porém maiores): pagar até ' + Math.abs(P.reguaUp[3]) +
        '% a mais é ótimo; acima de ' + Math.abs(P.reguaUp[1]) + '% não vale.', 'sub');
    }
    if (tipo === 'downgrade') {
      add(null, 'Downgrade (você recebe mais itens, porém menores): o normal é receber a mais; abaixo de +' + P.reguaDown[1] +
        '% não compensa, de +' + P.reguaDown[2] + '% vale a pena.', 'sub');
    }
    if (proposta.robuxRecebo) add(null, 'Os Robux recebidos já estão com o desconto de ' + Math.round(P.taxaRobux * 100) + '% do Roblox.', 'sub');
    return L;
  }
  function desenharAlertas(L) {
    var pior = 'sub';
    L.forEach(function (x) {
      if (x.cor === 'neg') pior = 'neg';
      else if (x.cor === 'warn' && pior !== 'neg') pior = 'warn';
    });
    $('n-alertas').className = 'cont ' + pior;
    $('n-alertas').textContent = L.length;
    $('av-alertas').innerHTML = L.length
      ? L.map(function (x) {
          return '<li><span class="marca ' + x.cor + '">!</span><span class="txt">' +
            (x.nome ? '<b>' + esc(x.nome) + '</b>' + (x.n > 1 ? ' (' + x.n + ' cópias)' : '') + ': ' : '') +
            '<span class="' + x.cor + '">' + esc(x.txt) + '</span></span></li>';
        }).join('')
      : '<li class="sub">Nenhum alerta.</li>';
  }

  // ---------- Veredito (mensagem "vale ou não a pena") ----------
  // A regra fica em calcularVeredito (compartilhada com a aba Anúncios).
  function veredito(dou, rec, td, tr, tipo) {
    return calcularVeredito(dou, rec, td, tr, tipo, proposta.robuxRecebo, P);
  }
  // Cartão do veredito: pílula com o nome, a % grande (value base) e os motivos.
  function desenharVeredito(v, td, tr) {
    var el = $('av-veredito');
    el.classList.toggle('oculto', !v);
    if (!v) return;
    el.setAttribute('data-cor', corVeredito(v));
    $('av-ver-titulo').textContent = tituloWFL(v);
    var pct = '';
    var sub = '';
    if (v.nivel != null) {
      var dif = tr.value - td.value;
      var difTxt = (dif > 0 ? '+' : '') + fmtNum(dif);
      pct = td.value > 0 ? fmtPctSinal((dif / td.value) * 100) : difTxt;
      sub = 'em value · ' + difTxt + (v.forma ? ' · ' + v.forma : '');
    }
    $('av-ver-pct').textContent = pct;
    $('av-ver-sub').textContent = sub;
    $('av-ver-motivos').innerHTML = v.motivos.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('');
  }

  function atualizar() {
    var dou = proposta.dou.map(resolver);
    var rec = proposta.recebo.map(resolver);
    desenharLado('dou', dou);
    desenharLado('recebo', rec);
    var td = somar(dou, proposta.robuxDou, false);
    var tr = somar(rec, proposta.robuxRecebo, true);
    var tipo = tipoTroca(td, tr);
    desenharTotal('dou', td);
    desenharTotal('recebo', tr);
    desenharVeredito(veredito(dou, rec, td, tr, tipo), td, tr);
    desenharResumo(td, tr, tipo);
    desenharAlertas(montarAlertas(dou, rec, tipo));
    salvar();
    atualizarDiagPonte();
    pedirMiniaturas(dou.concat(rec).map(function (i) { return i.id; }));
  }

  // ---------- Busca (folha) ----------
  var busca = { lado: 'dou', fonte: 'inv', ordem: 'value', timer: null, resultados: [] };
  try {
    if (localStorage.getItem('ordemBusca') === 'rap') busca.ordem = 'rap';
  } catch (e) {}
  // Dois índices do catálogo, do maior para o menor: por valor efetivo e por RAP.
  // Cada linha: [id, nome minúsculo, sigla minúscula, valor efetivo, RAP]
  var indice = null;
  var indiceRap = null;
  function montarIndice() {
    var base = Object.keys(C).map(function (id) {
      var c = C[id];
      return [id, c[0].toLowerCase(), c[1].toLowerCase(), c[3] > 0 ? c[3] : Math.max(c[2], 0), Math.max(c[2], 0)];
    });
    indice = base.slice().sort(function (x, y) { return y[3] - x[3]; });
    indiceRap = base.slice().sort(function (x, y) { return y[4] - x[4]; });
  }
  function detalheBusca(i) {
    var d = [];
    if (i.sigla) d.push(i.sigla);
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
      var chave = busca.ordem === 'rap'
        ? function (r) { return r.i.rap; }
        : function (r) { return valorEfetivo(r.i); };
      res.sort(function (x, y) { return chave(y) - chave(x); });
      if (!res.length) info = q ? 'Nada encontrado no seu inventário.' : 'Todos os seus itens já estão na proposta.';
    } else if (q.length < 2) {
      info = 'Digite pelo menos 2 letras do nome ou a sigla.';
    } else {
      if (!indice) montarIndice();
      var lista = busca.ordem === 'rap' ? indiceRap : indice;
      var exatos = [];
      var outros = [];
      for (var k = 0; k < lista.length; k++) {
        var x = lista[k];
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
        '<span class="fb-num"><span class="fb-rot">Value</span>' + (i.value != null ? fmtNum(i.value) : '—') + '</span>' +
        '<span class="fb-num"><span class="fb-rot">RAP</span>' + fmtNum(i.rap) + '</span></button>';
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
    // v6.9: card do item (buscado só agora, neste toque).
    if (window.thCartao) window.thCartao.abrir(i.id, $('av-cartao'));
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
      // A aba Anúncios usa as mesmas miniaturas (objeto compartilhado).
      if (window.thAoReceberMiniaturas) {
        try { window.thAoReceberMiniaturas(); } catch (e) {}
      }
      // v5.4: a tela de Ajuda também usa as miniaturas (cartões de exemplo).
      if (window.thAjudaMiniaturas) {
        try { window.thAjudaMiniaturas(); } catch (e) {}
      }
    }
  };
  // A aba Anúncios pede miniaturas pela mesma ponte.
  window.thPedirMiniaturas = pedirMiniaturas;

  // ---------- Eventos ----------
  ['dou', 'recebo'].forEach(function (lado) {
    var chave = lado === 'dou' ? 'robuxDou' : 'robuxRecebo';
    var inp = $('rb-' + lado);
    $('add-' + lado).addEventListener('click', function () { abrirBusca(lado); });
    $('av-' + lado).addEventListener('click', function (ev) {
      var it = ev.target.closest('[data-k]');
      if (it) abrirMenu(lado, Number(it.getAttribute('data-k')));
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
  // Ordem da busca (value ou RAP), lembrada no iPhone.
  function marcarOrdem() {
    var bs = document.querySelectorAll('#fb-ordem button');
    for (var k = 0; k < bs.length; k++) bs[k].classList.toggle('on', bs[k].getAttribute('data-o') === busca.ordem);
  }
  var fbOrdem = document.querySelectorAll('#fb-ordem button');
  for (var k = 0; k < fbOrdem.length; k++) {
    fbOrdem[k].addEventListener('click', function () {
      busca.ordem = this.getAttribute('data-o');
      try { localStorage.setItem('ordemBusca', busca.ordem); } catch (e) {}
      marcarOrdem();
      listarBusca();
    });
  }
  marcarOrdem();
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
// Os dados (TH_D) e os parâmetros (TH_P) ficam globais para a aba Anúncios,
// que vem num <script> logo depois e usa as mesmas funções.
function script(json, cfg) {
  return (
    '<script>\n' +
    a.fmtNum.toString() + '\n' +
    a.fmtPct.toString() + '\n' +
    a.fmtPctSinal.toString() + '\n' +
    valorEfetivo.toString() + '\n' +
    itemDoCatalogo.toString() + '\n' +
    somarLado.toString() + '\n' +
    tipoTrocaLados.toString() + '\n' +
    demandaMediaLado.toString() + '\n' +
    calcularVeredito.toString() + '\n' +
    corVeredito.toString() + '\n' +
    tituloWFL.toString() + '\n' +
    'var TH_D = ' + json + ';\n' +
    'var TH_P = ' + serializar(parametros(cfg)) + ';\n' +
    '(' + paginaAvaliador.toString() + ')(TH_D, TH_P);\n' +
    '</script>'
  );
}

module.exports = {
  PONTE,
  parametros,
  // v6.2: para a análise dos anúncios fora da página (notificações do widget).
  compartilhadas: { valorEfetivo, itemDoCatalogo, somarLado, tipoTrocaLados, calcularVeredito },
  prepararDados,
  inventarioCompacto,
  serializar,
  secao,
  folhas,
  css,
  script,
};
