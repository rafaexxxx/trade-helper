// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: chart-line;

/*
 * Trade Helper — LOADER
 * ---------------------------------------------------------------
 * Cole este arquivo UMA vez no Scriptable (nome sugerido: "Trade Helper").
 * A cada execução ele confere se há versão nova no GitHub, baixa se
 * precisar e executa o painel (ou o widget, se estiver na tela inicial).
 *
 * Repositório: https://github.com/rafaexxxx/trade-helper
 * Somente leitura: não usa login, cookie nem envia trades.
 */

// ===== Ajustes do loader =====
// true = pergunta o username de novo (rode uma vez e volte para false)
const TROCAR_USERNAME = false;
// =============================

const REPO = 'rafaexxxx/trade-helper';
const BRANCH = 'main';
const LOADER_VERSAO = 1;

const fm = FileManager.local();
const DIR_BASE = fm.joinPath(fm.libraryDirectory(), 'trade-helper');
const DIR_CODIGO = fm.joinPath(DIR_BASE, 'codigo');
const DIR_DADOS = fm.joinPath(DIR_BASE, 'dados');
const ARQ_META = fm.joinPath(DIR_BASE, 'codigo.json');

function garantirPasta(p) {
  if (!fm.fileExists(p)) fm.createDirectory(p, true);
}

async function baixar(url, comoJSON) {
  const r = new Request(url);
  r.timeoutInterval = 20;
  r.headers = { Accept: comoJSON ? 'application/json' : 'text/plain' };
  const texto = await r.loadString();
  const status = r.response ? r.response.statusCode : 0;
  if (status !== 200) throw new Error('HTTP ' + status + ' em ' + url);
  return comoJSON ? JSON.parse(texto) : texto;
}

function lerMeta() {
  try {
    return fm.fileExists(ARQ_META) ? JSON.parse(fm.readString(ARQ_META)) : null;
  } catch (e) {
    return null;
  }
}

function caminhoLocal(arq) {
  return fm.joinPath(DIR_CODIGO, arq.replace(/\//g, '__'));
}

// Descobre o commit mais recente (URL fixa por commit = sem cache velho do GitHub)
async function ultimoCommit() {
  const c = await baixar('https://api.github.com/repos/' + REPO + '/commits/' + BRANCH, true);
  if (!c || !c.sha) throw new Error('Resposta do GitHub sem sha');
  return c.sha;
}

async function atualizarCodigo() {
  const local = lerMeta();
  const avisos = [];
  let ref;
  try {
    ref = await ultimoCommit();
  } catch (e) {
    if (local) {
      avisos.push('Não consegui consultar o GitHub (' + e.message + '). Usando a cópia salva (v' + local.versao + ').');
      return { meta: local, avisos };
    }
    ref = BRANCH; // primeira execução sem API: tenta direto pelo branch
  }
  if (local && local.sha === ref) return { meta: local, avisos };

  try {
    const base = 'https://raw.githubusercontent.com/' + REPO + '/' + ref + '/';
    const manifesto = await baixar(base + 'versao.json', true);
    const arquivos = {};
    for (const arq of manifesto.arquivos) arquivos[arq] = await baixar(base + arq, false);
    // Só grava depois de baixar tudo, para nunca ficar com uma cópia pela metade
    garantirPasta(DIR_CODIGO);
    for (const arq of Object.keys(arquivos)) fm.writeString(caminhoLocal(arq), arquivos[arq]);
    const meta = { sha: ref, versao: manifesto.versao, arquivos: manifesto.arquivos, atualizadoEm: Date.now() };
    fm.writeString(ARQ_META, JSON.stringify(meta));
    return { meta, avisos };
  } catch (e) {
    if (local) {
      avisos.push('Falha ao baixar a versão nova (' + e.message + '). Usando a cópia salva (v' + local.versao + ').');
      return { meta: local, avisos };
    }
    throw new Error('Não consegui baixar o código do GitHub e ainda não há cópia salva.\n' + e.message);
  }
}

// Objetos do Scriptable repassados explicitamente para cada módulo
// (garante que existam dentro do código carregado, seja qual for o escopo).
const GLOBAIS = {
  config, Request, FileManager, Timer, WebView, ListWidget,
  Color, Font, Alert, Script, Pasteboard,
};

// Mini "require": carrega os módulos de src/ salvos no iPhone
function criarRequire() {
  const cache = {};
  function exigir(nome) {
    const arq = 'src/' + nome + '.js';
    if (cache[arq]) return cache[arq].exports;
    const p = caminhoLocal(arq);
    if (!fm.fileExists(p)) throw new Error('Módulo não encontrado: ' + arq);
    const mod = { exports: {} };
    cache[arq] = mod;
    try {
      const nomes = Object.keys(GLOBAIS);
      const valores = nomes.map((n) => GLOBAIS[n]);
      const fn = new Function('module', 'exports', 'require', ...nomes, fm.readString(p) + '\n//# sourceURL=' + arq);
      fn(mod, mod.exports, exigir, ...valores);
    } catch (e) {
      if (e && e.message && e.message.indexOf('[src/') !== 0) e.message = '[' + arq + '] ' + e.message;
      throw e;
    }
    return mod.exports;
  }
  return exigir;
}

async function mostrarErro(e) {
  if (e && e.cancelado) return;
  const msg = e && e.message ? e.message : String(e);
  const detalhes = [
    'Trade Helper — erro',
    'Loader v' + LOADER_VERSAO,
    'Mensagem: ' + msg,
    e && e.url ? 'URL: ' + e.url : '',
    e && e.status ? 'HTTP: ' + e.status : '',
    e && e.trecho ? 'Resposta: ' + e.trecho : '',
    e && e.stack ? 'Stack:\n' + e.stack : '',
  ].filter(Boolean).join('\n');

  if (config.runsInWidget) {
    const w = new ListWidget();
    const t = w.addText('⚠️ Trade Helper');
    t.font = Font.boldSystemFont(12);
    w.addSpacer(4);
    const m = w.addText(msg);
    m.font = Font.systemFont(10);
    m.minimumScaleFactor = 0.6;
    Script.setWidget(w);
    return;
  }
  Pasteboard.copy(detalhes);
  const a = new Alert();
  a.title = '⚠️ Trade Helper: erro';
  a.message = msg + '\n\nOs detalhes foram copiados. Cole na conversa com o Claude.';
  a.addAction('OK');
  await a.presentAlert();
}

async function principal() {
  garantirPasta(DIR_DADOS);
  const { meta, avisos } = await atualizarCodigo();
  const exigir = criarRequire();
  const painel = exigir('painel');
  await painel.executar({
    dirDados: DIR_DADOS,
    versao: meta.versao,
    sha: meta.sha,
    avisos,
    trocarUsername: TROCAR_USERNAME,
    loaderVersao: LOADER_VERSAO,
  });
}

try {
  await principal();
} catch (e) {
  await mostrarErro(e);
}
Script.complete();
