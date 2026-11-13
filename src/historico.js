// Armazenamento local no iPhone (cache, ajustes e "retrato" do inventário).
// Tudo fica na pasta interna do Scriptable; nada sai do aparelho.

function criarArmazenamento(dir) {
  const fm = FileManager.local();
  if (!fm.fileExists(dir)) fm.createDirectory(dir, true);
  const caminho = (nome) => fm.joinPath(dir, nome + '.json');

  return {
    ler(nome) {
      const p = caminho(nome);
      if (!fm.fileExists(p)) return null;
      try {
        return JSON.parse(fm.readString(p));
      } catch (e) {
        return null;
      }
    },
    gravar(nome, obj) {
      fm.writeString(caminho(nome), JSON.stringify(obj));
    },
  };
}

// O snapshot é o retrato da última vez que o PAINEL foi aberto.
// O widget só lê (não grava), para não "consumir" as mudanças.
function lerSnapshot(store) {
  return store.ler('snapshot');
}

function gravarSnapshot(store, snapshot) {
  store.gravar('snapshot', snapshot);
}

// Histórico por hora (painel e widget gravam), usado na comparação de 24h.
function registrarHistorico(store, snapshot, cfg) {
  let h = store.ler('historico_horario') || [];
  const ultimo = h[h.length - 1];
  if (ultimo && snapshot.data - ultimo.data < cfg.HISTORICO_INTERVALO_MIN * 60000) return;
  h.push(snapshot);
  const limite = snapshot.data - cfg.HISTORICO_HORAS * 3600000;
  h = h.filter((s) => s.data >= limite);
  store.gravar('historico_horario', h);
}

// Retrato mais recente feito há pelo menos 24h. Se ainda não existir,
// usa o mais antigo disponível (desde que tenha ao menos 1h).
function base24h(store, agora, fonte) {
  const h = (store.ler('historico_horario') || []).filter((s) => s.fonte === fonte);
  if (!h.length) return null;
  const alvo = agora - 24 * 3600000;
  let escolhido = null;
  for (const s of h) if (s.data <= alvo) escolhido = s;
  if (!escolhido) escolhido = h[0];
  return agora - escolhido.data >= 3600000 ? escolhido : null;
}

function tamanhoHistorico(store) {
  return (store.ler('historico_horario') || []).length;
}

// ---------- Retrato do catálogo (avaliador de trade) ----------
// Um arquivo por retrato (pasta catalogo_24h/<data em ms>.json), com
// { assetId: [rap, value] } de todos os itens. Arquivos separados para
// só ler o que for preciso e não pesar no widget.
function pastaCatalogo(dirDados) {
  const fm = FileManager.local();
  const p = fm.joinPath(dirDados, 'catalogo_24h');
  if (!fm.fileExists(p)) fm.createDirectory(p, true);
  return p;
}

function datasRetratosCatalogo(dirDados) {
  const fm = FileManager.local();
  return fm
    .listContents(pastaCatalogo(dirDados))
    .filter((n) => /^\d+\.json$/.test(n))
    .map((n) => Number(n.slice(0, -5)))
    .sort((x, y) => x - y);
}

// Grava um retrato se o último tiver mais de X min e apaga os antigos.
// Retorna true se gravou.
function registrarRetratoCatalogo(dirDados, items, agora, cfg) {
  const fm = FileManager.local();
  const pasta = pastaCatalogo(dirDados);
  const datas = datasRetratosCatalogo(dirDados);
  const ultimo = datas[datas.length - 1];
  if (ultimo && agora - ultimo < cfg.RETRATO_CATALOGO_INTERVALO_MIN * 60000) return false;

  const compacto = {};
  for (const id of Object.keys(items)) {
    const r = items[id];
    if (Array.isArray(r)) compacto[id] = [r[2], r[3]];
  }
  fm.writeString(fm.joinPath(pasta, agora + '.json'), JSON.stringify(compacto));

  const limite = agora - cfg.RETRATO_CATALOGO_HORAS * 3600000;
  for (const d of datas) {
    if (d < limite) {
      try {
        fm.remove(fm.joinPath(pasta, d + '.json'));
      } catch (e) {
        // tenta de novo na próxima vez
      }
    }
  }
  return true;
}

// Mesmo critério do base24h: o mais recente com pelo menos 24h; se ainda não
// existir, o mais antigo disponível (desde que tenha ao menos 1h).
function baseCatalogo24h(dirDados, agora) {
  const datas = datasRetratosCatalogo(dirDados);
  if (!datas.length) return null;
  const alvo = agora - 24 * 3600000;
  let escolhida = null;
  for (const d of datas) if (d <= alvo) escolhida = d;
  if (escolhida == null) escolhida = datas[0];
  if (agora - escolhida < 3600000) return null;
  const fm = FileManager.local();
  try {
    const itens = JSON.parse(fm.readString(fm.joinPath(pastaCatalogo(dirDados), escolhida + '.json')));
    return { data: escolhida, itens };
  } catch (e) {
    return null;
  }
}

module.exports = {
  criarArmazenamento, lerSnapshot, gravarSnapshot,
  registrarHistorico, base24h, tamanhoHistorico,
  datasRetratosCatalogo, registrarRetratoCatalogo, baseCatalogo24h,
};
