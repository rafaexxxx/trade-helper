# 📦 Trade Helper

Painel do inventário de Limiteds para iPhone, feito para rodar no app **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** (gratuito).

- 💰 Value total e RAP total do inventário
- 🚨 Alertas de risco: projected, demanda baixa/terrível, tendência de queda, RAP muito diferente do value
- 🔄 Mudanças relevantes desde a última consulta (limite configurável, padrão 5%)
- 📋 Lista completa com busca e ordenação
- 🧩 Widget para a tela inicial
- 🔒 **Somente leitura**: não usa login, cookie nem envia trades. Usa só APIs públicas.

---

## 📲 Instalação (uma vez só)

1. Instale o **Scriptable** pela App Store.
2. No Safari do iPhone, abra:
   `https://raw.githubusercontent.com/rafaexxxx/trade-helper/main/loader.js`
3. Toque e segure no texto → **Selecionar tudo** → **Copiar**.
4. Abra o Scriptable → toque em **＋** → cole o código.
5. Toque no título no topo e renomeie para **Trade Helper**.
6. Toque em **▶︎** para rodar. Na primeira vez ele pergunta o seu username do Roblox (fica salvo só no iPhone).

Pronto! Das próximas vezes é só abrir o script. Ele confere sozinho se há versão nova aqui no GitHub e se atualiza.

### 🧩 Widget

1. Na tela inicial, toque e segure num espaço vazio → **Editar** → **＋ / Adicionar widget**.
2. Procure **Scriptable** → escolha o tamanho **pequeno** ou **médio** → **Adicionar widget**.
3. Toque no widget (ainda no modo edição) → em **Script**, escolha **Trade Helper**.

> ℹ️ Quem decide quando o widget atualiza é o iOS (normalmente a cada 15–60 min). Ele não é tempo real.
> Abra o painel no app pelo menos uma vez antes, para o username ficar salvo.

---

## ⚙️ Configurações

Ficam em [`src/config.js`](src/config.js):

| Configuração | Padrão | O que faz |
|---|---|---|
| `LIMITE_MUDANCA_PCT` | 5 | Variação mínima (%) para aparecer em "Mudanças" e para queda virar alerta |
| `LIMITE_RAP_VALUE_PCT` | 5 | Diferença mínima (%) entre RAP e value para virar alerta |
| `CACHE_ROLIMONS_MIN` | 5 | Minutos reaproveitando os values baixados |
| `CACHE_INVENTARIO_MIN` | 1 | Minutos reaproveitando o inventário baixado |
| `WIDGET_ATUALIZAR_MIN` | 30 | Intervalo pedido ao iOS para atualizar o widget |

**Trocar o username:** no script do Scriptable, mude `TROCAR_USERNAME` para `true`, rode uma vez e volte para `false`.

---

## 🛠️ Se der erro

- O erro aparece num alerta, e os **detalhes são copiados automaticamente**. É só colar na conversa com o Claude.
- No fim do painel há a seção **🛠️ Diagnóstico**, com dados técnicos que ajudam a corrigir problemas.

---

## 🗂️ Estrutura

```
loader.js        → script colado no Scriptable (baixa e executa o resto)
versao.json      → versão + lista de arquivos que o loader baixa
src/config.js    → configurações
src/api.js       → APIs do Roblox e do Rolimon's, cache e novas tentativas
src/analise.js   → totais, riscos, mudanças e formatação
src/historico.js → armazenamento local no iPhone (cache, ajustes, retrato)
src/html.js      → página do painel
src/widget.js    → widget da tela inicial
src/painel.js    → ponto de entrada
```

## 🌐 Fontes de dados

| Dado | Fonte |
|---|---|
| ID do usuário | `users.roblox.com` |
| Lista de itens (principal) | `api.rolimons.com` (playerassets) |
| Conferência da lista + serial | `inventory.roblox.com` (o inventário precisa estar **público**) |
| Value, RAP, demanda, tendência, projected, hyped, rare | `api.rolimons.com/items/v2/itemdetails` (inclui itens novos/UGC); a v1, só com limiteds clássicos, fica de reserva |

Quando o Rolimon's e o Roblox discordam sobre quais itens você tem, a diferença fica registrada na seção Diagnóstico (campo `divergencia`). Se o Rolimon's falhar, a lista vem só do Roblox.

Os dados ficam em cache por alguns minutos para respeitar os limites de requisição das APIs.
