// Trade Helper na nuvem · porta de entrada do Cloudflare Worker.
// Separado do app do Scriptable: o loader não baixa esta pasta.
//
// Rotas:
//   /setup?k=SENHA  liga o bot a este Worker (webhook + comandos)
//   /tg             webhook do Telegram (só com o cabeçalho secreto)
//   /app            Mini App (Fase 1: Vitrine do Inventário)
//   /api/*          dados do Mini App, sempre pela trava (trava.js)
// Tarefa agendada: agendado.js (cron do wrangler.toml).
//
// Segredos (Cloudflare > Worker > Settings > Variables and Secrets).
// NUNCA coloque esses valores em arquivo: o repositório é público.
//   BOT_TOKEN    chave do @BotFather
//   SENHA_SETUP  palavra inventada, só letras, números, - e _
//   MEU_ID       seu id do Telegram (o /start mostra)

import { configurar, receberTelegram } from './telegram.js';
import { paginaApp } from './app.js';
import { protegerApi } from './trava.js';
import { ROTAS_API } from './api.js';
import { tarefaAgendada } from './agendado.js';
import { texto, json, erroTexto } from './util.js';

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname;

    if (p === '/setup') return configurar(url, env);
    if (p === '/tg' && req.method === 'POST') return receberTelegram(req, env, ctx, url.origin);
    if (p === '/app' || p === '/app/') return paginaApp();

    if (p.startsWith('/api/')) {
      const rota = ROTAS_API[p];
      if (!rota) return json({ ok: false, erro: 'rota desconhecida' }, 404);
      if (req.method !== 'GET' && req.method !== 'POST') return json({ ok: false, erro: 'método não permitido' }, 405);
      return protegerApi(req, env, ctx, rota);
    }

    return texto('Trade Helper nuvem: no ar.');
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(tarefaAgendada(controller, env).catch((e) => console.log('cron erro: ' + erroTexto(e))));
  },
};
