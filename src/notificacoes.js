// v6.2: notificação-resumo do widget (só a conta principal).
// Quando o widget atualiza, avisa numa notificação só:
//  - anúncio novo "Vale muito a pena" para você (pede seus itens ou tem uma
//    combinação sua), com a mesma análise da aba Anúncios (criarAnalisador);
//  - item seu que virou projected ou ficou com demanda terrível.
// Nada se repete: o que já foi visto fica em dados/notificacoes.json.
// Silêncio (config.js): anúncios desse horário são descartados; os alertas de
// risco esperam o silêncio acabar.
// Tocar na notificação abre o Trade Helper (na aba Anúncios, se houver anúncio).
const anuncios = require('anuncios');
const avaliador = require('avaliador');
const analise = require('analise');
const hist = require('historico');

const ARQ = 'notificacoes';

function ler(store) {
  const d = store.ler(ARQ) || {};
  return {
    iniciado: d.iniciado || 0,
    // id do anúncio -> data (já analisado ou descartado: não volta mais)
    anuncios: d.anuncios && typeof d.anuncios === 'object' ? d.anuncios : {},
    // "assetId|motivo" -> data do aviso (some quando o risco some, para avisar de novo se voltar)
    riscos: d.riscos && typeof d.riscos === 'object' ? d.riscos : {},
    ultima: d.ultima || null,
  };
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

// Analisa os anúncios novos (os mais recentes primeiro) até o limite de tempo.
// Retorna os "Vale muito a pena" e quantos ficaram para a próxima atualização.
function analisarNovos(pendentes, o, limite) {
  const cfg = o.cfg;
  let base = null;
  try {
    base = hist.baseCatalogo24h(o.dirDados, o.agora);
  } catch (e) {
    // sem a variação de 24h do RAP (a regra do RAP subindo fica de fora)
  }
  const D = avaliador.prepararDados(o.dados.rolimons, o.itens, base, {});
  const A = anuncios.criarAnalisador(D, avaliador.parametros(cfg), anuncios.parametros(cfg, o.dados.usuario.id));
  A.montarMeus(D.inventario);
  // v6.7: vendas por dia já guardadas pela aba Anúncios (o widget não busca).
  try {
    A.definirVendas(anuncios.vendasGuardadas(o.store, cfg));
  } catch (e) {
    // sem a regra de vendas
  }
  const bons = [];
  const vistos = [];
  let faltaram = 0;
  pendentes.sort((x, y) => y[1] - x[1]);
  for (const ad of pendentes) {
    if (Date.now() > limite) {
      faltaram++;
      continue;
    }
    let r;
    try {
      r = A.analisar(ad, '');
    } catch (e) {
      r = { descarte: 'erro' };
    }
    vistos.push(ad);
    if (!r.descarte && r.v && r.v.nivel === 4) bons.push(r);
  }
  return { bons, vistos, faltaram };
}

// Textos da notificação (formato aprovado: título com a contagem, o melhor
// anúncio em destaque, "+N outros", e os alertas de risco).
function linhaAnuncio(r) {
  const quem = r.ad[3] || 'Jogador ' + r.ad[2];
  let oque;
  if (r.modo === 'itens') {
    const nomes = [];
    r.dou.forEach((i) => { if (nomes.indexOf(i.nome) < 0) nomes.push(i.nome); });
    if (r.dou.length === 1) oque = ' pede seu ' + nomes[0];
    else if (nomes.length <= 2) oque = ' pede seus ' + nomes.join(' + ');
    else oque = ' pede ' + r.dou.length + ' itens seus';
  } else {
    oque = ': combinação sua';
  }
  const pct = r.pct != null ? analise.fmtPctSinal(r.pct) : '';
  return '🟢 ' + quem + oque + (pct ? ': ' + pct : '') + ' (' + r.v.titulo + ')';
}

function linhaRisco(x) {
  return '⚠️ ' + x.nome + (x.n > 1 ? ' (' + x.n + ' cópias)' : '') +
    (x.motivo === 'projected' ? ' virou projected' : ' está com demanda terrível');
}

function montarTexto(bons, riscos) {
  const linhas = [];
  if (bons.length) {
    bons.sort((x, y) => (y.pct == null ? -1e9 : y.pct) - (x.pct == null ? -1e9 : x.pct));
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
  if (pendentes.length) {
    const r = analisarNovos(pendentes, o, t0 + cfg.NOTIF_TEMPO_MAX_S * 1000);
    r.vistos.forEach((ad) => { est.anuncios[ad[0]] = ad[1]; });
    bons = r.bons;
    faltaram = r.faltaram;
  }
  const limite = o.agora - (cfg.ANUNCIOS_GUARDAR_HORAS + 1) * 3600000;
  for (const id of Object.keys(est.anuncios)) if (!(est.anuncios[id] >= limite)) delete est.anuncios[id];

  L.push('anúncios: ' + res.lista.length + ' guardados (' + res.origem + (res.erro ? ', erro: ' + res.erro : '') + '), ' +
    (pendentes.length - faltaram) + ' analisados agora, ' + bons.length + ' "Vale muito"' +
    (faltaram ? ', ' + faltaram + ' ficaram para a próxima' : '') + ', ' + descartados + ' descartados (velhos/silêncio)');
  L.push('riscos: ' + Object.keys(atuais).length + ' agora, ' + riscos.length + ' novos' + (primeira ? ' (primeira vez: só registrou)' : ''));
  if (silencio) L.push('em silêncio');

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
