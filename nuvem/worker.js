// Trade Helper na nuvem · Fase 0 (teste)
// Bot do Telegram que roda num Cloudflare Worker e responde:
//   /start  mostra o seu id do Telegram (para guardar em MEU_ID)
//   /inv    value e RAP totais da conta, itens e holds
//   /diag   testa se o Rolimon's responde à nuvem e se o plano grátis aguenta
// Separado do app do Scriptable: o loader não baixa esta pasta.
//
// Segredos (Cloudflare > Worker > Settings > Variables and Secrets).
// NUNCA coloque esses valores neste arquivo: o repositório é público.
//   BOT_TOKEN    chave do @BotFather
//   SENHA_SETUP  palavra inventada por você, só letras, números, - e _
//   MEU_ID       seu id do Telegram (o /start mostra)

const ROBLOX_ID = 466264969; // conta obsory
const NOME_CONTA = 'obsory';
const URL_CATALOGO = 'https://api.rolimons.com/items/v2/itemdetails';
const URL_ATIVOS = (id) => 'https://api.rolimons.com/players/v1/playerassets/' + id;
const GUARDA_MS = 5 * 60 * 1000; // o Rolimon's pede ~1 consulta por minuto no catálogo
const CABECALHOS = { 'User-Agent': 'TradeHelper-nuvem/0.1', Accept: 'application/json' };

// Guarda na memória do Worker. Pode sumir a qualquer hora (o Worker reinicia);
// aí busca de novo. Na Fase 2 isto vira um armazenamento de verdade (KV).
const memoria = { catalogo: null, catalogoEm: 0, catalogoBytes: 0 };

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    if (url.pathname === '/setup') return configurar(url, env);

    if (url.pathname === '/tg' && req.method === 'POST') {
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
      ctx.waitUntil(tratar(upd, env).catch((e) => console.log('erro: ' + (e && e.stack ? e.stack : e))));
      return new Response('ok');
    }

    return new Response('Trade Helper nuvem: no ar (Fase 0).', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};

// ---------- /setup: liga o bot a este Worker ----------
async function configurar(url, env) {
  const txt = (s, st) => new Response(s, { status: st || 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  if (!env.BOT_TOKEN || !env.SENHA_SETUP) return txt('Faltam os segredos BOT_TOKEN e SENHA_SETUP no Worker.', 500);
  if (url.searchParams.get('k') !== env.SENHA_SETUP) return txt('Senha errada.', 401);
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(env.SENHA_SETUP)) {
    return txt('A SENHA_SETUP só pode ter letras, números, - e _ (sem espaço nem acento).', 400);
  }
  const gancho = await telegram(env, 'setWebhook', {
    url: url.origin + '/tg',
    secret_token: env.SENHA_SETUP,
    allowed_updates: ['message'],
    drop_pending_updates: true,
  });
  const cmds = await telegram(env, 'setMyCommands', {
    commands: [
      { command: 'inv', description: 'Value e RAP da conta' },
      { command: 'diag', description: 'Testar a nuvem e o Rolimon\'s' },
      { command: 'start', description: 'Mostrar meu id do Telegram' },
    ],
  });
  const ok = gancho.ok && cmds.ok;
  return txt(
    (ok ? 'Pronto! O bot está ligado a este Worker. Volte ao Telegram e mande /start.' : 'Algo falhou.') +
      '\n\nwebhook: ' + (gancho.ok ? 'ok' : gancho.description) +
      '\ncomandos: ' + (cmds.ok ? 'ok' : cmds.description),
    ok ? 200 : 500
  );
}

// ---------- mensagens ----------
async function tratar(upd, env) {
  const msg = upd && upd.message;
  if (!msg || !msg.text || !msg.chat) return;
  const chat = msg.chat.id;
  const de = msg.from ? String(msg.from.id) : '';
  const cmd = msg.text.trim().split(/[\s@]/)[0].toLowerCase();

  if (cmd === '/start') {
    if (env.MEU_ID && de === String(env.MEU_ID)) {
      return enviar(env, chat, 'Oi! Tudo certo. Mande /inv para ver a sua conta ou /diag para o teste da nuvem.');
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

  if (cmd === '/inv') return inventario(env, chat);
  if (cmd === '/diag') return diagnostico(env, chat);
  return enviar(env, chat, 'Comandos: /inv e /diag.');
}

// ---------- /inv ----------
async function inventario(env, chat) {
  let cat, ativos;
  try {
    [cat, ativos] = await Promise.all([catalogo(), buscarJSON(URL_ATIVOS(ROBLOX_ID))]);
  } catch (e) {
    return enviar(env, chat, 'Não consegui falar com o Rolimon\'s: ' + esc(e.message) + '\nMande /diag para ver o detalhe.');
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
  linhas.push('', '<i>Catálogo ' + (cat.daMemoria ? 'guardado há ' + minutos(Date.now() - cat.em) : 'buscado agora') + ' · Rolimon\'s</i>');
  return enviar(env, chat, linhas.join('\n'));
}

// Mesma regra do app: value base = value; sem value, usa o RAP. -1 = sem dado.
// Layout do itemdetails: [nome, sigla, rap, value, default_value, demanda, tendência, projected, hyped, rare]
function resumir(itens, json) {
  const holds = new Set((json.holds || []).map(String));
  let value = 0, rap = 0, copias = 0, emHold = 0, semDado = 0;
  const lista = [];
  const ativos = json.playerAssets || {};
  for (const assetId of Object.keys(ativos)) {
    const uaids = ativos[assetId] || [];
    const it = itens[assetId];
    for (const uaid of uaids) {
      copias++;
      const hold = holds.has(String(uaid));
      if (hold) emHold++;
      if (!it) {
        semDado++;
        continue;
      }
      const r = it[2] > 0 ? it[2] : 0;
      const v = it[3] > 0 ? it[3] : 0;
      const base = v || r;
      value += base;
      rap += r;
      lista.push({ nome: it[0], base, temValue: v > 0, hold });
    }
  }
  lista.sort((a, b) => b.base - a.base);
  return { value, rap, copias, holds: emHold, semDado, maiores: lista.slice(0, 4) };
}

// ---------- /diag ----------
// Manda em duas partes: se a segunda não chegar, o plano grátis estourou
// o limite de processamento ao ler o catálogo.
async function diagnostico(env, chat) {
  const t0 = Date.now();
  let a, c;
  try {
    a = await buscarTexto(URL_ATIVOS(ROBLOX_ID));
  } catch (e) {
    a = { erro: e.message };
  }
  const usarMemoria = memoria.catalogo && Date.now() - memoria.catalogoEm < GUARDA_MS;
  if (!usarMemoria) {
    try {
      c = await buscarTexto(URL_CATALOGO);
    } catch (e) {
      c = { erro: e.message };
    }
  }
  const p1 = [
    '<b>Diagnóstico · parte 1 de 2</b>',
    '',
    'Inventário: ' + (a.erro ? 'erro: ' + esc(a.erro) : 'HTTP ' + a.status + ' · ' + kb(a.bytes) + ' · ' + a.ms + ' ms'),
    'Catálogo: ' +
      (usarMemoria
        ? 'guardado na memória há ' + minutos(Date.now() - memoria.catalogoEm) + ' (' + kb(memoria.catalogoBytes) + ')'
        : c.erro
        ? 'erro: ' + esc(c.erro)
        : 'HTTP ' + c.status + ' · ' + kb(c.bytes) + ' · ' + c.ms + ' ms'),
    '',
    'Agora vou ler o catálogo. Se a parte 2 não chegar em ~1 minuto, o plano grátis da Cloudflare não aguentou.',
  ];
  await enviar(env, chat, p1.join('\n'));

  if (!usarMemoria && (c.erro || c.status !== 200)) {
    const trecho = c.texto ? esc(c.texto.slice(0, 200)) : '';
    return enviar(env, chat, '<b>Parte 2 de 2</b>\n\nO Rolimon\'s não entregou o catálogo para a nuvem.' + (trecho ? '\n\nResposta: <code>' + trecho + '</code>' : ''));
  }

  const t1 = Date.now();
  let n = 0;
  try {
    if (!usarMemoria) guardarCatalogo(JSON.parse(c.texto), c.bytes);
    n = Object.keys(memoria.catalogo).length;
  } catch (e) {
    return enviar(env, chat, '<b>Parte 2 de 2</b>\n\nO catálogo veio, mas não consegui ler: ' + esc(e.message));
  }
  let invOk = 'não deu para conferir';
  try {
    const j = JSON.parse(a.texto);
    invOk = j.success ? resumir(memoria.catalogo, j).copias + ' itens encontrados' : 'o Rolimon\'s respondeu sem sucesso';
  } catch (e) {
    // fica a mensagem padrão
  }
  return enviar(
    env,
    chat,
    '<b>Parte 2 de 2</b>\n\nCatálogo lido: ' + n.toLocaleString('pt-BR') + ' itens.\nInventário: ' + invOk +
      '.\nTempo total: ' + (Date.now() - t0) + ' ms (leitura ' + (Date.now() - t1) + ' ms).\n\nTudo certo: a nuvem consegue falar com o Rolimon\'s e o plano grátis aguentou.'
  );
}

// ---------- Rolimon's ----------
async function catalogo() {
  if (memoria.catalogo && Date.now() - memoria.catalogoEm < GUARDA_MS) {
    return { itens: memoria.catalogo, daMemoria: true, em: memoria.catalogoEm };
  }
  const r = await buscarTexto(URL_CATALOGO);
  if (r.status !== 200) throw new Error('catálogo HTTP ' + r.status);
  guardarCatalogo(JSON.parse(r.texto), r.bytes);
  return { itens: memoria.catalogo, daMemoria: false, em: memoria.catalogoEm };
}

function guardarCatalogo(j, bytes) {
  if (!j || !j.items) throw new Error('catálogo sem "items"');
  memoria.catalogo = j.items;
  memoria.catalogoEm = Date.now();
  memoria.catalogoBytes = bytes || 0;
}

async function buscarTexto(url) {
  const t = Date.now();
  const resp = await fetch(url, { headers: CABECALHOS });
  const texto = await resp.text();
  return { status: resp.status, texto, bytes: texto.length, ms: Date.now() - t };
}

async function buscarJSON(url) {
  const r = await buscarTexto(url);
  let json = null;
  try {
    json = JSON.parse(r.texto);
  } catch (e) {
    json = null;
  }
  return { status: r.status, json };
}

// ---------- Telegram ----------
async function telegram(env, metodo, corpo) {
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

function enviar(env, chat, texto) {
  return telegram(env, 'sendMessage', { chat_id: chat, text: texto, parse_mode: 'HTML', disable_web_page_preview: true });
}

// ---------- formatação ----------
function num(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function kb(b) {
  return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.round(b / 1024) + ' KB';
}
function minutos(ms) {
  const m = Math.round(ms / 60000);
  return m < 1 ? 'menos de 1 min' : m + ' min';
}
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
