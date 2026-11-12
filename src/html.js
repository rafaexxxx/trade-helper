// Monta a página HTML do painel (tema claro/escuro automático, segue o iPhone).
const a = require('analise');

function esc(s) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => mapa[c]);
}

function classeDemanda(d) {
  if (d === 0) return 'ruim';
  if (d === 1) return 'alerta';
  if (d >= 3) return 'bom';
  return '';
}

function classeTendencia(t) {
  if (t === 0) return 'ruim';
  if (t === 3) return 'bom';
  if (t === 1 || t === 4) return 'alerta';
  return '';
}

function variacao(v) {
  if (!v || v.pct == null) return '';
  const cls = v.pct > 0 ? 'bom' : v.pct < 0 ? 'ruim' : '';
  const seta = v.pct > 0 ? '▲' : v.pct < 0 ? '▼' : '•';
  return '<span class="var ' + cls + '">' + seta + ' ' + a.fmtPctSinal(v.pct) + '</span>';
}

function tags(i) {
  const b = [];
  if (i.serial) b.push('<span class="tag">#' + esc(i.serial) + '</span>');
  if (i.projected) b.push('<span class="tag ruim">Projected</span>');
  if (i.hyped) b.push('<span class="tag alerta">Hyped</span>');
  if (i.rare) b.push('<span class="tag azul">Rare</span>');
  if (i.value == null && !i.semRolimons) b.push('<span class="tag">Sem value (usa RAP)</span>');
  if (i.semRolimons) b.push('<span class="tag alerta">Fora do Rolimon\'s</span>');
  if (i.emEspera) b.push('<span class="tag">Em espera</span>');
  return b.join('');
}

function cartaoItem(i) {
  return (
    '<div class="item" data-nome="' + esc((i.nome + ' ' + i.sigla).toLowerCase()) +
    '" data-value="' + i.valorEfetivo + '" data-rap="' + i.rap + '" data-serial="' + (i.serial || 999999999) + '">' +
    '<div class="item-topo"><span class="nome">' + esc(i.nome) + '</span>' +
    (i.sigla ? '<span class="sigla">' + esc(i.sigla) + '</span>' : '') + '</div>' +
    '<div class="tags">' + tags(i) + '</div>' +
    '<div class="grade">' +
    '<div><small>Value</small><b>' + (i.value != null ? a.fmtNum(i.value) : '—') + '</b></div>' +
    '<div><small>RAP</small><b>' + a.fmtNum(i.rap) + '</b></div>' +
    '<div><small>Demanda</small><b class="' + classeDemanda(i.demanda) + '">' + esc(a.rotuloDemanda(i.demanda)) + '</b></div>' +
    '<div><small>Tendência</small><b class="' + classeTendencia(i.tendencia) + '">' + esc(a.rotuloTendencia(i.tendencia)) + '</b></div>' +
    '</div></div>'
  );
}

function secaoRiscos(riscos) {
  if (!riscos.length) return '<p class="vazio">Nenhum item em risco pelos critérios atuais. ✅</p>';
  return riscos
    .map(
      (r) =>
        '<div class="linha"><div class="linha-topo"><span class="nome">' + esc(r.item.nome) +
        '</span><span class="mini">' + a.fmtNum(r.item.valorEfetivo) + '</span></div><ul>' +
        r.motivos.map((m) => '<li class="' + m.grav + '">' + esc(m.texto) + '</li>').join('') +
        '</ul></div>'
    )
    .join('');
}

function secaoMudancas(mudancas, anterior, cfg) {
  if (mudancas == null) {
    return '<p class="vazio">Esta é a primeira consulta. A comparação começa na próxima vez que você abrir o painel.</p>';
  }
  if (!mudancas.length) {
    return '<p class="vazio">Nada mudou ≥ ' + cfg.LIMITE_MUDANCA_PCT + '% desde ' + a.fmtData(anterior.data) + '.</p>';
  }
  return mudancas
    .map(
      (m) =>
        '<div class="linha"><div class="linha-topo"><span class="nome">' + esc(m.item.nome) + '</span></div><ul>' +
        m.mudancas.map((x) => '<li class="' + x.dir + '">' + esc(x.texto) + '</li>').join('') +
        '</ul></div>'
    )
    .join('');
}

function gerar(r, cfg) {
  const t = r.totais;
  const v = r.varTotais;
  const sub =
    '@' + esc(r.usuario.nome) + ' · atualizado ' + a.fmtData(r.agora) +
    (r.anterior ? ' · comparando com ' + a.fmtData(r.anterior.data) : '');

  const avisos = r.avisos.length
    ? '<div class="avisos">' + r.avisos.map((x) => '<p>⚠️ ' + esc(x) + '</p>').join('') + '</div>'
    : '';

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Trade Helper</title>
<style>
:root{--bg:#f4f5f7;--card:#ffffff;--txt:#14171a;--sub:#5f6b76;--borda:#e3e6ea;--bom:#1a8a4a;--ruim:#c62828;--alerta:#b26a00;--azul:#1f6feb;--tag:#eef0f3}
@media (prefers-color-scheme: dark){:root{--bg:#0e1116;--card:#171b22;--txt:#e8ecf1;--sub:#8b96a3;--borda:#262c36;--bom:#3fb96f;--ruim:#ff6b6b;--alerta:#f0b429;--azul:#58a6ff;--tag:#222833}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font:15px/1.4 -apple-system,system-ui,sans-serif;padding:16px 14px 40px;padding-top:max(16px,env(safe-area-inset-top))}
h1{font-size:22px;margin:0}
h2{font-size:17px;margin:26px 0 10px}
.sub{color:var(--sub);font-size:13px;margin-top:2px}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
.card{background:var(--card);border:1px solid var(--borda);border-radius:14px;padding:12px}
.card.largo{grid-column:1/-1}
.card small{color:var(--sub);font-size:12px;display:block}
.card b{font-size:22px;display:block;margin:2px 0}
.var{font-size:13px;font-weight:600}
.bom{color:var(--bom)}.ruim{color:var(--ruim)}.alerta{color:var(--alerta)}.azul{color:var(--azul)}
.avisos{margin-top:12px;background:var(--card);border:1px solid var(--alerta);border-radius:12px;padding:8px 12px;font-size:13px}
.avisos p{margin:4px 0}
.linha,.item{background:var(--card);border:1px solid var(--borda);border-radius:12px;padding:10px 12px;margin-bottom:8px}
.linha-topo,.item-topo{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.nome{font-weight:600}
.mini,.sigla{color:var(--sub);font-size:12px;white-space:nowrap}
ul{margin:6px 0 0;padding-left:18px}
li{font-size:14px;margin:2px 0}
li.alta,li.desce{color:var(--ruim)}li.media{color:var(--alerta)}li.baixa{color:var(--sub)}li.sobe{color:var(--bom)}
.vazio{color:var(--sub);font-size:14px}
.tags{margin:6px 0 4px;display:flex;flex-wrap:wrap;gap:4px}
.tag{background:var(--tag);border-radius:6px;padding:1px 7px;font-size:12px}
.grade{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-top:4px}
.grade small{color:var(--sub);font-size:11px;display:block}
.grade b{font-size:13px}
.controles{display:flex;gap:8px;margin-bottom:10px}
.controles input,.controles select{flex:1;font-size:15px;padding:8px 10px;border-radius:10px;border:1px solid var(--borda);background:var(--card);color:var(--txt)}
details{margin-top:28px;color:var(--sub);font-size:13px}
textarea{width:100%;height:220px;font:12px ui-monospace,monospace;background:var(--card);color:var(--txt);border:1px solid var(--borda);border-radius:10px;padding:8px}
footer{margin-top:20px;color:var(--sub);font-size:12px;text-align:center}
</style></head><body>

<h1>📦 Trade Helper</h1>
<div class="sub">${sub}</div>
${avisos}

<div class="cards">
  <div class="card"><small>Value total</small><b>${a.fmtNum(t.value)}</b>${variacao(v && v.value)}</div>
  <div class="card"><small>RAP total</small><b>${a.fmtNum(t.rap)}</b>${variacao(v && v.rap)}</div>
  <div class="card largo"><small>Itens</small><b>${t.qtd}</b><span class="sub">${t.comValue} com value no Rolimon's · ${t.qtd - t.comValue} usam RAP</span></div>
</div>

<h2>🚨 Alertas de risco (${r.riscos.length})</h2>
${secaoRiscos(r.riscos)}

<h2>🔄 Mudanças relevantes${r.mudancas ? ' (' + r.mudancas.length + ')' : ''}</h2>
${secaoMudancas(r.mudancas, r.anterior, cfg)}

<h2>📋 Todos os itens</h2>
<div class="controles">
  <input id="busca" type="search" placeholder="Buscar item…" autocomplete="off">
  <select id="ordem">
    <option value="value">Maior value</option>
    <option value="rap">Maior RAP</option>
    <option value="nome">Nome (A–Z)</option>
    <option value="serial">Menor serial</option>
  </select>
</div>
<div id="lista">${r.itens.map(cartaoItem).join('')}</div>

<details>
  <summary>🛠️ Diagnóstico (para enviar ao Claude se algo der errado)</summary>
  <p>Toque no texto, selecione tudo e copie.</p>
  <textarea readonly>${esc(JSON.stringify(r.diag, null, 2))}</textarea>
</details>

<footer>Trade Helper v${esc(r.versao)} · ${esc(String(r.sha || '').slice(0, 7))} · somente leitura</footer>

<script>
(function(){
  var busca = document.getElementById('busca');
  var ordem = document.getElementById('ordem');
  var lista = document.getElementById('lista');
  function filtrar(){
    var q = busca.value.trim().toLowerCase();
    var itens = lista.querySelectorAll('.item');
    for (var k = 0; k < itens.length; k++) {
      itens[k].style.display = itens[k].getAttribute('data-nome').indexOf(q) >= 0 ? '' : 'none';
    }
  }
  function ordenar(){
    var campo = ordem.value;
    var itens = Array.prototype.slice.call(lista.querySelectorAll('.item'));
    itens.sort(function(x, y){
      if (campo === 'nome') return x.getAttribute('data-nome').localeCompare(y.getAttribute('data-nome'));
      if (campo === 'serial') return Number(x.getAttribute('data-serial')) - Number(y.getAttribute('data-serial'));
      return Number(y.getAttribute('data-' + campo)) - Number(x.getAttribute('data-' + campo));
    });
    itens.forEach(function(el){ lista.appendChild(el); });
  }
  busca.addEventListener('input', filtrar);
  ordem.addEventListener('change', ordenar);
})();
</script>
</body></html>`;
}

module.exports = { gerar };
