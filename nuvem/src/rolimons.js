// Conversa com o Rolimon's. Regra de respeito: o catálogo só é buscado pelo
// cron (1 vez a cada 5 min) ou, se o KV estiver vazio ou parado, por um pedido
// com guarda de 5 min na memória (ver armazem.js).

export const ROBLOX_ID = 466264969; // conta obsory
export const NOME_CONTA = 'obsory';
export const URL_CATALOGO = 'https://api.rolimons.com/items/v2/itemdetails';
export const URL_ATIVOS = (id) => 'https://api.rolimons.com/players/v1/playerassets/' + id;

const CABECALHOS = { 'User-Agent': 'TradeHelper-nuvem/0.2', Accept: 'application/json' };

// Página de um item no site (~850 KB): traz as vendas/dia e o Best Price.
// Só o cron das linhas (linhas.js) busca, 1 item por rodada.
export const URL_PAGINA = (id) => 'https://www.rolimons.com/item/' + encodeURIComponent(id);

// `accept` muda o cabeçalho Accept (a página do item é HTML).
export async function buscarTexto(url, accept) {
  const t = Date.now();
  const resp = await fetch(url, { headers: accept ? Object.assign({}, CABECALHOS, { Accept: accept }) : CABECALHOS });
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

// Só a linha de UM item no texto cru do catálogo, sem ler o resto
// (o retrato tem ~180 KB e o plano grátis dá 10 ms de CPU por pedido).
// Procura '"<id>":[' e lê até o ']' que fecha (respeitando as aspas do nome).
// Devolve o array [nome, sigla, rap, value, ...] ou null.
export function linhaDoTexto(texto, id) {
  const chave = '"' + id + '":[';
  const i = texto.indexOf(chave);
  if (i < 0) return null;
  const ini = i + chave.length - 1;
  let aspas = false;
  let barra = false;
  for (let j = ini + 1; j < texto.length; j++) {
    const c = texto.charCodeAt(j);
    if (aspas) {
      if (barra) barra = false;
      else if (c === 92) barra = true; // contrabarra
      else if (c === 34) aspas = false; // aspas
      continue;
    }
    if (c === 34) aspas = true;
    else if (c === 93) {
      // ]
      try {
        return JSON.parse(texto.slice(ini, j + 1));
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

// copiado de src/cartao.js (extrairVar) @ e21d9e4
// Valor de "var <nome> = ...;" no script da página do item: objeto/lista (pelo
// par de chaves, respeitando textos entre aspas) ou número/texto até o ";".
// undefined = a variável não existe; null = existe, mas não deu para ler.
export function extrairVar(texto, nome) {
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

// Lê o texto do catálogo e confere se é válido. Devolve { itens, n }.
export function lerCatalogoTexto(t) {
  const j = JSON.parse(t);
  if (!j || !j.items || typeof j.items !== 'object') throw new Error('catálogo sem "items"');
  return { itens: j.items, n: Object.keys(j.items).length };
}
