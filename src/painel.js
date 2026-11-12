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
  // Só compara com retratos feitos a partir da mesma fonte de itens.
  const salvo = hist.lerSnapshot(store);
  const anterior = salvo && salvo.fonte === fonte ? salvo : null;
  const totais = analise.calcularTotais(itens);
  const avisos = (ctx.avisos || []).concat(dados.avisos);

  const robloxItens = dados.roblox ? dados.roblox.itens : [];
  const resultado = {
    usuario: dados.usuario,
    itens,
    fonte,
    divergencia,
    totais,
    riscos: analise.encontrarRiscos(itens, anterior, cfg),
    mudancas: analise.encontrarMudancas(itens, anterior, cfg),
    varTotais: analise.compararTotais(totais, anterior),
    anterior,
    avisos,
    agora: Date.now(),
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
      paginasRoblox: dados.roblox ? dados.roblox.paginas : null,
      catalogo: dados.catalogo,
      itensCatalogoRolimons: dados.rolimonsQtd,
      linhasDoCatalogo: itens.slice(0, 10).map((i) => ({
        assetId: i.assetId,
        linha: dados.rolimons[String(i.assetId)] || null,
      })),
      foraDoCatalogoRolimons: itens.filter((i) => i.semRolimons).length,
      divergencia,
      jogadorRolimons: dados.jogador
        ? { assets: dados.jogador.assets, holds: dados.jogador.holds, resto: dados.jogador.amostra }
        : null,
      robloxUaids: robloxItens.map((x) => x.userAssetId + ':' + x.assetId),
      exemploRobloxBruto: robloxItens[0] || null,
      avisos,
    },
  };

  if (noWidget) {
    Script.setWidget(widget.montar(resultado, cfg));
    return;
  }

  // Só o painel grava o retrato usado na comparação da próxima consulta.
  hist.gravarSnapshot(store, analise.criarSnapshot(itens, totais, fonte));

  const wv = new WebView();
  await wv.loadHTML(html.gerar(resultado, cfg));
  await wv.present(true);
}

module.exports = { executar };
