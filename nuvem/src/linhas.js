// Vendas por dia e Best Price de cada item do inventário (a "linha" de baixo
// do cartão da Vitrine, como na v6.11 do app).
//
// Vêm da página do item no Rolimon's (~850 KB), pesada demais para buscar
// quando o app abre. Então um SEGUNDO cron (CRON_LINHAS, minutos 2, 7, 12...)
// lê UMA página por rodada, sempre do item mais valioso que está sem dado ou
// com dado vencido, e guarda tudo numa chave só do KV ("linhas").
//
// Gravações no KV: só quando lê uma página (~1 por item por dia). Rodada sem
// nada para fazer não grava nada.
//
// A fila é a chave "inv:ids", que o app grava ao abrir (api.js). Antes de abrir
// o app a primeira vez, o cron não sabe quais são os seus itens e só espera.

import { URL_PAGINA, buscarTexto, extrairVar } from './rolimons.js';
import { lerJSON, gravarJSON, CHAVE_LINHAS, CHAVE_INV_IDS } from './armazem.js';

// Tem que ser IGUAL ao segundo cron do wrangler.toml.
export const CRON_LINHAS = '2,7,12,17,22,27,32,37,42,47,52,57 * * * *';

const VALIDADE_MS = 24 * 3600000; // página lida vale 24h (como CARTAO_LINHA_PAGINA_H no app)
const ERRO_ESPERA_MS = 3 * 3600000; // depois de um erro, tenta de novo em 3h
const PODAR_MS = 7 * 24 * 3600000; // item que saiu do inventário some depois de 7 dias

export async function tarefaLinhas(env) {
  const ids = await lerJSON(env, CHAVE_INV_IDS);
  if (!Array.isArray(ids) || !ids.length) {
    console.log('cron linhas: ainda sem a lista do inventário (abra o app uma vez)');
    return;
  }
  const g = (await lerJSON(env, CHAVE_LINHAS)) || {};
  const agora = Date.now();
  const id = escolher(ids, g, agora);
  if (!id) return; // tudo em dia: não grava nada

  const e = await lerPagina(id, g[id]);
  g[id] = e;
  const dentro = new Set(ids);
  for (const k of Object.keys(g)) if (!dentro.has(k) && agora - g[k].em > PODAR_MS) delete g[k];
  await gravarJSON(env, CHAVE_LINHAS, g);
  console.log(
    'cron linhas: item ' + id + (e.ok ? ' ok · vendas ' + e.v + ' · best ' + e.b : ' ERRO ' + e.erro) +
      (e.ms != null ? ' · ' + e.ms + ' ms' : '')
  );
}

// Primeiro o item mais valioso sem nada guardado; depois o mais velho vencido.
function escolher(ids, g, agora) {
  for (const id of ids) if (!g[id]) return id;
  let melhor = null;
  let maior = 0;
  for (const id of ids) {
    const e = g[id];
    const idade = agora - e.em;
    if (idade >= (e.ok ? VALIDADE_MS : ERRO_ESPERA_MS) && idade > maior) {
      melhor = id;
      maior = idade;
    }
  }
  return melhor;
}

// adaptado de src/cartao.js (lerPagina) @ e21d9e4: só vendas/dia e Best.
// Em erro, fica o último valor guardado (decisão do Rafael na v6.11).
async function lerPagina(id, antigo) {
  const em = Date.now();
  const velho = antigo || {};
  let p;
  try {
    p = await buscarTexto(URL_PAGINA(id), 'text/html');
  } catch (e) {
    return { em, ok: false, v: velho.v, b: velho.b, st: 0, erro: String(e && e.message ? e.message : e).slice(0, 80) };
  }
  if (p.status !== 200) return { em, ok: false, v: velho.v, b: velho.b, st: p.status, erro: 'HTTP ' + p.status, ms: p.ms };

  const t = p.texto;
  const vend = extrairVar(t, 'avg_daily_sales_volume_30_days');
  const det = extrairVar(t, 'item_details_data');
  // Best: item_details_data, depois o "best_price": N solto na página.
  let best = det && typeof det === 'object' && !Array.isArray(det) ? Number(det.best_price) : NaN;
  if (!(best > 0)) {
    const m = /"best_price"\s*:\s*(\d+)/.exec(t);
    best = m ? Number(m[1]) : NaN;
  }
  const v = typeof vend === 'number' && vend >= 0 ? Math.round(vend * 100) / 100 : null;
  const b = best > 0 ? best : null;
  if (v == null && b == null) {
    return { em, ok: false, v: velho.v, b: velho.b, st: 200, erro: 'página sem vendas nem Best (' + Math.round(p.bytes / 1024) + ' KB)', ms: p.ms };
  }
  return { em, ok: true, v, b, st: 200, ms: p.ms };
}
