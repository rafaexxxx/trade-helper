// Conversa com o Rolimon's. Regra de respeito: o catálogo só é buscado pelo
// cron (1 vez a cada 5 min) ou, se o KV estiver vazio ou parado, por um pedido
// com guarda de 5 min na memória (ver armazem.js).

export const ROBLOX_ID = 466264969; // conta obsory
export const NOME_CONTA = 'obsory';
export const URL_CATALOGO = 'https://api.rolimons.com/items/v2/itemdetails';
export const URL_ATIVOS = (id) => 'https://api.rolimons.com/players/v1/playerassets/' + id;

const CABECALHOS = { 'User-Agent': 'TradeHelper-nuvem/0.2', Accept: 'application/json' };

export async function buscarTexto(url) {
  const t = Date.now();
  const resp = await fetch(url, { headers: CABECALHOS });
  const corpo = await resp.text();
  return { status: resp.status, texto: corpo, bytes: corpo.length, ms: Date.now() - t };
}

export async function buscarJSON(url) {
  const r = await buscarTexto(url);
  let obj = null;
  try {
    obj = JSON.parse(r.texto);
  } catch (e) {
    obj = null;
  }
  return { status: r.status, json: obj, bytes: r.bytes, ms: r.ms };
}

export function buscarAtivos(id) {
  return buscarJSON(URL_ATIVOS(id || ROBLOX_ID));
}

// Lê o texto do catálogo e confere se é válido. Devolve { itens, n }.
export function lerCatalogoTexto(t) {
  const j = JSON.parse(t);
  if (!j || !j.items || typeof j.items !== 'object') throw new Error('catálogo sem "items"');
  return { itens: j.items, n: Object.keys(j.items).length };
}
