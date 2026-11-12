// Widgets da tela inicial (grande, médio, pequeno) e da tela bloqueada.
// A variação mostrada é sempre a de ~24h. O widget não grava a "última consulta",
// só alimenta o histórico por hora.
const a = require('analise');

const CORES = {
  fundo: Color.dynamic(new Color('#ffffff'), new Color('#1c1c1e')),
  texto: Color.dynamic(new Color('#1c1c1e'), new Color('#f2f2f7')),
  sub: Color.dynamic(new Color('#6e6e73'), new Color('#98989d')),
  linha: Color.dynamic(new Color('#e5e5ea'), new Color('#38383a')),
  pos: Color.dynamic(new Color('#248a3d'), new Color('#30d158')),
  neg: Color.dynamic(new Color('#d70015'), new Color('#ff453a')),
  warn: Color.dynamic(new Color('#b25000'), new Color('#ff9f0a')),
};

// Size pode não existir em algum contexto; sem ele, só pulamos os tamanhos fixos.
function tam(w, h) {
  return typeof Size !== 'undefined' ? new Size(w, h) : null;
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

function corVar(p) {
  return p > 0 ? CORES.pos : p < 0 ? CORES.neg : CORES.sub;
}

// Rótulo pequeno + valor grande + variação ao lado.
function bloco(pilha, rotulo, valor, v, tamanho) {
  const s = pilha.addStack();
  s.layoutVertically();
  texto(s, rotulo.toUpperCase(), Font.semiboldSystemFont(9), CORES.sub);
  const l = s.addStack();
  l.layoutHorizontally();
  l.bottomAlignContent();
  l.spacing = 4;
  texto(l, valor, Font.semiboldSystemFont(tamanho), CORES.texto);
  if (v && v.pct != null) texto(l, a.fmtPctSinal(v.pct), Font.mediumSystemFont(10), corVar(v.pct));
}

function divisoria(pilha) {
  const s = pilha.addStack();
  s.layoutHorizontally();
  s.addSpacer();
  s.backgroundColor = CORES.linha;
  const t = tam(0, 1);
  if (t) s.size = t;
}

// Célula de largura fixa com texto alinhado à direita (colunas de números).
function celula(pilha, conteudo, largura, fonte, cor) {
  const s = pilha.addStack();
  s.layoutHorizontally();
  const t = tam(largura, 0);
  if (t) s.size = t;
  s.addSpacer();
  texto(s, conteudo, fonte, cor, 0.7);
}

function detalhe(i) {
  if (i.projected) return { t: 'projected', cor: CORES.neg };
  if (i.value == null) return { t: 'sem value', cor: CORES.sub };
  const cor = i.demanda === 0 || i.tendencia === 0 ? CORES.warn : CORES.sub;
  return { t: a.demandaCurta(i.demanda) + ' · ' + a.tendenciaCurta(i.tendencia), cor };
}

function linhaItem(pilha, i, img, op) {
  const s = pilha.addStack();
  s.layoutHorizontally();
  s.centerAlignContent();
  s.spacing = 8;
  if (img) {
    const wi = s.addImage(img);
    const t = tam(op.img, op.img);
    if (t) wi.imageSize = t;
    wi.cornerRadius = 5;
  }
  const meio = s.addStack();
  meio.layoutVertically();
  texto(meio, i.nome, Font.mediumSystemFont(op.fonte), CORES.texto, 0.75);
  if (op.detalhe) {
    const d = detalhe(i);
    texto(meio, d.t, Font.systemFont(10), d.cor, 0.8);
  }
  s.addSpacer();
  celula(s, i.value != null ? a.fmtNum(i.value) : '—', op.largura, Font.semiboldSystemFont(op.fonte), CORES.texto);
  if (op.rap) celula(s, a.fmtNum(i.rap), op.largura, Font.systemFont(op.fonte), CORES.sub);
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
  texto(s, 'atualizado ' + hora(r.agora), Font.systemFont(10), CORES.sub);
}

// ---------- Grande ----------
function grande(w, r, cfg) {
  const c = r.comparacoes.dia;
  cabecalho(w, r, 15);
  w.addSpacer(8);

  const tot = w.addStack();
  tot.layoutHorizontally();
  bloco(tot, 'Value', a.fmtNum(r.totais.value), c.var && c.var.value, 19);
  tot.addSpacer();
  bloco(tot, 'RAP', a.fmtNum(r.totais.rap), c.var && c.var.rap, 19);
  tot.addSpacer();
  bloco(tot, 'Itens', String(r.totais.qtd), null, 19);

  w.addSpacer(8);
  divisoria(w);
  w.addSpacer(6);

  const cab = w.addStack();
  cab.layoutHorizontally();
  texto(cab, 'ITEM', Font.semiboldSystemFont(9), CORES.sub);
  cab.addSpacer();
  celula(cab, 'VALUE', 52, Font.semiboldSystemFont(9), CORES.sub);
  celula(cab, 'RAP', 52, Font.semiboldSystemFont(9), CORES.sub);
  w.addSpacer(5);

  const lista = r.itens.slice(0, cfg.WIDGET_MAX_ITENS_GRANDE);
  lista.forEach((i, k) => {
    if (k) w.addSpacer(6);
    linhaItem(w, i, r.imagens[String(i.assetId)], { img: 26, fonte: 12, detalhe: true, rap: true, largura: 52 });
  });
  if (r.itens.length > lista.length) {
    w.addSpacer(4);
    texto(w, '+ ' + (r.itens.length - lista.length) + ' itens no painel', Font.systemFont(10), CORES.sub);
  }

  w.addSpacer(8);
  divisoria(w);
  w.addSpacer(6);

  // Rodapé ocupa o espaço que sobra quando há poucos itens.
  const livres = Math.max(0, cfg.WIDGET_MAX_ITENS_GRANDE - lista.length);
  const per = rotuloPeriodo(c, r.agora);
  const nMud = c.mudancas ? c.mudancas.length : null;

  if (livres < 2) {
    const resumo =
      'Alertas ' + r.riscos.length + ' · Mudanças ' + per + ' ' + (nMud == null ? '—' : nMud);
    texto(w, resumo, Font.systemFont(11), r.riscos.length ? CORES.warn : CORES.sub);
  } else {
    const maxLinhas = Math.min(3, Math.floor(livres / 2) + 1);
    texto(w, 'ALERTAS ' + r.riscos.length, Font.semiboldSystemFont(9), CORES.sub);
    if (!r.riscos.length) texto(w, 'Nenhum item em risco', Font.systemFont(11), CORES.sub);
    for (const x of r.riscos.slice(0, maxLinhas)) {
      texto(w, x.item.nome + ': ' + x.motivos.map((m) => m.texto).join(', '), Font.systemFont(11), CORES.warn, 0.8);
    }
    w.addSpacer(6);
    texto(w, 'MUDANÇAS ' + per.toUpperCase() + (nMud == null ? '' : ' ' + nMud), Font.semiboldSystemFont(9), CORES.sub);
    if (nMud == null) texto(w, 'Histórico em formação', Font.systemFont(11), CORES.sub);
    else if (!nMud) texto(w, 'Nada relevante', Font.systemFont(11), CORES.sub);
    for (const m of (c.mudancas || []).slice(0, maxLinhas)) {
      const primeira = m.mudancas[0];
      const cor = primeira.dir === 'sobe' ? CORES.pos : primeira.dir === 'desce' ? CORES.neg : CORES.sub;
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

  const esq = linha.addStack();
  esq.layoutVertically();
  const te = tam(118, 0);
  if (te) esq.size = te;
  texto(esq, r.usuario.nome, Font.boldSystemFont(13), CORES.texto);
  texto(esq, 'atualizado ' + hora(r.agora), Font.systemFont(9), CORES.sub);
  esq.addSpacer(6);
  bloco(esq, 'Value', a.fmtNum(r.totais.value), c.var && c.var.value, 17);
  esq.addSpacer(4);
  bloco(esq, 'RAP', a.fmtNum(r.totais.rap), c.var && c.var.rap, 14);
  esq.addSpacer(4);
  const n = r.riscos.length;
  texto(esq, r.totais.qtd + ' itens · ' + n + (n === 1 ? ' alerta' : ' alertas'), Font.systemFont(10), n ? CORES.warn : CORES.sub);

  linha.addSpacer(10);
  const div = linha.addStack();
  div.layoutVertically();
  div.addSpacer();
  div.backgroundColor = CORES.linha;
  const td = tam(1, 0);
  if (td) div.size = td;
  linha.addSpacer(10);

  const dir = linha.addStack();
  dir.layoutVertically();
  texto(dir, 'MAIORES ITENS', Font.semiboldSystemFont(9), CORES.sub);
  dir.addSpacer(5);
  r.itens.slice(0, 3).forEach((i, k) => {
    if (k) dir.addSpacer(7);
    linhaItem(dir, i, r.imagens[String(i.assetId)], { img: 24, fonte: 11, detalhe: false, rap: false, largura: 46 });
  });
  dir.addSpacer();
}

// ---------- Pequeno ----------
function pequeno(w, r) {
  const c = r.comparacoes.dia;
  texto(w, r.usuario.nome, Font.boldSystemFont(12), CORES.texto);
  w.addSpacer(6);
  bloco(w, 'Value', a.abreviar(r.totais.value), c.var && c.var.value, 20);
  w.addSpacer(4);
  bloco(w, 'RAP', a.abreviar(r.totais.rap), c.var && c.var.rap, 15);
  w.addSpacer();
  const n = r.riscos.length;
  texto(w, (n ? n + (n === 1 ? ' alerta · ' : ' alertas · ') : '') + hora(r.agora), Font.systemFont(9), n ? CORES.warn : CORES.sub);
}

// ---------- Tela bloqueada ----------
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
  texto(w, r.totais.qtd + ' itens · ' + r.riscos.length + ' alertas · ' + hora(r.agora), Font.systemFont(11), Color.white());
}

function montar(r, cfg) {
  const familia = config.widgetFamily || 'large';
  const w = new ListWidget();
  w.refreshAfterDate = new Date(Date.now() + cfg.WIDGET_ATUALIZAR_MIN * 60000);

  if (familia.indexOf('accessory') === 0) {
    bloqueio(w, r, familia);
    return w;
  }

  w.backgroundColor = CORES.fundo;
  if (familia === 'small') {
    w.setPadding(12, 14, 12, 14);
    pequeno(w, r);
  } else if (familia === 'medium') {
    w.setPadding(14, 16, 14, 16);
    medio(w, r);
  } else {
    w.setPadding(16, 16, 14, 16);
    grande(w, r, cfg);
  }
  return w;
}

module.exports = { montar };
