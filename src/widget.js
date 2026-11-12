// Widget da tela inicial: value total, RAP total, variação e alertas.
// Ele só LÊ o retrato salvo pelo painel (não grava), para não "consumir" as mudanças.
const a = require('analise');

const CORES = {
  fundo: Color.dynamic(new Color('#ffffff'), new Color('#1c1c1e')),
  texto: Color.dynamic(new Color('#1c1c1e'), new Color('#f2f2f7')),
  sub: Color.dynamic(new Color('#6e6e73'), new Color('#98989d')),
  pos: Color.dynamic(new Color('#248a3d'), new Color('#30d158')),
  neg: Color.dynamic(new Color('#d70015'), new Color('#ff453a')),
  warn: Color.dynamic(new Color('#b25000'), new Color('#ff9f0a')),
};

function texto(pilha, conteudo, fonte, cor) {
  const t = pilha.addText(conteudo);
  t.font = fonte;
  t.textColor = cor;
  t.lineLimit = 1;
  t.minimumScaleFactor = 0.5;
  return t;
}

function bloco(pilha, rotulo, valor, variacao, tamanho) {
  texto(pilha, rotulo.toUpperCase(), Font.semiboldSystemFont(9), CORES.sub);
  const linha = pilha.addStack();
  linha.layoutHorizontally();
  linha.bottomAlignContent();
  texto(linha, valor, Font.semiboldSystemFont(tamanho), CORES.texto);
  if (variacao && variacao.pct != null) {
    const p = variacao.pct;
    linha.addSpacer(4);
    texto(linha, a.fmtPctSinal(p), Font.mediumSystemFont(10), p > 0 ? CORES.pos : p < 0 ? CORES.neg : CORES.sub);
  }
}

function montar(r, cfg) {
  const familia = config.widgetFamily || 'small';
  const w = new ListWidget();
  w.backgroundColor = CORES.fundo;
  w.setPadding(12, 14, 12, 14);
  w.refreshAfterDate = new Date(Date.now() + cfg.WIDGET_ATUALIZAR_MIN * 60000);

  texto(w, r.usuario.nome, Font.semiboldSystemFont(12), CORES.texto);
  w.addSpacer(6);

  const v = r.varTotais;
  if (familia === 'small') {
    bloco(w, 'Value', a.abreviar(r.totais.value), v && v.value, 20);
    w.addSpacer(4);
    bloco(w, 'RAP', a.abreviar(r.totais.rap), v && v.rap, 15);
  } else {
    const linha = w.addStack();
    linha.layoutHorizontally();
    const esq = linha.addStack();
    esq.layoutVertically();
    bloco(esq, 'Value', a.abreviar(r.totais.value), v && v.value, 20);
    esq.addSpacer(4);
    bloco(esq, 'RAP', a.abreviar(r.totais.rap), v && v.rap, 15);
    linha.addSpacer();
    const dir = linha.addStack();
    dir.layoutVertically();
    texto(dir, 'ALERTAS', Font.semiboldSystemFont(9), CORES.sub);
    const top = r.riscos.slice(0, 3);
    if (!top.length) texto(dir, 'Nenhum', Font.systemFont(12), CORES.sub);
    for (const x of top) texto(dir, x.item.sigla || x.item.nome, Font.systemFont(12), CORES.warn);
  }

  w.addSpacer();
  const n = r.riscos.length;
  const rodape = (n ? n + (n === 1 ? ' alerta · ' : ' alertas · ') : '') + a.fmtData(r.agora);
  texto(w, rodape, Font.systemFont(9), n ? CORES.warn : CORES.sub);
  return w;
}

module.exports = { montar };
