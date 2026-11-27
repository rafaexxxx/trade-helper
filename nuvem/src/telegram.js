// Bot do Telegram: /setup (liga o bot ao Worker), webhook /tg e os comandos
//   /start  mostra o seu id do Telegram (para guardar em MEU_ID)
//   /inv    value e RAP totais da conta, itens e holds
//   /diag   confere o Rolimon's, o KV, o cron e os segredos
//   /app    botão que abre o Mini App

import { ROBLOX_ID, NOME_CONTA, buscarAtivos } from './rolimons.js';
import { lerCatalogo, estadoKV } from './armazem.js';
import { itemDoRolimons, valorEfetivo } from './regras/valor.js';
import { num, kb, minutos, esc, texto, erroTexto } from './util.js';

const CRON_ATRASADO_MS = 15 * 60 * 1000; // o cron roda a cada 5 min

// ---------- /setup: liga o bot a este Worker ----------
export async function configurar(url, env) {
  if (!env.BOT_TOKEN || !env.SENHA_SETUP) return texto('Faltam os segredos BOT_TOKEN e SENHA_SETUP no Worker.', 500);
  if (url.searchParams.get('k') !== env.SENHA_SETUP) return texto('Senha errada.', 401);
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(env.SENHA_SETUP)) {
    return texto('A SENHA_SETUP só pode ter letras, números, - e _ (sem espaço nem acento).', 400);
  }
  const gancho = await telegram(env, 'setWebhook', {
    url: url.origin + '/tg',
    secret_token: env.SENHA_SETUP,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  });
  const cmds = await telegram(env, 'setMyCommands', {
    commands: [
      { command: 'app', description: 'Abrir o Trade Helper' },
      { command: 'inv', description: 'Value e RAP da conta' },
      { command: 'diag', description: 'Testar a nuvem e o Rolimon\'s' },
      { command: 'start', description: 'Mostrar meu id do Telegram' },
    ],
  });
  // Fase 1: botão "Painel" fixo ao lado da caixa de mensagem (abre o Mini App).
  // Vale como padrão do bot e também direto na conversa do dono (MEU_ID = id do
  // chat privado), porque o Telegram pode guardar o botão antigo ("Menu") por conversa.
  const botao = { type: 'web_app', text: 'Painel', web_app: { url: url.origin + '/app' } };
  const menu = await telegram(env, 'setChatMenuButton', { menu_button: botao });
  if (menu.ok && env.MEU_ID) {
    const doDono = await telegram(env, 'setChatMenuButton', { chat_id: Number(env.MEU_ID), menu_button: botao });
    if (!doDono.ok) menu.description = 'padrão ok, na sua conversa: ' + doDono.description;
    menu.ok = doDono.ok;
  }
  const ok = gancho.ok && cmds.ok && menu.ok;
  return texto(
    (ok ? 'Pronto! O bot está ligado a este Worker. Volte ao Telegram: o botão "Painel" abre o app.' : 'Algo falhou.') +
      '\n\nwebhook: ' + (gancho.ok ? 'ok' : gancho.description) +
      '\ncomandos: ' + (cmds.ok ? 'ok' : cmds.description) +
      '\nbotão Painel: ' + (menu.ok ? 'ok' : menu.description),
    ok ? 200 : 500
  );
}

// ---------- webhook ----------
export async function receberTelegram(req, env, ctx, origem) {
  if (!env.SENHA_SETUP || req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.SENHA_SETUP) {
    return new Response('não autorizado', { status: 401 });
  }
  let upd = null;
  try {
    upd = await req.json();
  } catch (e) {
    return new Response('ok');
  }
  // Responde logo ao Telegram e trabalha depois (senão ele reenvia a mensagem).
  ctx.waitUntil(tratar(upd, env, origem).catch((e) => console.log('erro: ' + erroTexto(e))));
  return new Response('ok');
}

async function tratar(upd, env, origem) {
  const msg = upd && upd.message;
  if (!msg || !msg.text || !msg.chat) return;
  const chat = msg.chat.id;
  const de = msg.from ? String(msg.from.id) : '';
  const cmd = msg.text.trim().split(/[\s@]/)[0].toLowerCase();

  if (cmd === '/start') {
    if (env.MEU_ID && de === String(env.MEU_ID)) {
      return enviar(env, chat, 'Oi! Tudo certo. Mande /app para abrir o Trade Helper, /inv para ver a sua conta ou /diag para o teste da nuvem.');
    }
    return enviar(
      env,
      chat,
      'Seu id do Telegram: <code>' + de + '</code>\n\n' +
        (env.MEU_ID
          ? 'Este bot é particular.'
          : 'Guarde esse número como o segredo <b>MEU_ID</b> no Worker. Depois disso, só você consegue usar o bot.')
    );
  }

  if (!env.MEU_ID) return enviar(env, chat, 'Falta guardar o segredo MEU_ID no Worker. Mande /start para ver o seu id.');
  if (de !== String(env.MEU_ID)) return enviar(env, chat, 'Este bot é particular.');

  if (cmd === '/app') return botaoApp(env, chat, origem);
  if (cmd === '/inv') return inventario(env, chat);
  if (cmd === '/diag') return diagnostico(env, chat);
  return enviar(env, chat, 'Comandos: /app, /inv e /diag.');
}

// ---------- /app ----------
function botaoApp(env, chat, origem) {
  return telegram(env, 'sendMessage', {
    chat_id: chat,
    text: 'Toque no botão para abrir o Trade Helper.',
    reply_markup: { inline_keyboard: [[{ text: 'Abrir o Trade Helper', web_app: { url: origem + '/app' } }]] },
  });
}

// ---------- /inv ----------
async function inventario(env, chat) {
  let cat, ativos;
  try {
    [cat, ativos] = await Promise.all([lerCatalogo(env), buscarAtivos(ROBLOX_ID)]);
  } catch (e) {
    return enviar(env, chat, 'Não consegui ler os dados: ' + esc(e.message) + '\nMande /diag para ver o detalhe.');
  }
  if (!ativos.json || !ativos.json.success) {
    return enviar(env, chat, 'O Rolimon\'s não devolveu o inventário (HTTP ' + ativos.status + '). Mande /diag.');
  }
  const r = resumir(cat.itens, ativos.json);
  const linhas = [
    '<b>' + NOME_CONTA + '</b> · ' + r.copias + ' ' + (r.copias === 1 ? 'item' : 'itens') + (r.holds ? ' · ' + r.holds + ' em hold' : ''),
    '',
    'Value  <b>' + num(r.value) + '</b>',
    'RAP    <b>' + num(r.rap) + '</b>',
  ];
  if (r.maiores.length) {
    linhas.push('');
    for (const m of r.maiores) linhas.push(esc(m.nome) + ' · ' + num(m.base) + (m.temValue ? '' : ' (RAP)') + (m.hold ? ' · hold' : ''));
  }
  if (r.semDado) linhas.push('', r.semDado + ' sem dado no catálogo do Rolimon\'s.');
  if (ativos.json.playerPrivacyEnabled) linhas.push('', 'Aviso: o Rolimon\'s diz que o inventário está privado.');
  linhas.push('', '<i>Catálogo de ' + minutos(Date.now() - cat.em) + ' atrás · Rolimon\'s</i>');
  return enviar(env, chat, linhas.join('\n'));
}

// value base = value; sem value, usa o RAP (regras/valor.js).
function resumir(itens, j) {
  const holds = new Set((j.holds || []).map(String));
  let value = 0, rap = 0, copias = 0, emHold = 0, semDado = 0;
  const lista = [];
  const ativos = j.playerAssets || {};
  for (const assetId of Object.keys(ativos)) {
    const it = itemDoRolimons(assetId, itens[assetId]);
    for (const uaid of ativos[assetId] || []) {
      copias++;
      const hold = holds.has(String(uaid));
      if (hold) emHold++;
      if (!it) {
        semDado++;
        continue;
      }
      const base = valorEfetivo(it);
      value += base;
      rap += it.rap;
      lista.push({ nome: it.nome, base, temValue: it.value != null, hold });
    }
  }
  lista.sort((a, b) => b.base - a.base);
  return { value, rap, copias, holds: emHold, semDado, maiores: lista.slice(0, 4) };
}

// ---------- /diag ----------
async function diagnostico(env, chat) {
  const t0 = Date.now();
  const l = ['<b>Diagnóstico</b>', ''];

  // Segredos (só diz se existem; nunca mostra o valor).
  l.push('Segredos: ' + ['BOT_TOKEN', 'SENHA_SETUP', 'MEU_ID'].map((k) => k + (env[k] ? ' ok' : ' FALTA')).join(' · '));

  // KV e cron.
  try {
    const k = await estadoKV(env);
    if (!k.ligado) {
      l.push('KV: não ligado (falta o binding TH no wrangler.toml)');
    } else if (!k.catalogo) {
      l.push('KV: ligado, mas vazio. O cron roda a cada 5 min; espere e mande /diag de novo.');
    } else {
      const idade = Date.now() - k.catalogo.em;
      l.push(
        'Cron: último catálogo há ' + minutos(idade) + (idade > CRON_ATRASADO_MS ? ' (ATRASADO: veja os logs)' : ' (ok)')
      );
      l.push('KV: ' + num(k.catalogo.n) + ' itens · ' + kb(k.catalogo.bytes));
      l.push('Retratos por hora: ' + k.retratos + (k.retratoMaisVelho ? ' (desde ' + k.retratoMaisVelho + 'h UTC)' : ''));
    }
  } catch (e) {
    l.push('KV: erro: ' + esc(e.message));
  }

  // Leitura do catálogo como o app faz.
  let cat = null;
  const t1 = Date.now();
  try {
    cat = await lerCatalogo(env);
    l.push('Leitura: ' + num(cat.n) + ' itens de ' + (cat.origem === 'rolimons' ? 'Rolimon\'s direto' : cat.origem) + ' em ' + (Date.now() - t1) + ' ms');
  } catch (e) {
    l.push('Leitura do catálogo: erro: ' + esc(e.message));
  }

  // Inventário (sempre direto do Rolimon's).
  try {
    const a = await buscarAtivos(ROBLOX_ID);
    let extra = '';
    if (a.json && a.json.success && cat) extra = ' · ' + resumir(cat.itens, a.json).copias + ' itens';
    else if (a.json && !a.json.success) extra = ' · respondeu sem sucesso';
    l.push('Inventário: HTTP ' + a.status + ' · ' + kb(a.bytes) + ' · ' + a.ms + ' ms' + extra);
  } catch (e) {
    l.push('Inventário: erro: ' + esc(e.message));
  }

  l.push('', 'Tempo total: ' + (Date.now() - t0) + ' ms');
  return enviar(env, chat, l.join('\n'));
}

// ---------- API do Telegram ----------
export async function telegram(env, metodo, corpo) {
  const resp = await fetch('https://api.telegram.org/bot' + env.BOT_TOKEN + '/' + metodo, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  try {
    return await resp.json();
  } catch (e) {
    return { ok: false, description: 'HTTP ' + resp.status };
  }
}

export function enviar(env, chat, txt) {
  return telegram(env, 'sendMessage', { chat_id: chat, text: txt, parse_mode: 'HTML', disable_web_page_preview: true });
}
