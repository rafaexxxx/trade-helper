// Rotas /api/* do Mini App. Todas passam pela trava (trava.js > protegerApi)
// antes de chegar aqui: só o dono (MEU_ID), com initData válido.
//
// Para criar uma rota: escreva async function minhaRota({ env, ctx, user, url })
// que devolve um objeto, e ponha em ROTAS_API.

import { lerCatalogo, lerRetratoItens, lerJSON, gravarJSON, CHAVE_LINHAS, CHAVE_INV_IDS } from './armazem.js';
import { ROBLOX_ID, NOME_CONTA, buscarAtivos } from './rolimons.js';
import { itemDoRolimons, valorEfetivo } from './regras/valor.js';
import {
  LIMITE_MUDANCA_PCT, DEMANDA_CURTA, pct, corDemanda, fmtVendas, corVendas, pilulas, extras, periodoReal,
} from './regras/inventario.js';
import { miniaturas } from './miniaturas.js';
import { num, minutos } from './util.js';

// Versão da nuvem (aparece no Diagnóstico do app).
export const VERSAO_NUVEM = '1.0.0';
const CAT_VELHO_MS = 30 * 60 * 1000;

export const ROTAS_API = {
  '/api/eu': apiEu,
  '/api/inventario': apiInventario,
};

// Esqueleto: confirma a trava e mostra a idade do catálogo no KV.
async function apiEu({ env, user }) {
  let catalogo = null;
  let erroCatalogo = null;
  try {
    const c = await lerCatalogo(env);
    catalogo = { em: c.em, n: c.n, origem: c.origem };
  } catch (e) {
    erroCatalogo = e.message;
  }
  return {
    usuario: { id: user.id, nome: user.first_name || '', username: user.username || '' },
    catalogo,
    erroCatalogo,
    agora: Date.now(),
  };
}

// ---------- Fase 1: a Vitrine do Inventário ----------
// Junta: inventário (playerassets, com holds) + catálogo atual (KV) + retrato
// de 24h atrás (só os seus itens) + fotos + vendas/dia e Best (cron das linhas).
// A página só desenha; as contas e os textos já vão prontos daqui.
async function apiInventario({ env, ctx }) {
  const t0 = Date.now();
  const agora = Date.now();
  const [cat, ativos, guardadas, filaAntiga] = await Promise.all([
    lerCatalogo(env),
    buscarAtivos(ROBLOX_ID),
    lerJSON(env, CHAVE_LINHAS),
    lerJSON(env, CHAVE_INV_IDS),
  ]);
  if (!ativos.json || !ativos.json.success) {
    throw new Error("o Rolimon's não devolveu o inventário (HTTP " + ativos.status + ')');
  }
  const j = ativos.json;
  const holds = new Set((j.holds || []).map(String));
  const pa = j.playerAssets || {};
  const ids = Object.keys(pa);
  const lns = guardadas || {};

  const [ret, mini] = await Promise.all([
    lerRetratoItens(env, agora - 24 * 3600000, ids),
    miniaturas(env, ctx, ids),
  ]);
  const per = ret ? periodoReal(ret.em, agora) : null;

  const itens = [];
  let tv = 0, tr = 0, tvA = 0, trA = 0, emHold = 0, fora = 0;
  for (const id of ids) {
    const it = itemDoRolimons(id, cat.itens[id]);
    const antes = ret && ret.itens[id] ? itemDoRolimons(id, ret.itens[id]) : null;
    const ln = lns[id] || null;
    for (const uaid of pa[id] || []) {
      const hold = holds.has(String(uaid));
      if (hold) emHold++;
      if (!it) {
        // Item que o catálogo do Rolimon's não tem: aparece, mas sem números.
        fora++;
        itens.push({ u: String(uaid), id, n: 'Item ' + id, v: null, r: 0, b: 0, h: hold, dem: '', dc: '', tags: [], x: "fora do Rolimon's", m: mini.urls[id] || null, vd: -1 });
        continue;
      }
      const base = valorEfetivo(it);
      tv += base;
      tr += it.rap;
      tvA += antes ? valorEfetivo(antes) : base;
      trA += antes ? antes.rap : it.rap;
      const temV = ln && typeof ln.v === 'number';
      itens.push({
        u: String(uaid),
        id,
        n: it.nome,
        v: it.value, // null = sem value (o cartão mostra "—")
        r: it.rap,
        b: base,
        h: hold,
        // Seta do value só para item com value (sem value, repetiria a do RAP).
        sv: it.value != null && antes ? arred(pct(valorEfetivo(antes), base)) : null,
        sr: antes ? arred(pct(antes.rap, it.rap)) : null,
        dem: it.dem >= 0 ? DEMANDA_CURTA[it.dem] : '',
        dc: it.dem >= 0 ? corDemanda(it.dem) : '',
        tags: pilulas(it),
        x: extras(it),
        m: mini.urls[id] || null,
        vd: temV ? ln.v : -1,
        vt: temV ? fmtVendas(ln.v) : '',
        vc: temV ? corVendas(ln.v) : '',
        bt: ln && ln.b > 0 ? num(ln.b) : '',
      });
    }
  }
  itens.sort((a, b) => b.b - a.b);

  // Fila do cron das linhas: seus itens do mais valioso para o menos.
  // Grava só quando mudou (cada gravação conta no limite de 1.000/dia).
  const fila = [];
  for (const i of itens) if (cat.itens[i.id] && !fila.includes(i.id)) fila.push(i.id);
  if (JSON.stringify(fila) !== JSON.stringify(filaAntiga || [])) {
    ctx.waitUntil(gravarJSON(env, CHAVE_INV_IDS, fila).catch((e) => console.log('inv:ids: ' + e.message)));
  }

  // Avisos gerais (o "!" ao lado da Ordem).
  const avisos = [];
  if (j.playerPrivacyEnabled) avisos.push("O Rolimon's diz que o inventário está privado.");
  if (agora - cat.em > CAT_VELHO_MS) avisos.push('Catálogo de ' + minutos(agora - cat.em) + ' atrás: o cron pode estar parado. Mande /diag no bot.');
  if (fora) avisos.push(fora + (fora === 1 ? ' item não está' : ' itens não estão') + " no catálogo do Rolimon's.");

  const prontas = fila.filter((id) => lns[id] && (typeof lns[id].v === 'number' || lns[id].b > 0)).length;
  const erros = fila.filter((id) => lns[id] && !lns[id].ok);
  return {
    conta: NOME_CONTA,
    agora,
    lim: LIMITE_MUDANCA_PCT,
    per,
    totais: {
      value: tv,
      rap: tr,
      qtd: itens.length,
      holds: emHold,
      sv: per ? arred(pct(tvA, tv)) : null,
      sr: per ? arred(pct(trA, tr)) : null,
    },
    itens,
    avisos,
    diag: {
      versao: VERSAO_NUVEM,
      catalogo: { em: cat.em, origem: cat.origem, n: cat.n },
      retrato: ret ? { em: ret.em, itens: Object.keys(ret.itens).length } : null,
      fotos: mini.diag,
      linhas: {
        prontas,
        total: fila.length,
        erros: erros.length,
        ultimoErro: erros.length ? erros.map((id) => lns[id]).sort((a, b) => b.em - a.em)[0].erro : null,
      },
      ms: Date.now() - t0,
    },
  };
}

function arred(p) {
  return p == null ? null : Math.round(p * 10) / 10;
}
