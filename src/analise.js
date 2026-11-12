// Cálculos: itens, totais, alertas de risco e mudanças desde a última consulta.

const DEMANDA = { '-1': 'Sem dados', 0: 'Terrível', 1: 'Baixa', 2: 'Normal', 3: 'Alta', 4: 'Incrível' };
const TENDENCIA = { '-1': 'Sem dados', 0: 'Caindo', 1: 'Instável', 2: 'Estável', 3: 'Subindo', 4: 'Oscilando' };

function rotuloDemanda(d) {
  return DEMANDA[d] || 'Desconhecida (' + d + ')';
}
function rotuloTendencia(t) {
  return TENDENCIA[t] || 'Desconhecida (' + t + ')';
}

// ---------- Formatação ----------
function fmtNum(n) {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + s;
}
function fmtPct(p) {
  return p.toFixed(1).replace('.', ',') + '%';
}
function fmtPctSinal(p) {
  return (p > 0 ? '+' : '') + fmtPct(p);
}
function abreviar(n) {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2).replace('.', ',') + 'M';
  if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1).replace('.', ',') + 'K';
  return fmtNum(n);
}
function fmtData(ms) {
  const d = new Date(ms);
  const z = (x) => String(x).padStart(2, '0');
  return z(d.getDate()) + '/' + z(d.getMonth() + 1) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
}

// ---------- Cálculos ----------
function num(x, padrao) {
  return typeof x === 'number' && isFinite(x) ? x : padrao;
}

function pct(antes, depois) {
  if (!antes) return null;
  return ((depois - antes) / antes) * 100;
}

function montarItens(inventario, rolimonsItens) {
  return inventario
    .map((inv) => {
      const r = rolimonsItens[String(inv.assetId)] || null;
      const rapRoblox = num(inv.recentAveragePrice, -1);
      const rap = rapRoblox >= 0 ? rapRoblox : r ? Math.max(num(r[2], 0), 0) : 0;
      const value = r && num(r[3], -1) > 0 ? r[3] : null;
      return {
        uaid: String(inv.userAssetId),
        assetId: inv.assetId,
        nome: inv.name || (r && r[0]) || 'Item ' + inv.assetId,
        sigla: (r && r[1]) || '',
        serial: inv.serialNumber || null,
        rap,
        value, // null = item sem value no Rolimon's
        valorEfetivo: value != null ? value : rap, // usado nos totais (padrão do Rolimon's)
        demanda: r ? num(r[5], -1) : -1,
        tendencia: r ? num(r[6], -1) : -1,
        projected: !!r && r[7] === 1,
        hyped: !!r && r[8] === 1,
        rare: !!r && r[9] === 1,
        semRolimons: !r,
        emEspera: !!inv.isOnHold,
      };
    })
    .sort((a, b) => b.valorEfetivo - a.valorEfetivo);
}

function calcularTotais(itens) {
  return itens.reduce(
    (t, i) => {
      t.value += i.valorEfetivo;
      t.rap += i.rap;
      t.qtd++;
      if (i.value != null) t.comValue++;
      return t;
    },
    { value: 0, rap: 0, qtd: 0, comValue: 0 }
  );
}

function compararTotais(totais, anterior) {
  if (!anterior || !anterior.totais) return null;
  const a = anterior.totais;
  return {
    desde: anterior.data,
    value: { antes: a.value, depois: totais.value, pct: pct(a.value, totais.value) },
    rap: { antes: a.rap, depois: totais.rap, pct: pct(a.rap, totais.rap) },
    qtd: { antes: a.qtd, depois: totais.qtd },
  };
}

function encontrarRiscos(itens, anterior, cfg) {
  const prev = (anterior && anterior.itens) || {};
  const lista = [];
  for (const i of itens) {
    const motivos = [];
    if (i.projected) motivos.push({ texto: 'Projected (RAP inflado)', grav: 'alta' });
    if (i.demanda === 0) motivos.push({ texto: 'Demanda terrível', grav: 'alta' });
    else if (i.demanda === 1) motivos.push({ texto: 'Demanda baixa', grav: 'media' });
    if (i.tendencia === 0) motivos.push({ texto: "Tendência de queda (Rolimon's)", grav: 'media' });

    const p = prev[i.uaid];
    if (p) {
      const dv = pct(p.valorEfetivo, i.valorEfetivo);
      if (dv != null && dv <= -cfg.LIMITE_MUDANCA_PCT) {
        motivos.push({ texto: 'Value caiu ' + fmtPct(-dv) + ' desde a última consulta', grav: 'media' });
      }
      const dr = pct(p.rap, i.rap);
      if (dr != null && dr <= -cfg.LIMITE_MUDANCA_PCT) {
        motivos.push({ texto: 'RAP caiu ' + fmtPct(-dr) + ' desde a última consulta', grav: 'media' });
      }
    }

    if (i.value != null && i.value > 0) {
      const d = pct(i.value, i.rap);
      if (Math.abs(d) >= cfg.LIMITE_RAP_VALUE_PCT) {
        motivos.push({ texto: 'RAP ' + fmtPct(Math.abs(d)) + (d > 0 ? ' acima' : ' abaixo') + ' do value', grav: 'baixa' });
      }
    }
    if (motivos.length) lista.push({ item: i, motivos });
  }
  return lista;
}

// Retorna null na primeira consulta (sem retrato anterior).
function encontrarMudancas(itens, anterior, cfg) {
  if (!anterior || !anterior.itens) return null;
  const lim = cfg.LIMITE_MUDANCA_PCT;
  const lista = [];
  for (const i of itens) {
    const p = anterior.itens[i.uaid];
    if (!p) continue;
    const m = [];
    const dv = pct(p.valorEfetivo, i.valorEfetivo);
    if (dv != null && Math.abs(dv) >= lim) {
      m.push({ texto: 'Value ' + fmtNum(p.valorEfetivo) + ' → ' + fmtNum(i.valorEfetivo) + ' (' + fmtPctSinal(dv) + ')', dir: dv > 0 ? 'sobe' : 'desce' });
    }
    const dr = pct(p.rap, i.rap);
    if (dr != null && Math.abs(dr) >= lim) {
      m.push({ texto: 'RAP ' + fmtNum(p.rap) + ' → ' + fmtNum(i.rap) + ' (' + fmtPctSinal(dr) + ')', dir: dr > 0 ? 'sobe' : 'desce' });
    }
    if (p.demanda !== undefined && p.demanda !== i.demanda) {
      m.push({ texto: 'Demanda: ' + rotuloDemanda(p.demanda) + ' → ' + rotuloDemanda(i.demanda), dir: i.demanda > p.demanda ? 'sobe' : 'desce' });
    }
    if (p.tendencia !== undefined && p.tendencia !== i.tendencia) {
      m.push({ texto: 'Tendência: ' + rotuloTendencia(p.tendencia) + ' → ' + rotuloTendencia(i.tendencia), dir: 'neutro' });
    }
    if (p.projected !== undefined && p.projected !== i.projected) {
      m.push({ texto: i.projected ? 'Virou projected' : 'Deixou de ser projected', dir: i.projected ? 'desce' : 'sobe' });
    }
    if (m.length) lista.push({ item: i, mudancas: m });
  }
  return lista;
}

function criarSnapshot(itens, totais) {
  const mapa = {};
  for (const i of itens) {
    mapa[i.uaid] = {
      valorEfetivo: i.valorEfetivo,
      rap: i.rap,
      demanda: i.demanda,
      tendencia: i.tendencia,
      projected: i.projected,
    };
  }
  return { data: Date.now(), totais, itens: mapa };
}

module.exports = {
  rotuloDemanda, rotuloTendencia,
  fmtNum, fmtPct, fmtPctSinal, abreviar, fmtData,
  montarItens, calcularTotais, compararTotais,
  encontrarRiscos, encontrarMudancas, criarSnapshot,
};
