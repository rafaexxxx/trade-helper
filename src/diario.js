// Diário de trades (v6.1): detecção automática + "lucro até hoje".
// Painel e widget comparam os itens da conta principal (uaids do Rolimon's)
// com a consulta anterior. Se algo saiu E algo entrou, nasce uma pergunta
// pendente ("Você fez esta trade?"); quem pergunta é o painel, no topo do
// Inventário. Só saiu ou só entrou (compra, venda, presente) não pergunta.
// Tudo fica no arquivo dados/diario.json, só neste iPhone.
//
// Formato do arquivo:
// { userId, seq,
//   ref: { data, itens: { uaid: assetId } },        // inventário da última consulta
//   sumidos: { uaid: data },                         // saíram sem nada entrar (48h)
//   pendentes: [{ id, data, origem, saiu: [it], entrou: [it] }],
//   trades:    [{ id, data, confirmadaEm, userId, saiu: [it], entrou: [it], robux }] }
// it = { u: uaid, a: assetId, n: nome, v: value base na hora (guardado, não aparece) }
// robux = o que caiu (+) ou saiu (−) da conta, como a pessoa digitou.

const ARQ = 'diario';
const MAX_PENDENTES = 10;
const MAX_TRADES = 500;
const MAX_ITENS_EVENTO = 40;
const SUMIDOS_HORAS = 48;
const MAX_ROBUX = 100000000;

function ler(store) {
  const d = store.ler(ARQ) || {};
  return {
    userId: d.userId || null,
    seq: Number(d.seq) || 0,
    ref: d.ref && d.ref.itens ? d.ref : null,
    sumidos: d.sumidos && typeof d.sumidos === 'object' ? d.sumidos : {},
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
    d.pendentes = [];
    gravar(store, d);
    return 'começou a acompanhar (' + Object.keys(atual).length + ' itens)';
  }

  // Esquece os "sumidos" antigos.
  const limite = agora - SUMIDOS_HORAS * 3600000;
  for (const u of Object.keys(d.sumidos)) if (!(d.sumidos[u] >= limite)) delete d.sumidos[u];

  const antes = d.ref.itens;
  const saiu = Object.keys(antes).filter((u) => !(u in atual));
  let entrou = Object.keys(atual).filter((u) => !(u in antes));

  // Item que tinha sumido (falha do Rolimon's) e voltou não conta como "entrou".
  const voltaram = entrou.filter((u) => u in d.sumidos);
  for (const u of voltaram) delete d.sumidos[u];
  entrou = entrou.filter((u) => voltaram.indexOf(u) < 0);

  // Pergunta cujos itens "saídos" voltaram ao inventário: era falha, some sozinha.
  const antesPend = d.pendentes.length;
  d.pendentes = d.pendentes.filter((p) => !p.saiu.some((x) => x.u in atual));
  const canceladas = antesPend - d.pendentes.length;

  let resumo;
  if (saiu.length && entrou.length) {
    d.seq += 1;
    d.pendentes.push({
      id: d.seq,
      data: agora,
      origem,
      saiu: saiu.slice(0, MAX_ITENS_EVENTO).map((u) => itemDoEvento(u, antes[u], porUaid, dados.rolimons)),
      entrou: entrou.slice(0, MAX_ITENS_EVENTO).map((u) => itemDoEvento(u, atual[u], porUaid, dados.rolimons)),
    });
    if (d.pendentes.length > MAX_PENDENTES) d.pendentes = d.pendentes.slice(-MAX_PENDENTES);
    resumo = 'nova pergunta: saíram ' + saiu.length + ', entraram ' + entrou.length;
  } else if (saiu.length) {
    for (const u of saiu) d.sumidos[u] = agora;
    resumo = 'só saíram ' + saiu.length + ' (sem pergunta)';
  } else if (entrou.length) {
    resumo = 'só entraram ' + entrou.length + ' (sem pergunta)';
  } else {
    resumo = 'sem mudança';
  }
  if (voltaram.length) resumo += ' · ' + voltaram.length + ' voltaram';
  if (canceladas) resumo += ' · ' + canceladas + ' pergunta(s) cancelada(s)';

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
      ? d.pendentes.map((p) => ({ id: p.id, data: p.data, origem: p.origem, saiu: p.saiu.map(hoje), entrou: p.entrou.map(hoje) }))
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

// Lugares no Inventário: as perguntas no topo; a seção no fim.
function topo() {
  return '<div id="dia-ok" class="dia-ok oculto" role="status"></div><div id="dia-pend" class="dia-pend"></div>';
}

function secao() {
  return '<div class="secao" id="dia-secao"></div>';
}

function css() {
  return `
.dia-pend{display:flex;flex-direction:column;gap:12px}
.dia-pend:empty{display:none}
.dia-ok{padding:10px 14px;border-radius:12px;background:var(--pos-bg);color:var(--pos);font-size:14px;font-weight:600}
.dia-card{border-radius:18px;background:var(--card);box-shadow:var(--sombra);border:1.5px solid var(--acc-t);overflow:hidden;-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}
.dia-cab{display:flex;flex-direction:column;gap:2px;padding:14px 16px 10px}
.dia-cab b{font-size:18px;font-weight:700}
.dia-cab span{font-size:13px;color:var(--sub)}
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
.dia-dif{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:10px 16px;border-top:1px solid var(--borda);font-size:14px;color:var(--sub)}
.dia-dif b{font-size:18px;white-space:nowrap}
.dia-bts{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:12px 16px 16px}
.dia-lucro{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}
.dia-lucro .rot{display:flex;flex-direction:column;gap:2px;min-width:0}
.dia-lucro .rot b{font-size:15px}
.dia-lucro .rot span{font-size:13px;color:var(--sub)}
.dia-lucro .num{font-size:28px;font-weight:700;letter-spacing:-.01em;white-space:nowrap}
.dia-trade{display:flex;flex-direction:column;gap:8px;padding:12px 16px}
.dia-trade+.dia-trade{border-top:1px solid var(--borda)}
.dia-lin{display:flex;align-items:center;gap:12px;width:100%;padding:0;border:0;background:none;text-align:left;-webkit-tap-highlight-color:transparent}
.dia-lin .nome{font-size:15px}
.dia-lin .l{font-size:17px;font-weight:700;white-space:nowrap}
.dia-data{flex:none;width:46px;text-align:center;font-size:12px;font-weight:700;line-height:1.15;color:var(--sub)}
.dia-data b{display:block;font-size:18px;color:var(--fg)}
.dia-det{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:12px;background:var(--card2);font-size:14px}
.dia-apagar{align-self:flex-start;padding:2px 0;border:0;background:none;color:var(--neg);font-size:14px;font-weight:600}
`;
}

// <script> do diário: desenha as perguntas e a seção, e fala com o Scriptable
// pela ponte (PONTE + 'diario?acao=sim|nao|apagar&id=..&r=..').
// A página atualiza na hora; a resposta da ponte (window.receberDiario) confirma.
function script(dadosJson, ponteJson, miniJson) {
  return `<script>
(function(){
  var PONTE = ${ponteJson};
  var D = ${dadosJson};
  var MINI = ${miniJson};
  var aberta = null, apagarArmado = null, okTimer = null;
  var rbx = {};
  function $(id){ return document.getElementById(id); }
  if (!$('dia-secao')) return;
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
  function cartao(p){
    var r = rbx[p.id] || (rbx[p.id] = { modo: 'rec', txt: '' });
    var dif = soma(p.entrou) - soma(p.saiu) + robuxDe(p.id);
    return '<div class="dia-card" data-id="' + p.id + '">' +
      '<div class="dia-cab"><b>Você fez esta trade?</b><span>' + esc(quando(p.data)) + (p.origem === 'widget' ? ' · visto pelo widget' : '') + '</span></div>' +
      lado(p.saiu, 'dou', 'Saíram') + lado(p.entrou, 'rec', 'Entraram') +
      '<div class="dia-rbx"><label for="dia-r-' + p.id + '">Robux <small>(opcional: o que caiu ou saiu da conta)</small></label>' +
        '<div class="dia-rbx-lin"><div class="seg peq"><button type="button" data-modo="rec" class="' + (r.modo === 'rec' ? 'on' : '') + '">Entraram</button>' +
        '<button type="button" data-modo="dei" class="' + (r.modo === 'dei' ? 'on' : '') + '">Saíram</button></div>' +
        '<input id="dia-r-' + p.id + '" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="0" value="' + esc(r.txt) + '"></div></div>' +
      '<div class="dia-dif"><span>Diferença com o value de hoje</span><b class="' + cor(dif) + '">' + sinal(dif) + '</b></div>' +
      '<div class="dia-bts"><button type="button" class="btn" data-acao="sim">Sim</button><button type="button" class="btn sec" data-acao="nao">Não foi trade</button></div>' +
    '</div>';
  }
  function desenharPerguntas(){
    $('dia-pend').innerHTML = D.pendentes.map(cartao).join('');
  }
  function desenharSecao(){
    var n = D.trades.length;
    var total = 0;
    for (var k = 0; k < n; k++) total += lucro(D.trades[k]);
    var h = '<h2>Diário de trades' + (D.pendentes.length ? ' <span class="cont warn">' + D.pendentes.length + (D.pendentes.length === 1 ? ' pergunta' : ' perguntas') + '</span>' : '') + '</h2>';
    h += '<div class="dia-lucro"><div class="rot"><b>Lucro até hoje</b><span>' +
      (n ? n + (n === 1 ? ' trade' : ' trades') + ' · value de hoje' : 'nenhuma trade ainda') + '</span></div>' +
      '<span class="num ' + (n ? cor(total) : 'sub') + '">' + (n ? sinal(total) : '—') + '</span></div>';
    if (n) {
      h += '<div class="grupo">' + D.trades.map(function(t){
        var l = lucro(t);
        var x = new Date(t.data);
        var resumo = 'Dei ' + t.saiu.length + ' · recebi ' + t.entrou.length +
          (t.robux ? ' · ' + (t.robux > 0 ? '+' : '−') + fmt(t.robux) + ' R$' : '');
        var det = aberta === t.id ? '<div class="dia-det">' +
          '<div><span class="sub">Dei:</span> ' + t.saiu.map(function(i){ return esc(i.n) + ' (' + fmt(i.v) + ')'; }).join(', ') + '</div>' +
          '<div><span class="sub">Recebi:</span> ' + t.entrou.map(function(i){ return esc(i.n) + ' (' + fmt(i.v) + ')'; }).join(', ') + '</div>' +
          (t.robux ? '<div><span class="sub">Robux:</span> ' + (t.robux > 0 ? 'entraram ' : 'saíram ') + fmt(t.robux) + '</div>' : '') +
          '<button type="button" class="dia-apagar" data-apagar="' + t.id + '">' + (apagarArmado ? 'Toque de novo para apagar' : 'Apagar do diário') + '</button></div>' : '';
        return '<div class="dia-trade"><button type="button" class="dia-lin" data-abrir="' + t.id + '">' +
          '<span class="dia-data"><b>' + x.getDate() + '</b>' + MESES[x.getMonth()] + '</span>' +
          '<span class="item-txt"><span class="nome">' + esc(t.entrou.map(function(i){ return i.n; }).join(', ')) + '</span><span class="det">' + resumo + '</span></span>' +
          '<span class="l ' + cor(l) + '">' + sinal(l) + '</span></button>' + det + '</div>';
      }).join('') + '</div>';
    }
    h += '<p class="nota">' + (n || D.pendentes.length
      ? 'Value de hoje do que entrou − value de hoje do que saiu + Robux. Duas trades entre consultas aparecem juntas; compra e venda também podem gerar pergunta.'
      : D.comecou
        ? 'O app compara os seus itens a cada consulta (painel e widget). Quando itens saírem e outros entrarem, ele pergunta aqui em cima se foi uma trade.'
        : 'A partir desta abertura o app passa a acompanhar os seus itens. Quando itens saírem e outros entrarem, ele pergunta se foi uma trade.') + '</p>';
    $('dia-secao').innerHTML = h;
  }
  function tudo(){ desenharPerguntas(); desenharSecao(); }

  function avisoOk(txt){
    var el = $('dia-ok');
    el.textContent = txt;
    el.classList.remove('oculto');
    clearTimeout(okTimer);
    okTimer = setTimeout(function(){ el.classList.add('oculto'); }, 4000);
  }

  $('dia-pend').addEventListener('click', function(ev){
    var card = ev.target.closest('.dia-card');
    if (!card) return;
    var id = Number(card.getAttribute('data-id'));
    var b = ev.target.closest('button');
    if (!b) return;
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
      avisoOk('Trade salva no diário.');
    } else {
      ponte('acao=nao&id=' + id);
    }
    delete rbx[id];
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
    var el = card.querySelector('.dia-dif b');
    el.textContent = sinal(dif);
    el.className = cor(dif);
  });
  $('dia-secao').addEventListener('click', function(ev){
    var b = ev.target.closest('button');
    if (!b) return;
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
      desenharSecao();
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
  topo, secao, css, script,
};
