// Acesso às APIs públicas (somente leitura): Roblox e Rolimon's.
const cfg = require('config');

function esperar(ms) {
  return new Promise((resolve) => Timer.schedule(ms, false, resolve));
}

function erroApi(mensagem, status, texto, url) {
  const e = new Error(mensagem);
  e.status = status;
  e.url = url;
  e.trecho = texto ? String(texto).slice(0, 300) : '';
  return e;
}

// GET/POST com novas tentativas para 429, 5xx e falhas de rede.
async function requisitar(url, opcoes) {
  opcoes = opcoes || {};
  let ultimoErro = null;
  for (let t = 1; t <= cfg.TENTATIVAS; t++) {
    const r = new Request(url);
    r.timeoutInterval = 25;
    r.headers = { Accept: 'application/json' };
    if (opcoes.method) r.method = opcoes.method;
    if (opcoes.body) {
      r.body = JSON.stringify(opcoes.body);
      r.headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    }

    let texto;
    try {
      texto = await r.loadString();
    } catch (e) {
      ultimoErro = erroApi('Falha de rede: ' + (e.message || e), 0, '', url);
      await esperar(1000 * t);
      continue;
    }

    const status = r.response ? r.response.statusCode : 0;
    if (status === 200) {
      try {
        return JSON.parse(texto);
      } catch (e) {
        throw erroApi('A resposta não veio em JSON', status, texto, url);
      }
    }
    if (status === 429 || status >= 500) {
      ultimoErro = erroApi('HTTP ' + status + (status === 429 ? ' (muitas requisições)' : ''), status, texto, url);
      await esperar(2500 * t);
      continue;
    }
    throw erroApi('HTTP ' + status, status, texto, url);
  }
  throw ultimoErro;
}

// Usa o dado salvo se for recente; se a rede falhar, usa o salvo mesmo que antigo.
async function comCache(store, chave, minutos, buscar, avisos, rotulo) {
  const salvo = store.ler(chave);
  const idadeMin = salvo ? (Date.now() - salvo.salvoEm) / 60000 : Infinity;
  if (salvo && idadeMin < minutos) return { dados: salvo.dados, origem: 'cache' };
  try {
    const dados = await buscar();
    store.gravar(chave, { salvoEm: Date.now(), dados });
    return { dados, origem: 'rede' };
  } catch (e) {
    if (salvo) {
      avisos.push('Não consegui atualizar ' + rotulo + ' (' + e.message + '). Mostrando dados salvos de ' + Math.round(idadeMin) + ' min atrás.');
      return { dados: salvo.dados, origem: 'cache-antigo' };
    }
    throw e;
  }
}

async function buscarUsuario(username) {
  const j = await requisitar('https://users.roblox.com/v1/usernames/users', {
    method: 'POST',
    body: { usernames: [username], excludeBannedUsers: false },
  });
  const u = j && j.data && j.data[0];
  if (!u) throw new Error('Username "' + username + '" não encontrado no Roblox.');
  return { id: u.id, nome: u.name };
}

async function buscarInventario(userId) {
  const itens = [];
  let cursor = null;
  let paginas = 0;
  do {
    let url = 'https://inventory.roblox.com/v1/users/' + userId + '/assets/collectibles?limit=100&sortOrder=Asc';
    if (cursor) url += '&cursor=' + encodeURIComponent(cursor);
    let j;
    try {
      j = await requisitar(url);
    } catch (e) {
      if (e.status === 403) {
        e.message = 'O Roblox recusou o acesso ao inventário (HTTP 403). Confira se o inventário está público nas configurações de privacidade.';
      }
      throw e;
    }
    for (const item of j.data || []) itens.push(item);
    cursor = j.nextPageCursor;
    paginas++;
    if (cursor) await esperar(400);
  } while (cursor && paginas < 50);
  return { itens, paginas };
}

// Itens do jogador segundo o Rolimon's.
// Formato esperado (a confirmar): { success, playerAssets: { assetId: [uaid, ...] }, holds: [...], playerPrivacyEnabled, ... }
async function buscarJogadorRolimons(userId) {
  const j = await requisitar('https://api.rolimons.com/players/v1/playerassets/' + userId);
  if (!j || !j.success || !j.playerAssets) {
    throw erroApi("Resposta inesperada do Rolimon's (jogador)", 200, JSON.stringify(j || {}).slice(0, 300), 'playerassets');
  }
  const resto = {};
  for (const k of Object.keys(j)) if (k !== 'playerAssets') resto[k] = j[k];
  return {
    assets: j.playerAssets,
    holds: Array.isArray(j.holds) ? j.holds : [],
    privado: !!j.playerPrivacyEnabled,
    amostra: JSON.stringify(resto).slice(0, 400),
  };
}

// Catálogo de values do Rolimon's.
// v2 inclui itens novos/UGC; v1 só tem os limiteds clássicos e fica de reserva.
// Formato esperado nas duas:
// items[id] = [nome, sigla, rap, value, default_value, demanda, tendência, projected, hyped, rare]
const CATALOGOS = [
  { versao: 'v2', url: 'https://api.rolimons.com/items/v2/itemdetails' },
  { versao: 'v1', url: 'https://api.rolimons.com/items/v1/itemdetails' },
];

// Confere uma amostra para não mostrar dados embaralhados se o formato mudar.
function formatoValido(items) {
  const chaves = Object.keys(items);
  if (!chaves.length) return false;
  return chaves.slice(0, 25).every((k) => {
    const r = items[k];
    return Array.isArray(r) && r.length >= 10 && typeof r[0] === 'string' && typeof r[2] === 'number' && typeof r[3] === 'number';
  });
}

async function buscarItensRolimons() {
  const falhas = [];
  for (const c of CATALOGOS) {
    try {
      const j = await requisitar(c.url);
      if (!j || !j.success || !j.items) throw new Error('resposta sem items');
      if (!formatoValido(j.items)) {
        const primeiro = j.items[Object.keys(j.items)[0]];
        throw new Error('formato inesperado ' + JSON.stringify(primeiro).slice(0, 150));
      }
      return { items: j.items, qtd: j.item_count || Object.keys(j.items).length, versao: c.versao, falhas };
    } catch (e) {
      falhas.push(c.versao + ': ' + e.message);
    }
  }
  throw new Error("Catálogo do Rolimon's indisponível (" + falhas.join(' | ') + ')');
}

// Endereços das miniaturas (API pública de thumbnails do Roblox), com cache.
// São opcionais: se falhar, o painel segue sem imagens.
async function buscarMiniaturas(store, assetIds) {
  const cache = store.ler('miniaturas') || {};
  const validade = cfg.MINIATURAS_CACHE_HORAS * 3600000;
  const agora = Date.now();
  const faltando = assetIds.filter((id) => !cache[id] || agora - cache[id].em > validade);
  for (let i = 0; i < faltando.length; i += 100) {
    const lote = faltando.slice(i, i + 100);
    try {
      const j = await requisitar(
        'https://thumbnails.roblox.com/v1/assets?assetIds=' + lote.join(',') +
          '&returnPolicy=PlaceHolder&size=110x110&format=Png&isCircular=false'
      );
      for (const d of j.data || []) {
        if (d.imageUrl && d.state === 'Completed') cache[String(d.targetId)] = { url: d.imageUrl, em: agora };
      }
    } catch (e) {
      // sem miniaturas desta vez
    }
  }
  if (faltando.length) store.gravar('miniaturas', cache);
  const r = {};
  for (const id of assetIds) if (cache[id]) r[id] = cache[id].url;
  return r;
}

// Todas as miniaturas ainda válidas no cache (sem rede). Usado pelo avaliador.
function miniaturasEmCache(store) {
  const cache = store.ler('miniaturas') || {};
  const validade = cfg.MINIATURAS_CACHE_HORAS * 3600000;
  const agora = Date.now();
  const r = {};
  for (const id of Object.keys(cache)) {
    if (cache[id] && cache[id].url && agora - cache[id].em <= validade) r[id] = cache[id].url;
  }
  return r;
}

// Anúncios de trade recentes do Rolimon's (aba Anúncios).
// Formato esperado (fontes de terceiros, conferido no Diagnóstico):
// { success, trade_ad_count, trade_ads: [[id, criado, userId, username, {items, robux}, {items, tags}], ...] }
// Aqui só se confere o envelope; cada anúncio é lido em anuncios.js.
async function buscarAnunciosRecentes() {
  const url = 'https://api.rolimons.com/tradeads/v1/getrecentads';
  const j = await requisitar(url);
  if (!j || j.success === false) {
    throw erroApi("O Rolimon's recusou a lista de anúncios", 200, JSON.stringify(j || {}).slice(0, 300), url);
  }
  const lista = Array.isArray(j.trade_ads) ? j.trade_ads : null;
  if (!lista) throw erroApi('Resposta sem trade_ads', 200, JSON.stringify(j).slice(0, 300), url);
  const resto = {};
  for (const k of Object.keys(j)) if (k !== 'trade_ads') resto[k] = j[k];
  return { lista, resto: JSON.stringify(resto).slice(0, 200) };
}

// Descobre o id do username (users.roblox.com) só quando o username muda.
// conta = { username, userId, nomeReal, userIdDe }. Retorna true se mudou algo
// (quem chama grava os ajustes).
async function garantirId(conta) {
  if (conta.userId && conta.userIdDe === conta.username) return false;
  const u = await buscarUsuario(conta.username);
  conta.userId = u.id;
  conta.nomeReal = u.nome;
  conta.userIdDe = conta.username;
  return true;
}

// v5.2: itens da conta 2 (só pelo Rolimon's, sem a conferência do Roblox,
// para gastar uma chamada a menos). Cache próprio por id.
async function carregarJogador(store, conta, minutos) {
  const avisos = [];
  const nome = conta.nomeReal || conta.username;
  const j = await comCache(
    store, 'cache_jogador_' + conta.userId, minutos,
    () => buscarJogadorRolimons(conta.userId), avisos, 'os itens de ' + nome + " no Rolimon's"
  );
  if (j.dados.privado) avisos.push("O Rolimon's marca o inventário de " + nome + ' como privado. A lista pode estar incompleta.');
  return { usuario: { id: conta.userId, nome }, jogador: j.dados, origem: j.origem, avisos };
}

async function carregarTudo(store, ajustes) {
  const avisos = [];

  if (await garantirId(ajustes)) store.gravar('ajustes', ajustes);
  const usuario = { id: ajustes.userId, nome: ajustes.nomeReal || ajustes.username };

  // Fonte principal dos itens: Rolimon's. Conferência: Roblox.
  let jogador = null;
  let roblox = null;
  let erroJogador = null;
  let erroRoblox = null;
  try {
    jogador = await comCache(
      store, 'cache_jogador_' + usuario.id, cfg.CACHE_INVENTARIO_MIN,
      () => buscarJogadorRolimons(usuario.id), avisos, "o inventário no Rolimon's"
    );
  } catch (e) {
    erroJogador = e;
  }
  try {
    roblox = await comCache(
      store, 'cache_inventario_' + usuario.id, cfg.CACHE_INVENTARIO_MIN,
      () => buscarInventario(usuario.id), avisos, 'o inventário no Roblox'
    );
  } catch (e) {
    erroRoblox = e;
  }
  if (!jogador && !roblox) throw erroJogador || erroRoblox;
  if (!jogador) avisos.push("Rolimon's indisponível (" + erroJogador.message + '). Itens vindos só do Roblox.');
  if (!roblox) avisos.push('Não deu para conferir com o Roblox (' + erroRoblox.message + ').');
  if (jogador && jogador.dados.privado) avisos.push("O Rolimon's marca o inventário como privado. A lista pode estar incompleta.");

  const rol = await comCache(
    store, 'cache_catalogo', cfg.CACHE_ROLIMONS_MIN,
    buscarItensRolimons, avisos, "os values do Rolimon's"
  );
  if (rol.dados.versao !== 'v2') {
    avisos.push("Catálogo novo do Rolimon's indisponível, usando o antigo. Itens recentes podem ficar sem dados.");
  }

  return {
    usuario,
    jogador: jogador ? jogador.dados : null,
    roblox: roblox ? roblox.dados : null,
    rolimons: rol.dados.items,
    rolimonsQtd: rol.dados.qtd,
    catalogo: { versao: rol.dados.versao, falhas: rol.dados.falhas || [] },
    origem: {
      jogador: jogador ? jogador.origem : 'falhou',
      roblox: roblox ? roblox.origem : 'falhou',
      values: rol.origem,
    },
    avisos,
  };
}

// ---------- v6.8.2: TESTE das fontes do card do item (temporário) ----------
// Ao tocar num item, cada fonte candidata é consultada UMA vez, uma de cada vez,
// sem novas tentativas. Nada aqui lança erro: devolve o que cada uma respondeu
// (status, tempo, tamanho, campos) para aparecer na folha do item.
const FONTES_TESTE = [
  { nome: 'A · Roblox resale-data', tipo: 'json', url: (id) => 'https://economy.roblox.com/v1/assets/' + id + '/resale-data' },
  { nome: 'B · Roblox resellers', tipo: 'json', url: (id) => 'https://economy.roblox.com/v1/assets/' + id + '/resellers?limit=10' },
  { nome: 'C · Roblox v2 details', tipo: 'json', url: (id) => 'https://economy.roblox.com/v2/assets/' + id + '/details' },
  { nome: "D · Página do Rolimon's", tipo: 'html', url: (id) => 'https://www.rolimons.com/item/' + id },
];

function curto(v, n) {
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// Campos de um JSON, um nível para dentro: "lista[12]", "obj{a=1, b=2}", "x=3".
function camposJson(j) {
  if (Array.isArray(j)) return ['(lista com ' + j.length + ')'];
  if (!j || typeof j !== 'object') return ['(' + curto(j, 40) + ')'];
  return Object.keys(j).slice(0, 25).map((k) => {
    const v = j[k];
    if (Array.isArray(v)) return k + '[' + v.length + ']';
    if (v && typeof v === 'object') {
      const dentro = Object.keys(v).slice(0, 12).map((k2) => {
        const v2 = v[k2];
        return k2 + (v2 && typeof v2 === 'object' ? (Array.isArray(v2) ? '[' + v2.length + ']' : '{…}') : '=' + curto(v2, 18));
      });
      return k + '{' + dentro.join(', ') + '}';
    }
    return k + '=' + curto(v, 24);
  });
}

// Leituras já prontas para o card, quando o formato é o esperado.
function extrasJson(nome, j) {
  const ex = [];
  if (!j || typeof j !== 'object') return ex;
  if (nome.indexOf('resale-data') >= 0) {
    const vol = Array.isArray(j.volumeDataPoints) ? j.volumeDataPoints : [];
    const preco = Array.isArray(j.priceDataPoints) ? j.priceDataPoints : [];
    if (vol.length) {
      const desde = Date.now() - 30 * 86400000;
      let soma = 0;
      let min = Infinity;
      let max = -Infinity;
      for (const p of vol) {
        const t = p ? Date.parse(p.date) : NaN;
        if (t < min) min = t;
        if (t > max) max = t;
        if (t >= desde && Number(p.value) > 0) soma += Number(p.value);
      }
      ex.push('vendas/dia (30 dias): ' + (Math.round((soma / 30) * 100) / 100));
      if (isFinite(min)) ex.push('dias com venda de ' + new Date(min).toISOString().slice(0, 10) + ' até ' + new Date(max).toISOString().slice(0, 10));
    }
    if (preco.length) ex.push('1º ponto de preço: ' + curto(JSON.stringify(preco[0]), 60));
  }
  if (nome.indexOf('resellers') >= 0 && Array.isArray(j.data)) {
    const precos = j.data.map((x) => x && Number(x.price)).filter((x) => x > 0);
    if (precos.length) ex.push('menor preço à venda: ' + Math.min.apply(null, precos));
  }
  if (nome.indexOf('details') >= 0 && j.CollectiblesItemDetails) {
    ex.push('CollectiblesItemDetails: ' + curto(JSON.stringify(j.CollectiblesItemDetails), 160));
  }
  return ex;
}

// Página HTML: nomes das variáveis do script (ex.: history_data) e sinais de bloqueio.
function camposHtml(texto) {
  const nomes = [];
  const re = /var\s+([A-Za-z_][A-Za-z0-9_]*)\s*=/g;
  let m;
  while ((m = re.exec(texto)) && nomes.length < 30) if (nomes.indexOf(m[1]) < 0) nomes.push(m[1]);
  const ex = [];
  const t = /<title>([^<]*)<\/title>/i.exec(texto);
  if (t) ex.push('título: ' + curto(t[1], 60));
  if (/cf-chl|Just a moment|Attention Required/i.test(texto)) ex.push('parece bloqueio do Cloudflare');
  const pts = /"num_points"\s*:\s*(\d+)/.exec(texto);
  if (pts) ex.push('history num_points: ' + pts[1]);
  for (const chave of ['copies', 'owners', 'premium', 'best_price', 'sales']) {
    const r2 = new RegExp('"([a-z_]*' + chave + '[a-z_]*)"\\s*:\\s*(-?\\d+)', 'i').exec(texto);
    if (r2) ex.push(r2[1] + ': ' + r2[2]);
  }
  return { campos: nomes.length ? ['variáveis: ' + nomes.join(', ')] : ['(sem variáveis no script)'], extras: ex };
}

async function sondarFonte(f, assetId) {
  const url = f.url(encodeURIComponent(assetId));
  const r = new Request(url);
  r.timeoutInterval = 12;
  r.headers = { Accept: f.tipo === 'json' ? 'application/json' : 'text/html' };
  const inicio = Date.now();
  const res = { nome: f.nome, status: 0, ms: 0, kb: 0, campos: [], extras: [], trecho: '', erro: '' };
  let texto = '';
  try {
    texto = await r.loadString();
  } catch (e) {
    res.erro = 'falha de rede: ' + curto(e.message || e, 80);
  }
  res.ms = Date.now() - inicio;
  res.status = r.response ? r.response.statusCode : 0;
  res.kb = Math.round(((texto || '').length / 1024) * 10) / 10;
  if (res.erro) return res;
  if (f.tipo === 'json') {
    try {
      const j = JSON.parse(texto);
      res.campos = camposJson(j);
      res.extras = extrasJson(f.nome, j);
    } catch (e) {
      res.erro = 'não veio em JSON';
    }
  } else {
    const h = camposHtml(texto || '');
    res.campos = h.campos;
    res.extras = h.extras;
  }
  if (res.status !== 200 || res.erro) res.trecho = curto(texto || '', 160);
  return res;
}

async function sondarFontes(assetId) {
  const fontes = [];
  for (const f of FONTES_TESTE) fontes.push(await sondarFonte(f, assetId));
  return { id: String(assetId), em: Date.now(), fontes };
}

module.exports = { carregarTudo, garantirId, carregarJogador, buscarMiniaturas, miniaturasEmCache, buscarAnunciosRecentes, sondarFontes };
