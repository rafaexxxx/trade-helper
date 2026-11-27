# Trade Helper na nuvem

Bot do Telegram com Mini App, rodando num Cloudflare Worker (grátis).
Ele vai substituir o painel do Scriptable aos poucos; o widget do Scriptable continua.

Esta pasta **não faz parte do app do Scriptable**: o loader não baixa nada daqui.

> **Nunca** coloque a chave do bot (token), a chave da Cloudflare ou qualquer senha
> em arquivo deste repositório: ele é público. Os segredos ficam só no Worker
> (Cloudflare) e nos Secrets do GitHub.

## Estrutura

| Arquivo | Para que serve |
|---|---|
| `wrangler.toml` | Configuração do Worker: nome, KV, cron |
| `src/index.js` | Porta de entrada: decide qual rota atende o pedido |
| `src/telegram.js` | `/setup`, webhook e comandos `/start`, `/inv`, `/diag`, `/app` |
| `src/app.js` | Tela do Mini App (`/app`), por enquanto só o esqueleto |
| `src/api.js` | Rotas `/api/*` do Mini App (lista `ROTAS_API`) |
| `src/trava.js` | Confere o `initData` do Telegram e se é o dono (`MEU_ID`) |
| `src/armazem.js` | KV: catálogo atual e retratos de hora em hora |
| `src/agendado.js` | Tarefa agendada (cron): busca o catálogo a cada 5 min |
| `src/rolimons.js` | Endereços e buscas no Rolimon's |
| `src/regras/` | Regras de trade **copiadas** do app (ver abaixo) |
| `src/util.js` | Formatação e respostas |

## Publicação automática

Cada push que mexe em `nuvem/**` roda o workflow **Publicar nuvem**
(`.github/workflows/nuvem.yml`), que publica o Worker sozinho.
Também dá para rodar à mão: GitHub → **Actions** → **Publicar nuvem** → **Run workflow**.

- **Não edite mais o código pelo painel da Cloudflare**: o próximo push apaga a edição.
- O deploy **não mexe** nos segredos do Worker (`BOT_TOKEN`, `SENHA_SETUP`, `MEU_ID`).
- O nome no `wrangler.toml` tem que ser `trade-helper`. Se mudar, nasce um Worker novo, sem segredos.

### Preparar uma vez
1. **Cloudflare → API Tokens**: criar um token com o modelo **Edit Cloudflare Workers**.
2. **GitHub → repositório → Settings → Secrets and variables → Actions**, um *Repository secret*:
   - `CLOUDFLARE_API_TOKEN` = o token do passo 1
3. **Cloudflare → Storage & databases → Workers KV → Create a KV namespace**, nome `TH`
   (já feito em 2026-11-27). O **ID** dele e o `account_id` da conta ficam no `wrangler.toml`:
   nenhum dos dois é segredo.
4. Depois do primeiro deploy automático, abra uma vez
   `https://trade-helper.rafaelpmsiii.workers.dev/setup?k=SUA_SENHA_SETUP`
   para registrar o comando `/app`.

## Armazenamento e cron

- O **cron** roda a cada 5 min (UTC). É a única parte que busca o catálogo no dia a dia:
  1 consulta a cada 5 min no Rolimon's, não importa quantas vezes o app abrir.
- Ele grava `cat:atual` no KV. Na primeira rodada de cada hora grava também
  `ret:AAAA-MM-DDTHH` (retrato da hora, para o "% em 24h"), que some sozinho depois de 49h.
- O app e o `/inv` leem o catálogo do KV. Se o KV estiver vazio ou parado há mais de
  30 min, buscam direto no Rolimon's, no máximo 1 vez a cada 5 min.

**Limites do plano grátis** (para não esquecer nas próximas fases):

| Limite | Quanto | Uso hoje |
|---|---|---|
| Gravações no KV | 1.000/dia | ~312 (288 do catálogo + 24 retratos) |
| Leituras no KV | 100.000/dia | poucas |
| `list` no KV | 1.000/dia | 2 por `/diag` |
| CPU por execução (pedido ou cron) | 10 ms | o cron só busca e grava |
| Crons por conta | 5 | 1 |

## Mini App e a trava

- `/app` no bot manda um botão que abre o Mini App.
- Toda rota `/api/*` passa por `protegerApi` (em `trava.js`): confere a assinatura do
  `initData` (HMAC com o `BOT_TOKEN`, algoritmo oficial do Telegram), a idade (até 24h) e
  se o usuário é o `MEU_ID`. Se não bater, responde 401/403.
- O navegador manda o cabeçalho `Authorization: tma <Telegram.WebApp.initData>`.
- Rota nova: escrever a função em `api.js` e pôr em `ROTAS_API`.

## Regras de trade (`src/regras/`)

As regras do app (value base, réguas da forma, degraus, "Meus itens") são **copiadas**
de `src/*.js`, não importadas: os módulos do Scriptable puxam coisas que só existem lá.

- Cada função copiada diz a origem: `// copiado de src/avaliador.js (valorEfetivo) @ 01d236c`.
- Se uma regra mudar no app antes da fase Ouro, mude aqui também.
- Depois da fase Ouro (painel do Scriptable desligado), `src/regras/` vira a fonte oficial.

## Testar (no Telegram)

- `/diag`: segredos, cron (idade do último catálogo), KV, retratos, leitura e inventário.
- `/inv`: value e RAP totais. Tem que bater com o que o Trade Helper mostra.
- `/app`: abre o Mini App. Tem que aparecer **✓ Trava ok** com o seu id.

## Se der erro

- Deploy: GitHub → **Actions** → a última execução de **Publicar nuvem** → o passo vermelho.
- Worker e cron: Cloudflare → Worker → **Observability (Logs)**. O cron escreve linhas `cron: ...`.
- Me mande um print, **sem** chaves nem tokens.
