// /app: o Mini App do Trade Helper.
// Fase 1 (protótipo aprovado em 2026-11-27: claude.ai/artifact/4iWddnLhHWr5jTM3x9Pg3W):
//   - Vitrine do Inventário igual à v7.2 do app (2 colunas, foto ampliada, nome
//     numa linha, Value | RAP com seta 24h, demanda · vendas/dia · Best);
//   - temas Angel Core e OLED (os outros 19 na Fase 3), escolhidos no Mais e
//     salvos no Telegram (CloudStorage);
//   - tela cheia (Telegram 8.0+; mais antigo abre normal);
//   - barra de baixo com as 5 abas; as que ainda não existem ficam apagadas;
//   - toque no item: folha com links do Rolimon's e do Roblox;
//   - Mais: tema, Adicionar à Tela de Início, Diagnóstico.
//
// O CSS é copiado de src/html.js e src/temas.js @ e21d9e4 (só o que a Vitrine
// usa). Os dados vêm prontos de /api/inventario (api.js): a página só desenha.
//
// ATENÇÃO: a página fica dentro de String.raw`...`. Não use crase nem "${"
// aqui dentro; e o JS da página evita contrabarras.

import { html } from './util.js';

const PAGINA = String.raw`<!doctype html>
<html lang="pt-BR" data-tema="angel">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<title>Trade Helper</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Cormorant+Garamond:ital,wght@1,600&display=swap">
<script>
// Tema antes do primeiro desenho (sem piscar o errado). O localStorage é só um
// atalho: quem manda é o CloudStorage do Telegram, lido logo depois.
try { var t0 = localStorage.getItem('th-tema'); if (t0 === 'oled' || t0 === 'angel') document.documentElement.setAttribute('data-tema', t0); } catch (e) {}
</script>
<style>
/* ---------- Tokens dos 2 temas (copiados de src/temas.js @ e21d9e4) ---------- */
:root{--f-ui:"Montserrat",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  --c-safe-top:calc(var(--tg-safe-area-inset-top,env(safe-area-inset-top,0px)) + var(--tg-content-safe-area-inset-top,0px));
  --c-safe-bot:var(--tg-safe-area-inset-bottom,env(safe-area-inset-bottom,0px))}
[data-tema=angel]{color-scheme:light;
  --bg:#f6f7fc;--card:rgba(255,255,255,.95);--card2:#eef0f8;--borda:#e2e5f1;--card-borda:#d8dcec;--fg:#262b44;--sub:#6b7190;
  --acc:#8e9ac8;--acc-fundo:linear-gradient(165deg,#ffffff 0%,#eef0f8 30%,#d3d8ea 55%,#f7f8fd 75%,#c4cbe2 100%);--acc-press:#c4cbe2;--on-acc:#262b44;--acc-t:#5560a3;--rap:#3f68b3;
  --heroi:radial-gradient(ellipse 70% 60% at 50% -10%,rgba(255,255,255,.95),transparent 70%),linear-gradient(180deg,#d9e2f8 0%,#eef1fb 70%,#f8f6fb 100%);
  --heroi-borda:#d2d8ea;--on-heroi:#262b44;--heroi-linha:rgba(38,43,68,.12);
  --pos:#1d8656;--pos-bg:#e2f3ea;--warn:#b05a16;--warn-bg:#fbeee0;--neg:#c2365a;--neg-bg:#fbe5ec;
  --sombra:0 1px 2px rgba(40,50,90,.05),0 8px 24px rgba(90,100,160,.10);--folha:#ffffff;
  --btn-sombra:inset 0 1px 0 #ffffff,inset 0 -3px 7px rgba(120,130,180,.28),0 4px 14px rgba(120,135,200,.28);
  --r-card:22px;--r-heroi:26px;
  --f-titulo:"Cormorant Garamond",Georgia,serif;--t-estilo:italic;--t-peso:600;--t-tam:42px;--t-cor:#2f3660;--t-sombra:0 0 18px rgba(255,255,255,.95);
  --ceu:radial-gradient(ellipse 90% 45% at 50% -8%,#ffffff,transparent 70%),linear-gradient(180deg,#dbe4fa 0%,#ecf0fb 40%,#f6f7fc 75%)}
[data-tema=oled]{color-scheme:dark;
  --bg:#000000;--card:#0e0e10;--card2:#1a1a1d;--borda:#232327;--card-borda:#232327;--fg:#f5f5f7;--sub:#8e8e93;
  --acc:#f5f5f7;--acc-fundo:transparent;--acc-press:#c7c7cc;--on-acc:#f5f5f7;--acc-t:#f5f5f7;--rap:#9fb0ff;
  --heroi:transparent;--heroi-borda:#2a2a2e;--on-heroi:#f5f5f7;--heroi-linha:#2a2a2e;
  --pos:#7ee0ae;--pos-bg:#0f2219;--warn:#f5c98a;--warn-bg:#241d10;--neg:#ff8fa3;--neg-bg:#2a1218;
  --sombra:none;--folha:#000000;--btn-sombra:inset 0 0 0 1px #f5f5f7;
  --r-card:16px;--r-heroi:18px;
  --f-titulo:var(--f-ui);--t-estilo:normal;--t-peso:700;--t-tam:30px;--t-cor:#f5f5f7;--t-sombra:none;
  --ceu:#000000}

/* ---------- Base (copiada de src/html.js @ e21d9e4) ---------- */
*{box-sizing:border-box}
html{background:var(--bg);-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;color:var(--fg);font:16px/1.4 var(--f-ui);font-variant-numeric:tabular-nums;background:transparent;
  padding:calc(var(--c-safe-top) + 12px) max(16px,env(safe-area-inset-right)) calc(100px + var(--c-safe-bot)) max(16px,env(safe-area-inset-left));
  -webkit-tap-highlight-color:transparent}
button{font:inherit;color:inherit}
.oculto{display:none!important}
.pos{color:var(--pos)}.neg{color:var(--neg)}.warn{color:var(--warn)}.sub{color:var(--sub)}
.app{display:flex;flex-direction:column;gap:14px}

.cab{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:6px 10px}
h1{margin:0;min-width:0;max-width:100%;font-family:var(--f-titulo);font-style:var(--t-estilo);font-size:min(var(--t-tam),11vw);font-weight:var(--t-peso);line-height:1.1;letter-spacing:-.02em;color:var(--t-cor);text-shadow:var(--t-sombra);padding-right:.08em}
[data-tema=angel] h1{letter-spacing:0}
.meta{margin:0 0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px;font-size:12.5px;color:var(--sub);text-align:right}

.faixa{position:relative;overflow:hidden;isolation:isolate;padding:14px 16px 12px;border-radius:var(--r-heroi);background:var(--heroi);color:var(--on-heroi);border:1px solid var(--heroi-borda);box-shadow:var(--sombra)}
.f-tot{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.f-col{display:flex;flex-direction:column;gap:3px;min-width:0}
.f-col+.f-col{padding-left:14px;border-left:1px solid var(--heroi-linha)}
.f-rot{font-size:12px;font-weight:600;opacity:.8;text-transform:uppercase;letter-spacing:.06em}
.f-num{font-size:30px;font-weight:800;line-height:1.1;letter-spacing:-.02em}
.f-var{font-size:13px;font-weight:600;opacity:.92}
.f-var.vazio{font-weight:500;opacity:.7}

.inv-barra{display:flex;align-items:center;gap:10px}
.inv-n{margin-left:auto;font-size:13px;color:var(--sub);text-align:right}
.chip{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border:1px solid var(--borda);border-radius:999px;background:var(--card);color:var(--fg);font-size:14px;font-weight:600;-webkit-user-select:none;user-select:none;cursor:pointer}
.chip small{font-size:12.5px;font-weight:600;color:var(--sub)}
.chip:active{background:var(--acc-press);color:var(--on-acc)}
.f-alerta{flex:none;width:26px;height:26px;padding:0;border:0;border-radius:50%;background:var(--warn-bg);color:var(--warn);font-size:13px;font-weight:800;line-height:26px;text-align:center}
.inv-avisos{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border-radius:12px;background:var(--warn-bg);color:var(--fg);font-size:13px;line-height:1.35}
.inv-avisos p{margin:0}

.tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:10px;font-size:12px;font-weight:700;line-height:1.35}
.tag.neg{background:var(--neg-bg);color:var(--neg)}
.tag.warn{background:var(--warn-bg);color:var(--warn)}
.tag.sub{background:var(--card2);color:var(--sub)}

/* Vitrine (v7.2: quadro 1,6 com a foto ampliada 1,42x e o nome numa linha). */
.inv-lista{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.vit{display:flex;flex-direction:column;align-items:stretch;padding:0;border-radius:var(--r-card);background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden;text-align:left;cursor:pointer}
.vit:active{filter:brightness(.97)}
.vit-ft{position:relative;display:block;aspect-ratio:1.6;overflow:hidden;background:radial-gradient(75% 70% at 50% 45%,rgba(255,255,255,.16),transparent 72%),var(--card2)}
.vit-ft img{display:block;width:100%;height:100%;object-fit:contain;transform:scale(1.42);filter:drop-shadow(0 6px 8px rgba(0,0,0,.25))}
.vit.h .vit-ft img{opacity:.5;filter:saturate(.45)}
.vit-tags{position:absolute;left:8px;top:8px;right:8px;z-index:1;display:flex;flex-wrap:wrap;gap:4px}
.vit-in{display:flex;flex-direction:column;gap:4px;padding:8px 10px 10px;min-width:0}
.nome{font-size:14.5px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.par{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.par>span{display:flex;flex-direction:column;min-width:0}
.par small{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--sub)}
.par b{font-size:17px;font-weight:800;line-height:1.15;white-space:nowrap}
.par .r b{color:var(--rap)}
.par small.seta{display:block;font-size:11.5px;letter-spacing:0;text-transform:none}
.par small.seta.pos{color:var(--pos)}.par small.seta.neg{color:var(--neg)}
.dt{font-size:12.5px;color:var(--sub);line-height:1.35}
.vazio{margin:0;padding:14px 16px;border-radius:16px;background:var(--card);color:var(--sub);font-size:15px}
.vazio b{color:var(--fg)}
.esq{border-radius:var(--r-card);background:var(--card);opacity:.6;aspect-ratio:.95}
.btn{margin-top:10px;padding:11px 16px;border-radius:999px;border:1px solid var(--borda);background:var(--acc-fundo);color:var(--on-acc);font-size:15px;font-weight:700;box-shadow:var(--btn-sombra)}

/* Barra de baixo (v7.1: Mais · Plano · Avaliar · Anúncios · Inventário). */
.barra{position:fixed;left:0;right:0;bottom:0;z-index:20;padding:6px max(8px,env(safe-area-inset-right)) calc(8px + var(--c-safe-bot)) max(8px,env(safe-area-inset-left));background:var(--folha);border-top:1px solid var(--borda);box-shadow:0 -4px 18px rgba(0,0,0,.12)}
.abas{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:2px;padding:3px;border-radius:999px;background:var(--card2)}
.abas button{position:relative;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;min-width:0;padding:7px 2px 6px;border:0;border-radius:999px;background:none;font-size:11.5px;font-weight:700;line-height:1.1;color:var(--sub)}
.abas svg{display:block;width:24px;height:24px;fill:currentColor}
.abas button.on{background:var(--acc-fundo);color:var(--on-acc);box-shadow:var(--btn-sombra)}
.abas button.off{opacity:.38}

/* Folhas (item, Ordem, Mais, Diagnóstico). */
.fundo{position:fixed;top:0;left:0;right:0;bottom:0;z-index:30;background:rgba(0,0,0,.4)}
.folha{position:fixed;left:8px;right:8px;bottom:calc(8px + var(--c-safe-bot));z-index:31;max-height:80vh;overflow-y:auto;background:var(--folha);border:1px solid var(--card-borda);border-radius:var(--r-card);box-shadow:0 8px 30px rgba(0,0,0,.25)}
.folha p{margin:0;padding:14px 16px;text-align:center;font-size:14px;color:var(--sub);border-bottom:1px solid var(--borda)}
.folha p b{display:block;margin-bottom:2px;color:var(--fg);font-size:16px}
.folha button{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;padding:16px 18px;border:0;border-bottom:1px solid var(--borda);background:none;color:var(--acc-t);font-size:16.5px;font-weight:600;text-align:left}
.folha button small{color:var(--sub);font-size:13px;font-weight:600}
.folha button.ok small{color:var(--acc-t);font-weight:800}
.folha button.fechar{justify-content:center;font-weight:800;border-bottom:0}
.folha .dg{padding:12px 16px;font-size:13px;color:var(--sub);text-align:left;border-bottom:1px solid var(--borda)}
.folha .dg div{padding:3px 0;overflow-wrap:anywhere}
.folha .dg b{color:var(--fg);font-weight:600}

/* Céu fixo atrás de tudo. */
.ceu{position:fixed;top:0;left:0;right:0;bottom:0;z-index:-1;overflow:hidden;pointer-events:none;background:var(--ceu)}
.ceu span{position:absolute;display:none}

/* ---------- Angel Core: detalhes (copiados de src/temas.js @ e21d9e4) ---------- */
[data-tema=angel] .abas button.on::after{content:"";position:absolute;top:0;bottom:0;left:0;width:38%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,236,250,.85) 45%,rgba(220,238,255,.8) 55%,transparent);transform:translateX(-160%) skewX(-18deg);animation:thPerola 5.5s ease-in-out -2.6s infinite}
[data-tema=angel] .chip{background:linear-gradient(180deg,#ffffff,#f2f3fa);border-color:#dde1ef}
[data-tema=angel] .vit{outline:1px solid #e3e6f2;outline-offset:3px}
[data-tema=angel] .faixa{padding-top:32px}
[data-tema=angel] .faixa::after{content:"";position:absolute;left:50%;top:6px;width:120px;height:24px;transform:translateX(-50%);pointer-events:none;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 24'%3E%3Cg fill='%23ffffff' stroke='%23aeb6d4' stroke-width='.8' stroke-linejoin='round'%3E%3Cpath d='M50 15 C42 6 26 3 8 6 C16 9 13 11 6 12 C15 14 12 16 8 18 C22 19 38 18 50 15Z'/%3E%3Cpath d='M70 15 C78 6 94 3 112 6 C104 9 107 11 114 12 C105 14 108 16 112 18 C98 19 82 18 70 15Z'/%3E%3C/g%3E%3Cellipse cx='60' cy='9' rx='9' ry='3.2' fill='none' stroke='%23c4cbe2' stroke-width='1.8'/%3E%3Cellipse cx='60' cy='9' rx='9' ry='3.2' fill='none' stroke='%23ffffff' stroke-width='.7'/%3E%3Ccircle cx='60' cy='17' r='1.6' fill='%23aeb6d4'/%3E%3C/svg%3E") center/contain no-repeat}
[data-tema=angel] .ceu span{display:block}
[data-tema=angel] .ceu .k1{top:-10%;left:-30%;right:-30%;height:85%;opacity:.7;
  background:repeating-conic-gradient(from 150deg at 50% -12%,rgba(255,255,255,0) 0deg,rgba(255,255,255,.75) 3deg,rgba(255,255,255,0) 7deg,rgba(255,255,255,0) 14deg);
  -webkit-mask-image:linear-gradient(#000,transparent 80%);mask-image:linear-gradient(#000,transparent 80%);animation:thRaios 7s ease-in-out infinite alternate}
[data-tema=angel] .ceu :is(.k2,.k3){left:0;width:calc(100% + 600px);height:180px;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='180'%3E%3Cg fill='white' fill-opacity='.9'%3E%3Cellipse cx='100' cy='120' rx='90' ry='26'/%3E%3Cellipse cx='140' cy='98' rx='50' ry='34'/%3E%3Cellipse cx='80' cy='104' rx='36' ry='24'/%3E%3Cellipse cx='420' cy='70' rx='70' ry='20'/%3E%3Cellipse cx='450' cy='54' rx='36' ry='24'/%3E%3Cellipse cx='395' cy='60' rx='24' ry='16'/%3E%3C/g%3E%3C/svg%3E") 0 0/600px 180px repeat-x}
[data-tema=angel] .ceu .k2{top:34%;opacity:.9;animation:thNuvem 95s linear infinite}
[data-tema=angel] .ceu .k3{bottom:-30px;animation:thNuvem 140s linear -40s infinite reverse}
[data-tema=angel] .ceu .k4{left:0;right:0;top:-400px;height:calc(100% + 400px);animation:thCai 28s linear infinite;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='400'%3E%3Cg fill='white' stroke='%23b9c1de' stroke-width='.9'%3E%3Cpath transform='translate(40 40) rotate(25)' d='M8 0 Q16 12 11 30 L8 40 L5 30 Q0 12 8 0Z'/%3E%3Cpath transform='translate(170 160) rotate(-35) scale(.8)' d='M8 0 Q16 12 11 30 L8 40 L5 30 Q0 12 8 0Z'/%3E%3Cpath transform='translate(90 290) rotate(60) scale(.65)' d='M8 0 Q16 12 11 30 L8 40 L5 30 Q0 12 8 0Z'/%3E%3C/g%3E%3C/svg%3E") 0 0/240px 400px}
[data-tema=angel] .ceu .k5{top:0;left:0;right:0;bottom:0;animation:thPisca 3.2s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='220'%3E%3Cg fill='%23aab5e0'%3E%3Cpath d='M30 30 l1.6 5.4 5.4 1.6 -5.4 1.6 -1.6 5.4 -1.6 -5.4 -5.4 -1.6 5.4 -1.6z'/%3E%3Cpath d='M140 120 l1.2 4 4 1.2 -4 1.2 -1.2 4 -1.2 -4 -4 -1.2 4 -1.2z'/%3E%3Ccircle cx='90' cy='190' r='1.3'/%3E%3Ccircle cx='160' cy='40' r='1'/%3E%3C/g%3E%3C/svg%3E") 0 0/180px 220px}

/* ---------- OLED: só contorno, pixels piscando (copiado de src/temas.js @ e21d9e4) ---------- */
[data-tema=oled] .chip{background:transparent;border-color:#2a2a2e}
[data-tema=oled] .vit{background:transparent;border-color:#1c1c1f}
[data-tema=oled] .faixa{background:transparent;border-color:#2a2a2e}
[data-tema=oled] .abas{background:transparent;border:1px solid #232327}
[data-tema=oled] .abas button.on{background:transparent;color:var(--acc-t);box-shadow:inset 0 0 0 1px var(--acc)}
[data-tema=oled] .btn{background:transparent;color:var(--acc-t);border-color:var(--acc);box-shadow:none}
[data-tema=oled] .fundo{background:rgba(0,0,0,.6)}
[data-tema=oled] .folha{border-color:#2a2a2e}
[data-tema=oled] .ceu :is(.k1,.k2){display:block;top:0;left:0;right:0;bottom:0}
[data-tema=oled] .ceu .k1{animation:thPixel 3.2s steps(1) infinite;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cg fill='white' fill-opacity='.35'%3E%3Crect x='18' y='30' width='2' height='2'/%3E%3Crect x='96' y='12' width='1.5' height='1.5'/%3E%3Crect x='60' y='88' width='2' height='2'/%3E%3Crect x='120' y='118' width='1.5' height='1.5'/%3E%3C/g%3E%3C/svg%3E") 0 0/140px 140px}
[data-tema=oled] .ceu .k2{animation:thPixel 4.1s steps(1) -2s infinite;
  background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='190' height='170'%3E%3Cg fill='white' fill-opacity='.3'%3E%3Crect x='40' y='60' width='1.5' height='1.5'/%3E%3Crect x='150' y='30' width='2' height='2'/%3E%3Crect x='110' y='140' width='1.5' height='1.5'/%3E%3C/g%3E%3C/svg%3E") 0 0/190px 170px}

@keyframes thPerola{0%{transform:translateX(-160%) skewX(-18deg)}55%,100%{transform:translateX(360%) skewX(-18deg)}}
@keyframes thRaios{from{opacity:.45}to{opacity:.95}}
@keyframes thNuvem{from{transform:translateX(0)}to{transform:translateX(-600px)}}
@keyframes thCai{from{transform:translateY(0)}to{transform:translateY(400px)}}
@keyframes thPisca{from{opacity:.3}to{opacity:1}}
@keyframes thPixel{0%,100%{opacity:.25}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.ceu span,.abas button::after{animation:none!important}}
</style>
</head>
<body>
<div class="ceu"><span class="k1"></span><span class="k2"></span><span class="k3"></span><span class="k4"></span><span class="k5"></span></div>

<div class="app">
  <div class="cab">
    <h1>Inventário</h1>
    <p class="meta"><span id="m-conta">obsory</span><span id="m-hora">Carregando…</span></p>
  </div>
  <div class="faixa"><div class="f-tot">
    <div class="f-col"><span class="f-rot">Value</span><span class="f-num" id="t-v">…</span><span class="f-var vazio" id="t-sv">—</span></div>
    <div class="f-col"><span class="f-rot">RAP</span><span class="f-num" id="t-r">…</span><span class="f-var vazio" id="t-sr">—</span></div>
  </div></div>
  <div class="inv-barra">
    <button type="button" class="chip" id="b-ordem" aria-label="Escolher a ordem dos itens"><small>Ordem</small><span id="o-n">Value</span> ▾</button>
    <span class="inv-n" id="inv-n"></span>
    <button type="button" class="f-alerta oculto" id="b-avisos" aria-label="Ver avisos">!</button>
  </div>
  <div class="inv-avisos oculto" id="avisos"></div>
  <div class="inv-lista" id="lista"><div class="esq"></div><div class="esq"></div><div class="esq"></div><div class="esq"></div></div>
  <div id="erro" class="oculto"></div>
</div>

<div class="barra"><nav class="abas" id="abas"></nav></div>
<div class="fundo oculto" id="fundo"></div>
<div class="folha oculto" id="folha" role="dialog"></div>

<script>
(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  var $ = function (id) { return document.getElementById(id); };
  var dados = null;
  var ordem = 'value';

  // ---------- utilidades ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function num(n) { return Math.round(n).toLocaleString('pt-BR'); }
  function pct(p) { return Math.abs(p).toFixed(1).replace('.', ',') + '%'; }
  function hora(ms) {
    var d = new Date(ms);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function versao(v) { return !!(tg && tg.isVersionAtLeast && tg.isVersionAtLeast(v)); }
  function tentar(f) { try { f(); } catch (e) {} }
  function toque() { if (tg && tg.HapticFeedback && versao('6.1')) tentar(function () { tg.HapticFeedback.selectionChanged(); }); }

  // ---------- Telegram: tela cheia e cores ----------
  if (tg) {
    tentar(function () { tg.ready(); });
    tentar(function () { tg.expand(); });
    if (versao('8.0') && tg.requestFullscreen) tentar(function () { tg.requestFullscreen(); });
    // Rolar a lista não pode fechar o app.
    if (versao('7.7') && tg.disableVerticalSwipes) tentar(function () { tg.disableVerticalSwipes(); });
  }
  var CORES = { angel: { topo: '#e4ebfb', fundo: '#f6f7fc', baixo: '#ffffff' }, oled: { topo: '#000000', fundo: '#000000', baixo: '#000000' } };
  function aplicarTema(t, salvar) {
    if (t !== 'angel' && t !== 'oled') t = 'angel';
    document.documentElement.setAttribute('data-tema', t);
    var m = document.querySelector('meta[name="color-scheme"]');
    if (m) m.setAttribute('content', t === 'oled' ? 'dark' : 'light');
    if (tg) {
      var c = CORES[t];
      if (versao('6.1')) {
        tentar(function () { tg.setHeaderColor(c.topo); });
        tentar(function () { tg.setBackgroundColor(c.fundo); });
      }
      if (versao('7.10') && tg.setBottomBarColor) tentar(function () { tg.setBottomBarColor(c.baixo); });
    }
    try { localStorage.setItem('th-tema', t); } catch (e) {}
    if (salvar && tg && tg.CloudStorage && versao('6.9')) tentar(function () { tg.CloudStorage.setItem('tema', t); });
  }
  function temaAtual() { return document.documentElement.getAttribute('data-tema') || 'angel'; }
  aplicarTema(temaAtual(), false);
  if (tg && tg.CloudStorage && versao('6.9')) {
    tentar(function () {
      tg.CloudStorage.getItem('tema', function (err, v) { if (!err && v && v !== temaAtual()) aplicarTema(v, false); });
    });
  }

  // ---------- barra de baixo ----------
  var ICONES = {
    inv: 'M3 7l9-4 9 4v10l-9 4-9-4zM12 12.5L5.5 9.6v6L11 18zM18.5 9.6L12 12.5 13 18l5.5-2.4z',
    avaliar: 'M11 3h2v2l7 1.5v2L23 14h-8l3-5.5-5-1V19h4v2H7v-2h4V7.5l-5 1L9 14H1l3-5.5v-2L11 5z',
    anuncios: 'M4 9v6h4l9 5V4L8 9zM19 8.5a5 5 0 010 7z',
    plano: 'M3 20V14h5v6zM10 20V9h5v11zM17 20V4h4v16z',
    mais: 'M5 10a2 2 0 110 4 2 2 0 010-4zM12 10a2 2 0 110 4 2 2 0 010-4zM19 10a2 2 0 110 4 2 2 0 010-4z'
  };
  // [id, nome, fase em que chega] (0 e 1 = já funcionam)
  var ABAS = [['mais', 'Mais', 0], ['plano', 'Plano', 3], ['avaliar', 'Avaliar', 3], ['anuncios', 'Anúncios', 2], ['inv', 'Inventário', 1]];
  $('abas').innerHTML = ABAS.map(function (b) {
    return '<button type="button" data-a="' + b[0] + '" class="' + (b[0] === 'inv' ? 'on' : '') + (b[2] > 1 ? ' off' : '') + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="' + ICONES[b[0]] + '"/></svg>' + b[1] + '</button>';
  }).join('');
  $('abas').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    toque();
    var a = b.getAttribute('data-a');
    var def = ABAS.filter(function (x) { return x[0] === a; })[0];
    if (a === 'mais') folhaMais();
    else if (def && def[2] > 1) abrir('<p><b>' + def[1] + '</b>Chega na Fase ' + def[2] + ' da mudança para o Telegram.</p><button type="button" class="fechar">Ok</button>');
  });

  // ---------- folhas ----------
  var fundo = $('fundo'), folha = $('folha'), aoVoltar = null;
  function abrir(conteudo) {
    folha.innerHTML = conteudo;
    folha.classList.remove('oculto');
    fundo.classList.remove('oculto');
    folha.scrollTop = 0;
    if (tg && tg.BackButton && versao('6.1')) tentar(function () { tg.BackButton.show(); });
  }
  function fechar() {
    folha.classList.add('oculto');
    fundo.classList.add('oculto');
    if (tg && tg.BackButton && versao('6.1')) tentar(function () { tg.BackButton.hide(); });
  }
  fundo.addEventListener('click', fechar);
  if (tg && tg.BackButton && versao('6.1')) tentar(function () { tg.BackButton.onClick(fechar); });
  folha.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var acao = b.getAttribute('data-acao');
    if (!acao) { fechar(); return; }
    toque();
    var v = b.getAttribute('data-v');
    if (acao === 'ordem') { ordem = v; desenharLista(); fechar(); }
    else if (acao === 'tema') { aplicarTema(v, true); folhaMais(); }
    else if (acao === 'link') { if (tg && tg.openLink) tg.openLink(v); else window.open(v, '_blank'); }
    else if (acao === 'inicio') adicionarInicio();
    else if (acao === 'diag') folhaDiag();
    else if (acao === 'mais') folhaMais();
  });

  function folhaMais() {
    var t = temaAtual();
    abrir('<p>Mais</p>' +
      '<button type="button" data-acao="tema" data-v="angel" class="' + (t === 'angel' ? 'ok' : '') + '">Tema Angel Core<small>' + (t === 'angel' ? '✓' : '') + '</small></button>' +
      '<button type="button" data-acao="tema" data-v="oled" class="' + (t === 'oled' ? 'ok' : '') + '">Tema OLED<small>' + (t === 'oled' ? '✓' : '') + '</small></button>' +
      '<button type="button" data-acao="inicio">Adicionar à Tela de Início<small>＋</small></button>' +
      '<button type="button" data-acao="diag">Diagnóstico<small>' + (dados ? 'v' + esc(dados.diag.versao) : '') + '</small></button>' +
      '<button type="button" class="fechar">Fechar</button>');
  }

  // "Adicionar à Tela de Início" (Telegram 8.0+). Pode não existir no iPhone:
  // aí a folha diz isso e lembra do app Atalhos.
  function adicionarInicio() {
    var semRecurso = '<p><b>Não disponível aqui</b>O seu Telegram não oferece esse botão. Use o app Atalhos do iPhone com o link t.me/obsory_th_bot?startapp.</p><button type="button" data-acao="mais">Voltar</button>';
    if (!(tg && versao('8.0') && tg.addToHomeScreen)) { abrir(semRecurso); return; }
    var pedir = function () {
      tentar(function () { tg.addToHomeScreen(); });
      abrir('<p><b>Pedido enviado</b>Se o Telegram mostrar uma tela para confirmar, toque em Adicionar.</p><button type="button" data-acao="mais">Voltar</button>');
    };
    if (tg.checkHomeScreenStatus) {
      tentar(function () {
        tg.checkHomeScreenStatus(function (st) {
          if (st === 'unsupported') abrir(semRecurso);
          else if (st === 'added') abrir('<p><b>Já está na Tela de Início</b>O ícone do Trade Helper já foi adicionado.</p><button type="button" data-acao="mais">Voltar</button>');
          else pedir();
        });
      });
    } else pedir();
  }

  function folhaDiag() {
    var l = [];
    if (!dados) l.push('<div>Os dados ainda não chegaram.</div>');
    else {
      var d = dados.diag, ag = dados.agora;
      var min = function (ms) { var m = Math.round((ag - ms) / 60000); return m < 1 ? 'agora' : m < 120 ? 'há ' + m + ' min' : 'há ' + Math.round(m / 60) + ' h'; };
      l.push('<div><b>Nuvem</b> v' + esc(d.versao) + ' · resposta em ' + d.ms + ' ms</div>');
      l.push('<div><b>Catálogo</b> ' + num(d.catalogo.n) + ' itens · ' + min(d.catalogo.em) + ' · ' + esc(d.catalogo.origem === 'rolimons' ? "Rolimon's direto" : 'guardado') + '</div>');
      l.push('<div><b>24h</b> ' + (d.retrato ? 'retrato de ' + hora(d.retrato.em) + ' (' + d.retrato.itens + ' itens seus)' : 'sem retrato ainda (a seta aparece depois de ~24h)') + '</div>');
      l.push('<div><b>Fotos</b> ' + esc(d.fotos) + '</div>');
      l.push('<div><b>Vendas/Best</b> ' + d.linhas.prontas + ' de ' + d.linhas.total + ' itens' + (d.linhas.erros ? ' · ' + d.linhas.erros + ' com erro (' + esc(d.linhas.ultimoErro || '?') + ')' : '') + '</div>');
      l.push('<div><b>Telegram</b> ' + esc(tg ? tg.platform + ' · versão ' + tg.version : 'fora do Telegram') + '</div>');
    }
    abrir('<p>Diagnóstico</p><div class="dg">' + l.join('') + '</div><button type="button" data-acao="mais">Voltar</button>');
  }

  // ---------- Ordem ----------
  var NOMES_ORDEM = { value: 'Value', rap: 'RAP', vendas: 'Vendas' };
  $('b-ordem').addEventListener('click', function () {
    toque();
    abrir('<p>Ordem dos itens</p>' + ['value', 'rap', 'vendas'].map(function (k) {
      return '<button type="button" data-acao="ordem" data-v="' + k + '" class="' + (k === ordem ? 'ok' : '') + '">' + NOMES_ORDEM[k] + '<small>' + (k === ordem ? '✓' : '') + '</small></button>';
    }).join('') + '<button type="button" class="fechar">Fechar</button>');
  });
  $('b-avisos').addEventListener('click', function () { $('avisos').classList.toggle('oculto'); });

  // ---------- toque no item ----------
  $('lista').addEventListener('click', function (e) {
    var c = e.target.closest('.vit'); if (!c || !dados) return;
    toque();
    var i = dados.itens[Number(c.getAttribute('data-k'))]; if (!i) return;
    var linha = (i.v != null ? 'Value ' + num(i.v) + ' · ' : 'Sem value · ') + 'RAP ' + num(i.r) + (i.h ? ' · em hold' : '');
    abrir('<p><b>' + esc(i.n) + '</b>' + linha + '</p>' +
      '<button type="button" data-acao="link" data-v="https://www.rolimons.com/item/' + esc(i.id) + '">Abrir no Rolimon's<small>↗</small></button>' +
      '<button type="button" data-acao="link" data-v="https://www.roblox.com/catalog/' + esc(i.id) + '">Abrir no Roblox<small>↗</small></button>' +
      '<button type="button" class="fechar">Fechar</button>');
  });

  // ---------- desenho ----------
  function seta(p) {
    if (p == null || Math.abs(p) < dados.lim) return '';
    return '<small class="seta ' + (p > 0 ? 'pos' : 'neg') + '">' + (p > 0 ? '▲ ' : '▼ ') + pct(p) + '</small>';
  }
  function varTotal(el, p) {
    if (!dados.per || p == null) { el.className = 'f-var vazio'; el.textContent = '—'; return; }
    el.className = 'f-var';
    el.textContent = (p > 0 ? '▲ ' : p < 0 ? '▼ ' : '') + pct(p) + ' ' + dados.per;
  }
  function cartao(i, k) {
    var dt = [];
    if (i.dem) dt.push('<span class="' + esc(i.dc) + '">' + esc(i.dem) + '</span>');
    if (i.vt) dt.push('<span class="' + esc(i.vc) + '">' + esc(i.vt) + '</span>');
    if (i.bt) dt.push('Best ' + esc(i.bt));
    if (i.x) dt.push(esc(i.x));
    var tags = (i.h ? '<span class="tag warn">hold</span>' : '') +
      (i.tags || []).map(function (t) { return '<span class="tag ' + esc(t[1]) + '">' + esc(t[0]) + '</span>'; }).join('');
    return '<div class="vit' + (i.h ? ' h' : '') + '" data-k="' + k + '" role="button" tabindex="0">' +
      '<span class="vit-ft">' + (i.m ? '<img src="' + esc(i.m) + '" alt="" loading="lazy">' : '') +
      (tags ? '<span class="vit-tags">' + tags + '</span>' : '') + '</span>' +
      '<span class="vit-in"><span class="nome">' + esc(i.n) + '</span>' +
      '<span class="par"><span><small>Value</small><b>' + (i.v != null ? seta(i.sv) + num(i.v) : '<span class="sub">—</span>') + '</b></span>' +
      '<span class="r"><small>RAP</small><b>' + seta(i.sr) + num(i.r) + '</b></span></span>' +
      (dt.length ? '<span class="dt">' + dt.join(' · ') + '</span>' : '') + '</span></div>';
  }
  function desenharLista() {
    $('o-n').textContent = NOMES_ORDEM[ordem];
    var idx = dados.itens.map(function (x, k) { return k; });
    var campo = ordem === 'rap' ? 'r' : ordem === 'vendas' ? 'vd' : 'b';
    idx.sort(function (a, b) { return dados.itens[b][campo] - dados.itens[a][campo] || dados.itens[b].b - dados.itens[a].b; });
    $('lista').innerHTML = idx.map(function (k) { return cartao(dados.itens[k], k); }).join('');
    if (!dados.itens.length) $('lista').innerHTML = '';
    $('erro').className = dados.itens.length ? 'oculto' : 'vazio';
    if (!dados.itens.length) $('erro').textContent = 'Nenhum item.';
  }
  function desenhar() {
    var t = dados.totais;
    $('m-conta').textContent = dados.conta;
    $('m-hora').textContent = 'Atualizado ' + hora(dados.agora);
    $('t-v').textContent = num(t.value);
    $('t-r').textContent = num(t.rap);
    varTotal($('t-sv'), t.sv);
    varTotal($('t-sr'), t.sr);
    $('inv-n').textContent = t.qtd + (t.qtd === 1 ? ' item' : ' itens') + (t.holds ? ' · ' + t.holds + ' em hold' : '');
    var temAvisos = dados.avisos && dados.avisos.length;
    $('b-avisos').classList.toggle('oculto', !temAvisos);
    $('avisos').innerHTML = temAvisos ? dados.avisos.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') : '';
    desenharLista();
  }

  function falhou(titulo, texto, deNovo) {
    $('lista').innerHTML = '';
    $('m-hora').textContent = '';
    var e = $('erro');
    e.className = 'vazio';
    e.innerHTML = '<b>' + esc(titulo) + '</b><br>' + esc(texto) + (deNovo ? '<br><button type="button" class="btn" id="b-denovo">Tentar de novo</button>' : '');
    var b = $('b-denovo');
    if (b) b.addEventListener('click', function () { e.className = 'oculto'; carregar(); });
  }

  // ---------- dados ----------
  function carregar() {
    if (!tg || !tg.initData) { falhou('Abra pelo Telegram', 'Esta tela só funciona dentro do bot: toque em Painel ou mande /app.', false); return; }
    $('m-hora').textContent = 'Carregando…';
    fetch('/api/inventario', { headers: { Authorization: 'tma ' + tg.initData } })
      .then(function (r) { return r.json().then(function (j) { return { st: r.status, j: j }; }); })
      .then(function (x) {
        if (!x.j || !x.j.ok) { falhou('Não deu para carregar (' + x.st + ')', (x.j && x.j.erro) || 'sem detalhe', true); return; }
        dados = x.j;
        desenhar();
      })
      .catch(function (e) { falhou('Sem resposta da nuvem', String(e && e.message ? e.message : e), true); });
  }
  carregar();
})();
</script>
</body>
</html>`;

export function paginaApp() {
  return html(PAGINA);
}
