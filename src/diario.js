// Diário de trades (v6.1): detecção automática + "lucro até hoje".
// Painel e widget comparam os itens da conta principal (uaids do Rolimon's)
// com a consulta anterior. Se algo saiu E algo entrou, nasce uma pergunta
// pendente ("Você fez esta trade?"); quem pergunta é o painel, no topo do
// Inventário. Só saiu ou só entrou (compra, venda, presente) não pergunta.
// Tudo fica no arquivo dados/diario.json, só neste iPhone.
//
// v6.14: a trade pode aparecer partida em consultas diferentes (o painel vê o
// item sair e só a consulta seguinte, ou o widget, vê o novo chegar). A metade
// sem par vira "solto" e espera cfg.DIARIO_JANELA_H horas pela outra:
// - consulta com os dois lados → pergunta só com ela (os soltos seguem esperando);
// - um lado só + solto do outro lado → pergunta nova juntando tudo;
// - um lado só, sem solto do outro, mas com pergunta aberta dentro da janela →
//   o item atrasado entra na pergunta aberta mais recente;
// - senão vira solto; passou da janela, some em silêncio.
// Item que entrou solto e saiu de novo (comprou e revendeu) se anula.
//
// Formato do arquivo:
// { userId, seq,
//   ref: { data, itens: { uaid: assetId } },        // inventário da última consulta
//   sumidos: { uaid: data },                         // saíram (48h): se voltarem, era falha
//   soltos: { saiu: { uaid: it+d }, entrou: { uaid: it+d } },  // sem par (janela)
//   pendentes: [{ id, data, origem, partes, saiu: [it], entrou: [it] }],
//   trades:    [{ id, data, confirmadaEm, userId, saiu: [it], entrou: [it], robux }] }
// it = { u: uaid, a: assetId, n: nome, v: value base na hora (guardado, não aparece) }
// d = quando o solto foi visto; partes = em quantas consultas a pergunta foi montada.
// robux = o que caiu (+) ou saiu (−) da conta, como a pessoa digitou.

const cfg = require('config');

const ARQ = 'diario';
const MAX_PENDENTES = 10;
const MAX_TRADES = 500;
const MAX_ITENS_EVENTO = 40;
const MAX_SOLTOS = 40;
const SUMIDOS_HORAS = 48;
const MAX_ROBUX = 100000000;

function janelaH() {
  const h = Number(cfg.DIARIO_JANELA_H);
  return h > 0 ? h : 24;
}

function ler(store) {
  const d = store.ler(ARQ) || {};
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const s = obj(d.soltos);
  return {
    userId: d.userId || null,
    seq: Number(d.seq) || 0,
    ref: d.ref && d.ref.itens ? d.ref : null,
    sumidos: obj(d.sumidos),
    soltos: { saiu: obj(s.saiu), entrou: obj(s.entrou) },
    pendentes: Array.isArray(d.pendentes) ? d.pendentes : [],
    trades: Array.isArray(d.trades) ? d.trades : [],
  };
}

function gravar(store, d) {
  store.gravar(ARQ, d);
}

// Nome e value base de um item pelo catálogo do Rolimon's
// (value; sem value = RAP). null quando o item não está no catálogo.
function doCatalogo(rolimons, assetId) {
  const r = rolimons ? rolimons[String(assetId)] : null;
  if (!Array.isArray(r)) return null;
  const value = typeof r[3] === 'number' && r[3] > 0 ? r[3] : null;
  const rap = typeof r[2] === 'number' && r[2] >= 0 ? r[2] : null;
  return { n: r[0] || null, v: value != null ? value : rap };
}

function itemDoEvento(uaid, assetId, porUaid, rolimons) {
  const i = porUaid[uaid];
  if (i) return { u: uaid, a: Number(i.assetId), n: i.nome, v: i.valorEfetivo };
  const c = doCatalogo(rolimons, assetId);
  return { u: uaid, a: Number(assetId), n: (c && c.n) || 'Item ' + assetId, v: c ? c.v : null };
}

// Compara o inventário de agora com o da última consulta.
// dados = resultado de api.carregarTudo; itens/fonte = analise.montarItens.
// Retorna um resumo curto para o Diagnóstico (nunca lança erro de propósito).
function detectar(store, dados, itens, fonte, agora, origem) {
  const userId = dados.usuario ? dados.usuario.id : null;
  if (!userId) return 'pulou: sem usuário';
  if (fonte !== 'rolimons' || !dados.jogador) return "pulou: itens não vieram do Rolimon's";
  if (dados.origem.jogador === 'cache-antigo') return 'pulou: itens de um cache antigo';
  if (dados.jogador.privado) return 'pulou: inventário privado no Rolimon\'s';

  const atual = {};
  const porUaid = {};
  for (const i of itens) {
    atual[i.uaid] = i.assetId;
    porUaid[i.uaid] = i;
  }

  const d = ler(store);
  // Primeira vez (ou outra conta principal): só fotografa o inventário.
  if (!d.ref || d.userId !== userId) {
    d.userId = userId;
    d.ref = { data: agora, itens: atual };
    d.sumidos = {};
    d.soltos = { saiu: {}, entrou: {} };
    d.pendentes = [];
    gravar(store, d);
    return 'começou a acompanhar (' + Object.keys(atual).length + ' itens)';
  }

  // Esquece os "sumidos" antigos e os soltos de fora da janela.
  const limite = agora - SUMIDOS_HORAS * 3600000;
  for (const u of Object.keys(d.sumidos)) if (!(d.sumidos[u] >= limite)) delete d.sumidos[u];
  const limJanela = agora - janelaH() * 3600000;
  let expirados = 0;
  for (const lado of ['saiu', 'entrou']) {
    for (const u of Object.keys(d.soltos[lado])) {
      const x = d.soltos[lado][u];
      if (!x || !(x.d >= limJanela)) { delete d.soltos[lado][u]; expirados++; }
    }
  }

  const antes = d.ref.itens;
  let saiu = Object.keys(antes).filter((u) => !(u in atual));
  let entrou = Object.keys(atual).filter((u) => !(u in antes));

  // Item que tinha sumido (falha do Rolimon's) e voltou não conta como "entrou".
  const voltaram = entrou.filter((u) => u in d.sumidos);
  for (const u of voltaram) { delete d.sumidos[u]; delete d.soltos.saiu[u]; }
  entrou = entrou.filter((u) => voltaram.indexOf(u) < 0);

  // Item que entrou solto e saiu de novo (comprou e revendeu): um anula o outro.
  const idaVolta = saiu.filter((u) => u in d.soltos.entrou);
  for (const u of idaVolta) delete d.soltos.entrou[u];
  saiu = saiu.filter((u) => idaVolta.indexOf(u) < 0);

  // Pergunta cujos itens "saídos" voltaram ao inventário: era falha, some sozinha.
  const antesPend = d.pendentes.length;
  d.pendentes = d.pendentes.filter((p) => !p.saiu.some((x) => x.u in atual));
  const canceladas = antesPend - d.pendentes.length;

  // Todo item que sai fica 48h em "sumidos": se voltar, era falha do Rolimon's.
  for (const u of saiu) d.sumidos[u] = agora;

  const novosSaiu = saiu.map((u) => itemDoEvento(u, antes[u], porUaid, dados.rolimons));
  const novosEntrou = entrou.map((u) => itemDoEvento(u, atual[u], porUaid, dados.rolimons));
  const soltosSaiu = Object.keys(d.soltos.saiu).map((u) => d.soltos.saiu[u]);
  const soltosEntrou = Object.keys(d.soltos.entrou).map((u) => d.soltos.entrou[u]);
  const limpo = (x) => ({ u: x.u, a: x.a, n: x.n, v: x.v });

  const novaPergunta = (s, e, data, partes) => {
    d.seq += 1;
    d.pendentes.push({
      id: d.seq,
      data,
      origem,
      partes,
      saiu: s.slice(0, MAX_ITENS_EVENTO).map(limpo),
      entrou: e.slice(0, MAX_ITENS_EVENTO).map(limpo),
    });
    if (d.pendentes.length > MAX_PENDENTES) d.pendentes = d.pendentes.slice(-MAX_PENDENTES);
  };

  let resumo;
  if (saiu.length && entrou.length) {
    // Os dois lados na mesma consulta: pergunta só com eles (igual à v6.1).
    novaPergunta(novosSaiu, novosEntrou, agora, 1);
    resumo = 'nova pergunta: saíram ' + saiu.length + ', entraram ' + entrou.length;
  } else if (saiu.length || entrou.length) {
    const soSaiu = saiu.length > 0;
    const novos = soSaiu ? novosSaiu : novosEntrou;
    const outroLado = soSaiu ? soltosEntrou : soltosSaiu;
    const aberta = (() => {
      for (let k = d.pendentes.length - 1; k >= 0; k--) if (d.pendentes[k].data >= limJanela) return d.pendentes[k];
      return null;
    })();
    if (outroLado.length) {
      // A outra metade já estava esperando: junta os soltos dos dois lados com a consulta de agora.
      const usados = soltosSaiu.concat(soltosEntrou);
      const vistas = {};
      let data = agora;
      for (const x of usados) { vistas[x.d] = 1; if (x.d < data) data = x.d; }
      const partes = Object.keys(vistas).length + 1;
      novaPergunta(soltosSaiu.concat(soSaiu ? novos : []), soltosEntrou.concat(soSaiu ? [] : novos), data, partes);
      d.soltos = { saiu: {}, entrou: {} };
      resumo = 'nova pergunta juntando ' + partes + ' consultas: saíram ' + d.pendentes[d.pendentes.length - 1].saiu.length +
        ', entraram ' + d.pendentes[d.pendentes.length - 1].entrou.length;
    } else if (aberta) {
      // Item atrasado de uma trade que já gerou pergunta (ainda sem resposta).
      const lista = soSaiu ? aberta.saiu : aberta.entrou;
      const tem = {};
      for (const x of lista) tem[x.u] = 1;
      let somados = 0;
      for (const x of novos) {
        if (tem[x.u] || lista.length >= MAX_ITENS_EVENTO) continue;
        lista.push(limpo(x));
        somados++;
      }
      aberta.partes = (Number(aberta.partes) || 1) + 1;
      if (aberta.origem !== origem) aberta.origem = 'misto';
      resumo = 'somou ' + somados + (soSaiu ? ' saída(s)' : ' entrada(s)') + ' na pergunta #' + aberta.id;
    } else {
      // Fica esperando a outra metade (até a janela acabar).
      const alvo = soSaiu ? d.soltos.saiu : d.soltos.entrou;
      for (const x of novos) alvo[x.u] = Object.assign(limpo(x), { d: agora });
      const chaves = Object.keys(alvo).sort((p, q) => alvo[p].d - alvo[q].d);
      for (let k = 0; k < chaves.length - MAX_SOLTOS; k++) delete alvo[chaves[k]];
      resumo = 'só ' + (soSaiu ? 'saíram ' : 'entraram ') + novos.length + ' (esperando o par por até ' + janelaH() + 'h)';
    }
  } else {
    resumo = 'sem mudança';
  }
  if (voltaram.length) resumo += ' · ' + voltaram.length + ' voltaram';
  if (idaVolta.length) resumo += ' · ' + idaVolta.length + ' entraram e saíram';
  if (canceladas) resumo += ' · ' + canceladas + ' pergunta(s) cancelada(s)';
  const esperando = Object.keys(d.soltos.saiu).length + Object.keys(d.soltos.entrou).length;
  if (esperando) resumo += ' · ' + esperando + ' esperando par';
  if (expirados) resumo += ' · ' + expirados + ' sem par esquecido(s)';

  d.ref = { data: agora, itens: atual };
  gravar(store, d);
  return resumo;
}

// Resposta da pergunta: "sim" vira trade (com os Robux), "nao" só some.
function responder(store, id, sim, robux) {
  const d = ler(store);
  const k = d.pendentes.findIndex((p) => p.id === id);
  if (k < 0) return false;
  const p = d.pendentes.splice(k, 1)[0];
  if (sim) {
    let r = Math.round(Number(robux) || 0);
    if (Math.abs(r) > MAX_ROBUX) r = 0;
    d.trades.push({ id: p.id, data: p.data, confirmadaEm: Date.now(), userId: d.userId, saiu: p.saiu, entrou: p.entrou, robux: r });
    if (d.trades.length > MAX_TRADES) d.trades = d.trades.slice(-MAX_TRADES);
  }
  gravar(store, d);
  return true;
}

function apagar(store, id) {
  const d = ler(store);
  const antes = d.trades.length;
  d.trades = d.trades.filter((t) => t.id !== id);
  if (d.trades.length === antes) return false;
  gravar(store, d);
  return true;
}

// Dados para a página: só da conta principal, com o value de HOJE de cada item
// (o value da hora fica no arquivo, sem aparecer). Item fora do catálogo fica
// com o value guardado.
function paraPagina(store, rolimons, userId) {
  const d = ler(store);
  const hoje = (it) => {
    const c = doCatalogo(rolimons, it.a);
    const v = c && c.v != null ? c.v : it.v;
    return { a: it.a, n: (c && c.n) || it.n, v: typeof v === 'number' ? v : 0 };
  };
  const mesmaConta = d.userId === userId;
  return {
    comecou: !!d.ref && mesmaConta,
    pendentes: mesmaConta
      ? d.pendentes.map((p) => ({ id: p.id, data: p.data, origem: p.origem, partes: Number(p.partes) || 1, saiu: p.saiu.map(hoje), entrou: p.entrou.map(hoje) }))
      : [],
    trades: d.trades
      .filter((t) => t.userId === userId)
      .map((t) => ({ id: t.id, data: t.data, saiu: t.saiu.map(hoje), entrou: t.entrou.map(hoje), robux: t.robux || 0 }))
      .reverse(),
  };
}

// Ids dos itens do diário (para buscar as miniaturas).
function idsDaPagina(pag) {
  const ids = {};
  const pega = (l) => l.forEach((it) => (ids[String(it.a)] = 1));
  pag.pendentes.forEach((p) => { pega(p.saiu); pega(p.entrou); });
  pag.trades.slice(0, 30).forEach((t) => { pega(t.saiu); pega(t.entrou); });
  return Object.keys(ids);
}

// ---------- Página ----------
// v6.13 (Etapa 5, protótipo Q2): a pergunta fica no topo do Inventário, compacta
// (miniaturas do que saiu → do que entrou, a diferença e Sim / Não; Robux e os
// itens só no toque). O lucro e as trades saíram do fim do Inventário e moram
// numa tela cheia própria, aberta pelo menu ⋯ > Diário de trades (só na conta
// principal), no mesmo molde da tela do item.

// Lugar no topo do Inventário: o aviso de "salvo" e as perguntas.
function topo() {
  return '<div id="dia-ok" class="dia-ok oculto" role="status"></div><div id="dia-pend" class="dia-pend"></div>';
}

// Tela cheia do Diário (fica no fim do <body>, antes da tela do item).
function tela() {
  return (
    '<div id="tela-dia" class="ti oculto" role="dialog" aria-modal="true" aria-labelledby="td-nome">' +
    '<div class="ti-barra"><div class="ti-titulo"><b id="td-nome">Diário de trades</b></div></div>' +
    '<div class="ti-corpo" id="dia-secao"></div>' +
    '<div class="ti-pe"><button type="button" class="ti-voltar" id="td-voltar">‹ Voltar</button></div>' +
    '</div>'
  );
}

function css() {
  return `
.dia-pend{display:flex;flex-direction:column;gap:12px}
.dia-pend:empty{display:none}
.dia-ok{padding:10px 14px;border-radius:12px;background:var(--pos-bg);color:var(--pos);font-size:14px;font-weight:600}
.dia-card{border-radius:18px;background:var(--card);box-shadow:var(--sombra);border:1.5px solid var(--acc-t);overflow:hidden;-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}
.dia-lado{padding:8px 16px 10px}
.dia-lado.dou{background:var(--dou-bg)}
.dia-lado.rec{background:var(--rec-bg)}
.dia-rot{display:flex;justify-content:space-between;gap:10px;padding:4px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--sub)}
.dia-it{display:flex;align-items:center;gap:10px;padding:5px 0}
.dia-it .thumb{width:34px;height:34px;border-radius:9px}
.dia-it .nome{flex:1;min-width:0;font-size:15px}
.dia-it .v{font-size:15px;font-weight:700;white-space:nowrap}
.dia-rbx{display:flex;flex-direction:column;gap:8px;padding:10px 16px 4px;border-top:1px solid var(--borda)}
.dia-rbx label{font-size:14px;font-weight:600}
.dia-rbx label small{font-size:13px;font-weight:500;color:var(--sub)}
.dia-rbx-lin{display:flex;gap:8px}
.dia-rbx .seg{flex:none}
.dia-rbx .seg button{flex:none;padding:7px 10px;font-size:13px}
.dia-rbx input{flex:1;min-width:0;font:inherit;font-size:16px;padding:8px 12px;border:1px solid var(--borda);border-radius:10px;background:var(--card);color:var(--fg);-webkit-appearance:none}
.dia-bts{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:4px 14px 14px}
.dia-bts .btn{padding:10px 8px;font-size:14px}
/* v6.13: pergunta compacta (abre no toque) */
.dq-lin{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px 10px;border:0;background:none;color:inherit;font:inherit;text-align:left;-webkit-tap-highlight-color:transparent}
.dq-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
.dq-txt>b{font-size:15px;font-weight:700;line-height:1.2}
.dq-txt>b small{margin-left:6px;font-size:12px;font-weight:500;color:var(--sub)}
.dq-mini,.dt-mini{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.dq-mini .thumb{width:26px;height:26px;border-radius:7px}
.dt-mini .thumb{width:22px;height:22px;border-radius:6px}
.dq-mini .seta,.dt-mini .seta{margin:0 4px;color:var(--sub);font-size:13px}
.dq-dif{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:2px;text-align:right}
.dq-dif b{font-size:19px;font-weight:700;line-height:1;white-space:nowrap}
.dq-dif small{font-size:11px;font-weight:600;color:var(--sub);white-space:nowrap}
.dq-chev{flex:none;color:var(--sub);font-size:20px;line-height:1;transition:transform .15s}
.dia-card.aberta .dq-chev{transform:rotate(90deg)}
.dq-det{border-top:1px solid var(--borda)}
.dia-card.aberta .dia-bts{padding-top:12px}
/* v6.13: tela do Diário */
.dt-pend{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:12px;background:var(--warn-bg);color:var(--warn);font-size:14px;font-weight:600}
.dt-pend button{margin-left:auto;padding:0;border:0;background:none;color:inherit;font:inherit;text-decoration:underline}
.dia-lucro{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}
.dia-lucro .rot{display:flex;flex-direction:column;gap:2px;min-width:0}
.dia-lucro .rot b{font-size:15px}
.dia-lucro .rot span{font-size:13px;color:var(--sub)}
.dia-lucro .num{font-size:30px;font-weight:700;letter-spacing:-.01em;white-space:nowrap}
.dia-trade{display:flex;flex-direction:column;gap:8px;padding:12px 16px}
.dia-trade+.dia-trade{border-top:1px solid var(--borda)}
.dia-lin{display:flex;align-items:center;gap:12px;width:100%;padding:0;border:0;background:none;color:inherit;font:inherit;text-align:left;-webkit-tap-highlight-color:transparent}
.dia-lin .item-txt{gap:5px}
.dia-lin .l{font-size:17px;font-weight:700;white-space:nowrap}
.dia-data{flex:none;width:46px;text-align:center;font-size:12px;font-weight:700;line-height:1.15;color:var(--sub)}
.dia-data b{display:block;font-size:18px;color:var(--fg)}
.dia-det{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:12px;background:var(--card2);font-size:14px}
.dia-det .dia-lado{padding:4px 8px 6px;border-radius:10px}
.dia-det .dia-rot{padding:2px 0}
.dia-det .dia-it{padding:3px 0}
.dia-det .dia-it .nome,.dia-det .dia-it .v{font-size:14px}
.dia-apagar{align-self:flex-start;padding:2px 0;border:0;background:none;color:var(--neg);font-size:14px;font-weight:600}
`;
}

// <script> do diário: desenha as perguntas e a tela, e fala com o Scriptable
// pela ponte (PONTE + 'diario?acao=sim|nao|apagar&id=..&r=..').
// A página atualiza na hora; a resposta da ponte (window.receberDiario) confirma.
// window.thAbrirDiario() abre a tela; window.thDiarioPendentes() diz quantas perguntas há.
function script(dadosJson, ponteJson, miniJson) {
  return `<script>
(function(){
  var PONTE = ${ponteJson};
  var D = ${dadosJson};
  var MINI = ${miniJson};
  var aberta = null, apagarArmado = null, okTimer = null;
  var rbx = {}, perguntaAberta = {};
  function $(id){ return document.getElementById(id); }
  if (!$('dia-secao') || !$('dia-pend')) return;
  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function fmt(n){ return String(Math.round(Math.abs(n))).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.'); }
  function sinal(n){ n = Math.round(n); return (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(n); }
  function cor(n){ n = Math.round(n); return n > 0 ? 'pos' : n < 0 ? 'neg' : 'sub'; }
  function soma(l){ var s = 0; for (var k = 0; k < l.length; k++) s += l[k].v || 0; return s; }
  function lucro(t){ return soma(t.entrou) - soma(t.saiu) + (t.robux || 0); }
  function dois(n){ return (n < 10 ? '0' : '') + n; }
  var MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  function quando(ms){
    var x = new Date(ms), h = new Date();
    var hora = dois(x.getHours()) + ':' + dois(x.getMinutes());
    if (x.toDateString() === h.toDateString()) return 'hoje ' + hora;
    return dois(x.getDate()) + '/' + dois(x.getMonth() + 1) + ' ' + hora;
  }
  function thumb(it){
    var u = MINI[String(it.a)];
    return u ? '<img class="thumb" src="' + esc(u) + '" alt="">' : '<span class="thumb"></span>';
  }
  // Miniaturas de um lado (todas; a linha quebra se precisar).
  function mini(l){ return l.map(thumb).join(''); }
  function ponte(q){
    try {
      var f = document.createElement('iframe');
      f.style.display = 'none';
      f.src = PONTE + 'diario?' + q + '&t=' + Date.now();
      document.body.appendChild(f);
      setTimeout(function(){ if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    } catch (e) {}
  }
  function robuxDe(id){
    var r = rbx[id] || { modo: 'rec', txt: '' };
    var n = parseInt(String(r.txt).replace(/\\D/g, ''), 10) || 0;
    return r.modo === 'rec' ? n : -n;
  }

  function lado(l, classe, rotulo){
    return '<div class="dia-lado ' + classe + '"><div class="dia-rot"><span>' + rotulo + '</span><span>' + fmt(soma(l)) + '</span></div>' +
      l.map(function(it){
        return '<div class="dia-it">' + thumb(it) + '<span class="nome">' + esc(it.n) + '</span><span class="v">' + fmt(it.v) + '</span></div>';
      }).join('') + '</div>';
  }

  // ---------- Perguntas (topo do Inventário) ----------
  function cartao(p){
    var r = rbx[p.id] || (rbx[p.id] = { modo: 'rec', txt: '' });
    var dif = soma(p.entrou) - soma(p.saiu) + robuxDe(p.id);
    var ab = !!perguntaAberta[p.id];
    var h = '<div class="dia-card dq' + (ab ? ' aberta' : '') + '" data-id="' + p.id + '">' +
      '<button type="button" class="dq-lin" data-abrir-p="1" aria-expanded="' + ab + '">' +
      '<span class="dq-txt"><b>Você fez esta trade?<small>' + esc(quando(p.data)) + (p.partes > 1 ? ' · ' + p.partes + ' consultas' : p.origem === 'widget' ? ' · pelo widget' : '') + '</small></b>' +
      '<span class="dq-mini" aria-label="Saíram ' + p.saiu.length + ', entraram ' + p.entrou.length + '">' + mini(p.saiu) + '<span class="seta">→</span>' + mini(p.entrou) + '</span></span>' +
      '<span class="dq-dif"><b class="' + cor(dif) + '">' + sinal(dif) + '</b><small>value de hoje</small></span>' +
      '<span class="dq-chev" aria-hidden="true">›</span></button>';
    if (ab) {
      h += '<div class="dq-det">' + lado(p.saiu, 'dou', 'Saíram') + lado(p.entrou, 'rec', 'Entraram') +
        '<div class="dia-rbx"><label for="dia-r-' + p.id + '">Robux <small>(opcional: o que caiu ou saiu da conta)</small></label>' +
        '<div class="dia-rbx-lin"><div class="seg peq"><button type="button" data-modo="rec" class="' + (r.modo === 'rec' ? 'on' : '') + '">Entraram</button>' +
        '<button type="button" data-modo="dei" class="' + (r.modo === 'dei' ? 'on' : '') + '">Saíram</button></div>' +
        '<input id="dia-r-' + p.id + '" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="0" value="' + esc(r.txt) + '"></div></div></div>';
    }
    return h + '<div class="dia-bts"><button type="button" class="btn" data-acao="sim">Sim</button><button type="button" class="btn sec" data-acao="nao">Não foi trade</button></div></div>';
  }
  function desenharPerguntas(){
    $('dia-pend').innerHTML = D.pendentes.map(cartao).join('');
  }

  // ---------- Tela do Diário ----------
  // Lucro acumulado da trade mais antiga até hoje (área + linha + pontos), no
  // estilo do gráfico da tela do item. Cores por style (var() em atributo de SVG
  // não é garantido no WebKit).
  function grafico(serie){
    var W = 320, H = 110, E = 2, BAIXO = H + 18;
    var t0 = serie[0][0], t1 = serie[serie.length - 1][0];
    var lo = 0, hi = 0;
    serie.forEach(function(p){ if (p[1] < lo) lo = p[1]; if (p[1] > hi) hi = p[1]; });
    if (hi === lo) hi = lo + 1;
    function x(t){ return E + ((t - t0) / (t1 - t0 || 1)) * (W - 2 * E); }
    function y(v){ return 8 + (1 - (v - lo) / (hi - lo)) * (H - 16); }
    var c = serie[serie.length - 1][1] < 0 ? 'var(--neg)' : 'var(--pos)';
    var linha = '';
    serie.forEach(function(p, k){ linha += (k ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1); });
    var area = linha + 'L' + x(t1).toFixed(1) + ' ' + y(0).toFixed(1) + 'L' + x(t0).toFixed(1) + ' ' + y(0).toFixed(1) + 'Z';
    var ult = serie[serie.length - 1];
    var txt = 'font-size="10" style="fill:var(--sub)"';
    function dc(t){ var d = new Date(t); return dois(d.getDate()) + '/' + dois(d.getMonth() + 1); }
    return '<svg viewBox="0 0 ' + W + ' ' + BAIXO + '" role="img" aria-label="Gráfico do lucro acumulado">' +
      '<line x1="0" x2="' + W + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" style="stroke:var(--sub);opacity:.45" stroke-dasharray="3 3"/>' +
      '<path d="' + area + '" style="fill:' + c + ';opacity:.14"/>' +
      '<path d="' + linha + '" style="fill:none;stroke:' + c + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      serie.slice(1, -1).map(function(p){ return '<circle cx="' + x(p[0]).toFixed(1) + '" cy="' + y(p[1]).toFixed(1) + '" r="2.5" style="fill:' + c + '"/>'; }).join('') +
      '<circle cx="' + x(ult[0]).toFixed(1) + '" cy="' + y(ult[1]).toFixed(1) + '" r="4" style="fill:' + c + ';stroke:var(--card)" stroke-width="2"/>' +
      '<text x="' + E + '" y="' + (BAIXO - 1) + '" ' + txt + '>' + dc(t0) + '</text>' +
      '<text x="' + (W - E) + '" y="' + (BAIXO - 1) + '" text-anchor="end" ' + txt + '>' + dc(t1) + '</text></svg>';
  }
  function desenharSecao(){
    var l = D.trades;
    var n = l.length;
    var total = 0, melhor = -Infinity, pior = Infinity, ganhou = 0;
    l.forEach(function(t){ var x = lucro(t); total += x; if (x > melhor) melhor = x; if (x < pior) pior = x; if (Math.round(x) > 0) ganhou++; });
    var h = '';
    var np = D.pendentes.length;
    if (np) h += '<div class="dt-pend"><span>' + (np === 1 ? '1 pergunta esperando' : np + ' perguntas esperando') + ' no Inventário</span><button type="button" id="dt-responder">Responder</button></div>';
    h += '<div class="dia-lucro"><div class="rot"><b>Lucro até hoje</b><span>' +
      (n ? n + (n === 1 ? ' trade' : ' trades') + ' · pelo value de hoje' : 'nenhuma trade ainda') + '</span></div>' +
      '<span class="num ' + (n ? cor(total) : 'sub') + '">' + (n ? sinal(total) : '—') + '</span></div>';
    if (n) {
      // D.trades vem da mais nova para a mais antiga.
      var acc = 0, antigas = l.slice().reverse(), serie = [[antigas[0].data - 86400000, 0]];
      antigas.forEach(function(t){ acc += lucro(t); serie.push([t.data, acc]); });
      h += '<div class="ti-graf"><small>Lucro acumulado</small>' + grafico(serie) +
        '<div class="ti-leg"><span><small>Melhor</small><b class="' + cor(melhor) + '">' + sinal(melhor) + '</b></span>' +
        '<span><small>Pior</small><b class="' + cor(pior) + '">' + sinal(pior) + '</b></span>' +
        '<span><small>Média</small><b class="' + cor(total / n) + '">' + sinal(total / n) + '</b></span>' +
        '<span><small>Com lucro</small><b>' + ganhou + ' de ' + n + '</b></span></div></div>';
      h += '<div class="grupo">' + l.map(function(t){
        var lu = lucro(t);
        var x = new Date(t.data);
        var nomes = t.entrou.map(function(i){ return i.n; }).join(', ') +
          (t.robux ? ' · ' + (t.robux > 0 ? '+' : '−') + fmt(t.robux) + ' R$' : '');
        var det = aberta === t.id ? '<div class="dia-det">' + lado(t.saiu, 'dou', 'Dei') + lado(t.entrou, 'rec', 'Recebi') +
          (t.robux ? '<div class="dia-rot"><span>Robux</span><span class="' + cor(t.robux) + '">' + (t.robux > 0 ? 'entraram ' : 'saíram ') + fmt(t.robux) + '</span></div>' : '') +
          '<button type="button" class="dia-apagar" data-apagar="' + t.id + '">' + (apagarArmado ? 'Toque de novo para apagar' : 'Apagar do diário') + '</button></div>' : '';
        return '<div class="dia-trade"><button type="button" class="dia-lin" data-abrir="' + t.id + '" aria-expanded="' + (aberta === t.id) + '">' +
          '<span class="dia-data"><b>' + x.getDate() + '</b>' + MESES[x.getMonth()] + '</span>' +
          '<span class="item-txt"><span class="dt-mini">' + mini(t.saiu) + '<span class="seta">→</span>' + mini(t.entrou) + '</span>' +
          '<span class="det">' + esc(nomes) + '</span></span>' +
          '<span class="l ' + cor(lu) + '">' + sinal(lu) + '</span></button>' + det + '</div>';
      }).join('') + '</div>';
    }
    h += '<p class="nota">' + (n || np
      ? 'Value de hoje do que entrou − value de hoje do que saiu + Robux. Toque numa trade para ver os itens. Se o que saiu e o que entrou aparecerem em consultas diferentes, o app junta os dois numa pergunta só (em até ${janelaH()}h). Duas trades entre consultas aparecem juntas; compra e venda também podem gerar pergunta.'
      : D.comecou
        ? 'O app compara os seus itens a cada consulta (painel e widget). Quando itens saírem e outros entrarem, ele pergunta no topo do Inventário se foi uma trade.'
        : 'A partir desta abertura o app passa a acompanhar os seus itens. Quando itens saírem e outros entrarem, ele pergunta no topo do Inventário se foi uma trade.') + '</p>';
    $('dia-secao').innerHTML = h;
  }
  function tudo(){
    desenharPerguntas();
    desenharSecao();
    if (window.thAoMudarDiario) { try { window.thAoMudarDiario(D.pendentes.length); } catch (e) {} }
  }

  function avisoOk(txt){
    var el = $('dia-ok');
    el.textContent = txt;
    el.classList.remove('oculto');
    clearTimeout(okTimer);
    okTimer = setTimeout(function(){ el.classList.add('oculto'); }, 4000);
  }

  function abrirTela(){
    aberta = null;
    desenharSecao();
    var t = $('tela-dia');
    t.classList.remove('oculto');
    t.scrollTop = 0;
    document.documentElement.classList.add('ti-aberta');
  }
  function fecharTela(){
    $('tela-dia').classList.add('oculto');
    var item = $('tela-item');
    if (!item || item.classList.contains('oculto')) document.documentElement.classList.remove('ti-aberta');
  }
  window.thAbrirDiario = abrirTela;
  window.thDiarioPendentes = function(){ return D.pendentes.length; };
  $('td-voltar').addEventListener('click', fecharTela);

  $('dia-pend').addEventListener('click', function(ev){
    var card = ev.target.closest('.dia-card');
    if (!card) return;
    var id = Number(card.getAttribute('data-id'));
    var b = ev.target.closest('button');
    if (!b) return;
    if (b.getAttribute('data-abrir-p')) {
      perguntaAberta[id] = !perguntaAberta[id];
      desenharPerguntas();
      return;
    }
    var modo = b.getAttribute('data-modo');
    if (modo) {
      rbx[id] = rbx[id] || { modo: 'rec', txt: '' };
      rbx[id].modo = modo;
      desenharPerguntas();
      return;
    }
    var acao = b.getAttribute('data-acao');
    if (!acao) return;
    var p = null, k;
    for (k = 0; k < D.pendentes.length; k++) if (D.pendentes[k].id === id) { p = D.pendentes[k]; break; }
    if (!p) return;
    D.pendentes.splice(k, 1);
    if (acao === 'sim') {
      var r = robuxDe(id);
      D.trades.unshift({ id: p.id, data: p.data, saiu: p.saiu, entrou: p.entrou, robux: r });
      ponte('acao=sim&id=' + id + '&r=' + r);
      avisoOk('Trade salva no Diário (menu ⋯).');
    } else {
      ponte('acao=nao&id=' + id);
    }
    delete rbx[id];
    delete perguntaAberta[id];
    tudo();
  });
  $('dia-pend').addEventListener('input', function(ev){
    var card = ev.target.closest('.dia-card');
    if (!card || ev.target.tagName !== 'INPUT') return;
    var id = Number(card.getAttribute('data-id'));
    var limpo = ev.target.value.replace(/\\D/g, '').slice(0, 9);
    if (limpo !== ev.target.value) ev.target.value = limpo;
    rbx[id] = rbx[id] || { modo: 'rec', txt: '' };
    rbx[id].txt = limpo;
    var p = null;
    for (var k = 0; k < D.pendentes.length; k++) if (D.pendentes[k].id === id) p = D.pendentes[k];
    if (!p) return;
    var dif = soma(p.entrou) - soma(p.saiu) + robuxDe(id);
    var el = card.querySelector('.dq-dif b');
    el.textContent = sinal(dif);
    el.className = cor(dif);
  });
  $('dia-secao').addEventListener('click', function(ev){
    var b = ev.target.closest('button');
    if (!b) return;
    if (b.id === 'dt-responder') {
      fecharTela();
      var bi = document.querySelector('#abas button[data-aba="inv"]');
      if (bi) bi.click();
      window.scrollTo(0, 0);
      return;
    }
    var ap = b.getAttribute('data-apagar');
    if (ap) {
      // Apagar pede um segundo toque (sem confirm(), que pode não existir no Scriptable).
      if (!apagarArmado) {
        apagarArmado = setTimeout(function(){ apagarArmado = null; desenharSecao(); }, 3000);
        desenharSecao();
        return;
      }
      clearTimeout(apagarArmado);
      apagarArmado = null;
      var id = Number(ap);
      D.trades = D.trades.filter(function(t){ return t.id !== id; });
      aberta = null;
      ponte('acao=apagar&id=' + id);
      tudo();
      return;
    }
    var ab = b.getAttribute('data-abrir');
    if (ab) {
      ab = Number(ab);
      aberta = aberta === ab ? null : ab;
      clearTimeout(apagarArmado);
      apagarArmado = null;
      desenharSecao();
    }
  });

  // Resposta da ponte: o estado gravado no arquivo (confirma o que a página fez).
  window.receberDiario = function(res){
    if (!res || res.erro) {
      var diag = $('diag-diario');
      if (diag) diag.textContent = 'Diário: ' + (res && res.erro ? res.erro : 'resposta vazia');
      return;
    }
    // Não apaga perguntas que a pessoa já respondeu nesta tela.
    D.trades = res.trades || D.trades;
    var ids = {};
    for (var k = 0; k < D.pendentes.length; k++) ids[D.pendentes[k].id] = 1;
    D.pendentes = (res.pendentes || []).filter(function(p){ return ids[p.id]; });
    D.comecou = res.comecou;
    tudo();
  };

  tudo();
})();
</script>`;
}

module.exports = {
  detectar, responder, apagar, paraPagina, idsDaPagina,
  topo, tela, css, script,
};
