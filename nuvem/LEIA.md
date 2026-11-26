# Trade Helper na nuvem · Fase 0 (teste)

Um bot do Telegram que roda num Cloudflare Worker (grátis). Ele serve para testar
duas coisas antes de migrar o app:

1. Se o Rolimon's responde a pedidos vindos da nuvem.
2. Se o plano grátis da Cloudflare aguenta ler o catálogo inteiro.

Esta pasta **não faz parte do app do Scriptable**: o loader não baixa nada daqui.

> **Nunca** coloque a chave do bot (token) em nenhum arquivo deste repositório: ele é público.
> A chave fica só nos segredos do Worker, na Cloudflare.

## Passo a passo

### 1. Bot (Telegram)
- No **@BotFather**: `/newbot` (já feito: `@obsory_th_bot`).
- Se a chave apareceu em algum print ou mensagem: `/revoke`, escolha o bot e use a chave **nova**.

### 2. Worker (Cloudflare)
1. **Compute** → **Workers & Pages** → **Create** → **Start with Hello World** → dê um nome (ex.: `trade-helper`) → **Deploy**.
2. **Edit code** → apague tudo → cole o conteúdo de `worker.js` → **Deploy**.
3. **Settings** → **Variables and Secrets** → **Add**, sempre do tipo **Secret**:
   - `BOT_TOKEN` = a chave do @BotFather
   - `SENHA_SETUP` = uma palavra inventada, só letras, números, `-` e `_` (ex.: `abacaxi_azul_42`)
4. Anote o endereço do Worker (algo como `https://trade-helper.SEU-NOME.workers.dev`).

### 3. Ligar o bot ao Worker
Abra no navegador:

```
https://trade-helper.SEU-NOME.workers.dev/setup?k=SUA_SENHA_SETUP
```

Deve aparecer "Pronto! O bot está ligado a este Worker."

### 4. Travar o bot só para você
1. No Telegram, abra `@obsory_th_bot` e mande `/start`.
2. Ele responde com o seu id do Telegram.
3. Volte em **Settings → Variables and Secrets** e adicione o Secret `MEU_ID` = esse número.

### 5. Testar
- `/diag`: chegam duas mensagens.
  - Parte 1: se o Rolimon's respondeu e quanto demorou.
  - Parte 2: se a nuvem conseguiu ler o catálogo.
  - Se a parte 2 **não chegar**, o plano grátis não aguentou.
- `/inv`: value e RAP totais. Tem que bater com o que o Trade Helper mostra (ex.: 5.429).

## Se der erro
- Na Cloudflare: **Worker → Observability (Logs)**.
- Me mande um print da resposta do `/diag`, **sem** a chave.
