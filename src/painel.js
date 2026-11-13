// Ponto de entrada: decide entre painel completo (no app) e widget (tela inicial).
const cfg = require('config');
const hist = require('historico');
const api = require('api');
const analise = require('analise');
const html = require('html');
const widget = require('widget');
const avaliador = require('avaliador');
const anuncios = require('anuncios');

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

  if (!ajustes.username || (ctx.trocarUsername && !noWidget)) {
    if (noWidget) throw new Error('Abra o Trade Helper no app do Scriptable uma vez para informar o username.');
    ajustes = { username: await pedirUsername(ajustes.username) };
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
  const avisos = (ctx.avisos || []).concat(dados.avisos);
  const robloxItens = dados.roblox ? dados.roblox.itens : [];

  const resultado = {
    usuario: dados.usuario,
    itens,
    fonte,
    totais,
    riscos: analise.encontrarRiscos(itens, ultima.base, cfg),
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

  // Links do menu de toque abrem fora do painel (Safari ou app do Roblox).
  wv.shouldAllowRequest = (req) => {
    const url = (req && req.url) || '';
    if (url.indexOf(avaliador.PONTE + 'anuncios') === 0) {
      atenderAnuncios();
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
