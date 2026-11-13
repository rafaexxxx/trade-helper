// Página do painel (v4): visual profissional, tema claro/escuro seguindo o iPhone.
// Três abas: Inventário, Avaliar trade (módulo avaliador) e Anúncios (módulo anuncios).
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
const COR_DIRECAO = { sobe: 'pos', desce: 'neg', neutro: 'sub' };

// Linha pequena embaixo do nome: demanda · tendência · detalhes.
function detalhes(i) {
  const d = [];
  if (i.demanda >= 0) d.push('<span class="' + corDemanda(i.demanda) + '">' + esc(a.demandaCurta(i.demanda)) + '</span>');
  if (i.tendencia >= 0) d.push('<span class="' + corTendencia(i.tendencia) + '">' + esc(a.tendenciaCurta(i.tendencia)) + '</span>');
  if (i.serial) d.push('#' + esc(i.serial));
  if (i.projected) d.push('<span class="neg">projected</span>');
  if (i.hyped) d.push('hyped');
  if (i.rare) d.push('rare');
  if (i.hold) d.push('<span class="warn">hold</span>');
  if (i.value == null && !i.semRolimons) d.push('sem value');
  if (i.semRolimons) d.push("fora do Rolimon's");
  return d.join(' · ');
}

function linhaItem(i, miniatura) {
  const det = detalhes(i);
  const img = miniatura
    ? '<img class="thumb" src="' + esc(miniatura) + '" alt="">'
    : '<span class="thumb"></span>';
  return (
    '<div class="item" data-asset="' + esc(i.assetId) + '" data-titulo="' + esc(i.nome) +
    '" data-nome="' + esc((i.nome + ' ' + i.sigla).toLowerCase()) +
    '" data-value="' + i.valorEfetivo + '" data-rap="' + i.rap +
    '" data-dem="' + i.demanda + '" data-tend="' + i.tendencia + '">' +
    img +
    '<div class="item-txt"><span class="nome">' + esc(i.nome) + '</span>' +
    (det ? '<span class="det">' + det + '</span>' : '') + '</div>' +
    '<div class="item-num"><span class="v">' + (i.value != null ? a.fmtNum(i.value) : '<span class="sub">—</span>') + '</span>' +
    '<span class="r"><small>RAP</small>' + a.fmtNum(i.rap) + '</span></div>' +
    '</div>'
  );
}

// Marca redonda à esquerda da linha: "!" para alertas, ▲/▼ para mudanças.
function marca(cor, simbolo) {
  return '<span class="marca ' + cor + '">' + simbolo + '</span>';
}

function listaRiscos(riscos) {
  if (!riscos.length) return '<p class="vazio">Nenhum item em risco.</p>';
  return (
    '<ul class="grupo">' +
    riscos
      .map((r) => {
        const pior = r.motivos.some((m) => m.grav === 'alta') ? 'neg' : r.motivos.some((m) => m.grav === 'media') ? 'warn' : 'sub';
        return (
          '<li>' + marca(pior, '!') + '<span class="txt"><b>' + esc(r.item.nome) + '</b>: ' +
          r.motivos.map((m) => '<span class="' + COR_GRAVIDADE[m.grav] + '">' + esc(m.texto) + '</span>').join(', ') +
          '</span></li>'
        );
      })
      .join('') +
    '</ul>'
  );
}

function listaMudancas(c, cfg, semBase) {
  if (c.mudancas == null) return '<p class="vazio">' + semBase + '</p>';
  if (!c.mudancas.length) {
    return '<p class="vazio">Nada acima de ' + cfg.LIMITE_MUDANCA_PCT + '% desde ' + a.fmtData(c.base.data) + '.</p>';
  }
  return (
    '<ul class="grupo">' +
    c.mudancas
      .map((m) => {
        const dir = m.mudancas[0] ? m.mudancas[0].dir : 'neutro';
        const simbolo = dir === 'sobe' ? '▲' : dir === 'desce' ? '▼' : '•';
        return (
          '<li>' + marca(COR_DIRECAO[dir], simbolo) + '<span class="txt"><b>' + esc(m.item.nome) + '</b>: ' +
          m.mudancas.map((x) => '<span class="' + COR_DIRECAO[x.dir] + '">' + esc(x.texto) + '</span>').join('; ') +
          '</span></li>'
        );
      })
      .join('') +
    '</ul>'
  );
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

// Pílula do cartão de destaque: "▲ 2,1% desde 12:10".
function pilula(v, c, agora, semBase) {
  if (!c.base || !v || v.pct == null) return '<span class="pilula"><span>' + semBase + '</span></span>';
  const seta = v.pct > 0 ? '▲ ' : v.pct < 0 ? '▼ ' : '';
  return '<span class="pilula">' + seta + a.fmtPct(Math.abs(v.pct)) + ' <span>desde ' + quando(c.base.data, agora) + '</span></span>';
}

// Cor do contador de alertas: vermelho se houver grave, amarelo se houver médio.
function corContagemRiscos(riscos) {
  let cor = 'sub';
  for (const r of riscos) {
    for (const m of r.motivos) {
      if (m.grav === 'alta') return 'neg';
      if (m.grav === 'media') cor = 'warn';
    }
  }
  return cor;
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
.btn{padding:11px 16px;border-radius:12px;border:0;background:var(--acc);color:#fff;font-size:15px;font-weight:600}
.btn.sec{background:var(--card);color:var(--acc-t);border:1px solid var(--borda)}
.btn:active,.chip:active{background:var(--acc-press);color:#fff}
.btn:disabled{opacity:.45}

.heroi{padding:22px 20px 20px;border-radius:20px;background:var(--heroi);color:#fff;box-shadow:var(--sombra)}
.h-rot{font-size:14px;font-weight:600;opacity:.82}
.h-num{margin:6px 0 10px;font-size:44px;font-weight:700;line-height:1;letter-spacing:-.02em}
.h-num.media{font-size:34px}
.pilula{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:rgba(255,255,255,.18);font-size:14px;font-weight:600}
.pilula span{font-weight:500;opacity:.85}
.h-linha{height:1px;margin:18px 0;background:rgba(255,255,255,.22)}
.h-pe{margin-top:18px;font-size:14px;opacity:.85}

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
.det{font-size:13px;color:var(--sub)}
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
`;

function gerar(r, cfg) {
  const t = r.totais;
  const u = r.comparacoes.ultima;
  const d = r.comparacoes.dia;
  // Topo compacto: "Atualizado 13:35 · desde 12:10" (o "desde" segue o seletor de período).
  const desde = (c, sem) => (c.base ? 'desde ' + quando(c.base.data, r.agora) : sem);
  const meta = 'Atualizado ' + quando(r.agora, r.agora) + ' · ' +
    porPeriodo(desde(u, 'primeira consulta'), desde(d, '24h em formação'));

  const SEM_ULTIMA = 'Primeira consulta, sem comparação ainda.';
  const SEM_DIA = 'Histórico de 24h ainda em formação. Ele cresce a cada uso do painel e do widget.';

  const avisos = r.avisos.map((x) => '<p class="aviso">' + esc(x) + '</p>').join('');
  const contagem = (c) => (c.mudancas ? '<span class="cont">' + c.mudancas.length + '</span>' : '');
  const av = r.avaliador || { erro: 'dados não preparados' };
  const emHold = r.itens.filter((i) => i.hold).length;
  const pe = t.qtd + (t.qtd === 1 ? ' item' : ' itens') + (emHold ? ' · ' + emHold + ' em hold' : '');

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
<div class="seg peq" id="seg-periodo">
  <button data-p="ultima" class="on">Última consulta</button>
  <button data-p="dia">24h</button>
</div>

<div class="heroi">
  <div class="h-rot">Value total</div>
  <div class="h-num">${a.fmtNum(t.value)}</div>
  ${porPeriodo(pilula(u.var && u.var.value, u, r.agora, 'primeira consulta'), pilula(d.var && d.var.value, d, r.agora, '24h em formação'))}
  <div class="h-linha"></div>
  <div class="h-rot">RAP total</div>
  <div class="h-num media">${a.fmtNum(t.rap)}</div>
  ${porPeriodo(pilula(u.var && u.var.rap, u, r.agora, 'primeira consulta'), pilula(d.var && d.var.rap, d, r.agora, '24h em formação'))}
  <div class="h-pe">${pe}</div>
</div>
${avisos}

<section class="secao">
  <h2>Alertas<span class="cont ${corContagemRiscos(r.riscos)}">${r.riscos.length}</span></h2>
  ${listaRiscos(r.riscos)}
</section>

<section class="secao">
  <h2>Mudanças${porPeriodo(contagem(u), contagem(d))}</h2>
  <div data-periodo="ultima">${listaMudancas(u, cfg, SEM_ULTIMA)}</div>
  <div data-periodo="dia" class="oculto">${listaMudancas(d, cfg, SEM_DIA)}</div>
</section>

<section class="secao">
  <h2>Itens<span class="cont">${t.qtd}</span></h2>
  <input id="busca" type="search" placeholder="Buscar item" autocomplete="off">
  <div class="chips" id="ordem">
    <button class="chip on" data-campo="value">Value</button>
    <button class="chip" data-campo="rap">RAP</button>
    <button class="chip" data-campo="dem">Demanda</button>
    <button class="chip" data-campo="tend">Tendência</button>
    <button class="chip" data-campo="nome">Nome</button>
  </div>
  <div class="grupo">
    <div id="itens">${r.itens.map((i) => linhaItem(i, r.miniaturas[String(i.assetId)])).join('')}</div>
    <p class="vazio oculto" id="itens-vazio">Nada encontrado.</p>
    <div class="total"><span>Total</span><div class="item-num"><span class="v">${a.fmtNum(t.value)}</span><span class="r"><small>RAP</small>${a.fmtNum(t.rap)}</span></div></div>
  </div>
</section>
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
  <a id="link-rol" href="#">Ver no Rolimon's</a>
  <a id="link-rbx" href="#">Ver no Roblox</a>
  <button id="cancelar" class="cancelar">Cancelar</button>
</div>
${av.erro ? '' : avaliador.folhas() + anuncios.folha()}

<script>
(function(){
  var lista = document.getElementById('itens');
  var chips = document.querySelectorAll('#ordem .chip');
  var busca = document.getElementById('busca');
  var estado = { campo: 'value', dir: 'desc' };
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
  // Alertas e Mudanças do Inventário ficam sempre abertos.
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

  // Seletor de período (última consulta / 24h)
  function periodo(p){
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

  // Busca (a divisória entre linhas segue a ordem das linhas visíveis)
  function filtrar(){
    var q = busca.value.trim().toLowerCase();
    var visiveis = 0;
    for (var k = 0; k < lista.children.length; k++) {
      var l = lista.children[k];
      var mostra = l.getAttribute('data-nome').indexOf(q) >= 0;
      l.style.display = mostra ? '' : 'none';
      l.style.borderTop = mostra && visiveis ? '1px solid var(--borda)' : '0';
      if (mostra) visiveis++;
    }
    document.getElementById('itens-vazio').classList.toggle('oculto', visiveis > 0);
  }
  busca.addEventListener('input', filtrar);

  // Menu ao tocar no item
  var fundo = document.getElementById('fundo');
  var folha = document.getElementById('folha');
  function fechar(){ fundo.classList.add('oculto'); folha.classList.add('oculto'); }
  lista.addEventListener('click', function(ev){
    var it = ev.target.closest('.item');
    if (!it) return;
    var id = it.getAttribute('data-asset');
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
