// Ponto de entrada: decide entre painel completo (no app) e widget (tela inicial).
const cfg = require('config');
const hist = require('historico');
const api = require('api');
const analise = require('analise');
const html = require('html');
const widget = require('widget');

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

  const wv = new WebView();
  // Links do menu de toque abrem fora do painel (Safari ou app do Roblox).
  wv.shouldAllowRequest = (req) => {
    const url = (req && req.url) || '';
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
