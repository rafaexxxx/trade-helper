// Widgets da tela inicial (grande, médio, pequeno) e da tela bloqueada.
// A variação mostrada é sempre a de ~24h. O widget não grava a "última consulta",
// só alimenta o histórico por hora.
// v7.3: pequeno ("valor em cada foto") e médio ("grade 2×2") novos, com 3 temas
// próprios (claro, oled, iphone) escolhidos no campo Parameter do widget.
// O grande e a tela bloqueada seguem como antes (sempre OLED).
const a = require('analise');
const cartaoMod = require('cartao');

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

// ---------- v7.3: temas do pequeno e do médio ----------
// claro = estilo Angel Core; oled = preto puro; iphone = cores padrão do iOS,
// claro ou escuro junto com o iPhone (Color.dynamic). No modo tingido do iOS
// quem pinta o widget é o próprio sistema.
const TW = {
  claro: { fundo: '#f6f7fc', grad: ['#dbe4fa', '#ecf0fb', '#f6f7fc'], ficha: '#ffffff', borda: '#d8dcec', fg: '#262b44', sub: '#6b7190', pos: '#1d8656', neg: '#c2365a', negFundo: '#fbe5ec', veu: ['#f6f7fc', 0.62], cadeado: '#6b7190' },
  oled: { fundo: '#000000', ficha: '#0e0e10', borda: '#2a2a2e', fg: '#f5f5f7', sub: '#8e8e93', pos: '#7ee0ae', neg: '#ff8fa3', negFundo: '#2a1218', veu: ['#000000', 0.6], cadeado: '#8e8e93' },
  iosClaro: { fundo: '#ffffff', ficha: '#f2f2f7', fg: '#000000', sub: '#8e8e93', pos: '#248a3d', neg: '#d70015', negFundo: '#ffe5e7' },
  iosEscuro: { fundo: '#1c1c1e', ficha: '#2c2c2e', fg: '#ffffff', sub: '#8e8e93', pos: '#30d158', neg: '#ff453a', negFundo: '#3a1a1a' },
};
const CHAVES_TW = ['fundo', 'ficha', 'fg', 'sub', 'pos', 'neg', 'negFundo'];

// Tema escolhido no campo Parameter do widget (segurar > Editar widget).
// Vazio ou desconhecido = iphone.
function temaWidget() {
  let p = '';
  try {
    if (typeof args !== 'undefined' && args && args.widgetParameter) p = String(args.widgetParameter);
  } catch (e) {
    p = '';
  }
  p = p.trim().toLowerCase();
  try {
    p = p.normalize('NFD').replace(/[̀-ͯ]/g, '');
  } catch (e) {
    // segue sem tirar acentos
  }
  if (p === 'claro' || p === 'angel' || p === 'light') return 'claro';
  if (p === 'oled' || p === 'preto' || p === 'black') return 'oled';
  // v7.4.1: modo transparente/vidro do iPhone. O iOS tira as cores e as fotos
  // viram quadrados brancos; aqui as fotos saem e entra o nome curto do item.
  // As cores seguem o "iphone" (o iOS repinta por cima de qualquer jeito).
  if (p === 'vidro' || p === 'transparente' || p === 'clear') {
    SEM_FOTOS = true;
    return 'iphone';
  }
  return 'iphone';
}
// v7.4.1: true no tema "vidro" (fotos trocadas pelo nome curto).
let SEM_FOTOS = false;

// Cores (objetos Color) do tema. O véu e o cadeado das fotos em hold são
// desenhados numa imagem, por isso não podem ser dinâmicos.
function coresTema(nome) {
  const k = { nome };
  if (nome === 'iphone') {
    const din = typeof Color.dynamic === 'function';
    for (const c of CHAVES_TW) {
      const l = new Color(TW.iosClaro[c]);
      const d = new Color(TW.iosEscuro[c]);
      k[c] = din ? Color.dynamic(l, d) : d;
    }
    k.borda = null;
    k.veu = new Color('#8e8e93', 0.5);
    k.cadeado = new Color('#8e8e93');
    return k;
  }
  const t = TW[nome];
  for (const c of CHAVES_TW) k[c] = new Color(t[c]);
  k.borda = t.borda ? new Color(t.borda) : null;
  k.grad = t.grad || null;
  k.veu = new Color(t.veu[0], t.veu[1]);
  k.cadeado = new Color(t.cadeado);
  return k;
}

function aplicarFundoTema(w, k) {
  if (k.grad && typeof LinearGradient !== 'undefined' && typeof Point !== 'undefined') {
    try {
      const g = new LinearGradient();
      g.colors = k.grad.map((h) => new Color(h));
      g.locations = [0, 0.4, 1];
      g.startPoint = new Point(0, 0);
      g.endPoint = new Point(0.25, 1);
      w.backgroundGradient = g;
      return;
    } catch (e) {
      // sem degradê: cor lisa
    }
  }
  w.backgroundColor = k.fundo;
}

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
  // v6.14.1: "sem value" saiu (o "—" no value já diz isso). Item sem demanda e
  // sem tendência no Rolimon's fica sem esta parte.
  const partes = [];
  if (i.demanda >= 0) partes.push(a.demandaCurta(i.demanda));
  if (i.tendencia >= 0) partes.push(a.tendenciaCurta(i.tendencia));
  const cor = i.demanda === 0 || i.tendencia === 0 ? CORES.warn : CORES.apagado;
  return { t: partes.join(' · '), cor };
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

// Linha do widget grande: [img] Nome / detalhes · RAP 24h ...... value / RAP (empilhados).
// Sem colunas de largura fixa: o nome usa toda a sobra.
function linhaItem(pilha, i, img, op) {
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
    if (d.t) texto(linhaDet, d.t, Font.systemFont(10), d.cor, 0.8);
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

  // v6.3: "Alertas" mostra só como o item é (projected, demanda, tendência,
  // RAP longe do value). Quedas de preço ficam só em "Mudanças".
  const alertas = r.riscos
    .map((x) => ({ item: x.item, motivos: x.motivos.filter((m) => !m.queda) }))
    .filter((x) => x.motivos.length);

  if (livres < 2) {
    const resumo = 'Alertas ' + alertas.length + ' · Mudanças ' + per + ' ' + (nMud == null ? '—' : nMud);
    texto(w, resumo, Font.systemFont(11), alertas.length ? CORES.warn : CORES.apagado);
  } else {
    const maxLinhas = Math.min(3, Math.floor(livres / 2) + 1);
    rotulo(w, 'Alertas ' + alertas.length);
    if (!alertas.length) texto(w, 'Nenhum alerta', Font.systemFont(11), CORES.apagado);
    for (const x of alertas.slice(0, maxLinhas)) {
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

// ---------- v7.3: peças comuns do pequeno e do médio ----------
const MAX_ITENS_NOVOS = 4;

// SF Symbol do iPhone pintado na cor pedida (sem o símbolo, segue sem ele).
function simbolo(pilha, nome, px, cor) {
  if (typeof SFSymbol === 'undefined') return null;
  try {
    const s = SFSymbol.named(nome);
    if (!s) return null;
    s.applyFont(Font.boldSystemFont(px));
    const im = pilha.addImage(s.image);
    const t = tam(px, px);
    if (t) im.imageSize = t;
    im.tintColor = cor;
    return im;
  } catch (e) {
    return null;
  }
}

// Selo vermelho com o número de alertas (todo risco conta, como na v6.3). Sem alerta, nada.
function seloAlerta(pilha, n, k) {
  if (!n) return;
  const s = pilha.addStack();
  s.layoutHorizontally();
  s.centerAlignContent();
  s.backgroundColor = k.negFundo;
  s.cornerRadius = 8;
  s.setPadding(2, 6, 2, 6);
  s.spacing = 3;
  simbolo(s, 'exclamationmark.triangle.fill', 9, k.neg);
  texto(s, String(n), Font.boldSystemFont(10), k.neg, 1);
}

// Foto do item em hold: apagada por um véu e com um cadeado no canto, tudo
// desenhado numa imagem só (pilhas não ficam umas por cima das outras).
function fotoApagada(img, k) {
  if (!img || typeof DrawContext === 'undefined' || typeof Rect === 'undefined' || typeof Size === 'undefined') return img;
  try {
    const S = 96;
    const ctx = new DrawContext();
    ctx.size = new Size(S, S);
    ctx.opaque = false;
    ctx.respectScreenScale = true;
    ctx.drawImageInRect(img, new Rect(0, 0, S, S));
    ctx.setFillColor(k.veu);
    ctx.fillRect(new Rect(0, 0, S, S));
    const b = 36;
    const x = S - b - 2;
    const y = S - b - 2;
    if (typeof Path !== 'undefined') {
      const p = new Path();
      p.addRoundedRect(new Rect(x, y, b, b), 10, 10);
      ctx.addPath(p);
      ctx.setFillColor(k.cadeado);
      ctx.fillPath();
    }
    if (typeof SFSymbol !== 'undefined') {
      const s = SFSymbol.named('lock.fill');
      if (s) {
        s.applyFont(Font.boldSystemFont(22));
        ctx.drawImageInRect(s.image, new Rect(x + 9, y + 7, b - 18, b - 14));
      }
    }
    return ctx.getImage();
  } catch (e) {
    return img;
  }
}

// Foto que o widget mostra (a do hold sai apagada). Feita uma vez por atualização.
function criarFotos(r, k) {
  const cache = {};
  return function (i) {
    if (SEM_FOTOS) return null;
    const id = String(i.assetId);
    if (!(id in cache)) {
      const img = r.imagens[id] || null;
      cache[id] = i.hold ? fotoApagada(img, k) : img;
    }
    return cache[id];
  };
}

function corVarK(p, k) {
  return p > 0 ? k.pos : p < 0 ? k.neg : k.sub;
}

// Variação de ~24h do valor do item (value base: value; sem value = RAP).
function varItem(i, base) {
  const p = base && base.itens ? base.itens[i.uaid] : null;
  if (!p || !p.valorEfetivo) return null;
  return ((i.valorEfetivo - p.valorEfetivo) / p.valorEfetivo) * 100;
}

function somaHold(r) {
  return r.itens.filter((i) => i.hold).reduce((s, i) => s + (i.valorEfetivo || 0), 0);
}

// Value total igual ao RAP total (ex.: nenhum item com value): mostra um número só.
function valueIgualRap(r) {
  return Math.round(r.totais.value) === Math.round(r.totais.rap);
}

// "▲ 0,9% em 24h"; com value diferente do RAP, "▲ 0,9% · RAP 5.465".
function linha24h(pilha, r, c, k, fonte) {
  const s = pilha.addStack();
  s.layoutHorizontally();
  s.centerAlignContent();
  s.spacing = 5;
  const igual = valueIgualRap(r);
  const v = c.var && c.var.value && c.var.value.pct != null ? c.var.value.pct : null;
  if (v != null) texto(s, textoVar(v) + (igual ? ' em ' + rotuloPeriodo(c, r.agora) : ''), Font.semiboldSystemFont(fonte), corVarK(v, k), 0.8);
  if (!igual) texto(s, 'RAP ' + a.abreviar(r.totais.rap), Font.mediumSystemFont(fonte), k.sub, 0.8);
  return s;
}

// Etiqueta pequena (motivo do alerta em vermelho ou HOLD em cinza).
function etiqueta(pilha, txt, fundo, cor) {
  const s = pilha.addStack();
  s.backgroundColor = fundo;
  s.cornerRadius = 4;
  s.setPadding(1, 4, 1, 4);
  texto(s, txt.toUpperCase(), Font.heavySystemFont(8), cor, 0.8);
}

// Alertas que não aparecem em outro lugar da ficha (v6.3: só os "pilula").
// A demanda já está na 2ª linha e as quedas já estão na variação.
function etiquetasAlerta(r) {
  const m = {};
  for (const x of r.riscos) {
    const p = x.motivos.filter((mo) => mo.pilula)[0];
    if (!p) continue;
    m[x.item.uaid] = p.texto === 'projected' ? 'projected' : p.texto.indexOf('RAP') === 0 ? 'RAP ≠ value' : p.texto;
  }
  return m;
}

// ---------- Médio (v7.3: grade 2×2 com os 4 maiores itens) ----------
function medio(w, r, k) {
  const c = r.comparacoes.dia;
  const linhas = r.linhasWidget || {};
  const foto = criarFotos(r, k);
  const tags = etiquetasAlerta(r);

  // Linha de cima: value total grande + 24h; à direita, hold, alertas e hora.
  const cab = w.addStack();
  cab.layoutHorizontally();
  cab.bottomAlignContent();
  texto(cab, a.fmtNum(r.totais.value), Font.heavySystemFont(30), k.fg, 0.6);
  cab.addSpacer(7);
  const v = cab.addStack();
  v.setPadding(0, 0, 4, 0);
  linha24h(v, r, c, k, 11);
  cab.addSpacer();
  const dir = cab.addStack();
  dir.layoutHorizontally();
  dir.centerAlignContent();
  dir.spacing = 6;
  dir.setPadding(0, 0, 4, 0);
  const h = somaHold(r);
  if (h > 0) {
    const sh = dir.addStack();
    sh.layoutHorizontally();
    sh.centerAlignContent();
    sh.spacing = 3;
    simbolo(sh, 'lock.fill', 9, k.sub);
    texto(sh, a.abreviar(h), Font.mediumSystemFont(10.5), k.sub, 0.8);
  }
  seloAlerta(dir, r.riscos.length, k);
  texto(dir, hora(r.agora), Font.semiboldSystemFont(11), k.sub, 0.8);

  w.addSpacer();
  const lista = r.itens.slice(0, MAX_ITENS_NOVOS);
  if (!lista.length) {
    texto(w, 'Nenhum item no inventário', Font.systemFont(12), k.sub);
    w.addSpacer();
    return;
  }
  for (let n = 0; n < lista.length; n += 2) {
    if (n) w.addSpacer(5);
    const fila = w.addStack();
    fila.layoutHorizontally();
    fila.spacing = 5;
    lista.slice(n, n + 2).forEach((i) => ficha(fila, i, { foto, tags, linhas, base: c.base, k }));
  }
}

// Ficha do médio: [foto] valor 24h ...... etiqueta
//                        Demanda · N/dia
//                        Best N
function ficha(pilha, i, o) {
  const k = o.k;
  const l = o.linhas[String(i.assetId)] || null;
  const f = pilha.addStack();
  f.layoutHorizontally();
  f.centerAlignContent();
  f.backgroundColor = k.ficha;
  if (k.borda) {
    f.borderColor = k.borda;
    f.borderWidth = 1;
  }
  f.cornerRadius = 10;
  f.setPadding(5, 7, 5, 7);
  const img = o.foto(i);
  if (img) {
    const wi = f.addImage(img);
    const t = tam(32, 32);
    if (t) wi.imageSize = t;
    wi.cornerRadius = 7;
    f.addSpacer(7);
  }
  const col = f.addStack();
  col.layoutVertically();
  col.spacing = 1;

  const l1 = col.addStack();
  l1.layoutHorizontally();
  l1.centerAlignContent();
  l1.spacing = 4;
  texto(l1, a.abreviar(i.valorEfetivo), Font.boldSystemFont(12.5), i.hold ? k.sub : k.fg, 0.8);
  const vi = varItem(i, o.base);
  if (vi != null) texto(l1, (vi > 0 ? '▲' : vi < 0 ? '▼' : '') + a.fmtPct(Math.abs(vi)), Font.semiboldSystemFont(9.5), i.hold ? k.sub : corVarK(vi, k), 0.8);
  l1.addSpacer();
  if (o.tags[i.uaid]) etiqueta(l1, o.tags[i.uaid], k.negFundo, k.neg);
  else if (i.hold) etiqueta(l1, 'hold', k.sub, k.ficha);

  // Demanda do Rolimon's; sem ela, a estimada pelas vendas/dia (como na tela do item).
  let dem = i.demanda >= 0 ? a.demandaCurta(i.demanda) : null;
  if (!dem && l && l.v != null) dem = a.demandaCurta(cartaoMod.demandaPorVendas(l.v));
  const l2 = [dem, l && l.tv].filter(Boolean).join(' · ');
  if (l2) texto(col, l2, Font.systemFont(9.5), k.sub, 0.85);
  if (l && l.tb) texto(col, 'Best ' + l.tb, Font.systemFont(9.5), k.sub, 0.85);
}

// ---------- Pequeno (v7.3: value grande e as 4 fotos com o valor de cada uma) ----------
function pequeno(w, r, k) {
  const c = r.comparacoes.dia;
  const foto = criarFotos(r, k);

  const topo = w.addStack();
  topo.layoutHorizontally();
  topo.centerAlignContent();
  texto(topo, hora(r.agora), Font.semiboldSystemFont(11), k.sub);
  topo.addSpacer();
  seloAlerta(topo, r.riscos.length, k);

  w.addSpacer();
  texto(w, a.abreviar(r.totais.value), Font.heavySystemFont(34), k.fg, 0.6);
  w.addSpacer(3);
  linha24h(w, r, c, k, 11);
  w.addSpacer();

  const fila = w.addStack();
  fila.layoutHorizontally();
  r.itens.slice(0, MAX_ITENS_NOVOS).forEach((i, n) => {
    if (n) fila.addSpacer();
    const s = fila.addStack();
    s.layoutVertically();
    s.centerAlignContent();
    const box = s.addStack();
    box.backgroundColor = k.ficha;
    box.cornerRadius = 8;
    box.setPadding(2, 2, 2, 2);
    const img = foto(i);
    if (img) {
      const wi = box.addImage(img);
      const t = tam(24, 24);
      if (t) wi.imageSize = t;
      wi.cornerRadius = 6;
    } else if (SEM_FOTOS) {
      // v7.4.1 (vidro): o nome curto no lugar da foto.
      texto(box, String(nomeCurto(i, 5)).slice(0, 6), Font.boldSystemFont(8.5), i.hold ? k.sub : k.fg, 0.6);
    } else {
      const t = tam(24, 24);
      if (t) box.size = t;
    }
    s.addSpacer(2);
    texto(s, a.abreviar(i.valorEfetivo), Font.boldSystemFont(9.5), i.hold ? k.sub : k.fg, 0.8);
  });
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
  // v7.3.1: o Scriptable novo tirou o "When Interacting" (o toque só abria o
  // app). O link roda o próprio script, como o toque na notificação.
  try {
    w.url = 'scriptable:///run/' + encodeURIComponent(Script.name());
  } catch (e) {
    // sem o link: o toque segue o padrão do Scriptable
  }

  if (familia.indexOf('accessory') === 0) {
    bloqueio(w, r, familia);
    return w;
  }

  if (familia === 'small' || familia === 'medium') {
    const k = coresTema(temaWidget());
    aplicarFundoTema(w, k);
    if (familia === 'small') {
      w.setPadding(13, 13, 13, 13);
      pequeno(w, r, k);
    } else {
      w.setPadding(10, 11, 10, 11);
      medio(w, r, k);
    }
  } else {
    aplicarFundo(w);
    w.setPadding(16, 16, 14, 16);
    grande(w, r, cfg);
  }
  return w;
}

module.exports = { montar };
