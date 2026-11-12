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

// Formato esperado (a confirmar no 1º teste):
// items[id] = [nome, sigla, rap, value, default_value, demanda, tendência, projected, hyped, rare]
async function buscarItensRolimons() {
  const j = await requisitar('https://api.rolimons.com/items/v1/itemdetails');
  if (!j || !j.success || !j.items) {
    throw erroApi("Resposta inesperada do Rolimon's", 200, JSON.stringify(j || {}).slice(0, 300), 'itemdetails');
  }
  return { items: j.items, qtd: j.item_count || Object.keys(j.items).length };
}

async function carregarTudo(store, ajustes) {
  const avisos = [];

  if (!ajustes.userId || ajustes.userIdDe !== ajustes.username) {
    const u = await buscarUsuario(ajustes.username);
    ajustes.userId = u.id;
    ajustes.nomeReal = u.nome;
    ajustes.userIdDe = ajustes.username;
    store.gravar('ajustes', ajustes);
  }
  const usuario = { id: ajustes.userId, nome: ajustes.nomeReal || ajustes.username };

  const inv = await comCache(
    store, 'cache_inventario_' + usuario.id, cfg.CACHE_INVENTARIO_MIN,
    () => buscarInventario(usuario.id), avisos, 'o inventário'
  );
  const rol = await comCache(
    store, 'cache_rolimons', cfg.CACHE_ROLIMONS_MIN,
    buscarItensRolimons, avisos, "os values do Rolimon's"
  );

  return {
    usuario,
    inventario: inv.dados.itens,
    paginas: inv.dados.paginas,
    rolimons: rol.dados.items,
    rolimonsQtd: rol.dados.qtd,
    origem: { inventario: inv.origem, rolimons: rol.origem },
    avisos,
  };
}

module.exports = { carregarTudo };
