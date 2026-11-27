// Armazenamento no KV (binding TH).
//
// Chaves:
//   cat:atual          texto cru do catálogo v2 do Rolimon's (o último que o
//                      cron buscou). metadata = { em, bytes, n }
//   ret:AAAA-MM-DDTHH  retrato do catálogo daquela hora (UTC), para o
//                      "% em 24h". Some sozinho depois de 49h (expirationTtl),
//                      então apagar não gasta gravação.
//   mini               { assetId: { u: url da foto 250x250, em } } (miniaturas.js)
//   linhas             { assetId: { em, ok, v: vendas/dia, b: Best, st, erro } } (linhas.js)
//   inv:ids            [assetId, ...] do inventário, do maior value para o menor:
//                      a fila do cron das linhas. Gravado pelo app só quando muda.
//
// Orçamento do plano grátis (1.000 gravações/dia): catálogo a cada 5 min = 288
// + retratos 24 = ~312/dia. Fase 1: linhas ~1 por item por dia (+ novas
// tentativas a cada 3h se der erro), fotos ~1/dia, inv:ids só quando muda.

import { URL_CATALOGO, buscarTexto, lerCatalogoTexto, linhaDoTexto } from './rolimons.js';

export const CHAVE_CAT = 'cat:atual';
export const PREFIXO_RET = 'ret:';
export const CHAVE_MINI = 'mini';
export const CHAVE_LINHAS = 'linhas';
export const CHAVE_INV_IDS = 'inv:ids';
const RETRATO_TTL_S = 49 * 3600;
const GUARDA_MS = 5 * 60 * 1000; // no máximo 1 busca direta a cada 5 min
const KV_VELHO_MS = 30 * 60 * 1000; // KV mais velho que isso = cron parado
const MEMORIA_MS = 60 * 1000; // relê o KV no máximo 1 vez por minuto

// Cópia lida na memória do Worker (some quando ele reinicia; tudo bem).
const memoria = { itens: null, em: 0, bytes: 0, n: 0, origem: '', lidoEm: 0, buscaDiretaEm: 0 };

export function chaveRetrato(ms) {
  return PREFIXO_RET + new Date(ms).toISOString().slice(0, 13);
}

// Usado pelo cron. `retrato` = true na primeira rodada da hora.
export async function gravarCatalogo(env, texto, n, em, retrato) {
  const meta = { em, bytes: texto.length, n };
  await env.TH.put(CHAVE_CAT, texto, { metadata: meta });
  if (retrato) await env.TH.put(chaveRetrato(em), texto, { metadata: meta, expirationTtl: RETRATO_TTL_S });
}

// Catálogo para quem pede (/inv, /api/*). Ordem: memória → KV → Rolimon's
// (só se o KV estiver vazio ou parado, e com a guarda de 5 min).
// Devolve { itens, em, bytes, n, origem: 'memoria' | 'kv' | 'rolimons' }.
export async function lerCatalogo(env) {
  // Lido do KV há menos de 1 min: usa a memória sem nem perguntar ao KV.
  if (memoria.itens && Date.now() - memoria.lidoEm < MEMORIA_MS) return copia('memoria');

  let velho = null; // catálogo do KV parado: serve de reserva se a busca direta falhar
  if (env.TH) {
    // Leitura (100 mil/dia no grátis). Não usa list, que tem só 1.000/dia.
    const r = await env.TH.getWithMetadata(CHAVE_CAT, 'text');
    const meta = r && r.metadata;
    if (r && r.value && meta) {
      if (Date.now() - meta.em < KV_VELHO_MS) {
        memoria.lidoEm = Date.now();
        if (memoria.itens && memoria.em === meta.em) return copia('memoria'); // mesma versão: não relê
        const c = lerCatalogoTexto(r.value);
        guardar(c.itens, meta.em, r.value.length, c.n, 'kv');
        return copia('kv');
      }
      velho = r;
    }
  }

  // KV vazio ou parado: busca direto, respeitando a guarda.
  if (memoria.itens && Date.now() - memoria.buscaDiretaEm < GUARDA_MS) return copia('memoria');
  let erro = 'catálogo indisponível; tente em alguns minutos';
  if (Date.now() - memoria.buscaDiretaEm >= GUARDA_MS) {
    memoria.buscaDiretaEm = Date.now();
    try {
      const b = await buscarTexto(URL_CATALOGO);
      if (b.status !== 200) throw new Error('catálogo HTTP ' + b.status);
      const c = lerCatalogoTexto(b.texto);
      guardar(c.itens, Date.now(), b.bytes, c.n, 'rolimons');
      return copia('rolimons');
    } catch (e) {
      erro = e.message;
    }
  }
  if (velho) {
    const c = lerCatalogoTexto(velho.value);
    guardar(c.itens, velho.metadata.em, velho.value.length, c.n, 'kv');
    return copia('kv');
  }
  if (memoria.itens) return copia('memoria');
  throw new Error(erro);
}

// Retrato mais perto de `ms` (procura a hora exata e até 2h para trás).
// Devolve { itens, em } ou null. Serve para o "% em 24h" das próximas fases.
export async function lerRetrato(env, ms) {
  if (!env.TH) return null;
  for (let h = 0; h <= 2; h++) {
    const r = await env.TH.getWithMetadata(chaveRetrato(ms - h * 3600000), 'text');
    if (r && r.value) return { itens: lerCatalogoTexto(r.value).itens, em: r.metadata ? r.metadata.em : 0 };
  }
  return null;
}

// Fase 1 (Vitrine): igual ao lerRetrato, mas tira do texto SÓ os itens pedidos
// (regra dos 10 ms de CPU: não faz JSON.parse do retrato inteiro). O texto da
// última hora lida fica na memória do Worker. Devolve { em, itens: { id: linha } } ou null.
const memRet = { chave: '', texto: null, em: 0 };
export async function lerRetratoItens(env, ms, ids) {
  if (!env.TH) return null;
  for (let h = 0; h <= 2; h++) {
    const chave = chaveRetrato(ms - h * 3600000);
    let texto = null;
    let em = 0;
    if (memRet.chave === chave && memRet.texto) {
      texto = memRet.texto;
      em = memRet.em;
    } else {
      const r = await env.TH.getWithMetadata(chave, 'text');
      if (r && r.value) {
        texto = r.value;
        em = r.metadata ? r.metadata.em : 0;
        memRet.chave = chave;
        memRet.texto = texto;
        memRet.em = em;
      }
    }
    if (texto) {
      const itens = {};
      for (const id of ids) {
        const l = linhaDoTexto(texto, id);
        if (l) itens[id] = l;
      }
      return { em, itens };
    }
  }
  return null;
}

// JSON pequeno no KV (mini, linhas, inv:ids). Falha de leitura = null.
export async function lerJSON(env, chave) {
  if (!env.TH) return null;
  try {
    return await env.TH.get(chave, 'json');
  } catch (e) {
    return null;
  }
}

// Cada chamada é 1 gravação (1.000/dia no grátis): só chame quando mudou algo.
export async function gravarJSON(env, chave, obj) {
  if (!env.TH) return;
  await env.TH.put(chave, JSON.stringify(obj));
}

// Para o /diag e o /app: estado do KV sem ler os textos grandes.
// Usa 2 "list" (limite de 1.000/dia no grátis): não chamar em rota frequente.
export async function estadoKV(env) {
  if (!env.TH) return { ligado: false };
  const cat = await env.TH.list({ prefix: CHAVE_CAT, limit: 1 });
  const ret = await env.TH.list({ prefix: PREFIXO_RET, limit: 100 });
  const meta = cat.keys[0] ? cat.keys[0].metadata : null;
  const horas = ret.keys.map((k) => k.name.slice(PREFIXO_RET.length)).sort();
  return {
    ligado: true,
    catalogo: meta ? { em: meta.em, bytes: meta.bytes, n: meta.n } : null,
    retratos: horas.length,
    retratoMaisVelho: horas[0] || null,
  };
}

function guardar(itens, em, bytes, n, origem) {
  memoria.itens = itens;
  memoria.em = em;
  memoria.bytes = bytes;
  memoria.n = n;
  memoria.origem = origem;
}

function copia(origem) {
  return { itens: memoria.itens, em: memoria.em, bytes: memoria.bytes, n: memoria.n, origem };
}
