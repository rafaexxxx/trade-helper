# 📦 Trade Helper

Painel do inventário de Limiteds para iPhone, feito para rodar no app **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** (gratuito).

- 💰 Value total e RAP total do inventário
- 🚨 Alertas de risco: projected, demanda baixa/terrível, tendência de queda, RAP muito diferente do value (bloco recolhível, com contador colorido)
- 🔄 Mudanças relevantes desde a última consulta ou nas últimas 24h (limite configurável, padrão 5%; bloco recolhível)
- 📋 Tabela com miniaturas, busca e ordenação; tocar num item abre o Rolimon's ou o Roblox
- ⚖️ **Avaliar trade** (aba no topo): monte "dou X, recebo Y" (com Robux) e veja value, RAP, veredito e alertas
- 📣 **Anúncios** (aba no topo): cruza os Trade Ads recentes do Rolimon's com o seu inventário e mostra os que valem a pena para você
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
2. Em **Dou**, toque em **+ Adicionar item**: escolha no **Meu inventário** ou busque no **Catálogo** (para simular). Em **Recebo**, busque pelo nome ou sigla. Cada resultado mostra **Value** e **RAP** lado a lado, e dá para ordenar **por value** ou **por RAP**.
3. Se houver Robux, digite nos campos **Robux** de cada lado (no máximo 4 itens por lado, como no Roblox).
4. Leia o **veredito** (cartão abaixo dos blocos). **Resumo** (Dou | Recebo | Diferença) e **Alertas** ficam recolhidos: toque para abrir (o painel lembra se você os deixou abertos). Tocar num item da proposta permite removê-lo ou abri-lo no Rolimon's.

Como a conta é feita:

- **Value (value base)**: é o número que decide. Item **com value** no Rolimon's vale o value (o RAP dele não entra); item **sem value** vale o RAP. Somam-se os Robux.
- **RAP**: aparece na tabela, no Resumo e no veredito só como informação.
- **Robux**: quem recebe fica com 70% (taxa de 30% do Roblox).
- **Cores da diferença**: verde = ganho; amarelo = faixa justa (±3%); vermelho = perda.
- **24h**: variação do RAP desde ~24h atrás, mostrada na linha pequena embaixo do nome do item (só quando já existe histórico). Para isso, painel e widget guardam 1 retrato compacto do catálogo por hora (por 30h). Aparece depois de umas 24h de uso.
- A última proposta fica salva no iPhone. O botão **Limpar proposta** pede dois toques.

### Veredito

| Diferença do value | Mensagem |
|---|---|
| ≥ +10% | **Vale muito a pena** |
| +3% a +10% | **Vale a pena** |
| −3% a +3% | **Troca justa** |
| −10% a −3% | **Não vale a pena** |
| ≤ −10% | **Não vale de jeito nenhum** |

- **RAP (informativo)**: o cartão sempre diz como a troca fica em RAP, mas isso não muda o veredito.
- **Demanda**: compara a demanda média dos dois lados, ponderada pelo valor dos itens. Uma diferença de 0,75 nível vira motivo; se o que você recebe tiver demanda pelo menos 1,5 nível **menor**, o veredito cai um nível.
- **Sem dados de demanda**: se você dá itens com demanda conhecida e mais da metade do value que recebe é de itens **sem dados de demanda**, o cartão avisa (podem ser difíceis de revender) e o veredito cai um nível.
- **Cuidado** substitui o veredito quando um item recebido é projected, tem demanda terrível ou teve o RAP disparando em 24h, ou quando um item seu está em hold. O cartão também diz qual seria o veredito sem o alerta.
- O cartão mostra até 4 motivos (value, RAP, demanda e um extra). É uma segunda opinião automática: a decisão é sua.

> Os limites (faixa justa, demanda etc.) são estimativas para ajudar a decidir, não uma regra do mercado. Ajuste-os em `src/config.js`.

---

## 📣 Anúncios (Trade Ads)

1. No painel, toque em **Anúncios** no topo. Os anúncios recentes do Rolimon's são buscados nessa hora (no máximo 1 busca a cada 3 min; o botão **Atualizar** respeita esse intervalo).
2. Os anúncios já vistos ficam guardados no iPhone por **2h**, então a lista cresce a cada consulta. Cada cartão mostra "há X min": um anúncio antigo pode já ter sido fechado.
3. Tocar num cartão abre **Ver jogador no Rolimon's** ou **Abrir trade no Roblox** (você é quem monta e envia a trade; o app continua só leitura).

O que entra na lista:

| Bloco | Quando o anúncio aparece | O que você daria |
|---|---|---|
| **Pedem seus itens** | Pede itens que você tem (todos, em cópias sem hold) e o veredito é **"Vale a pena"** ou melhor | Os itens pedidos |
| **Upgrade** (tag) | Ele dá 2 ou mais itens e quer upgrade | Uma combinação sua com **menos itens**, com ganho de **3% a 15%** (prefere perto de 9%) |
| **Downgrade** (tag) | Ele quer downgrade | Uma combinação sua com **mais itens** (até 4), pagando **até 5%** a mais |
| **Any** (tag) | Ele aceita qualquer item | Uma combinação com o **mesmo número de itens**, diferença de **±3%** |

- Sempre ficam de fora anúncios que oferecem item **projected**, com **demanda terrível** ou com o **RAP subindo mais de 15% em 24h**, além de itens fora do catálogo do Rolimon's.
- As contas usam o **value base** (a mesma regra do avaliador: value, ou RAP para item sem value), e os Robux oferecidos entram com a taxa de 30%. Cartão minimalista: Recebo e Dou separados por uma divisória, uma coluna **Valor** com a fonte ao lado ("value" ou "RAP"), só a demanda embaixo do nome, linha **Total** e, no rodapé, só a **%** em destaque, na cor do veredito. O veredito por extenso aparece ao tocar no cartão.
- Quando a maior parte do que você recebe é de itens sem dados de demanda, o veredito cai um nível (a cor da % muda).
- As outras tags (demand, rap, adds...) não geram sugestões. A contagem de tags vistas fica no **Diagnóstico**.
- Os anúncios só são buscados com o painel aberto: o widget não muda.

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
| `FAIXA_JUSTA_PCT` | 3 | Diferença (%) considerada justa (amarelo) |
| `VEREDITO_FORTE_PCT` | 10 | A partir daqui: "Vale muito a pena" / "Não vale de jeito nenhum" |
| `DEMANDA_DIF_MOTIVO` | 0,75 | Diferença de demanda média que vira motivo no veredito |
| `DEMANDA_DIF_REBAIXA` | 1,5 | Diferença de demanda (contra você) que rebaixa o veredito um nível |
| `DEMANDA_SEM_DADOS_FRACAO` | 0,5 | Fração do value recebido sem dados de demanda que gera aviso e rebaixa um nível |
| `ALERTA_RAP_24H_PCT` | 15 | Alerta se o RAP de um item recebido subir mais que isso em 24h |
| `TAXA_ROBUX` | 0,3 | Taxa do Roblox sobre Robux recebidos |
| `MAX_ITENS_POR_LADO` | 4 | Itens por lado na proposta |
| `RETRATO_CATALOGO_HORAS` | 30 | Por quantas horas guardar os retratos do catálogo |
| `ANUNCIOS_CACHE_MIN` | 3 | Intervalo mínimo (min) entre buscas de anúncios |
| `ANUNCIOS_GUARDAR_HORAS` | 2 | Por quantas horas guardar os anúncios já vistos |
| `ANUNCIO_UPGRADE_MIN_PCT` / `MAX` / `ALVO` | 3 / 15 / 9 | Faixa de ganho para a tag upgrade e o ponto preferido |
| `ANUNCIO_DOWNGRADE_PAGAR_MAX_PCT` | 5 | Quanto (%) você aceita pagar a mais na tag downgrade |
| `ANUNCIO_ANY_PCT` | 3 | Diferença máxima (±%) na tag any |
| `ANUNCIO_COMBINACAO_MAX_ITENS` | 25 | Quantos dos seus itens entram na busca de combinações |
| `ANUNCIOS_MAX_NA_LISTA` | 40 | Cartões por bloco |

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
src/avaliador.js → aba "Avaliar trade" (catálogo enxuto, value base, veredito, busca)
src/anuncios.js  → aba "Anúncios" (Trade Ads: leitura, matches e combinações)
src/historico.js → armazenamento local no iPhone (cache, ajustes, retratos)
src/html.js      → página do painel (abas Inventário, Avaliar trade e Anúncios)
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
| Anúncios de trade recentes | `api.rolimons.com/tradeads/v1/getrecentads` |

Quando o Rolimon's e o Roblox discordam sobre quais itens você tem, a diferença fica registrada na seção Diagnóstico (campo `divergencia`). Se o Rolimon's falhar, a lista vem só do Roblox.

Os dados ficam em cache por alguns minutos para respeitar os limites de requisição das APIs.
