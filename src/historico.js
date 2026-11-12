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

module.exports = {
  criarArmazenamento, lerSnapshot, gravarSnapshot,
  registrarHistorico, base24h, tamanhoHistorico,
};
