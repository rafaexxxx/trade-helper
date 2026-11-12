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

module.exports = { criarArmazenamento, lerSnapshot, gravarSnapshot };
