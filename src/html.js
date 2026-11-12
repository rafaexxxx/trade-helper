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

function linhaItem(i) {
  const det = detalhes(i);
  return (
    '<tr data-nome="' + esc((i.nome + ' ' + i.sigla).toLowerCase()) +
    '" data-value="' + i.valorEfetivo + '" data-rap="' + i.rap +
    '" data-dem="' + i.demanda + '" data-tend="' + i.tendencia + '">' +
    '<td class="item"><span class="nome">' + esc(i.nome) + '</span>' +
    (det ? '<span class="det">' + det + '</span>' : '') + '</td>' +
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

function listaMudancas(mudancas, anterior, cfg) {
  if (mudancas == null) return '<p class="vazio">Primeira consulta, sem comparação ainda.</p>';
  if (!mudancas.length) {
    return '<p class="vazio">Nada acima de ' + cfg.LIMITE_MUDANCA_PCT + '% desde ' + a.fmtData(anterior.data) + '.</p>';
  }
  return (
    '<ul class="lista">' +
    mudancas
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

function nomes(lista) {
  const max = 5;
  const parte = lista.slice(0, max).map(esc).join(', ');
  return lista.length > max ? parte + ' e mais ' + (lista.length - max) : parte;
}

function plural(n, um, varios) {
  return n + ' ' + (n === 1 ? um : varios);
}

function blocoDivergencia(d) {
  if (!d) return '';
  const p = [];
  if (d.soRoblox.length) {
    p.push('O Roblox ainda lista ' + plural(d.soRoblox.length, 'item', 'itens') + " que o Rolimon's não tem: " + nomes(d.soRoblox) + '.');
  }
  if (d.soRolimons.length) {
    p.push("O Rolimon's lista " + plural(d.soRolimons.length, 'item', 'itens') + ' que o Roblox não retornou: ' + nomes(d.soRolimons) + '.');
  }
  return p.map((x) => '<p class="aviso">' + x + '</p>').join('');
}

function gerar(r, cfg) {
  const t = r.totais;
  const v = r.varTotais;
  const meta = [
    'Atualizado ' + a.fmtData(r.agora),
    r.fonte === 'rolimons' ? "itens via Rolimon's" : 'itens via Roblox',
    r.anterior ? 'comparado com ' + a.fmtData(r.anterior.data) : '',
  ].filter(Boolean).join(' · ');

  const avisos = r.avisos.map((x) => '<p class="aviso">' + esc(x) + '</p>').join('');

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Inventário</title>
<style>
:root{--bg:#ffffff;--fg:#1c1c1e;--sub:#6e6e73;--linha:#e5e5ea;--cab:#f2f2f7;--pos:#248a3d;--neg:#d70015;--warn:#b25000}
@media (prefers-color-scheme: dark){:root{--bg:#000000;--fg:#f2f2f7;--sub:#98989d;--linha:#2c2c2e;--cab:#1c1c1e;--pos:#30d158;--neg:#ff453a;--warn:#ff9f0a}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.35 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;font-variant-numeric:tabular-nums;padding:max(14px,env(safe-area-inset-top)) 16px 32px}
.topo{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
h1{font-size:22px;font-weight:700;letter-spacing:-.01em;margin:0}
.user{color:var(--sub)}
.meta{color:var(--sub);font-size:12px;margin:2px 0 0}
.resumo{display:flex;margin:16px 0 0;border-top:1px solid var(--linha);border-bottom:1px solid var(--linha)}
.resumo>div{flex:1;padding:10px 0 10px 12px;border-left:1px solid var(--linha)}
.resumo>div:first-child{border-left:0;padding-left:0}
.rot{display:block;font-size:11px;color:var(--sub);text-transform:uppercase;letter-spacing:.05em}
.val{display:block;font-size:19px;font-weight:600;margin-top:1px}
.var{font-size:12px;font-weight:500}
h2{font-size:12px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:.06em;margin:28px 0 6px}
h2 .n{color:var(--fg);margin-left:4px}
.aviso{color:var(--warn);font-size:13px;margin:10px 0 0}
.lista{list-style:none;margin:0;padding:0;border-top:1px solid var(--linha)}
.lista li{padding:8px 0;border-bottom:1px solid var(--linha);font-size:14px}
.lista b{font-weight:600}
.vazio{color:var(--sub);font-size:14px;margin:4px 0}
.pos{color:var(--pos)}.neg{color:var(--neg)}.warn{color:var(--warn)}.sub{color:var(--sub)}
input[type=search]{width:100%;font:inherit;padding:7px 10px;margin:0 0 8px;border:1px solid var(--linha);border-radius:8px;background:var(--cab);color:var(--fg);-webkit-appearance:none}
table{width:100%;border-collapse:collapse;font-size:13px}
th{position:sticky;top:0;background:var(--cab);color:var(--sub);font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:7px 6px;border-bottom:1px solid var(--linha);white-space:nowrap;-webkit-user-select:none;user-select:none}
th[data-ordem=desc]::after{content:" ↓"}
th[data-ordem=asc]::after{content:" ↑"}
th.num,td.num{text-align:right}
td{padding:7px 6px;border-bottom:1px solid var(--linha);vertical-align:top;white-space:nowrap}
td.item{white-space:normal;width:100%}
.nome{display:block;font-weight:500}
.det{display:block;font-size:11px;color:var(--sub);margin-top:1px}
tfoot td{font-weight:600;border-bottom:0;border-top:1px solid var(--sub)}
details{margin-top:32px;font-size:12px;color:var(--sub)}
summary{cursor:pointer}
textarea{width:100%;height:240px;margin-top:8px;font:11px/1.4 ui-monospace,Menlo,monospace;background:var(--cab);color:var(--fg);border:1px solid var(--linha);border-radius:8px;padding:8px}
footer{margin-top:16px;color:var(--sub);font-size:11px}
</style></head><body>

<div class="topo"><h1>Inventário</h1><span class="user">${esc(r.usuario.nome)}</span></div>
<p class="meta">${meta}</p>

<div class="resumo">
  <div><span class="rot">Value</span><span class="val">${a.fmtNum(t.value)}</span>${variacao(v && v.value)}</div>
  <div><span class="rot">RAP</span><span class="val">${a.fmtNum(t.rap)}</span>${variacao(v && v.rap)}</div>
  <div><span class="rot">Itens</span><span class="val">${t.qtd}</span></div>
</div>
${blocoDivergencia(r.divergencia)}
${avisos}

<h2>Alertas<span class="n">${r.riscos.length}</span></h2>
${listaRiscos(r.riscos)}

<h2>Mudanças${r.mudancas ? '<span class="n">' + r.mudancas.length + '</span>' : ''}</h2>
${listaMudancas(r.mudancas, r.anterior, cfg)}

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
  <tbody>${r.itens.map(linhaItem).join('')}</tbody>
  <tfoot><tr><td>Total</td><td class="num">${a.fmtNum(t.value)}</td><td class="num">${a.fmtNum(t.rap)}</td><td></td><td></td></tr></tfoot>
</table>

<details>
  <summary>Diagnóstico</summary>
  <textarea readonly>${esc(JSON.stringify(r.diag, null, 2))}</textarea>
</details>

<footer>v${esc(r.versao)} · ${esc(String(r.sha || '').slice(0, 7))} · somente leitura</footer>

<script>
(function(){
  var tbody = document.querySelector('#tabela tbody');
  var cabecalhos = document.querySelectorAll('#tabela th');
  var busca = document.getElementById('busca');
  var estado = { campo: 'value', dir: 'desc' };

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

  busca.addEventListener('input', function(){
    var q = busca.value.trim().toLowerCase();
    for (var k = 0; k < tbody.rows.length; k++) {
      var l = tbody.rows[k];
      l.style.display = l.getAttribute('data-nome').indexOf(q) >= 0 ? '' : 'none';
    }
  });
})();
</script>
</body></html>`;
}

module.exports = { gerar };
