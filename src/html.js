// Página do painel (v4): visual profissional, tema claro/escuro seguindo o iPhone.
// Três abas: Inventário, Avaliar trade (módulo avaliador) e Anúncios (módulo anuncios).
// v5.1: no Inventário a lista vem logo depois de uma faixa compacta de totais;
// alertas e mudanças aparecem na linha de cada item (etiqueta e setas) e no menu do item.
// v5.2: alternador de conta no topo (a conta 2 troca Inventário e Anúncios, em vinho)
// e menu ⋯ (trocar/remover a conta 2; Temas e Ajuda entram aqui depois).
// v5.3: temas no menu ⋯ (Clássicos e Estéticos). v5.3.1: 13 temas, escolha
// gravada no arquivo de ajustes do Scriptable pela ponte (PONTE + 'tema?t=').
// v5.4: tela de Ajuda (módulo ajuda) no menu ⋯ e links "Ver na Ajuda" nas abas.
// v6.1: diário de trades (módulo diario) no Inventário da conta principal:
// perguntas "Você fez esta trade?" no topo e a seção com o lucro no fim.
// v6.4: tudo de tema foi para o módulo temas (13 temas + 6 Temáticos).
// v6.13 (Etapa 5): o diário saiu do fim do Inventário e virou uma tela própria
// (menu ⋯ > Diário de trades, só na conta principal); a pergunta segue no topo,
// compacta. As vendas/dia que chegam pela fila também vão para os Anúncios.
const a = require('analise');
const temas = require('temas');
const avaliador = require('avaliador');
const anuncios = require('anuncios');
const ajuda = require('ajuda');
const diario = require('diario');
const cartao = require('cartao');

function esc(s) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => mapa[c]);
}

function corDemanda(d) {
  if (d === 0) return 'neg';
  if (d === 1) return 'warn';
  if (d >= 3) return 'pos';
  return '';
}

function corTendencia(t) {
  if (t === 0) return 'neg';
  if (t === 3) return 'pos';
  if (t === 1 || t === 4) return 'warn';
  return '';
}

const COR_GRAVIDADE = { alta: 'neg', media: 'warn', baixa: 'sub' };
const PESO_GRAVIDADE = { alta: 3, media: 2, baixa: 1 };
const COR_DIRECAO = { sobe: 'pos', desce: 'neg', neutro: 'sub' };

function maiuscula(s) {
  s = String(s || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pct(antes, depois) {
  return antes ? ((depois - antes) / antes) * 100 : null;
}

// Período real da comparação (a base é o retrato mais perto de 24h atrás):
// "em 24h" quase sempre; "em 6h" no começo do histórico; "desde 13/11 14:05"
// quando o painel ficou dias sem ser aberto.
function periodoReal(base, agora) {
  if (!base) return null;
  const h = (agora - base.data) / 3600000;
  if (h >= 20 && h <= 30) return { curto: 'em 24h', longo: 'Em 24 horas' };
  if (h < 20) {
    const n = Math.max(1, Math.round(h));
    return { curto: 'em ' + n + 'h', longo: 'Em ' + n + (n === 1 ? ' hora' : ' horas') };
  }
  const q = quando(base.data, agora);
  return { curto: 'desde ' + q, longo: 'Desde ' + q };
}

// Alertas de encontrarRiscos por uaid, do mais grave para o mais leve.
// As quedas de value/RAP ganham o período ("value caiu 6,3% em 24h").
function alertasPorUaid(riscos, per) {
  const m = {};
  for (const r of riscos) {
    m[r.item.uaid] = r.motivos
      .map((x) => Object.assign({}, x, { texto: x.texto + (x.queda && per ? ' ' + per.curto : '') }))
      .sort((x, y) => PESO_GRAVIDADE[y.grav] - PESO_GRAVIDADE[x.grav]);
  }
  return m;
}

// v6.3: pílula só para o alerta que não aparece em outro lugar da linha
// (Projected e RAP longe do value). Queda fica na seta; demanda e tendência,
// na linha de baixo. Todos continuam no menu do item e no filtro "Com alerta".
function etiqueta(motivos) {
  const p = (motivos || []).filter((x) => x.pilula);
  if (!p.length) return '';
  return '<span class="tags">' + p
    .map((x) => '<span class="tag ' + COR_GRAVIDADE[x.grav] + '">' + esc(maiuscula(x.texto)) + '</span>')
    .join('') + '</span>';
}

// Variação % do value e do RAP do item contra o retrato base (24h).
function variacaoItem(i, base) {
  const p = base && base.itens ? base.itens[i.uaid] : null;
  if (!p) return null;
  return { v: pct(p.valorEfetivo, i.valorEfetivo), r: pct(p.rap, i.rap) };
}

// Seta pequena ao lado do número ("▲ 6,2%"), só a partir do limite de mudança.
function seta(p, lim) {
  if (p == null || Math.abs(p) < lim) return '';
  return '<small class="seta ' + (p > 0 ? 'pos' : 'neg') + '">' + (p > 0 ? '▲ ' : '▼ ') + a.fmtPct(Math.abs(p)) + '</small>';
}

// Linha pequena embaixo do nome: demanda · tendência · vendas/dia · detalhes.
// "projected" não entra aqui: ele sempre vira a etiqueta vermelha da linha.
// v6.11: devolve as partes de antes e de depois das vendas/dia (que chegam
// depois, pela fila, num lugar fixo: o .ln-v).
function detalhes(i) {
  const antes = [];
  const depois = [];
  if (i.demanda >= 0) antes.push('<span class="' + corDemanda(i.demanda) + '">' + esc(a.demandaCurta(i.demanda)) + '</span>');
  if (i.tendencia >= 0) antes.push('<span class="' + corTendencia(i.tendencia) + '">' + esc(a.tendenciaCurta(i.tendencia)) + '</span>');
  if (i.serial) depois.push('#' + esc(i.serial));
  if (i.hyped) depois.push('hyped');
  if (i.rare) depois.push('rare');
  if (i.hold) depois.push('<span class="warn">hold</span>');
  // v6.14.1: "sem value" saiu. O "—" no lugar do value já diz isso.
  if (i.semRolimons) depois.push("fora do Rolimon's");
  return { antes, depois };
}

// v6.11: o pedaço das vendas/dia com os " · " certos em volta (a = tem algo
// antes, d = tem algo depois). A página usa a mesma regra (textoVendas).
function slotVendas(a1, d1, ln) {
  if (!ln || !ln.tv) return a1 && d1 ? ' · ' : '';
  return (a1 ? ' · ' : '') + '<span class="' + esc(ln.c) + '">' + esc(ln.tv) + '</span>' + (d1 ? ' · ' : '');
}

// Uma linha da lista. "motivos" são os alertas do item; "vari" a variação em 24h;
// "ln" (v6.11) as vendas/dia e o Best Price guardados (cartao.linha) ou null.
function linhaItem(i, miniatura, motivos, vari, lim, ln) {
  const det = detalhes(i);
  const a1 = det.antes.length > 0;
  const d1 = det.depois.length > 0;
  const temVendas = !!(ln && ln.tv);
  const texto = det.antes.join(' · ') +
    '<span class="ln-v" data-a="' + (a1 ? 1 : 0) + '" data-d="' + (d1 ? 1 : 0) + '">' + slotVendas(a1, d1, ln) + '</span>' +
    det.depois.join(' · ');
  const tag = etiqueta(motivos);
  const temTexto = a1 || d1 || temVendas;
  const img = miniatura
    ? '<img class="thumb" src="' + esc(miniatura) + '" alt="">'
    : '<span class="thumb"></span>';
  const setaV = i.value != null ? seta(vari && vari.v, lim) : '';
  const setaR = seta(vari && vari.r, lim);
  const temBest = !!(ln && ln.tb);
  return (
    '<div class="item" data-uaid="' + esc(i.uaid) + '" data-asset="' + esc(i.assetId) + '" data-titulo="' + esc(i.nome) +
    '" data-nome="' + esc((i.nome + ' ' + i.sigla).toLowerCase()) +
    '" data-value="' + i.valorEfetivo + '" data-rap="' + i.rap +
    '" data-dem="' + i.demanda + '" data-tend="' + i.tendencia +
    '" data-vendas="' + (ln && ln.v != null ? ln.v : -1) +
    '" data-alerta="' + (motivos && motivos.length ? '1' : '0') + '">' +
    img +
    '<div class="item-txt"><span class="nome">' + esc(i.nome) + '</span>' +
    '<span class="det' + (tag || temTexto ? '' : ' oculto') + '">' + tag +
    '<span class="det-t' + (temTexto ? '' : ' oculto') + '">' + texto + '</span></span></div>' +
    '<div class="item-num"><span class="v">' + (i.value != null ? setaV + a.fmtNum(i.value) : '<span class="sub">—</span>') + '</span>' +
    '<span class="r">' + setaR + '<small>RAP</small>' + a.fmtNum(i.rap) + '</span>' +
    '<span class="b' + (temBest ? '' : ' oculto') + '"><small>Best</small><span class="b-n">' + (temBest ? esc(ln.tb) : '') + '</span></span></div>' +
    '</div>'
  );
}

// Texto de uma mudança no menu: "Value subiu 6,8% (25.749 → 27.500)".
function textoMudanca(y) {
  if (y.campo === 'value' || y.campo === 'rap') {
    return (y.campo === 'value' ? 'Value ' : 'RAP ') + (y.pct > 0 ? 'subiu ' : 'caiu ') + a.fmtPct(Math.abs(y.pct)) +
      ' (' + a.fmtNum(y.antes) + ' → ' + a.fmtNum(y.depois) + ')';
  }
  return y.texto;
}

// Dados do menu de cada item: a = alertas [texto, cor]; m = mudanças em 24h [texto, cor].
function dadosDoMenu(alertas, c) {
  const m = {};
  const pegar = (uaid) => (m[uaid] = m[uaid] || { a: [], m: [] });
  for (const uaid of Object.keys(alertas)) {
    // v6.3: queda de preço fica só em "Mudanças" (com antes → depois).
    pegar(uaid).a = alertas[uaid].filter((x) => !x.queda).map((x) => [maiuscula(x.texto), COR_GRAVIDADE[x.grav]]);
  }
  for (const x of c.mudancas || []) {
    pegar(x.item.uaid).m = x.mudancas.map((y) => [textoMudanca(y), COR_DIRECAO[y.dir]]);
  }
  return m;
}

// Hora curta ("13:35"); com a data na frente quando não for o mesmo dia.
function quando(ms, agora) {
  const x = new Date(ms);
  const y = new Date(agora);
  const mesmoDia = x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  return mesmoDia ? a.fmtData(ms).slice(6) : a.fmtData(ms);
}

// Variação de um total na faixa: "▲ 2,1% em 24h".
function varTotal(v, per) {
  if (!per || !v || v.pct == null) return '<span class="f-var vazio">—</span>';
  const s = v.pct > 0 ? '▲ ' : v.pct < 0 ? '▼ ' : '';
  return '<span class="f-var">' + s + a.fmtPct(Math.abs(v.pct)) + ' ' + esc(per.curto) + '</span>';
}

// Paleta v4 (aprovada no protótipo L), agora em temas. Os nomes antigos (--cab,
// --linha, --link, --rotulo) ficam como apelidos para nada sem cor escapar.
const CSS_BASE = `
${temas.css()}
*{box-sizing:border-box}
html{background:var(--bg);-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;color:var(--fg);font:16px/1.4 var(--f-ui);font-variant-numeric:tabular-nums;
  background:var(--body-fundo);
  padding:max(14px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 40px max(16px,env(safe-area-inset-left))}
button{font:inherit;color:inherit}
.app{display:flex;flex-direction:column;gap:22px}
.aba{display:flex;flex-direction:column;gap:22px}
.oculto{display:none!important}
.pos{color:var(--pos)}.neg{color:var(--neg)}.warn{color:var(--warn)}.sub{color:var(--sub)}.acc{color:var(--acc-t)}

.topo{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
h1{margin:0;font-family:var(--f-titulo);font-style:var(--t-estilo);font-size:var(--t-tam);font-weight:var(--t-peso);line-height:1.1;letter-spacing:-.02em;text-shadow:var(--t-sombra)}
.user{color:var(--sub);font-size:15px}
.meta{margin:4px 0 0;color:var(--sub);font-size:13px}
.aviso{margin:0;color:var(--warn);font-size:14px}

.seg{display:flex;padding:3px;border-radius:12px;background:var(--card2)}
.seg button{flex:1;padding:9px 4px;border:0;border-radius:9px;background:none;color:var(--sub);font-size:15px;font-weight:600}
.seg button.on{background:var(--card);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.seg.abas button{font-size:14px}
.seg.abas button.on{background:var(--acc-fundo);color:var(--on-acc);box-shadow:none}
.seg.peq button,.seg.mini button{font-size:14px;padding:7px 4px}

.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{padding:7px 13px;border:1px solid var(--borda);border-radius:999px;background:var(--card);color:var(--fg);font-size:14px;font-weight:500;-webkit-user-select:none;user-select:none}
.chip.on{color:var(--on-acc);background:var(--acc-fundo);border-color:var(--acc)}
.chip.filtro{border-style:dashed}
.chip.filtro.on{border-style:solid;background:var(--neg-bg);border-color:var(--neg);color:var(--neg)}
.btn{padding:11px 16px;border-radius:12px;border:0;background:var(--acc-fundo);color:var(--on-acc);font-size:15px;font-weight:600}
.btn.sec{background:var(--card);color:var(--acc-t);border:1px solid var(--borda)}
.btn:active,.chip:active{background:var(--acc-press);color:var(--on-acc)}
.btn:disabled{opacity:.45}

.faixa{padding:14px 16px 12px;border-radius:18px;background:var(--heroi);color:var(--on-heroi);border:1px solid var(--heroi-borda);box-shadow:var(--sombra);display:flex;flex-direction:column;gap:12px}
.f-tot{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.f-col{display:flex;flex-direction:column;gap:3px;min-width:0}
.f-rot{font-size:12px;font-weight:600;opacity:.8;text-transform:uppercase;letter-spacing:.06em}
.f-num{font-size:24px;font-weight:700;line-height:1.1;letter-spacing:-.01em}
.f-var{font-size:13px;font-weight:600;opacity:.92}
.f-var.vazio{font-weight:500;opacity:.7}
.f-pe{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--heroi-linha)}
.f-dir{display:flex;align-items:center;gap:8px}
.f-info{font-size:13px;opacity:.85}
.f-alerta{flex:none;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.16);color:var(--heroi-aviso);font-size:11px;font-weight:700;line-height:18px;text-align:center}
.f-aviso{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.12);font-size:13px;line-height:1.35}
.f-aviso p{margin:0}
.ferramentas{display:flex;flex-direction:column;gap:10px}

.secao{display:flex;flex-direction:column;gap:10px}
.secao>h2,details.bloco>summary{display:flex;align-items:center;gap:8px;margin:0;font-family:var(--f-titulo);font-style:var(--t-estilo);font-size:20px;font-weight:var(--t-peso);line-height:1.2;letter-spacing:-.01em}
.cont{min-width:24px;padding:3px 8px;border-radius:999px;font-size:13px;font-weight:600;line-height:1.2;text-align:center;background:var(--card2);color:var(--sub)}
.cont:empty{display:none}
.cont.neg{background:var(--neg-bg);color:var(--neg)}
.cont.warn{background:var(--warn-bg);color:var(--warn)}
.cont.pos{background:var(--pos-bg);color:var(--pos)}

.grupo{margin:0;padding:0;list-style:none;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.grupo>li+li{border-top:1px solid var(--borda)}
.grupo li{display:flex;gap:12px;align-items:flex-start;padding:13px 16px;font-size:15px}
.grupo li.sub{display:block}
.grupo b{font-weight:600}
.txt{min-width:0}
.marca{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;background:var(--card2);color:var(--sub)}
.marca.neg{background:var(--neg-bg);color:var(--neg)}
.marca.warn{background:var(--warn-bg);color:var(--warn)}
.marca.pos{background:var(--pos-bg);color:var(--pos)}
.vazio{margin:0;padding:14px 16px;border-radius:16px;background:var(--card);color:var(--sub);font-size:15px}
.nota{margin:0;font-size:13px;color:var(--sub)}

input[type=search]{width:100%;font:inherit;padding:12px 14px;border:1px solid var(--borda);border-radius:12px;background:var(--card);color:var(--fg);-webkit-appearance:none}
input[type=search]::placeholder{color:var(--sub)}

.item{display:flex;align-items:center;gap:12px;padding:12px 16px;-webkit-tap-highlight-color:transparent}
.item:active{background:var(--card2)}
.inv-lista .item+.item{border-top:1px solid var(--borda)}
.thumb{flex:none;width:46px;height:46px;border-radius:12px;background:var(--card2);object-fit:cover;display:block}
.item-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.nome{font-size:16px;font-weight:600;line-height:1.25;overflow-wrap:anywhere}
.det{font-size:13px;color:var(--sub);display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
.tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;line-height:1.35;white-space:nowrap}
.tag.neg{background:var(--neg-bg);color:var(--neg)}
.tag.warn{background:var(--warn-bg);color:var(--warn)}
.tag.sub{background:var(--card2);color:var(--sub)}
.det .tag{white-space:normal;max-width:100%;border-radius:10px}
.det .tags{display:flex;flex-wrap:wrap;gap:4px;max-width:100%}
.item-num small.seta{font-weight:700}
.item-num small.seta.pos{color:var(--pos)}
.item-num small.seta.neg{color:var(--neg)}
.item-num{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;white-space:nowrap}
.item-num .v{font-size:18px;font-weight:700;line-height:1}
.item-num .r{font-size:16px;font-weight:600;line-height:1;color:var(--rap)}
.item-num .b{font-size:14px;font-weight:600;line-height:1;color:var(--fg)}
.item-num small{margin-right:5px;font-size:13px;font-weight:500;color:var(--sub)}
.item-num .v small.tag{margin:0 0 0 5px}
.total{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;border-top:1px solid var(--borda);background:var(--card2);font-weight:700}
.total .item-num .v{font-size:20px}
.total .item-num .r{font-size:17px}

details.bloco>summary{list-style:none;padding:2px 0;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
details.bloco>summary::-webkit-details-marker{display:none}
details.bloco>summary::after{content:"\\203A";margin-left:auto;font-size:26px;font-weight:400;line-height:1;color:var(--sub);transition:transform .15s}
details.bloco[open]>summary::after{transform:rotate(90deg)}
details.bloco>.dentro{margin-top:10px;display:flex;flex-direction:column;gap:10px}

details.diag{font-size:13px;color:var(--sub)}
details.diag p{margin:8px 0 0}
textarea{width:100%;height:240px;margin-top:8px;font:12px/1.4 ui-monospace,Menlo,monospace;background:var(--card);color:var(--fg);border:1px solid var(--borda);border-radius:12px;padding:10px}
footer{color:var(--sub);font-size:13px;text-align:center}

.fundo{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4)}
.folha{position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));background:var(--folha);border:1px solid var(--card-borda);border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.25)}
.folha p{margin:0;padding:14px 16px;text-align:center;font-size:14px;color:var(--sub);border-bottom:1px solid var(--borda)}
.folha a,.folha button{display:block;width:100%;padding:16px;text-align:center;font:inherit;font-size:17px;font-weight:500;color:var(--acc-t);text-decoration:none;background:none;border:0;border-bottom:1px solid var(--borda)}
.folha .cancelar{font-weight:700;border-bottom:0}
.folha{max-height:85vh;overflow-y:auto}
.folha-bloco{padding:12px 16px;border-bottom:1px solid var(--borda);display:flex;flex-direction:column;gap:8px;text-align:left}
.folha-bloco h3{margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--sub)}
.motivo{display:flex;gap:10px;align-items:center;font-size:15px}

/* v5.2: topo com o menu ⋯, alternador de conta e a cor da conta 2 (vinho).
   A conta 2 só troca os tokens de destaque: todo o resto segue igual. */
.cab{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.mais{flex:none;width:38px;height:38px;padding:0;border:1px solid var(--card-borda);border-radius:50%;background:var(--card);box-shadow:var(--sombra);color:var(--sub);font-size:20px;font-weight:700;line-height:1;-webkit-tap-highlight-color:transparent}
.mais:active{background:var(--card2)}
.cab .meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.chip-conta{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:3px 10px 3px 3px;border:1px solid var(--borda);border-radius:999px;background:var(--card);color:var(--fg);font-size:13px;font-weight:600;-webkit-tap-highlight-color:transparent}
.chip-conta:active{background:var(--card2)}
.chip-conta .n{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chip-conta .av{width:20px;height:20px;font-size:10px}
.chip-conta .tr{color:var(--sub);font-size:12px}
.faixa-conta .voltar{margin-left:auto;padding:0;border:0;background:none;color:var(--c2-t);font-size:13px;font-weight:700;text-decoration:underline}
.av{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--on-acc);background:var(--acc-fundo)}
.av.c2{color:var(--c2-on);background:var(--c2-fundo)}
.faixa-conta{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;background:var(--c2-bg);color:var(--c2-t);font-size:13px;font-weight:600}
.c2-estado{display:flex;flex-direction:column;gap:10px}
.c2-estado .acoes{display:flex;gap:8px;flex-wrap:wrap}
.esq{height:56px;border-radius:14px;background:var(--card)}
.esq.alto{height:118px;border-radius:18px;background:var(--heroi);opacity:.35}
/* v5.3: as cores da conta 2 vêm do tema (--c2, --c2-fundo, --c2-t, --c2-bg, --c2-heroi...). */
body.c2ativa{--acc:var(--c2);--acc-fundo:var(--c2-fundo);--acc-press:var(--c2-press);--on-acc:var(--c2-on);--acc-t:var(--c2-t);--rap:var(--c2-t);--heroi:var(--c2-heroi);--heroi-borda:var(--c2-heroi-borda);--on-heroi:var(--c2-on-heroi);--dou-bg:var(--c2-bg)}
.folha .op{display:block;width:100%;padding:16px;text-align:center;font:inherit;font-size:17px;font-weight:500;color:var(--acc-t);background:none;border:0;border-bottom:1px solid var(--borda)}
.folha .op.perigo{color:var(--neg)}
.folha .op:disabled{color:var(--sub)}
.folha .op small{font-size:13px;font-weight:500}
.c2-form{display:flex;flex-direction:column;gap:12px;padding:18px 16px 16px;top:max(12px,env(safe-area-inset-top));bottom:auto}
.c2-form h3{margin:0;font-size:19px;font-weight:700}
.c2-form label{font-size:14px;color:var(--sub)}
.c2-form input{width:100%;font:inherit;padding:12px 14px;border:1px solid var(--borda);border-radius:12px;background:var(--bg);color:var(--fg);-webkit-appearance:none}
.c2-form .acoes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.c2-form .erro{margin:0;padding:0;border:0;text-align:left;color:var(--neg);font-size:14px}
.c2-form .acoes .btn{display:block;width:100%;padding:12px 8px;border:0;border-radius:12px;background:var(--acc-fundo);color:var(--on-acc);font-size:16px;font-weight:600;text-align:center}
.c2-form .acoes .btn.sec{background:var(--card2);color:var(--acc-t)}
.c2-form .acoes .btn:disabled{opacity:.45}
#diag-conta2{white-space:pre-wrap;overflow-wrap:anywhere}
`;

// Bloco do Inventário de uma conta (faixa de totais, busca, chips e lista).
// v5.2: o mesmo bloco serve para a conta 2, montado no Scriptable e enviado
// pela ponte. Sem ids: o script da página liga cada bloco pelas classes.
// r = { itens, totais, riscos, comparacoes: { dia }, miniaturas, linhas, avisos, agora }.
// v6.11: linhas = { assetId: cartao.linha } (vendas/dia e Best guardados).
function inventario(r, cfg) {
  const t = r.totais;
  // v5.1: o Inventário compara sempre com 24h atrás (sem seletor de período).
  const d = r.comparacoes.dia;
  const per = periodoReal(d.base, r.agora);

  // Avisos gerais (cache, fonte que não respondeu...): "!" discreto na faixa; o toque mostra o texto.
  const temAvisos = r.avisos.length > 0;
  const avisos = r.avisos.map((x) => '<p>' + esc(x) + '</p>').join('');
  const emHold = r.itens.filter((i) => i.hold).length;
  const pe = t.qtd + (t.qtd === 1 ? ' item' : ' itens') + (emHold ? ' · ' + emHold + ' em hold' : '');

  const lim = cfg.LIMITE_MUDANCA_PCT;
  const alertas = alertasPorUaid(r.riscos, per);
  const comAlerta = Object.keys(alertas).length;
  const lns = r.linhas || {};
  const linhas = r.itens
    .map((i) => linhaItem(i, r.miniaturas[String(i.assetId)], alertas[i.uaid], variacaoItem(i, d.base), lim, lns[String(i.assetId)] || null))
    .join('');

  const html = `<div class="faixa">
  <div class="f-tot">
    <div class="f-col"><span class="f-rot">Value</span><span class="f-num">${a.fmtNum(t.value)}</span>${varTotal(d.var && d.var.value, per)}</div>
    <div class="f-col"><span class="f-rot">RAP</span><span class="f-num">${a.fmtNum(t.rap)}</span>${varTotal(d.var && d.var.rap, per)}</div>
  </div>
  <div class="f-pe">
    <span class="f-info">${per ? 'Variação ' + esc(per.curto) : 'Histórico de 24h em formação'}</span>
    <span class="f-dir"><span class="f-info">${pe}</span>${temAvisos ? '<button class="f-alerta" aria-expanded="false" aria-label="Ver avisos">!</button>' : ''}</span>
  </div>
  ${temAvisos ? '<div class="f-aviso oculto">' + avisos + '</div>' : ''}
</div>

<div class="ferramentas">
  <input class="inv-busca" type="search" placeholder="Buscar item" autocomplete="off" aria-label="Buscar item">
  <div class="chips inv-ordem">
    <button class="chip on" data-campo="value">Value</button>
    <button class="chip" data-campo="rap">RAP</button>
    <button class="chip" data-campo="dem">Demanda</button>
    <button class="chip" data-campo="tend">Tendência</button>
    <button class="chip" data-campo="vendas">Vendas</button>
    <button class="chip" data-campo="nome">Nome</button>
    ${comAlerta ? '<button class="chip filtro inv-so-alerta">Com alerta · ' + comAlerta + '</button>' : ''}
  </div>
</div>

<div class="grupo">
  <div class="inv-lista">${linhas}</div>
  <p class="vazio oculto inv-vazio">${r.itens.length ? 'Nada encontrado.' : 'Nenhum item.'}</p>
</div>
${ajuda.link('aj-armadilhas', 'O que significam as etiquetas?')}`;
  return { html, menu: dadosDoMenu(alertas, d), titulo: per ? per.longo : 'Mudanças' };
}

// Linha embaixo do título. v5.2.1: com conta 2, um chip pequeno com a conta
// ATUAL e ⇄ (um toque troca) + a hora; sem conta 2, só "Atualizado HH:MM".
// A conta 2 é adicionada pelo menu ⋯.
function linhaMeta(principal, c2, hora) {
  const ini = esc(String(principal || '?').charAt(0).toUpperCase());
  return (
    '<p class="meta">' +
    '<button type="button" class="chip-conta' + (c2 ? '' : ' oculto') + '" id="conta-chip" aria-label="Trocar de conta">' +
    '<span class="av" id="chip-ini">' + ini + '</span><span class="n" id="chip-nome">' + esc(principal) + '</span><span class="tr">⇄</span></button>' +
    '<span id="meta-hora" data-hora="' + esc(hora) + '">' + (c2 ? '· ' : 'Atualizado ') + esc(hora) + '</span></p>'
  );
}

function gerar(r, cfg) {
  const hora = quando(r.agora, r.agora);
  const av = r.avaliador || { erro: 'dados não preparados' };
  const inv = inventario(r, cfg);
  const menu = inv.menu;
  const tituloMud = inv.titulo;
  const dia = r.diario && r.diario.dados ? r.diario : null;

  return `<!doctype html>
<html lang="pt-BR"${r.tema ? ' data-tema="' + esc(r.tema) + '"' : ''}><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Inventário</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<script>
// v5.3: aplica o tema salvo antes do primeiro desenho (sem piscar o tema errado).
// v5.3.1: o tema vem do arquivo de ajustes (TH_TEMA_ARQ); ao escolher, a página
// avisa o Scriptable pela ponte, que grava no arquivo. O localStorage fica só de reserva.
var TH_TEMAS = ${avaliador.serializar(temas.mapaTemas())};
var TH_PONTE_TEMA = ${avaliador.serializar(avaliador.PONTE + 'tema?t=')};
var TH_TEMA_ARQ = ${avaliador.serializar(r.tema || null)};
function thTema(id, salvar) {
  var t = TH_TEMAS[id];
  if (!t) return;
  document.documentElement.setAttribute('data-tema', id);
  var m = document.querySelector('meta[name="color-scheme"]');
  if (m) m.setAttribute('content', t.e);
  if (t.f && !document.getElementById('fonte-' + id)) {
    var l = document.createElement('link');
    l.id = 'fonte-' + id;
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + t.f + '&display=swap';
    document.head.appendChild(l);
  }
  if (salvar) {
    try { localStorage.setItem('tema', id); } catch (e) {}
    try {
      var f = document.createElement('iframe');
      f.style.display = 'none';
      f.src = TH_PONTE_TEMA + encodeURIComponent(id) + '&x=' + Date.now();
      document.body.appendChild(f);
      setTimeout(function(){ if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    } catch (e) {}
  }
}
try {
  var temaSalvo = TH_TEMA_ARQ;
  if (!temaSalvo) temaSalvo = localStorage.getItem('tema');
  if (temaSalvo) thTema(temaSalvo);
} catch (e) { if (TH_TEMA_ARQ) thTema(TH_TEMA_ARQ); }
</script>
<style>
${CSS_BASE}
${avaliador.css()}
${anuncios.css()}
${ajuda.css()}
${diario.css()}
${cartao.css()}
</style></head><body>
${temas.ceu()}
<div class="app">

<div class="cab">
  <div><h1 id="titulo">Inventário</h1>${linhaMeta(r.usuario.nome, r.conta2, hora)}</div>
  <button type="button" class="mais" id="mais" aria-label="Mais opções">⋯</button>
</div>

<nav class="seg abas" id="abas">
  <button data-aba="inv" class="on">Inventário</button>
  <button data-aba="avaliar">Avaliar</button>
  <button data-aba="anuncios">Anúncios</button>
  <button data-aba="plano">Plano</button>
</nav>

<div class="faixa-conta oculto" id="faixa-conta"><span class="av c2" id="fc-ini"></span><span id="fc-txt"></span><button type="button" class="voltar" id="fc-voltar">Voltar</button></div>
<div class="c2-estado oculto" id="c2-estado"></div>

<div id="aba-inv" class="aba">
<div class="inv aba" id="inv-1">
${dia ? diario.topo() : ''}
${inv.html}
</div>
<div class="inv aba oculto" id="inv-2"></div>
</div>

${avaliador.secao(cfg, av.base, av.erro)}
${anuncios.secao(cfg, av.erro ? 'os dados do avaliador não foram preparados (' + av.erro + ')' : null)}
${anuncios.secaoPlano(av.erro ? 'os dados do avaliador não foram preparados (' + av.erro + ')' : null)}

<details class="diag">
  <summary>Diagnóstico</summary>
  <p id="diag-ponte"></p>
  <p id="diag-anuncios"></p>
  <p id="diag-cartao">Tela do item: nenhum item aberto ainda</p>
  <p id="diag-linhas">Linhas: a busca por trás começa uns segundos depois de abrir</p>
  <p id="diag-conta2">Conta 2: ${r.conta2 ? 'salva, ainda não aberta nesta abertura' : 'nenhuma'}</p>
  <p id="diag-diario">Diário: ${esc(r.diario && r.diario.erro ? 'erro ao montar (' + r.diario.erro + ')' : (r.diag && r.diag.diario) || '')}</p>
  <textarea readonly>${esc(JSON.stringify(r.diag, null, 2))}</textarea>
</details>

<footer>v${esc(r.versao)} · ${esc(String(r.sha || '').slice(0, 7))} · dados: Rolimon's e Roblox · somente leitura</footer>
</div>

${dia ? diario.tela() : ''}
${cartao.tela()}
<div id="m-fundo" class="fundo oculto"></div>
<div id="m-folha" class="folha oculto">
  <p>Opções</p>
  ${dia ? '<button type="button" class="op" id="m-diario">Diário de trades<small class="sub" id="m-dia-n"></small></button>' : ''}
  <button type="button" class="op" id="m-trocar">Adicionar conta 2</button>
  <button type="button" class="op perigo oculto" id="m-remover">Remover conta 2</button>
  <button type="button" class="op" id="m-temas">Temas</button>
  <button type="button" class="op" id="m-ajuda">Ajuda</button>
  <button type="button" class="op cancelar" id="m-cancelar">Cancelar</button>
</div>
${temas.folhaTemas()}
<div id="f-fundo" class="fundo oculto"></div>
<form id="f-folha" class="folha c2-form oculto" autocomplete="off">
  <h3>Conta 2</h3>
  <label for="c2-campo">Username do Roblox da outra conta. Fica salvo só neste iPhone.</label>
  <input id="c2-campo" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" placeholder="username">
  <p class="erro oculto" id="c2-erro"></p>
  <div class="acoes"><button type="button" class="btn sec" id="c2-cancelar">Cancelar</button><button type="submit" class="btn" id="c2-salvar">Salvar</button></div>
</form>
${av.erro ? '' : avaliador.folhas() + anuncios.folha()}
${ajuda.secao(cfg)}

<script>
(function(){
  var PONTE = ${avaliador.serializar(avaliador.PONTE)};
  var ROTULOS = { value: 'Value', rap: 'RAP', dem: 'Demanda', tend: 'Tendência', vendas: 'Vendas', nome: 'Nome' };
  function $(id){ return document.getElementById(id); }
  function textoSeguro(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // ---------- Conta (v5.2) ----------
  // conta 1 = a principal (montada com o painel); conta 2 = buscada pela ponte
  // só no primeiro toque no nome dela.
  var conta = 1;
  var c2 = { nome: ${avaliador.serializar(r.conta2 ? r.conta2.nome : null)}, carregada: false, carregando: false, erro: null, anuncios: null, timer: null };
  var abaAtual = 'inv';

  // Abas (Inventário / Avaliar trade / Anúncios / Plano). Na conta 2 o Avaliar some.
  // v6.18: aba Plano (o botão do Avaliar ficou só "Avaliar" para as 4 caberem).
  var TITULOS = { inv: 'Inventário', avaliar: 'Avaliar trade', anuncios: 'Anúncios', plano: 'Plano' };
  function aba(x){
    if (!TITULOS[x] || (conta === 2 && x === 'avaliar')) x = 'inv';
    abaAtual = x;
    // Na conta 2, enquanto os itens dela não chegam, o lugar da aba mostra o estado.
    var esperando = conta === 2 && !c2.carregada;
    for (var nome in TITULOS) {
      var el = $('aba-' + nome);
      if (el) el.classList.toggle('oculto', nome !== x || esperando);
    }
    $('c2-estado').classList.toggle('oculto', !esperando);
    $('titulo').textContent = TITULOS[x];
    var bs = document.querySelectorAll('#abas button');
    for (var k = 0; k < bs.length; k++) {
      var b = bs[k].getAttribute('data-aba');
      bs[k].classList.toggle('on', b === x);
      bs[k].classList.toggle('oculto', conta === 2 && b === 'avaliar');
    }
    try { localStorage.setItem('aba', x); } catch (e) {}
    // A aba Anúncios só busca os anúncios quando é aberta.
    if (x === 'anuncios' && !esperando && window.thAbrirAnuncios) window.thAbrirAnuncios();
    // v6.18: a aba Plano usa os mesmos anúncios (busca se ainda não buscou).
    if (x === 'plano' && !esperando && window.thAbrirPlano) { try { window.thAbrirPlano(); } catch (e) {} }
    // v6.12: o Avaliar pede as vendas/dia dos itens da proposta quando é aberto.
    if (x === 'avaliar' && window.thAbrirAvaliar) { try { window.thAbrirAvaliar(); } catch (e) {} }
  }
  var botoesAba = document.querySelectorAll('#abas button');
  for (var k = 0; k < botoesAba.length; k++) {
    botoesAba[k].addEventListener('click', function(){ aba(this.getAttribute('data-aba')); window.scrollTo(0, 0); });
  }
  // v6.2: aberto pelo toque na notificação -> começa na aba pedida (vale mais que a lembrada).
  var abaInicial = ${avaliador.serializar(r.abaInicial || null)};
  if (abaInicial && TITULOS[abaInicial]) aba(abaInicial);
  else try { var abaSalva = localStorage.getItem('aba'); if (abaSalva && abaSalva !== 'inv' && TITULOS[abaSalva]) aba(abaSalva); } catch (e) {}

  // Blocos recolhíveis (Avaliar trade e Anúncios): lembram se você os abriu ou fechou.
  // (No Inventário, alertas e mudanças ficam na linha de cada item.)
  var recolhiveis = document.querySelectorAll('details.bloco[data-chave]');
  for (var k = 0; k < recolhiveis.length; k++) {
    (function(b){
      var chave = 'aberto:' + b.getAttribute('data-chave');
      try {
        var s = localStorage.getItem(chave);
        if (s === '1') b.open = true;
        else if (s === '0') b.open = false;
      } catch (e) {}
      b.addEventListener('toggle', function(){
        try { localStorage.setItem(chave, b.open ? '1' : '0'); } catch (e) {}
      });
    })(recolhiveis[k]);
  }

  // v6.10: o toque no item abre a tela do item (cartao.js, usada pelas duas contas
  // e pelo Avaliar), com os alertas e as mudanças do período no fim.

  // Liga um bloco do Inventário (o seu ou o da conta 2).
  // INV = menu de cada item (por uaid): a = alertas, m = mudanças em 24h.
  function ligarInventario(raiz, INV, TITULO_MUD){
    var lista = raiz.querySelector('.inv-lista');
    var chips = raiz.querySelectorAll('.inv-ordem .chip[data-campo]');
    var busca = raiz.querySelector('.inv-busca');
    var vazio = raiz.querySelector('.inv-vazio');
    var estado = { campo: 'value', dir: 'desc' };
    var soAlerta = false;

    // Ordenação pelos chips (toque de novo inverte)
    function marcarChips(){
      for (var k = 0; k < chips.length; k++) {
        var c = chips[k].getAttribute('data-campo');
        var on = c === estado.campo;
        chips[k].classList.toggle('on', on);
        chips[k].textContent = ROTULOS[c] + (on ? (estado.dir === 'desc' ? ' ↓' : ' ↑') : '');
      }
    }
    function ordenar(campo){
      if (estado.campo === campo) estado.dir = estado.dir === 'desc' ? 'asc' : 'desc';
      else { estado.campo = campo; estado.dir = campo === 'nome' ? 'asc' : 'desc'; }
      var linhas = Array.prototype.slice.call(lista.children);
      linhas.sort(function(x, y){
        var p = x.getAttribute('data-' + campo), q = y.getAttribute('data-' + campo);
        // v6.11: item ainda sem vendas/dia (-1) fica sempre no fim.
        if (campo === 'vendas' && (Number(p) < 0 || Number(q) < 0)) return (Number(p) < 0 ? 1 : 0) - (Number(q) < 0 ? 1 : 0);
        var c = campo === 'nome' ? p.localeCompare(q) : Number(p) - Number(q);
        return estado.dir === 'asc' ? c : -c;
      });
      linhas.forEach(function(l){ lista.appendChild(l); });
      marcarChips();
      filtrar();
    }
    for (var k = 0; k < chips.length; k++) {
      chips[k].addEventListener('click', function(){ ordenar(this.getAttribute('data-campo')); });
    }
    marcarChips();

    // Busca e filtro "Com alerta" (a divisória entre linhas segue a ordem das linhas visíveis)
    function filtrar(){
      var q = busca.value.trim().toLowerCase();
      var visiveis = 0;
      for (var k = 0; k < lista.children.length; k++) {
        var l = lista.children[k];
        var mostra = l.getAttribute('data-nome').indexOf(q) >= 0 && (!soAlerta || l.getAttribute('data-alerta') === '1');
        l.style.display = mostra ? '' : 'none';
        l.style.borderTop = mostra && visiveis ? '1px solid var(--borda)' : '0';
        if (mostra) visiveis++;
      }
      vazio.classList.toggle('oculto', visiveis > 0);
    }
    busca.addEventListener('input', filtrar);
    var chipAlerta = raiz.querySelector('.inv-so-alerta');
    if (chipAlerta) chipAlerta.addEventListener('click', function(){
      soAlerta = !soAlerta;
      chipAlerta.classList.toggle('on', soAlerta);
      filtrar();
    });
    filtrar();

    // Avisos gerais: o "!" da faixa mostra ou esconde o texto.
    var botaoAviso = raiz.querySelector('.f-alerta');
    if (botaoAviso) botaoAviso.addEventListener('click', function(){
      var txt = raiz.querySelector('.f-aviso');
      var abre = txt.classList.contains('oculto');
      txt.classList.toggle('oculto', !abre);
      botaoAviso.setAttribute('aria-expanded', abre ? 'true' : 'false');
    });

    lista.addEventListener('click', function(ev){
      var it = ev.target.closest('.item');
      if (!it) return;
      var info = INV[it.getAttribute('data-uaid')] || { a: [], m: [] };
      var img = it.querySelector('img.thumb');
      // Os dados do item são buscados só agora, neste toque.
      if (window.thItem) window.thItem.abrir({
        id: it.getAttribute('data-asset'),
        nome: it.getAttribute('data-titulo'),
        thumb: img ? img.getAttribute('src') : null,
        alertas: info.a,
        mudancas: info.m,
        tituloMud: TITULO_MUD
      });
    });
  }
  ligarInventario($('inv-1'), ${avaliador.serializar(menu)}, ${avaliador.serializar(tituloMud)});

  // ---------- v6.11: vendas/dia e Best Price na linha ----------
  // Pede a fila ao Scriptable uns segundos depois de a tela abrir (a conta 2
  // pede quando os itens dela chegam). Cada item atualizado volta por receberLinhas.
  function pedirLinhas(conta){
    try {
      var f = document.createElement('iframe');
      f.style.display = 'none';
      f.src = PONTE + 'linhas?conta=' + conta + '&t=' + Date.now();
      document.body.appendChild(f);
      setTimeout(function(){ if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    } catch (e) {}
  }
  // Mesma regra do slotVendas (html.js): " · " só onde há algo antes/depois.
  function textoVendas(el, ln){
    var a = el.getAttribute('data-a') === '1', d = el.getAttribute('data-d') === '1';
    if (!ln || !ln.tv) { el.textContent = a && d ? ' · ' : ''; return; }
    el.innerHTML = (a ? ' · ' : '') + '<span class="' + textoSeguro(ln.c) + '">' + textoSeguro(ln.tv) + '</span>' + (d ? ' · ' : '');
  }
  window.receberLinhas = function(mapa, diag){
    var dl = $('diag-linhas');
    if (dl && diag) dl.textContent = diag;
    for (var id in mapa || {}) {
      if (!/^\\d+$/.test(id)) continue;
      var ln = mapa[id];
      var its = document.querySelectorAll('.inv-lista .item[data-asset="' + id + '"]');
      for (var k = 0; k < its.length; k++) {
        var it = its[k];
        it.setAttribute('data-vendas', ln && ln.v != null ? ln.v : -1);
        var slot = it.querySelector('.ln-v');
        if (slot && ln && ln.tv) {
          textoVendas(slot, ln);
          var dt = it.querySelector('.det-t'), de = it.querySelector('.det');
          if (dt) dt.classList.remove('oculto');
          if (de) de.classList.remove('oculto');
        }
        var b = it.querySelector('.item-num .b');
        if (b && ln && ln.tb) {
          b.querySelector('.b-n').textContent = ln.tb;
          b.classList.remove('oculto');
        }
      }
    }
    // v6.12: a linha dos itens da proposta (Avaliar) usa as mesmas respostas.
    if (window.thAoReceberLinhas) { try { window.thAoReceberLinhas(mapa || {}); } catch (e) {} }
    // v6.13: e também o selo de giro e os itens do cartão aberto dos Anúncios.
    if (window.thAoReceberLinhasAn) { try { window.thAoReceberLinhasAn(mapa || {}); } catch (e) {} }
  };
  setTimeout(function(){ pedirLinhas(1); }, ${Number(cfg.CARTAO_LINHA_ESPERA_MS) || 2500});

  // ---------- Alternador de conta (v5.2) ----------
  function inicial(s){ return String(s || '?').charAt(0).toUpperCase(); }
  var PRINCIPAL = ${avaliador.serializar(r.usuario.nome)};
  // Chip sob o título: mostra a conta ATUAL; some se não houver conta 2.
  function mostrarBotoesConta(){
    var nomeAtual = conta === 2 ? c2.nome : PRINCIPAL;
    $('conta-chip').classList.toggle('oculto', !c2.nome);
    $('chip-nome').textContent = nomeAtual || '';
    $('chip-ini').textContent = inicial(nomeAtual);
    $('chip-ini').classList.toggle('c2', conta === 2);
    $('meta-hora').textContent = (c2.nome ? '· ' : 'Atualizado ') + $('meta-hora').getAttribute('data-hora');
    $('m-trocar').textContent = c2.nome ? 'Trocar conta 2 (' + c2.nome + ')' : 'Adicionar conta 2';
    $('m-remover').classList.toggle('oculto', !c2.nome);
    // v6.13: o Diário é da conta principal; some do menu enquanto você vê a conta 2.
    if ($('m-diario')) $('m-diario').classList.toggle('oculto', conta === 2);
  }
  // Estado da conta 2 enquanto os itens dela não chegam (buscando ou erro).
  function desenharEstadoC2(){
    var el = $('c2-estado');
    if (c2.carregando) {
      el.innerHTML = '<p class="meta">Buscando os itens de ' + textoSeguro(c2.nome) + '...</p><div class="esq alto"></div><div class="esq"></div><div class="esq"></div>';
    } else if (c2.erro) {
      el.innerHTML = '<p class="aviso">Não consegui buscar os itens de ' + textoSeguro(c2.nome) + ' (' + textoSeguro(c2.erro) + ').</p>' +
        '<div class="acoes"><button type="button" class="btn" id="c2-tentar">Tentar de novo</button><button type="button" class="btn sec" id="c2-trocar2">Trocar conta 2</button></div>';
      $('c2-tentar').addEventListener('click', function(){ pedirConta2('conta2/carregar'); });
      $('c2-trocar2').addEventListener('click', function(){ abrirForm(); });
    } else {
      el.innerHTML = '';
    }
  }
  function mostrarConta(k){
    if (k === 2 && !c2.nome) k = 1;
    conta = k;
    document.body.classList.toggle('c2ativa', k === 2);
    $('inv-1').classList.toggle('oculto', k !== 1);
    $('inv-2').classList.toggle('oculto', k !== 2);
    $('faixa-conta').classList.toggle('oculto', k !== 2);
    $('fc-ini').textContent = inicial(c2.nome);
    $('fc-txt').textContent = 'Vendo a conta de ' + (c2.nome || '');
    mostrarBotoesConta();
    desenharEstadoC2();
    // A aba Anúncios passa a cruzar os anúncios com os itens da conta escolhida.
    if (window.thAnunciosConta) {
      try { window.thAnunciosConta(k === 2 && c2.carregada ? c2.anuncios : null); } catch (e) {}
    }
    aba(abaAtual);
    if (k === 2 && !c2.carregada && !c2.carregando && !c2.erro) pedirConta2('conta2/carregar');
  }
  // Pede à ponte (o Scriptable intercepta o endereço; nada sai do iPhone).
  function pedirConta2(caminho){
    c2.carregando = true;
    c2.erro = null;
    desenharEstadoC2();
    var f = document.createElement('iframe');
    f.style.display = 'none';
    f.src = PONTE + caminho + (caminho.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now();
    document.body.appendChild(f);
    setTimeout(function(){ if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    clearTimeout(c2.timer);
    c2.timer = setTimeout(function(){
      if (!c2.carregando) return;
      c2.carregando = false;
      c2.erro = 'sem resposta do Scriptable';
      desenharEstadoC2();
    }, 120000);
  }
  window.receberConta2 = function(res){
    clearTimeout(c2.timer);
    c2.carregando = false;
    res = res || { erro: 'resposta vazia' };
    var diag = $('diag-conta2');
    if (diag) diag.textContent = 'Conta 2: ' + (res.diag || res.erro || (res.removida ? 'removida' : ''));
    if (res.removida) {
      c2 = { nome: null, carregada: false, carregando: false, erro: null, anuncios: null, timer: null };
      $('inv-2').innerHTML = '';
      mostrarConta(1);
      return;
    }
    if (res.erro) {
      if (res.acao === 'salvar') {
        // Username novo recusado: a conta 2 anterior (se houver) continua.
        c2.nome = res.nome || null;
        c2.erro = null;
        mostrarConta(c2.nome ? conta : 1);
        abrirForm(res.erro, res.tentado);
        return;
      }
      c2.erro = res.erro;
      desenharEstadoC2();
      aba(abaAtual);
      return;
    }
    c2.nome = res.nome;
    c2.carregada = true;
    c2.erro = null;
    c2.anuncios = { inventario: res.inventario, meuId: res.id, chave: '-c2', nome: res.nome };
    // Miniaturas dos itens dela entram no mesmo objeto usado pela aba Anúncios.
    if (typeof TH_D !== 'undefined' && TH_D.miniaturas) {
      for (var id in res.miniaturas || {}) if (!TH_D.miniaturas[id]) TH_D.miniaturas[id] = res.miniaturas[id];
    }
    var raiz = $('inv-2');
    raiz.innerHTML = res.html;
    ligarInventario(raiz, res.menu || {}, res.titulo || 'Mudanças');
    pedirLinhas(2);
    if (conta === 2) mostrarConta(2);
    else mostrarBotoesConta();
  };

  // Toque no chip: troca para a outra conta. "Voltar" na faixa vinho: volta para a sua.
  $('conta-chip').addEventListener('click', function(){
    mostrarConta(conta === 1 ? 2 : 1);
    window.scrollTo(0, 0);
  });
  $('fc-voltar').addEventListener('click', function(){
    mostrarConta(1);
    window.scrollTo(0, 0);
  });

  // ---------- Menu ⋯ e formulário da conta 2 ----------
  var removerArmado = null;
  function abrirMenu(){
    mostrarBotoesConta();
    $('m-fundo').classList.remove('oculto');
    $('m-folha').classList.remove('oculto');
  }
  function fecharMenu(){
    $('m-fundo').classList.add('oculto');
    $('m-folha').classList.add('oculto');
    clearTimeout(removerArmado);
    removerArmado = null;
    $('m-remover').textContent = 'Remover conta 2';
  }
  function abrirForm(erro, tentado){
    fecharMenu();
    $('c2-campo').value = tentado || c2.nome || '';
    $('c2-erro').textContent = erro || '';
    $('c2-erro').classList.toggle('oculto', !erro);
    $('f-fundo').classList.remove('oculto');
    $('f-folha').classList.remove('oculto');
  }
  function fecharForm(){
    $('f-fundo').classList.add('oculto');
    $('f-folha').classList.add('oculto');
    try { $('c2-campo').blur(); } catch (e) {}
  }
  $('mais').addEventListener('click', abrirMenu);
  $('m-fundo').addEventListener('click', fecharMenu);
  $('m-cancelar').addEventListener('click', fecharMenu);
  $('m-trocar').addEventListener('click', function(){ abrirForm(); });
  // Remover pede um segundo toque (sem confirm(), que pode não existir no Scriptable).
  $('m-remover').addEventListener('click', function(){
    var b = this;
    if (!removerArmado) {
      b.textContent = 'Toque de novo para remover';
      removerArmado = setTimeout(function(){ removerArmado = null; b.textContent = 'Remover conta 2'; }, 3000);
      return;
    }
    fecharMenu();
    mostrarConta(1);
    pedirConta2('conta2/remover');
  });
  // ---------- Temas (v5.3) ----------
  // O toque aplica na hora e salva no iPhone; a folha fica aberta para testar outros.
  function temaAtual(){
    var t = document.documentElement.getAttribute('data-tema');
    if (t) return t;
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'azul'; } catch (e) { return 'azul'; }
  }
  function marcarTemas(){
    var at = temaAtual();
    var ops = document.querySelectorAll('#t-folha .t-op');
    for (var k = 0; k < ops.length; k++) ops[k].classList.toggle('on', ops[k].getAttribute('data-t') === at);
  }
  function fecharTemas(){
    $('t-fundo').classList.add('oculto');
    $('t-folha').classList.add('oculto');
  }
  $('m-temas').addEventListener('click', function(){
    fecharMenu();
    marcarTemas();
    $('t-fundo').classList.remove('oculto');
    $('t-folha').classList.remove('oculto');
  });
  // ---------- Diário (v6.13: tela própria pelo menu ⋯) ----------
  // O número de perguntas aparece ao lado ("· 1 pergunta"); diario.js avisa quando muda.
  window.thAoMudarDiario = function(n){
    var el = $('m-dia-n');
    if (el) el.textContent = n ? ' · ' + n + (n === 1 ? ' pergunta' : ' perguntas') : '';
  };
  if ($('m-diario')) $('m-diario').addEventListener('click', function(){
    fecharMenu();
    if (window.thAbrirDiario) window.thAbrirDiario();
  });
  // ---------- Ajuda (v5.4) ----------
  $('m-ajuda').addEventListener('click', function(){
    fecharMenu();
    if (window.thAbrirAjuda) window.thAbrirAjuda();
  });

  $('t-fundo').addEventListener('click', fecharTemas);
  $('t-pronto').addEventListener('click', fecharTemas);
  $('t-folha').addEventListener('click', function(ev){
    var b = ev.target.closest('.t-op');
    if (!b) return;
    thTema(b.getAttribute('data-t'), true);
    marcarTemas();
  });

  $('f-fundo').addEventListener('click', fecharForm);
  $('c2-cancelar').addEventListener('click', fecharForm);
  $('f-folha').addEventListener('submit', function(ev){
    ev.preventDefault();
    var u = $('c2-campo').value.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(u)) {
      $('c2-erro').textContent = 'O username do Roblox tem de 3 a 20 letras, números ou _.';
      $('c2-erro').classList.remove('oculto');
      return;
    }
    fecharForm();
    // Mostra a conta nova já buscando; a resposta da ponte confirma (ou recusa).
    c2.nome = u;
    c2.carregada = false;
    c2.anuncios = null;
    $('inv-2').innerHTML = '';
    // Primeiro marca "buscando" (para mostrarConta não pedir de novo), depois troca a tela.
    pedirConta2('conta2/salvar?u=' + encodeURIComponent(u));
    mostrarConta(2);
  });
})();
</script>
${av.erro ? '' : avaliador.script(av.json, cfg) + anuncios.script(cfg, r.usuario.id, r.meusItens)}
${cartao.script(avaliador.serializar(avaliador.PONTE))}
${ajuda.script()}
${temas.script(avaliador.PONTE)}
${dia ? diario.script(avaliador.serializar(dia.dados), avaliador.serializar(avaliador.PONTE), avaliador.serializar(dia.miniaturas || {})) : ''}
</body></html>`;
}

module.exports = { gerar, inventario, temaValido: temas.temaValido, temaAtual: temas.temaAtual };
