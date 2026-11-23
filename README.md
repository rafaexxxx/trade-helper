# 📦 Trade Helper

Painel de Limiteds do Roblox para iPhone, feito para rodar no app **[Scriptable](https://apps.apple.com/app/scriptable/id1405459188)** (gratuito).

- 📦 **Inventário**: value e RAP totais, seus itens logo de primeira, com etiquetas de alerta e setas de 24h, mais o **Diário de trades**
- ⚖️ **Avaliar trade**: monte "dou X, recebo Y" (com Robux) e veja o veredito, que depende da **forma** da trade (upgrade, downgrade ou sidegrade)
- 📣 **Anúncios**: cruza os Trade Ads recentes do Rolimon's com os seus itens e sugere combinações
- 🔀 **Conta 2**: acompanhe outra conta (itens e anúncios) com um toque
- 🎨 **13 temas**, ❓ **Ajuda** para iniciantes e 🔔 **notificações** pelo widget
- 🖤 Widgets pequeno, médio e grande (tema OLED) e da tela bloqueada
- 🔒 **Somente leitura**: não usa login, cookie nem envia trades. Usa só APIs públicas.

---

## 📲 Instalação (uma vez só)

1. Instale o **Scriptable** pela App Store.
2. No Safari do iPhone, abra:
   `https://raw.githubusercontent.com/rafaexxxx/trade-helper/main/loader.js`
3. Toque e segure no texto → **Selecionar tudo** → **Copiar**.
4. Abra o Scriptable → toque em **＋** → cole o código.
5. Toque no título no topo e renomeie para **Trade Helper**.
6. Toque em **▶︎** para rodar. Na primeira vez ele pergunta o seu username do Roblox e, em seguida, uma **conta 2** (opcional). Os dois ficam salvos só no iPhone.

Pronto! Das próximas vezes é só abrir o script. Ele confere sozinho se há versão nova aqui no GitHub e se atualiza.

### 🧩 Widget

1. Na tela inicial, toque e segure num espaço vazio → **Editar** → **＋ / Adicionar widget**.
2. Procure **Scriptable** → escolha o tamanho **grande** (totais + lista de itens), **médio** (totais + 3 maiores itens) ou **pequeno** → **Adicionar widget**.
3. Toque no widget (ainda no modo edição) → em **Script**, escolha **Trade Helper**.

> ℹ️ Quem decide quando o widget atualiza é o iOS (normalmente a cada 15–60 min). Ele não é tempo real.
> Abra o painel no app pelo menos uma vez antes, para o username ficar salvo.
> O widget usa sempre o **tema OLED** (fundo preto), seja qual for o tema do painel. A variação mostrada é a de ~24h.

---

## 📦 Inventário

- **Faixa de totais** no topo: value total, RAP total e a variação de 24h.
- **Seus itens** logo abaixo, com miniatura, busca e ordenação (value, RAP, demanda, tendência, vendas, nome).
- **Vendas/dia e Best Price na linha** (v6.11): `15/dia` na linha de baixo, depois da demanda e da tendência (colorido pela escala da demanda), e `Best 3.850` embaixo do RAP. Veja [como são buscados](#-vendasdia-e-best-price-na-linha-v611).
- **Cada informação num lugar só** (v6.3): a etiqueta aparece só para o que não está em outro lugar da linha (projected, RAP longe do value); queda de preço fica na seta; demanda e tendência, coloridas embaixo do nome. O chip "Com alerta" filtra todo item com algum risco.
- **Tocar no item** abre a **tela do item**, com os alertas (como o item é), as mudanças em 24h (antes → depois) e os links para o Rolimon's e o Roblox.
- **Setas ▲ ▼**: variação de value/RAP do item nas últimas 24h (a partir de `LIMITE_MUDANCA_PCT`).
- O histórico de 24h é montado com 1 retrato por hora (painel e widget), guardado por 48h no iPhone.

### 📈 Vendas/dia e Best Price na linha (v6.11)

**Nada novo na abertura:** a linha é desenhada com o que está guardado no iPhone (`dados/cartoes.json`). Uns segundos depois de a tela abrir (`CARTAO_LINHA_ESPERA_MS`), a página pede pela ponte (`PONTE + 'linhas?conta=1'`; a conta 2 pede quando os itens dela chegam) e o Scriptable atualiza **por trás**, um item por vez, do maior value para o menor:

| Dado | Fonte | Vale por | Peso |
|---|---|---|---|
| **Vendas/dia** | Página do item no Rolimon's (traz o Best Price junto) | `CARTAO_LINHA_PAGINA_H` (24h) | ~850 KB por item |
| **Best Price** | Roblox `economy.roblox.com/v2/assets/{id}/details` | `CARTAO_LINHA_BEST_MIN` (30 min) | ~1 KB por item |

- Pausa de `CARTAO_LINHA_PAUSA_MS` (1,5 s) entre duas páginas do Rolimon's.
- **Falha:** fica o último valor guardado (mesmo velho). Item que nunca teve dado fica como antes. HTTP 429/403 ou 3 falhas seguidas **param aquela fonte** nesta abertura.
- Quando o Roblox responde **sem preço** (item clássico ou ninguém vendendo), ele não é consultado de novo por 24h, e o Best da linha fica o da página do Rolimon's.
- Cada item atualizado é gravado na hora: fechar o app no meio não perde nada. Item que não aparece há `CARTAO_LINHA_GUARDA_DIAS` (7 dias) sai do arquivo.
- A **tela do item** usa a mesma página guardada se ela tiver até `CARTAO_CACHE_MIN` (10 min) e abre na hora. O que a tela buscar atualiza a linha também. As duas nunca buscam o mesmo item juntas.
- O **Diagnóstico** ganhou a linha "Linhas" (quantas páginas, quantos Best, falhas e pausas).
- Chip **Vendas**: os itens ainda sem dado ficam sempre no fim.

### 🃏 Tela do item (v6.10; o card nasceu na v6.9)

Abre em **tela cheia** ao tocar num item no **Inventário** (nas duas contas), no **Avaliar** e nos **Anúncios** (v6.12). O botão **‹ Voltar** fica fixo **embaixo** (v6.10.1: no topo ele ficava colado no "Close" do Scriptable).

**Cores** (v6.10.1): 🟠 laranja = o que você paga (OP para dar) · 🟢 verde = o que você ganha ou o que sobe (OP para pedir, ▲ no RAP, maior RAP, vendas e demanda boas) · 🔴 vermelho = o que desce ou não gira. Os dados vêm da página do item no Rolimon's (~850 KB), buscada nesse toque, ou da que a busca por trás do Inventário guardou há até `CARTAO_CACHE_MIN` (10 min). Nada é buscado ao abrir o app.

Ordem da tela:

| Bloco | O que é | De onde vem |
|---|---|---|
| **Gráfico** | RAP dos últimos 90 dias (1 ponto por dia: o último de cada dia). Embaixo, a legenda: maior, menor, hoje e a variação no período (os números ficam fora do desenho para não se atravessarem) | Histórico da página do Rolimon's |
| **OP para dar** | Quanto pagar a mais para **pegar** o item (seu upgrade), em % e em Robux | 0 até o "Vale muito" do upgrade (0–5%) × demanda |
| **OP para pedir** | Quanto pedir a mais quando você **dá** o item (seu downgrade) | O "Vale a pena" do downgrade (7–12%) × demanda |
| **Best Price** | Menor preço à venda agora | Página do Rolimon's (reserva: Roblox `v2/assets/{id}/details`) |
| **Depois da venda** | O RAP se alguém comprar pelo Best Price: RAP + (Best − RAP) ÷ 10 | Conta do app |
| **Vendas por dia** | Média de 30 dias | Página do Rolimon's |
| **Demanda** | A do Rolimon's; item sem value não tem, e aí ela é **estimada pelas vendas** (`CARTAO_DEMANDA_VENDAS`): 10+/dia Incrível · 3+ Alta · 1+ Normal · 0,3+ Baixa · menos Terrível | Catálogo do Rolimon's ou conta do app |
| **Alertas** e **Mudanças em 24h** | Os mesmos de antes (só no Inventário) | App |
| **Links** | Ver no Rolimon's · Ver no Roblox; no Avaliar, **Remover da proposta** | — |

- **Ajuste do OP pela demanda** (`CARTAO_OP_DEMANDA_MULT`): Terrível ×0,6 · Baixa ×0,8 · Normal ×1 · Alta ×1,2 · Incrível ×1,4. O OP é calculado sobre o **value base** (item sem value usa o RAP).
- O RSI-21 da v6.9 saiu na v6.10 (não ajudava na decisão).
- A página do Rolimon's não é uma API oficial e pode mudar sem aviso. O bloco que não vier mostra "sem dado", e o Diagnóstico diz o que faltou.
- Testado na v6.8.2: o `resale-data` do Roblox recusa itens colecionáveis (HTTP 400), e o `resellers` pede login (HTTP 401).

### 📒 Diário de trades

- O app compara os seus itens (pelo Rolimon's) a cada consulta do painel e do widget. Quando **itens saem e outros entram**, ele pergunta no topo do Inventário: **"Você fez esta trade?"** (Sim / Não foi trade), com um campo opcional de **Robux** que entraram ou saíram.
- A seção **Diário de trades** mostra o **lucro até hoje**: value de hoje do que entrou − value de hoje do que saiu + Robux. Tocar numa trade mostra os detalhes e permite apagá-la.
- Limites: o app não vê as suas trades de verdade (não tem login). Duas trades entre consultas aparecem juntas, e compra e venda também podem gerar pergunta; por isso ele sempre pergunta antes de registrar.
- Só a conta principal. Fica no arquivo `diario.json`, só neste iPhone.

---

## ⚖️ Avaliar trade

1. No painel, toque em **Avaliar trade** no topo.
2. Em **Dou**, adicione itens do **seu inventário** ou do **catálogo** (para simular). Em **Recebo**, busque pelo nome ou sigla. Os resultados mostram **Value** e **RAP**, e dá para ordenar por um ou outro.
3. Se houver Robux, digite nos campos **Robux** de cada lado (no máximo 4 itens por lado, como no Roblox).
4. Leia o **veredito** e os motivos.

### 📈 Vendas/dia e OP na linha do item (v6.12)

A linha de cada item da proposta mostra, depois da demanda, as **vendas por dia** e **só o OP que vale para aquele lado**:

| Lado | Exemplo | O que é |
|---|---|---|
| **Recebo** | `Alta · 15/dia · OP dar 0–6%` (laranja) | quanto pagar a mais para **pegar** o item |
| **Dou** | `Normal · 2,3/dia · OP pedir 7–12%` (verde) | quanto **pedir** a mais quando você dá o item |

- O OP é a **mesma conta da tela do item** (`cartao.opFaixas`): só em %, e o valor em Robux fica na tela do item.
- As vendas/dia vêm do **arquivo guardado** da v6.11 (`dados/cartoes.json`, vale 24h). Ao **abrir a aba** e ao **adicionar um item**, os itens da proposta vão para a **frente da fila** do Inventário (`PONTE + 'linhas?ids=…'`), uma vez por abertura. Enquanto não chegam, aparece `…/dia`. Nada roda na abertura do app: se o painel abrir direto no Avaliar, espera `CARTAO_LINHA_ESPERA_MS`.
- Item **sem demanda** no Rolimon's espera as vendas e usa a demanda estimada (igual à tela do item). Item fora do Rolimon's fica sem OP.
- **Nada disso muda o veredito.**

Como a conta é feita:

- **Value base**: é o número que decide. Item **com value** no Rolimon's vale o value; item **sem value** vale o RAP. Somam-se os Robux.
- **RAP**: aparece só como informação (não muda o veredito).
- **Robux**: quem recebe fica com 70% (taxa de 30% do Roblox).

### Veredito pela forma da trade

A forma é vista do **seu** lado, pela contagem de itens:

| Forma | Quem costuma pagar a mais | Não vale de jeito nenhum | Não vale a pena | Troca justa | Vale a pena | Vale muito a pena |
|---|---|---|---|---|---|---|
| **Upgrade** (você dá mais itens e recebe menos, porém maiores) | Você | abaixo de −20% | −20% a −9% | −9% a −7% | −7% a −5% | −5% ou melhor |
| **Downgrade** (você recebe mais itens, porém menores) | O outro | abaixo de 0% | 0% a +5% | +5% a +7% | +7% a +12% | +12% ou mais |
| **Sidegrade** (mesmo número de itens) | Ninguém | −10% ou pior | −10% a −3% | −3% a +3% | +3% a +10% | +10% ou mais |

- **Demanda**: compara a demanda média dos dois lados (ponderada pelo valor). Uma diferença de 0,75 nível vira motivo; se o que você recebe tiver demanda pelo menos 1,5 nível **menor**, o veredito cai um nível.
- **Sem dados de demanda**: se mais da metade do value que você recebe é de itens sem dados de demanda (e você dá itens com demanda conhecida), o veredito cai um nível.
- **Cuidado** substitui o veredito quando um item recebido é projected, tem demanda terrível ou teve o RAP disparando em 24h, ou quando um item seu está em hold. O cartão também diz qual seria o veredito sem o alerta.

> Os números são regras práticas da comunidade, não regras oficiais do Roblox. Ajuste em `src/config.js`. É uma segunda opinião automática: a decisão é sua.

---

## 📣 Anúncios (Trade Ads)

1. No painel, toque em **Anúncios** no topo. Os anúncios recentes do Rolimon's são buscados nessa hora (no máximo 1 busca a cada 3 min).
2. Os anúncios já vistos ficam guardados no iPhone por **2h**, então a lista cresce a cada consulta. Um anúncio guardado pode já ter sido fechado.
3. A lista é **única**, em linhas curtas (jogador, itens, % e veredito). Tocar numa linha abre o cartão completo; tocar num item abre a **tela do item** (v6.12), com as mudanças de RAP e value em 24h no fim e o "Ver no Rolimon's" embaixo; os botões levam ao **jogador no Rolimon's** ou abrem a **trade no Roblox** (quem monta e envia a trade é você).
4. **Filtros**:
   - **"Um item seu"**: só os anúncios que envolvem aquele item.
   - **Todos / Seu upgrade / Seu downgrade** (v6.8): a forma da trade do **seu** lado, com a contagem em cada botão.
     - Seu upgrade: você dá vários itens e recebe 1.
     - Seu downgrade: você dá 1 item e recebe 2 ou 3.
     - Vale para os anúncios que pedem seus itens e para as sugestões. Sidegrade e "por Robux" só aparecem em Todos.
     - Num anúncio com as tags upgrade **e** downgrade, cada filtro monta a sugestão daquela forma. Por isso Upgrade + Downgrade pode passar de Todos.
     - O filtro fica salvo no iPhone.
   - **Ordem**: **maior ganho**, **mais recentes** ou **maior value recebido**.

O que entra na lista:

| Tipo | Quando o anúncio aparece | O que você daria |
|---|---|---|
| **Pede seus itens** | Ele pede itens que você tem (todos, em cópias sem hold) e o veredito é **"Vale a pena"** ou melhor | Os itens pedidos |
| **Tag upgrade** (do dono) = **seu downgrade** | Ele dá mais itens e quer receber menos | **1 item seu só**, pedindo **uma parte** da oferta dele: pelo menos **2 itens médios** + no máximo **2 adds**, ganhando de **+5% a +12%** (mira +9%) |
| **Tag downgrade** (do dono) = **seu upgrade** | Ele dá menos itens (geralmente 1 maior) | **De 2 a 4 itens seus** por **1 item só** dele, pagando **até 9%** a mais (mira 5%, o menor overpay que ele deve aceitar) |
| **Tag any** | Ele aceita qualquer item | **Nada** (v6.6): sidegrade não é sugerido, porque quase ninguém aceita. Anúncio só com "any" fica de fora |

- As tags do Rolimon's são do ponto de vista do **dono do anúncio**; o app traduz para o seu lado.
- **Adds** (v6.6) = itens de value até **500** (ovos e itens pequenos). No seu downgrade, os itens médios sozinhos já têm que ganhar pelo menos +5%; os adds só complementam. Do seu lado, no seu upgrade, não há limite de adds.
- Entre várias trades possíveis, fica a mais perto do alvo (empate: menos itens). Quando a sugestão pede só uma parte da oferta, os **Robux** do dono ficam de fora.
- Ficam de fora anúncios que oferecem item **projected**, com **demanda terrível**, com o **RAP subindo mais de 15% em 24h** ou fora do catálogo do Rolimon's, além dos seus próprios anúncios.
- **Mesmo item dos dois lados**: só aparece se você não perder value.
- As outras tags (demand, rap, adds...) não geram sugestões. A contagem de tags vistas fica no **Diagnóstico**.

---

## 🔀 Conta 2

- Um chip pequeno embaixo do título mostra a conta aberta; um toque (⇄) troca entre a sua conta e a conta 2.
- Na conta 2 aparecem o **Inventário** (com etiquetas e setas) e os **Anúncios** cruzados com os itens dela. O **Avaliar trade** fica só na sua conta.
- Os itens da conta 2 só são buscados no primeiro toque (cache de 10 min).
- Para trocar ou remover a conta 2, use o menu **⋯**. Os usernames ficam **só no iPhone**.

## 🎨 Temas

No menu **⋯ → Temas**, com 13 opções que ficam salvas no iPhone:

- **Clássicos:** Azul, Dark, OLED, Rosinha e Vermelho.
- **Estéticos:** Galáxia, Frutiger Aero, Gen X Soft Club, Gatinhos, Dark Aero, Chromecore, MetalHeart e Frutiger Metro.

Sem tema escolhido, o painel segue o iPhone (Azul no claro, Dark no escuro). Cada tema tem uma cor própria para a conta 2.

## ❓ Ajuda

No menu **⋯ → Ajuda**: guia em capítulos (o básico, upgrade e downgrade, demanda e armadilhas, como usar o app), glossário e perguntas rápidas, com exemplos montados no próprio visual do app. Os links "Ver na Ajuda" das abas levam direto ao tópico.

## 🔔 Notificações (pelo widget)

> ⚠️ Ainda **não testadas** no iPhone.

- Quando o widget atualiza, ele pode mandar **uma notificação-resumo** com:
  - anúncio novo **"Vale muito a pena"** para você;
  - item seu que **virou projected** ou ficou com **demanda terrível**.
- O mesmo aviso nunca se repete. Tocar na notificação abre o Trade Helper (nos Anúncios, quando houver anúncio).
- **Silêncio** de 0h a 8h: anúncios desse horário são descartados; alertas de risco esperam o silêncio acabar.
- Só a conta principal. Liga e desliga em `NOTIFICACOES_LIGADAS`.

---

## ⚙️ Configurações

Ficam em [`src/config.js`](src/config.js):

| Configuração | Padrão | O que faz |
|---|---|---|
| `LIMITE_MUDANCA_PCT` | 5 | Variação mínima (%) para as setas de 24h e para queda virar alerta |
| `LIMITE_RAP_VALUE_PCT` | 5 | Diferença mínima (%) entre RAP e value para virar alerta |
| `CACHE_ROLIMONS_MIN` | 5 | Minutos reaproveitando os values baixados |
| `CACHE_INVENTARIO_MIN` | 1 | Minutos reaproveitando o inventário baixado |
| `CACHE_CONTA2_MIN` | 10 | Minutos reaproveitando os itens da conta 2 |
| `WIDGET_ATUALIZAR_MIN` | 30 | Intervalo pedido ao iOS para atualizar o widget |
| `FAIXA_JUSTA_PCT` | 3 | Sidegrade: diferença (%) considerada justa |
| `VEREDITO_FORTE_PCT` | 10 | Sidegrade: a partir daqui, "Vale muito a pena" / "Não vale de jeito nenhum" |
| `VEREDITO_UPGRADE_PCT` | −20 / −9 / −7 / −5 | Upgrade: mínimo (%) para Não vale, Justa, Vale e Vale muito |
| `VEREDITO_DOWNGRADE_PCT` | 0 / 5 / 7 / 12 | Downgrade: mínimo (%) para Não vale, Justa, Vale e Vale muito |
| `DEMANDA_DIF_MOTIVO` | 0,75 | Diferença de demanda média que vira motivo no veredito |
| `DEMANDA_DIF_REBAIXA` | 1,5 | Diferença de demanda (contra você) que rebaixa o veredito um nível |
| `DEMANDA_SEM_DADOS_FRACAO` | 0,5 | Fração do value recebido sem dados de demanda que rebaixa um nível |
| `ALERTA_RAP_24H_PCT` | 15 | Alerta se o RAP de um item recebido subir mais que isso em 24h |
| `TAXA_ROBUX` | 0,3 | Taxa do Roblox sobre Robux recebidos |
| `MAX_ITENS_POR_LADO` | 4 | Itens por lado na proposta |
| `RETRATO_CATALOGO_HORAS` | 30 | Por quantas horas guardar os retratos do catálogo (24h dos itens que você não tem) |
| `ANUNCIOS_CACHE_MIN` | 3 | Intervalo mínimo (min) entre buscas de anúncios |
| `ANUNCIOS_GUARDAR_HORAS` | 2 | Por quantas horas guardar os anúncios já vistos |
| `ANUNCIO_SEU_UPGRADE_PAGAR_MAX_PCT` / `ALVO` | 9 / 5 | Dono pede downgrade (seu upgrade): até quanto (%) você paga a mais e o ponto preferido |
| `ANUNCIO_SEU_DOWNGRADE_MIN_PCT` / `MAX` / `ALVO` | 5 / 12 / 9 | Dono pede upgrade (seu downgrade): faixa de ganho (%) e o ponto preferido |
| `ANUNCIO_ADD_MAX_VALUE` | 500 | Até esse value, o item conta como add (ovos e itens pequenos) |
| `ANUNCIO_ADDS_MAX` | 2 | Quantos adds você aceita receber no seu downgrade |
| `ANUNCIO_SEU_DOWNGRADE_MIN_MEDIOS` | 2 | Mínimo de itens médios que você recebe no seu downgrade |
| `ANUNCIO_COMBINACAO_MAX_ITENS` | 25 | Quantos dos seus itens entram na busca de combinações |
| `ANUNCIOS_MAX_NA_LISTA` | 40 | Linhas mostradas na lista de anúncios |
| `NOTIFICACOES_LIGADAS` | true | Liga/desliga as notificações do widget |
| `SILENCIO_INICIO_H` / `SILENCIO_FIM_H` | 0 / 8 | Horário sem notificações (números iguais = sem silêncio) |
| `NOTIF_ANUNCIO_IDADE_MAX_MIN` | 60 | Só avisa de anúncios criados há no máximo X min |
| `NOTIF_TEMPO_MAX_S` | 8 | Tempo máximo (s) da análise de anúncios dentro do widget |
| `CARTAO_CACHE_MIN` | 10 | Tela do item: por quantos minutos a página do item vale |
| `CARTAO_LINHA_PAGINA_H` | 24 | Linha do item: por quantas horas valem as vendas/dia (página do Rolimon's) |
| `CARTAO_LINHA_BEST_MIN` | 30 | Linha do item: por quantos minutos vale o Best Price (Roblox) |
| `CARTAO_LINHA_PAUSA_MS` | 1500 | Pausa entre duas páginas do Rolimon's na busca por trás |
| `CARTAO_LINHA_ESPERA_MS` | 2500 | Espera depois de a tela abrir antes da busca por trás |
| `CARTAO_LINHA_GUARDA_DIAS` | 7 | Item que não aparece há X dias sai do arquivo guardado |

**Trocar o username principal:** no script do Scriptable, mude `TROCAR_USERNAME` para `true`, rode uma vez e volte para `false` (a conta 2 e o tema continuam). A **conta 2** se troca pelo menu **⋯**.

---

## 🛠️ Se der erro

- O erro aparece num alerta, e os **detalhes são copiados automaticamente**. É só colar na conversa com o Claude.
- No fim do painel há a seção **🛠️ Diagnóstico**, com dados técnicos (fontes, caches, anúncios, diário, notificações) que ajudam a corrigir problemas.

---

## 🗂️ Estrutura

```
loader.js            → script colado no Scriptable (baixa e executa o resto)
versao.json          → versão + lista de arquivos que o loader baixa
src/config.js        → configurações
src/api.js           → APIs do Roblox e do Rolimon's, cache e novas tentativas
src/historico.js     → armazenamento local no iPhone (cache, ajustes, retratos)
src/analise.js       → itens, totais, alertas, mudanças e formatação
src/avaliador.js     → aba "Avaliar trade" (value base, régua da forma, veredito, busca)
src/anuncios.js      → aba "Anúncios" (Trade Ads: leitura, análise e combinações)
src/diario.js        → Diário de trades (detecção, perguntas e lucro até hoje)
src/notificacoes.js  → notificação-resumo do widget
src/ajuda.js         → tela de Ajuda
src/cartao.js        → tela do item e vendas/dia + Best Price da linha (página do Rolimon's, arquivo guardado)
src/temas.js         → temas do painel
src/html.js          → página do painel (abas, conta 2, temas, menu ⋯)
src/widget.js        → widgets (tema OLED)
src/painel.js        → ponto de entrada e ponte página ↔ Scriptable
```

## 🌐 Fontes de dados

| Dado | Fonte |
|---|---|
| ID do usuário | `users.roblox.com` |
| Lista de itens (principal) | `api.rolimons.com` (playerassets) |
| Conferência da lista + serial | `inventory.roblox.com` (o inventário precisa estar **público**) |
| Value, RAP, demanda, tendência, projected, hyped, rare | `api.rolimons.com/items/v2/itemdetails` (inclui itens novos/UGC); a v1, só com limiteds clássicos, fica de reserva |
| Anúncios de trade recentes | `api.rolimons.com/tradeads/v1/getrecentads` |
| Miniaturas | `thumbnails.roblox.com` |
| Vendas/dia, histórico do RAP e Best Price (tela e linha do item) | Página `www.rolimons.com/item/{id}` (não é API oficial) |
| Best Price (linha do item, e reserva da tela) | `economy.roblox.com/v2/assets/{id}/details` |

Quando o Rolimon's e o Roblox discordam sobre quais itens você tem, a diferença fica registrada no Diagnóstico (campo `divergencia`). Se o Rolimon's falhar, a lista vem só do Roblox.

Os dados ficam em cache por alguns minutos para respeitar os limites de requisição das APIs.
