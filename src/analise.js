// Cálculos: itens, totais, alertas de risco e mudanças desde a última consulta.

const DEMANDA = { '-1': 'Sem dados', 0: 'Terrível', 1: 'Baixa', 2: 'Normal', 3: 'Alta', 4: 'Incrível' };
const TENDENCIA = { '-1': 'Sem dados', 0: 'Caindo', 1: 'Instável', 2: 'Estável', 3: 'Subindo', 4: 'Oscilando' };

const DEMANDA_CURTA = { '-1': '—', 0: 'Terrível', 1: 'Baixa', 2: 'Normal', 3: 'Alta', 4: 'Incrível' };
const TENDENCIA_CURTA = { '-1': '—', 0: 'Caindo', 1: 'Instável', 2: 'Estável', 3: 'Subindo', 4: 'Oscila' };

function rotuloDemanda(d) {
  return DEMANDA[d] || 'Desconhecida (' + d + ')';
}
function rotuloTendencia(t) {
  return TENDENCIA[t] || 'Desconhecida (' + t + ')';
}
function demandaCurta(d) {
  return DEMANDA_CURTA[d] || '?';
}
function tendenciaCurta(t) {
  return TENDENCIA_CURTA[t] || '?';
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

// Monta a lista de itens. Fonte principal: Rolimon's (jogador); se falhar, Roblox.
// Quando as duas fontes existem, calcula onde elas discordam.
function montarItens(dados) {
  const R = dados.rolimons;
  const roblox = dados.roblox ? dados.roblox.itens : null;
  const porUaid = {};
  if (roblox) for (const x of roblox) porUaid[String(x.userAssetId)] = x;

  let base = [];
  let fonte;
  if (dados.jogador) {
    fonte = 'rolimons';
    const holds = new Set((dados.jogador.holds || []).map(String));
    for (const assetId of Object.keys(dados.jogador.assets)) {
      const uaids = dados.jogador.assets[assetId];
      for (const u of Array.isArray(uaids) ? uaids : []) {
        const uaid = String(u);
        const rb = porUaid[uaid] || null;
        base.push({
          uaid,
          assetId: Number(assetId),
          serial: rb ? rb.serialNumber : null,
          nomeRoblox: rb ? rb.name : null,
          rapRoblox: rb ? rb.recentAveragePrice : null,
          hold: holds.has(uaid) || (rb ? !!rb.isOnHold : false),
        });
      }
    }
  } else {
    fonte = 'roblox';
    base = roblox.map((rb) => ({
      uaid: String(rb.userAssetId),
      assetId: rb.assetId,
      serial: rb.serialNumber,
      nomeRoblox: rb.name,
      rapRoblox: rb.recentAveragePrice,
      hold: !!rb.isOnHold,
    }));
  }

  const itens = base
    .map((b) => {
      const r = R[String(b.assetId)] || null;
      const rapRol = r ? num(r[2], -1) : -1;
      const rap = rapRol >= 0 ? rapRol : Math.max(num(b.rapRoblox, 0), 0);
      const value = r && num(r[3], -1) > 0 ? r[3] : null;
      return {
        uaid: b.uaid,
        assetId: b.assetId,
        nome: (r && r[0]) || b.nomeRoblox || 'Item ' + b.assetId,
        sigla: (r && r[1]) || '',
        serial: b.serial || null,
        rap,
        value, // null = item sem value no Rolimon's
        valorEfetivo: value != null ? value : rap, // usado nos totais (padrão do Rolimon's)
        demanda: r ? num(r[5], -1) : -1,
        tendencia: r ? num(r[6], -1) : -1,
        projected: !!r && r[7] === 1,
        hyped: !!r && r[8] === 1,
        rare: !!r && r[9] === 1,
        semRolimons: !r,
        hold: b.hold,
      };
    })
    .sort((a, b) => b.valorEfetivo - a.valorEfetivo);

  let divergencia = null;
  if (dados.jogador && roblox) {
    const noRolimons = new Set(base.map((b) => b.uaid));
    const soRoblox = roblox
      .filter((x) => !noRolimons.has(String(x.userAssetId)))
      .map((x) => x.name || 'Item ' + x.assetId);
    const soRolimons = itens.filter((i) => !porUaid[i.uaid]).map((i) => i.nome);
    if (soRoblox.length || soRolimons.length) divergencia = { soRoblox, soRolimons };
  }

  return { itens, fonte, divergencia };
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
    if (i.projected) motivos.push({ texto: 'projected', grav: 'alta' });
    if (i.demanda === 0) motivos.push({ texto: 'demanda terrível', grav: 'alta' });
    else if (i.demanda === 1) motivos.push({ texto: 'demanda baixa', grav: 'media' });
    if (i.tendencia === 0) motivos.push({ texto: 'tendência de queda', grav: 'media' });

    const p = prev[i.uaid];
    if (p) {
      const dv = pct(p.valorEfetivo, i.valorEfetivo);
      if (dv != null && dv <= -cfg.LIMITE_MUDANCA_PCT) {
        motivos.push({ texto: 'value caiu ' + fmtPct(-dv), grav: 'media', queda: true });
      }
      const dr = pct(p.rap, i.rap);
      if (dr != null && dr <= -cfg.LIMITE_MUDANCA_PCT) {
        motivos.push({ texto: 'RAP caiu ' + fmtPct(-dr), grav: 'media', queda: true });
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
      m.push({ texto: 'Value ' + fmtNum(p.valorEfetivo) + ' → ' + fmtNum(i.valorEfetivo) + ' (' + fmtPctSinal(dv) + ')', dir: dv > 0 ? 'sobe' : 'desce',
        campo: 'value', antes: p.valorEfetivo, depois: i.valorEfetivo, pct: dv });
    }
    const dr = pct(p.rap, i.rap);
    if (dr != null && Math.abs(dr) >= lim) {
      m.push({ texto: 'RAP ' + fmtNum(p.rap) + ' → ' + fmtNum(i.rap) + ' (' + fmtPctSinal(dr) + ')', dir: dr > 0 ? 'sobe' : 'desce',
        campo: 'rap', antes: p.rap, depois: i.rap, pct: dr });
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

function criarSnapshot(itens, totais, fonte) {
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
  return { data: Date.now(), fonte, totais, itens: mapa };
}

// v5.2 (conta 2): retrato "de 24h atrás" montado a partir do retrato do catálogo
// (historico.baseCatalogo24h: { data, itens: { assetId: [rap, value] } }), no
// mesmo formato de criarSnapshot. Os itens são os de HOJE com os preços de
// ontem: as setas e as quedas funcionam já no primeiro uso, mas o total não
// conta itens que entraram ou saíram. Demanda, tendência e projected ficam de
// fora (não estão no retrato do catálogo).
function baseDoCatalogo(itens, baseCatalogo, fonte) {
  if (!baseCatalogo || !baseCatalogo.itens) return null;
  const mapa = {};
  const totais = { value: 0, rap: 0, qtd: 0, comValue: 0 };
  for (const i of itens) {
    const b = baseCatalogo.itens[String(i.assetId)];
    const rapAntes = b && num(b[0], -1) >= 0 ? b[0] : null;
    const valueAntes = b && num(b[1], -1) > 0 ? b[1] : null;
    const efetivoAntes = i.value != null ? valueAntes : rapAntes;
    if (b) mapa[i.uaid] = { valorEfetivo: efetivoAntes, rap: rapAntes };
    totais.value += efetivoAntes != null ? efetivoAntes : i.valorEfetivo;
    totais.rap += rapAntes != null ? rapAntes : i.rap;
    totais.qtd++;
    if (i.value != null) totais.comValue++;
  }
  return { data: baseCatalogo.data, fonte, totais, itens: mapa, doCatalogo: true };
}

module.exports = {
  rotuloDemanda, rotuloTendencia, demandaCurta, tendenciaCurta,
  fmtNum, fmtPct, fmtPctSinal, abreviar, fmtData,
  montarItens, calcularTotais, compararTotais,
  encontrarRiscos, encontrarMudancas, criarSnapshot, baseDoCatalogo,
};
