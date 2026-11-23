// Card do item (v6.9), no estilo dos bots de trade do Discord.
// Ao tocar num item (folha do Inventário e do Avaliar), a página pede pela ponte
// (PONTE + 'cartao?id=<assetId>'); o Scriptable busca a página do item no
// Rolimon's (SÓ nesse toque, guardada por CARTAO_CACHE_MIN), faz as contas aqui
// e devolve tudo pronto. A página só desenha.
//
// Blocos (cada informação num lugar só: RAP, value e demanda já estão na linha):
// - OP para dar / OP para pedir: réguas do veredito × demanda do item.
// - Best Price e Depois da venda: RAP + (Best − RAP) / 10 (regra do Roblox).
// - Vendas por dia (média de 30 dias) e RSI-21 do RAP.
// - Gráfico do RAP dos últimos CARTAO_DIAS dias, com o RSI embaixo.
const cfg = require('config');
const a = require('analise');
const api = require('api');

// ---------- Leitura da página do Rolimon's ----------
// Valor de "var <nome> = ...;" no script da página: objeto/lista (pelo par de
// chaves, respeitando textos entre aspas) ou número/texto até o ";".
// undefined = a variável não existe; null = existe, mas não deu para ler.
function extrairVar(texto, nome) {
  const m = new RegExp('var\\s+' + nome + '\\s*=\\s*').exec(texto);
  if (!m) return undefined;
  const i = m.index + m[0].length;
  const c = texto.charAt(i);
  if (c === '{' || c === '[') {
    let prof = 0;
    let aspas = null;
    let barra = false;
    for (let j = i; j < texto.length; j++) {
      const ch = texto.charAt(j);
      if (aspas) {
        if (barra) barra = false;
        else if (ch === '\\') barra = true;
        else if (ch === aspas) aspas = null;
        continue;
      }
      if (ch === '"' || ch === "'") aspas = ch;
      else if (ch === '{' || ch === '[') prof++;
      else if (ch === '}' || ch === ']') {
        prof--;
        if (prof === 0) {
          try {
            return JSON.parse(texto.slice(i, j + 1));
          } catch (e) {
            return null;
          }
        }
      }
    }
    return null;
  }
  let fim = texto.length;
  for (const sep of [';', '\n', '<']) {
    const k = texto.indexOf(sep, i);
    if (k >= 0 && k < fim) fim = k;
  }
  const bruto = texto.slice(i, fim).trim().replace(/^["']|["']$/g, '');
  const n = Number(bruto);
  return bruto !== '' && isFinite(n) ? n : bruto || null;
}

// Série [[tempo em ms, RAP], ...] do history_data, em ordem de tempo.
// Aceita { timestamp: [...], rap: [...] } (o mais provável) ou [[t, rap], ...].
function serieDoHistorico(h) {
  const s = [];
  function por(t, v) {
    t = Number(t);
    v = Number(v);
    // RAP 0, -1 ou vazio (null vira 0) = ponto sem dado: fica de fora.
    if (!(t > 0) || !(v > 0)) return;
    s.push([t < 1e12 ? t * 1000 : t, v]);
  }
  if (Array.isArray(h)) {
    for (const p of h) if (Array.isArray(p)) por(p[0], p[1]);
  } else if (h && typeof h === 'object') {
    const tempos = h.timestamp || h.timestamps || h.time || h.t;
    const raps = h.rap || h.raps;
    if (!Array.isArray(tempos) || !Array.isArray(raps)) return null;
    const n = Math.min(tempos.length, raps.length);
    for (let k = 0; k < n; k++) por(tempos[k], raps[k]);
  } else {
    return null;
  }
  s.sort((x, y) => x[0] - y[0]);
  return s.length ? s : null;
}

// Último best price da lista do history_data (se houver).
function ultimoBest(h) {
  const l = h && !Array.isArray(h) && typeof h === 'object' ? h.best_price : null;
  if (!Array.isArray(l)) return null;
  for (let k = l.length - 1; k >= 0; k--) if (Number(l[k]) > 0) return Number(l[k]);
  return null;
}

// RSI de Wilder com n pontos. null onde ainda não há pontos suficientes.
// Sem altas nem quedas (RAP parado) = 50.
function rsi(valores, n) {
  const r = valores.map(() => null);
  if (valores.length <= n) return r;
  const calc = (g, p) => (p === 0 ? (g === 0 ? 50 : 100) : 100 - 100 / (1 + g / p));
  let g = 0;
  let p = 0;
  for (let k = 1; k <= n; k++) {
    const d = valores[k] - valores[k - 1];
    if (d > 0) g += d;
    else p -= d;
  }
  g /= n;
  p /= n;
  r[n] = calc(g, p);
  for (let k = n + 1; k < valores.length; k++) {
    const d = valores[k] - valores[k - 1];
    g = (g * (n - 1) + Math.max(d, 0)) / n;
    p = (p * (n - 1) + Math.max(-d, 0)) / n;
    r[k] = calc(g, p);
  }
  return r;
}

// Recorte dos últimos `dias` (com o ponto anterior, para a linha começar na borda)
// e no máximo `max` pontos (o último sempre fica). Saída: [[t, rap, rsi], ...].
function recortar(serie, rsis, dias, max) {
  const desde = Date.now() - dias * 86400000;
  let ini = serie.findIndex((p) => p[0] >= desde);
  if (ini < 0) ini = serie.length - 1;
  if (ini > 0) ini--;
  const idx = [];
  for (let k = ini; k < serie.length; k++) idx.push(k);
  let escolhidos = idx;
  if (idx.length > max) {
    escolhidos = [];
    const passo = (idx.length - 1) / (max - 1);
    for (let q = 0; q < max; q++) escolhidos.push(idx[Math.round(q * passo)]);
  }
  return escolhidos.map((k) => [serie[k][0], serie[k][1], rsis[k] == null ? null : Math.round(rsis[k] * 10) / 10]);
}

// ---------- Contas ----------
function arredondar(robux, base) {
  return base >= 1000 ? Math.round(robux / 10) * 10 : Math.round(robux);
}

// OP do item sobre o value base (value; sem value = RAP).
// dar = quanto pagar a mais para PEGAR o item (seu upgrade);
// pedir = quanto pedir a mais quando você DÁ o item (seu downgrade).
function opDoItem(base, demanda) {
  const tabela = cfg.CARTAO_OP_DEMANDA_MULT || {};
  const mult = typeof tabela[demanda] === 'number' ? tabela[demanda] : 1;
  const up = cfg.VEREDITO_UPGRADE_PCT;
  const down = cfg.VEREDITO_DOWNGRADE_PCT;
  const dar = [0, -up[3] * mult];
  const pedir = [down[2] * mult, down[3] * mult];
  const robux = (l) => l.map((p) => arredondar((base * p) / 100, base));
  return {
    base,
    mult,
    demanda: demanda >= 0 ? a.rotuloDemanda(demanda) : null,
    dar: { pct: dar, robux: robux(dar) },
    pedir: { pct: pedir, robux: robux(pedir) },
  };
}

function kb(texto) {
  return Math.round((texto.length / 1024) * 10) / 10;
}

// Monta o card de um item. Nunca lança erro: o que faltar vai em `faltou`
// (o card mostra "sem dado" naquele bloco) e o resumo vai em `diag`.
async function carregar(assetId, rolimons) {
  const id = String(assetId);
  const linha = rolimons ? rolimons[id] : null;
  const rap = Array.isArray(linha) && typeof linha[2] === 'number' && linha[2] >= 0 ? linha[2] : null;
  const value = Array.isArray(linha) && typeof linha[3] === 'number' && linha[3] > 0 ? linha[3] : null;
  const demanda = Array.isArray(linha) && typeof linha[5] === 'number' ? linha[5] : -1;
  const base = value != null ? value : rap;
  const res = {
    id,
    em: Date.now(),
    op: base > 0 ? opDoItem(base, demanda) : null,
    semValue: value == null,
    best: null,
    bestFonte: null,
    depois: null,
    vendasDia: null,
    rsiAtual: null,
    serie: null,
    dias: cfg.CARTAO_DIAS,
    faltou: [],
    diag: [],
    paginaOk: false,
  };

  let texto = null;
  try {
    const p = await api.buscarPaginaItem(id);
    texto = p.texto;
    res.paginaOk = true;
    res.diag.push("Rolimon's HTTP " + p.status + ' · ' + kb(texto) + ' KB · ' + p.ms + ' ms');
  } catch (e) {
    res.erroPagina = e.message || String(e);
    res.diag.push("Rolimon's: " + res.erroPagina);
  }

  if (texto) {
    const hist = extrairVar(texto, 'history_data');
    const det = extrairVar(texto, 'item_details_data');
    const vend = extrairVar(texto, 'avg_daily_sales_volume_30_days');

    // Best price: item_details_data, depois o "best_price": N da página, depois o histórico.
    let best = det && typeof det === 'object' && !Array.isArray(det) ? Number(det.best_price) : NaN;
    if (!(best > 0)) {
      const m = /"best_price"\s*:\s*(\d+)/.exec(texto);
      best = m ? Number(m[1]) : NaN;
    }
    if (!(best > 0)) best = ultimoBest(hist) || NaN;
    if (best > 0) {
      res.best = best;
      res.bestFonte = "Rolimon's";
    }

    if (typeof vend === 'number' && vend >= 0) res.vendasDia = Math.round(vend * 100) / 100;
    else res.faltou.push('vendas/dia (' + (vend === undefined ? 'variável sumiu' : 'formato: ' + String(vend).slice(0, 30)) + ')');

    const serie = serieDoHistorico(hist);
    if (serie && serie.length >= 2) {
      const rs = rsi(serie.map((p) => p[1]), cfg.CARTAO_RSI);
      res.serie = recortar(serie, rs, cfg.CARTAO_DIAS, 120);
      const ult = rs[rs.length - 1];
      res.rsiAtual = ult == null ? null : Math.round(ult * 10) / 10;
      res.diag.push('histórico ' + serie.length + ' pontos (' + res.serie.length + ' no gráfico)');
    } else {
      const chaves = hist && typeof hist === 'object' ? Object.keys(hist).slice(0, 12).join(', ') : String(hist);
      res.faltou.push('histórico (' + (hist === undefined ? 'variável sumiu' : 'campos: ' + chaves) + ')');
    }
  }

  // Reserva do Best Price: Roblox.
  if (!res.best) {
    try {
      const r = await api.buscarMenorPreco(id);
      res.best = r.preco;
      res.bestFonte = 'Roblox';
      res.diag.push('Best Price pelo Roblox · ' + r.ms + ' ms');
    } catch (e) {
      res.faltou.push('Best Price (' + (e.message || e) + ')');
    }
  }
  if (res.best && rap != null) res.depois = Math.round(rap + (res.best - rap) / 10);
  if (res.faltou.length) res.diag.push('faltou: ' + res.faltou.join('; '));
  return res;
}

// ---------- Página ----------
// O lugar do card nas folhas (um <div> vazio que a página preenche).
function lugar(id) {
  return '<div id="' + id + '" class="folha-bloco cartao oculto"></div>';
}

function css() {
  return `
.cartao{gap:10px}
.ct-grade{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.ct-c{display:flex;flex-direction:column;gap:2px;min-width:0;padding:9px 11px;border-radius:12px;background:var(--card2)}
.ct-c small{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sub)}
.ct-c b{font-size:17px;font-weight:700;font-variant-numeric:tabular-nums}
.ct-c span{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.ct-c em{font-style:normal;font-size:11px;line-height:1.3;color:var(--sub)}
.ct-c .pos{color:var(--pos)}
.ct-c .neg{color:var(--neg)}
.ct-c .sem{font-size:14px;font-weight:600;color:var(--sub)}
.ct-nota{font-size:12px;line-height:1.35;color:var(--sub)}
.ct-graf{display:flex;flex-direction:column;gap:4px}
.ct-graf small{font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--sub)}
.ct-graf svg{display:block;width:100%;height:auto;overflow:visible}
.ct-esq{height:64px;border-radius:12px;background:var(--card2);opacity:.6}
#diag-cartao{white-space:pre-wrap;overflow-wrap:anywhere}
`;
}

// Roda na página (injetada por toString: não pode usar nada de fora dela).
function paginaCartao(PONTE) {
  var atual = null;
  var timer = null;
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return Math.round(n).toLocaleString('pt-BR'); }
  function pct(p) { return (Math.round(p * 10) / 10).toLocaleString('pt-BR'); }
  function faixa(l, f) { return l[0] === l[1] ? f(l[0]) : f(l[0]) + '–' + f(l[1]); }
  function caixa(rot, valor, linha2, nota) {
    return '<div class="ct-c"><small>' + rot + '</small>' + valor +
      (linha2 ? '<span>' + linha2 + '</span>' : '') + (nota ? '<em>' + nota + '</em>' : '') + '</div>';
  }
  var SEM = '<b class="sem">sem dado</b>';

  function dataCurta(t) {
    var d = new Date(t);
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2);
  }

  // Gráfico do RAP (em cima) e do RSI (embaixo, com as linhas de 30 e 70).
  function grafico(serie) {
    var W = 320, H1 = 92, Y2 = 112, H2 = 34, E = 2;
    var t0 = serie[0][0], t1 = serie[serie.length - 1][0];
    var min = Infinity, max = -Infinity;
    serie.forEach(function (p) { if (p[1] < min) min = p[1]; if (p[1] > max) max = p[1]; });
    if (max === min) { max += 1; min -= 1; }
    function x(t) { return t1 === t0 ? W : E + ((t - t0) / (t1 - t0)) * (W - 2 * E); }
    function y(v) { return 6 + (1 - (v - min) / (max - min)) * (H1 - 12); }
    function yr(v) { return Y2 + (1 - v / 100) * H2; }
    var linha = '', area = '';
    serie.forEach(function (p, k) {
      linha += (k ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1);
    });
    area = linha + 'L' + x(t1).toFixed(1) + ' ' + H1 + 'L' + x(t0).toFixed(1) + ' ' + H1 + 'Z';
    var r = '', aberto = false;
    serie.forEach(function (p) {
      if (p[2] == null) { aberto = false; return; }
      r += (aberto ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + yr(p[2]).toFixed(1);
      aberto = true;
    });
    // Cores por style (var() em atributo de SVG não é garantido no WebKit).
    var txt = 'font-size="9" style="fill:var(--sub)"';
    var grade = 'style="stroke:var(--borda)" stroke-dasharray="3 3"';
    return '<svg viewBox="0 0 ' + W + ' ' + (Y2 + H2 + 12) + '" role="img" aria-label="Gráfico do RAP e do RSI">' +
      '<path d="' + area + '" style="fill:var(--acc-t);opacity:.12"/>' +
      '<path d="' + linha + '" style="fill:none;stroke:var(--acc-t)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<text x="' + E + '" y="9" ' + txt + '>' + num(max) + '</text>' +
      '<text x="' + E + '" y="' + (H1 - 2) + '" ' + txt + '>' + num(min) + '</text>' +
      '<line x1="0" x2="' + W + '" y1="' + yr(70) + '" y2="' + yr(70) + '" ' + grade + '/>' +
      '<line x1="0" x2="' + W + '" y1="' + yr(30) + '" y2="' + yr(30) + '" ' + grade + '/>' +
      '<rect x="0" y="' + Y2 + '" width="' + W + '" height="' + H2 + '" style="fill:none;stroke:var(--borda)"/>' +
      (r ? '<path d="' + r + '" style="fill:none;stroke:var(--sub)" stroke-width="1.4" stroke-linejoin="round"/>' : '') +
      '<text x="' + (W - E) + '" y="' + (yr(70) - 2) + '" text-anchor="end" ' + txt + '>70</text>' +
      '<text x="' + (W - E) + '" y="' + (yr(30) + 9) + '" text-anchor="end" ' + txt + '>30</text>' +
      '<text x="' + E + '" y="' + (Y2 + H2 + 11) + '" ' + txt + '>' + dataCurta(t0) + '</text>' +
      '<text x="' + (W - E) + '" y="' + (Y2 + H2 + 11) + '" text-anchor="end" ' + txt + '>' + dataCurta(t1) + '</text>' +
      '</svg>';
  }

  function rotuloRsi(v) {
    if (v == null) return '';
    if (v >= 70) return 'RAP subiu rápido (acima de 70)';
    if (v <= 30) return 'RAP caiu rápido (abaixo de 30)';
    return 'entre 30 e 70: sem exagero';
  }

  function desenhar(res) {
    if (res.erro) return '<div class="ct-nota">Não consegui montar o card (' + esc(res.erro) + ').</div>';
    var h = '';
    var op = res.op;
    h += '<div class="ct-grade">';
    if (op) {
      h += caixa('OP para dar', '<b>' + faixa(op.dar.pct, pct) + '%</b>', faixa(op.dar.robux, num), 'para pegar este item');
      h += caixa('OP para pedir', '<b>' + faixa(op.pedir.pct, pct) + '%</b>', faixa(op.pedir.robux, num), 'quando você dá este item');
    } else {
      h += caixa('OP para dar', SEM) + caixa('OP para pedir', SEM);
    }
    h += caixa('Best Price', res.best ? '<b>' + num(res.best) + '</b>' : SEM, null,
      res.best ? 'menor preço à venda' + (res.bestFonte === 'Roblox' ? ' (Roblox)' : '') : '');
    h += caixa('Depois da venda', res.depois != null ? '<b>' + num(res.depois) + '</b>' : SEM, null,
      res.depois != null ? 'RAP se vender pelo Best Price' : '');
    h += caixa('Vendas por dia', res.vendasDia != null ? '<b>' + res.vendasDia.toLocaleString('pt-BR') + '</b>' : SEM, null,
      res.vendasDia != null ? 'média de 30 dias' : '');
    h += caixa('RSI-21', res.rsiAtual != null ? '<b class="' + (res.rsiAtual >= 70 ? 'neg' : res.rsiAtual <= 30 ? 'pos' : '') + '">' + pct(res.rsiAtual) + '</b>' : SEM, null,
      rotuloRsi(res.rsiAtual));
    h += '</div>';
    if (op) {
      var aj = Math.round((op.mult - 1) * 100);
      h += '<div class="ct-nota">' + (op.demanda ? 'Ajuste pela demanda (' + esc(op.demanda) + '): ' + (aj > 0 ? '+' : '') + aj + '%' : 'Sem dado de demanda: OP sem ajuste') +
        ' · sobre o ' + (res.semValue ? 'RAP (item sem value)' : 'value') + ' de ' + num(op.base) + '.</div>';
    }
    if (res.serie && res.serie.length >= 2) {
      h += '<div class="ct-graf"><small>RAP em ' + res.dias + ' dias · RSI-21 embaixo</small>' + grafico(res.serie) + '</div>';
    } else if (res.paginaOk) {
      h += '<div class="ct-nota">Sem histórico do RAP para o gráfico.</div>';
    }
    if (!res.paginaOk) h += '<div class="ct-nota">A página do item no Rolimon\'s não respondeu (' + esc(res.erroPagina || '') + ').</div>';
    return h;
  }

  function abrir(id, el) {
    if (!el) return;
    clearTimeout(timer);
    atual = { id: String(id), el: el };
    el.innerHTML = '<div class="ct-nota">Buscando os dados do item no Rolimon\'s...</div><div class="ct-esq"></div>';
    el.classList.remove('oculto');
    var f = document.createElement('iframe');
    f.style.display = 'none';
    f.src = PONTE + 'cartao?id=' + encodeURIComponent(id) + '&t=' + Date.now();
    document.body.appendChild(f);
    setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    timer = setTimeout(function () {
      if (atual && atual.el === el && atual.id === String(id)) el.innerHTML = '<div class="ct-nota">Sem resposta do Scriptable. Feche e toque no item de novo.</div>';
    }, 60000);
  }

  window.receberCartao = function (res) {
    var d = $('diag-cartao');
    if (d && res) d.textContent = 'Card do item ' + res.id + ': ' + (res.erro || (res.diag || []).join(' · '));
    if (!res || !atual || String(res.id) !== atual.id) return;
    clearTimeout(timer);
    atual.el.innerHTML = desenhar(res);
  };
  window.thCartao = { abrir: abrir };
}

function script(ponteJson) {
  return '<script>\n(' + paginaCartao.toString() + ')(' + ponteJson + ');\n</script>';
}

module.exports = { carregar, lugar, css, script, extrairVar, serieDoHistorico, rsi };
