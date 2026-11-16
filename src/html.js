// Página do painel (v4): visual profissional, tema claro/escuro seguindo o iPhone.
// Três abas: Inventário, Avaliar trade (módulo avaliador) e Anúncios (módulo anuncios).
// v5.1: no Inventário a lista vem logo depois de uma faixa compacta de totais;
// alertas e mudanças aparecem na linha de cada item (etiqueta e setas) e no menu do item.
const a = require('analise');
const avaliador = require('avaliador');
const anuncios = require('anuncios');

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

// Alertas de encontrarRiscos por uaid, do mais grave para o mais leve.
function alertasPorUaid(riscos) {
  const m = {};
  for (const r of riscos) {
    m[r.item.uaid] = r.motivos.slice().sort((x, y) => PESO_GRAVIDADE[y.grav] - PESO_GRAVIDADE[x.grav]);
  }
  return m;
}

// Etiqueta da linha: o pior alerta e "+N" para os outros (todos aparecem no menu do item).
function etiqueta(motivos) {
  if (!motivos || !motivos.length) return '';
  const pior = motivos[0];
  const mais = motivos.length > 1 ? ' +' + (motivos.length - 1) : '';
  return '<span class="tag ' + COR_GRAVIDADE[pior.grav] + '">' + esc(maiuscula(pior.texto)) + mais + '</span>';
}

// Variação % do value e do RAP do item contra o retrato base do período.
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

// Linha pequena embaixo do nome: demanda · tendência · detalhes.
// "projected" não entra aqui: ele sempre vira a etiqueta vermelha da linha.
function detalhes(i) {
  const d = [];
  if (i.demanda >= 0) d.push('<span class="' + corDemanda(i.demanda) + '">' + esc(a.demandaCurta(i.demanda)) + '</span>');
  if (i.tendencia >= 0) d.push('<span class="' + corTendencia(i.tendencia) + '">' + esc(a.tendenciaCurta(i.tendencia)) + '</span>');
  if (i.serial) d.push('#' + esc(i.serial));
  if (i.hyped) d.push('hyped');
  if (i.rare) d.push('rare');
  if (i.hold) d.push('<span class="warn">hold</span>');
  if (i.value == null && !i.semRolimons) d.push('sem value');
  if (i.semRolimons) d.push("fora do Rolimon's");
  return d.join(' · ');
}

// Uma linha da lista. "motivos" são os alertas do item; "varU"/"varD" as variações
// contra a última consulta e contra 24h (as setas seguem o seletor de período).
function linhaItem(i, miniatura, motivos, varU, varD, lim) {
  const det = detalhes(i);
  const tag = etiqueta(motivos);
  const img = miniatura
    ? '<img class="thumb" src="' + esc(miniatura) + '" alt="">'
    : '<span class="thumb"></span>';
  const setaV = i.value != null ? porPeriodo(seta(varU && varU.v, lim), seta(varD && varD.v, lim)) : '';
  const setaR = porPeriodo(seta(varU && varU.r, lim), seta(varD && varD.r, lim));
  return (
    '<div class="item" data-uaid="' + esc(i.uaid) + '" data-asset="' + esc(i.assetId) + '" data-titulo="' + esc(i.nome) +
    '" data-nome="' + esc((i.nome + ' ' + i.sigla).toLowerCase()) +
    '" data-value="' + i.valorEfetivo + '" data-rap="' + i.rap +
    '" data-dem="' + i.demanda + '" data-tend="' + i.tendencia +
    '" data-alerta="' + (tag ? '1' : '0') + '">' +
    img +
    '<div class="item-txt"><span class="nome">' + esc(i.nome) + '</span>' +
    (tag || det ? '<span class="det">' + tag + (det ? '<span>' + det + '</span>' : '') + '</span>' : '') + '</div>' +
    '<div class="item-num"><span class="v">' + (i.value != null ? setaV + a.fmtNum(i.value) : '<span class="sub">—</span>') + '</span>' +
    '<span class="r">' + setaR + '<small>RAP</small>' + a.fmtNum(i.rap) + '</span></div>' +
    '</div>'
  );
}

// Dados do menu de cada item: alertas [texto, cor] e mudanças por período [texto, cor].
function dadosDoMenu(alertas, comparacoes) {
  const m = {};
  const pegar = (uaid) => (m[uaid] = m[uaid] || { a: [], u: [], d: [] });
  for (const uaid of Object.keys(alertas)) {
    pegar(uaid).a = alertas[uaid].map((x) => [maiuscula(x.texto), COR_GRAVIDADE[x.grav]]);
  }
  const porPer = { u: comparacoes.ultima, d: comparacoes.dia };
  for (const k of Object.keys(porPer)) {
    for (const x of porPer[k].mudancas || []) {
      pegar(x.item.uaid)[k] = x.mudancas.map((y) => [y.texto, COR_DIRECAO[y.dir]]);
    }
  }
  return m;
}

// Bloco que só aparece quando o período correspondente está selecionado.
function porPeriodo(conteudoUltima, conteudoDia) {
  return (
    '<span data-periodo="ultima">' + conteudoUltima + '</span>' +
    '<span data-periodo="dia" class="oculto">' + conteudoDia + '</span>'
  );
}

// Hora curta ("13:35"); com a data na frente quando não for o mesmo dia.
function quando(ms, agora) {
  const x = new Date(ms);
  const y = new Date(agora);
  const mesmoDia = x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  return mesmoDia ? a.fmtData(ms).slice(6) : a.fmtData(ms);
}

// Variação de um total na faixa: "▲ 2,1%" (o "desde" fica no topo da página).
function varTotal(v, semBase) {
  if (!v || v.pct == null) return '<span class="f-var vazio">' + semBase + '</span>';
  const s = v.pct > 0 ? '▲ ' : v.pct < 0 ? '▼ ' : '';
  return '<span class="f-var">' + s + a.fmtPct(Math.abs(v.pct)) + '</span>';
}

// Paleta v4 (aprovada no protótipo L). Os nomes antigos (--cab, --linha, --link,
// --rotulo) ficam como apelidos para nada sem cor escapar.
const CSS_BASE = `
:root{
  color-scheme:light;
  --topo:#eaf0fd;--bg:#f4f6fa;
  --card:#ffffff;--card2:#edf1f8;--borda:#dde3ee;
  --fg:#1b2333;--sub:#667085;
  --acc:#173b82;--acc-press:#102b61;--acc-t:#173b82;--rap:#173b82;--heroi:#173b82;
  --pos:#1f8a5b;--pos-bg:#e2f3ea;--warn:#a8660f;--warn-bg:#fbf0dd;--neg:#c23a5c;--neg-bg:#fbe4ea;
  --on-status:#ffffff;--dou-bg:#f0f4ff;--rec-bg:#eef8f3;
  --sombra:0 1px 2px rgba(16,24,40,.06),0 6px 18px rgba(16,24,40,.05);
  --f-ui:"Montserrat",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  --cab:var(--card2);--linha:var(--borda);--link:var(--acc-t);--rotulo:var(--sub);
}
@media (prefers-color-scheme: dark){:root{
  color-scheme:dark;
  --topo:#1f2633;--bg:#15181d;
  --card:#22262e;--card2:#2c313b;--borda:#363c48;
  --fg:#eef1f6;--sub:#a3abb9;
  --acc:#173b82;--acc-press:#102b61;--acc-t:#8fa8ff;--rap:#8fa8ff;--heroi:#173b82;
  --pos:#8fe0b8;--pos-bg:#1d3530;--warn:#f5c98a;--warn-bg:#3a3122;--neg:#ff9db0;--neg-bg:#3d2329;
  --on-status:#15181d;--dou-bg:#1f2a44;--rec-bg:#1c2e2a;
  --sombra:none;
}}
*{box-sizing:border-box}
html{background:var(--bg);-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;color:var(--fg);font:16px/1.4 var(--f-ui);font-variant-numeric:tabular-nums;
  background:linear-gradient(180deg,var(--topo),var(--bg) 640px) no-repeat,var(--bg);
  padding:max(14px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 40px max(16px,env(safe-area-inset-left))}
button{font:inherit;color:inherit}
.app{display:flex;flex-direction:column;gap:22px}
.aba{display:flex;flex-direction:column;gap:22px}
.oculto{display:none!important}
.pos{color:var(--pos)}.neg{color:var(--neg)}.warn{color:var(--warn)}.sub{color:var(--sub)}.acc{color:var(--acc-t)}

.topo{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
h1{margin:0;font-size:30px;font-weight:700;line-height:1.1;letter-spacing:-.02em}
.user{color:var(--sub);font-size:15px}
.meta{margin:4px 0 0;color:var(--sub);font-size:13px}
.aviso{margin:0;color:var(--warn);font-size:14px}

.seg{display:flex;padding:3px;border-radius:12px;background:var(--card2)}
.seg button{flex:1;padding:9px 4px;border:0;border-radius:9px;background:none;color:var(--sub);font-size:15px;font-weight:600}
.seg button.on{background:var(--card);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.seg.abas button{font-size:14px}
.seg.abas button.on{background:var(--acc);color:#fff;box-shadow:none}
.seg.peq button,.seg.mini button{font-size:14px;padding:7px 4px}

.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{padding:7px 13px;border:1px solid var(--borda);border-radius:999px;background:var(--card);color:var(--fg);font-size:14px;font-weight:500;-webkit-user-select:none;user-select:none}
.chip.on{color:#fff;background:var(--acc);border-color:var(--acc)}
.chip.filtro{border-style:dashed}
.chip.filtro.on{border-style:solid;background:var(--neg-bg);border-color:var(--neg);color:var(--neg)}
.btn{padding:11px 16px;border-radius:12px;border:0;background:var(--acc);color:#fff;font-size:15px;font-weight:600}
.btn.sec{background:var(--card);color:var(--acc-t);border:1px solid var(--borda)}
.btn:active,.chip:active{background:var(--acc-press);color:#fff}
.btn:disabled{opacity:.45}

.faixa{padding:14px 16px 12px;border-radius:18px;background:var(--heroi);color:#fff;box-shadow:var(--sombra);display:flex;flex-direction:column;gap:12px}
.f-tot{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.f-col{display:flex;flex-direction:column;gap:3px;min-width:0}
.f-rot{font-size:12px;font-weight:600;opacity:.8;text-transform:uppercase;letter-spacing:.06em}
.f-num{font-size:24px;font-weight:700;line-height:1.1;letter-spacing:-.01em}
.f-var{font-size:13px;font-weight:600;opacity:.92}
.f-var.vazio{font-weight:500;opacity:.7}
.f-pe{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:10px;border-top:1px solid rgba(255,255,255,.2)}
.seg.claro{background:rgba(255,255,255,.14);padding:2px;border-radius:10px}
.seg.claro button{flex:none;padding:5px 12px;font-size:13px;color:rgba(255,255,255,.85);border-radius:8px}
.seg.claro button.on{background:#fff;color:#173b82;box-shadow:none}
.f-dir{display:flex;align-items:center;gap:8px}
.f-info{font-size:13px;opacity:.85}
.f-alerta{flex:none;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.16);color:#f5c98a;font-size:11px;font-weight:700;line-height:18px;text-align:center}
.f-aviso{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.12);font-size:13px;line-height:1.35}
.f-aviso p{margin:0}
.ferramentas{display:flex;flex-direction:column;gap:10px}

.secao{display:flex;flex-direction:column;gap:10px}
.secao>h2,details.bloco>summary{display:flex;align-items:center;gap:8px;margin:0;font-size:20px;font-weight:700;line-height:1.2;letter-spacing:-.01em}
.cont{min-width:24px;padding:3px 8px;border-radius:999px;font-size:13px;font-weight:600;line-height:1.2;text-align:center;background:var(--card2);color:var(--sub)}
.cont:empty{display:none}
.cont.neg{background:var(--neg-bg);color:var(--neg)}
.cont.warn{background:var(--warn-bg);color:var(--warn)}
.cont.pos{background:var(--pos-bg);color:var(--pos)}

.grupo{margin:0;padding:0;list-style:none;border-radius:16px;background:var(--card);box-shadow:var(--sombra);overflow:hidden}
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
#itens .item+.item{border-top:1px solid var(--borda)}
.thumb{flex:none;width:46px;height:46px;border-radius:12px;background:var(--card2);object-fit:cover;display:block}
.item-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.nome{font-size:16px;font-weight:600;line-height:1.25;overflow-wrap:anywhere}
.det{font-size:13px;color:var(--sub);display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
.tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;line-height:1.35;white-space:nowrap}
.tag.neg{background:var(--neg-bg);color:var(--neg)}
.tag.warn{background:var(--warn-bg);color:var(--warn)}
.tag.sub{background:var(--card2);color:var(--sub)}
.item-num small.seta{font-weight:700}
.item-num small.seta.pos{color:var(--pos)}
.item-num small.seta.neg{color:var(--neg)}
.item-num{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;white-space:nowrap}
.item-num .v{font-size:18px;font-weight:700;line-height:1}
.item-num .r{font-size:16px;font-weight:600;line-height:1;color:var(--rap)}
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
.folha{position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));background:var(--card);border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.25)}
.folha p{margin:0;padding:14px 16px;text-align:center;font-size:14px;color:var(--sub);border-bottom:1px solid var(--borda)}
.folha a,.folha button{display:block;width:100%;padding:16px;text-align:center;font:inherit;font-size:17px;font-weight:500;color:var(--acc-t);text-decoration:none;background:none;border:0;border-bottom:1px solid var(--borda)}
.folha .cancelar{font-weight:700;border-bottom:0}
.folha{max-height:85vh;overflow-y:auto}
.folha-bloco{padding:12px 16px;border-bottom:1px solid var(--borda);display:flex;flex-direction:column;gap:8px;text-align:left}
.folha-bloco h3{margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--sub)}
.motivo{display:flex;gap:10px;align-items:center;font-size:15px}
`;

function gerar(r, cfg) {
  const t = r.totais;
  const u = r.comparacoes.ultima;
  const d = r.comparacoes.dia;
  // Topo compacto: "Atualizado 13:35 · desde 12:10" (o "desde" segue o seletor de período).
  const desde = (c, sem) => (c.base ? 'desde ' + quando(c.base.data, r.agora) : sem);
  const meta = 'Atualizado ' + quando(r.agora, r.agora) + ' · ' +
    porPeriodo(desde(u, 'primeira consulta'), desde(d, '24h em formação'));

  // Avisos gerais (cache, fonte que não respondeu...): "!" discreto na faixa; o toque mostra o texto.
  const temAvisos = r.avisos.length > 0;
  const avisos = r.avisos.map((x) => '<p>' + esc(x) + '</p>').join('');
  const av = r.avaliador || { erro: 'dados não preparados' };
  const emHold = r.itens.filter((i) => i.hold).length;
  const pe = t.qtd + (t.qtd === 1 ? ' item' : ' itens') + (emHold ? ' · ' + emHold + ' em hold' : '');

  const lim = cfg.LIMITE_MUDANCA_PCT;
  const alertas = alertasPorUaid(r.riscos);
  const comAlerta = Object.keys(alertas).length;
  const linhas = r.itens
    .map((i) => linhaItem(i, r.miniaturas[String(i.assetId)], alertas[i.uaid], variacaoItem(i, u.base), variacaoItem(i, d.base), lim))
    .join('');
  const menu = dadosDoMenu(alertas, r.comparacoes);
  const bases = { ultima: u.base ? quando(u.base.data, r.agora) : null, dia: d.base ? quando(d.base.data, r.agora) : null };

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Inventário</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<style>
${CSS_BASE}
${avaliador.css()}
${anuncios.css()}
</style></head><body>
<div class="app">

<div>
  <div class="topo"><h1 id="titulo">Inventário</h1><span class="user">${esc(r.usuario.nome)}</span></div>
  <p class="meta">${meta}</p>
</div>

<nav class="seg abas" id="abas">
  <button data-aba="inv" class="on">Inventário</button>
  <button data-aba="avaliar">Avaliar trade</button>
  <button data-aba="anuncios">Anúncios</button>
</nav>

<div id="aba-inv" class="aba">
<div class="faixa">
  <div class="f-tot">
    <div class="f-col"><span class="f-rot">Value</span><span class="f-num">${a.fmtNum(t.value)}</span>${porPeriodo(varTotal(u.var && u.var.value, 'primeira consulta'), varTotal(d.var && d.var.value, '24h em formação'))}</div>
    <div class="f-col"><span class="f-rot">RAP</span><span class="f-num">${a.fmtNum(t.rap)}</span>${porPeriodo(varTotal(u.var && u.var.rap, 'primeira consulta'), varTotal(d.var && d.var.rap, '24h em formação'))}</div>
  </div>
  <div class="f-pe">
    <div class="seg claro" id="seg-periodo">
      <button data-p="ultima" class="on">Última consulta</button>
      <button data-p="dia">24h</button>
    </div>
    <span class="f-dir"><span class="f-info">${pe}</span>${temAvisos ? '<button class="f-alerta" id="f-alerta" aria-expanded="false" aria-controls="f-aviso" aria-label="Ver avisos">!</button>' : ''}</span>
  </div>
  ${temAvisos ? '<div class="f-aviso oculto" id="f-aviso">' + avisos + '</div>' : ''}
</div>

<div class="ferramentas">
  <input id="busca" type="search" placeholder="Buscar item" autocomplete="off">
  <div class="chips" id="ordem">
    <button class="chip on" data-campo="value">Value</button>
    <button class="chip" data-campo="rap">RAP</button>
    <button class="chip" data-campo="dem">Demanda</button>
    <button class="chip" data-campo="tend">Tendência</button>
    <button class="chip" data-campo="nome">Nome</button>
    ${comAlerta ? '<button class="chip filtro" id="so-alerta">Com alerta · ' + comAlerta + '</button>' : ''}
  </div>
</div>

<div class="grupo">
  <div id="itens">${linhas}</div>
  <p class="vazio oculto" id="itens-vazio">Nada encontrado.</p>
  <div class="total"><span>Total</span><div class="item-num"><span class="v">${a.fmtNum(t.value)}</span><span class="r"><small>RAP</small>${a.fmtNum(t.rap)}</span></div></div>
</div>
</div>

${avaliador.secao(cfg, av.base, av.erro)}
${anuncios.secao(cfg, av.erro ? 'os dados do avaliador não foram preparados (' + av.erro + ')' : null)}

<details class="diag">
  <summary>Diagnóstico</summary>
  <p id="diag-ponte"></p>
  <p id="diag-anuncios"></p>
  <textarea readonly>${esc(JSON.stringify(r.diag, null, 2))}</textarea>
</details>

<footer>v${esc(r.versao)} · ${esc(String(r.sha || '').slice(0, 7))} · dados: Rolimon's e Roblox · somente leitura</footer>
</div>

<div id="fundo" class="fundo oculto"></div>
<div id="folha" class="folha oculto">
  <p id="folha-nome"></p>
  <div id="folha-alertas" class="folha-bloco oculto"></div>
  <div id="folha-mud" class="folha-bloco oculto"></div>
  <a id="link-rol" href="#">Ver no Rolimon's</a>
  <a id="link-rbx" href="#">Ver no Roblox</a>
  <button id="cancelar" class="cancelar">Cancelar</button>
</div>
${av.erro ? '' : avaliador.folhas() + anuncios.folha()}

<script>
(function(){
  var lista = document.getElementById('itens');
  var chips = document.querySelectorAll('#ordem .chip[data-campo]');
  var busca = document.getElementById('busca');
  var estado = { campo: 'value', dir: 'desc' };
  // Menu de cada item (por uaid): a = alertas, u/d = mudanças desde a última consulta / 24h.
  var INV = ${avaliador.serializar(menu)};
  var BASES = ${avaliador.serializar(bases)};
  var periodoAtual = 'ultima';
  var soAlerta = false;
  var ROTULOS = { value: 'Value', rap: 'RAP', dem: 'Demanda', tend: 'Tendência', nome: 'Nome' };

  // Abas (Inventário / Avaliar trade / Anúncios)
  var TITULOS = { inv: 'Inventário', avaliar: 'Avaliar trade', anuncios: 'Anúncios' };
  function aba(x){
    if (!TITULOS[x]) x = 'inv';
    for (var nome in TITULOS) {
      var el = document.getElementById('aba-' + nome);
      if (el) el.classList.toggle('oculto', nome !== x);
    }
    document.getElementById('titulo').textContent = TITULOS[x];
    var bs = document.querySelectorAll('#abas button');
    for (var k = 0; k < bs.length; k++) bs[k].classList.toggle('on', bs[k].getAttribute('data-aba') === x);
    try { localStorage.setItem('aba', x); } catch (e) {}
    // A aba Anúncios só busca os anúncios quando é aberta.
    if (x === 'anuncios' && window.thAbrirAnuncios) window.thAbrirAnuncios();
  }
  var botoesAba = document.querySelectorAll('#abas button');
  for (var k = 0; k < botoesAba.length; k++) {
    botoesAba[k].addEventListener('click', function(){ aba(this.getAttribute('data-aba')); window.scrollTo(0, 0); });
  }
  try { var abaSalva = localStorage.getItem('aba'); if (abaSalva && abaSalva !== 'inv' && TITULOS[abaSalva]) aba(abaSalva); } catch (e) {}

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

  // Seletor de período (última consulta / 24h): muda a faixa, o "desde" do topo e as setas dos itens.
  function periodo(p){
    periodoAtual = p;
    var blocos = document.querySelectorAll('[data-periodo]');
    for (var k = 0; k < blocos.length; k++) {
      blocos[k].classList.toggle('oculto', blocos[k].getAttribute('data-periodo') !== p);
    }
    var botoes = document.querySelectorAll('#seg-periodo button');
    for (var k = 0; k < botoes.length; k++) {
      botoes[k].classList.toggle('on', botoes[k].getAttribute('data-p') === p);
    }
    try { localStorage.setItem('periodo', p); } catch (e) {}
  }
  var botoesSeg = document.querySelectorAll('#seg-periodo button');
  for (var k = 0; k < botoesSeg.length; k++) {
    botoesSeg[k].addEventListener('click', function(){ periodo(this.getAttribute('data-p')); });
  }
  try { var salvo = localStorage.getItem('periodo'); if (salvo === 'dia') periodo('dia'); } catch (e) {}

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
    document.getElementById('itens-vazio').classList.toggle('oculto', visiveis > 0);
  }
  busca.addEventListener('input', filtrar);
  var chipAlerta = document.getElementById('so-alerta');
  if (chipAlerta) chipAlerta.addEventListener('click', function(){
    soAlerta = !soAlerta;
    chipAlerta.classList.toggle('on', soAlerta);
    filtrar();
  });

  // Avisos gerais: o "!" da faixa mostra ou esconde o texto.
  var botaoAviso = document.getElementById('f-alerta');
  if (botaoAviso) botaoAviso.addEventListener('click', function(){
    var txt = document.getElementById('f-aviso');
    var abre = txt.classList.contains('oculto');
    txt.classList.toggle('oculto', !abre);
    botaoAviso.setAttribute('aria-expanded', abre ? 'true' : 'false');
  });

  // Menu ao tocar no item: alertas e mudanças do período em cima, links embaixo.
  var fundo = document.getElementById('fundo');
  var folha = document.getElementById('folha');
  function fechar(){ fundo.classList.add('oculto'); folha.classList.add('oculto'); }
  function textoSeguro(s){
    return String(s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function blocoMenu(id, titulo, linhas, simbolo){
    var el = document.getElementById(id);
    if (!linhas || !linhas.length) { el.classList.add('oculto'); el.innerHTML = ''; return; }
    el.innerHTML = '<h3>' + textoSeguro(titulo) + '</h3>' + linhas.map(function(x){
      return '<div class="motivo"><span class="marca ' + x[1] + '">' + simbolo(x[1]) + '</span><span class="' + x[1] + '">' + textoSeguro(x[0]) + '</span></div>';
    }).join('');
    el.classList.remove('oculto');
  }
  lista.addEventListener('click', function(ev){
    var it = ev.target.closest('.item');
    if (!it) return;
    var id = it.getAttribute('data-asset');
    var info = INV[it.getAttribute('data-uaid')] || { a: [], u: [], d: [] };
    var base = BASES[periodoAtual];
    blocoMenu('folha-alertas', 'Alertas', info.a, function(){ return '!'; });
    blocoMenu('folha-mud', base ? 'Mudanças desde ' + base : 'Mudanças', periodoAtual === 'dia' ? info.d : info.u, function(c){
      return c === 'pos' ? '▲' : c === 'neg' ? '▼' : '•';
    });
    document.getElementById('folha-nome').textContent = it.getAttribute('data-titulo');
    document.getElementById('link-rol').href = 'https://www.rolimons.com/item/' + id;
    document.getElementById('link-rbx').href = 'https://www.roblox.com/catalog/' + id;
    fundo.classList.remove('oculto');
    folha.classList.remove('oculto');
  });
  fundo.addEventListener('click', fechar);
  document.getElementById('cancelar').addEventListener('click', fechar);
  document.getElementById('link-rol').addEventListener('click', function(){ setTimeout(fechar, 300); });
  document.getElementById('link-rbx').addEventListener('click', function(){ setTimeout(fechar, 300); });
})();
</script>
${av.erro ? '' : avaliador.script(av.json, cfg) + anuncios.script(cfg, r.usuario.id)}
</body></html>`;
}

module.exports = { gerar };
