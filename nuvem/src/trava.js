// Trava do Mini App: confere se o pedido veio mesmo do Telegram e se é o dono.
//
// Algoritmo oficial do Telegram (Validating data received via the Mini App):
//   1. initData é uma query string. Tira o campo "hash" e guarda.
//   2. Os outros campos viram "chave=valor", em ordem alfabética, unidos por \n
//      (data-check-string).
//   3. segredo = HMAC-SHA256(chave = "WebAppData", mensagem = BOT_TOKEN)
//   4. conferência = hex(HMAC-SHA256(chave = segredo, mensagem = data-check-string))
//   5. conferência tem que ser igual ao "hash".
// Depois confere a idade (auth_date) e se o user.id é o MEU_ID.
//
// Como usar numa rota nova (api.js): é só pôr a função em ROTAS_API.
// O index.js passa tudo por protegerApi(), que devolve 401/403 sozinho.
// No navegador do Mini App, mande o cabeçalho:
//   Authorization: tma <Telegram.WebApp.initData>

import { json, erroTexto } from './util.js';

const enc = new TextEncoder();
const IDADE_MAX_S = 24 * 3600; // depois de 24h com o app aberto, pede para reabrir

async function hmac(chave, msg) {
  const k = await crypto.subtle.importKey('raw', chave, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}

function hex(bytes) {
  return Array.from(bytes, (x) => x.toString(16).padStart(2, '0')).join('');
}

// Comparação em tempo constante (não vaza quantos caracteres bateram).
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Devolve { ok: true, user, authDate } ou { ok: false, motivo }.
export async function validarInitData(initData, botToken, agoraS) {
  if (!initData) return { ok: false, motivo: 'sem initData (abra pelo Telegram)' };
  if (!botToken) return { ok: false, motivo: 'falta o segredo BOT_TOKEN no Worker' };

  const p = new URLSearchParams(initData);
  const hash = p.get('hash') || '';
  if (!/^[0-9a-f]{64}$/.test(hash)) return { ok: false, motivo: 'initData sem hash' };

  const pares = [];
  for (const [k, v] of p) if (k !== 'hash') pares.push([k, v]);
  pares.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const dataCheck = pares.map((kv) => kv[0] + '=' + kv[1]).join('\n');

  const segredo = await hmac(enc.encode('WebAppData'), botToken);
  const conferencia = hex(await hmac(segredo, dataCheck));
  if (!iguais(conferencia, hash)) return { ok: false, motivo: 'assinatura do Telegram não confere' };

  const auth = Number(p.get('auth_date'));
  const agora = agoraS || Math.floor(Date.now() / 1000);
  if (!auth || agora - auth > IDADE_MAX_S) return { ok: false, motivo: 'sessão velha: feche e abra o app de novo' };

  let user = null;
  try {
    user = JSON.parse(p.get('user') || 'null');
  } catch (e) {
    user = null;
  }
  if (!user || !user.id) return { ok: false, motivo: 'initData sem usuário' };
  return { ok: true, user, authDate: auth };
}

// Ajudante das rotas /api/*: valida, confere o dono e chama `fazer`.
// `fazer({ req, env, ctx, user, url })` devolve um objeto (vira JSON com ok: true)
// ou uma Response pronta.
export async function protegerApi(req, env, ctx, fazer) {
  const cab = req.headers.get('Authorization') || '';
  const initData = cab.startsWith('tma ') ? cab.slice(4) : '';
  const v = await validarInitData(initData, env.BOT_TOKEN);
  if (!v.ok) return json({ ok: false, erro: v.motivo }, 401);
  if (!env.MEU_ID) return json({ ok: false, erro: 'falta o segredo MEU_ID no Worker' }, 500);
  if (String(v.user.id) !== String(env.MEU_ID)) return json({ ok: false, erro: 'este app é particular' }, 403);
  try {
    const r = await fazer({ req, env, ctx, user: v.user, url: new URL(req.url) });
    if (r instanceof Response) return r;
    return json(Object.assign({ ok: true }, r));
  } catch (e) {
    console.log('api ' + new URL(req.url).pathname + ': ' + erroTexto(e));
    return json({ ok: false, erro: 'erro na nuvem: ' + (e && e.message ? e.message : String(e)) }, 500);
  }
}
