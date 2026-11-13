# 📦 Trade Helper

Painel do inventário de Limiteds para iPhone, feito para rodar no app **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** (gratuito).

- 💰 Value total e RAP total do inventário
- 🚨 Alertas de risco: projected, demanda baixa/terrível, tendência de queda, RAP muito diferente do value
- 🔄 Mudanças relevantes desde a última consulta ou nas últimas 24h (limite configurável, padrão 5%)
- 📋 Tabela com miniaturas, busca e ordenação; tocar num item abre o Rolimon's ou o Roblox
- ⚖️ **Avaliar trade** (aba no topo): monte "dou X, recebo Y" (com Robux) e veja value, value ajustado, RAP e alertas
- 🧩 Widgets grande, médio e pequeno (e da tela bloqueada)
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
2. Procure **Scriptable** → escolha o tamanho **grande** (totais + lista de itens), **médio** (totais + 3 maiores itens) ou **pequeno** → **Adicionar widget**.
3. Toque no widget (ainda no modo edição) → em **Script**, escolha **Trade Helper**.

> ℹ️ Quem decide quando o widget atualiza é o iOS (normalmente a cada 15–60 min). Ele não é tempo real.
> Abra o painel no app pelo menos uma vez antes, para o username ficar salvo.
> A variação do widget é sempre a de ~24h. O histórico é montado com 1 retrato por hora (painel e widget), guardado por 48h no iPhone.

---

## ⚖️ Avaliar trade

1. No painel, toque em **Avaliar trade** no topo.
2. Em **Dou**, toque em **+ Adicionar item**: escolha no **Meu inventário** ou busque no **Catálogo** (para simular). Em **Recebo**, busque pelo nome ou sigla.
3. Se houver Robux, digite nos campos **Robux** de cada lado (no máximo 4 itens por lado, como no Roblox).
4. Veja o **Resumo** (Dou | Recebo | Diferença) e os **Alertas**. Tocar num item da proposta permite removê-lo ou abri-lo no Rolimon's.

Como a conta é feita:

- **Value**: value do Rolimon's (ou RAP, se o item não tiver value) + Robux.
- **Value ajustado**: o mesmo, multiplicado por pesos de demanda, tendência e hyped. Item sem value usa o RAP com desconto, e item **projected sem value** conta só uma fração do RAP.
- **Robux**: quem recebe fica com 70% (taxa de 30% do Roblox).
- **Cores da diferença**: verde = ganho; amarelo = faixa justa (±3%); vermelho = perda.
- **24h**: variação do RAP desde ~24h atrás. Para isso, painel e widget guardam 1 retrato compacto do catálogo por hora (por 30h). Aparece depois de umas 24h de uso.
- A última proposta fica salva no iPhone. O botão **Limpar proposta** pede dois toques.

> Os pesos são estimativas para ajudar a decidir, não uma regra do mercado. Ajuste-os em `src/config.js`.

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
| `PESO_DEMANDA` | 0,80 / 0,90 / 1 / 1,03 / 1,05 | Multiplicador do value ajustado por demanda (terrível → incrível; sem dados 0,95) |
| `PESO_TENDENCIA` | 0,95 / 0,98 / 1 / 1,03 / 0,98 | Multiplicador por tendência (caindo, instável, estável, subindo, oscilando) |
| `PESO_HYPED` | 0,95 | Multiplicador para itens hyped |
| `PESO_SEM_VALUE` | 0,95 | Multiplicador do RAP quando o item não tem value |
| `PESO_PROJECTED_SEM_VALUE` | 0,5 | Fração do RAP usada para item projected sem value |
| `FAIXA_JUSTA_PCT` | 3 | Diferença (%) considerada justa (amarelo) |
| `ALERTA_RAP_24H_PCT` | 15 | Alerta se o RAP de um item recebido subir mais que isso em 24h |
| `TAXA_ROBUX` | 0,3 | Taxa do Roblox sobre Robux recebidos |
| `MAX_ITENS_POR_LADO` | 4 | Itens por lado na proposta |
| `RETRATO_CATALOGO_HORAS` | 30 | Por quantas horas guardar os retratos do catálogo |

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
src/avaliador.js → aba "Avaliar trade" (catálogo enxuto, value ajustado, busca)
src/historico.js → armazenamento local no iPhone (cache, ajustes, retratos)
src/html.js      → página do painel (abas Inventário e Avaliar trade)
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
