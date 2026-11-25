// v6.2: notificação-resumo do widget (só a conta principal).
// Quando o widget atualiza, avisa numa notificação só:
//  - anúncio novo bom para você, com a mesma análise da aba Anúncios (criarAnalisador);
//  - item seu que virou projected ou ficou com demanda terrível.
// v6.21 (com a regra da v6.15 não chegava nada): as combinações sugeridas pelo app
// voltam a avisar, mas só as fortes: downgrade seu, abertura a partir de
// NOTIF_SUGESTAO_MIN_PCT e item principal que gira nos degraus. No máximo
// NOTIF_MAX_DIA notificações de anúncio por dia. Os itens desmarcados em "Meus
// itens" (dados/meusitens.json) não entram em aviso nenhum de anúncio.
// v6.15 (regra do Rafael, "chegavam demais"), para os PEDIDOS (anúncio que pede
// itens seus):
//  - seu upgrade (você dá mais itens): só no "Vale muito";
//  - seu downgrade (você recebe mais itens): a partir de NOTIF_DOWNGRADE_MIN_PCT;
//  - mesmo número de itens dos dois lados (1v1): não avisa;
//  - e só se o item principal que você recebe (o de maior value) GIRA: vendas/dia
//    guardadas (dados/cartoes.json) a partir de 1/dia; sem elas, demanda do
//    Rolimon's Normal ou melhor; sem nenhum dado, não avisa. O widget não busca
//    página nenhuma: só lê o que o painel já guardou.
// Nada se repete: o que já foi visto fica em dados/notificacoes.json.
// Silêncio (config.js): anúncios desse horário são descartados; os alertas de
// risco esperam o silêncio acabar.
// Tocar na notificação abre o Trade Helper (na aba Anúncios, se houver anúncio).
const anuncios = require('anuncios');
const avaliador = require('avaliador');
const analise = require('analise');
const hist = require('historico');
const cartao = require('cartao');

const ARQ = 'notificacoes';

function ler(store) {
  const d = store.ler(ARQ) || {};
  return {
    iniciado: d.iniciado || 0,
    // id do anúncio -> data (já analisado ou descartado: não volta mais)
    anuncios: d.anuncios && typeof d.anuncios === 'object' ? d.anuncios : {},
    // "assetId|motivo" -> data do aviso (some quando o risco some, para avisar de novo se voltar)
    riscos: d.riscos && typeof d.riscos === 'object' ? d.riscos : {},
    // v6.21: { d: dia local, n: notificações de anúncio já enviadas nele }
    dia: d.dia && typeof d.dia === 'object' ? d.dia : null,
    ultima: d.ultima || null,
  };
}

function diaLocal(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function emSilencio(ms, cfg) {
  const ini = cfg.SILENCIO_INICIO_H;
  const fim = cfg.SILENCIO_FIM_H;
  if (!(ms > 0) || ini === fim) return false;
  const h = new Date(ms).getHours();
  return ini < fim ? h >= ini && h < fim : h >= ini || h < fim;
}

// Riscos de agora, agrupando as cópias: { "assetId|motivo": { nome, motivo, n } }
function riscosAtuais(itens) {
  const r = {};
  function add(i, motivo) {
    const k = i.assetId + '|' + motivo;
    if (r[k]) r[k].n++;
    else r[k] = { nome: i.nome, motivo, n: 1 };
  }
  for (const i of itens) {
    if (i.projected) add(i, 'projected');
    if (i.demanda === 0) add(i, 'demanda');
  }
  return r;
}

// v6.15: o pedido passa na régua da notificação? (a análise já descartou o
// que fica abaixo de "Vale a pena" e o "Cuidado")
function passaNaRegua(r, cfg) {
  if (r.modo !== 'itens' || !r.v) return false;
  if (r.tipo === 'upgrade') return r.v.nivel === 4;
  if (r.tipo === 'downgrade') return r.v.nivel >= 3 && r.pct != null && r.pct >= cfg.NOTIF_DOWNGRADE_MIN_PCT;
  return false;
}

// v6.15: o item principal recebido gira? { gira, texto } ou null (sem dado).
// Mesma regra do selo "gira"/"parado" da aba Anúncios (a partir de Normal na
// escala das vendas/dia); sem vendas guardadas, a demanda do Rolimon's.
function giroDoPrincipal(rec, guardados) {
  let m = null;
  const valor = (i) => (i.value != null ? i.value : i.rap || 0);
  for (const i of rec || []) if (!m || valor(i) > valor(m)) m = i;
  if (!m) return null;
  const ln = guardados ? cartao.linha(guardados, m.id) : null;
  if (ln && ln.v != null) return { gira: cartao.demandaPorVendas(ln.v) >= 2, texto: ln.tv };
  if (typeof m.dem === 'number' && m.dem >= 0) return { gira: m.dem >= 2, texto: 'demanda ' + analise.demandaCurta(m.dem) };
  return null;
}

// Analisa os anúncios novos (os mais recentes primeiro) até o limite de tempo.
// Retorna os que passam na régua e giram, e quantos ficaram para a próxima atualização.
function analisarNovos(pendentes, o, limite) {
  const cfg = o.cfg;
  let guardados = null;
  try {
    guardados = cartao.lerGuardados(o.store);
  } catch (e) {
    // sem as vendas guardadas: fica só a demanda do Rolimon's
  }
  let base = null;
  try {
    base = hist.baseCatalogo24h(o.dirDados, o.agora);
  } catch (e) {
    // sem a variação de 24h do RAP (a regra do RAP subindo fica de fora)
  }
  const D = avaliador.prepararDados(o.dados.rolimons, o.itens, base, {});
  const A = anuncios.criarAnalisador(D, avaliador.parametros(cfg), anuncios.parametros(cfg, o.dados.usuario.id));
  let ocultos = {};
  try {
    ocultos = anuncios.ocultosDe(o.store, o.dados.usuario.id);
  } catch (e) {
    // sem o arquivo: todos os itens contam
  }
  A.montarMeus(D.inventario, ocultos);
  const bons = [];
  const vistos = [];
  // v6.21: quantos anúncios caíram em cada filtro (para o Diagnóstico).
  const corte = {};
  const cortar = (motivo) => { corte[motivo] = (corte[motivo] || 0) + 1; };
  let faltaram = 0;
  pendentes.sort((x, y) => y[1] - x[1]);
  for (const ad of pendentes) {
    if (Date.now() > limite) {
      faltaram++;
      continue;
    }
    // Anúncio que pede itens = pedido (regra da v6.15). Que pede só tags = sugestão:
    // v6.21, só a forma de downgrade seu (o anúncio pode aceitar as duas formas).
    const pedido = ad[6].length > 0;
    let r;
    try {
      r = pedido ? A.analisar(ad, '') : A.analisar(ad, '', 'downgrade');
    } catch (e) {
      r = { descarte: 'erro na análise' };
    }
    vistos.push(ad);
    if (r.descarte) {
      cortar(r.forma ? 'sugestão que não é downgrade seu' : r.descarte);
      continue;
    }
    if (pedido ? !passaNaRegua(r, cfg) : !sugestaoForte(r, cfg)) {
      cortar(pedido ? 'pedido fora da regra' : 'sugestão abaixo de +' + cfg.NOTIF_SUGESTAO_MIN_PCT + '% na abertura');
      continue;
    }
    // O item principal tem que girar (na sugestão, em todos os degraus).
    const giros = (pedido ? [r] : r.degraus).map((g) => giroDoPrincipal(g.rec, guardados));
    if (giros.some((g) => !g)) cortar('sem dado de giro');
    else if (giros.some((g) => !g.gira)) cortar('item principal parado');
    else {
      r.giro = giros[0];
      r.sugestao = !pedido;
      bons.push(r);
    }
  }
  return { bons, vistos, faltaram, corte };
}

// v6.21: a combinação sugerida passa? Downgrade seu (nunca 1v1), com a abertura (o
// 1º degrau, a oferta que você manda) a partir de NOTIF_SUGESTAO_MIN_PCT. O 2º
// degrau não entra na conta: ele mira o mínimo (perto de +7%) de propósito.
function sugestaoForte(r, cfg) {
  if (r.modo !== 'tag' || r.tipo !== 'downgrade' || !r.degraus || !r.degraus.length) return false;
  const a = r.degraus[0];
  return a.pct != null && a.pct >= cfg.NOTIF_SUGESTAO_MIN_PCT;
}

// Textos da notificação (formato aprovado: título com a contagem, o melhor
// anúncio em destaque, "+N outros", e os alertas de risco).
// v6.15 ("item primeiro"): "🟢 Seu Shaggy → Bighead" e embaixo "+13% · gira (4,5/dia)".
function nomesLado(itens) {
  const nomes = [];
  itens.forEach((i) => { if (nomes.indexOf(i.nome) < 0) nomes.push(i.nome); });
  if (itens.length === 1) return nomes[0];
  if (nomes.length === 1) return itens.length + '× ' + nomes[0];
  if (itens.length === 2) return nomes.join(' + ');
  return itens.length + ' itens';
}

// v6.21: "💡 Seu Atomic → A + B" e embaixo "peça +14% · mínimo +8% · gira (4,5/dia)".
// Com uma combinação só, não há mínimo separado.
function linhaSugestao(r) {
  const ab = r.degraus[0];
  const min = r.degraus.length > 1 ? r.degraus[r.degraus.length - 1] : null;
  return '💡 ' + (ab.dou.length === 1 ? 'Seu ' : 'Seus ') + nomesLado(ab.dou) + ' → ' + nomesLado(ab.rec) +
    '\npeça ' + analise.fmtPctSinal(ab.pct) +
    (min && min.pct != null ? ' · mínimo ' + analise.fmtPctSinal(min.pct) : '') +
    ' · gira (' + r.giro.texto + ')';
}

// Ganho que ordena os avisos (na sugestão, o da abertura).
function ganhoDoAviso(r) {
  const p = r.sugestao ? r.degraus[0].pct : r.pct;
  return p == null ? -1e9 : p;
}

function linhaAnuncio(r) {
  if (r.sugestao) return linhaSugestao(r);
  const dou = (r.dou.length === 1 ? 'Seu ' : 'Seus ') + nomesLado(r.dou);
  let rec = r.rec.length ? nomesLado(r.rec) : '';
  if (r.robux > 0) rec += (rec ? ' + ' : '') + analise.fmtNum(r.robux) + ' Robux';
  const pct = r.pct != null ? analise.fmtPctSinal(r.pct) + ' · ' : '';
  return '🟢 ' + dou + ' → ' + rec + '\n' + pct + 'gira (' + r.giro.texto + ')';
}

function linhaRisco(x) {
  return '⚠️ ' + x.nome + (x.n > 1 ? ' (' + x.n + ' cópias)' : '') +
    (x.motivo === 'projected' ? ' virou projected' : ' está com demanda terrível');
}

function montarTexto(bons, riscos) {
  const linhas = [];
  if (bons.length) {
    // Pedidos primeiro (o dono já quer os seus itens); depois, o maior ganho.
    bons.sort((x, y) => (x.sugestao ? 1 : 0) - (y.sugestao ? 1 : 0) || ganhoDoAviso(y) - ganhoDoAviso(x));
    linhas.push(linhaAnuncio(bons[0]));
    const resto = bons.length - 1;
    if (resto) linhas.push('+' + resto + (resto === 1 ? ' outro anúncio bom' : ' outros anúncios bons'));
  }
  riscos.slice(0, 2).forEach((x) => linhas.push(linhaRisco(x)));
  if (riscos.length > 2) {
    const n = riscos.length - 2;
    linhas.push('+' + n + (n === 1 ? ' outro alerta de risco' : ' outros alertas de risco'));
  }
  const total = bons.length + riscos.length;
  return { titulo: 'Trade Helper · ' + total + (total === 1 ? ' aviso' : ' avisos'), corpo: linhas.join('\n') };
}

async function enviar(texto, aba) {
  const n = new Notification();
  n.title = texto.titulo;
  n.body = texto.corpo;
  n.threadIdentifier = 'trade-helper';
  n.userInfo = { aba: aba || 'inv' };
  // O toque abre o próprio script; o painel lê ?aba= (args.queryParameters).
  try {
    n.openURL = 'scriptable:///run/' + encodeURIComponent(Script.name()) + (aba ? '?aba=' + aba : '');
  } catch (e) {
    // sem openURL: o toque segue o padrão do Scriptable
  }
  await n.schedule();
}

// o = { store, cfg, dados, itens, dirDados, agora }. Retorna um resumo para o Diagnóstico.
async function verificar(o) {
  const cfg = o.cfg;
  const store = o.store;
  const t0 = Date.now();
  if (!cfg.NOTIFICACOES_LIGADAS) return 'desligadas no config.js';
  if (typeof Notification === 'undefined') return 'Notification indisponível neste contexto';
  // Com os values de um cache antigo, a análise poderia avisar coisa errada.
  if (o.dados.origem && o.dados.origem.values === 'cache-antigo') return "pulou: values do Rolimon's de um cache antigo";

  const est = ler(store);
  const primeira = !est.iniciado;
  const silencio = emSilencio(o.agora, cfg);
  const L = [];

  // 1. Riscos dos seus itens. Na primeira vez só registra o que já existe
  // (você já conhece esses itens); depois, avisa só o que aparecer de novo.
  const atuais = riscosAtuais(o.itens);
  for (const k of Object.keys(est.riscos)) if (!atuais[k]) delete est.riscos[k];
  const riscos = [];
  for (const k of Object.keys(atuais)) {
    if (est.riscos[k]) continue;
    if (primeira) est.riscos[k] = o.agora;
    else if (!silencio) {
      est.riscos[k] = o.agora;
      riscos.push(atuais[k]);
    }
  }

  // 2. Anúncios novos (mesmo arquivo e cache da aba Anúncios).
  let bons = [];
  const res = await anuncios.carregar(store, cfg);
  const idadeMax = cfg.NOTIF_ANUNCIO_IDADE_MAX_MIN * 60000;
  const pendentes = [];
  let descartados = 0;
  for (const ad of res.lista) {
    if (est.anuncios[ad[0]]) continue;
    if (silencio || emSilencio(ad[1], cfg) || o.agora - ad[1] > idadeMax) {
      est.anuncios[ad[0]] = ad[1];
      descartados++;
    } else {
      pendentes.push(ad);
    }
  }
  let faltaram = 0;
  let corte = {};
  if (pendentes.length) {
    const r = analisarNovos(pendentes, o, t0 + cfg.NOTIF_TEMPO_MAX_S * 1000);
    r.vistos.forEach((ad) => { est.anuncios[ad[0]] = ad[1]; });
    bons = r.bons;
    faltaram = r.faltaram;
    corte = r.corte;
  }
  const limite = o.agora - (cfg.ANUNCIOS_GUARDAR_HORAS + 1) * 3600000;
  for (const id of Object.keys(est.anuncios)) if (!(est.anuncios[id] >= limite)) delete est.anuncios[id];

  L.push('anúncios: ' + res.lista.length + ' guardados (' + res.origem + (res.erro ? ', erro: ' + res.erro : '') + '), ' +
    (pendentes.length - faltaram) + ' analisados agora, ' + bons.length + ' bons que giram' +
    (faltaram ? ', ' + faltaram + ' ficaram para a próxima' : '') + ', ' + descartados + ' descartados (velhos/silêncio)');
  L.push('riscos: ' + Object.keys(atuais).length + ' agora, ' + riscos.length + ' novos' + (primeira ? ' (primeira vez: só registrou)' : ''));
  if (silencio) L.push('em silêncio');

  // v6.21: limite de notificações de anúncio por dia (zera à meia-noite). O que
  // passar do limite já foi marcado como visto e fica só na aba.
  const hoje = diaLocal(o.agora);
  if (!est.dia || est.dia.d !== hoje) est.dia = { d: hoje, n: 0 };
  if (bons.length && est.dia.n >= cfg.NOTIF_MAX_DIA) {
    L.push('limite do dia: ' + bons.length + ' ficaram só na aba');
    bons = [];
  }
  if (bons.length) est.dia.n++;
  L.push('notificações de anúncio hoje: ' + est.dia.n + '/' + cfg.NOTIF_MAX_DIA);
  const cortes = Object.keys(corte).sort((x, y) => corte[y] - corte[x]);
  if (cortes.length) L.push('cortados: ' + cortes.map((m) => corte[m] + ' ' + m).join(', '));

  // Grava ANTES de enviar: se o widget for interrompido, nada é avisado duas vezes.
  est.iniciado = est.iniciado || o.agora;
  let enviada = null;
  let erroEnvio = null;
  const tem = bons.length || riscos.length;
  est.ultima = { em: o.agora, ms: Date.now() - t0, resumo: L.join(' · '), enviada: tem ? 'enviando' : 'nada novo' };
  store.gravar(ARQ, est);

  if (tem) {
    const texto = montarTexto(bons, riscos);
    try {
      await enviar(texto, bons.length ? 'anuncios' : null);
      enviada = texto.titulo;
    } catch (e) {
      erroEnvio = e.message || String(e);
      // não saiu: não conta no limite do dia
      if (bons.length) est.dia.n--;
    }
    est.ultima.enviada = enviada || 'falhou: ' + erroEnvio;
    est.ultima.ms = Date.now() - t0;
    try {
      store.gravar(ARQ, est);
    } catch (e) {
      // só o resumo do Diagnóstico
    }
  }
  return est.ultima.resumo + ' · ' + est.ultima.enviada + ' · ' + est.ultima.ms + ' ms';
}

// Para o Diagnóstico do painel: o que aconteceu na última atualização do widget.
function ultimaVerificacao(store) {
  const u = ler(store).ultima;
  if (!u) return 'o widget ainda não verificou';
  return analise.fmtData(u.em) + ' · ' + u.resumo + ' · ' + u.enviada + ' · ' + u.ms + ' ms';
}

// Erro inesperado no widget: guarda só a mensagem para o Diagnóstico.
function registrarErro(store, e, agora) {
  const est = ler(store);
  est.ultima = { em: agora, ms: 0, resumo: 'erro: ' + ((e && e.message) || String(e)), enviada: 'nada enviado' };
  store.gravar(ARQ, est);
}

module.exports = { verificar, ultimaVerificacao, registrarErro, emSilencio };
