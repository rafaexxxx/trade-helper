// Fotos dos itens (250x250, como na v7.0 do app), pela API pública de
// thumbnails do Roblox. Ficam no KV por 24h (chave "mini"); só os itens sem
// foto ou com foto vencida são buscados, de 100 em 100.
// São opcionais: se o Roblox não responder, a Vitrine mostra o quadro vazio
// (ou a foto vencida, se houver).
//
// adaptado de src/api.js (buscarMiniaturas) @ e21d9e4

import { buscarJSON } from './rolimons.js';
import { lerJSON, gravarJSON, CHAVE_MINI } from './armazem.js';

const TAM = 250;
const VALIDADE_MS = 24 * 3600000;
const PODAR_MS = 7 * 24 * 3600000; // foto de item que saiu do inventário some depois de 7 dias

const urlLote = (ids) =>
  'https://thumbnails.roblox.com/v1/assets?assetIds=' + ids.join(',') +
  '&returnPolicy=PlaceHolder&size=' + TAM + 'x' + TAM + '&format=Png&isCircular=false';

// Devolve { urls: { assetId: url }, diag: texto curto para o Diagnóstico }.
// `ctx` serve para gravar no KV depois da resposta (não atrasa a tela).
export async function miniaturas(env, ctx, ids) {
  const cache = (await lerJSON(env, CHAVE_MINI)) || {};
  const agora = Date.now();
  const faltando = ids.filter((id) => !cache[id] || agora - cache[id].em > VALIDADE_MS);
  const diag = [(ids.length - faltando.length) + '/' + ids.length + ' guardadas'];
  let mudou = false;

  for (let i = 0; i < faltando.length; i += 100) {
    const lote = faltando.slice(i, i + 100);
    try {
      const r = await buscarJSON(urlLote(lote));
      if (r.status !== 200 || !r.json) throw new Error('HTTP ' + r.status);
      let n = 0;
      for (const d of r.json.data || []) {
        if (d.imageUrl && d.state === 'Completed') {
          cache[String(d.targetId)] = { u: d.imageUrl, em: agora };
          mudou = true;
          n++;
        }
      }
      diag.push('Roblox: ' + n + ' novas (' + r.ms + ' ms)');
    } catch (e) {
      diag.push('Roblox: ' + e.message);
    }
  }

  if (mudou) {
    for (const id of Object.keys(cache)) if (agora - cache[id].em > PODAR_MS) delete cache[id];
    ctx.waitUntil(gravarJSON(env, CHAVE_MINI, cache).catch((e) => console.log('mini: ' + e.message)));
  }

  // Foto vencida ainda serve enquanto a nova não vem.
  const urls = {};
  for (const id of ids) if (cache[id] && cache[id].u) urls[id] = cache[id].u;
  return { urls, diag: diag.join(' · ') };
}
