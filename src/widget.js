// Widgets da tela inicial (grande, médio, pequeno) e da tela bloqueada.
// A variação mostrada é sempre a de ~24h. O widget não grava a "última consulta",
// só alimenta o histórico por hora.
const a = require('analise');

// Paleta v5.4.1: sempre OLED (fundo preto puro, independe do tema do painel e do
// modo claro/escuro do iPhone). Os totais ficam num cartão quase preto com borda
// fina, igual ao cartão do value no tema OLED do painel.
const P = {
  fundo: '#000000',
  cartao: '#0e0e10',
  cartaoBorda: '#2a2a2e',
  linha: '#232327',
  rotulo: '#8e8e93',
  texto: '#f5f5f7',
  rap: '#9fb0ff',
  apagado: '#8e8e93',
  pos: '#7ee0ae',
  neg: '#ff8fa3',
  warn: '#f5c98a',
};

const CORES = {
  fundo: new Color(P.fundo),
  cartao: new Color(P.cartao),
  cartaoBorda: new Color(P.cartaoBorda),
  linha: new Color(P.linha),
  rotulo: new Color(P.rotulo),
  texto: new Color(P.texto),
  rap: new Color(P.rap),
  apagado: new Color(P.apagado),
  pos: new Color(P.pos),
  neg: new Color(P.neg),
  warn: new Color(P.warn),
  branco: new Color('#ffffff'),
  // Textos secundários dentro do cartão dos totais.
  brancoSuave: new Color('#ffffff', 0.78),
};

// Size pode não existir em algum contexto; sem ele, seguimos sem.
function tam(w, h) {
  return typeof Size !== 'undefined' ? new Size(w, h) : null;
}

// Fundo preto puro, sem degradê.
function aplicarFundo(w) {
  w.backgroundColor = CORES.fundo;
}

function hora(ms) {
  const d = new Date(ms);
  const z = (x) => String(x).padStart(2, '0');
  return z(d.getHours()) + ':' + z(d.getMinutes());
}

function texto(pilha, conteudo, fonte, cor, escala) {
  const t = pilha.addText(conteudo);
  t.font = fonte;
  t.textColor = cor;
  t.lineLimit = 1;
  t.minimumScaleFactor = escala || 0.6;
  return t;
}

function rotulo(pilha, conteudo, cor) {
  return texto(pilha, conteudo.toUpperCase(), Font.semiboldSystemFont(9), cor || CORES.rotulo);
}

function corVar(p) {
  return p > 0 ? CORES.pos : p < 0 ? CORES.neg : CORES.apagado;
}

// Variação com seta: "▲ 2,1%".
function textoVar(p) {
  return (p > 0 ? '▲ ' : p < 0 ? '▼ ' : '') + a.fmtPct(Math.abs(p));
}

// Rótulo pequeno + valor grande + variação ao lado.
function bloco(pilha, nome, valor, v, tamanho, corValor, corRotulo) {
  const s = pilha.addStack();
  s.layoutVertically();
  rotulo(s, nome, corRotulo);
  const l = s.addStack();
  l.layoutHorizontally();
  l.bottomAlignContent();
  l.spacing = 5;
  texto(l, valor, Font.boldSystemFont(tamanho), corValor || CORES.texto);
  if (v && v.pct != null) texto(l, textoVar(v.pct), Font.semiboldSystemFont(10), corVar(v.pct));
}

// Cartão dos totais: quase preto com borda fina (tema OLED).
function cartao(pilha, padding) {
  const c = pilha.addStack();
  c.layoutVertically();
  c.backgroundColor = CORES.cartao;
  c.borderColor = CORES.cartaoBorda;
  c.borderWidth = 1;
  c.cornerRadius = 14;
  c.setPadding(padding, padding, padding, padding);
  return c;
}

function divisoria(pilha) {
  const s = pilha.addStack();
  s.layoutHorizontally();
  s.addSpacer();
  s.backgroundColor = CORES.linha;
  const t = tam(0, 1);
  if (t) s.size = t;
}

// Texto alinhado à direita (numa linha própria dentro de uma pilha vertical).
function direita(pilha, conteudo, fonte, cor) {
  const s = pilha.addStack();
  s.layoutHorizontally();
  s.addSpacer();
  texto(s, conteudo, fonte, cor, 0.7);
}

function detalhe(i) {
  if (i.projected) return { t: 'projected', cor: CORES.neg };
  if (i.value == null) return { t: 'sem value', cor: CORES.apagado };
  const cor = i.demanda === 0 || i.tendencia === 0 ? CORES.warn : CORES.apagado;
  return { t: a.demandaCurta(i.demanda) + ' · ' + a.tendenciaCurta(i.tendencia), cor };
}

// Variação do RAP deste item em relação ao retrato base (~24h). null se não houver.
function varRap(i, base) {
  const p = base && base.itens ? base.itens[i.uaid] : null;
  if (!p || !p.rap) return null;
  return ((i.rap - p.rap) / p.rap) * 100;
}

// Nome longo vira a sigla do Rolimon's (quando existir).
function nomeCurto(i, limite) {
  return i.nome.length > limite && i.sigla ? i.sigla : i.nome;
}

// Linha do widget médio: [img] Nome ....... value
//                              RAP x  +y%
// O nome disputa espaço só com o value (sem coluna fixa), então usa toda a sobra.
function linhaItemEmpilhada(pilha, i, img, op) {
  const s = pilha.addStack();
  s.layoutHorizontally();
  s.centerAlignContent();
  if (img) {
    const wi = s.addImage(img);
    const t = tam(op.img, op.img);
    if (t) wi.imageSize = t;
    wi.cornerRadius = 7;
    s.addSpacer(8);
  }
  const dir = s.addStack();
  dir.layoutVertically();

  const l1 = dir.addStack();
  l1.layoutHorizontally();
  l1.centerAlignContent();
  const nome = op.limiteNome ? nomeCurto(i, op.limiteNome) : i.nome;
  texto(l1, nome, Font.mediumSystemFont(op.fonte), CORES.texto, 1);
  l1.addSpacer(6);
  l1.addSpacer();
  texto(l1, i.value != null ? a.fmtNum(i.value) : '—', Font.boldSystemFont(op.fonte), CORES.texto, 1);

  const vr = varRap(i, op.base);
  const l2 = dir.addStack();
  l2.layoutHorizontally();
  l2.spacing = 4;
  // v6.2.3: item em hold ganha a etiqueta amarela embaixo do nome.
  if (i.hold) texto(l2, 'HOLD', Font.boldSystemFont(9), CORES.warn, 0.8);
  l2.addSpacer();
  texto(l2, 'RAP ' + a.fmtNum(i.rap), Font.mediumSystemFont(9), CORES.rap, 0.8);
  if (vr != null) texto(l2, a.fmtPctSinal(vr), Font.semiboldSystemFont(9), corVar(vr), 0.8);
}

// Linha do widget grande: [img] Nome / detalhes · RAP 24h ...... value / RAP (empilhados).
// Sem colunas de largura fixa: o nome usa toda a sobra.
function linhaItem(pilha, i, img, op) {
  if (op.empilhado) return linhaItemEmpilhada(pilha, i, img, op);
  const s = pilha.addStack();
  s.layoutHorizontally();
  s.centerAlignContent();
  s.spacing = 8;
  if (img) {
    const wi = s.addImage(img);
    const t = tam(op.img, op.img);
    if (t) wi.imageSize = t;
    wi.cornerRadius = 7;
  }
  const vr = varRap(i, op.base);
  const meio = s.addStack();
  meio.layoutVertically();
  const nome = op.limiteNome ? nomeCurto(i, op.limiteNome) : i.nome;
  texto(meio, nome, Font.mediumSystemFont(op.fonte), CORES.texto, 0.75);
  if (op.detalhe) {
    // Detalhes + variação do RAP em 24h, colorida.
    const d = detalhe(i);
    const linhaDet = meio.addStack();
    linhaDet.layoutHorizontally();
    linhaDet.spacing = 4;
    // v6.2.3: item em hold ganha a etiqueta amarela antes dos detalhes.
    if (i.hold) texto(linhaDet, 'HOLD', Font.boldSystemFont(10), CORES.warn, 0.8);
    texto(linhaDet, d.t, Font.systemFont(10), d.cor, 0.8);
    if (vr != null) texto(linhaDet, 'RAP ' + a.fmtPctSinal(vr), Font.semiboldSystemFont(10), corVar(vr), 0.8);
  }
  s.addSpacer();
  const nums = s.addStack();
  nums.layoutVertically();
  direita(nums, i.value != null ? a.fmtNum(i.value) : '—', Font.boldSystemFont(op.fonte), CORES.texto);
  direita(nums, a.fmtNum(i.rap), Font.semiboldSystemFont(op.fonte - 1), CORES.rap);
}

function rotuloPeriodo(c, agora) {
  if (!c.base) return '24h';
  return agora - c.base.data >= 23 * 3600000 ? '24h' : 'desde ' + hora(c.base.data);
}

function cabecalho(pilha, r, tamanho) {
  const s = pilha.addStack();
  s.layoutHorizontally();
  s.bottomAlignContent();
  texto(s, r.usuario.nome, Font.boldSystemFont(tamanho), CORES.texto);
  s.addSpacer();
  texto(s, 'atualizado ' + hora(r.agora), Font.systemFont(10), CORES.apagado);
}

// v6.2.3: quantas cópias estão em hold (não podem ser trocadas agora).
function qtdHold(r) {
  return r.itens.filter((i) => i.hold).length;
}

// "12 itens · 3 hold · 1 alerta". O hold só aparece quando há algum.
function rodapeContagem(r) {
  const n = r.riscos.length;
  const h = qtdHold(r);
  return r.totais.qtd + ' itens · ' + (h ? h + ' hold · ' : '') + n + (n === 1 ? ' alerta' : ' alertas');
}

// ---------- Grande ----------
function grande(w, r, cfg) {
  const c = r.comparacoes.dia;
  cabecalho(w, r, 15);
  w.addSpacer(8);

  // Faixa (cartão OLED) com os totais.
  const tot = cartao(w, 10);
  const totLinha = tot.addStack();
  totLinha.layoutHorizontally();
  bloco(totLinha, 'Value', a.fmtNum(r.totais.value), c.var && c.var.value, 22, CORES.branco, CORES.brancoSuave);
  totLinha.addSpacer();
  bloco(totLinha, 'RAP', a.fmtNum(r.totais.rap), c.var && c.var.rap, 17, CORES.branco, CORES.brancoSuave);

  w.addSpacer(9);

  const cab = w.addStack();
  cab.layoutHorizontally();
  const h = qtdHold(r);
  rotulo(cab, 'Item · ' + r.totais.qtd + ' no total' + (h ? ' · ' + h + ' em hold' : ''));
  cab.addSpacer();
  rotulo(cab, 'Value / RAP');
  w.addSpacer(5);

  const lista = r.itens.slice(0, cfg.WIDGET_MAX_ITENS_GRANDE);
  lista.forEach((i, k) => {
    if (k) w.addSpacer(6);
    linhaItem(w, i, r.imagens[String(i.assetId)], { img: 26, fonte: 12, detalhe: true, base: c.base });
  });
  if (r.itens.length > lista.length) {
    w.addSpacer(4);
    texto(w, '+ ' + (r.itens.length - lista.length) + ' itens no painel', Font.systemFont(10), CORES.apagado);
  }

  w.addSpacer(8);
  divisoria(w);
  w.addSpacer(6);

  // Rodapé ocupa o espaço que sobra quando há poucos itens.
  const livres = Math.max(0, cfg.WIDGET_MAX_ITENS_GRANDE - lista.length);
  const per = rotuloPeriodo(c, r.agora);
  const nMud = c.mudancas ? c.mudancas.length : null;

  if (livres < 2) {
    const resumo = 'Alertas ' + r.riscos.length + ' · Mudanças ' + per + ' ' + (nMud == null ? '—' : nMud);
    texto(w, resumo, Font.systemFont(11), r.riscos.length ? CORES.warn : CORES.apagado);
  } else {
    const maxLinhas = Math.min(3, Math.floor(livres / 2) + 1);
    rotulo(w, 'Alertas ' + r.riscos.length);
    if (!r.riscos.length) texto(w, 'Nenhum item em risco', Font.systemFont(11), CORES.apagado);
    for (const x of r.riscos.slice(0, maxLinhas)) {
      texto(w, x.item.nome + ': ' + x.motivos.map((m) => m.texto).join(', '), Font.systemFont(11), CORES.warn, 0.8);
    }
    w.addSpacer(6);
    rotulo(w, 'Mudanças ' + per + (nMud == null ? '' : ' ' + nMud));
    if (nMud == null) texto(w, 'Histórico em formação', Font.systemFont(11), CORES.apagado);
    else if (!nMud) texto(w, 'Nada relevante', Font.systemFont(11), CORES.apagado);
    for (const m of (c.mudancas || []).slice(0, maxLinhas)) {
      const primeira = m.mudancas[0];
      const cor = primeira.dir === 'sobe' ? CORES.pos : primeira.dir === 'desce' ? CORES.neg : CORES.apagado;
      texto(w, m.item.nome + ': ' + primeira.texto, Font.systemFont(11), cor, 0.8);
    }
  }
  w.addSpacer();
}

// ---------- Médio (retangular) ----------
function medio(w, r) {
  const c = r.comparacoes.dia;
  const linha = w.addStack();
  linha.layoutHorizontally();

  // Cartão OLED com os totais.
  const esq = cartao(linha, 11);
  const te = tam(136, 0);
  if (te) esq.size = te;
  const topo = esq.addStack();
  topo.layoutHorizontally();
  topo.bottomAlignContent();
  texto(topo, r.usuario.nome, Font.boldSystemFont(12), CORES.branco);
  topo.addSpacer();
  texto(topo, hora(r.agora), Font.systemFont(9), CORES.brancoSuave);
  esq.addSpacer(6);
  bloco(esq, 'Value', a.fmtNum(r.totais.value), c.var && c.var.value, 21, CORES.branco, CORES.brancoSuave);
  esq.addSpacer(4);
  bloco(esq, 'RAP', a.fmtNum(r.totais.rap), c.var && c.var.rap, 15, CORES.branco, CORES.brancoSuave);
  esq.addSpacer(5);
  texto(esq, rodapeContagem(r), Font.systemFont(10), r.riscos.length ? CORES.warn : CORES.brancoSuave);

  linha.addSpacer(12);

  const dir = linha.addStack();
  dir.layoutVertically();
  rotulo(dir, 'Maiores itens · RAP ' + rotuloPeriodo(c, r.agora));
  dir.addSpacer(6);
  r.itens.slice(0, 3).forEach((i, k) => {
    if (k) {
      dir.addSpacer(5);
      divisoria(dir);
      dir.addSpacer(5);
    }
    linhaItem(dir, i, r.imagens[String(i.assetId)], {
      img: 24, fonte: 11, empilhado: true, base: c.base, limiteNome: 12,
    });
  });
  dir.addSpacer();
}

// ---------- Pequeno (o widget inteiro é o bloco dos totais, no preto) ----------
function pequeno(w, r) {
  const c = r.comparacoes.dia;
  const topo = w.addStack();
  topo.layoutHorizontally();
  topo.bottomAlignContent();
  texto(topo, r.usuario.nome, Font.boldSystemFont(12), CORES.branco);
  topo.addSpacer();
  texto(topo, hora(r.agora), Font.systemFont(9), CORES.brancoSuave);
  w.addSpacer(10);
  bloco(w, 'Value', a.abreviar(r.totais.value), c.var && c.var.value, 26, CORES.branco, CORES.brancoSuave);
  w.addSpacer(6);
  bloco(w, 'RAP', a.abreviar(r.totais.rap), c.var && c.var.rap, 17, CORES.branco, CORES.brancoSuave);
  w.addSpacer();
  texto(w, rodapeContagem(r), Font.systemFont(10), r.riscos.length ? CORES.warn : CORES.brancoSuave);
}

// ---------- Tela bloqueada (o iOS deixa monocromático) ----------
function bloqueio(w, r, familia) {
  const c = r.comparacoes.dia;
  const pv = c.var && c.var.value && c.var.value.pct != null ? ' ' + a.fmtPctSinal(c.var.value.pct) : '';
  const pr = c.var && c.var.rap && c.var.rap.pct != null ? ' ' + a.fmtPctSinal(c.var.rap.pct) : '';
  if (familia === 'accessoryInline') {
    texto(w, 'Value ' + a.abreviar(r.totais.value) + pv, Font.systemFont(12), Color.white());
    return;
  }
  if (familia === 'accessoryCircular') {
    texto(w, a.abreviar(r.totais.value), Font.semiboldSystemFont(14), Color.white());
    return;
  }
  texto(w, 'Value ' + a.fmtNum(r.totais.value) + pv, Font.semiboldSystemFont(14), Color.white());
  texto(w, 'RAP ' + a.fmtNum(r.totais.rap) + pr, Font.systemFont(12), Color.white());
  texto(w, rodapeContagem(r) + ' · ' + hora(r.agora), Font.systemFont(11), Color.white());
}

function montar(r, cfg) {
  const familia = config.widgetFamily || 'large';
  const w = new ListWidget();
  w.refreshAfterDate = new Date(Date.now() + cfg.WIDGET_ATUALIZAR_MIN * 60000);

  if (familia.indexOf('accessory') === 0) {
    bloqueio(w, r, familia);
    return w;
  }

  if (familia === 'small') {
    aplicarFundo(w);
    w.setPadding(14, 14, 14, 14);
    pequeno(w, r);
  } else if (familia === 'medium') {
    aplicarFundo(w);
    w.setPadding(12, 12, 12, 14);
    medio(w, r);
  } else {
    aplicarFundo(w);
    w.setPadding(16, 16, 14, 16);
    grande(w, r, cfg);
  }
  return w;
}

module.exports = { montar };
