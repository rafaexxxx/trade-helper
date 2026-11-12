// Widget da tela inicial: value total, RAP total, variação e nº de alertas.
// Ele só LÊ o retrato salvo pelo painel (não grava), para não "consumir" as mudanças.
const a = require('analise');

const CORES = {
  fundo: Color.dynamic(new Color('#ffffff'), new Color('#14181f')),
  texto: Color.dynamic(new Color('#14171a'), new Color('#e8ecf1')),
  sub: Color.dynamic(new Color('#5f6b76'), new Color('#8b96a3')),
  bom: Color.dynamic(new Color('#1a8a4a'), new Color('#3fb96f')),
  ruim: Color.dynamic(new Color('#c62828'), new Color('#ff6b6b')),
  alerta: Color.dynamic(new Color('#b26a00'), new Color('#f0b429')),
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
  texto(pilha, rotulo, Font.mediumSystemFont(10), CORES.sub);
  texto(pilha, valor, Font.boldRoundedSystemFont(tamanho), CORES.texto);
  if (variacao && variacao.pct != null) {
    const p = variacao.pct;
    const cor = p > 0 ? CORES.bom : p < 0 ? CORES.ruim : CORES.sub;
    const seta = p > 0 ? '▲ ' : p < 0 ? '▼ ' : '• ';
    texto(pilha, seta + a.fmtPctSinal(p), Font.semiboldSystemFont(10), cor);
  }
}

function montar(r, cfg) {
  const familia = config.widgetFamily || 'small';
  const w = new ListWidget();
  w.backgroundColor = CORES.fundo;
  w.setPadding(12, 14, 12, 14);
  w.refreshAfterDate = new Date(Date.now() + cfg.WIDGET_ATUALIZAR_MIN * 60000);

  texto(w, 'TRADE HELPER', Font.semiboldSystemFont(10), CORES.sub);
  w.addSpacer(6);

  const v = r.varTotais;
  if (familia === 'small') {
    bloco(w, 'Value', a.abreviar(r.totais.value), v && v.value, 22);
    w.addSpacer(4);
    bloco(w, 'RAP', a.abreviar(r.totais.rap), v && v.rap, 15);
  } else {
    const linha = w.addStack();
    linha.layoutHorizontally();
    const esq = linha.addStack();
    esq.layoutVertically();
    bloco(esq, 'Value', a.abreviar(r.totais.value), v && v.value, 22);
    esq.addSpacer(4);
    bloco(esq, 'RAP', a.abreviar(r.totais.rap), v && v.rap, 15);
    linha.addSpacer();
    const dir = linha.addStack();
    dir.layoutVertically();
    texto(dir, 'Alertas', Font.mediumSystemFont(10), CORES.sub);
    const top = r.riscos.slice(0, 3);
    if (!top.length) texto(dir, 'Nenhum ✅', Font.systemFont(12), CORES.bom);
    for (const x of top) texto(dir, '• ' + (x.item.sigla || x.item.nome), Font.systemFont(12), CORES.alerta);
  }

  w.addSpacer();
  const rodape = r.riscos.length ? '⚠️ ' + r.riscos.length + ' alerta(s) · ' : '';
  texto(w, rodape + a.fmtData(r.agora), Font.systemFont(9), r.riscos.length ? CORES.alerta : CORES.sub);
  return w;
}

module.exports = { montar };
