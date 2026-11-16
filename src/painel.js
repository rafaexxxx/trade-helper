// Ponto de entrada: decide entre painel completo (no app) e widget (tela inicial).
const cfg = require('config');
const hist = require('historico');
const api = require('api');
const analise = require('analise');
const html = require('html');
const widget = require('widget');
const avaliador = require('avaliador');
const anuncios = require('anuncios');
const desejos = require('desejos');

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
    const desejosAntes = ajustes.desejos || null;
    ajustes = { username: await pedirUsername(ajustes.username) };
    if (temaAntes) ajustes.tema = temaAntes;
    if (desejosAntes) ajustes.desejos = desejosAntes;
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
    // v6.0: Lista de desejos (assetIds), gravada no arquivo de ajustes pela ponte.
    desejos: desejos.limpar(ajustes.desejos, cfg.LISTA_DESEJOS_MAX),
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
      tema: ajustes.tema || 'segue o iPhone',
      listaDesejos: desejos.limpar(ajustes.desejos, cfg.LISTA_DESEJOS_MAX).length + ' itens',
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
    return;
  }

  // Só o painel grava o retrato da "última consulta".
  hist.gravarSnapshot(store, atual);

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
    const bloco = html.inventario({
      itens: itens2,
      totais: totais2,
      riscos: analise.encontrarRiscos(itens2, base2, cfg),
      comparacoes: { dia: dia2 },
      miniaturas: thumbs2,
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

  // v6.0: ponte da Lista de desejos: PONTE + 'desejos?ids=1,2,3' grava a lista
  // inteira no arquivo de ajustes (lista vazia = 'desejos?ids='). Só ids numéricos.
  function atenderDesejos(url) {
    const m = /[?&]ids=([\d,]*)/.exec(url);
    if (!m) return;
    const ids = desejos.limpar(m[1].split(','), cfg.LISTA_DESEJOS_MAX);
    filaPonte = filaPonte.then(() => {
      try {
        ajustes.desejos = ids;
        store.gravar('ajustes', ajustes);
      } catch (e) {
        // sem gravar: a lista vale só até fechar o app
      }
    });
  }

  // Links do menu de toque abrem fora do painel (Safari ou app do Roblox).
  wv.shouldAllowRequest = (req) => {
    const url = (req && req.url) || '';
    if (url.indexOf(avaliador.PONTE + 'tema') === 0) {
      atenderTema(url);
      return false;
    }
    if (url.indexOf(avaliador.PONTE + 'desejos') === 0) {
      atenderDesejos(url);
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
