// Página do painel: estilo planilha, tema claro/escuro seguindo o iPhone.
const a = require('analise');

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

function variacao(v) {
  if (!v || v.pct == null) return '';
  const cor = v.pct > 0 ? 'pos' : v.pct < 0 ? 'neg' : 'sub';
  return '<span class="var ' + cor + '">' + a.fmtPctSinal(v.pct) + '</span>';
}

function detalhes(i) {
  const d = [];
  if (i.serial) d.push('#' + esc(i.serial));
  if (i.projected) d.push('<span class="neg">projected</span>');
  if (i.hyped) d.push('hyped');
  if (i.rare) d.push('rare');
  if (i.hold) d.push('hold');
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
    '<tr data-asset="' + esc(i.assetId) + '" data-titulo="' + esc(i.nome) +
    '" data-nome="' + esc((i.nome + ' ' + i.sigla).toLowerCase()) +
    '" data-value="' + i.valorEfetivo + '" data-rap="' + i.rap +
    '" data-dem="' + i.demanda + '" data-tend="' + i.tendencia + '">' +
    '<td class="item"><div class="cel">' + img + '<div><span class="nome">' + esc(i.nome) + '</span>' +
    (det ? '<span class="det">' + det + '</span>' : '') + '</div></div></td>' +
    '<td class="num">' + (i.value != null ? a.fmtNum(i.value) : '<span class="sub">—</span>') + '</td>' +
    '<td class="num">' + a.fmtNum(i.rap) + '</td>' +
    '<td class="' + corDemanda(i.demanda) + '">' + esc(a.demandaCurta(i.demanda)) + '</td>' +
    '<td class="' + corTendencia(i.tendencia) + '">' + esc(a.tendenciaCurta(i.tendencia)) + '</td>' +
    '</tr>'
  );
}

function listaRiscos(riscos) {
  if (!riscos.length) return '<p class="vazio">Nenhum item em risco.</p>';
  return (
    '<ul class="lista">' +
    riscos
      .map(
        (r) =>
          '<li><b>' + esc(r.item.nome) + '</b>: ' +
          r.motivos.map((m) => '<span class="' + COR_GRAVIDADE[m.grav] + '">' + esc(m.texto) + '</span>').join(', ') +
          '</li>'
      )
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
    '<ul class="lista">' +
    c.mudancas
      .map(
        (m) =>
          '<li><b>' + esc(m.item.nome) + '</b>: ' +
          m.mudancas.map((x) => '<span class="' + COR_DIRECAO[x.dir] + '">' + esc(x.texto) + '</span>').join('; ') +
          '</li>'
      )
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

function linhaComparacao(c, semBase) {
  return c.base ? 'Comparando com ' + a.fmtData(c.base.data) : semBase;
}

function gerar(r, cfg) {
  const t = r.totais;
  const u = r.comparacoes.ultima;
  const d = r.comparacoes.dia;
  const meta = [
    'Atualizado ' + a.fmtData(r.agora),
    r.fonte === 'rolimons' ? "itens via Rolimon's" : 'itens via Roblox',
  ].join(' · ');

  const SEM_ULTIMA = 'Primeira consulta, sem comparação ainda.';
  const SEM_DIA = 'Histórico de 24h ainda em formação. Ele cresce a cada uso do painel e do widget.';

  const avisos = r.avisos.map((x) => '<p class="aviso">' + esc(x) + '</p>').join('');
  const contagem = (c) => (c.mudancas ? '<span class="n">' + c.mudancas.length + '</span>' : '');

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Inventário</title>
<style>
:root{--topo:#f6f2fc;--bg:#f6f2fc;--fg:#2a1d3d;--sub:#7a6a94;--rotulo:#7b5cb8;--linha:#ddd2ef;--cab:#ece4f8;--on:#ffffff;--pos:#1f8a5b;--neg:#c23a5c;--warn:#a8660f;--link:#6f4bd8}
@media (prefers-color-scheme: dark){:root{--topo:#2a1d3d;--bg:#1a1226;--fg:#efe7ff;--sub:#8f80a8;--rotulo:#b9a3e3;--linha:#43335e;--cab:#33254a;--on:#4a3870;--pos:#8fe0b8;--neg:#ff9db0;--warn:#f5c98a;--link:#c3a6ff}}
html{background:var(--bg)}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:linear-gradient(180deg,var(--topo),var(--bg) 640px) no-repeat,var(--bg);color:var(--fg);font:15px/1.35 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;font-variant-numeric:tabular-nums;padding:max(14px,env(safe-area-inset-top)) 16px 32px}
.oculto{display:none!important}
.topo{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
h1{font-size:22px;font-weight:700;letter-spacing:-.01em;margin:0}
.user{color:var(--sub)}
.meta{color:var(--sub);font-size:12px;margin:2px 0 0}
.seg{display:flex;margin:14px 0 0;background:var(--cab);border-radius:9px;padding:2px}
.seg button{flex:1;font:inherit;font-size:13px;font-weight:500;padding:6px 0;border:0;border-radius:7px;background:none;color:var(--fg)}
.seg button.on{background:var(--on);box-shadow:0 1px 3px rgba(0,0,0,.15)}
.comp{color:var(--sub);font-size:12px;margin:6px 0 0}
.resumo{display:flex;margin:12px 0 0;border-top:1px solid var(--linha);border-bottom:1px solid var(--linha)}
.resumo>div{flex:1;padding:10px 0 10px 12px;border-left:1px solid var(--linha)}
.resumo>div:first-child{border-left:0;padding-left:0}
.rot{display:block;font-size:11px;color:var(--rotulo);text-transform:uppercase;letter-spacing:.05em}
.val{display:block;font-size:19px;font-weight:600;margin-top:1px}
.var{font-size:12px;font-weight:500}
h2{font-size:12px;font-weight:600;color:var(--rotulo);text-transform:uppercase;letter-spacing:.06em;margin:28px 0 6px}
h2 .n{color:var(--fg);margin-left:4px}
.aviso{color:var(--warn);font-size:13px;margin:10px 0 0}
.lista{list-style:none;margin:0;padding:0;border-top:1px solid var(--linha)}
.lista li{padding:8px 0;border-bottom:1px solid var(--linha);font-size:14px}
.lista b{font-weight:600}
.vazio{color:var(--sub);font-size:14px;margin:4px 0}
.pos{color:var(--pos)}.neg{color:var(--neg)}.warn{color:var(--warn)}.sub{color:var(--sub)}
input[type=search]{width:100%;font:inherit;padding:7px 10px;margin:0 0 8px;border:1px solid var(--linha);border-radius:8px;background:var(--cab);color:var(--fg);-webkit-appearance:none}
table{width:100%;border-collapse:collapse;font-size:13px}
th{position:sticky;top:0;background:var(--cab);color:var(--rotulo);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:7px 6px;border-bottom:1px solid var(--linha);white-space:nowrap;-webkit-user-select:none;user-select:none}
th[data-ordem=desc]::after{content:" ↓"}
th[data-ordem=asc]::after{content:" ↑"}
th.num,td.num{text-align:right}
td{padding:7px 6px;border-bottom:1px solid var(--linha);vertical-align:top;white-space:nowrap}
td.item{white-space:normal;width:100%}
tbody tr{-webkit-tap-highlight-color:transparent}
tbody tr:active td{background:var(--cab)}
.cel{display:flex;gap:8px;align-items:flex-start}
.thumb{width:32px;height:32px;border-radius:6px;flex:none;background:var(--cab);object-fit:cover;display:block}
.nome{display:block;font-weight:500}
.det{display:block;font-size:11px;color:var(--sub);margin-top:1px}
tfoot td{font-weight:600;border-bottom:0;border-top:1px solid var(--sub)}
details{margin-top:32px;font-size:12px;color:var(--sub)}
textarea{width:100%;height:240px;margin-top:8px;font:11px/1.4 ui-monospace,Menlo,monospace;background:var(--cab);color:var(--fg);border:1px solid var(--linha);border-radius:8px;padding:8px}
footer{margin-top:16px;color:var(--sub);font-size:11px}
.fundo{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.35)}
.folha{position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));background:var(--cab);border-radius:14px;overflow:hidden}
.folha p{margin:0;padding:12px 16px;text-align:center;font-size:13px;color:var(--sub);border-bottom:1px solid var(--linha)}
.folha a,.folha button{display:block;width:100%;padding:15px;text-align:center;font:inherit;font-size:17px;color:var(--link);text-decoration:none;background:none;border:0;border-bottom:1px solid var(--linha)}
.folha .cancelar{font-weight:600;border-bottom:0}
</style></head><body>

<div class="topo"><h1>Inventário</h1><span class="user">${esc(r.usuario.nome)}</span></div>
<p class="meta">${meta}</p>

<div class="seg">
  <button data-p="ultima" class="on">Última consulta</button>
  <button data-p="dia">24h</button>
</div>
<p class="comp">${porPeriodo(linhaComparacao(u, SEM_ULTIMA), linhaComparacao(d, 'Sem histórico de 24h ainda.'))}</p>

<div class="resumo">
  <div><span class="rot">Value</span><span class="val">${a.fmtNum(t.value)}</span>${porPeriodo(variacao(u.var && u.var.value), variacao(d.var && d.var.value))}</div>
  <div><span class="rot">RAP</span><span class="val">${a.fmtNum(t.rap)}</span>${porPeriodo(variacao(u.var && u.var.rap), variacao(d.var && d.var.rap))}</div>
  <div><span class="rot">Itens</span><span class="val">${t.qtd}</span></div>
</div>
${avisos}

<h2>Alertas<span class="n">${r.riscos.length}</span></h2>
${listaRiscos(r.riscos)}

<h2>Mudanças${porPeriodo(contagem(u), contagem(d))}</h2>
<div data-periodo="ultima">${listaMudancas(u, cfg, SEM_ULTIMA)}</div>
<div data-periodo="dia" class="oculto">${listaMudancas(d, cfg, SEM_DIA)}</div>

<h2>Itens</h2>
<input id="busca" type="search" placeholder="Buscar" autocomplete="off">
<table id="tabela">
  <thead><tr>
    <th data-campo="nome">Item</th>
    <th data-campo="value" class="num" data-ordem="desc">Value</th>
    <th data-campo="rap" class="num">RAP</th>
    <th data-campo="dem">Dem.</th>
    <th data-campo="tend">Tend.</th>
  </tr></thead>
  <tbody>${r.itens.map((i) => linhaItem(i, r.miniaturas[String(i.assetId)])).join('')}</tbody>
  <tfoot><tr><td>Total</td><td class="num">${a.fmtNum(t.value)}</td><td class="num">${a.fmtNum(t.rap)}</td><td></td><td></td></tr></tfoot>
</table>

<details>
  <summary>Diagnóstico</summary>
  <textarea readonly>${esc(JSON.stringify(r.diag, null, 2))}</textarea>
</details>

<footer>v${esc(r.versao)} · ${esc(String(r.sha || '').slice(0, 7))} · dados: Rolimon's e Roblox · somente leitura</footer>

<div id="fundo" class="fundo oculto"></div>
<div id="folha" class="folha oculto">
  <p id="folha-nome"></p>
  <a id="link-rol" href="#">Ver no Rolimon's</a>
  <a id="link-rbx" href="#">Ver no Roblox</a>
  <button id="cancelar" class="cancelar">Cancelar</button>
</div>

<script>
(function(){
  var tbody = document.querySelector('#tabela tbody');
  var cabecalhos = document.querySelectorAll('#tabela th');
  var busca = document.getElementById('busca');
  var estado = { campo: 'value', dir: 'desc' };

  // Seletor de período (última consulta / 24h)
  function periodo(p){
    var blocos = document.querySelectorAll('[data-periodo]');
    for (var k = 0; k < blocos.length; k++) {
      blocos[k].classList.toggle('oculto', blocos[k].getAttribute('data-periodo') !== p);
    }
    var botoes = document.querySelectorAll('.seg button');
    for (var k = 0; k < botoes.length; k++) {
      botoes[k].classList.toggle('on', botoes[k].getAttribute('data-p') === p);
    }
    try { localStorage.setItem('periodo', p); } catch (e) {}
  }
  var botoesSeg = document.querySelectorAll('.seg button');
  for (var k = 0; k < botoesSeg.length; k++) {
    botoesSeg[k].addEventListener('click', function(){ periodo(this.getAttribute('data-p')); });
  }
  try { var salvo = localStorage.getItem('periodo'); if (salvo === 'dia') periodo('dia'); } catch (e) {}

  // Ordenação pelo cabeçalho
  function ordenar(campo){
    if (estado.campo === campo) estado.dir = estado.dir === 'desc' ? 'asc' : 'desc';
    else { estado.campo = campo; estado.dir = campo === 'nome' ? 'asc' : 'desc'; }
    var linhas = Array.prototype.slice.call(tbody.rows);
    linhas.sort(function(x, y){
      var p = x.getAttribute('data-' + campo), q = y.getAttribute('data-' + campo);
      var c = campo === 'nome' ? p.localeCompare(q) : Number(p) - Number(q);
      return estado.dir === 'asc' ? c : -c;
    });
    linhas.forEach(function(l){ tbody.appendChild(l); });
    for (var k = 0; k < cabecalhos.length; k++) {
      if (cabecalhos[k].getAttribute('data-campo') === campo) cabecalhos[k].setAttribute('data-ordem', estado.dir);
      else cabecalhos[k].removeAttribute('data-ordem');
    }
  }
  for (var k = 0; k < cabecalhos.length; k++) {
    cabecalhos[k].addEventListener('click', function(){ ordenar(this.getAttribute('data-campo')); });
  }

  // Busca
  busca.addEventListener('input', function(){
    var q = busca.value.trim().toLowerCase();
    for (var k = 0; k < tbody.rows.length; k++) {
      var l = tbody.rows[k];
      l.style.display = l.getAttribute('data-nome').indexOf(q) >= 0 ? '' : 'none';
    }
  });

  // Menu ao tocar no item
  var fundo = document.getElementById('fundo');
  var folha = document.getElementById('folha');
  function fechar(){ fundo.classList.add('oculto'); folha.classList.add('oculto'); }
  tbody.addEventListener('click', function(ev){
    var tr = ev.target.closest('tr');
    if (!tr) return;
    var id = tr.getAttribute('data-asset');
    document.getElementById('folha-nome').textContent = tr.getAttribute('data-titulo');
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
</body></html>`;
}

module.exports = { gerar };
