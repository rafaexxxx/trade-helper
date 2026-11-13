// Widgets da tela inicial (grande, médio, pequeno) e da tela bloqueada.
// A variação mostrada é sempre a de ~24h. O widget não grava a "última consulta",
// só alimenta o histórico por hora.
const a = require('analise');

// Paleta roxa "tom sobre tom" (fixa, independe do modo claro/escuro do iPhone).
const P = {
  fundoTopo: '#2a1d3d',
  fundoBase: '#1a1226',
  cartao: '#33254a',
  linha: '#43335e',
  rotulo: '#b9a3e3',
  texto: '#efe7ff',
  secundario: '#c7b5ea',
  apagado: '#8f80a8',
  pos: '#8fe0b8',
  neg: '#ff9db0',
  warn: '#f5c98a',
};

const CORES = {
  cartao: new Color(P.cartao),
  linha: new Color(P.linha),
  rotulo: new Color(P.rotulo),
  texto: new Color(P.texto),
  secundario: new Color(P.secundario),
  apagado: new Color(P.apagado),
  pos: new Color(P.pos),
  neg: new Color(P.neg),
  warn: new Color(P.warn),
};

// Size/LinearGradient podem não existir em algum contexto; sem eles, seguimos sem.
function tam(w, h) {
  return typeof Size !== 'undefined' ? new Size(w, h) : null;
}

function aplicarFundo(w) {
  w.backgroundColor = new Color(P.fundoBase);
  if (typeof LinearGradient !== 'undefined') {
    const g = new LinearGradient();
    g.colors = [new Color(P.fundoTopo), new Color(P.fundoBase)];
    g.locations = [0, 1];
    w.backgroundGradient = g;
  }
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

function rotulo(pilha, conteudo) {
  return texto(pilha, conteudo.toUpperCase(), Font.semiboldSystemFont(9), CORES.rotulo);
}

function corVar(p) {
  return p > 0 ? CORES.pos : p < 0 ? CORES.neg : CORES.apagado;
}

// Rótulo pequeno + valor grande + variação ao lado.
function bloco(pilha, nome, valor, v, tamanho, corValor) {
  const s = pilha.addStack();
  s.layoutVertically();
  rotulo(s, nome);
  const l = s.addStack();
  l.layoutHorizontally();
  l.bottomAlignContent();
  l.spacing = 4;
  texto(l, valor, Font.semiboldSystemFont(tamanho), corValor || CORES.texto);
  if (v && v.pct != null) texto(l, a.fmtPctSinal(v.pct), Font.mediumSystemFont(10), corVar(v.pct));
}

function cartao(pilha, padding) {
  const c = pilha.addStack();
  c.layoutVertically();
  c.backgroundColor = CORES.cartao;
  c.cornerRadius = 12;
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

function linhaItem(pilha, i, img, op) {
  const s = pilha.addStack();
  s.layoutHorizontally();
  s.centerAlignContent();
  s.spacing = 8;
  if (img) {
    const wi = s.addImage(img);
    const t = tam(op.img, op.img);
    if (t) wi.imageSize = t;
    wi.cornerRadius = 6;
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
    texto(linhaDet, d.t, Font.systemFont(10), d.cor, 0.8);
    if (vr != null) texto(linhaDet, 'RAP ' + a.fmtPctSinal(vr), Font.mediumSystemFont(10), corVar(vr), 0.8);
  }
  s.addSpacer();
  const valor = i.value != null ? a.fmtNum(i.value) : '—';
  if (op.empilhado) {
    // Value em cima (destaque) e "RAP x  +y%" embaixo, alinhados à direita.
    const col = s.addStack();
    col.layoutVertically();
    const t = tam(op.largura, 0);
    if (t) col.size = t;
    celula(col, valor, op.largura, Font.semiboldSystemFont(op.fonte), CORES.texto);
    const l2 = col.addStack();
    l2.layoutHorizontally();
    l2.spacing = 4;
    l2.addSpacer();
    texto(l2, 'RAP ' + a.fmtNum(i.rap), Font.systemFont(9), CORES.secundario, 0.8);
    if (vr != null) texto(l2, a.fmtPctSinal(vr), Font.mediumSystemFont(9), corVar(vr), 0.8);
    return;
  }
  celula(s, valor, op.largura, Font.semiboldSystemFont(op.fonte), CORES.texto);
  if (op.rap) celula(s, a.fmtNum(i.rap), op.largura, Font.systemFont(op.fonte), CORES.secundario);
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

// ---------- Grande ----------
function grande(w, r, cfg) {
  const c = r.comparacoes.dia;
  cabecalho(w, r, 15);
  w.addSpacer(8);

  const tot = w.addStack();
  tot.layoutHorizontally();
  bloco(tot, 'Value', a.fmtNum(r.totais.value), c.var && c.var.value, 19);
  tot.addSpacer();
  bloco(tot, 'RAP', a.fmtNum(r.totais.rap), c.var && c.var.rap, 19, CORES.secundario);
  tot.addSpacer();
  bloco(tot, 'Itens', String(r.totais.qtd), null, 19, CORES.secundario);

  w.addSpacer(8);
  divisoria(w);
  w.addSpacer(6);

  const cab = w.addStack();
  cab.layoutHorizontally();
  rotulo(cab, 'Item');
  cab.addSpacer();
  celula(cab, 'VALUE', 52, Font.semiboldSystemFont(9), CORES.rotulo);
  celula(cab, 'RAP', 52, Font.semiboldSystemFont(9), CORES.rotulo);
  w.addSpacer(5);

  const lista = r.itens.slice(0, cfg.WIDGET_MAX_ITENS_GRANDE);
  lista.forEach((i, k) => {
    if (k) w.addSpacer(6);
    linhaItem(w, i, r.imagens[String(i.assetId)], { img: 26, fonte: 12, detalhe: true, rap: true, largura: 52, base: c.base });
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

  // Cartão com os totais, um tom acima do fundo.
  const esq = cartao(linha, 10);
  const te = tam(132, 0);
  if (te) esq.size = te;
  const topo = esq.addStack();
  topo.layoutHorizontally();
  topo.bottomAlignContent();
  texto(topo, r.usuario.nome, Font.boldSystemFont(12), CORES.texto);
  topo.addSpacer();
  texto(topo, hora(r.agora), Font.systemFont(9), CORES.apagado);
  esq.addSpacer(6);
  bloco(esq, 'Value', a.fmtNum(r.totais.value), c.var && c.var.value, 17);
  esq.addSpacer(4);
  bloco(esq, 'RAP', a.fmtNum(r.totais.rap), c.var && c.var.rap, 14, CORES.secundario);
  esq.addSpacer(5);
  const n = r.riscos.length;
  texto(esq, r.totais.qtd + ' itens · ' + n + (n === 1 ? ' alerta' : ' alertas'), Font.systemFont(10), n ? CORES.warn : CORES.apagado);

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
      img: 24, fonte: 11, detalhe: false, empilhado: true, largura: 92, base: c.base, limiteNome: 12,
    });
  });
  dir.addSpacer();
}

// ---------- Pequeno ----------
function pequeno(w, r) {
  const c = r.comparacoes.dia;
  const topo = w.addStack();
  topo.layoutHorizontally();
  texto(topo, r.usuario.nome, Font.boldSystemFont(12), CORES.texto);
  topo.addSpacer();
  texto(topo, hora(r.agora), Font.systemFont(9), CORES.apagado);
  w.addSpacer(6);
  const card = cartao(w, 8);
  bloco(card, 'Value', a.abreviar(r.totais.value), c.var && c.var.value, 20);
  card.addSpacer(4);
  bloco(card, 'RAP', a.abreviar(r.totais.rap), c.var && c.var.rap, 14, CORES.secundario);
  w.addSpacer();
  const n = r.riscos.length;
  texto(w, r.totais.qtd + ' itens · ' + n + (n === 1 ? ' alerta' : ' alertas'), Font.systemFont(9), n ? CORES.warn : CORES.apagado);
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

  aplicarFundo(w);
  if (familia === 'small') {
    w.setPadding(12, 12, 12, 12);
    pequeno(w, r);
  } else if (familia === 'medium') {
    w.setPadding(12, 12, 12, 14);
    medio(w, r);
  } else {
    w.setPadding(16, 16, 14, 16);
    grande(w, r, cfg);
  }
  return w;
}

module.exports = { montar };
