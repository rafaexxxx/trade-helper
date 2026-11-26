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
// v7.0: as fotos ficam grandes nas telas novas (Vitrine, Anúncios), então o
// tamanho passou de 110x110 para 250x250. As guardadas no tamanho antigo (sem
// "t: 250") são buscadas de novo na próxima vez; até lá, servem as antigas.
const MINIATURA_TAM = 250;
async function buscarMiniaturas(store, assetIds) {
  const cache = store.ler('miniaturas') || {};
  const validade = cfg.MINIATURAS_CACHE_HORAS * 3600000;
  const agora = Date.now();
  const faltando = assetIds.filter((id) => !cache[id] || cache[id].t !== MINIATURA_TAM || agora - cache[id].em > validade);
  for (let i = 0; i < faltando.length; i += 100) {
    const lote = faltando.slice(i, i + 100);
    try {
      const j = await requisitar(
        'https://thumbnails.roblox.com/v1/assets?assetIds=' + lote.join(',') +
          '&returnPolicy=PlaceHolder&size=' + MINIATURA_TAM + 'x' + MINIATURA_TAM + '&format=Png&isCircular=false'
      );
      for (const d of j.data || []) {
        if (d.imageUrl && d.state === 'Completed') cache[String(d.targetId)] = { url: d.imageUrl, em: agora, t: MINIATURA_TAM };
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

// opcoes.widget = true quando roda no widget (v6.13.1: widget mais leve).
async function carregarTudo(store, ajustes, opcoes) {
  const noWidget = !!(opcoes && opcoes.widget);
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
  // v6.13.1: no widget, com os itens do Rolimon's em mãos, o inventário do Roblox
  // não é baixado (são várias páginas): usa o que o painel salvou, de qualquer
  // idade, só para completar os holds. Sem Rolimon's, busca normalmente (reserva).
  const salvoRoblox = noWidget && jogador ? store.ler('cache_inventario_' + usuario.id) : null;
  if (salvoRoblox && salvoRoblox.dados) {
    roblox = { dados: salvoRoblox.dados, origem: 'cache-widget' };
  } else {
    try {
      roblox = await comCache(
        store, 'cache_inventario_' + usuario.id, cfg.CACHE_INVENTARIO_MIN,
        () => buscarInventario(usuario.id), avisos, 'o inventário no Roblox'
      );
    } catch (e) {
      erroRoblox = e;
    }
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

// ---------- v6.9: card do item (só ao tocar no item) ----------
// Uma tentativa só, sem esperar e repetir: o card mostra o que veio.
// Retorna { status, texto, ms }; erro de rede ou HTTP diferente de 200 lança erroApi.
async function buscarTexto(url, aceita, segundos) {
  const r = new Request(url);
  r.timeoutInterval = segundos;
  r.headers = { Accept: aceita };
  const inicio = Date.now();
  let texto;
  try {
    texto = await r.loadString();
  } catch (e) {
    throw erroApi('Falha de rede: ' + (e.message || e), 0, '', url);
  }
  const status = r.response ? r.response.statusCode : 0;
  if (status !== 200) throw erroApi('HTTP ' + status + (status === 429 ? ' (muitas requisições)' : ''), status, texto, url);
  return { status, texto: texto || '', ms: Date.now() - inicio };
}

// Página do item no Rolimon's (HTML de ~850 KB). É dela que saem o histórico
// do RAP, o best price e as vendas por dia (testado no iPhone na v6.8.2).
// Não é uma API oficial: o formato pode mudar sem aviso (cartao.js lê com cuidado).
async function buscarPaginaItem(assetId) {
  return buscarTexto('https://www.rolimons.com/item/' + encodeURIComponent(assetId), 'text/html', 20);
}

// Reserva do Best Price: Roblox v2 details (sem login, ~1 KB).
// CollectiblesItemDetails.CollectibleLowestResalePrice = menor preço à venda.
async function buscarMenorPreco(assetId) {
  const url = 'https://economy.roblox.com/v2/assets/' + encodeURIComponent(assetId) + '/details';
  const r = await buscarTexto(url, 'application/json', 12);
  let j;
  try {
    j = JSON.parse(r.texto);
  } catch (e) {
    throw erroApi('A resposta não veio em JSON', r.status, r.texto, url);
  }
  const d = j && j.CollectiblesItemDetails;
  const preco = d ? Number(d.CollectibleLowestResalePrice) : NaN;
  if (!(preco > 0)) throw erroApi('Sem CollectibleLowestResalePrice', r.status, r.texto, url);
  return { preco, ms: r.ms };
}

module.exports = { carregarTudo, garantirId, carregarJogador, buscarMiniaturas, miniaturasEmCache, buscarAnunciosRecentes, buscarPaginaItem, buscarMenorPreco };
