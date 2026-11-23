// Ponto de entrada: decide entre painel completo (no app) e widget (tela inicial).
const cfg = require('config');
const hist = require('historico');
const api = require('api');
const analise = require('analise');
const html = require('html');
const widget = require('widget');
const avaliador = require('avaliador');
const anuncios = require('anuncios');
const diario = require('diario');
const notificacoes = require('notificacoes');
const cartao = require('cartao');

// v6.2: aba pedida ao abrir pelo toque na notificação (?aba=anuncios no
// scriptable:///run/..., ou o userInfo da notificação). args é global do
// Scriptable (como o Safari): se não existir, abre como sempre.
function abaPedida() {
  try {
    if (typeof args === 'undefined' || !args) return null;
    const q = args.queryParameters || {};
    if (q.aba) return String(q.aba);
    const n = args.notification;
    if (n && n.userInfo && n.userInfo.aba) return String(n.userInfo.aba);
  } catch (e) {
    // abre como sempre
  }
  return null;
}

async function pedirUsername(atual) {
  const al = new Alert();
  al.title = 'Trade Helper';
  al.message = 'Qual é o seu username do Roblox?\n(fica salvo só neste iPhone)';
  al.addTextField('username', atual || '');
  al.addAction('Salvar');
  al.addCancelAction('Cancelar');
  const escolha = await al.presentAlert();
  const valor = al.textFieldValue(0).trim();
  if (escolha === -1 || !valor) {
    const e = new Error('Cancelado');
    e.cancelado = true;
    throw e;
  }
  return valor;
}

// v5.2: logo depois do username principal, pergunta a conta 2 (opcional).
// Retorna o username ou '' (Agora não). Tudo fica só neste iPhone.
async function pedirConta2(atual) {
  const al = new Alert();
  al.title = 'Conta 2 (opcional)';
  al.message = 'Quer acompanhar outra conta também? Digite o username dela.\n(fica salvo só neste iPhone; dá para mudar depois no botão ⋯)';
  al.addTextField('username da conta 2', atual || '');
  al.addAction('Salvar');
  al.addCancelAction('Agora não');
  const escolha = await al.presentAlert();
  const valor = al.textFieldValue(0).trim();
  return escolha === -1 ? '' : valor;
}

const USERNAME_VALIDO = /^[A-Za-z0-9_]{3,20}$/;

function mesmoNome(x, y) {
  return String(x || '').toLowerCase() === String(y || '').toLowerCase();
}

// Variação dos totais + mudanças por item em relação a um retrato base.
function comparar(itens, totais, base) {
  return {
    base,
    var: analise.compararTotais(totais, base),
    mudancas: analise.encontrarMudancas(itens, base, cfg),
  };
}

// Imagens para o widget: baixa uma vez e guarda no iPhone.
async function imagensParaWidget(dirDados, itens, miniaturas, limite) {
  const fm = FileManager.local();
  const pasta = fm.joinPath(dirDados, 'imagens');
  if (!fm.fileExists(pasta)) fm.createDirectory(pasta, true);
  const r = {};
  for (const i of itens.slice(0, limite)) {
    const id = String(i.assetId);
    const p = fm.joinPath(pasta, id + '.png');
    try {
      if (fm.fileExists(p)) {
        r[id] = fm.readImage(p);
      } else if (miniaturas[id]) {
        const img = await new Request(miniaturas[id]).loadImage();
        fm.writeImage(p, img);
        r[id] = img;
      }
    } catch (e) {
      // segue sem a imagem deste item
    }
  }
  return r;
}

async function executar(ctx) {
  const noWidget = config.runsInWidget;
  const store = hist.criarArmazenamento(ctx.dirDados);
  let ajustes = store.ler('ajustes') || {};
  const avisosIniciais = [];

  if (!ajustes.username || (ctx.trocarUsername && !noWidget)) {
    if (noWidget) throw new Error('Abra o Trade Helper no app do Scriptable uma vez para informar o username.');
    // A conta 2 salva continua (o TROCAR_USERNAME do loader não a apaga).
    const conta2Antes = ajustes.conta2 || null;
    const temaAntes = ajustes.tema || null;
    const sustosAntes = ajustes.sustos;
    ajustes = { username: await pedirUsername(ajustes.username) };
    if (temaAntes) ajustes.tema = temaAntes;
    if (sustosAntes === false) ajustes.sustos = false;
    const u2 = await pedirConta2(conta2Antes ? conta2Antes.username : '');
    if (u2 && USERNAME_VALIDO.test(u2) && !mesmoNome(u2, ajustes.username)) {
      ajustes.conta2 = conta2Antes && conta2Antes.username === u2 ? conta2Antes : { username: u2 };
    } else if (conta2Antes && !mesmoNome(conta2Antes.username, ajustes.username)) {
      ajustes.conta2 = conta2Antes;
    }
    if (u2 && !(ajustes.conta2 && ajustes.conta2.username === u2)) {
      avisosIniciais.push('A conta 2 "' + u2 + '" não foi salva (username inválido ou igual ao principal). Use o botão ⋯ para tentar de novo.');
    }
    store.gravar('ajustes', ajustes);
  }

  const dados = await api.carregarTudo(store, ajustes);
  const { itens, fonte, divergencia } = analise.montarItens(dados);
  const totais = analise.calcularTotais(itens);
  const agora = Date.now();

  // v6.1: diário de trades (só a conta principal). Painel e widget comparam os
  // itens com a consulta anterior e guardam a pergunta; só o painel pergunta.
  // Se algo falhar aqui, o resto segue.
  let diarioResumo;
  try {
    diarioResumo = diario.detectar(store, dados, itens, fonte, agora, noWidget ? 'widget' : 'painel');
  } catch (e) {
    diarioResumo = 'erro: ' + (e.message || String(e));
  }

  // Só compara com retratos feitos a partir da mesma fonte de itens.
  const salvo = hist.lerSnapshot(store);
  const ultima = comparar(itens, totais, salvo && salvo.fonte === fonte ? salvo : null);
  const dia = comparar(itens, totais, hist.base24h(store, agora, fonte));

  // Painel e widget alimentam o histórico por hora (depois de calcular a base de 24h).
  const atual = analise.criarSnapshot(itens, totais, fonte);
  hist.registrarHistorico(store, atual, cfg);

  // Retrato do catálogo (variação de 24h no avaliador). Painel e widget gravam,
  // mas nunca a partir de um cache antigo (seria um retrato com data errada).
  const retratoCatalogo = { gravou: false, erro: null };
  if (dados.origem.values !== 'cache-antigo') {
    try {
      retratoCatalogo.gravou = hist.registrarRetratoCatalogo(ctx.dirDados, dados.rolimons, agora, cfg);
    } catch (e) {
      retratoCatalogo.erro = e.message || String(e);
    }
  }

  const miniaturas = await api.buscarMiniaturas(store, itens.map((i) => String(i.assetId)));
  const avisos = (ctx.avisos || []).concat(avisosIniciais, dados.avisos);
  const robloxItens = dados.roblox ? dados.roblox.itens : [];

  const resultado = {
    usuario: dados.usuario,
    // v5.2: só o nome da conta 2 (os itens dela vêm pela ponte, ao tocar no alternador).
    conta2: ajustes.conta2 ? { nome: ajustes.conta2.nomeReal || ajustes.conta2.username } : null,
    // v5.3.1: tema escolhido no menu ⋯ (gravado no arquivo de ajustes).
    tema: html.temaValido(ajustes.tema) ? ajustes.tema : null,
    // v6.4: sustos da Fita Perdida (ligados, a não ser que o usuário desligue).
    sustos: ajustes.sustos !== false,
    itens,
    fonte,
    totais,
    // v5.1: as quedas de value/RAP dos alertas contam em 24h (igual às setas da lista).
    riscos: analise.encontrarRiscos(itens, dia.base, cfg),
    comparacoes: { ultima, dia },
    miniaturas,
    imagens: {},
    avisos,
    agora,
    versao: ctx.versao,
    sha: ctx.sha,
    diag: {
      versao: ctx.versao,
      commit: String(ctx.sha || '').slice(0, 7),
      loader: ctx.loaderVersao,
      tema: (ajustes.tema || 'segue o iPhone') + (ajustes.sustos === false ? ' (sustos desligados)' : ''),
      usuario: dados.usuario,
      fonteItens: fonte,
      origem: dados.origem,
      itensMostrados: itens.length,
      itensRoblox: dados.roblox ? robloxItens.length : null,
      catalogo: dados.catalogo,
      itensCatalogoRolimons: dados.rolimonsQtd,
      foraDoCatalogoRolimons: itens.filter((i) => i.semRolimons).length,
      miniaturas: Object.keys(miniaturas).length + '/' + itens.length,
      historico: {
        retratos: hist.tamanhoHistorico(store),
        base24h: dia.base ? analise.fmtData(dia.base.data) : null,
        ultimaConsulta: ultima.base ? analise.fmtData(ultima.base.data) : null,
      },
      divergencia,
      diario: diarioResumo,
      linhasDoCatalogo: itens.slice(0, 10).map((i) => ({
        assetId: i.assetId,
        linha: dados.rolimons[String(i.assetId)] || null,
      })),
      jogadorRolimons: dados.jogador
        ? { assets: dados.jogador.assets, holds: dados.jogador.holds, resto: dados.jogador.amostra }
        : null,
      robloxUaids: robloxItens.map((x) => x.userAssetId + ':' + x.assetId),
      avisos,
    },
  };

  if (noWidget) {
    resultado.imagens = await imagensParaWidget(ctx.dirDados, itens, miniaturas, cfg.WIDGET_MAX_ITENS_GRANDE);
    Script.setWidget(widget.montar(resultado, cfg));
    // v6.2: notificação-resumo (anúncios "Vale muito a pena" e riscos dos seus
    // itens). Depois do widget pronto; se algo falhar, o widget segue igual.
    try {
      await notificacoes.verificar({ store, cfg, dados, itens, dirDados: ctx.dirDados, agora });
    } catch (e) {
      // só fica sem a notificação desta vez (o erro aparece no Diagnóstico)
      try {
        notificacoes.registrarErro(store, e, agora);
      } catch (e2) {
        // nada
      }
    }
    return;
  }

  // v6.2: aberto pelo toque na notificação -> começa na aba pedida; e o
  // Diagnóstico mostra o que o widget fez na última verificação.
  resultado.abaInicial = abaPedida();
  try {
    resultado.diag.notificacoes = notificacoes.ultimaVerificacao(store) +
      (resultado.abaInicial ? ' · aberto pela notificação (' + resultado.abaInicial + ')' : '');
  } catch (e) {
    resultado.diag.notificacoes = 'erro: ' + (e.message || String(e));
  }

  // Só o painel grava o retrato da "última consulta".
  hist.gravarSnapshot(store, atual);

  // v6.11: vendas/dia e Best Price na linha do item, do que ficou guardado no
  // iPhone (nada de rede aqui). A fila por trás atualiza depois que a tela abre.
  let guardados;
  try {
    guardados = cartao.lerGuardados(store);
  } catch (e) {
    guardados = { v: 1, itens: {} };
  }
  resultado.linhas = cartao.linhas(guardados, itens);

  // Avaliador de trade: catálogo enxuto + variação de 24h + miniaturas conhecidas.
  // Se algo falhar aqui, só a aba do avaliador mostra o erro; o inventário segue.
  let baseCatalogo = null;
  try {
    baseCatalogo = hist.baseCatalogo24h(ctx.dirDados, agora);
    const thumbs = Object.assign({}, api.miniaturasEmCache(store), miniaturas);
    const json = avaliador.serializar(avaliador.prepararDados(dados.rolimons, itens, baseCatalogo, thumbs));
    resultado.avaliador = { json, base: baseCatalogo ? baseCatalogo.data : null, erro: null };
  } catch (e) {
    resultado.avaliador = { json: null, base: null, erro: e.message || String(e) };
  }
  let retratos = null;
  try {
    retratos = hist.datasRetratosCatalogo(ctx.dirDados).length;
  } catch (e) {
    // só diagnóstico
  }
  resultado.diag.avaliador = {
    itensCatalogo: Object.keys(dados.rolimons).length,
    tamanhoDadosKB: resultado.avaliador.json ? Math.round(resultado.avaliador.json.length / 1024) : null,
    retratosCatalogo: retratos,
    retratoGravadoAgora: retratoCatalogo.gravou,
    erroRetrato: retratoCatalogo.erro,
    base24hCatalogo: baseCatalogo ? analise.fmtData(baseCatalogo.data) : null,
    erro: resultado.avaliador.erro,
  };

  // v6.1: perguntas e trades do diário, com o value de hoje e as miniaturas.
  try {
    const pag = diario.paraPagina(store, dados.rolimons, dados.usuario.id);
    const ids = diario.idsDaPagina(pag);
    const mini = ids.length ? await api.buscarMiniaturas(store, ids) : {};
    resultado.diario = { dados: pag, miniaturas: mini, erro: null };
  } catch (e) {
    resultado.diario = { dados: null, miniaturas: {}, erro: e.message || String(e) };
  }

  const wv = new WebView();

  // Ponte das miniaturas: a página carrega um iframe em avaliador.PONTE com os ids;
  // aqui a navegação é barrada, as miniaturas são buscadas e devolvidas à página.
  // Uma fila evita duas buscas gravando o cache ao mesmo tempo.
  let filaPonte = Promise.resolve();
  function atenderPonte(url) {
    const m = /[?&]ids=([\d,]+)/.exec(url);
    const ids = m ? m[1].split(',').filter(Boolean).slice(0, 100) : [];
    filaPonte = filaPonte.then(async () => {
      let mapa = {};
      let erro = null;
      try {
        if (ids.length) mapa = await api.buscarMiniaturas(store, ids);
      } catch (e) {
        erro = e.message || String(e);
      }
      try {
        await wv.evaluateJavaScript(
          'window.receberMiniaturas && window.receberMiniaturas(' + JSON.stringify(mapa) + ',' + JSON.stringify(erro) + ')',
          false
        );
      } catch (e) {
        // página fechada ou sem a função: ignora
      }
    });
  }

  // Aba Anúncios: a página pede pela ponte (em PONTE + 'anuncios'); aqui os
  // anúncios são buscados (com cache), juntados aos guardados e devolvidos.
  function atenderAnuncios() {
    filaPonte = filaPonte.then(async () => {
      let res;
      try {
        res = await anuncios.carregar(store, cfg);
      } catch (e) {
        res = { lista: [], origem: 'falhou', erro: e.message || String(e) };
      }
      try {
        await wv.evaluateJavaScript('window.receberAnuncios && window.receberAnuncios(' + avaliador.serializar(res) + ')', false);
      } catch (e) {
        // página fechada ou sem a função: ignora
      }
    });
  }

  // v6.11: itens da conta 2 (para a fila das linhas), depois de montados.
  let itensConta2 = null;

  // v5.2: itens da conta 2, montados aqui com o mesmo catálogo já baixado.
  // As setas e quedas de 24h usam o retrato do catálogo (analise.baseDoCatalogo).
  async function montarConta2() {
    const c2 = ajustes.conta2;
    if (await api.garantirId(c2)) store.gravar('ajustes', ajustes);
    const j = await api.carregarJogador(store, c2, cfg.CACHE_CONTA2_MIN);
    const montado = analise.montarItens({ jogador: j.jogador, roblox: null, rolimons: dados.rolimons });
    const itens2 = montado.itens;
    const totais2 = analise.calcularTotais(itens2);
    const agora2 = Date.now();
    const base2 = analise.baseDoCatalogo(itens2, baseCatalogo, montado.fonte);
    const dia2 = comparar(itens2, totais2, base2);
    const thumbs2 = await api.buscarMiniaturas(store, itens2.map((i) => String(i.assetId)));
    itensConta2 = itens2;
    const bloco = html.inventario({
      itens: itens2,
      totais: totais2,
      riscos: analise.encontrarRiscos(itens2, base2, cfg),
      comparacoes: { dia: dia2 },
      miniaturas: thumbs2,
      linhas: cartao.linhas(guardados, itens2),
      avisos: j.avisos,
      agora: agora2,
    }, cfg);
    return {
      id: j.usuario.id,
      nome: j.usuario.nome,
      html: bloco.html,
      menu: bloco.menu,
      titulo: bloco.titulo,
      inventario: avaliador.inventarioCompacto(itens2),
      miniaturas: thumbs2,
      diag: itens2.length + ' itens · origem ' + j.origem + ' · base 24h ' +
        (base2 ? analise.fmtData(base2.data) + " (retrato do catálogo)" : 'em formação') +
        ' · miniaturas ' + Object.keys(thumbs2).length + '/' + itens2.length +
        (j.avisos.length ? ' · avisos: ' + j.avisos.join(' | ') : ''),
    };
  }

  // Ponte da conta 2: PONTE + 'conta2/carregar', 'conta2/salvar?u=...' ou 'conta2/remover'.
  // O username vem num endereço falso que é barrado aqui: nada sai do iPhone.
  function atenderConta2(url) {
    const m = /conta2\/(carregar|salvar|remover)/.exec(url);
    const acao = m ? m[1] : 'carregar';
    const mu = /[?&]u=([^&]*)/.exec(url);
    let tentado = '';
    try {
      tentado = mu ? decodeURIComponent(mu[1]).trim() : '';
    } catch (e) {
      tentado = '';
    }
    filaPonte = filaPonte.then(async () => {
      let res;
      const nomeAtual = () => (ajustes.conta2 ? ajustes.conta2.nomeReal || ajustes.conta2.username : null);
      try {
        if (acao === 'remover') {
          delete ajustes.conta2;
          store.gravar('ajustes', ajustes);
          res = { removida: true };
        } else {
          if (acao === 'salvar') {
            if (!USERNAME_VALIDO.test(tentado)) throw new Error('O username do Roblox tem de 3 a 20 letras, números ou _.');
            if (mesmoNome(tentado, ajustes.username) || mesmoNome(tentado, ajustes.nomeReal)) {
              throw new Error('Esse é o seu username principal.');
            }
            // Confere no Roblox antes de salvar: se não existir, a conta 2 anterior continua.
            const nova = ajustes.conta2 && ajustes.conta2.username === tentado ? ajustes.conta2 : { username: tentado };
            await api.garantirId(nova);
            if (nova.userId === ajustes.userId) throw new Error('Esse é o seu username principal.');
            ajustes.conta2 = nova;
            store.gravar('ajustes', ajustes);
          }
          if (!ajustes.conta2) throw new Error('nenhuma conta 2 salva');
          res = await montarConta2();
        }
      } catch (e) {
        res = { erro: e.message || String(e), acao, nome: nomeAtual(), tentado };
      }
      try {
        await wv.evaluateJavaScript('window.receberConta2 && window.receberConta2(' + avaliador.serializar(res) + ')', false);
      } catch (e) {
        // página fechada ou sem a função: ignora
      }
    });
  }

  // v5.3.1: ponte do tema: PONTE + 'tema?t=<id>' grava o tema no arquivo de ajustes,
  // para ele continuar depois de fechar o app (o localStorage do WebView não guarda).
  function atenderTema(url) {
    const m = /[?&]t=([a-z0-9]+)/.exec(url);
    const id = m ? m[1] : '';
    if (!html.temaValido(id)) return;
    filaPonte = filaPonte.then(() => {
      try {
        ajustes.tema = id;
        store.gravar('ajustes', ajustes);
      } catch (e) {
        // sem gravar: o tema vale só até fechar o app
      }
    });
  }

  // v6.4: ponte dos sustos da Fita Perdida: PONTE + 'sustos?v=0|1' grava no arquivo de ajustes.
  function atenderSustos(url) {
    const m = /[?&]v=([01])/.exec(url);
    if (!m) return;
    filaPonte = filaPonte.then(() => {
      try {
        if (m[1] === '0') ajustes.sustos = false;
        else delete ajustes.sustos;
        store.gravar('ajustes', ajustes);
      } catch (e) {
        // sem gravar: a escolha vale só até fechar o app
      }
    });
  }

  // v6.1: ponte do diário: PONTE + 'diario?acao=sim|nao|apagar&id=<n>&r=<robux>'.
  // Grava no arquivo do diário e devolve o estado salvo para a página.
  function atenderDiario(url) {
    const ma = /[?&]acao=([a-z]+)/.exec(url);
    const mi = /[?&]id=(\d+)/.exec(url);
    const mr = /[?&]r=(-?\d+)/.exec(url);
    const acao = ma ? ma[1] : '';
    const id = mi ? Number(mi[1]) : 0;
    const robux = mr ? Number(mr[1]) : 0;
    filaPonte = filaPonte.then(async () => {
      let res;
      try {
        if (!id) throw new Error('pedido sem id');
        if (acao === 'sim' || acao === 'nao') diario.responder(store, id, acao === 'sim', robux);
        else if (acao === 'apagar') diario.apagar(store, id);
        else throw new Error('ação desconhecida: ' + acao);
        res = diario.paraPagina(store, dados.rolimons, dados.usuario.id);
      } catch (e) {
        res = { erro: e.message || String(e) };
      }
      try {
        await wv.evaluateJavaScript('window.receberDiario && window.receberDiario(' + avaliador.serializar(res) + ')', false);
      } catch (e) {
        // página fechada ou sem a função: ignora
      }
    });
  }

  // v6.11: o arquivo guardado (dados/cartoes.json) é gravado a cada mudança
  // (se o app fechar no meio da fila, nada do que já veio se perde).
  function gravarGuardados() {
    try {
      cartao.gravarGuardados(store, guardados);
    } catch (e) {
      // segue só na memória desta abertura
    }
  }

  // Página do item no Rolimon's, uma busca por item de cada vez (a tela do item
  // e a fila das linhas nunca buscam o mesmo item juntas). Guarda se respondeu.
  const paginasEmCurso = {};
  function buscarPagina(id) {
    if (!paginasEmCurso[id]) {
      paginasEmCurso[id] = cartao.lerPagina(id)
        .catch((e) => ({ id, em: Date.now(), paginaOk: false, status: e.status || 0, erroPagina: e.message || String(e), diag: [], faltou: [] }))
        .then((pag) => {
          delete paginasEmCurso[id];
          if (pag.paginaOk) {
            cartao.guardarPagina(guardados, pag);
            gravarGuardados();
          }
          return pag;
        });
    }
    return paginasEmCurso[id];
  }

  // Manda a linha nova de um item para a página (as duas contas; a página acha
  // as linhas pelo data-asset) e o resumo da fila para o Diagnóstico.
  async function enviarLinha(id) {
    const mapa = {};
    const l = cartao.linha(guardados, id);
    if (l) mapa[id] = l;
    try {
      await wv.evaluateJavaScript(
        'window.receberLinhas && window.receberLinhas(' + avaliador.serializar(mapa) + ',' + avaliador.serializar(resumoFila()) + ')',
        false
      );
    } catch (e) {
      // página fechada ou sem a função: ignora
    }
  }

  // v6.9: card do item. PONTE + 'cartao?id=<assetId>'. v6.11: usa a página que a
  // fila das linhas guardou há até CARTAO_CACHE_MIN; senão, busca agora. O que
  // vier atualiza também a linha do item. Fora da filaPonte: não segura as miniaturas.
  function atenderCartao(url) {
    const m = /[?&]id=(\d+)/.exec(url);
    if (!m) return;
    const id = m[1];
    (async () => {
      let res;
      try {
        let pag = cartao.paginaGuardada(guardados, id, cfg.CARTAO_CACHE_MIN);
        if (!pag) pag = await buscarPagina(id);
        res = await cartao.carregar(id, dados.rolimons, pag);
        if (res.best && res.bestFonte === 'Roblox') {
          cartao.guardarBest(guardados, id, res.best, 'Roblox');
          gravarGuardados();
        }
      } catch (e) {
        res = { id, em: Date.now(), erro: e.message || String(e) };
      }
      try {
        await wv.evaluateJavaScript('window.receberCartao && window.receberCartao(' + avaliador.serializar(res) + ')', false);
      } catch (e) {
        // página fechada ou sem a função: ignora
      }
      enviarLinha(id);
    })();
  }

  // ---------- v6.11: fila das linhas (vendas/dia e Best Price) ----------
  // A página pede PONTE + 'linhas?conta=1' uns segundos depois de abrir (e
  // 'conta=2' quando os itens da conta 2 chegam). Um item por vez, do maior value
  // para o menor: página do Rolimon's se as vendas guardadas tiverem mais de
  // CARTAO_LINHA_PAGINA_H; senão, só o Best do Roblox se tiver mais de
  // CARTAO_LINHA_BEST_MIN. Recusa (429/403) ou 3 falhas seguidas param aquela
  // fonte nesta abertura. Falha = fica o último guardado.
  const fila = {
    ids: [],
    vistos: {},
    rodando: false,
    pausaRol: null,
    pausaRbx: null,
    falhasRol: 0,
    falhasRbx: 0,
    n: { pagina: 0, best: 0, guardado: 0, semRbx: 0, falhas: 0 },
    ultimoErro: null,
  };

  function resumoFila() {
    const n = fila.n;
    const p = [];
    if (n.pagina) p.push(n.pagina + (n.pagina === 1 ? " página do Rolimon's" : " páginas do Rolimon's"));
    if (n.best) p.push(n.best + ' Best pelo Roblox');
    if (n.guardado) p.push(n.guardado + ' já guardados');
    if (n.semRbx) p.push(n.semRbx + " sem preço no Roblox (usam o Best do Rolimon's)");
    if (n.falhas) p.push(n.falhas + ' falharam (último: ' + fila.ultimoErro + ')');
    if (fila.pausaRol) p.push("Rolimon's pausado (" + fila.pausaRol + ')');
    if (fila.pausaRbx) p.push('Roblox pausado (' + fila.pausaRbx + ')');
    p.push(fila.rodando ? 'na fila: ' + (fila.ids.length + 1) : 'terminado');
    return 'Linhas: ' + p.join(' · ');
  }

  function falhou(fonte, e) {
    const st = (e && e.status) || 0;
    const msg = (e && (e.message || e.erroPagina)) || String(e);
    fila.n.falhas++;
    fila.ultimoErro = (fonte === 'rol' ? "Rolimon's " : 'Roblox ') + msg;
    const k = fonte === 'rol' ? 'falhasRol' : 'falhasRbx';
    fila[k]++;
    if (st === 429 || st === 403 || fila[k] >= 3) {
      fila[fonte === 'rol' ? 'pausaRol' : 'pausaRbx'] = st ? 'HTTP ' + st : fila[k] + ' falhas seguidas';
    }
  }

  function esperarMs(ms) {
    return new Promise((resolve) => Timer.schedule(ms, false, resolve));
  }

  async function atualizarLinha(id) {
    const agora = Date.now();
    const e0 = guardados.itens[id] || {};
    const paginaVelha = !e0.p || agora - e0.p.em > cfg.CARTAO_LINHA_PAGINA_H * 3600000;
    let mudou = false;
    if (paginaVelha && !fila.pausaRol) {
      const pag = await buscarPagina(id);
      if (pag.paginaOk) {
        fila.n.pagina++;
        fila.falhasRol = 0;
        mudou = true;
      } else {
        falhou('rol', { status: pag.status, message: pag.erroPagina });
      }
      await esperarMs(cfg.CARTAO_LINHA_PAUSA_MS);
    }
    const e = guardados.itens[id] || {};
    const bestVelho = !e.b || Date.now() - e.b.em > cfg.CARTAO_LINHA_BEST_MIN * 60000;
    // Roblox sem preço para este item (clássico ou ninguém vendendo): não pergunta
    // de novo por CARTAO_LINHA_PAGINA_H; o Best fica o do Rolimon's.
    const semRbx = e.semRbx && Date.now() - e.semRbx < cfg.CARTAO_LINHA_PAGINA_H * 3600000;
    if (bestVelho && semRbx) fila.n.semRbx++;
    if (bestVelho && !semRbx && !fila.pausaRbx) {
      try {
        const r = await api.buscarMenorPreco(id);
        cartao.guardarBest(guardados, id, r.preco, 'Roblox');
        delete cartao.entrada(guardados, id).semRbx;
        fila.n.best++;
        fila.falhasRbx = 0;
        mudou = true;
      } catch (err) {
        if (err && err.status === 200) {
          // respondeu, mas sem preço
          cartao.entrada(guardados, id).semRbx = Date.now();
          fila.n.semRbx++;
          mudou = true;
        } else {
          falhou('rbx', err);
        }
      }
    }
    if (!mudou && !paginaVelha && !bestVelho) fila.n.guardado++;
    if (mudou) {
      gravarGuardados();
      await enviarLinha(id);
    }
  }

  async function rodarFila() {
    if (fila.rodando) return;
    fila.rodando = true;
    while (fila.ids.length) {
      const id = fila.ids.shift();
      try {
        await atualizarLinha(id);
      } catch (e) {
        fila.n.falhas++;
        fila.ultimoErro = e.message || String(e);
      }
    }
    fila.rodando = false;
    await enviarLinha('0');
  }

  function atenderLinhas(url) {
    const lista = /conta=2/.test(url) ? itensConta2 : itens;
    if (!lista) return;
    // A lista já vem do maior value para o menor (analise.montarItens).
    for (const i of lista) {
      const id = String(i.assetId);
      if (fila.vistos[id]) continue;
      fila.vistos[id] = true;
      fila.ids.push(id);
    }
    rodarFila();
  }

  // Links do menu de toque abrem fora do painel (Safari ou app do Roblox).
  wv.shouldAllowRequest = (req) => {
    const url = (req && req.url) || '';
    if (url.indexOf(avaliador.PONTE + 'cartao') === 0) {
      atenderCartao(url);
      return false;
    }
    if (url.indexOf(avaliador.PONTE + 'linhas') === 0) {
      atenderLinhas(url);
      return false;
    }
    if (url.indexOf(avaliador.PONTE + 'diario') === 0) {
      atenderDiario(url);
      return false;
    }
    if (url.indexOf(avaliador.PONTE + 'tema') === 0) {
      atenderTema(url);
      return false;
    }
    if (url.indexOf(avaliador.PONTE + 'sustos') === 0) {
      atenderSustos(url);
      return false;
    }
    if (url.indexOf(avaliador.PONTE + 'anuncios') === 0) {
      atenderAnuncios();
      return false;
    }
    if (url.indexOf(avaliador.PONTE + 'conta2') === 0) {
      atenderConta2(url);
      return false;
    }
    if (url.indexOf(avaliador.PONTE) === 0) {
      atenderPonte(url);
      return false;
    }
    if (/^https:\/\/www\.(rolimons|roblox)\.com\//.test(url) && typeof Safari !== 'undefined') {
      Safari.open(url);
      return false;
    }
    return true;
  };
  await wv.loadHTML(html.gerar(resultado, cfg));
  await wv.present(true);
}

module.exports = { executar };
