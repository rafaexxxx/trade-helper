// Temas do painel. v5.3 (protótipo M2): cada tema tem visual fixo; sem tema
// escolhido, o painel segue o iPhone (Azul no claro, Dark no escuro). v5.3.1: a
// escolha fica no arquivo de ajustes (ponte PONTE + 'tema?t=<id>').
// v6.4: tudo de tema mora aqui (antes ficava no html.js) e entram os
// "Temáticos" (protótipo N6): além das cores, mudam a FORMA de botões, chips e
// cartões, o fundo animado e a reação ao toque. Regras de desempenho do N6:
// animação de tela cheia só com transform/opacity e sem backdrop-filter sobre
// fundo animado.
// v6.5 (protótipo P3): os temas antigos também viram temáticos (CSS_TODOS),
// com as cores de sempre. Sem tema escolhido (seguindo o iPhone), o Azul/Dark
// continuam simples.
// v6.19 (protótipos dos lotes 1 a 4 + rodada de botões): saem Rosinha, Vermelho,
// Chromecore, MetalHeart, Veludo e Fita Perdida (com os sustos e a camada de fita);
// quem estava num deles vai para o parecido (ANTIGOS). Entram 9 temas no grupo
// "Novos", as melhorias da Galáxia, Noir, Abissal, Obsidiana, Acid, Aero, Dark Aero,
// Metro, Soft Club e Gatinhos, e os botões novos dos 22 (CSS_NOVOS).

function esc(s) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => mapa[c]);
}

// g: c = Clássicos, e = Estéticos, t = Temáticos, n = Novos (v6.19); e: esquema
// (claro/escuro); f: fonte do título (parâmetro family do Google Fonts; pode juntar duas famílias).
const TEMAS = [
  { id: 'azul', nome: 'Azul', g: 'c', e: 'light' },
  { id: 'dark', nome: 'Dark', g: 'c', e: 'dark' },
  { id: 'oled', nome: 'OLED', g: 'c', e: 'dark' },
  { id: 'galaxia', nome: 'Galáxia', g: 'e', e: 'dark' },
  { id: 'frutiger', nome: 'Frutiger Aero', g: 'e', e: 'light' },
  { id: 'softclub', nome: 'Gen X Soft Club', g: 'e', e: 'dark', f: 'Syncopate:wght@700' },
  { id: 'gatinhos', nome: 'Gatinhos', g: 'e', e: 'light', f: 'Fredoka:wght@600' },
  { id: 'darkaero', nome: 'Dark Aero', g: 'e', e: 'dark', f: 'Exo+2:ital,wght@1,700' },
  { id: 'metro', nome: 'Frutiger Metro', g: 'e', e: 'light', f: 'Righteous' },
  { id: 'abissal', nome: 'Abissal', g: 't', e: 'dark', f: 'Comfortaa:wght@700' },
  { id: 'noir', nome: 'Noir', g: 't', e: 'dark', f: 'Bodoni+Moda:ital,opsz,wght@1,6..96,700' },
  { id: 'obsidiana', nome: 'Obsidiana', g: 't', e: 'dark', f: 'Cinzel:wght@700' },
  { id: 'acid', nome: 'Acid', g: 't', e: 'light', f: 'Climate+Crisis:YEAR@1979..2050' },
  { id: 'angel', nome: 'Angel Core', g: 'n', e: 'light', f: 'Cormorant+Garamond:ital,wght@1,600' },
  { id: 'archangel', nome: 'Archangel', g: 'n', e: 'dark', f: 'Cormorant+Garamond:ital,wght@1,600' },
  { id: 'gotico', nome: 'Romantic Gothic', g: 'n', e: 'dark', f: 'Pinyon+Script&family=Cormorant+Garamond:wght@600' },
  { id: 'luar', nome: 'Moonlight', g: 'n', e: 'dark', f: 'Italiana' },
  { id: 'floresta', nome: 'Floresta Escura', g: 'n', e: 'dark', f: 'Spectral+SC:wght@500' },
  { id: 'barbie', nome: 'Barbiecore', g: 'n', e: 'light', f: 'Yellowtail' },
  { id: 'dreamcore', nome: 'Dreamcore', g: 'n', e: 'light', f: 'Poiret+One' },
  { id: 'elixir', nome: 'Elixir', g: 'n', e: 'dark', f: 'Syne:wght@800' },
  { id: 'zen', nome: 'Zen', g: 'n', e: 'light', f: 'Shippori+Mincho:wght@600' },
];

// v6.19: temas que saíram -> o parecido que entra no lugar (escolha do usuário).
const ANTIGOS = { veludo: 'gotico', rosinha: 'barbie', chromecore: 'archangel', metalheart: 'obsidiana', horror: 'noir', vermelho: 'dark' };

// v5.3.1: confere se um id de tema existe (usado pela ponte que grava o tema).
function temaValido(id) {
  return TEMAS.some((t) => t.id === id);
}

// v6.19: o tema que vale para um id salvo: ele mesmo, o parecido (se saiu) ou nenhum.
function temaAtual(id) {
  if (temaValido(id)) return id;
  if (id && Object.prototype.hasOwnProperty.call(ANTIGOS, id)) return ANTIGOS[id];
  return null;
}

// Tokens do Dark (usados pelo tema Dark e pelo iPhone escuro sem tema escolhido).
const TOKENS_DARK = `color-scheme:dark;
  --topo:#1f2633;--bg:#15181d;--card:#22262e;--card2:#2c313b;--borda:#363c48;--fg:#eef1f6;--sub:#a3abb9;
  --acc:#173b82;--acc-press:#102b61;--acc-t:#8fa8ff;--rap:#8fa8ff;--heroi:#173b82;
  --pos:#8fe0b8;--pos-bg:#1d3530;--warn:#f5c98a;--warn-bg:#3a3122;--neg:#ff9db0;--neg-bg:#3d2329;
  --on-status:#15181d;--dou-bg:#1f2a44;--rec-bg:#1c2e2a;--sombra:none;
  --c2:#7a2a66;--c2-press:#5c1f4d;--c2-t:#f0a6dc;--c2-bg:#3a2235;--c2-heroi:#7a2a66;`;

// Os blocos usam [data-tema=x] (e não só :root) para que as miniaturas da
// folha de temas também ganhem as cores do seu tema.
const CSS_TEMAS = `
:root,[data-tema]{
  --body-fundo:linear-gradient(180deg,var(--topo),var(--bg) 640px) no-repeat,var(--bg);
  --ceu:none;--ceu-giro:none;--estrelas:none;--estrelas-tam:auto;--estrelas2:none;--estrelas2-tam:auto;
  --chao:none;--chao-tam:auto;--chao-h:0px;
  --vidro:none;--card-borda:transparent;--heroi-borda:transparent;--c2-heroi-borda:transparent;
  --on-acc:#ffffff;--c2-on:#ffffff;--on-heroi:#ffffff;--c2-on-heroi:#ffffff;--heroi-linha:rgba(255,255,255,.2);--heroi-aviso:#f5c98a;
  --acc-fundo:var(--acc);--c2-fundo:var(--c2);--folha:var(--card);--estrelas-op:1;
  --giro-l:-45%;--giro-t:2%;--giro-t-mini:2%;--giro-h:44%;--giro-r:-24deg;--giro-pos:0 0;--giro-tam:auto;--giro-tam-mini:auto;
  --f-ui:"Montserrat",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  --f-titulo:var(--f-ui);--t-estilo:normal;--t-peso:700;--t-tam:30px;--t-sombra:none;
  --cab:var(--card2);--linha:var(--borda);--link:var(--acc-t);--rotulo:var(--sub);
}
:root,[data-tema=azul]{color-scheme:light;
  --topo:#eaf0fd;--bg:#f4f6fa;--card:#ffffff;--card2:#edf1f8;--borda:#dde3ee;--fg:#1b2333;--sub:#667085;
  --acc:#173b82;--acc-press:#102b61;--acc-t:#173b82;--rap:#173b82;--heroi:#173b82;
  --pos:#1f8a5b;--pos-bg:#e2f3ea;--warn:#a8660f;--warn-bg:#fbf0dd;--neg:#c23a5c;--neg-bg:#fbe4ea;
  --on-status:#ffffff;--dou-bg:#f0f4ff;--rec-bg:#eef8f3;
  --sombra:0 1px 2px rgba(16,24,40,.06),0 6px 18px rgba(16,24,40,.05);
  --c2:#7a2a66;--c2-press:#5c1f4d;--c2-t:#7a2a66;--c2-bg:#f7e9f3;--c2-heroi:#7a2a66}
@media (prefers-color-scheme: dark){:root:not([data-tema]){${TOKENS_DARK}}}
[data-tema=dark]{${TOKENS_DARK}}
[data-tema=oled]{color-scheme:dark;
  --topo:#000000;--bg:#000000;--card:#0e0e10;--card2:#1a1a1d;--borda:#232327;--fg:#f5f5f7;--sub:#8e8e93;
  --acc:#f5f5f7;--acc-press:#c7c7cc;--on-acc:#000000;--acc-t:#f5f5f7;--rap:#9fb0ff;--heroi:#0e0e10;
  --card-borda:#232327;--heroi-borda:#2a2a2e;
  --pos:#7ee0ae;--pos-bg:#0f2219;--warn:#f5c98a;--warn-bg:#241d10;--neg:#ff8fa3;--neg-bg:#2a1218;
  --on-status:#000000;--dou-bg:#111116;--rec-bg:#0c1712;--sombra:none;
  --c2:#f0a6dc;--c2-press:#d98cc4;--c2-on:#000000;--c2-t:#f0a6dc;--c2-bg:#24101f;--c2-heroi:#1c0b18;--c2-heroi-borda:#3a1733}
[data-tema=galaxia]{color-scheme:dark;--body-fundo:transparent;
  --topo:#140828;--bg:#0a0418;
  --card:rgba(38,18,78,.42);--card2:rgba(84,48,150,.32);--borda:rgba(210,180,255,.16);--fg:#f5efff;--sub:#bba9e0;
  --acc:#8b5cff;--acc-fundo:linear-gradient(135deg,#7a3cff,#b84fd6);--acc-press:#6a3ad6;--acc-t:#d0bbff;--rap:#8fe3ff;
  --heroi:linear-gradient(135deg,rgba(122,60,255,.55),rgba(184,79,214,.42));--heroi-borda:rgba(225,195,255,.32);--card-borda:rgba(210,180,255,.18);
  --pos:#8fe0b8;--pos-bg:rgba(40,120,90,.3);--warn:#f5c98a;--warn-bg:rgba(150,110,40,.3);--neg:#ff9db0;--neg-bg:rgba(160,40,80,.32);
  --on-status:#0a0418;--dou-bg:rgba(122,60,255,.16);--rec-bg:rgba(60,180,140,.12);--sombra:0 8px 30px rgba(10,0,30,.35);
  --vidro:blur(16px) saturate(150%);--folha:rgba(28,12,58,.88);
  --ceu:radial-gradient(circle at 12% 72%,rgba(190,60,210,.38),transparent 38%),radial-gradient(circle at 88% 58%,rgba(80,60,230,.38),transparent 42%),radial-gradient(circle at 60% 96%,rgba(160,50,190,.32),transparent 40%),radial-gradient(circle at 30% 40%,rgba(90,40,180,.25),transparent 45%),linear-gradient(180deg,#160a30,#0a0418 70%);
  --ceu-giro:radial-gradient(ellipse 15% 8% at 50% 50%,rgba(255,244,255,.97),rgba(240,190,255,.6) 45%,transparent 100%),radial-gradient(ellipse 40% 15% at 50% 50%,rgba(205,140,255,.55),transparent 75%),radial-gradient(ellipse 70% 26% at 48% 52%,rgba(130,70,240,.42),transparent 72%),radial-gradient(ellipse 30% 20% at 30% 46%,rgba(230,110,220,.3),transparent 70%),radial-gradient(ellipse 30% 20% at 70% 56%,rgba(110,120,255,.3),transparent 70%);
  --estrelas:radial-gradient(1px 1px at 14px 22px,#fff,transparent),radial-gradient(1px 1px at 92px 64px,#ffffffcc,transparent),radial-gradient(1.5px 1.5px at 150px 30px,#ecdcff,transparent),radial-gradient(1px 1px at 46px 128px,#ffffffaa,transparent),radial-gradient(1px 1px at 182px 150px,#d6f4ff,transparent),radial-gradient(1px 1px at 120px 180px,#ffffff99,transparent);
  --estrelas-tam:200px 200px;
  --estrelas2:radial-gradient(2px 2px at 40px 60px,#fff,transparent),radial-gradient(1.6px 1.6px at 210px 170px,#f0d8ff,transparent),radial-gradient(2px 2px at 150px 260px,#e0f6ff,transparent);
  --estrelas2-tam:260px 300px;
  --c2:#d63a9a;--c2-fundo:linear-gradient(135deg,#b8327f,#e0609f);--c2-press:#a82a78;--c2-t:#ffa6d8;--c2-bg:rgba(184,50,127,.24);
  --c2-heroi:linear-gradient(135deg,rgba(184,50,127,.62),rgba(224,96,159,.45));--c2-heroi-borda:rgba(255,190,225,.35)}
[data-tema=frutiger]{color-scheme:light;--body-fundo:transparent;
  --topo:#9fdcff;--bg:#e6f7ff;
  --card:rgba(255,255,255,.58);--card2:rgba(255,255,255,.42);--borda:rgba(255,255,255,.9);--fg:#0b2a44;--sub:#3f6580;
  --acc:#0a7cc4;--acc-fundo:linear-gradient(180deg,#7fdcff 0%,#22a3e6 48%,#0a74bd 52%,#0a6aae 100%);--acc-press:#075a94;--acc-t:#0868a8;--rap:#0868a8;
  --heroi:linear-gradient(180deg,rgba(255,255,255,.5) 0%,rgba(255,255,255,.1) 48%,rgba(255,255,255,0) 50%),linear-gradient(180deg,#46c3f7,#0b70bb);
  --heroi-borda:rgba(255,255,255,.9);--card-borda:rgba(255,255,255,.9);
  --pos:#1b7f3a;--pos-bg:rgba(210,245,200,.88);--warn:#9a5c08;--warn-bg:rgba(255,240,210,.9);--neg:#c0303a;--neg-bg:rgba(255,225,228,.9);
  --on-status:#ffffff;--dou-bg:rgba(225,242,255,.6);--rec-bg:rgba(225,250,225,.6);
  --sombra:0 4px 16px rgba(10,80,140,.16),inset 0 1px 0 rgba(255,255,255,.95);
  --vidro:blur(12px) saturate(160%);--folha:rgba(240,250,255,.94);
  --ceu:radial-gradient(circle at 86% 5%,rgba(255,255,255,.95),rgba(255,255,255,0) 22%),radial-gradient(circle at 18% 30%,rgba(255,255,255,0) 0 16px,rgba(255,255,255,.8) 17px 18px,rgba(255,255,255,0) 21px),radial-gradient(circle at 82% 44%,rgba(255,255,255,0) 0 24px,rgba(255,255,255,.75) 25px 26px,rgba(255,255,255,0) 30px),radial-gradient(circle at 9% 62%,rgba(255,255,255,0) 0 10px,rgba(255,255,255,.8) 11px 12px,rgba(255,255,255,0) 15px),radial-gradient(circle at 70% 74%,rgba(255,255,255,0) 0 14px,rgba(255,255,255,.7) 15px 16px,rgba(255,255,255,0) 19px),radial-gradient(ellipse 80% 16% at 25% 102%,#9be36f 0,#4fb23a 70%,transparent 71%),radial-gradient(ellipse 70% 13% at 85% 103%,#7fd65a 0,#3d9e2e 70%,transparent 71%),linear-gradient(180deg,#6ccfff 0%,#bfeaff 40%,#eefbff 78%,#e2f8e0 100%);
  --c2:#8a2f74;--c2-fundo:linear-gradient(180deg,#e08cc8 0%,#b0479a 48%,#8a2f74 52%,#7a2a66 100%);--c2-press:#5c1f4d;--c2-t:#7a2a66;--c2-bg:rgba(250,232,245,.82);
  --c2-heroi:linear-gradient(180deg,rgba(255,255,255,.45) 0%,rgba(255,255,255,.08) 48%,rgba(255,255,255,0) 50%),linear-gradient(180deg,#c25aa8,#7a2a66);--c2-heroi-borda:rgba(255,255,255,.9)}
[data-tema=softclub]{color-scheme:dark;--body-fundo:transparent;
  --topo:#0b2226;--bg:#061214;
  --card:rgba(10,32,36,.72);--card2:rgba(30,64,70,.6);--borda:rgba(130,220,215,.16);--fg:#e2f6f5;--sub:#86aeb0;
  --acc:#5fd3cc;--on-acc:#062022;--acc-press:#46b3ad;--acc-t:#7fe3dc;--rap:#c9d6dc;
  --heroi:linear-gradient(160deg,#b3efe9 0%,#6cc9c4 60%,#3d9fa3 100%);--on-heroi:#062022;--heroi-linha:rgba(6,32,34,.2);--heroi-aviso:#8a3d00;--heroi-borda:rgba(200,250,245,.6);--card-borda:rgba(130,220,215,.2);
  --pos:#a6f08a;--pos-bg:rgba(60,120,40,.3);--warn:#f5c98a;--warn-bg:rgba(130,95,30,.3);--neg:#ff9db0;--neg-bg:rgba(140,40,70,.32);
  --on-status:#061214;--dou-bg:rgba(95,211,204,.1);--rec-bg:rgba(166,240,138,.08);--sombra:0 10px 30px rgba(0,0,0,.4);
  --vidro:blur(12px) saturate(130%);--folha:rgba(8,26,30,.94);
  --f-titulo:"Syncopate",var(--f-ui);--t-peso:700;--t-tam:24px;
  --ceu:linear-gradient(170deg,transparent 30%,rgba(140,230,225,.08) 34%,transparent 40%),linear-gradient(160deg,transparent 45%,rgba(140,230,225,.07) 50%,transparent 56%),linear-gradient(175deg,transparent 58%,rgba(140,230,225,.06) 62%,transparent 68%),radial-gradient(ellipse 80% 40% at 50% 0%,rgba(110,210,205,.3),transparent 70%),repeating-radial-gradient(ellipse at 40% 110%,transparent 0 14px,rgba(120,220,215,.05) 15px 17px,transparent 18px 30px),linear-gradient(180deg,#0e2c31,#061214 70%);
  --c2:#c7d2da;--c2-on:#10181c;--c2-press:#a3b0b9;--c2-t:#dfe7ec;--c2-bg:rgba(200,210,220,.1);
  --c2-heroi:linear-gradient(160deg,#eef3f6 0%,#b9c6cf 55%,#8c9ba6 100%);--c2-heroi-borda:rgba(255,255,255,.6);--c2-on-heroi:#10181c}
[data-tema=gatinhos]{color-scheme:light;--body-fundo:transparent;
  --topo:#ffd9e8;--bg:#fff0f6;
  --card:#ffffff;--card2:#ffe8f1;--borda:#f6cfe0;--fg:#3a2230;--sub:#8a6a7a;
  --acc:#e0447f;--acc-fundo:linear-gradient(180deg,#ff8ab6,#e0447f);--acc-press:#c2336a;--acc-t:#c8336d;--rap:#8a5cd6;
  --heroi:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 40'><path d='M6 16 L10 2 L20 11 Z M42 16 L38 2 L28 11 Z' fill='white' fill-opacity='.35'/><ellipse cx='24' cy='23' rx='20' ry='15' fill='white' fill-opacity='.35'/><circle cx='17' cy='22' r='2.4' fill='%23c2336a'/><circle cx='31' cy='22' r='2.4' fill='%23c2336a'/><path d='M22.5 26 L25.5 26 L24 28 Z' fill='%23c2336a'/></svg>") right 12px bottom 10px/70px no-repeat,linear-gradient(160deg,#ff9cc2,#ec5f97);
  --heroi-borda:#ffd0e2;--card-borda:#f6cfe0;--heroi-aviso:#fff3a8;
  --pos:#2a8f5b;--pos-bg:#e1f5e8;--warn:#b06a10;--warn-bg:#fff0d8;--neg:#d0342c;--neg-bg:#fde2df;
  --on-status:#ffffff;--dou-bg:#ffeef5;--rec-bg:#eaf7ef;
  --sombra:0 6px 18px rgba(240,100,150,.16);
  --f-titulo:"Fredoka",var(--f-ui);--t-peso:600;--t-tam:34px;
  --ceu:radial-gradient(circle at 85% 6%,rgba(255,255,255,.9),transparent 25%),linear-gradient(180deg,#ffd9e8,#fff0f6 45%,#fff6fa);
  --estrelas:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'><g transform='translate(14 16)'><path d='M4 14 L10 0 L20 10 Z M40 14 L34 0 L24 10 Z' fill='%23ffb3cf'/><ellipse cx='22' cy='22' rx='20' ry='16' fill='%23ffc9dd'/><circle cx='15' cy='21' r='2.6' fill='%233a2230'/><circle cx='29' cy='21' r='2.6' fill='%233a2230'/><ellipse cx='10' cy='27' rx='3.2' ry='2' fill='%23ff8ab6'/><ellipse cx='34' cy='27' rx='3.2' ry='2' fill='%23ff8ab6'/><path d='M20.5 25 L23.5 25 L22 27 Z' fill='%23e0447f'/><path d='M19 29 Q20.5 31 22 29 Q23.5 31 25 29' stroke='%233a2230' stroke-width='1.2' fill='none' stroke-linecap='round'/></g><g transform='translate(92 88)' fill='%23ffb3cf'><ellipse cx='12' cy='16' rx='8' ry='6.5'/><circle cx='4' cy='7' r='3.2'/><circle cx='10' cy='3' r='3.2'/><circle cx='17' cy='3.5' r='3.2'/><circle cx='22' cy='9' r='3'/></g><path d='M106 26 c-3-4-9-1-6 4 l6 6 6-6 c3-5-3-8-6-4z' fill='%23ff8ab6'/><path d='M30 104 c-2-3-6-1-4 3 l4 4 4-4 c2-4-2-6-4-3z' fill='%23ffb3cf'/></svg>");
  --estrelas-tam:140px 140px;--estrelas-op:.55;
  --c2:#8a5cd6;--c2-fundo:linear-gradient(180deg,#b89cff,#8a5cd6);--c2-press:#7446c4;--c2-t:#7446c4;--c2-bg:#efe6ff;
  --c2-heroi:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 40'><path d='M6 16 L10 2 L20 11 Z M42 16 L38 2 L28 11 Z' fill='white' fill-opacity='.35'/><ellipse cx='24' cy='23' rx='20' ry='15' fill='white' fill-opacity='.35'/><circle cx='17' cy='22' r='2.4' fill='%235d36b8'/><circle cx='31' cy='22' r='2.4' fill='%235d36b8'/><path d='M22.5 26 L25.5 26 L24 28 Z' fill='%235d36b8'/></svg>") right 12px bottom 10px/70px no-repeat,linear-gradient(160deg,#c3abff,#8a5cd6);--c2-heroi-borda:#e2d4ff}
[data-tema=darkaero]{color-scheme:dark;--body-fundo:transparent;
  --topo:#030503;--bg:#020302;
  --card:rgba(10,14,10,.78);--card2:rgba(30,40,30,.7);--borda:rgba(140,255,100,.14);--fg:#eef5ee;--sub:#93a393;
  --acc:#3bd61a;--acc-fundo:linear-gradient(180deg,#a8ff7a 0%,#45e01f 48%,#24a80c 52%,#36d417 100%);--on-acc:#031000;--acc-press:#2aa612;--acc-t:#d0dcd0;--rap:#a9c7ff;
  --heroi:linear-gradient(180deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.02) 48%,transparent 50%),radial-gradient(ellipse 70% 90% at 82% 125%,rgba(70,255,30,.6),transparent 70%),linear-gradient(180deg,#141914,#020302);
  --heroi-borda:rgba(130,255,90,.45);--card-borda:rgba(140,255,100,.2);
  --pos:#8fe0b8;--pos-bg:#11281f;--warn:#f5c98a;--warn-bg:#2a2312;--neg:#ff8fa3;--neg-bg:#2e141c;
  --on-status:#020302;--dou-bg:rgba(208,220,208,.06);--rec-bg:rgba(143,224,184,.08);
  --sombra:inset 0 1px 0 rgba(255,255,255,.1),0 10px 28px rgba(0,0,0,.6);
  --vidro:blur(10px) saturate(140%);--folha:rgba(8,12,8,.95);
  --f-titulo:"Exo 2",var(--f-ui);--t-estilo:italic;--t-peso:700;--t-tam:34px;--t-sombra:0 0 14px rgba(70,255,30,.55);
  --ceu:radial-gradient(ellipse 90% 35% at 70% 100%,rgba(60,230,20,.42),transparent 70%),radial-gradient(ellipse 50% 25% at 10% 40%,rgba(60,230,20,.14),transparent 70%),linear-gradient(180deg,#050805,#010201);
  --giro-l:-40%;--giro-t:26%;--giro-t-mini:10%;--giro-h:42%;--giro-r:-20deg;
  --ceu-giro:radial-gradient(ellipse 48% 40% at 50% 50%,transparent 0 87%,rgba(120,255,60,.6) 91%,rgba(255,255,255,.4) 93%,rgba(60,200,20,.2) 96%,transparent 100%),radial-gradient(ellipse 30% 10% at 42% 34%,rgba(255,255,255,.18),transparent 70%),radial-gradient(ellipse 46% 38% at 50% 50%,rgba(16,20,16,.92) 0 86%,transparent 90%);
  --chao:conic-gradient(from 165deg at 50% 0%,#000 0deg 30deg,transparent 30deg);--chao-tam:7px 100%;--chao-h:56px;
  --c2:#2f8cff;--c2-fundo:linear-gradient(180deg,#8cc4ff 0%,#3a8fff 48%,#1a62d6 52%,#2f7dff 100%);--c2-on:#00101f;--c2-press:#1f6ad6;--c2-t:#9cc8ff;--c2-bg:rgba(47,140,255,.1);
  --c2-heroi:linear-gradient(180deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.02) 48%,transparent 50%),radial-gradient(ellipse 70% 90% at 82% 125%,rgba(47,140,255,.6),transparent 70%),linear-gradient(180deg,#121620,#020306);--c2-heroi-borda:rgba(120,180,255,.5)}
[data-tema=metro]{color-scheme:light;--body-fundo:transparent;
  --topo:#ff7ab8;--bg:#f0559c;
  --card:#ffffff;--card2:#ffe3f0;--borda:#f5b3d2;--fg:#1a0a12;--sub:#7a3d5c;
  --acc:#111111;--acc-press:#333333;--acc-t:#7a2ad6;--rap:#7a2ad6;
  --heroi:radial-gradient(circle at 86% 40%,transparent 0 13px,#ff5fa8 13px 17px,transparent 17px 23px,#ffffff 23px 25px,transparent 25px 31px,#ff5fa8 31px 34px,transparent 34.5px),radial-gradient(circle at 3px 3px,rgba(255,95,168,.35) 1.6px,transparent 2px) 0 0/9px 9px,#111111;
  --heroi-borda:#111111;--card-borda:#111111;
  --pos:#138a4a;--pos-bg:#dcf5e6;--warn:#a85c00;--warn-bg:#fff0d0;--neg:#d0202e;--neg-bg:#ffe0e0;
  --on-status:#ffffff;--dou-bg:#f1e6ff;--rec-bg:#e2f7ea;
  --sombra:3px 3px 0 #111111;
  --f-titulo:"Righteous",var(--f-ui);--t-peso:400;--t-tam:34px;--t-sombra:2px 2px 0 #ffffff;
  --ceu:radial-gradient(circle at 14% 22%,transparent 0 16px,#111 16px 22px,transparent 22px 30px,#111 30px 33px,transparent 33.5px),radial-gradient(circle at 88% 58%,transparent 0 22px,#111 22px 30px,transparent 30px 40px,#fff 40px 43px,transparent 43.5px),radial-gradient(circle at 22% 84%,transparent 0 10px,#fff 10px 14px,transparent 14px 20px,#111 20px 23px,transparent 23.5px),radial-gradient(circle at 70% 12%,#111 0 8px,transparent 8.5px),linear-gradient(180deg,#ff7ab8,#e8408c);
  --giro-l:0%;--giro-t:0%;--giro-t-mini:0%;--giro-h:100%;--giro-r:0deg;--giro-tam:100% 100%;--giro-tam-mini:100% 100%;
  --ceu-giro:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 800' preserveAspectRatio='xMidYMin slice'><g fill='none' stroke='white' stroke-opacity='.8' stroke-linecap='round'><path d='M-10 300 Q60 240 120 300 Q160 340 130 370 Q100 395 80 365 Q68 345 90 335' stroke-width='5'/><path d='M410 520 Q340 470 290 530 Q260 570 295 590 Q325 605 335 580 Q340 560 318 556' stroke-width='5'/><path d='M300 120 Q340 90 380 120 Q400 140 385 155 Q370 168 360 152' stroke-width='3'/></g></svg>");
  --estrelas:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><g fill='white'><path d='M24 18 l2 7 7 2 -7 2 -2 7 -2 -7 -7 -2 7 -2z'/><path d='M90 80 l1.4 5 5 1.4 -5 1.4 -1.4 5 -1.4 -5 -5 -1.4 5 -1.4z'/></g><g fill='white' fill-opacity='.35'><circle cx='60' cy='30' r='3'/><circle cx='72' cy='30' r='2.4'/><circle cx='84' cy='30' r='1.8'/><circle cx='60' cy='42' r='2.4'/><circle cx='72' cy='42' r='1.8'/><circle cx='60' cy='54' r='1.8'/><circle cx='20' cy='90' r='2.6'/><circle cx='32' cy='90' r='2'/><circle cx='20' cy='102' r='2'/></g></svg>");--estrelas-tam:120px 120px;
  --c2:#1fb6ff;--c2-fundo:#111111;--c2-on:#ffffff;--c2-press:#333333;--c2-t:#0a7fc4;--c2-bg:#dff3ff;
  --c2-heroi:radial-gradient(circle at 86% 40%,transparent 0 13px,#1fb6ff 13px 17px,transparent 17px 23px,#ffffff 23px 25px,transparent 25px 31px,#1fb6ff 31px 34px,transparent 34.5px),radial-gradient(circle at 3px 3px,rgba(31,182,255,.35) 1.6px,transparent 2px) 0 0/9px 9px,#111111;--c2-heroi-borda:#111111}

/* Fundo decorado: camada fixa atrás de tudo (galáxia, bolhas, nuvens, floresta). */
.ceu{position:fixed;top:0;left:0;right:0;bottom:0;z-index:-1;pointer-events:none;overflow:hidden;background-image:var(--ceu);background-repeat:no-repeat;background-size:100% 100%}
.ceu::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background-image:var(--estrelas);background-size:var(--estrelas-tam);opacity:var(--estrelas-op)}
.ceu::after{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background-image:var(--estrelas2);background-size:var(--estrelas2-tam);animation:pisca 3.5s ease-in-out infinite alternate}
.ceu i{position:absolute;left:var(--giro-l);right:var(--giro-l);top:var(--giro-t);height:var(--giro-h);aspect-ratio:1/1;background-image:var(--ceu-giro);background-repeat:no-repeat;background-position:var(--giro-pos);background-size:var(--giro-tam);transform:rotate(var(--giro-r))}
.ceu b{position:absolute;left:0;right:0;bottom:0;height:var(--chao-h);background-image:var(--chao);background-size:var(--chao-tam);-webkit-mask-image:linear-gradient(transparent,#000 50%);mask-image:linear-gradient(transparent,#000 50%)}
@keyframes pisca{from{opacity:.2}to{opacity:1}}
@media (prefers-reduced-motion:reduce){.ceu::after{animation:none}}
/* Vidro (só nos temas transparentes; nos outros, --vidro é none). */
.mais,.chip-conta,.seg,.faixa,.chip,.grupo,.folha,.faixa-conta,.vazio,input[type=search]{-webkit-backdrop-filter:var(--vidro);backdrop-filter:var(--vidro)}

/* Folha de temas (menu ⋯ > Temas) */
.t-grupo{padding:12px 16px 0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--sub)}
.temas{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:10px 16px 14px;border-bottom:1px solid var(--borda)}
.folha .t-op{display:flex;flex-direction:column;gap:6px;width:auto;padding:0;border:0;background:none;text-align:center;font-size:13px;font-weight:600;color:var(--fg);-webkit-tap-highlight-color:transparent}
.t-op .tipo{display:block;font-size:11px;font-weight:500;color:var(--sub)}
.amostra{position:relative;display:block;height:72px;border-radius:12px;border:2px solid var(--borda);background:var(--body-fundo);overflow:hidden}
.amostra .ceu{position:absolute;z-index:0}
.amostra .ceu i{top:var(--giro-t-mini);background-size:var(--giro-tam-mini)}
.t-op.on .amostra{border-color:var(--fg)}
.amostra .a-x{position:relative;z-index:1;display:flex;flex-direction:column;gap:4px;padding:7px;height:100%}
.amostra .a-h{display:block;height:24px;border-radius:6px;background:var(--heroi);border:1px solid var(--heroi-borda)}
.amostra .a-l{display:block;height:9px;border-radius:4px;background:var(--card);border:1px solid var(--card-borda)}
.amostra .a-l.c{width:60%;background:var(--acc-fundo);border:0}
.amostra .ok{position:absolute;right:5px;bottom:5px;z-index:2;width:18px;height:18px;border-radius:50%;background:var(--fg);color:var(--bg);font-size:11px;font-weight:700;display:none;place-items:center}
.t-op.on .ok{display:grid}
`;
// ---------- Temáticos (v6.4, protótipo N6) ----------
// Só valem dentro de [data-tema=<um destes>], então os temas acima não mudam.
const T = ':is([data-tema=abissal],[data-tema=noir],[data-tema=obsidiana],[data-tema=acid])';
// Temas com moldura recortada: o elemento pinta a moldura (--mold-borda) e o
// ::before pinta o miolo (--miolo) com o mesmo recorte (--clip).
// (O Romantic Gothic, de v6.19, tem a moldura dele em CSS_NOVOS.)
const R = ':is([data-tema=obsidiana])';
const MOLDURA = '.btn,.chip,.chip-conta,.faixa,.grupo,.an-grupo,.av-proposta,.veredito,.dia-card,.dia-lucro,.seg,.seg.abas button.on,.mais,.amostra .a-h,.amostra .a-l.c';
const CARTOES = '.grupo,.vazio,.an-grupo,.av-proposta,.veredito,.av-resumo,.dia-card,.dia-lucro,.aj-ind,.aj-prop,.aj-forma,.aj-regua,.aj-robux,.aj-armas,.aj-glos,.aj-faq,.aj-bx';
const RUIDO = "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.95' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

const CSS_TEMATICOS = `
@property --th-giro{syntax:'<angle>';inherits:false;initial-value:0deg}

[data-tema=abissal]{color-scheme:dark;--body-fundo:transparent;
  --topo:#04223a;--bg:#010812;--card:rgba(5,27,45,.9);--card2:rgba(14,52,78,.88);--borda:rgba(110,230,255,.16);--card-borda:rgba(120,240,255,.26);--fg:#e6fbff;--sub:#8fb8c8;
  --acc:#3ff2e0;--acc-fundo:radial-gradient(120% 150% at 30% 15%,#c9fff8 0%,#5ff5e6 30%,#13b5c4 70%,#086a86 100%);--acc-press:#13b5c4;--on-acc:#00161c;--acc-t:#7ff7ea;--rap:#9cc8ff;
  --heroi:radial-gradient(ellipse 90% 80% at 50% 135%,rgba(63,242,224,.55),transparent 70%),linear-gradient(180deg,rgba(9,58,88,.94),rgba(2,16,30,.97));--heroi-borda:rgba(130,240,255,.38);--on-heroi:#e9fdff;
  --pos:#7ff0c0;--pos-bg:rgba(30,140,100,.25);--warn:#ffd68a;--warn-bg:rgba(150,110,30,.28);--neg:#ff94b4;--neg-bg:rgba(160,40,90,.28);
  --on-status:#010812;--dou-bg:rgba(63,242,224,.1);--rec-bg:rgba(127,240,192,.08);
  --sombra:0 10px 30px rgba(0,10,25,.5),inset 0 1px 0 rgba(255,255,255,.12);--vidro:none;--folha:rgba(3,22,38,.97);
  --btn-sombra:inset 0 3px 6px rgba(255,255,255,.55),inset 0 -8px 14px rgba(0,50,70,.45),0 0 20px rgba(63,242,224,.38);
  --c2-btn-sombra:inset 0 3px 6px rgba(255,255,255,.55),inset 0 -8px 14px rgba(70,0,30,.45),0 0 20px rgba(255,122,176,.38);
  --r-btn:26px 20px 28px 18px / 20px 28px 18px 26px;--r-chip:999px;--r-card:24px;--r-heroi:30px;--r-thumb:46% 54% 50% 50% / 56% 46% 54% 44%;--r-seg:999px;--r-seg-b:999px;--r-campo:999px;
  --f-titulo:"Comfortaa",var(--f-ui);--t-peso:700;--t-tam:31px;--t-esp:-.01em;--t-cor:#dffffb;--t-sombra:0 0 16px rgba(63,242,224,.5);
  --ceu:radial-gradient(ellipse 120% 50% at 50% -10%,rgba(60,200,255,.22),transparent 60%),linear-gradient(180deg,#04223a 0%,#021326 35%,#010812 75%,#00040a 100%);
  --c2:#ff7ab0;--c2-fundo:radial-gradient(120% 150% at 30% 15%,#ffe0ee 0%,#ff9cc6 30%,#e0508e 70%,#8a1f52 100%);--c2-press:#e0508e;--c2-on:#2a0414;--c2-t:#ffa6cc;--c2-bg:rgba(255,122,176,.13);
  --c2-heroi:radial-gradient(ellipse 90% 80% at 50% 135%,rgba(255,122,176,.5),transparent 70%),linear-gradient(180deg,rgba(70,16,52,.94),rgba(20,4,18,.97));--c2-heroi-borda:rgba(255,170,210,.38)}

[data-tema=noir]{color-scheme:dark;--body-fundo:transparent;
  --topo:#1a1a1a;--bg:#070707;--card:rgba(17,17,17,.97);--card2:#1e1e1e;--borda:rgba(255,255,255,.12);--card-borda:rgba(255,255,255,.22);--fg:#f2f2f2;--sub:#9a9a9a;
  --acc:#f2f2f2;--acc-fundo:#f2f2f2;--acc-press:#bdbdbd;--on-acc:#0a0a0a;--acc-t:#ffffff;--rap:#a9a9a9;
  --heroi:repeating-linear-gradient(-24deg,rgba(255,255,255,.08) 0 12px,transparent 12px 26px),radial-gradient(ellipse 80% 90% at 8% 0%,rgba(255,255,255,.2),transparent 70%),#141414;--heroi-borda:rgba(255,255,255,.6);--on-heroi:#f5f5f5;--heroi-linha:rgba(255,255,255,.2);
  --pos:#cfe8d6;--pos-bg:#1b251e;--warn:#e9dcae;--warn-bg:#29251a;--neg:#ff4d4d;--neg-bg:#2e1212;
  --on-status:#070707;--dou-bg:rgba(255,255,255,.06);--rec-bg:rgba(207,232,214,.07);
  --sombra:0 14px 34px rgba(0,0,0,.6);--vidro:none;--folha:#101010;
  --r-btn:0;--r-chip:0;--r-card:0;--r-heroi:0;--r-thumb:0;--r-seg:0;--r-seg-b:0;--r-campo:0;--r-mais:0;
  --btn-caixa:uppercase;--btn-esp:.18em;--chip-caixa:uppercase;--chip-esp:.12em;
  --f-titulo:"Bodoni Moda",Didot,Georgia,serif;--t-estilo:italic;--t-peso:700;--t-tam:40px;--t-esp:-.01em;--t-cor:#ffffff;
  --ceu:radial-gradient(ellipse 70% 45% at 18% -5%,rgba(255,255,255,.15),transparent 70%),linear-gradient(180deg,#1a1a1a,#0a0a0a 60%,#050505);
  --c2:#d9b27a;--c2-fundo:#d9b27a;--c2-press:#b08a55;--c2-on:#1a120a;--c2-t:#e6c79a;--c2-bg:rgba(217,178,122,.12);
  --c2-heroi:repeating-linear-gradient(-24deg,rgba(255,225,180,.09) 0 12px,transparent 12px 26px),radial-gradient(ellipse 80% 90% at 8% 0%,rgba(255,220,170,.22),transparent 70%),#22190f;--c2-heroi-borda:rgba(230,199,154,.6)}

[data-tema=obsidiana]{color-scheme:dark;--body-fundo:transparent;
  --topo:#0b0712;--bg:#050307;--card:#0d0912;--card-mold:linear-gradient(160deg,#17101f 0%,#0a070e 55%,#120c1a 100%);--card2:#1d1429;--borda:rgba(190,150,255,.14);--card-borda:rgba(190,150,255,.24);--fg:#f1ecf7;--sub:#a79dba;
  --acc:#8d55ff;--acc-fundo:linear-gradient(160deg,#c9a8ff 0%,#8d55ff 40%,#5a22c8 75%,#3a1288 100%);--acc-press:#5a22c8;--on-acc:#ffffff;--acc-t:#c7a8ff;--rap:#9fc0ff;
  --heroi:linear-gradient(115deg,transparent 36%,rgba(225,205,255,.14) 41%,transparent 47%),radial-gradient(ellipse 75% 70% at 85% 115%,rgba(120,60,230,.38),transparent 70%),linear-gradient(160deg,#1c1129 0%,#07050b 55%,#160d22 100%);--on-heroi:#f5f0ff;--heroi-linha:rgba(200,170,255,.2);
  --pos:#8fe0b8;--pos-bg:#11261d;--warn:#ff9b6a;--warn-bg:#2a120c;--neg:#ff8fa3;--neg-bg:#2e1018;
  --on-status:#050307;--dou-bg:rgba(141,85,255,.12);--rec-bg:rgba(143,224,184,.08);
  --sombra:none;--vidro:none;--folha:#0e0914;
  --mold-borda:linear-gradient(135deg,#d6bcff 0%,#4a2a78 25%,#140b20 50%,#3a1f5c 72%,#b48cff 100%);
  --c2-mold-borda:linear-gradient(135deg,#c8d4ff 0%,#1e2a66 25%,#0a0f26 50%,#1a2350 72%,#8fa4ff 100%);
  --clip-btn:polygon(14px 0,calc(100% - 14px) 0,100% 50%,calc(100% - 14px) 100%,14px 100%,0 50%);
  --clip-chip:polygon(8px 0,calc(100% - 8px) 0,100% 50%,calc(100% - 8px) 100%,8px 100%,0 50%);
  --clip-card:polygon(0 12px,12px 0,calc(62% - 9px) 0,62% 7px,calc(62% + 9px) 0,calc(100% - 20px) 0,100% 20px,100% calc(100% - 9px),calc(100% - 9px) 100%,26px 100%,0 calc(100% - 26px));
  --clip-heroi:polygon(0 24px,12% 24px,16% 6px,20% 24px,44% 24px,50% 0,56% 24px,78% 24px,83% 10px,87% 24px,100% 24px,100% calc(100% - 16px),calc(100% - 16px) 100%,22px 100%,0 calc(100% - 22px));
  --clip-seg:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px);
  --clip-thumb:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);
  --clip-mini:polygon(5px 0,calc(100% - 5px) 0,100% 50%,calc(100% - 5px) 100%,5px 100%,0 50%);
  --clip-mini-h:polygon(0 5px,30% 5px,36% 0,42% 5px,100% 5px,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%);
  --f-titulo:"Cinzel",Georgia,serif;--t-peso:700;--t-tam:31px;--t-esp:.05em;--t-cor:#efe6ff;--t-sombra:0 0 14px rgba(160,100,255,.55);
  --ceu:radial-gradient(ellipse 80% 30% at 50% 108%,rgba(255,80,20,.1),transparent 70%),radial-gradient(ellipse 60% 40% at 80% 20%,rgba(120,60,220,.2),transparent 70%),radial-gradient(ellipse 60% 40% at 10% 70%,rgba(80,30,160,.18),transparent 70%),linear-gradient(180deg,#0b0712,#040306 55%,#060309);
  --c2:#4d6bff;--c2-fundo:linear-gradient(160deg,#c2ceff 0%,#6a84ff 40%,#3047d0 75%,#1a2788 100%);--c2-press:#3047d0;--c2-on:#ffffff;--c2-t:#a8b8ff;--c2-bg:rgba(77,107,255,.13);
  --c2-heroi:linear-gradient(115deg,transparent 36%,rgba(210,220,255,.14) 41%,transparent 47%),radial-gradient(ellipse 75% 70% at 85% 115%,rgba(77,107,255,.42),transparent 70%),linear-gradient(160deg,#10162e 0%,#04060c 55%,#0d1226 100%)}

[data-tema=acid]{color-scheme:light;--body-fundo:transparent;
  --topo:#fff6fd;--bg:#fff6fd;--card:#ffffff;--card2:#f6eaff;--borda:rgba(26,11,46,.14);--card-borda:#1a0b2e;--fg:#1a0b2e;--sub:#5e4b78;
  --acc:#ff2bd6;--acc-fundo:linear-gradient(90deg,#ff8ae8,#ffb36b,#c8ff6b,#7dffcf,#7ad8ff,#c9a0ff,#ff8ae8);--acc-press:#ff2bd6;--on-acc:#1a0b2e;--acc-t:#c4129f;--rap:#6a1bd1;
  --heroi:linear-gradient(90deg,#3a0ca3 0 40%,rgba(58,12,163,0) 80%),repeating-radial-gradient(circle at 94% 50%,#ff5fd2 0 7px,#ff9a3c 7px 12px,#7dff5a 12px 18px,#2bd9ff 18px 24px,#9b4dff 24px 30px),#3a0ca3;
  --heroi-borda:#1a0b2e;--on-heroi:#ffffff;--heroi-linha:rgba(255,255,255,.28);
  --pos:#08814a;--pos-bg:#d6ffe8;--warn:#b04e00;--warn-bg:#ffe9d6;--neg:#c8005f;--neg-bg:#ffe0ef;
  --on-status:#ffffff;--dou-bg:#fdeefc;--rec-bg:#eafff3;
  --sombra:0 8px 22px rgba(155,77,255,.18);--vidro:none;--folha:#ffffff;
  --r-btn:30px 18px 26px 14px / 16px 28px 14px 26px;--r-chip:999px;--r-card:26px;--r-heroi:28px;--r-thumb:40% 60% 55% 45% / 50% 40% 60% 50%;--r-seg:999px;--r-seg-b:999px;--r-campo:999px;
  --f-titulo:"Climate Crisis","Arial Black",var(--f-ui);--t-peso:400;--t-tam:29px;--t-esp:0;--t-cor:#1a0b2e;
  --ceu:linear-gradient(#fff6fd,#fff6fd);
  --c2:#00b8a9;--c2-fundo:linear-gradient(90deg,#7ad8ff,#7dffcf,#c8ff6b,#7dffcf,#a0b8ff,#7ad8ff);--c2-press:#00b8a9;--c2-on:#062a2a;--c2-t:#00806f;--c2-bg:rgba(0,184,169,.14);
  --c2-heroi:linear-gradient(90deg,#064e5a 0 40%,rgba(6,78,90,0) 80%),repeating-radial-gradient(circle at 94% 50%,#7ad8ff 0 7px,#7dffcf 7px 12px,#c8ff6b 12px 18px,#a0b8ff 18px 24px,#ff8ae8 24px 30px),#064e5a;--c2-heroi-borda:#062a2a}

/* Conta 2: os tokens de forma que dependem da cor também trocam. */
body.c2ativa{--btn-sombra:var(--c2-btn-sombra,none);--mold-borda:var(--c2-mold-borda,none)}

/* Formas comuns aos Temáticos (os tokens só existem neles). */
${T} h1{letter-spacing:var(--t-esp,-.02em);text-transform:var(--t-caixa,none);color:var(--t-cor,var(--fg))}
${T} :is(.secao>h2,details.bloco>summary){letter-spacing:var(--t-esp,-.01em)}
${T} .btn{position:relative;border-radius:var(--r-btn,12px);box-shadow:var(--btn-sombra,none);text-transform:var(--btn-caixa,none);letter-spacing:var(--btn-esp,0)}
${T} .btn.sec{box-shadow:none}
${T} :is(.chip,.chip-conta,.cont,.tag,.faixa-conta){border-radius:var(--r-chip,999px)}
${T} .chip{text-transform:var(--chip-caixa,none);letter-spacing:var(--chip-esp,0)}
${T} :is(${CARTOES}){border-radius:var(--r-card,16px)}
${T} .faixa{position:relative;overflow:hidden;border-radius:var(--r-heroi,18px)}
${T} .folha{border-radius:var(--r-card,16px);clip-path:var(--clip-card,none)}
${T} input[type=search]{border-radius:var(--r-campo,12px);clip-path:var(--clip-seg,none)}
${T} .seg{border-radius:var(--r-seg,12px)}
${T} .seg button{border-radius:var(--r-seg-b,9px)}
${T} .thumb{border-radius:var(--r-thumb,12px);clip-path:var(--clip-thumb,none)}
${T} .mais{border-radius:var(--r-mais,50%)}
.ceu>span{position:absolute;display:block;pointer-events:none}

/* Moldura recortada (Obsidiana). */
${R} :is(.btn,.seg.abas button.on){--clip:var(--clip-btn);--miolo:var(--acc-fundo)}
${R} .btn.sec{--miolo:var(--card2)}
${R} :is(.chip,.chip-conta){--clip:var(--clip-chip);--miolo:var(--card)}
${R} .chip.on{--miolo:var(--acc-fundo)}
${R} .chip.filtro.on{--miolo:var(--neg-bg)}
${R} .faixa{--clip:var(--clip-heroi);--miolo:var(--heroi)}
${R} :is(.grupo,.an-grupo,.av-proposta,.veredito,.dia-card,.dia-lucro){--clip:var(--clip-card);--miolo:var(--card-mold,var(--card))}
${R} .seg{--clip:var(--clip-seg);--miolo:var(--card2)}
${R} .mais{--clip:var(--clip-thumb);--miolo:var(--card)}
${R} .amostra .a-h{--clip:var(--clip-mini-h);--miolo:var(--heroi)}
${R} .amostra .a-l.c{--clip:var(--clip-mini);--miolo:var(--acc-fundo)}
${R} :is(${MOLDURA}){position:relative;isolation:isolate;clip-path:var(--clip);background:var(--mold-borda)!important;border-color:transparent!important;box-shadow:none!important;border-radius:0!important}
${R} :is(${MOLDURA})::before{content:"";position:absolute;top:1.5px;right:1.5px;bottom:1.5px;left:1.5px;clip-path:var(--clip);background:var(--miolo);z-index:-1}
${R} :is(.amostra .a-h,.amostra .a-l.c)::before{top:1px;right:1px;bottom:1px;left:1px}
${R} :is(.tag,.cont){clip-path:var(--clip-chip);border-radius:0}

/* Abissal: geleia, bolhas e águas-vivas */
[data-tema=abissal] :is(.btn,.seg.abas button.on)::after{content:"";position:absolute;left:12%;top:10%;width:26%;height:32%;border-radius:50%;background:radial-gradient(rgba(255,255,255,.8),transparent 70%);pointer-events:none}
[data-tema=abissal] .seg.abas button.on{position:relative;box-shadow:var(--btn-sombra)}
[data-tema=abissal] .btn.sec::after{opacity:.35}
[data-tema=abissal] .chip{background:radial-gradient(circle at 26% 22%,rgba(255,255,255,.26),transparent 38%),var(--card);border-color:rgba(120,240,255,.3)}
[data-tema=abissal] .chip.on{background:radial-gradient(circle at 26% 22%,rgba(255,255,255,.65),transparent 40%),var(--acc-fundo);box-shadow:var(--btn-sombra);border-color:transparent}
[data-tema=abissal] .chip.filtro.on{background:var(--neg-bg);box-shadow:none;border-color:var(--neg)}
[data-tema=abissal] .ceu .k1{top:0;left:0;right:0;bottom:0;background:linear-gradient(102deg,transparent 18%,rgba(140,240,255,.08) 23%,transparent 29%),linear-gradient(95deg,transparent 46%,rgba(140,240,255,.06) 51%,transparent 57%),linear-gradient(107deg,transparent 65%,rgba(140,240,255,.05) 69%,transparent 74%);
  -webkit-mask-image:linear-gradient(#000,transparent 75%);mask-image:linear-gradient(#000,transparent 75%);animation:thBalanca 9s ease-in-out infinite alternate}
[data-tema=abissal] .ceu :is(.k2,.k3){background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 160'><defs><radialGradient id='g' cx='.5' cy='.35' r='.6'><stop offset='0' stop-color='%23d8fffa' stop-opacity='.9'/><stop offset='.5' stop-color='%233ff2e0' stop-opacity='.45'/><stop offset='1' stop-color='%230a6f8a' stop-opacity='.12'/></radialGradient></defs><path d='M10 50 Q10 8 50 8 Q90 8 90 50 Q80 56 70 50 Q60 57 50 50 Q40 57 30 50 Q20 56 10 50Z' fill='url(%23g)'/><g fill='none' stroke='%233ff2e0' stroke-opacity='.45' stroke-width='2' stroke-linecap='round'><path d='M28 54 Q22 80 30 104 Q38 128 28 150'/><path d='M44 56 Q38 86 46 112 Q52 132 44 156'/><path d='M58 56 Q64 84 56 110 Q50 132 58 154'/><path d='M72 54 Q78 80 70 104 Q64 126 72 146'/></g></svg>") center/contain no-repeat}
[data-tema=abissal] .ceu .k2{right:-14px;top:16%;width:120px;height:192px;opacity:.75;animation:thBoia 9s ease-in-out infinite}
[data-tema=abissal] .ceu .k3{left:-10px;top:60%;width:72px;height:115px;opacity:.5;filter:hue-rotate(60deg);animation:thBoia 7s ease-in-out -3s infinite}
[data-tema=abissal] .ceu .k4{left:0;right:0;top:0;height:calc(100% + 300px);will-change:transform;background-image:radial-gradient(circle at 20px 40px,transparent 0 3px,rgba(180,250,255,.5) 3.5px 4.5px,transparent 5px),radial-gradient(circle at 120px 210px,transparent 0 5px,rgba(180,250,255,.35) 5.5px 6.5px,transparent 7px),radial-gradient(circle at 70px 130px,transparent 0 2px,rgba(180,250,255,.5) 2.5px 3.5px,transparent 4px),radial-gradient(circle at 170px 270px,transparent 0 2px,rgba(180,250,255,.4) 2.5px 3.2px,transparent 3.7px);
  background-size:200px 300px;animation:thSobe 9s linear infinite}
[data-tema=abissal] .ceu .k5{left:0;right:0;bottom:0;height:160px;background:radial-gradient(ellipse 80% 100% at 50% 100%,rgba(63,242,224,.14),transparent 70%)}

/* Noir: reto, abas sublinhadas, moldura dupla, chuva e grão */
[data-tema=noir] .seg.abas{background:none;padding:0;border-bottom:1px solid rgba(255,255,255,.2)}
[data-tema=noir] .seg.abas button{font-size:12px;text-transform:uppercase;letter-spacing:.12em}
[data-tema=noir] .seg.abas button.on{background:none;color:var(--acc-t);box-shadow:inset 0 -2px 0 var(--acc-t)}
[data-tema=noir] .faixa{outline:1px solid var(--heroi-borda);outline-offset:4px;margin:5px}
[data-tema=noir] .btn.sec{background:transparent;border:1px solid var(--acc-t);color:var(--acc-t)}
[data-tema=noir] .chip{font-size:12px}
[data-tema=noir] .secao>h2::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.5),transparent)}
[data-tema=noir] .ceu .k1{top:-60px;left:-60px;right:-60px;bottom:-60px;opacity:.11;will-change:transform;background:${RUIDO} 0 0/180px 180px;animation:thGrao .9s steps(1) infinite}
[data-tema=noir] .ceu .k2{left:0;right:0;top:-160px;bottom:0;will-change:transform;animation:thChuva .26s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='160'><g stroke='white' stroke-opacity='.16' stroke-width='1' stroke-linecap='round'><path d='M12 8 l-4 18'/><path d='M52 40 l-4 18'/><path d='M96 18 l-4 18'/><path d='M30 88 l-4 18'/><path d='M80 110 l-4 18'/><path d='M110 72 l-4 18'/><path d='M8 136 l-4 18'/><path d='M62 140 l-4 18'/></g></svg>") 0 0/120px 160px}
[data-tema=noir] .ceu .k3{top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse at 50% 45%,transparent 45%,rgba(0,0,0,.8) 100%)}

/* Obsidiana: cristais no value, cacos e faíscas roxas; lava só em dois detalhes */
[data-tema=obsidiana] .faixa{padding-top:36px}
[data-tema=obsidiana] .faixa::after{content:"";position:absolute;right:10px;bottom:8px;width:70px;height:26px;pointer-events:none;filter:drop-shadow(0 0 3px #ff5a1a);opacity:.85;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 70 26'><path d='M2 22 L14 18 L22 24 L34 14 L44 17 L54 8 L68 4' fill='none' stroke='%23ff6a2a' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/><path d='M34 14 L36 6' fill='none' stroke='%23ff6a2a' stroke-width='1' stroke-linecap='round'/></svg>") center/contain no-repeat}
[data-tema=obsidiana] .ceu .k1{top:0;left:0;right:0;bottom:0;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 800' preserveAspectRatio='xMidYMid slice'><g stroke='%23b48cff' stroke-opacity='.2' stroke-width='1'><path d='M0 120 L140 40 L90 260 Z' fill='%23150d20'/><path d='M400 60 L290 180 L380 330 Z' fill='%23110a19'/><path d='M260 420 L400 360 L400 560 Z' fill='%23130b1c'/><path d='M0 480 L120 400 L60 640 Z' fill='%23100917'/><path d='M180 250 L230 210 L215 300 Z' fill='%230e0815'/></g><g stroke='%23ffffff' stroke-opacity='.12'><path d='M140 40 L90 260'/><path d='M290 180 L380 330'/><path d='M120 400 L60 640'/></g></svg>") center/cover no-repeat}
[data-tema=obsidiana] .ceu .k2{left:0;right:0;top:0;height:calc(100% + 300px);opacity:.6;will-change:transform;animation:thSobe 15s linear infinite;
  background-image:radial-gradient(circle at 30px 80px,#d6bcff 0 1.2px,transparent 2px),radial-gradient(circle at 150px 250px,#ffffff 0 1px,transparent 1.8px),radial-gradient(circle at 90px 170px,#b48cff 0 1.4px,transparent 2.2px),radial-gradient(circle at 180px 20px,#e6dcff 0 .9px,transparent 1.6px);background-size:200px 300px}
[data-tema=obsidiana] .ceu .k5{left:0;right:0;bottom:0;height:150px;opacity:.4;filter:drop-shadow(0 0 4px #ff5a1a);animation:thPulso 4s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 180' preserveAspectRatio='none'><g fill='none' stroke='%23ff7a2a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M0 140 L60 128 L90 150 L150 118 L190 140 L240 110 L300 136 L340 118 L400 130'/><path d='M150 118 L162 88 L152 64'/><path d='M300 136 L312 162 L302 180'/><path d='M60 128 L52 160'/></g></svg>") center bottom/100% 100% no-repeat}

/* Acid: arco-íris que corre e muda de forma; borda de arco-íris girando; título derretendo */
[data-tema=acid] :is(.btn,.chip.on,.seg.abas button.on){background-size:300% 100%;border:2px solid #1a0b2e;animation:thFlui 6s linear infinite,thMorfa 7s ease-in-out infinite}
[data-tema=acid] .btn.sec{background:#ffffff;color:#1a0b2e;animation:thMorfa 7s ease-in-out -3s infinite}
[data-tema=acid] .chip{border:2px solid #1a0b2e;font-weight:600}
[data-tema=acid] .seg.abas{background:#ffffff;border:2px solid #1a0b2e}
[data-tema=acid] .seg.abas button{color:#5e4b78}
[data-tema=acid] .seg.abas button.on{color:var(--on-acc)}
[data-tema=acid] input[type=search]{border:2px solid #1a0b2e}
[data-tema=acid] .mais{border:2px solid #1a0b2e;background:#ffffff;color:#1a0b2e}
[data-tema=acid] .faixa{border-width:2.5px}
[data-tema=acid] :is(.grupo,.an-grupo,.av-proposta){border:3px solid transparent;background:linear-gradient(var(--card),var(--card)) padding-box,conic-gradient(from var(--th-giro,0deg),#ff2bd6,#ff9a3c,#7dff5a,#2bd9ff,#9b4dff,#ff2bd6) border-box;animation:thGiro 8s steps(90) infinite}
[data-tema=acid] h1{background:linear-gradient(90deg,#ff2bd6,#ff7a1a,#18c45c,#1aa9ff,#8a2bff,#ff2bd6);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;-webkit-text-stroke:1.5px #1a0b2e;
  animation:thFlui 6s linear infinite,thDerrete 4.5s ease-in-out infinite alternate}
[data-tema=acid] .thumb{background:linear-gradient(135deg,#ffc6f2,#c8ffe4,#d0eeff);border:2px solid #1a0b2e}
[data-tema=acid] .ceu .k1,[data-tema=acid] .ceu .k5{top:0;left:0;right:0;bottom:0;animation:thRespira 9s ease-in-out infinite alternate;
  background:repeating-radial-gradient(circle at 50% 45%,#ffd2f4 0 18px,#ffffff 18px 30px,#d2ffe9 30px 48px,#ffffff 48px 60px,#d6f1ff 60px 78px,#ffffff 78px 90px,#e8d8ff 90px 108px,#ffffff 108px 120px)}
[data-tema=acid] .ceu .k5{animation:thRespira 9s ease-in-out infinite alternate,thCruza 8s ease-in-out infinite alternate;
  background:repeating-radial-gradient(circle at 50% 45%,#ffe2cc 0 18px,#ffffff 18px 30px,#e9ffcc 30px 48px,#ffffff 48px 60px,#ead6ff 60px 78px,#ffffff 78px 90px,#ffd6ea 90px 108px,#ffffff 108px 120px)}
[data-tema=acid] .ceu .k2{top:-60px;left:-60px;right:-60px;bottom:-60px;will-change:transform;background:repeating-radial-gradient(circle at 42% 47%,transparent 0 9px,rgba(26,11,46,.06) 9px 11px);animation:thDeriva 10s ease-in-out infinite alternate}
[data-tema=acid] .ceu :is(.k3,.k4){background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 124'><path d='M50 6 A44 44 0 0 1 94 50 C94 64 90 72 86 80 C83 86 84 96 79 96 C74 96 75 86 71 86 C67 86 68 108 62 108 C56 108 57 90 52 90 C47 90 48 98 43 98 C38 98 37 84 31 78 C14 70 6 62 6 50 A44 44 0 0 1 50 6Z' fill='%23ff5fd2' stroke='%231a0b2e' stroke-width='3'/><ellipse cx='36' cy='42' rx='5' ry='9' fill='%231a0b2e'/><ellipse cx='64' cy='42' rx='5' ry='9' fill='%231a0b2e'/><path d='M28 60 Q50 82 72 60' fill='none' stroke='%231a0b2e' stroke-width='4' stroke-linecap='round'/></svg>") center/contain no-repeat}
[data-tema=acid] .ceu .k3{right:-18px;top:30%;width:96px;height:119px;opacity:.55;animation:thBamboleia 6s ease-in-out infinite alternate}
[data-tema=acid] .ceu .k4{left:-20px;top:72%;width:74px;height:92px;opacity:.5;filter:hue-rotate(150deg);animation:thBamboleia 7s ease-in-out -2s infinite alternate-reverse}

/* Reação ao toque de cada tema */
[data-tema=abissal] .toque{animation:thGeleia .55s ease-out}
[data-tema=noir] .toque{animation:thInverte .3s steps(2)}
[data-tema=obsidiana] .toque{animation:thRacha .3s ease-out}
[data-tema=acid] .toque{animation:thOnda .6s linear,thFlui 6s linear infinite}

@keyframes thGeleia{0%{transform:scale(1)}30%{transform:scale(1.08,.9)}50%{transform:scale(.94,1.06)}70%{transform:scale(1.03,.97)}100%{transform:scale(1)}}
@keyframes thBrilho{0%{filter:brightness(1.5)}100%{filter:brightness(1)}}
@keyframes thInverte{0%{filter:invert(1)}100%{filter:invert(0)}}
@keyframes thRacha{0%{transform:translateX(0);filter:brightness(1.6)}25%{transform:translateX(-3px)}50%{transform:translateX(3px)}75%{transform:translateX(-1px)}100%{transform:translateX(0);filter:brightness(1)}}
@keyframes thOnda{0%{filter:hue-rotate(0deg) saturate(1.6)}100%{filter:hue-rotate(360deg) saturate(1)}}
@keyframes thSobe{from{transform:translateY(0)}to{transform:translateY(-300px)}}
@keyframes thBoia{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-20px) scale(1.04,.95)}}
@keyframes thBalanca{from{transform:translateX(-12px)}to{transform:translateX(12px)}}
@keyframes thGrao{0%{transform:translate(0,0)}33%{transform:translate(-30px,24px)}66%{transform:translate(26px,-30px)}100%{transform:translate(0,0)}}
@keyframes thChuva{from{transform:translateY(0)}to{transform:translateY(160px)}}
@keyframes thPulso{from{opacity:.25}to{opacity:.5}}
@keyframes thFlui{from{background-position:0% 50%}to{background-position:300% 50%}}
@keyframes thMorfa{0%,100%{border-radius:30px 18px 26px 14px / 16px 28px 14px 26px}33%{border-radius:14px 30px 16px 28px / 28px 14px 26px 16px}66%{border-radius:24px 24px 12px 30px / 12px 24px 30px 18px}}
@keyframes thGiro{to{--th-giro:360deg}}
@keyframes thDerrete{from{font-variation-settings:"YEAR" 1979}to{font-variation-settings:"YEAR" 2050}}
@keyframes thRespira{from{transform:scale(1)}to{transform:scale(1.12)}}
@keyframes thCruza{from{opacity:0}to{opacity:1}}
@keyframes thDeriva{from{transform:translate(-36px,26px)}to{transform:translate(36px,-26px)}}
@keyframes thBamboleia{from{transform:rotate(-10deg) translateY(0)}to{transform:rotate(12deg) translateY(-14px)}}

/* "Reduzir movimento" no iPhone: tudo parado. */
@media (prefers-reduced-motion:reduce){
  ${T} :is(.ceu>span,.app,h1,.faixa,.btn,.chip,.seg button,.grupo,.an-grupo,.av-proposta,.toque){animation:none!important}
  ${T} :is(.faixa,h1)::before,${T} :is(.faixa,h1)::after{animation:none!important}
}
`;

// ---------- v6.5: os 13 temas também viram temáticos (protótipo P3) ----------
// Cores iguais às de antes (o Chromecore foi refeito como cromo tribal); mudam a forma,
// o fundo animado (camadas body>.ceu>span.k1..k5) e a reação ao toque. Os temas de
// vidro perderam o backdrop-filter (o fundo agora se mexe). Keyframes com prefixo p.
const CSS_TODOS = `/* ===== P1: os 13 temas viram temáticos (cores iguais; forma, fundo e toque novos) ===== */
@property --p-orb{syntax:'<angle>';inherits:false;initial-value:0deg}
body>.ceu>span{position:absolute;display:block;pointer-events:none}
/* Clássicos não tinham fundo decorado: o degradê de sempre vai para a camada do fundo. */
[data-tema=azul],[data-tema=dark]{--body-fundo:transparent;--ceu:linear-gradient(180deg,var(--topo),var(--bg) 640px)}
[data-tema=oled]{--body-fundo:transparent;--ceu:linear-gradient(#000,#000)}
/* Temas de vidro: sem desfoque (o fundo agora se mexe) e cartões um pouco mais cheios. */
[data-tema=galaxia]{--vidro:none;--card:rgba(30,14,62,.84);--card2:rgba(72,40,130,.6)}
[data-tema=frutiger]{--vidro:none;--card:rgba(255,255,255,.86);--card2:rgba(255,255,255,.7)}
[data-tema=softclub]{--vidro:none;--card:rgba(10,32,36,.92);--card2:rgba(30,64,70,.85);
  --acc-fundo:linear-gradient(180deg,#e6fffb 0%,#9fe8e2 40%,#4fbdb7 52%,#86dcd6 100%);--c2-fundo:linear-gradient(180deg,#ffffff 0%,#dfe7ec 40%,#a3b0b9 52%,#d0dae0 100%)}
[data-tema=darkaero]{--vidro:none;--card:rgba(10,14,10,.92);--p-brilho:rgba(70,255,30,.38)}
[data-tema=darkaero] body.c2ativa{--p-brilho:rgba(47,140,255,.42)}
[data-tema=gatinhos]{--orelha:#ff9cc2}
[data-tema=gatinhos] body.c2ativa{--orelha:#c3abff}

/* ---------- Azul: pílulas de vidro, ondas, ondinha no toque ---------- */
[data-tema=azul] :is(.btn,.chip,.seg button){position:relative;overflow:hidden}
[data-tema=azul] .btn,[data-tema=azul] .seg.abas button.on{border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 52%),var(--acc-fundo);box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 4px 12px rgba(23,59,130,.25)}
[data-tema=azul] .btn.sec{background:linear-gradient(180deg,#ffffff,#eef2fa);box-shadow:inset 0 1px 0 #fff,0 2px 6px rgba(16,24,40,.08)}
[data-tema=azul] .chip{background:linear-gradient(180deg,#ffffff,#f1f4fb)}
[data-tema=azul] .chip.on{background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 52%),var(--acc-fundo)}
[data-tema=azul] .seg,[data-tema=azul] .seg button,[data-tema=azul] input[type=search]{border-radius:999px}
[data-tema=azul] .grupo{border-radius:20px}
[data-tema=azul] .faixa{position:relative;overflow:hidden;border-radius:22px}
[data-tema=azul] .faixa::after{content:"";position:absolute;left:0;right:0;bottom:0;height:40px;pointer-events:none;opacity:.16;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='40'><path d='M0 20 Q25 8 50 20 T100 20 T150 20 T200 20 V40 H0Z' fill='white'/></svg>") 0 100%/200px 40px repeat-x}
[data-tema=azul] .rip{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:currentColor;opacity:.35;pointer-events:none;animation:pOndinha .55s ease-out forwards}
[data-tema=azul] body>.ceu :is(.k1,.k2){left:0;bottom:0;width:calc(100% + 400px);height:80px;will-change:transform;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='80'><path d='M0 40 Q50 18 100 40 T200 40 T300 40 T400 40 V80 H0Z' fill='%23173b82' fill-opacity='.07'/></svg>") 0 100%/400px 80px repeat-x}
[data-tema=azul] body>.ceu .k1{animation:pOnda 16s linear infinite}
[data-tema=azul] body>.ceu .k2{bottom:16px;opacity:.75;animation:pOnda 26s linear infinite reverse}
[data-tema=azul] body>.ceu .k3{left:0;top:0;width:calc(100% + 400px);height:80px;opacity:.5;transform:scaleY(-1);will-change:transform;animation:pOndaTopo 30s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='80'><path d='M0 40 Q50 18 100 40 T200 40 T300 40 T400 40 V80 H0Z' fill='%23173b82' fill-opacity='.05'/></svg>") 0 100%/400px 80px repeat-x}

/* ---------- Dark: cara de ferramenta, grade técnica, afunda ---------- */
[data-tema=dark] .btn{border-radius:7px;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 0 rgba(0,0,0,.5),0 0 0 1px rgba(143,168,255,.25)}
[data-tema=dark] .btn.sec{box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}
[data-tema=dark] :is(.chip,.chip-conta,.cont,.tag){border-radius:6px}
[data-tema=dark] .seg,[data-tema=dark] input[type=search],[data-tema=dark] .mais{border-radius:8px}
[data-tema=dark] .seg button{border-radius:6px}
[data-tema=dark] .grupo{border-radius:10px}
[data-tema=dark] .thumb{border-radius:6px}
[data-tema=dark] .faixa{position:relative;border-radius:10px}
[data-tema=dark] .faixa::after{content:"";position:absolute;top:6px;right:6px;bottom:6px;left:6px;pointer-events:none;
  background:linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)) 0 0/12px 1.5px no-repeat,linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)) 0 0/1.5px 12px no-repeat,
  linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)) 100% 0/12px 1.5px no-repeat,linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)) 100% 0/1.5px 12px no-repeat,
  linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)) 0 100%/12px 1.5px no-repeat,linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)) 0 100%/1.5px 12px no-repeat,
  linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)) 100% 100%/12px 1.5px no-repeat,linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)) 100% 100%/1.5px 12px no-repeat}
[data-tema=dark] body>.ceu .k1{top:0;left:0;right:0;bottom:0;
  background:linear-gradient(rgba(143,168,255,.07) 1px,transparent 1px) 0 0/120px 120px,linear-gradient(90deg,rgba(143,168,255,.07) 1px,transparent 1px) 0 0/120px 120px,
  linear-gradient(rgba(143,168,255,.035) 1px,transparent 1px) 0 0/24px 24px,linear-gradient(90deg,rgba(143,168,255,.035) 1px,transparent 1px) 0 0/24px 24px}
[data-tema=dark] body>.ceu .k2{left:0;right:0;top:0;height:140px;will-change:transform;background:linear-gradient(transparent,rgba(143,168,255,.07) 48%,rgba(143,168,255,.16) 50%,transparent 52%);animation:pVarre 9s linear infinite}

/* ---------- OLED: só contorno, pixels piscando, acende ---------- */
[data-tema=oled] .btn{background:transparent;color:var(--acc-t);border:1px solid var(--acc);border-radius:999px;letter-spacing:.04em}
[data-tema=oled] .btn.sec{border-color:#3a3a3f;color:var(--sub)}
[data-tema=oled] .chip,[data-tema=oled] .chip-conta,[data-tema=oled] .mais,[data-tema=oled] input[type=search]{background:transparent;border-color:#2a2a2e}
[data-tema=oled] .chip.on{background:transparent;color:var(--acc-t);border-color:var(--acc)}
[data-tema=oled] .seg{background:transparent;border:1px solid #232327}
[data-tema=oled] .seg.abas button.on{background:transparent;color:var(--acc-t);box-shadow:inset 0 0 0 1px var(--acc)}
[data-tema=oled] .grupo{background:transparent;border-color:#1c1c1f}
[data-tema=oled] .faixa{background:transparent;border-color:#2a2a2e}
[data-tema=oled] .av{background:transparent;color:var(--acc-t);box-shadow:inset 0 0 0 1px var(--acc)}
[data-tema=oled] body>.ceu :is(.k1,.k2){top:0;left:0;right:0;bottom:0}
[data-tema=oled] body>.ceu .k1{animation:pPixel 3.2s steps(1) infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><g fill='white' fill-opacity='.35'><rect x='18' y='30' width='2' height='2'/><rect x='96' y='12' width='1.5' height='1.5'/><rect x='60' y='88' width='2' height='2'/><rect x='120' y='118' width='1.5' height='1.5'/></g></svg>") 0 0/140px 140px}
[data-tema=oled] body>.ceu .k2{animation:pPixel 4.1s steps(1) -2s infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='190' height='170'><g fill='white' fill-opacity='.3'><rect x='40' y='60' width='1.5' height='1.5'/><rect x='150' y='30' width='2' height='2'/><rect x='110' y='140' width='1.5' height='1.5'/></g></svg>") 0 0/190px 170px}

/* ---------- Galáxia: cometa orbitando os botões, estrelas cadentes, supernova ---------- */
[data-tema=galaxia] .btn,[data-tema=galaxia] .seg.abas button.on{position:relative;border-radius:999px}
[data-tema=galaxia] .grupo{border-radius:22px}
[data-tema=galaxia] :is(.btn,.seg.abas button.on)::after{content:"";position:absolute;top:-3px;right:-3px;bottom:-3px;left:-3px;border-radius:inherit;padding:2px;pointer-events:none;
  background:conic-gradient(from var(--p-orb,0deg),transparent 0 290deg,rgba(255,255,255,.15) 320deg,#ffffff 352deg,transparent 360deg);
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:pOrbita 3.5s linear infinite}
[data-tema=galaxia] .seg.abas button.on::after{animation-delay:-1.7s}
[data-tema=galaxia] body>.ceu :is(.k1,.k2){left:-40%;width:150px;height:2px;opacity:0;border-radius:2px;background:linear-gradient(90deg,transparent,rgba(230,215,255,.6) 60%,#ffffff);will-change:transform,opacity}
[data-tema=galaxia] body>.ceu .k1{top:10%;animation:pCadente 9s linear infinite}
[data-tema=galaxia] body>.ceu .k2{top:38%;animation:pCadente 12s linear -5s infinite}

/* ---------- Frutiger Aero: gel aqua, bolhas e nuvens, a bolha estoura ---------- */
/* Botões de bolha de sabão: miolo transparente que escurece na borda, brilhos e um aro furta-cor. */
[data-tema=frutiger]{
  --bolha:radial-gradient(circle at 28% 26%,rgba(255,255,255,.95) 0 7%,rgba(255,255,255,0) 17%),radial-gradient(ellipse 40% 30% at 72% 82%,rgba(255,255,255,.55),transparent 70%),radial-gradient(130% 150% at 50% 35%,rgba(150,225,255,.25) 0%,rgba(34,163,230,.75) 62%,rgba(8,104,168,.95) 82%,rgba(200,245,255,.95) 100%);
  --bolha-clara:radial-gradient(circle at 28% 26%,rgba(255,255,255,.95) 0 7%,rgba(255,255,255,0) 17%),radial-gradient(130% 150% at 50% 35%,rgba(255,255,255,.35) 0%,rgba(190,232,255,.55) 70%,rgba(255,255,255,.95) 100%)}
[data-tema=frutiger] body.c2ativa{--bolha:radial-gradient(circle at 28% 26%,rgba(255,255,255,.95) 0 7%,rgba(255,255,255,0) 17%),radial-gradient(ellipse 40% 30% at 72% 82%,rgba(255,255,255,.55),transparent 70%),radial-gradient(130% 150% at 50% 35%,rgba(255,200,240,.25) 0%,rgba(194,90,168,.78) 62%,rgba(122,42,102,.95) 82%,rgba(255,225,245,.95) 100%)}
[data-tema=frutiger] :is(.btn,.chip.on,.seg.abas button.on){position:relative;border-radius:999px;background:var(--bolha);color:#ffffff;text-shadow:0 1px 2px rgba(0,50,100,.45);border-color:transparent;
  box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.85),inset 0 -6px 12px rgba(0,60,120,.3),0 6px 14px rgba(10,100,170,.28)}
[data-tema=frutiger] :is(.btn,.chip.on,.seg.abas button.on)::after{content:"";position:absolute;top:0;right:0;bottom:0;left:0;border-radius:inherit;padding:2px;pointer-events:none;opacity:.7;
  background:conic-gradient(from 200deg,rgba(255,150,220,.9),rgba(150,255,230,.9),rgba(160,200,255,.9),rgba(255,240,160,.8),rgba(255,150,220,.9));
  -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude}
[data-tema=frutiger] .btn{padding-top:14px;padding-bottom:14px}
[data-tema=frutiger] .btn.sec,[data-tema=frutiger] .chip{background:var(--bolha-clara);color:var(--acc-t);text-shadow:none;border-color:transparent;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.95),inset 0 -4px 10px rgba(10,100,170,.12),0 4px 10px rgba(10,80,140,.14)}
[data-tema=frutiger] .chip{position:relative}
[data-tema=frutiger] .chip.filtro.on{background:var(--neg-bg);color:var(--neg);text-shadow:none}
[data-tema=frutiger] .seg,[data-tema=frutiger] .seg button,[data-tema=frutiger] input[type=search]{border-radius:999px}
[data-tema=frutiger] .grupo{border-radius:22px}
[data-tema=frutiger] .faixa{border-radius:24px}
[data-tema=frutiger] body>.ceu .k1{left:0;right:0;top:0;height:calc(100% + 300px);will-change:transform;animation:pSobe300 12s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300'><g fill='none' stroke='white' stroke-opacity='.85'><circle cx='30' cy='60' r='9' stroke-width='1.5'/><circle cx='140' cy='160' r='14' stroke-width='1.5'/><circle cx='90' cy='260' r='6' stroke-width='1.2'/></g><g fill='white' fill-opacity='.8'><circle cx='26' cy='56' r='2.5'/><circle cx='134' cy='154' r='3.5'/><circle cx='88' cy='258' r='1.6'/></g></svg>") 0 0/200px 300px}
[data-tema=frutiger] body>.ceu .k2{left:0;top:5%;height:160px;width:calc(100% + 600px);will-change:transform;animation:pNuvem 70s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='160'><g fill='white' fill-opacity='.75'><ellipse cx='90' cy='90' rx='60' ry='22'/><ellipse cx='120' cy='72' rx='34' ry='26'/><ellipse cx='70' cy='78' rx='26' ry='18'/><ellipse cx='420' cy='50' rx='50' ry='16'/><ellipse cx='445' cy='36' rx='26' ry='18'/></g></svg>") 0 0/600px 160px repeat-x}

/* ---------- Gen X Soft Club: cromo líquido, equalizador, pulso de som ---------- */
[data-tema=softclub] .btn,[data-tema=softclub] .seg.abas button.on{border-radius:999px;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 0 14px rgba(95,211,204,.3)}
[data-tema=softclub] .chip.on{box-shadow:inset 0 1px 0 rgba(255,255,255,.7)}
[data-tema=softclub] .seg,[data-tema=softclub] .seg button,[data-tema=softclub] input[type=search]{border-radius:999px}
[data-tema=softclub] .grupo{border-radius:20px}
[data-tema=softclub] .faixa{border-radius:26px}
[data-tema=softclub] body>.ceu :is(.k4,.k5){left:0;right:0;bottom:0;height:110px;transform-origin:50% 100%;will-change:transform;background:repeating-linear-gradient(90deg,rgba(130,230,225,.16) 0 6px,transparent 6px 12px);
  -webkit-mask:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 100' preserveAspectRatio='none'><path d='M0 100 V60 H12 V30 H24 V70 H36 V20 H48 V50 H60 V10 H72 V40 H84 V65 H96 V25 H108 V55 H120 V100Z'/></svg>") 0 0/240px 100% repeat-x;
  mask:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 100' preserveAspectRatio='none'><path d='M0 100 V60 H12 V30 H24 V70 H36 V20 H48 V50 H60 V10 H72 V40 H84 V65 H96 V25 H108 V55 H120 V100Z'/></svg>") 0 0/240px 100% repeat-x}
[data-tema=softclub] body>.ceu .k4{animation:pEq 1.1s ease-in-out infinite alternate}
[data-tema=softclub] body>.ceu .k5{opacity:.6;-webkit-mask-position:120px 0;mask-position:120px 0;animation:pEq .8s ease-in-out -.4s infinite alternate}
[data-tema=softclub] body>.ceu .k1{left:0;top:42%;height:80px;width:calc(100% + 300px);will-change:transform;animation:pOnda300 10s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='80'><path d='M0 40 Q37.5 10 75 40 T150 40 T225 40 T300 40' fill='none' stroke='%238ce6e1' stroke-opacity='.14' stroke-width='1.5'/><path d='M0 40 Q37.5 64 75 40 T150 40 T225 40 T300 40' fill='none' stroke='%238ce6e1' stroke-opacity='.08' stroke-width='1'/></svg>") 0 0/300px 80px repeat-x}

/* ---------- Gatinhos: orelhinhas, patinhas, gatinho espiando ---------- */
[data-tema=gatinhos] .btn,[data-tema=gatinhos] .seg.abas button.on{position:relative;border-radius:999px}
[data-tema=gatinhos] :is(.btn,.seg.abas button.on)::before,[data-tema=gatinhos] :is(.btn,.seg.abas button.on)::after{content:"";position:absolute;top:-8px;width:16px;height:13px;background:inherit;pointer-events:none;clip-path:polygon(50% 0,100% 100%,0 100%)}
[data-tema=gatinhos] :is(.btn,.seg.abas button.on)::before{left:16px;transform:rotate(-14deg)}
[data-tema=gatinhos] :is(.btn,.seg.abas button.on)::after{right:16px;transform:rotate(14deg)}
[data-tema=gatinhos] .seg.abas button.on::before,[data-tema=gatinhos] .seg.abas button.on::after{top:-7px;width:12px;height:10px}
[data-tema=gatinhos] .faixa{position:relative;border-radius:26px}
[data-tema=gatinhos] .faixa::before,[data-tema=gatinhos] .faixa::after{content:"";position:absolute;top:-13px;width:30px;height:24px;background:var(--orelha);pointer-events:none;clip-path:polygon(50% 0,100% 100%,0 100%)}
[data-tema=gatinhos] .faixa::before{left:22px;transform:rotate(-16deg)}
[data-tema=gatinhos] .faixa::after{right:22px;transform:rotate(16deg)}
[data-tema=gatinhos] .chip{border-width:2px}
[data-tema=gatinhos] .seg,[data-tema=gatinhos] .seg button,[data-tema=gatinhos] input[type=search]{border-radius:999px}
[data-tema=gatinhos] .grupo{border-radius:24px}
[data-tema=gatinhos] .thumb{border-radius:50%}
[data-tema=gatinhos] body>.ceu :is(.k1,.k2){top:0;left:0;right:0;bottom:0;opacity:0;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='260'><g fill='%23e0447f' fill-opacity='.16'><g transform='translate(30 200) rotate(-30)'><ellipse cx='8' cy='10' rx='6' ry='5'/><circle cx='2' cy='3' r='2.2'/><circle cx='7' cy='0' r='2.2'/><circle cx='12' cy='0.5' r='2.2'/><circle cx='16' cy='4' r='2'/></g><g transform='translate(80 140) rotate(-30)'><ellipse cx='8' cy='10' rx='6' ry='5'/><circle cx='2' cy='3' r='2.2'/><circle cx='7' cy='0' r='2.2'/><circle cx='12' cy='0.5' r='2.2'/><circle cx='16' cy='4' r='2'/></g><g transform='translate(130 80) rotate(-30)'><ellipse cx='8' cy='10' rx='6' ry='5'/><circle cx='2' cy='3' r='2.2'/><circle cx='7' cy='0' r='2.2'/><circle cx='12' cy='0.5' r='2.2'/><circle cx='16' cy='4' r='2'/></g><g transform='translate(180 20) rotate(-30)'><ellipse cx='8' cy='10' rx='6' ry='5'/><circle cx='2' cy='3' r='2.2'/><circle cx='7' cy='0' r='2.2'/><circle cx='12' cy='0.5' r='2.2'/><circle cx='16' cy='4' r='2'/></g></g></svg>") 0 0/220px 260px}
[data-tema=gatinhos] body>.ceu .k1{animation:pPatas 6s ease-in-out infinite}
[data-tema=gatinhos] body>.ceu .k2{background-position:110px 130px;animation:pPatas 6s ease-in-out -3s infinite}
[data-tema=gatinhos] body>.ceu .k3{right:14px;bottom:0;width:104px;height:84px;transform:translateY(100%);animation:pEspia 13s ease-in-out infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 104 84'><path d='M14 40 L20 4 L42 22 Z M90 40 L84 4 L62 22 Z' fill='%23ffb3cf' stroke='%233a2230' stroke-width='2.5' stroke-linejoin='round'/><ellipse cx='52' cy='56' rx='44' ry='36' fill='%23ffc9dd' stroke='%233a2230' stroke-width='2.5'/><circle cx='36' cy='50' r='5' fill='%233a2230'/><circle cx='68' cy='50' r='5' fill='%233a2230'/><circle cx='37.5' cy='48.5' r='1.6' fill='white'/><circle cx='69.5' cy='48.5' r='1.6' fill='white'/><ellipse cx='24' cy='62' rx='6' ry='3.5' fill='%23ff8ab6'/><ellipse cx='80' cy='62' rx='6' ry='3.5' fill='%23ff8ab6'/><path d='M49 58 L55 58 L52 62 Z' fill='%23e0447f'/></svg>") center bottom/contain no-repeat}
.pata{position:fixed;z-index:70;width:34px;height:34px;margin:-17px 0 0 -17px;pointer-events:none;animation:pPata .7s ease-out forwards;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'><g fill='%23e0447f'><ellipse cx='17' cy='22' rx='8' ry='6.5'/><circle cx='8' cy='12' r='3.4'/><circle cx='14' cy='7.5' r='3.4'/><circle cx='21' cy='7.5' r='3.4'/><circle cx='27' cy='12' r='3.4'/></g></svg>") center/contain no-repeat}

/* ---------- Dark Aero: brilho verde correndo, anéis pulsando, varredura ---------- */
[data-tema=darkaero] .btn,[data-tema=darkaero] .seg.abas button.on{position:relative;overflow:hidden;border-radius:999px;box-shadow:0 0 14px var(--p-brilho),inset 0 1px 0 rgba(255,255,255,.4)}
[data-tema=darkaero] :is(.btn,.seg.abas button.on)::after{content:"";position:absolute;top:0;bottom:0;left:0;width:40%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(230,255,215,.55),transparent);transform:translateX(-120%);animation:pCorre 3.2s ease-in-out infinite}
[data-tema=darkaero] .btn.sec::after{opacity:.35}
[data-tema=darkaero] .chip.on{box-shadow:0 0 10px var(--p-brilho)}
[data-tema=darkaero] .seg,[data-tema=darkaero] .seg button,[data-tema=darkaero] input[type=search]{border-radius:999px}
[data-tema=darkaero] .grupo{border-radius:18px}
[data-tema=darkaero] body>.ceu :is(.k3,.k4,.k5){border-radius:50%;opacity:0;will-change:transform,opacity;background:radial-gradient(circle,transparent 0 58%,rgba(120,255,60,.38) 62%,rgba(255,255,255,.25) 63.5%,rgba(60,200,20,.12) 66%,transparent 70%)}
[data-tema=darkaero] body>.ceu :is(.k3,.k4){right:-90px;bottom:70px;width:320px;height:320px;animation:pAnel 5s ease-out infinite}
[data-tema=darkaero] body>.ceu .k4{animation-delay:-2.5s}
[data-tema=darkaero] body>.ceu .k5{left:-60px;top:18%;width:200px;height:200px;animation:pAnel 6s ease-out -1s infinite}

/* ---------- Frutiger Metro: sombra dura marcada, círculos girando, afunda ---------- */
[data-tema=metro] .btn{border:2px solid #111;box-shadow:4px 4px 0 #111}
[data-tema=metro] .btn.sec{background:#ffffff;color:#111}
[data-tema=metro] .chip{border:2px solid #111;box-shadow:2px 2px 0 #111}
[data-tema=metro] .seg{border:2px solid #111;box-shadow:3px 3px 0 #111;background:#ffffff}
[data-tema=metro] .seg.abas button.on{box-shadow:none}
[data-tema=metro] .grupo{border-width:2px;box-shadow:6px 6px 0 #111}
[data-tema=metro] .faixa{border-width:2px;box-shadow:6px 6px 0 #ffffff,6px 6px 0 2px #111}
[data-tema=metro] input[type=search]{border:2px solid #111;box-shadow:3px 3px 0 #111}
[data-tema=metro] .mais,[data-tema=metro] .chip-conta{border:2px solid #111;box-shadow:2px 2px 0 #111}
[data-tema=metro] body>.ceu :is(.k1,.k2,.k3){will-change:transform;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><g fill='none' stroke-linecap='round'><circle cx='100' cy='100' r='92' stroke='%23111' stroke-width='10' stroke-dasharray='120 40 30 40'/><circle cx='100' cy='100' r='72' stroke='white' stroke-width='5' stroke-dasharray='60 30'/><circle cx='100' cy='100' r='54' stroke='%23111' stroke-width='4' stroke-dasharray='8 12'/></g></svg>") center/contain no-repeat}
[data-tema=metro] body>.ceu .k1{left:-70px;top:36%;width:260px;height:260px;animation:pGira 40s linear infinite}
[data-tema=metro] body>.ceu .k2{right:-50px;top:6%;width:180px;height:180px;animation:pGira 26s linear infinite reverse}
[data-tema=metro] body>.ceu .k3{right:20px;bottom:40px;width:110px;height:110px;animation:pGira 18s linear infinite}

/* ---------- Reação ao toque ---------- */
[data-tema=dark] .toque{animation:pAfunda .25s ease-out}
[data-tema=oled] .toque{animation:pAcende .45s ease-out}
[data-tema=galaxia] .toque{animation:pSupernova .5s ease-out}
[data-tema=frutiger] .toque{animation:pEstoura .4s ease-out}
[data-tema=softclub] .toque{animation:pPulsoSom .7s ease-out}
[data-tema=gatinhos] .toque{animation:pAmassa .3s ease-out}
[data-tema=darkaero] .toque{animation:pVarreV .45s ease-out}
[data-tema=metro] .toque{animation:pEmpurra .22s ease-out}

@keyframes pOndinha{from{transform:scale(1);opacity:.35}to{transform:scale(22);opacity:0}}
@keyframes pOnda{from{transform:translateX(0)}to{transform:translateX(-400px)}}
@keyframes pOndaTopo{from{transform:scaleY(-1) translateX(0)}to{transform:scaleY(-1) translateX(-400px)}}
@keyframes pOnda300{from{transform:translateX(0)}to{transform:translateX(-300px)}}
@keyframes pVarre{from{transform:translateY(-140px)}to{transform:translateY(110vh)}}
@keyframes pPixel{0%,100%{opacity:.15}30%{opacity:1}31%{opacity:.4}60%{opacity:.9}61%{opacity:.1}}
@keyframes pSobe260{from{transform:translateY(0)}to{transform:translateY(-260px)}}
@keyframes pSobe200{from{transform:translateY(0)}to{transform:translateY(-200px)}}
@keyframes pSobe300{from{transform:translateY(0)}to{transform:translateY(-300px)}}
@keyframes pCorrida{from{transform:translateX(0)}to{transform:translateX(-400px)}}
@keyframes pOrbita{to{--p-orb:360deg}}
@keyframes pCadente{0%{transform:translate(0,0) rotate(25deg);opacity:0}2%{opacity:1}9%{transform:translate(120vw,56vw) rotate(25deg);opacity:0}100%{transform:translate(120vw,56vw) rotate(25deg);opacity:0}}
@keyframes pNuvem{from{transform:translateX(0)}to{transform:translateX(-600px)}}
@keyframes pEq{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
@keyframes pPatas{0%,100%{opacity:0}40%,60%{opacity:1}}
@keyframes pEspia{0%,55%{transform:translateY(100%)}63%,80%{transform:translateY(18%)}66%{transform:translateY(22%) rotate(-4deg)}72%{transform:translateY(18%) rotate(4deg)}88%,100%{transform:translateY(100%)}}
@keyframes pPata{0%{transform:scale(.3) translateY(0);opacity:0}30%{transform:scale(1.15) translateY(-6px);opacity:1}100%{transform:scale(1) translateY(-22px);opacity:0}}
@keyframes pCorre{0%{transform:translateX(-120%)}60%,100%{transform:translateX(300%)}}
@keyframes pAnel{0%{transform:scale(.6);opacity:0}15%{opacity:.9}100%{transform:scale(1.3);opacity:0}}
@keyframes pReflexo{0%,55%{transform:translateX(-150%) skewX(-12deg)}85%,100%{transform:translateX(400%) skewX(-12deg)}}
@keyframes pReflexoR{from{transform:translateX(-150%) skewX(-12deg)}to{transform:translateX(400%) skewX(-12deg)}}
@keyframes pBrilha{from{transform:rotate(0deg) scale(.75);opacity:.45}to{transform:rotate(45deg) scale(1.1);opacity:1}}
@keyframes pPonta{from{filter:brightness(.8)}to{filter:brightness(1.35)}}
@keyframes pRespiraC{from{transform:scale(.96)}to{transform:scale(1.04)}}
@keyframes pLuzC{0%{transform:translateX(-120%)}70%,100%{transform:translateX(320%)}}
@keyframes pEspeta{0%{transform:none}35%{transform:scale(1.06);filter:brightness(1.4)}100%{transform:none;filter:none}}
@keyframes pCoracao{from{transform:perspective(700px) rotateY(0deg)}to{transform:perspective(700px) rotateY(360deg)}}
@keyframes pGira{to{transform:rotate(360deg)}}
@keyframes pAfunda{0%{transform:none}40%{transform:translateY(1px) scale(.97);filter:brightness(.85)}100%{transform:none;filter:none}}
@keyframes pAcende{0%{box-shadow:0 0 0 0 rgba(255,255,255,0)}25%{box-shadow:0 0 18px 2px rgba(255,255,255,.5);filter:brightness(1.6)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0);filter:none}}
@keyframes pQuica{0%{transform:none}25%{transform:translateY(2px) scale(1.05,.92)}50%{transform:translateY(-5px) scale(.97,1.04)}75%{transform:translateY(0) scale(1.01,.99)}100%{transform:none}}
@keyframes pArranca{0%{transform:none}30%{transform:translateX(-3px)}60%{transform:translateX(7px) skewX(-8deg)}100%{transform:none}}
@keyframes pSupernova{0%{box-shadow:0 0 0 0 rgba(208,187,255,.85);filter:brightness(1.8)}100%{box-shadow:0 0 0 18px rgba(208,187,255,0);filter:none}}
@keyframes pEstoura{0%{transform:scale(1)}35%{transform:scale(1.14,1.08);filter:brightness(1.2)}55%{transform:scale(.9,.95);opacity:.75}80%{transform:scale(1.03);opacity:1}100%{transform:scale(1);filter:none}}
@keyframes pPulsoSom{0%{box-shadow:0 0 0 0 rgba(95,211,204,.6),0 0 0 0 rgba(95,211,204,.35)}100%{box-shadow:0 0 0 10px rgba(95,211,204,0),0 0 0 22px rgba(95,211,204,0)}}
@keyframes pAmassa{0%{transform:none}40%{transform:scale(.93,1.05) rotate(-2deg)}70%{transform:scale(1.03,.97) rotate(1deg)}100%{transform:none}}
@keyframes pVarreV{0%{filter:none}30%{filter:brightness(1.5);box-shadow:0 0 24px rgba(120,255,60,.75)}100%{filter:none}}
@keyframes pMetal{0%{filter:brightness(1.7)}25%{transform:translateX(-2px)}50%{transform:translateX(2px)}75%{transform:translateX(-1px)}100%{transform:none;filter:none}}
@keyframes pEmpurra{0%{transform:none}40%{transform:translate(3px,3px);box-shadow:0 0 0 #111}100%{transform:none}}

@media (prefers-reduced-motion:reduce){
  body>.ceu>span,body>.ceu i,.toque,.rip,.pata,:is(.btn,.seg button,.faixa)::after{animation:none!important}
  .rip,.pata{display:none}
}
`;

// ---------- v6.19: temas novos, melhorias e botões novos (protótipos dos lotes 1 a 4 e da rodada de botões) ----------
// CSS igual ao aprovado nos protótipos. X só reforça a prioridade (especificidade) das regras
// que precisam passar por cima das regras antigas do mesmo tema; a classe .th0 nunca é usada.
const X = ':root:not(.th0)';
const CSS_NOVOS = `

/* =====================================================================
   TEMAS · LOTE 1 (novos): Angel Core, Romantic Gothic,
   Moonlight e Floresta Escura. Mesmo molde dos Temáticos da v6.4:
   tokens de cor + tokens de forma (--r-*, --clip-*) + camadas .ceu k1..k5.
   Animação de tela cheia só com transform/opacity; sem backdrop-filter.
   Laranja = paga (--warn), verde = ganha (--pos), vermelho = desce (--neg).
   ===================================================================== */

/* ---------- Angel Core: celestial, branco, prata e pérola ---------- */
[data-tema=angel]{color-scheme:light;--body-fundo:transparent;
  --topo:#e4ebfb;--bg:#f6f7fc;--card:rgba(255,255,255,.95);--card2:#eef0f8;--borda:#e2e5f1;--card-borda:#d8dcec;--fg:#262b44;--sub:#6b7190;
  --acc:#8e9ac8;--acc-fundo:linear-gradient(165deg,#ffffff 0%,#eef0f8 30%,#d3d8ea 55%,#f7f8fd 75%,#c4cbe2 100%);--acc-press:#c4cbe2;--on-acc:#262b44;--acc-t:#5560a3;--rap:#3f68b3;
  --heroi:radial-gradient(ellipse 70% 60% at 50% -10%,rgba(255,255,255,.95),transparent 70%),linear-gradient(180deg,#d9e2f8 0%,#eef1fb 70%,#f8f6fb 100%);
  --heroi-borda:#d2d8ea;--on-heroi:#262b44;--heroi-linha:rgba(38,43,68,.12);--heroi-aviso:#a8541a;
  --pos:#1d8656;--pos-bg:#e2f3ea;--warn:#b05a16;--warn-bg:#fbeee0;--neg:#c2365a;--neg-bg:#fbe5ec;
  --on-status:#ffffff;--dou-bg:#eef0fa;--rec-bg:#ecf7f1;
  --sombra:0 1px 2px rgba(40,50,90,.05),0 8px 24px rgba(90,100,160,.10);--vidro:none;--folha:#ffffff;
  --btn-sombra:inset 0 1px 0 #ffffff,inset 0 -3px 7px rgba(120,130,180,.28),0 4px 14px rgba(120,135,200,.28);
  --c2-btn-sombra:inset 0 1px 0 #ffffff,inset 0 -3px 7px rgba(150,110,190,.28),0 4px 14px rgba(150,120,210,.28);
  --r-btn:999px;--r-chip:999px;--r-card:22px;--r-heroi:26px;--r-thumb:50%;--r-seg:999px;--r-seg-b:999px;--r-campo:999px;
  --f-titulo:"Cormorant Garamond",Georgia,serif;--t-estilo:italic;--t-peso:600;--t-tam:42px;--t-esp:0;--t-cor:#2f3660;--t-sombra:0 0 18px rgba(255,255,255,.95);
  --ceu:radial-gradient(ellipse 90% 45% at 50% -8%,#ffffff,transparent 70%),linear-gradient(180deg,#dbe4fa 0%,#ecf0fb 40%,#f6f7fc 75%);
  --c2:#9a7fd1;--c2-fundo:linear-gradient(165deg,#ffffff 0%,#f1ebfb 30%,#dccff2 55%,#faf7fd 75%,#cdbbe8 100%);--c2-press:#cdbbe8;--c2-on:#2e2444;--c2-t:#7353b5;--c2-bg:#f2ecfb;
  --c2-heroi:radial-gradient(ellipse 70% 60% at 50% -10%,rgba(255,255,255,.95),transparent 70%),linear-gradient(180deg,#e6dcf8 0%,#f3eefb 70%,#faf7fc 100%);--c2-heroi-borda:#e0d4f0;--c2-on-heroi:#2e2444}

/* ---------- Romantic Gothic: vitoriano, rosas vermelhas, renda, velas e lacre ---------- */
[data-tema=gotico]{color-scheme:dark;--body-fundo:transparent;
  --topo:#24080f;--bg:#0c0507;--card:#170b0f;--card-mold:linear-gradient(170deg,#1f0e14 0%,#120709 60%,#1a0a10 100%);--card2:#241219;--borda:rgba(235,200,205,.12);--card-borda:rgba(220,160,170,.28);--fg:#f6ebe7;--sub:#bda0a2;
  --acc:#a8142d;--acc-fundo:linear-gradient(180deg,#d1384f 0%,#a8142d 45%,#7a0c1f 100%);--acc-press:#7a0c1f;--on-acc:#fff3f0;--acc-t:#ecd2d6;--rap:#c9b6dc;
  --heroi:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(255,150,160,.2),transparent 70%),linear-gradient(170deg,#3a0d18 0%,#1e070d 55%,#120508 100%);
  --heroi-borda:transparent;--on-heroi:#fbefeb;--heroi-linha:rgba(230,200,205,.18);--heroi-aviso:#f3a36e;
  --pos:#93dcb0;--pos-bg:#13261c;--warn:#f3a36e;--warn-bg:#2e1a0f;--neg:#ff5f6d;--neg-bg:#3a0f16;
  --on-status:#0c0507;--dou-bg:rgba(168,20,45,.14);--rec-bg:rgba(147,220,176,.07);
  --sombra:none;--vidro:none;--folha:#170b0f;
  --mold-borda:linear-gradient(135deg,#f2eef0 0%,#7d7378 28%,#d9d2d5 52%,#4f464b 78%,#c9c0c4 100%);
  --c2-mold-borda:linear-gradient(135deg,#f2eef0 0%,#7d7378 28%,#d9d2d5 52%,#4f464b 78%,#c9c0c4 100%);
  --clip-btn:polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px);
  --clip-chip:polygon(5px 0,calc(100% - 5px) 0,100% 5px,100% calc(100% - 5px),calc(100% - 5px) 100%,5px 100%,0 calc(100% - 5px),0 5px);
  --clip-card:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0 calc(100% - 10px),0 10px);
  --clip-heroi:polygon(0 16px,38% 16px,50% 0,62% 16px,100% 16px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px));
  --clip-seg:polygon(8px 0,calc(100% - 8px) 0,100% 8px,100% calc(100% - 8px),calc(100% - 8px) 100%,8px 100%,0 calc(100% - 8px),0 8px);
  --clip-thumb:polygon(7px 0,calc(100% - 7px) 0,100% 7px,100% calc(100% - 7px),calc(100% - 7px) 100%,7px 100%,0 calc(100% - 7px),0 7px);
  --clip-mini:polygon(4px 0,calc(100% - 4px) 0,100% 4px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px),0 4px);
  --clip-mini-h:polygon(0 5px,40% 5px,50% 0,60% 5px,100% 5px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px));
  --f-titulo:"Pinyon Script",Georgia,serif;--t-estilo:normal;--t-peso:400;--t-tam:46px;--t-esp:0;--t-cor:#f7e4e2;--t-sombra:0 2px 12px rgba(200,20,50,.45);
  --ceu:radial-gradient(ellipse 80% 40% at 50% -8%,rgba(200,40,70,.22),transparent 70%),radial-gradient(ellipse 60% 50% at 10% 70%,rgba(120,10,30,.25),transparent 70%),linear-gradient(180deg,#24080f 0%,#12060a 55%,#0a0406 100%);
  --c2:#6a2a7a;--c2-fundo:linear-gradient(180deg,#9a4cab 0%,#6a2a7a 45%,#4a1a56 100%);--c2-press:#4a1a56;--c2-on:#fbf0ff;--c2-t:#e3c6ee;--c2-bg:rgba(106,42,122,.18);
  --c2-heroi:radial-gradient(ellipse 60% 50% at 50% 0%,rgba(220,160,255,.18),transparent 70%),linear-gradient(170deg,#2c0f38 0%,#170820 55%,#0e0514 100%)}

/* ---------- Moonlight: azul noturno, lilás e brilho lunar ---------- */
[data-tema=luar]{color-scheme:dark;--body-fundo:transparent;
  --topo:#151a3e;--bg:#060819;--card:rgba(16,19,48,.93);--card2:rgba(34,38,82,.9);--borda:rgba(190,195,255,.13);--card-borda:rgba(200,190,255,.24);--fg:#eef0ff;--sub:#a2a7cf;
  --acc:#a48bff;--acc-fundo:linear-gradient(165deg,#f1edff 0%,#c9b9ff 40%,#9b82f2 75%,#7d63d9 100%);--acc-press:#7d63d9;--on-acc:#14113a;--acc-t:#cbbdff;--rap:#9ed2ff;
  --heroi:radial-gradient(circle at 89% 30%,#fbfaff 0 14px,rgba(236,230,255,.55) 15px,rgba(200,185,255,.18) 28px,transparent 50px),radial-gradient(ellipse 90% 70% at 50% 120%,rgba(140,110,240,.4),transparent 70%),linear-gradient(170deg,#1f2560 0%,#11143a 60%,#0b0d28 100%);
  --heroi-borda:rgba(205,195,255,.35);--on-heroi:#f2f1ff;--heroi-linha:rgba(210,200,255,.18);
  --pos:#8fe3be;--pos-bg:rgba(30,110,80,.28);--warn:#f5b27a;--warn-bg:rgba(140,80,30,.3);--neg:#ff8fae;--neg-bg:rgba(150,30,70,.3);
  --on-status:#060819;--dou-bg:rgba(164,139,255,.12);--rec-bg:rgba(143,227,190,.08);
  --sombra:0 0 0 1px rgba(190,180,255,.05),0 10px 30px rgba(0,0,20,.5);--vidro:none;--folha:#10133a;
  --btn-sombra:inset 0 1px 0 rgba(255,255,255,.85),0 0 18px rgba(170,150,255,.45);
  --c2-btn-sombra:inset 0 1px 0 rgba(255,255,255,.85),0 0 18px rgba(120,200,255,.45);
  --r-btn:999px;--r-chip:999px;--r-card:20px;--r-heroi:24px;--r-thumb:50%;--r-seg:999px;--r-seg-b:999px;--r-campo:999px;
  --f-titulo:"Italiana",Georgia,serif;--t-peso:400;--t-tam:38px;--t-esp:.04em;--t-cor:#f1eeff;--t-sombra:0 0 18px rgba(200,185,255,.55);
  --ceu:radial-gradient(ellipse 80% 50% at 80% 0%,rgba(150,130,255,.22),transparent 70%),linear-gradient(180deg,#151a3e 0%,#0b0e2a 45%,#060819 80%);
  --c2:#7cc6ec;--c2-fundo:linear-gradient(165deg,#eefaff 0%,#b8e4f8 40%,#6fb7e0 75%,#4a93c2 100%);--c2-press:#4a93c2;--c2-on:#061a28;--c2-t:#a8dcf4;--c2-bg:rgba(124,198,236,.12);
  --c2-heroi:radial-gradient(circle at 89% 30%,#fbfdff 0 14px,rgba(225,245,255,.55) 15px,rgba(170,220,255,.18) 28px,transparent 50px),radial-gradient(ellipse 90% 70% at 50% 120%,rgba(90,170,230,.38),transparent 70%),linear-gradient(170deg,#13294a 0%,#0b1834 60%,#07102a 100%);--c2-heroi-borda:rgba(180,225,255,.35)}

/* ---------- Floresta Escura: floresta de pinheiros em preto e branco com neblina (feita só com código), tudo em cinza frio ---------- */
[data-tema=floresta]{color-scheme:dark;--body-fundo:transparent;
  --topo:#0c0d0c;--bg:#050605;--card:rgba(10,12,11,.80);--card2:rgba(30,33,31,.84);--borda:rgba(220,228,224,.10);--card-borda:rgba(220,228,224,.16);--fg:#e6eae7;--sub:#9ba39f;
  --acc:#c9cfcb;--acc-fundo:linear-gradient(180deg,#e2e6e3 0%,#bcc3bf 55%,#9aa29d 100%);--acc-press:#8e9691;--on-acc:#0b0d0c;--acc-t:#d6ddd9;--rap:#a9bcd6;
  --heroi:radial-gradient(ellipse 80% 70% at 50% 0%,rgba(215,225,220,.14),transparent 70%),linear-gradient(180deg,rgba(16,19,17,.66),rgba(6,7,6,.82));
  --heroi-borda:rgba(220,228,224,.2);--on-heroi:#eef1ef;--heroi-linha:rgba(220,228,224,.14);
  --pos:#8fe0a6;--pos-bg:rgba(30,80,45,.45);--warn:#f0aa72;--warn-bg:rgba(90,55,20,.45);--neg:#ff8c98;--neg-bg:rgba(95,25,35,.45);
  --on-status:#050605;--dou-bg:rgba(220,228,224,.06);--rec-bg:rgba(143,224,166,.07);
  --sombra:0 12px 30px rgba(0,0,0,.6);--vidro:none;--folha:#0e100f;
  --btn-sombra:inset 0 1px 0 rgba(255,255,255,.55),0 4px 16px rgba(0,0,0,.55);
  --c2-btn-sombra:inset 0 1px 0 rgba(255,255,255,.55),0 4px 16px rgba(0,0,0,.55);
  --r-btn:10px;--r-chip:8px;--r-card:12px;--r-heroi:14px;--r-thumb:8px;--r-seg:10px;--r-seg-b:8px;--r-campo:10px;--r-mais:10px;
  --f-titulo:"Spectral SC",Georgia,serif;--t-peso:500;--t-tam:32px;--t-esp:.05em;--t-cor:#e4e8e5;--t-sombra:0 2px 18px rgba(0,0,0,.9);
  --ceu:radial-gradient(ellipse 45% 32% at 50% 52%,rgba(160,166,162,.38),transparent 70%),radial-gradient(ellipse 80% 40% at 50% 60%,rgba(110,116,112,.22),transparent 72%),linear-gradient(180deg,#0b0c0b 0%,#191b1a 45%,#141615 70%,#070807 100%);
  --c2:#8a9cbd;--c2-fundo:linear-gradient(180deg,#e0e6f1 0%,#b4c0d6 55%,#8c9bb8 100%);--c2-press:#7b8aa8;--c2-on:#0b1220;--c2-t:#bccae6;--c2-bg:rgba(138,156,189,.14);
  --c2-heroi:radial-gradient(ellipse 80% 70% at 50% 0%,rgba(190,205,235,.16),transparent 70%),linear-gradient(180deg,rgba(14,18,28,.68),rgba(5,7,12,.84));--c2-heroi-borda:rgba(190,205,235,.22)}

/* ---------- Formas comuns aos 5 (mesmas regras dos Temáticos, com os tokens de cada um) ---------- */
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) h1{letter-spacing:var(--t-esp,-.02em);color:var(--t-cor,var(--fg))}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) :is(.secao>h2,details.bloco>summary){letter-spacing:var(--t-esp,-.01em)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) .btn{position:relative;border-radius:var(--r-btn,12px);box-shadow:var(--btn-sombra,none)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) .btn.sec{box-shadow:none}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) .seg.abas button.on{position:relative;box-shadow:var(--btn-sombra,none)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) :is(.chip,.chip-conta,.cont,.tag,.faixa-conta){border-radius:var(--r-chip,999px)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) :is(.grupo,.vazio,.an-grupo,.av-proposta,.veredito,.av-resumo,.dia-card,.dia-lucro,.ti-graf,.ct-c,.ti-bloco){border-radius:var(--r-card,16px)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) .faixa{position:relative;overflow:hidden;isolation:isolate;border-radius:var(--r-heroi,18px)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) .folha{border-radius:var(--r-card,16px);clip-path:var(--clip-card,none)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) input[type=search]{border-radius:var(--r-campo,12px);clip-path:var(--clip-seg,none)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) .seg{border-radius:var(--r-seg,12px)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) .seg button{border-radius:var(--r-seg-b,9px)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) .thumb{border-radius:var(--r-thumb,12px);clip-path:var(--clip-thumb,none)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) .mais{border-radius:var(--r-mais,50%)}
:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) :is(.ti-voltar,.ti-acao){border-radius:var(--r-btn,14px)}

/* ---------- Angel Core: detalhes ---------- */
/* Botões de pérola com um brilho que passa; asas e auréola no value; penas caindo. */
[data-tema=angel] :is(.btn,.seg.abas button.on){overflow:hidden}
[data-tema=angel] :is(.btn,.seg.abas button.on)::after{content:"";position:absolute;top:0;bottom:0;left:0;width:38%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,236,250,.85) 45%,rgba(220,238,255,.8) 55%,transparent);transform:translateX(-160%) skewX(-18deg);animation:thPerola 5.5s ease-in-out infinite}
[data-tema=angel] .seg.abas button.on::after{animation-delay:-2.6s}
[data-tema=angel] .btn.sec{background:linear-gradient(180deg,#ffffff,#f3f4fa);border-color:#d8dcec}
[data-tema=angel] .btn.sec::after{opacity:.5}
[data-tema=angel] .chip{background:linear-gradient(180deg,#ffffff,#f2f3fa);border-color:#dde1ef}
[data-tema=angel] .chip.on{box-shadow:var(--btn-sombra)}
[data-tema=angel] .chip.filtro.on{background:var(--neg-bg);box-shadow:none}
[data-tema=angel] :is(.grupo,.an-grupo,.av-proposta,.veredito){outline:1px solid #e3e6f2;outline-offset:3px}
[data-tema=angel] .thumb{box-shadow:0 0 0 2px #ffffff,0 0 0 3px #d6dbec}
[data-tema=angel] .faixa{padding-top:32px}
[data-tema=angel] .faixa::after{content:"";position:absolute;left:50%;top:6px;width:120px;height:24px;transform:translateX(-50%);pointer-events:none;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 24'><g fill='%23ffffff' stroke='%23aeb6d4' stroke-width='.8' stroke-linejoin='round'><path d='M50 15 C42 6 26 3 8 6 C16 9 13 11 6 12 C15 14 12 16 8 18 C22 19 38 18 50 15Z'/><path d='M70 15 C78 6 94 3 112 6 C104 9 107 11 114 12 C105 14 108 16 112 18 C98 19 82 18 70 15Z'/></g><ellipse cx='60' cy='9' rx='9' ry='3.2' fill='none' stroke='%23c4cbe2' stroke-width='1.8'/><ellipse cx='60' cy='9' rx='9' ry='3.2' fill='none' stroke='%23ffffff' stroke-width='.7'/><circle cx='60' cy='17' r='1.6' fill='%23aeb6d4'/></svg>") center/contain no-repeat}
[data-tema=angel] body>.ceu .k1{top:-10%;left:-30%;right:-30%;height:85%;opacity:.7;will-change:opacity;
  background:repeating-conic-gradient(from 150deg at 50% -12%,rgba(255,255,255,0) 0deg,rgba(255,255,255,.75) 3deg,rgba(255,255,255,0) 7deg,rgba(255,255,255,0) 14deg);
  -webkit-mask-image:linear-gradient(#000,transparent 80%);mask-image:linear-gradient(#000,transparent 80%);animation:thRaios 7s ease-in-out infinite alternate}
[data-tema=angel] body>.ceu :is(.k2,.k3){left:0;width:calc(100% + 600px);height:180px;will-change:transform;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='180'><g fill='white' fill-opacity='.9'><ellipse cx='100' cy='120' rx='90' ry='26'/><ellipse cx='140' cy='98' rx='50' ry='34'/><ellipse cx='80' cy='104' rx='36' ry='24'/><ellipse cx='420' cy='70' rx='70' ry='20'/><ellipse cx='450' cy='54' rx='36' ry='24'/><ellipse cx='395' cy='60' rx='24' ry='16'/></g></svg>") 0 0/600px 180px repeat-x}
[data-tema=angel] body>.ceu .k2{top:34%;opacity:.9;animation:thNuvem600 95s linear infinite}
[data-tema=angel] body>.ceu .k3{bottom:-30px;opacity:1;animation:thNuvem600 140s linear -40s infinite reverse}
[data-tema=angel] body>.ceu .k4{left:0;right:0;top:-400px;height:calc(100% + 400px);will-change:transform;animation:thCai 28s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='400'><defs><g id='p'><path d='M8 0 Q16 12 11 30 L8 40 L5 30 Q0 12 8 0Z'/><path d='M8 5 V40' fill='none'/></g></defs><g fill='white' stroke='%23b9c1de' stroke-width='.9'><use href='%23p' transform='translate(40 40) rotate(25)'/><use href='%23p' transform='translate(170 160) rotate(-35) scale(.8)'/><use href='%23p' transform='translate(90 290) rotate(60) scale(.65)'/></g></svg>") 0 0/240px 400px}
[data-tema=angel] body>.ceu .k5{top:0;left:0;right:0;bottom:0;animation:thPisca2 3.2s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='220'><g fill='%23aab5e0'><path d='M30 30 l1.6 5.4 5.4 1.6 -5.4 1.6 -1.6 5.4 -1.6 -5.4 -5.4 -1.6 5.4 -1.6z'/><path d='M140 120 l1.2 4 4 1.2 -4 1.2 -1.2 4 -1.2 -4 -4 -1.2 4 -1.2z'/><circle cx='90' cy='190' r='1.3'/><circle cx='160' cy='40' r='1'/></g></svg>") 0 0/180px 220px}

/* ---------- Romantic Gothic: moldura de prata antiga (recortada) ---------- */
[data-tema=gotico] :is(.btn,.seg.abas button.on){--clip:var(--clip-btn);--miolo:var(--acc-fundo)}
[data-tema=gotico] .btn.sec{--miolo:var(--card2)}
[data-tema=gotico] :is(.chip,.chip-conta){--clip:var(--clip-chip);--miolo:var(--card)}
[data-tema=gotico] .chip.on{--miolo:var(--acc-fundo)}
[data-tema=gotico] .chip.filtro.on{--miolo:var(--neg-bg)}
[data-tema=gotico] .faixa{--clip:var(--clip-heroi);--miolo:var(--heroi)}
[data-tema=gotico] :is(.grupo,.an-grupo,.av-proposta,.veredito,.dia-card,.dia-lucro){--clip:var(--clip-card);--miolo:var(--card-mold,var(--card))}
[data-tema=gotico] .seg{--clip:var(--clip-seg);--miolo:var(--card2)}
[data-tema=gotico] .amostra .a-h{--clip:var(--clip-mini-h);--miolo:var(--heroi)}
[data-tema=gotico] .amostra .a-l.c{--clip:var(--clip-mini);--miolo:var(--acc-fundo)}
[data-tema=gotico] :is(.btn,.chip,.chip-conta,.faixa,.grupo,.an-grupo,.av-proposta,.veredito,.dia-card,.dia-lucro,.seg,.seg.abas button.on,.amostra .a-h,.amostra .a-l.c){position:relative;isolation:isolate;clip-path:var(--clip);background:var(--mold-borda)!important;border-color:transparent!important;box-shadow:none!important;border-radius:0!important}
[data-tema=gotico] :is(.btn,.chip,.chip-conta,.faixa,.grupo,.an-grupo,.av-proposta,.veredito,.dia-card,.dia-lucro,.seg,.seg.abas button.on,.amostra .a-h,.amostra .a-l.c)::before{content:"";position:absolute;top:1.5px;right:1.5px;bottom:1.5px;left:1.5px;clip-path:var(--clip);background:var(--miolo);z-index:-1}
[data-tema=gotico] :is(.amostra .a-h,.amostra .a-l.c)::before{top:1px;right:1px;bottom:1px;left:1px}
[data-tema=gotico] :is(.tag,.cont){clip-path:var(--clip-chip);border-radius:0}
/* Romantic Gothic: detalhes. Rosa no alto do value, renda nas listas, lacre no ⋯, rosas, velas e pétalas. */
[data-tema=gotico] :is(.secao>h2,details.bloco>summary){font-family:"Cormorant Garamond",Georgia,serif;font-style:normal;font-weight:600;font-size:22px}
[data-tema=gotico] .btn{letter-spacing:.04em}
[data-tema=gotico] .faixa{padding-top:30px}
[data-tema=gotico] .faixa::after{content:"";position:absolute;left:50%;top:3px;width:132px;height:22px;transform:translateX(-50%);pointer-events:none;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 140 22'><g fill='none' stroke='%23d9cfd3' stroke-width='1' stroke-linecap='round'><path d='M4 13 H46 M94 13 H136'/><path d='M46 13 C52 5 58 6 58 11 C58 15 53 15 53 12'/><path d='M94 13 C88 5 82 6 82 11 C82 15 87 15 87 12'/><path d='M46 13 C52 21 60 20 62 16 M94 13 C88 21 80 20 78 16'/></g><g fill='%234d6b52'><path d='M61 16 Q64 21 66 17Z'/><path d='M79 16 Q76 21 74 17Z'/></g><circle cx='70' cy='12' r='7.5' fill='%23b3132e' stroke='%23e8a0aa' stroke-width='.6'/><path d='M70 7 C74.5 8 74.5 13 70 13.4 C66.6 13.4 66.6 10 70 10 C72 10 72 12 70 12' fill='none' stroke='%23ffd6dc' stroke-width='.9'/></svg>") center/contain no-repeat}
[data-tema=gotico] :is(.grupo,.an-grupo)::after{content:"";position:absolute;left:14px;right:14px;bottom:3px;height:6px;pointer-events:none;opacity:.8;
  background:radial-gradient(circle at 6px 0,transparent 0 3.5px,rgba(236,210,214,.3) 4px 5px,transparent 5.5px) 0 0/12px 6px repeat-x}
[data-tema=gotico] .mais{border:0;border-radius:47% 53% 50% 50% / 52% 48% 52% 48%;background:radial-gradient(circle at 38% 32%,#e0485e 0,#a8142d 45%,#6e0a1c 100%);color:#ffe9ec;
  box-shadow:inset 0 -3px 6px rgba(0,0,0,.45),inset 0 2px 3px rgba(255,180,190,.35),0 3px 8px rgba(0,0,0,.5)}
[data-tema=gotico] .thumb{box-shadow:none}
[data-tema=gotico] body>.ceu .k1{top:0;left:0;right:0;bottom:0;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='110' height='140' viewBox='0 0 110 140'><g fill='none' stroke='%23ff9fb0' stroke-opacity='.075' stroke-width='1.1'><path d='M55 10 C80 30 80 55 55 70 C30 55 30 30 55 10Z'/><path d='M55 70 C80 90 80 115 55 130'/><path d='M55 70 C30 90 30 115 55 130'/><circle cx='55' cy='40' r='8'/><circle cx='55' cy='40' r='3.5'/><path d='M0 70 C20 80 20 100 0 110 M110 70 C90 80 90 100 110 110'/></g></svg>") 0 0/110px 140px;
  -webkit-mask-image:linear-gradient(transparent,#000 12%,#000 75%,transparent);mask-image:linear-gradient(transparent,#000 12%,#000 75%,transparent)}
[data-tema=gotico] body>.ceu .k2{top:0;left:0;right:0;bottom:0;opacity:.85;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><g fill='none' stroke='%23401a22' stroke-width='3' stroke-linecap='round'><path d='M0 190 C40 170 60 130 70 90 C76 60 100 40 130 34'/><path d='M40 168 C30 150 20 148 8 150'/><path d='M66 110 C84 110 96 120 100 136'/></g><g fill='%23531420'><path d='M18 152 q-10 -8 -2 -14 q8 4 2 14z'/><path d='M100 136 q10 -6 14 4 q-8 4 -14 -4z'/><path d='M118 38 q2 -12 14 -10 q-2 10 -14 10z'/></g><g transform='translate(70 92)'><circle r='22' fill='%236e0d1e'/><path d='M-14 -4 C-10 -18 10 -18 14 -4 C10 8 -10 8 -14 -4Z' fill='%238f1428'/><path d='M-7 -6 C-4 -13 6 -13 8 -5 C5 1 -4 1 -7 -6Z' fill='%23b01c34'/><path d='M-2 -7 C0 -10 4 -9 3 -6' stroke='%23e06070' fill='none' stroke-width='1.2'/></g><g transform='translate(140 30) scale(.7)'><circle r='22' fill='%236e0d1e'/><path d='M-14 -4 C-10 -18 10 -18 14 -4 C10 8 -10 8 -14 -4Z' fill='%238f1428'/><path d='M-7 -6 C-4 -13 6 -13 8 -5 C5 1 -4 1 -7 -6Z' fill='%23b01c34'/></g></svg>") left -34px bottom -24px/230px 230px no-repeat,
  url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><g transform='rotate(180 100 100)'><g fill='none' stroke='%23401a22' stroke-width='3' stroke-linecap='round'><path d='M0 190 C40 170 60 130 70 90 C76 60 100 40 130 34'/><path d='M66 110 C84 110 96 120 100 136'/></g><g fill='%23531420'><path d='M100 136 q10 -6 14 4 q-8 4 -14 -4z'/></g><g transform='translate(70 92)'><circle r='22' fill='%236e0d1e'/><path d='M-14 -4 C-10 -18 10 -18 14 -4 C10 8 -10 8 -14 -4Z' fill='%238f1428'/><path d='M-7 -6 C-4 -13 6 -13 8 -5 C5 1 -4 1 -7 -6Z' fill='%23b01c34'/></g></g></svg>") right -40px top 70px/180px 180px no-repeat}
[data-tema=gotico] body>.ceu :is(.k3,.k4){top:28%;width:220px;height:380px;border-radius:50%;will-change:opacity;background:radial-gradient(ellipse at 50% 50%,rgba(255,130,110,.16),rgba(255,90,90,.06) 45%,transparent 70%)}
[data-tema=gotico] body>.ceu .k3{left:-120px;animation:thVela 2.6s linear infinite}
[data-tema=gotico] body>.ceu .k4{right:-120px;top:52%;animation:thVela 3.1s linear -1.2s infinite}
[data-tema=gotico] body>.ceu .k5{left:0;right:0;top:-400px;height:calc(100% + 400px);opacity:.75;will-change:transform;animation:thCai 36s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='400'><g fill='%239a1730'><ellipse cx='40' cy='60' rx='7' ry='4' transform='rotate(30 40 60)'/><ellipse cx='170' cy='170' rx='6' ry='3.5' transform='rotate(-40 170 170)'/><ellipse cx='100' cy='300' rx='5' ry='3' transform='rotate(70 100 300)'/></g><g fill='%23c62a44' fill-opacity='.7'><ellipse cx='42' cy='59' rx='3' ry='1.6' transform='rotate(30 42 59)'/><ellipse cx='171' cy='169' rx='2.6' ry='1.4' transform='rotate(-40 171 169)'/></g></svg>") 0 0/220px 400px}

/* ---------- Moonlight: detalhes ---------- */
/* Fases da lua ao lado do título, lua cheia no value, lua grande no céu, nuvens finas e reflexo na água. */
[data-tema=luar] h1::after{content:"";display:inline-block;width:60px;height:12px;margin-left:12px;vertical-align:middle;opacity:.85;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 70 14'><g fill='%23e3dbff'><circle cx='7' cy='7' r='5' fill='none' stroke='%23e3dbff' stroke-opacity='.6' stroke-width='1'/><path d='M21 2 A5 5 0 0 1 21 12 A3 5 0 0 0 21 2Z'/><path d='M35 2 A5 5 0 0 1 35 12Z'/><path d='M49 2 A5 5 0 0 1 49 12 A3 5 0 0 1 49 2Z'/><circle cx='63' cy='7' r='5'/></g></svg>") center/contain no-repeat}
[data-tema=luar] .faixa::after{content:"";position:absolute;top:0;left:0;right:0;bottom:0;z-index:-1;pointer-events:none;animation:thPisca2 3s ease-in-out infinite alternate;
  background:radial-gradient(1px 1px at 14% 22%,#ffffff,transparent),radial-gradient(1.4px 1.4px at 38% 12%,#e3dbff,transparent),radial-gradient(1px 1px at 62% 70%,#ffffff,transparent),radial-gradient(1.2px 1.2px at 76% 14%,#d6ecff,transparent),radial-gradient(1px 1px at 24% 80%,#ffffff,transparent)}
[data-tema=luar] .chip.on{box-shadow:var(--btn-sombra)}
[data-tema=luar] .chip.filtro.on{box-shadow:none}
[data-tema=luar] :is(.grupo,.an-grupo,.av-proposta){box-shadow:inset 1px 1px 0 rgba(225,215,255,.12),var(--sombra)}
[data-tema=luar] .thumb{box-shadow:0 0 0 1.5px rgba(210,200,255,.35),0 0 10px rgba(170,150,255,.25)}
[data-tema=luar] body>.ceu .k1{right:-60px;top:4%;width:230px;height:230px;border-radius:50%;opacity:.92;will-change:opacity;animation:thLuar 7s ease-in-out infinite alternate;
  background:radial-gradient(circle at 34% 60%,rgba(150,135,210,.35) 0 9%,transparent 10%),radial-gradient(circle at 62% 30%,rgba(150,135,210,.28) 0 7%,transparent 8%),radial-gradient(circle at 58% 72%,rgba(150,135,210,.22) 0 5%,transparent 6%),radial-gradient(circle at 42% 40%,#fdfcff 0,#ece6ff 45%,#d2c6f7 70%,#b7a8ea 100%);
  box-shadow:0 0 70px 26px rgba(170,150,255,.28),0 0 160px 60px rgba(120,100,240,.14)}
[data-tema=luar] body>.ceu .k2{left:0;top:10%;width:calc(100% + 500px);height:200px;will-change:transform;animation:thNuvem500 80s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='200'><g fill='%23c9bff0' fill-opacity='.13'><ellipse cx='120' cy='60' rx='130' ry='9'/><ellipse cx='170' cy='72' rx='90' ry='7'/><ellipse cx='380' cy='140' rx='120' ry='8'/><ellipse cx='330' cy='150' rx='70' ry='6'/></g></svg>") 0 0/500px 200px repeat-x}
[data-tema=luar] body>.ceu :is(.k3,.k4){top:0;left:0;right:0;bottom:0}
[data-tema=luar] body>.ceu .k3{animation:thPisca2 3.6s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='220'><g fill='%23ffffff'><circle cx='20' cy='30' r='1.1'/><circle cx='120' cy='80' r='.9'/><circle cx='170' cy='190' r='1.2'/><circle cx='60' cy='150' r='.8'/></g><path d='M150 24 l1.4 4.6 4.6 1.4 -4.6 1.4 -1.4 4.6 -1.4 -4.6 -4.6 -1.4 4.6 -1.4z' fill='%23e3dbff'/></svg>") 0 0/200px 220px}
[data-tema=luar] body>.ceu .k4{animation:thPisca2 4.4s ease-in-out -2s infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='300'><g fill='%23d6ecff'><circle cx='80' cy='40' r='1'/><circle cx='220' cy='130' r='1.3'/><circle cx='30' cy='240' r='.9'/></g><path d='M190 250 l1.1 3.6 3.6 1.1 -3.6 1.1 -1.1 3.6 -1.1 -3.6 -3.6 -1.1 3.6 -1.1z' fill='%23ffffff'/></svg>") 0 0/260px 300px}
[data-tema=luar] body>.ceu .k5{left:-20px;right:-20px;bottom:0;height:150px;will-change:transform;animation:thAgua 5s ease-in-out infinite alternate;
  background:radial-gradient(ellipse 9% 75% at 84% 0%,rgba(230,220,255,.35),transparent 70%),repeating-linear-gradient(0deg,rgba(200,190,255,.07) 0 1px,transparent 1px 7px),linear-gradient(transparent,rgba(30,30,90,.5));
  -webkit-mask-image:linear-gradient(transparent,#000 40%);mask-image:linear-gradient(transparent,#000 40%)}

/* ---------- Floresta Escura: detalhes ---------- */
/* Foto de fundo com aproximação bem lenta, escurecida nas pontas; duas faixas de névoa passando; grão de filme. */
[data-tema=floresta] .btn.sec{background:rgba(10,12,11,.55);border-color:rgba(220,228,224,.3)}
[data-tema=floresta] .chip{background:rgba(10,12,11,.7)}
[data-tema=floresta] .chip.on{background:var(--acc-fundo);box-shadow:inset 0 1px 0 rgba(255,255,255,.55)}
[data-tema=floresta] .chip.filtro.on{background:var(--neg-bg);box-shadow:none}
[data-tema=floresta] .seg{background:rgba(10,12,11,.7)}
[data-tema=floresta] .mais{background:rgba(10,12,11,.7)}
[data-tema=floresta] :is(.grupo,.an-grupo,.av-proposta){border-top-color:rgba(230,236,232,.26)}
[data-tema=floresta] .secao>h2::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(220,228,224,.35),transparent)}
[data-tema=floresta] :is(h1,.secao>h2){text-shadow:var(--t-sombra)}
[data-tema=floresta] .meta{text-shadow:0 1px 8px rgba(0,0,0,.9)}
/* Camada 1: árvores de longe, apagadas e desfocadas pela névoa (aproxima bem devagar). */
[data-tema=floresta] body>.ceu .k1{top:-3%;left:-3%;right:-3%;bottom:-3%;z-index:1;will-change:transform;animation:thFoto 60s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 800' preserveAspectRatio='xMidYMax slice'><defs><path id='t' d='M20 0L34 34H27L38 60H30L40 86H23V100H17V86H0L10 60H2L13 34H6Z'/><filter id='b'><feGaussianBlur stdDeviation='3.2'/></filter></defs><g fill='%233b3e3c' filter='url(%23b)'><rect x='52' y='130' width='5' height='670'/><rect x='118' y='70' width='7' height='730'/><rect x='196' y='210' width='4' height='590'/><rect x='252' y='110' width='6' height='690'/><rect x='318' y='160' width='5' height='640'/><use href='%23t' transform='translate(150 330) scale(2.4)'/><use href='%23t' transform='translate(212 280) scale(3)'/><use href='%23t' transform='translate(90 420) scale(1.8)'/><use href='%23t' transform='translate(280 400) scale(2)'/></g></svg>") center bottom/cover no-repeat}
/* Camada 3: árvores do meio, mais escuras e só um pouco desfocadas. */
[data-tema=floresta] body>.ceu .k2{top:0;left:0;right:0;bottom:0;z-index:3;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 800' preserveAspectRatio='xMidYMax slice'><defs><path id='t' d='M20 0L34 34H27L38 60H30L40 86H23V100H17V86H0L10 60H2L13 34H6Z'/><filter id='b'><feGaussianBlur stdDeviation='1.3'/></filter></defs><g fill='%231c1e1d' filter='url(%23b)'><path d='M20 0 H34 L36 800 H16Z'/><path d='M96 0 H112 L115 800 H93Z'/><path d='M232 40 H242 L244 800 H230Z'/><path d='M298 0 H316 L319 800 H295Z'/><path d='M372 0 H386 L388 800 H370Z'/><use href='%23t' transform='translate(60 640) scale(1.4)'/><use href='%23t' transform='translate(170 610) scale(1.8)'/><use href='%23t' transform='translate(330 660) scale(1.2)'/><use href='%23t' transform='translate(250 690) scale(1)'/></g></svg>") center bottom/cover no-repeat}
/* Camada 5: troncos de perto (quase pretos), copa escura no alto e mato no chão. */
[data-tema=floresta] body>.ceu .k3{top:0;left:0;right:0;bottom:0;z-index:5;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 800' preserveAspectRatio='xMidYMax slice'><g fill='%23070807'><path d='M-10 0 H44 L50 800 H-10Z'/><path d='M332 0 H392 L400 800 H326Z'/><path d='M0 0 H400 V70 Q370 110 340 84 Q318 128 286 96 Q262 140 228 104 Q206 132 178 100 Q150 136 122 102 Q98 134 70 98 Q44 126 20 92 Q8 110 0 100Z'/><path d='M0 800 V752 L8 736 L14 754 L22 728 L30 756 L40 740 L48 758 L60 734 L68 756 L80 742 L92 760 L104 738 L114 758 L128 744 L140 762 L152 740 L164 760 L178 746 L190 764 L204 742 L216 762 L230 748 L244 764 L258 744 L270 762 L284 746 L298 764 L312 742 L324 760 L338 746 L352 764 L366 744 L380 760 L392 742 L400 756 V800Z'/></g></svg>") center bottom/cover no-repeat}
/* Grão de filme e cantos escuros por cima de tudo (o texto continua por cima). */
[data-tema=floresta] body>.ceu::after{z-index:6;opacity:1;animation:none;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>") 0 0/180px 180px,radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(0,0,0,.6) 100%)}
/* Camadas 4 e 5: névoa de verdade (manchas largas e suaves) passando devagar em sentidos opostos. */
[data-tema=floresta] body>.ceu :is(.k4,.k5){left:0;width:calc(100% + 900px);height:420px;will-change:transform;
  background:radial-gradient(ellipse 260px 90px at 150px 210px,rgba(210,216,213,.13),transparent 72%),radial-gradient(ellipse 320px 110px at 520px 180px,rgba(210,216,213,.10),transparent 72%),radial-gradient(ellipse 240px 80px at 780px 240px,rgba(210,216,213,.12),transparent 72%) 0 0/900px 420px repeat-x}
[data-tema=floresta] body>.ceu .k4{top:32%;z-index:2;animation:thNevoa1 150s linear infinite}
[data-tema=floresta] body>.ceu .k5{top:58%;z-index:4;opacity:.85;animation:thNevoa1 110s linear -60s infinite reverse}

/* ---------- Reação ao toque ---------- */
[data-tema=angel] .toque{animation:thAureola .55s ease-out}
[data-tema=gotico] .toque{animation:thLacre .35s ease-out}
[data-tema=luar] .toque{animation:thLua .55s ease-out}
[data-tema=floresta] .toque{animation:thNevoa .5s ease-out}

@keyframes thAureola{0%{box-shadow:0 0 0 0 rgba(255,255,255,.95),0 0 0 0 rgba(170,185,235,.6);filter:brightness(1.06)}100%{box-shadow:0 0 0 12px rgba(255,255,255,0),0 0 0 22px rgba(170,185,235,0);filter:none}}
@keyframes thLacre{0%{transform:none}35%{transform:scale(.93);filter:brightness(1.3)}100%{transform:none;filter:none}}
@keyframes thLua{0%{box-shadow:0 0 0 0 rgba(205,190,255,.85);filter:brightness(1.3)}100%{box-shadow:0 0 0 16px rgba(205,190,255,0);filter:none}}
@keyframes thNevoa{0%{opacity:.45;transform:translateY(1px)}100%{opacity:1;transform:none}}
@keyframes thPerola{0%{transform:translateX(-160%) skewX(-18deg)}55%,100%{transform:translateX(360%) skewX(-18deg)}}
@keyframes thRaios{from{opacity:.45}to{opacity:.95}}
@keyframes thNuvem600{from{transform:translateX(0)}to{transform:translateX(-600px)}}
@keyframes thNuvem500{from{transform:translateX(0)}to{transform:translateX(-500px)}}
@keyframes thCai{from{transform:translateY(0)}to{transform:translateY(400px)}}
@keyframes thPisca2{from{opacity:.3}to{opacity:1}}
@keyframes thVela{0%,100%{opacity:.7}18%{opacity:.95}33%{opacity:.6}52%{opacity:1}68%{opacity:.72}84%{opacity:.9}}
@keyframes thLuar{from{opacity:.8}to{opacity:1}}
@keyframes thAgua{from{transform:translateX(-8px)}to{transform:translateX(8px)}}
@keyframes thNevoa1{from{transform:translateX(0)}to{transform:translateX(-900px)}}
@keyframes thFoto{from{transform:scale(1)}to{transform:scale(1.07)}}

/* "Reduzir movimento" no iPhone: tudo parado. */
@media (prefers-reduced-motion:reduce){
  :is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) :is(.ceu>span,h1,.faixa,.btn,.chip,.seg button,.grupo,.toque){animation:none!important}
  :is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) :is(.faixa,h1,.btn,.seg button)::before,:is([data-tema=angel],[data-tema=gotico],[data-tema=luar],[data-tema=floresta]) :is(.faixa,h1,.btn,.seg button)::after{animation:none!important}
}


/* =====================================================================
   TEMAS · LOTE 2 (novos): Dreamcore, Elixir, Barbiecore e Zen.
   Mesmo molde do lote 1. Laranja = paga, verde = ganha, vermelho = desce.
   ===================================================================== */

/* ---------- Dreamcore: liminar, calmo e estranho (céu perfeito, piscina vazia, azulejos) ---------- */
[data-tema=dreamcore]{color-scheme:light;--body-fundo:transparent;
  --topo:#4a86da;--bg:#f6eef3;--card:rgba(255,255,255,.9);--card2:#fbeaf2;--borda:#f1d8e5;--card-borda:#efd0e0;--fg:#3a2a35;--sub:#8a6f80;
  --acc:#f08fbb;--acc-fundo:linear-gradient(180deg,#ffe6f1 0%,#f9b8d5 50%,#ee93bc 100%);--acc-press:#e27aa9;--on-acc:#4a1f35;--acc-t:#c04d82;--rap:#2f6fc0;
  --heroi:radial-gradient(circle 46px at 97% 38%,rgba(255,228,240,.97) 0%,rgba(255,206,228,.9) 55%,rgba(255,196,224,0) 100%),radial-gradient(circle 34px at 88% 62%,rgba(255,236,245,.95) 0%,rgba(255,210,230,.85) 55%,rgba(255,200,226,0) 100%),radial-gradient(circle 40px at 100% 80%,rgba(255,220,236,.95) 0%,rgba(255,200,226,.8) 55%,rgba(255,196,224,0) 100%),linear-gradient(180deg,#3f7fd6 0%,#6ea3e8 60%,#a3c8f1 100%);
  --heroi-borda:rgba(255,255,255,.6);--on-heroi:#ffffff;--heroi-linha:rgba(255,255,255,.4);--heroi-aviso:#ffffff;
  --pos:#16845a;--pos-bg:#ddf4ea;--warn:#b35c12;--warn-bg:#fdeedd;--neg:#c93a5b;--neg-bg:#fbe4ea;
  --on-status:#ffffff;--dou-bg:#fdf0f6;--rec-bg:#e8f7ef;
  --sombra:0 2px 0 #f1d8e5,0 12px 26px rgba(120,80,140,.12);--vidro:none;--folha:#ffffff;
  --btn-sombra:inset 0 2px 0 rgba(255,255,255,.85),inset 0 -4px 10px rgba(220,110,160,.25),0 6px 14px rgba(230,120,170,.3);
  --c2-btn-sombra:inset 0 2px 0 rgba(255,255,255,.85),inset 0 -4px 10px rgba(130,110,220,.25),0 6px 14px rgba(140,120,230,.3);
  --r-btn:999px;--r-chip:999px;--r-card:24px;--r-heroi:26px;--r-thumb:16px;--r-seg:999px;--r-seg-b:999px;--r-campo:999px;
  --f-titulo:"Poiret One",var(--f-ui);--t-peso:400;--t-tam:40px;--t-esp:.03em;--t-cor:#ffffff;--t-sombra:0 2px 12px rgba(30,70,140,.45);
  --ceu:radial-gradient(ellipse 50% 30% at 15% 0%,rgba(255,255,255,.45),transparent 70%),linear-gradient(180deg,#3f7fd6 0%,#6ea3e8 28%,#a9cdf3 50%,#dcebf8 62%,#eef0f4 66%,#f4ecf2 100%);
  --c2:#9a86e0;--c2-fundo:linear-gradient(180deg,#f1ecff 0%,#cdbff6 50%,#aa98ea 100%);--c2-press:#9582dc;--c2-on:#2a2050;--c2-t:#6a52c8;--c2-bg:#efeaff;
  --c2-heroi:radial-gradient(circle 46px at 97% 38%,rgba(240,232,255,.97) 0%,rgba(220,206,255,.9) 55%,rgba(210,196,255,0) 100%),radial-gradient(circle 34px at 88% 62%,rgba(244,238,255,.95) 0%,rgba(220,210,255,.85) 55%,rgba(210,200,255,0) 100%),linear-gradient(180deg,#5a6fd6 0%,#8a9ce8 60%,#b9c5f1 100%);--c2-heroi-borda:rgba(255,255,255,.6);--c2-on-heroi:#ffffff}

/* ---------- Elixir: rosa-veneno (roxo, rosa-choque e verde-limão), frasco elegante ---------- */
[data-tema=elixir]{color-scheme:dark;--body-fundo:transparent;
  --topo:#0b0410;--bg:#050207;--card:rgba(9,4,11,.84);--card2:rgba(36,14,40,.86);--borda:rgba(255,140,210,.12);--card-borda:rgba(255,80,170,.26);--fg:#fdeefa;--sub:#bf9fbb;
  --acc:#ff1a8c;--acc-fundo:linear-gradient(160deg,#ff7ac0 0%,#ff1a8c 45%,#c00c68 100%);--acc-press:#c00c68;--on-acc:#ffffff;--acc-t:#ff8fca;--rap:#c8a6ff;
  --heroi:radial-gradient(ellipse 55% 85% at 96% 20%,rgba(255,26,140,.62),transparent 70%),radial-gradient(ellipse 50% 70% at 72% 120%,rgba(30,225,160,.5),transparent 70%),radial-gradient(ellipse 30% 60% at 58% 40%,rgba(30,225,160,.18),transparent 70%),linear-gradient(160deg,#130616,#050207);
  --heroi-borda:rgba(255,110,190,.35);--on-heroi:#ffffff;--heroi-linha:rgba(255,190,230,.18);--heroi-aviso:#ffab6b;
  --pos:#8dffb0;--pos-bg:rgba(30,120,70,.32);--warn:#ffab6b;--warn-bg:rgba(130,60,20,.38);--neg:#ff5a5a;--neg-bg:rgba(150,20,30,.38);
  --on-status:#050207;--dou-bg:rgba(255,26,140,.12);--rec-bg:rgba(141,255,176,.07);
  --sombra:0 12px 32px rgba(0,0,0,.6);--vidro:none;--folha:#0e0510;
  --btn-sombra:inset 0 1px 0 rgba(255,255,255,.55),0 0 18px rgba(255,26,140,.5);
  --c2-btn-sombra:inset 0 1px 0 rgba(255,255,255,.55),0 0 18px rgba(155,92,255,.5);
  --r-btn:14px;--r-chip:999px;--r-card:18px;--r-heroi:22px;--r-thumb:12px;--r-seg:14px;--r-seg-b:11px;--r-campo:14px;
  --f-titulo:"Syne",var(--f-ui);--t-peso:800;--t-tam:34px;--t-esp:-.01em;--t-cor:#ffe3f3;--t-sombra:0 0 18px rgba(255,26,140,.65);
  --ceu:radial-gradient(ellipse 60% 40% at 35% 18%,rgba(255,26,140,.55),transparent 70%),radial-gradient(ellipse 35% 60% at 45% 60%,rgba(30,225,160,.42),transparent 70%),radial-gradient(ellipse 40% 30% at 80% 85%,rgba(255,26,140,.4),transparent 70%),#050207;
  --c2:#9b5cff;--c2-fundo:linear-gradient(180deg,#c9a6ff 0%,#9b5cff 45%,#6a2ee0 100%);--c2-press:#6a2ee0;--c2-on:#ffffff;--c2-t:#c9b0ff;--c2-bg:rgba(155,92,255,.16);
  --c2-heroi:radial-gradient(ellipse 70% 60% at 85% 115%,rgba(60,255,210,.24),transparent 70%),linear-gradient(160deg,#36127a 0%,#1c0a44 55%,#100528 100%);--c2-heroi-borda:rgba(180,140,255,.45)}

/* ---------- Barbiecore: plástico brilhante, rosa-choque, botões de bala, letreiro dos anos 60 ---------- */
[data-tema=barbie]{color-scheme:light;--body-fundo:transparent;
  --topo:#ff9fd0;--bg:#ffe6f3;--card:#ffffff;--card2:#ffeef7;--borda:#ffc9e4;--card-borda:#ffb3d9;--fg:#3a0a26;--sub:#9a4a76;
  --acc:#e0218a;--acc-fundo:linear-gradient(180deg,#ff8cc8 0%,#ff4fa8 42%,#e0218a 58%,#c4127a 100%);--acc-press:#b0106c;--on-acc:#ffffff;--acc-t:#c8157a;--rap:#6a3fd1;
  --heroi:linear-gradient(180deg,rgba(255,255,255,.5) 0%,rgba(255,255,255,.1) 40%,transparent 42%),linear-gradient(180deg,#ff5fb0,#e0218a 70%,#c4127a);
  --heroi-borda:#ff9ccd;--on-heroi:#ffffff;--heroi-linha:rgba(255,255,255,.35);--heroi-aviso:#ffffff;
  --pos:#138a55;--pos-bg:#dff5ea;--warn:#b75a10;--warn-bg:#fff0de;--neg:#d42828;--neg-bg:#ffe1e1;
  --on-status:#ffffff;--dou-bg:#ffeef7;--rec-bg:#e9f8f0;
  --sombra:0 2px 0 #ffc9e4,0 10px 24px rgba(224,33,138,.16);--vidro:none;--folha:#ffffff;
  --btn-sombra:inset 0 2px 0 rgba(255,255,255,.7),inset 0 -4px 8px rgba(120,0,60,.25),0 4px 0 #a80e65,0 8px 16px rgba(224,33,138,.35);
  --c2-btn-sombra:inset 0 2px 0 rgba(255,255,255,.7),inset 0 -4px 8px rgba(0,50,100,.25),0 4px 0 #0f6aa0,0 8px 16px rgba(30,155,224,.35);
  --r-btn:999px;--r-chip:999px;--r-card:22px;--r-heroi:26px;--r-thumb:14px;--r-seg:999px;--r-seg-b:999px;--r-campo:999px;
  --f-titulo:"Yellowtail",cursive;--t-peso:400;--t-tam:48px;--t-esp:0;--t-cor:#e0218a;--t-sombra:2px 2px 0 #ffffff,4px 4px 0 rgba(224,33,138,.22);
  --ceu:radial-gradient(ellipse 80% 50% at 50% -10%,#ffd0e8,transparent 70%),linear-gradient(180deg,#ffb3da 0%,#ffd6ec 40%,#ffe6f3 75%);
  --c2:#1e9be0;--c2-fundo:linear-gradient(180deg,#8fd8ff 0%,#3cb0f0 42%,#1e9be0 58%,#127ab8 100%);--c2-press:#0f6aa0;--c2-on:#ffffff;--c2-t:#127ab8;--c2-bg:#e3f4ff;
  --c2-heroi:linear-gradient(180deg,rgba(255,255,255,.5) 0%,rgba(255,255,255,.1) 40%,transparent 42%),linear-gradient(180deg,#5cc4ff,#1e9be0 70%,#127ab8);--c2-heroi-borda:#8fd0f5;--c2-on-heroi:#ffffff}

/* ---------- Zen: templo à noite (lanternas de papel, incenso, madeira escura e laca vermelha) ---------- */
[data-tema=zen]{color-scheme:light;--body-fundo:transparent;
  --topo:#f3f3f3;--bg:#e4e5e6;--card:rgba(250,250,250,.86);--card2:rgba(232,233,234,.9);--borda:rgba(30,32,34,.09);--card-borda:rgba(30,32,34,.12);--fg:#1e2022;--sub:#686c70;
  --acc:#2a2c2e;--acc-fundo:linear-gradient(180deg,#45484b 0%,#2a2c2e 55%,#1c1d1f 100%);--acc-press:#111213;--on-acc:#f5f5f5;--acc-t:#34373a;--rap:#4a5f80;
  --heroi:linear-gradient(180deg,#fbfbfb 0%,#efefef 50%,#d4d6d7 51%,#dfe0e1 72%,#e8e9ea 100%);
  --heroi-borda:rgba(30,32,34,.1);--on-heroi:#1e2022;--heroi-linha:rgba(30,32,34,.12);--heroi-aviso:#a85a14;
  --pos:#2a7f53;--pos-bg:#e1efe7;--warn:#a85a14;--warn-bg:#f6ebdd;--neg:#b8324a;--neg-bg:#f6e2e6;
  --on-status:#ffffff;--dou-bg:rgba(240,240,241,.9);--rec-bg:rgba(232,241,236,.9);
  --sombra:0 1px 2px rgba(0,0,0,.04),0 10px 28px rgba(0,0,0,.06);--vidro:none;--folha:#f7f7f7;
  --btn-sombra:0 2px 8px rgba(0,0,0,.18);
  --c2-btn-sombra:0 2px 8px rgba(20,30,60,.22);
  --r-btn:3px;--r-chip:3px;--r-card:4px;--r-heroi:4px;--r-thumb:3px;--r-seg:3px;--r-seg-b:2px;--r-campo:3px;--r-mais:3px;
  --f-titulo:"Shippori Mincho",Georgia,serif;--t-peso:600;--t-tam:34px;--t-esp:.08em;--t-cor:#26282a;--t-sombra:none;
  --ceu:linear-gradient(180deg,#f4f4f4 0%,#eaebeb 40%,#e2e3e3 51.5%,#cfd1d2 52%,#d8d9da 70%,#e1e2e3 100%);
  --c2:#4a5a78;--c2-fundo:linear-gradient(180deg,#647596 0%,#4a5a78 55%,#384660 100%);--c2-press:#2c3850;--c2-on:#f3f5fa;--c2-t:#3f5274;--c2-bg:#e3e8f0;
  --c2-heroi:linear-gradient(180deg,#fafbfd 0%,#eceff4 50%,#cfd5df 51%,#dbe0e7 72%,#e6e9ee 100%);--c2-heroi-borda:rgba(40,60,100,.14);--c2-on-heroi:#1e2430}

/* ---------- Formas comuns aos 5 ---------- */
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) h1{letter-spacing:var(--t-esp,-.02em);color:var(--t-cor,var(--fg))}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) :is(.secao>h2,details.bloco>summary){letter-spacing:var(--t-esp,-.01em)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) .btn{position:relative;border-radius:var(--r-btn,12px);box-shadow:var(--btn-sombra,none)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) .btn.sec{box-shadow:none}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) .seg.abas button.on{position:relative;box-shadow:var(--btn-sombra,none)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) :is(.chip,.chip-conta,.cont,.tag,.faixa-conta){border-radius:var(--r-chip,999px)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) :is(.grupo,.vazio,.an-grupo,.av-proposta,.veredito,.av-resumo,.dia-card,.dia-lucro,.ti-graf,.ct-c,.ti-bloco){border-radius:var(--r-card,16px)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) .faixa{position:relative;overflow:hidden;isolation:isolate;border-radius:var(--r-heroi,18px)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) .folha{border-radius:var(--r-card,16px)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) input[type=search]{border-radius:var(--r-campo,12px)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) .seg{border-radius:var(--r-seg,12px)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) .seg button{border-radius:var(--r-seg-b,9px)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) .thumb{border-radius:var(--r-thumb,12px)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) .mais{border-radius:var(--r-mais,50%)}
:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) :is(.ti-voltar,.ti-acao){border-radius:var(--r-btn,14px)}

/* ---------- Dreamcore: detalhes ---------- */
/* Rua de subúrbio vazia num dia claro: céu azul forte, algodão-doce rosa pousado no chão, cerca branca e grama.
   Value = pedaço de céu com algodão-doce na borda. Botões e chips fofos de algodão. */
[data-tema=dreamcore] .faixa{text-shadow:0 1px 6px rgba(20,50,110,.35)}
[data-tema=dreamcore] .cab .meta{color:#eef4ff;text-shadow:0 1px 6px rgba(20,50,110,.5)}
[data-tema=dreamcore] .mais{background:rgba(255,255,255,.85)}
[data-tema=dreamcore] .chip{background:#ffffff;border-color:#f3d6e4}
[data-tema=dreamcore] .chip.on{box-shadow:var(--btn-sombra);border-color:transparent}
[data-tema=dreamcore] .chip.filtro.on{background:var(--neg-bg);border-color:var(--neg);box-shadow:none}
[data-tema=dreamcore] .seg{background:rgba(255,255,255,.75)}
[data-tema=dreamcore] .thumb{box-shadow:0 0 0 2px #ffffff,0 0 0 3px #f3d6e4}
[data-tema=dreamcore] body>.ceu .k5{left:0;top:6%;width:calc(100% + 700px);height:24%;z-index:1;will-change:transform;animation:thNuvemD 160s linear infinite;
  background:radial-gradient(ellipse 70px 22px at 120px 60%,rgba(255,255,255,.9),transparent 72%),radial-gradient(ellipse 46px 26px at 150px 48%,rgba(255,255,255,.85),transparent 72%),radial-gradient(ellipse 30px 12px at 420px 30%,rgba(255,255,255,.7),transparent 72%),radial-gradient(ellipse 90px 26px at 560px 70%,rgba(255,255,255,.8),transparent 72%),radial-gradient(ellipse 50px 30px at 590px 55%,rgba(255,255,255,.85),transparent 72%) 0 0/700px 100% repeat-x}
[data-tema=dreamcore] body>.ceu .k4{left:0;right:0;bottom:0;height:24%;z-index:2;
  background:repeating-linear-gradient(90deg,rgba(40,70,20,.06) 0 1px,transparent 1px 4px),repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),linear-gradient(180deg,#a7c97f 0%,#86b062 40%,#6c9450 100%)}
[data-tema=dreamcore] body>.ceu .k3{left:0;right:0;bottom:21%;height:78px;z-index:3;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='44' height='78'><g fill='%23ffffff' stroke='%23d9dbe4' stroke-width='.8'><path d='M5 78 V14 L11 6 L17 14 V78Z'/><path d='M27 78 V14 L33 6 L39 14 V78Z'/></g><g fill='%23f4f4f8' stroke='%23d9dbe4' stroke-width='.6'><rect x='0' y='30' width='44' height='5'/><rect x='0' y='58' width='44' height='5'/></g><g fill='%23cfd2dc' fill-opacity='.6'><rect x='15' y='14' width='2' height='64'/><rect x='37' y='14' width='2' height='64'/></g></svg>") 0 100%/44px 78px repeat-x}
[data-tema=dreamcore] body>.ceu .k2{top:0;left:0;right:0;bottom:0;z-index:4;will-change:transform;animation:thAlgodao 14s ease-in-out -5s infinite alternate;
  background:radial-gradient(circle 34px at 28% 70%,rgba(255,232,242,.95) 0%,rgba(255,206,228,.85) 55%,rgba(255,196,224,0) 100%),radial-gradient(circle 26px at 33% 66%,rgba(255,238,246,.95) 0%,rgba(255,212,232,.8) 55%,rgba(255,200,226,0) 100%),radial-gradient(circle 30px at 62% 73%,rgba(255,228,240,.95) 0%,rgba(255,204,228,.85) 55%,rgba(255,196,224,0) 100%),radial-gradient(circle 22px at 66% 68%,rgba(255,240,247,.95) 0%,rgba(255,214,232,.8) 55%,rgba(255,200,226,0) 100%),radial-gradient(circle 20px at 58% 69%,rgba(255,236,245,.9) 0%,rgba(255,210,230,.75) 55%,rgba(255,200,226,0) 100%)}
[data-tema=dreamcore] body>.ceu .k1{top:0;left:0;right:0;bottom:0;z-index:5;will-change:transform;animation:thAlgodao 11s ease-in-out infinite alternate;
  background:radial-gradient(circle 90px at 6% 92%,rgba(255,226,239,.97) 0%,rgba(255,204,228,.92) 55%,rgba(255,190,220,0) 100%),radial-gradient(circle 70px at 20% 84%,rgba(255,236,245,.97) 0%,rgba(255,212,232,.9) 55%,rgba(255,196,224,0) 100%),radial-gradient(circle 60px at -2% 78%,rgba(255,232,242,.95) 0%,rgba(255,208,230,.85) 55%,rgba(255,196,224,0) 100%),radial-gradient(circle 64px at 104% 42%,rgba(255,228,240,.96) 0%,rgba(255,204,228,.9) 55%,rgba(255,190,220,0) 100%),radial-gradient(circle 54px at 96% 52%,rgba(255,238,246,.95) 0%,rgba(255,212,232,.88) 55%,rgba(255,196,224,0) 100%),radial-gradient(circle 70px at 102% 66%,rgba(255,224,238,.96) 0%,rgba(255,202,226,.9) 55%,rgba(255,190,220,0) 100%),radial-gradient(circle 58px at 98% 82%,rgba(255,234,244,.95) 0%,rgba(255,208,230,.88) 55%,rgba(255,196,224,0) 100%)}

/* ---------- Elixir: detalhes ---------- */
/* Líquido fluido rosa-choque e verde-esmeralda sobre preto, com brilho de glitter (como a referência).
   As manchas se movem muito devagar; cartões escuros meio transparentes deixam o líquido aparecer. */
[data-tema=elixir] .faixa::after{content:"";position:absolute;top:0;left:0;right:0;bottom:0;z-index:-1;pointer-events:none;opacity:.45;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='1.4' numOctaves='1' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 9 -6.6'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>") 0 0/160px 160px}
[data-tema=elixir] .btn.sec{background:rgba(9,4,11,.6);border-color:rgba(255,110,190,.45)}
[data-tema=elixir] .chip{background:rgba(9,4,11,.7);border-color:rgba(255,110,190,.28)}
[data-tema=elixir] .chip.on{box-shadow:0 0 14px rgba(255,26,140,.5)}
[data-tema=elixir] .chip.filtro.on{box-shadow:none}
[data-tema=elixir] .seg{background:rgba(9,4,11,.7)}
[data-tema=elixir] .mais{background:rgba(9,4,11,.7)}
[data-tema=elixir] .thumb{box-shadow:0 0 0 1.5px rgba(30,225,160,.45)}
[data-tema=elixir] :is(.grupo,.an-grupo,.av-proposta){box-shadow:inset 0 1px 0 rgba(255,160,215,.16),var(--sombra)}
[data-tema=elixir] body>.ceu :is(.k1,.k2,.k3){will-change:transform}
[data-tema=elixir] body>.ceu .k1{top:-15%;left:-35%;width:110%;height:75%;animation:thFluido1 26s ease-in-out infinite alternate;
  background:radial-gradient(ellipse 50% 48% at 50% 50%,rgba(255,26,140,.95) 0%,rgba(255,26,140,.55) 45%,rgba(255,26,140,0) 72%)}
[data-tema=elixir] body>.ceu .k2{top:5%;left:5%;width:75%;height:110%;transform:rotate(-16deg);animation:thFluido2 30s ease-in-out infinite alternate;
  background:radial-gradient(ellipse 28% 48% at 45% 50%,rgba(40,235,170,.85) 0%,rgba(20,190,135,.45) 45%,rgba(10,120,90,0) 72%)}
[data-tema=elixir] body>.ceu .k3{top:45%;left:35%;width:90%;height:70%;animation:thFluido3 34s ease-in-out infinite alternate;
  background:radial-gradient(ellipse 40% 42% at 60% 55%,rgba(255,26,140,.8) 0%,rgba(255,26,140,.35) 45%,rgba(255,26,140,0) 72%),radial-gradient(ellipse 18% 22% at 20% 30%,rgba(40,235,170,.6),transparent 72%)}
[data-tema=elixir] body>.ceu .k4{top:0;left:0;right:0;bottom:0;opacity:.5;will-change:opacity;animation:thPisca2 4s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='1.3' numOctaves='1' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 9 -6.8'/></filter><rect width='100%' height='100%' filter='url(%23g)'/></svg>") 0 0/200px 200px}
[data-tema=elixir] body>.ceu .k5{top:0;left:0;right:0;bottom:0;background:linear-gradient(90deg,transparent 60%,rgba(0,0,0,.55) 100%),radial-gradient(ellipse at 45% 45%,transparent 45%,rgba(0,0,0,.6) 100%)}

/* ---------- Barbiecore: detalhes ---------- */
/* Brilho de plástico passando no value e nos botões, letreiro com sombra dupla, listas com borda de plástico,
   fundo rosa com bolinhas retrô, brilhos piscando e uma faixa de luz atravessando. */
[data-tema=barbie] .faixa::after{content:"";position:absolute;top:0;bottom:0;left:0;width:30%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45) 50%,transparent);transform:translateX(-150%) skewX(-18deg);animation:thPerola 6s ease-in-out infinite}
[data-tema=barbie] :is(.btn,.seg.abas button.on){overflow:hidden}
[data-tema=barbie] :is(.btn,.seg.abas button.on)::after{content:"";position:absolute;left:12%;right:12%;top:3px;height:38%;border-radius:999px;pointer-events:none;background:linear-gradient(rgba(255,255,255,.75),rgba(255,255,255,0))}
[data-tema=barbie] .btn{padding-top:12px;padding-bottom:13px;margin-bottom:4px}
[data-tema=barbie] .btn.sec{background:linear-gradient(180deg,#ffffff,#ffeef7);border:2px solid #ffb3d9;box-shadow:0 3px 0 #ffb3d9}
[data-tema=barbie] .btn.sec::after{opacity:.6}
[data-tema=barbie] .chip{border-width:2px;border-color:#ffc9e4;background:linear-gradient(180deg,#ffffff,#fff3f9);font-weight:600}
[data-tema=barbie] .chip.on{border-color:transparent;box-shadow:inset 0 2px 0 rgba(255,255,255,.6),0 3px 0 #a80e65}
[data-tema=barbie] .chip.filtro.on{background:var(--neg-bg);border-color:var(--neg);box-shadow:none}
[data-tema=barbie] :is(.grupo,.an-grupo,.av-proposta,.veredito){border:2px solid #ffc9e4;box-shadow:inset 0 2px 0 #ffffff,0 4px 0 #ffc9e4,0 12px 24px rgba(224,33,138,.12)}
[data-tema=barbie] .seg{background:#ffd6ec}
[data-tema=barbie] .mais{border:2px solid #ffc9e4;color:#e0218a}
[data-tema=barbie] body>.ceu .k1{top:0;left:0;right:0;bottom:0;background:radial-gradient(circle,rgba(255,255,255,.5) 0 3px,transparent 3.5px) 0 0/34px 34px,radial-gradient(circle,rgba(255,255,255,.35) 0 2px,transparent 2.5px) 17px 17px/34px 34px;-webkit-mask-image:linear-gradient(transparent,#000 50%);mask-image:linear-gradient(transparent,#000 50%)}
[data-tema=barbie] body>.ceu .k2{top:-20%;bottom:-20%;left:0;width:40%;will-change:transform;animation:thLuzB 11s ease-in-out infinite;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35) 50%,transparent)}
[data-tema=barbie] body>.ceu :is(.k3,.k4){top:0;left:0;right:0;bottom:0;will-change:opacity}
[data-tema=barbie] body>.ceu .k3{animation:thPisca2 2.6s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='170' height='210'><g fill='white'><path d='M30 30 l2.4 8 8 2.4 -8 2.4 -2.4 8 -2.4 -8 -8 -2.4 8 -2.4z'/><path d='M130 140 l1.6 5.4 5.4 1.6 -5.4 1.6 -1.6 5.4 -1.6 -5.4 -5.4 -1.6 5.4 -1.6z'/></g></svg>") 0 0/170px 210px}
[data-tema=barbie] body>.ceu .k4{animation:thPisca2 3.4s ease-in-out -1.5s infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='230' height='260'><g fill='white'><path d='M180 50 l1.8 6 6 1.8 -6 1.8 -1.8 6 -1.8 -6 -6 -1.8 6 -1.8z'/><path d='M60 200 l2 6.6 6.6 2 -6.6 2 -2 6.6 -2 -6.6 -6.6 -2 6.6 -2z'/></g></svg>") 0 0/230px 260px}

/* ---------- Zen: detalhes ---------- */
/* Torii num lago parado, em preto e branco, com névoa (como a referência). Tudo em cinza claro, muito vazio e calmo.
   Value = o lago com a linha do horizonte e um torii pequeno; fundo = céu claro, montanhas apagadas, o torii,
   o reflexo dele na água e névoa passando bem devagar. */
[data-tema=zen] .faixa::after{content:"";position:absolute;right:16px;bottom:44%;width:46px;height:40px;z-index:-1;pointer-events:none;opacity:.55;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 260'><g fill='%233b3c3d'><path d='M4 18 Q150 40 296 18 L298 32 Q150 52 2 32Z'/><rect x='28' y='40' width='244' height='12'/><rect x='138' y='52' width='24' height='32'/><rect x='34' y='86' width='232' height='12'/><path d='M80 48 H98 L100 260 H78Z'/><path d='M202 48 H220 L222 260 H200Z'/></g></svg>") center bottom/contain no-repeat}
[data-tema=zen] .btn{letter-spacing:.1em}
[data-tema=zen] .btn.sec{background:rgba(250,250,250,.7);border-color:rgba(30,32,34,.2)}
[data-tema=zen] .chip{background:rgba(250,250,250,.75);border-color:rgba(30,32,34,.14)}
[data-tema=zen] .chip.on{border-color:transparent}
[data-tema=zen] .seg{background:rgba(232,233,234,.85)}
[data-tema=zen] .mais{background:rgba(250,250,250,.85)}
[data-tema=zen] .secao>h2::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,rgba(30,32,34,.3),transparent)}
[data-tema=zen] body>.ceu .k1{left:-5%;right:-5%;top:calc(52% - 46px);height:48px;opacity:.55;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 60' preserveAspectRatio='none'><filter id='b'><feGaussianBlur stdDeviation='.8'/></filter><path d='M0 60 L0 44 Q30 36 60 40 Q95 22 130 34 Q165 14 205 30 Q240 22 270 36 Q300 28 330 38 Q365 30 400 42 L400 60Z' fill='%238f9294' filter='url(%23b)'/></svg>") center bottom/100% 100% no-repeat}
[data-tema=zen] body>.ceu :is(.k2,.k3){left:50%;width:300px;height:260px;margin-left:-150px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 260'><defs><linearGradient id='p' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23434546'/><stop offset='1' stop-color='%23303132'/></linearGradient><filter id='b'><feGaussianBlur stdDeviation='.6'/></filter></defs><g fill='url(%23p)' filter='url(%23b)'><path d='M4 18 Q150 40 296 18 L298 32 Q150 52 2 32Z'/><rect x='28' y='40' width='244' height='12'/><rect x='138' y='52' width='24' height='32' fill='%23262728'/><rect x='34' y='86' width='232' height='12'/><path d='M80 48 H98 L100 260 H78Z'/><path d='M202 48 H220 L222 260 H200Z'/><rect x='74' y='196' width='30' height='8' fill='%23383a3b'/><rect x='196' y='196' width='30' height='8' fill='%23383a3b'/></g></svg>") center/contain no-repeat}
[data-tema=zen] body>.ceu .k2{top:calc(60% - 260px);opacity:.9}
[data-tema=zen] body>.ceu .k3{top:60%;opacity:.22;transform:scaleY(-1);filter:blur(1.5px);-webkit-mask-image:linear-gradient(to top,#000,transparent 70%);mask-image:linear-gradient(to top,#000,transparent 70%)}
[data-tema=zen] body>.ceu :is(.k4,.k5){left:0;width:calc(100% + 900px);height:300px;will-change:transform;
  background:radial-gradient(ellipse 240px 70px at 160px 150px,rgba(255,255,255,.55),transparent 72%),radial-gradient(ellipse 300px 80px at 540px 130px,rgba(255,255,255,.45),transparent 72%),radial-gradient(ellipse 220px 60px at 800px 170px,rgba(255,255,255,.5),transparent 72%) 0 0/900px 300px repeat-x}
[data-tema=zen] body>.ceu .k4{top:32%;animation:thNevoa1 160s linear infinite}
[data-tema=zen] body>.ceu .k5{top:55%;opacity:.8;animation:thNevoa1 120s linear -70s infinite reverse}

/* ---------- Reação ao toque ---------- */
[data-tema=dreamcore] .toque{animation:thGota .55s ease-out}
[data-tema=elixir] .toque{animation:thVeneno .45s ease-out}
[data-tema=barbie] .toque{animation:thBala .45s ease-out}
[data-tema=zen] .toque{animation:thTinta .7s ease-out}

@keyframes thGota{0%{box-shadow:0 0 0 0 rgba(240,143,187,.6)}100%{box-shadow:0 0 0 16px rgba(240,143,187,0)}}
@keyframes thAlgodao{from{transform:translateY(0)}to{transform:translateY(-8px)}}
@keyframes thFluido1{from{transform:translate(0,0) rotate(0deg) scale(1)}to{transform:translate(30px,40px) rotate(12deg) scale(1.12)}}
@keyframes thFluido2{from{transform:rotate(-16deg) translate(0,0)}to{transform:rotate(-6deg) translate(-30px,20px) scale(1.08)}}
@keyframes thFluido3{from{transform:translate(0,0) scale(1)}to{transform:translate(-40px,-30px) scale(1.1)}}
@keyframes thTinta{0%{box-shadow:0 0 0 0 rgba(40,42,44,.28)}100%{box-shadow:0 0 0 14px rgba(40,42,44,0)}}
@keyframes thVeneno{0%{transform:none;filter:none}35%{transform:scale(1.05);filter:hue-rotate(-80deg) brightness(1.35)}100%{transform:none;filter:none}}
@keyframes thBala{0%{transform:none}30%{transform:scale(1.06,.92) translateY(2px)}60%{transform:scale(.97,1.04) translateY(-2px);filter:brightness(1.12)}100%{transform:none;filter:none}}
@keyframes thSino{0%{box-shadow:0 0 0 0 rgba(255,140,90,.55);filter:brightness(1.2)}100%{box-shadow:0 0 0 14px rgba(255,140,90,0);filter:none}}
@keyframes thCausticas{from{transform:translate(-10px,-6px) rotate(-2deg)}to{transform:translate(10px,6px) rotate(2deg)}}
@keyframes thNuvemD{from{transform:translateX(0)}to{transform:translateX(-700px)}}
@keyframes thBrilhaPisc{from{opacity:.75}to{opacity:1}}
@keyframes thPinga{0%,60%{transform:translateY(0) scale(.4);opacity:0}70%{transform:translateY(0) scale(1);opacity:1}100%{transform:translateY(16px) scale(.8);opacity:0}}
@keyframes thDerivaT{from{transform:translate(-20px,0) scale(1)}to{transform:translate(20px,30px) scale(1.08)}}
@keyframes thOndaT{from{transform:translateX(0)}to{transform:translateX(-300px)}}
@keyframes thLuzB{0%{transform:translateX(-120%) skewX(-12deg)}60%,100%{transform:translateX(320%) skewX(-12deg)}}
@keyframes thBalancaL{from{transform:rotate(-3deg)}to{transform:rotate(3deg)}}
@keyframes thFumaca{0%{transform:translateY(40px) scaleX(.9);opacity:0}25%{opacity:1}100%{transform:translateY(-120px) scaleX(1.3);opacity:0}}

/* "Reduzir movimento" no iPhone: tudo parado. */
@media (prefers-reduced-motion:reduce){
  :is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) :is(.ceu>span,h1,.faixa,.btn,.chip,.seg button,.grupo,.toque){animation:none!important}
  :is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) :is(.faixa,h1,.btn,.seg button)::before,:is([data-tema=dreamcore],[data-tema=elixir],[data-tema=barbie],[data-tema=zen]) :is(.faixa,h1,.btn,.seg button)::after{animation:none!important}
}

/* =====================================================================
   TEMAS · LOTE 3 (melhorias): Galáxia, Noir, Abissal, Obsidiana e Acid.
   Tudo aqui vale só sem a classe .antes no <html> (botão "Antes / Depois" do protótipo),
   por isso cada regra começa com ${X}. Cores dos temas não mudam.
   ===================================================================== */

/* ---------- Galáxia: espaço mais rico (nebulosa em camadas, planeta com anel, cometa) + constelações e órbita ---------- */
${X}[data-tema=galaxia] body>.ceu :is(.k1,.k2){left:-30%;right:-30%;top:-10%;bottom:-10%;width:auto;height:auto;opacity:1;border-radius:0;will-change:transform}
${X}[data-tema=galaxia] body>.ceu .k1{animation:thNebula1 70s ease-in-out infinite alternate;
  background:radial-gradient(ellipse 30% 18% at 30% 30%,rgba(230,90,200,.30),transparent 70%),radial-gradient(ellipse 22% 14% at 38% 36%,rgba(255,160,230,.18),transparent 70%),radial-gradient(ellipse 35% 20% at 70% 72%,rgba(120,70,255,.30),transparent 70%),radial-gradient(ellipse 18% 10% at 64% 68%,rgba(200,170,255,.2),transparent 70%)}
${X}[data-tema=galaxia] body>.ceu .k2{animation:thNebula2 90s ease-in-out infinite alternate;
  background:radial-gradient(ellipse 26% 16% at 75% 22%,rgba(80,170,255,.22),transparent 70%),radial-gradient(ellipse 30% 18% at 20% 75%,rgba(60,200,230,.16),transparent 70%),radial-gradient(ellipse 45% 5% at 50% 52%,rgba(255,220,250,.10),transparent 70%)}
${X}[data-tema=galaxia] body>.ceu .k3{right:-34px;top:60%;width:160px;height:160px;opacity:.9;will-change:transform;animation:thAlgodao 12s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><radialGradient id='p' cx='.35' cy='.32' r='.78'><stop offset='0' stop-color='%23efe0ff'/><stop offset='.4' stop-color='%238a62d6'/><stop offset='.78' stop-color='%23281048'/><stop offset='1' stop-color='%230e0520'/></radialGradient><linearGradient id='a' x1='0' x2='1'><stop offset='0' stop-color='%23ffffff' stop-opacity='0'/><stop offset='.3' stop-color='%23f0dcff' stop-opacity='.75'/><stop offset='.7' stop-color='%23c8b0ff' stop-opacity='.5'/><stop offset='1' stop-color='%23ffffff' stop-opacity='0'/></linearGradient></defs><path d='M14.6 121.3 A88 22 -14 0 1 185.4 78.7' fill='none' stroke='url(%23a)' stroke-width='6'/><circle cx='100' cy='100' r='52' fill='url(%23p)'/><path d='M185.4 78.7 A88 22 -14 0 1 14.6 121.3' fill='none' stroke='url(%23a)' stroke-width='6'/></svg>") center/contain no-repeat}
${X}[data-tema=galaxia] body>.ceu .k4{top:0;left:0;right:0;bottom:0;will-change:opacity;animation:thPisca2 5s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='340'><g stroke='%23d8c8ff' stroke-opacity='.3' stroke-width='.7' fill='none'><path d='M30 40 L80 70 L120 50 L170 90 L150 140'/><path d='M190 210 L222 250 L184 292 L140 272'/><path d='M40 236 L70 204 L104 222'/></g><g fill='%23ffffff'><circle cx='30' cy='40' r='1.6'/><circle cx='80' cy='70' r='1.2'/><circle cx='120' cy='50' r='1.8'/><circle cx='170' cy='90' r='1.3'/><circle cx='150' cy='140' r='1.6'/><circle cx='190' cy='210' r='1.4'/><circle cx='222' cy='250' r='1.8'/><circle cx='184' cy='292' r='1.2'/><circle cx='140' cy='272' r='1.5'/><circle cx='40' cy='236' r='1.3'/><circle cx='70' cy='204' r='1.7'/><circle cx='104' cy='222' r='1.2'/></g></svg>") 0 0/260px 340px}
${X}[data-tema=galaxia] body>.ceu .k5{left:-30%;top:12%;width:220px;height:2px;border-radius:2px;opacity:0;will-change:transform,opacity;animation:thCometa 17s linear 3s infinite;
  background:linear-gradient(90deg,transparent,rgba(190,210,255,.45) 70%,#ffffff);box-shadow:0 0 8px rgba(255,255,255,.8)}
${X}[data-tema=galaxia] .faixa{position:relative;overflow:hidden;isolation:isolate}
${X}[data-tema=galaxia] .faixa::before{content:"";position:absolute;left:-12%;right:-12%;top:30%;height:120%;z-index:-1;pointer-events:none;border:1px solid rgba(225,200,255,.24);border-radius:50%;transform:rotate(-8deg)}
${X}[data-tema=galaxia] .faixa::after{content:"";position:absolute;left:-12%;width:124%;top:90%;aspect-ratio:1/1;margin-top:-62%;z-index:-1;pointer-events:none;will-change:transform;animation:thOrbitaV 16s linear infinite;
  background:radial-gradient(circle 6px at 50% 0%,#ffffff,rgba(220,200,255,.7) 45%,transparent 100%)}
${X}[data-tema=galaxia] .chip.on{box-shadow:0 0 12px rgba(180,140,255,.55)}
${X}[data-tema=galaxia] :is(.grupo,.an-grupo,.av-proposta){border-top-color:rgba(225,200,255,.4)}

/* ---------- Noir: cena de filme (luz de persiana, chuva escorrendo no vidro, fumaça subindo) ---------- */
${X}[data-tema=noir] body>.ceu::after{background:radial-gradient(ellipse at 50% 45%,transparent 42%,rgba(0,0,0,.82) 100%);background-size:100% 100%;animation:none;opacity:1}
${X}[data-tema=noir] body>.ceu .k3{top:0;left:0;right:0;bottom:0;opacity:0;will-change:transform,opacity;animation:thFumacaN 16s ease-in-out infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 460'><filter id='b'><feGaussianBlur stdDeviation='4'/></filter><g fill='none' stroke='white' stroke-linecap='round' filter='url(%23b)'><path d='M120 460 C90 420 150 390 118 350 C86 310 150 280 120 236 C96 200 140 170 118 120 C104 90 130 60 116 20' stroke-opacity='.16' stroke-width='14'/><path d='M126 440 C150 404 104 380 130 340 C154 304 108 276 132 236' stroke-opacity='.10' stroke-width='22'/></g></svg>") right 4% bottom -60px/220px 500px no-repeat}
${X}[data-tema=noir] body>.ceu .k4{top:-12%;left:-35%;width:125%;height:95%;will-change:transform,opacity;animation:thPersiana 20s ease-in-out infinite alternate;
  background:repeating-linear-gradient(-28deg,rgba(255,255,255,.09) 0 16px,transparent 16px 36px);
  -webkit-mask-image:radial-gradient(ellipse 65% 60% at 30% 30%,#000 20%,transparent 75%);mask-image:radial-gradient(ellipse 65% 60% at 30% 30%,#000 20%,transparent 75%)}
${X}[data-tema=noir] body>.ceu .k5{left:0;right:0;top:-400px;height:calc(100% + 400px);will-change:transform;animation:thCai 15s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='400'><defs><linearGradient id='r' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='white' stop-opacity='0'/><stop offset='1' stop-color='white' stop-opacity='.16'/></linearGradient></defs><g fill='url(%23r)'><rect x='29' y='20' width='1.4' height='70'/><rect x='119' y='170' width='1.2' height='90'/><rect x='69' y='290' width='1.2' height='60'/></g><g fill='white' fill-opacity='.22' stroke='black' stroke-opacity='.35' stroke-width='.6'><ellipse cx='29.7' cy='92' rx='2.6' ry='3.4'/><ellipse cx='119.6' cy='262' rx='2.2' ry='3'/><ellipse cx='69.6' cy='352' rx='2' ry='2.7'/></g><g fill='white' fill-opacity='.14'><circle cx='150' cy='60' r='1.6'/><circle cx='12' cy='210' r='1.2'/><circle cx='96' cy='120' r='1'/><circle cx='160' cy='330' r='1.4'/></g></svg>") 0 0/180px 400px}
${X}[data-tema=noir] .faixa{isolation:isolate}
${X}[data-tema=noir] .faixa::after{content:"";position:absolute;right:16px;top:0;bottom:0;width:70px;z-index:-1;pointer-events:none;will-change:transform,opacity;animation:thFumacaH 7s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 70 140' preserveAspectRatio='xMidYMax meet'><filter id='b'><feGaussianBlur stdDeviation='2'/></filter><g fill='none' stroke='white' stroke-linecap='round' filter='url(%23b)'><path d='M40 140 C30 120 52 104 38 84 C26 66 48 50 36 28 C30 16 40 8 34 0' stroke-opacity='.22' stroke-width='5'/><path d='M42 130 C54 112 32 96 46 74' stroke-opacity='.12' stroke-width='9'/></g></svg>") center bottom/contain no-repeat}
${X}[data-tema=noir] :is(.grupo,.an-grupo,.av-proposta){outline:1px solid rgba(255,255,255,.12);outline-offset:3px}
${X}[data-tema=noir] h1{text-shadow:0 6px 18px rgba(0,0,0,.9)}

/* ---------- Abissal: bioluminescência (plâncton brilhando, isca de peixe-lanterna, águas-vivas com brilho) ---------- */
${X}[data-tema=abissal] body>.ceu .k2{filter:drop-shadow(0 0 10px rgba(63,242,224,.55))}
${X}[data-tema=abissal] body>.ceu .k3{filter:hue-rotate(60deg) drop-shadow(0 0 10px rgba(63,242,224,.5))}
${X}[data-tema=abissal] body>.ceu .k5{top:0;left:0;right:0;bottom:0;height:auto;will-change:opacity;animation:thPisca2 3.4s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='260'><filter id='b'><feGaussianBlur stdDeviation='1.2'/></filter><g filter='url(%23b)'><circle cx='20' cy='30' r='2' fill='%237ff7ea'/><circle cx='140' cy='60' r='1.6' fill='%23b48cff'/><circle cx='90' cy='150' r='2.2' fill='%236fd3ff'/><circle cx='190' cy='200' r='1.6' fill='%237ff7ea'/><circle cx='40' cy='220' r='1.4' fill='%23ff94d0'/><circle cx='170' cy='130' r='1.2' fill='%237ff7ea'/></g></svg>") 0 0/220px 260px,radial-gradient(ellipse 80% 30% at 50% 100%,rgba(63,242,224,.12),transparent 70%)}
${X}[data-tema=abissal] body>.ceu b{left:0;right:0;top:0;bottom:auto;height:calc(100% + 260px);-webkit-mask-image:none;mask-image:none;will-change:transform;animation:thSobe260 46s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='260'><filter id='b'><feGaussianBlur stdDeviation='1'/></filter><g filter='url(%23b)' fill-opacity='.8'><circle cx='60' cy='40' r='1.4' fill='%237ff7ea'/><circle cx='150' cy='120' r='1.2' fill='%239cc8ff'/><circle cx='30' cy='180' r='1.6' fill='%237ff7ea'/><circle cx='110' cy='230' r='1' fill='%23b48cff'/></g></svg>") 0 0/180px 260px}
${X}[data-tema=abissal] body>.ceu i{left:10%;right:auto;top:auto;bottom:22%;width:110px;height:110px;aspect-ratio:auto;transform:none;will-change:transform,opacity;animation:thIsca 6s ease-in-out infinite;
  background:radial-gradient(circle,rgba(225,255,252,.98) 0 3px,rgba(120,250,235,.6) 6px,rgba(63,242,224,.14) 24px,transparent 52px)}
${X}[data-tema=abissal] .faixa{isolation:isolate}
${X}[data-tema=abissal] .faixa::after{content:"";position:absolute;top:0;left:0;right:0;bottom:0;z-index:-1;pointer-events:none;will-change:opacity;animation:thPisca2 2.8s ease-in-out infinite alternate;
  background:radial-gradient(2px 2px at 18% 70%,#bffff8,transparent),radial-gradient(1.6px 1.6px at 42% 84%,#9cc8ff,transparent),radial-gradient(2px 2px at 66% 76%,#bffff8,transparent),radial-gradient(1.4px 1.4px at 84% 88%,#d8b8ff,transparent),radial-gradient(1.8px 1.8px at 30% 92%,#bffff8,transparent)}
${X}[data-tema=abissal] :is(.grupo,.an-grupo,.av-proposta){box-shadow:0 0 0 1px rgba(120,240,255,.12),0 0 24px rgba(63,242,224,.08),var(--sombra)}
${X}[data-tema=abissal] .thumb{box-shadow:0 0 10px rgba(63,242,224,.35)}

/* ---------- Obsidiana: cristais de vidro vulcânico no fundo, reflexo passando e losango nos títulos ---------- */
${X}[data-tema=obsidiana] body>.ceu .k3{left:-24px;bottom:-14px;width:210px;height:230px;opacity:.95;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 210 230'><g stroke='%23b48cff' stroke-opacity='.35' stroke-width='1' stroke-linejoin='round'><path d='M40 230 L58 70 L92 40 L104 230Z' fill='%23120a1c'/><path d='M58 70 L92 40 L78 230 Z' fill='%231d1230'/><path d='M96 230 L120 110 L150 92 L168 230Z' fill='%230f0918'/><path d='M120 110 L150 92 L140 230Z' fill='%23261840'/><path d='M0 230 L14 150 L36 136 L48 230Z' fill='%23160d22'/><path d='M150 230 L176 160 L196 170 L206 230Z' fill='%23140b20'/></g><g stroke='%23ffffff' stroke-opacity='.3' stroke-width='1'><path d='M58 70 L92 40'/><path d='M120 110 L150 92'/><path d='M76 120 L84 210' stroke-opacity='.12'/></g></svg>") center bottom/contain no-repeat}
${X}[data-tema=obsidiana] body>.ceu .k4{top:-20%;bottom:-20%;left:0;width:36%;will-change:transform;animation:thReflexoO 13s ease-in-out infinite;
  background:linear-gradient(105deg,transparent,rgba(210,180,255,.06) 42%,rgba(255,255,255,.1) 50%,rgba(210,180,255,.06) 58%,transparent)}
${X}[data-tema=obsidiana] .secao>h2::before{content:"◆";font-size:.6em;color:#b48cff;text-shadow:0 0 8px rgba(160,100,255,.8)}
${X}[data-tema=obsidiana] h1{background:linear-gradient(180deg,#ffffff 0%,#d9c4ff 45%,#8a5cd6 55%,#efe6ff 80%);-webkit-background-clip:text;background-clip:text;color:transparent}

/* ---------- Acid: mandala girando no fundo, chips que mudam de forma e onda de arco-íris nos títulos ---------- */
${X}[data-tema=acid] body>.ceu i{left:50%;right:auto;top:42%;width:640px;height:640px;margin:-320px 0 0 -320px;aspect-ratio:auto;border-radius:50%;will-change:transform;animation:pGira 70s linear infinite;
  background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,95,210,.11) 0 9deg,transparent 9deg 18deg,rgba(43,217,255,.11) 18deg 27deg,transparent 27deg 36deg,rgba(125,255,90,.10) 36deg 45deg,transparent 45deg 54deg);
  -webkit-mask-image:radial-gradient(circle,#000 25%,transparent 70%);mask-image:radial-gradient(circle,#000 25%,transparent 70%)}
${X}[data-tema=acid] .chip:not(.on){animation:thMorfa 8s ease-in-out infinite}
${X}[data-tema=acid] .secao>h2{flex-wrap:wrap}
${X}[data-tema=acid] .secao>h2::after{content:"";flex:1;min-width:60px;height:10px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='10'><defs><linearGradient id='g' x1='0' x2='1'><stop offset='0' stop-color='%23ff2bd6'/><stop offset='.5' stop-color='%232bd9ff'/><stop offset='1' stop-color='%237dff5a'/></linearGradient></defs><path d='M0 5 Q10 0 20 5 T40 5' fill='none' stroke='url(%23g)' stroke-width='2.5'/></svg>") 0 50%/40px 10px repeat-x}
${X}[data-tema=acid] .thumb{animation:thMorfa 9s ease-in-out infinite}

@keyframes thNebula1{from{transform:translate(0,0) rotate(0deg)}to{transform:translate(30px,-20px) rotate(6deg) scale(1.06)}}
@keyframes thNebula2{from{transform:translate(0,0) rotate(0deg)}to{transform:translate(-30px,25px) rotate(-5deg) scale(1.05)}}
@keyframes thCometa{0%{transform:translate(0,0) rotate(22deg);opacity:0}2%{opacity:1}11%{transform:translate(140vw,56vw) rotate(22deg);opacity:0}100%{transform:translate(140vw,56vw) rotate(22deg);opacity:0}}
@keyframes thOrbitaV{from{transform:rotate(-8deg) scaleY(.34) rotate(0deg)}to{transform:rotate(-8deg) scaleY(.34) rotate(360deg)}}
@keyframes thFumacaN{0%{opacity:0;transform:translateY(40px)}30%{opacity:.9}100%{opacity:0;transform:translateY(-170px) scaleX(1.2)}}
@keyframes thFumacaH{from{opacity:.45;transform:translateY(0)}to{opacity:.95;transform:translateY(-8px)}}
@keyframes thPersiana{from{transform:translateX(-12px);opacity:.75}to{transform:translateX(12px);opacity:1}}
@keyframes thSobe260{from{transform:translateY(0)}to{transform:translateY(-260px)}}
@keyframes thIsca{0%,100%{transform:translate(0,0);opacity:.85}50%{transform:translate(10px,-14px);opacity:1}}
@keyframes thReflexoO{0%{transform:translateX(-130%)}65%,100%{transform:translateX(330%)}}

@media (prefers-reduced-motion:reduce){
  :is([data-tema=galaxia],[data-tema=noir],[data-tema=abissal],[data-tema=obsidiana],[data-tema=acid]) :is(.ceu>span,.ceu>i,.ceu>b,.chip,.thumb){animation:none!important}
  :is([data-tema=galaxia],[data-tema=noir],[data-tema=abissal],[data-tema=obsidiana],[data-tema=acid]) :is(.faixa)::before,:is([data-tema=galaxia],[data-tema=noir],[data-tema=abissal],[data-tema=obsidiana],[data-tema=acid]) :is(.faixa)::after{animation:none!important}
}

/* =====================================================================
   TEMAS · LOTE 4: Galáxia (versão 2, pela nebulosa roxa) e melhorias em Frutiger Aero, Dark Aero, Frutiger Metro, Gen X Soft Club e Gatinhos.
   Cada regra começa com ${X} (só reforça a prioridade).
   ===================================================================== */

/* ---------- Galáxia v2: nebulosa roxa realista (camadas de gás, aglomerado de estrelas, poeira escura) ---------- */
${X}[data-tema=galaxia]{
  --ceu:radial-gradient(ellipse 45% 30% at 48% 42%,rgba(150,80,200,.45),transparent 70%),radial-gradient(ellipse 30% 45% at 22% 30%,rgba(120,60,170,.35),transparent 70%),radial-gradient(ellipse 35% 25% at 78% 60%,rgba(170,90,210,.3),transparent 70%),radial-gradient(ellipse 60% 40% at 50% 100%,rgba(60,20,90,.4),transparent 70%),linear-gradient(180deg,#0c0614 0%,#0a0410 50%,#06020a 100%);
  --ceu-giro:none;
  --heroi:radial-gradient(ellipse 55% 80% at 85% 30%,rgba(190,120,255,.42),transparent 70%),radial-gradient(ellipse 40% 60% at 20% 110%,rgba(120,50,190,.45),transparent 70%),linear-gradient(160deg,rgba(40,16,70,.92),rgba(14,6,26,.96))}
${X}[data-tema=galaxia] body>.ceu .k1{animation:thNebula1 80s ease-in-out infinite alternate;
  background:radial-gradient(ellipse 22% 9% at 30% 28%,rgba(210,150,255,.22),transparent 70%),radial-gradient(ellipse 14% 26% at 70% 40%,rgba(190,110,240,.2),transparent 70%),radial-gradient(ellipse 26% 8% at 58% 64%,rgba(220,170,255,.16),transparent 70%),radial-gradient(ellipse 10% 22% at 40% 70%,rgba(160,90,220,.18),transparent 70%)}
${X}[data-tema=galaxia] body>.ceu .k2{animation:thNebula2 100s ease-in-out infinite alternate;
  background:radial-gradient(ellipse 18% 12% at 52% 44%,rgba(255,200,255,.14),transparent 70%),radial-gradient(ellipse 30% 10% at 25% 55%,rgba(140,80,200,.18),transparent 70%),radial-gradient(ellipse 12% 30% at 85% 25%,rgba(150,90,210,.16),transparent 70%)}
/* Poeira escura (as colunas da foto), parada. */
${X}[data-tema=galaxia] body>.ceu .k3{left:0;right:0;top:0;bottom:0;width:auto;height:auto;opacity:1;animation:none;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 800' preserveAspectRatio='xMidYMid slice'><filter id='b'><feGaussianBlur stdDeviation='14'/></filter><g fill='%23040108' filter='url(%23b)'><path d='M230 800 C220 720 250 660 236 600 C226 556 250 520 270 500 C290 480 300 520 292 560 C286 610 320 660 330 800Z' fill-opacity='.9'/><path d='M0 260 C40 300 30 360 70 400 C90 430 60 470 0 480Z' fill-opacity='.8'/><path d='M400 120 C360 150 370 200 330 240 C310 270 350 300 400 300Z' fill-opacity='.75'/><path d='M0 700 C60 660 120 690 160 740 C180 770 160 800 0 800Z' fill-opacity='.85'/></g><g fill='%23b48cff' fill-opacity='.10' filter='url(%23b)'><path d='M262 498 C280 480 300 500 296 540 C290 520 276 506 262 498Z'/></g></svg>") center/cover no-repeat}
/* Estrelas fortes com brilho (algumas com raios finos), piscando devagar. */
${X}[data-tema=galaxia] body>.ceu .k4{top:0;left:0;right:0;bottom:0;will-change:opacity;animation:thPisca2 4.5s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='420'><defs><radialGradient id='s'><stop offset='0' stop-color='%23ffffff'/><stop offset='.25' stop-color='%23f0dcff' stop-opacity='.9'/><stop offset='1' stop-color='%23b48cff' stop-opacity='0'/></radialGradient></defs><circle cx='60' cy='70' r='9' fill='url(%23s)'/><circle cx='230' cy='160' r='7' fill='url(%23s)'/><circle cx='120' cy='300' r='11' fill='url(%23s)'/><circle cx='260' cy='370' r='6' fill='url(%23s)'/><g stroke='%23ffffff' stroke-opacity='.35' stroke-width='.6'><path d='M120 284 V316 M104 300 H136'/><path d='M60 58 V82 M48 70 H72'/></g></svg>") 0 0/300px 420px}
/* Aglomerado de estrelas no meio (como o centro da foto). */
${X}[data-tema=galaxia] body>.ceu i{left:50%;right:auto;top:28%;width:280px;height:240px;margin-left:-150px;aspect-ratio:auto;transform:none;will-change:opacity;animation:thPisca2 6s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 280 240'><defs><radialGradient id='n'><stop offset='0' stop-color='%23e8c8ff' stop-opacity='.5'/><stop offset='1' stop-color='%23b070ff' stop-opacity='0'/></radialGradient></defs><ellipse cx='150' cy='120' rx='120' ry='90' fill='url(%23n)'/><g fill='%23ffffff'><circle cx='150' cy='118' r='1.6'/><circle cx='142' cy='126' r='1.2'/><circle cx='160' cy='110' r='1.4'/><circle cx='132' cy='112' r='1'/><circle cx='168' cy='128' r='1.1'/><circle cx='156' cy='134' r='.9'/><circle cx='124' cy='130' r='1.3'/><circle cx='176' cy='116' r='.8'/><circle cx='146' cy='100' r='1'/><circle cx='138' cy='140' r='.8'/><circle cx='186' cy='136' r='1.2'/><circle cx='110' cy='118' r='.9'/><circle cx='196' cy='104' r='.8'/><circle cx='98' cy='96' r='1.1'/><circle cx='206' cy='150' r='.9'/><circle cx='88' cy='150' r='.8'/><circle cx='220' cy='86' r='1.3'/><circle cx='70' cy='120' r='.9'/></g><g fill='%23e6c8ff'><circle cx='164' cy='120' r='.9'/><circle cx='136' cy='120' r='.7'/><circle cx='152' cy='142' r='.8'/><circle cx='118' cy='104' r='.7'/><circle cx='180' cy='96' r='.7'/></g></svg>") center/contain no-repeat}
${X}[data-tema=galaxia] body>.ceu .k5{left:0;right:0;top:0;bottom:0;width:auto;height:auto;border-radius:0;box-shadow:none;opacity:.08;animation:none;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .85 0 0 0 0 .7 0 0 0 0 1 0 0 0 .8 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>") 0 0/180px 180px}
${X}[data-tema=galaxia] .faixa::before{display:none}
${X}[data-tema=galaxia] .faixa::after{left:0;top:0;width:auto;right:0;bottom:0;aspect-ratio:auto;margin-top:0;animation:thPisca2 3.4s ease-in-out infinite alternate;
  background:radial-gradient(1.4px 1.4px at 12% 24%,#ffffff,transparent),radial-gradient(1px 1px at 30% 70%,#f0dcff,transparent),radial-gradient(1.8px 1.8px at 56% 18%,#ffffff,transparent),radial-gradient(1px 1px at 70% 82%,#e6c8ff,transparent),radial-gradient(1.2px 1.2px at 88% 50%,#ffffff,transparent),radial-gradient(1px 1px at 44% 46%,#ffffff,transparent)}

/* ---------- Frutiger Aero: sol com reflexo de lente, bolhas de luz, faixa de aurora, gotas no vidro e folha brilhante ---------- */
${X}[data-tema=frutiger] body>.ceu .k3{right:-120px;top:-120px;width:360px;height:360px;will-change:opacity;animation:thRaios 6s ease-in-out infinite alternate;
  background:radial-gradient(circle,rgba(255,255,255,.95) 0 8%,rgba(255,255,255,.4) 16%,transparent 45%),radial-gradient(circle at 20% 80%,rgba(160,230,255,.35) 0 4%,transparent 7%),radial-gradient(circle at 5% 98%,rgba(190,255,200,.3) 0 3%,transparent 5%)}
${X}[data-tema=frutiger] body>.ceu .k4{left:0;right:0;top:0;height:calc(100% + 260px);will-change:transform;animation:thSobe260 30s linear infinite;
  background:radial-gradient(circle 14px at 40px 60px,rgba(255,255,255,.55),rgba(190,240,255,.2) 60%,transparent 100%),radial-gradient(circle 22px at 170px 150px,rgba(210,255,220,.45),rgba(160,230,190,.15) 60%,transparent 100%),radial-gradient(circle 9px at 100px 220px,rgba(255,255,255,.6),transparent 100%);background-size:220px 260px}
${X}[data-tema=frutiger] body>.ceu .k5{left:0;top:30%;width:calc(100% + 600px);height:180px;opacity:.55;will-change:transform;animation:thNuvem600 50s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='180'><defs><linearGradient id='a' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23ffffff' stop-opacity='0'/><stop offset='.5' stop-color='%23b8ffe0' stop-opacity='.55'/><stop offset='1' stop-color='%2380d8ff' stop-opacity='0'/></linearGradient></defs><path d='M0 90 Q150 30 300 90 T600 90 V130 Q450 70 300 130 T0 130Z' fill='url(%23a)'/></svg>") 0 0/600px 180px repeat-x}
${X}[data-tema=frutiger] .faixa{position:relative;overflow:hidden;isolation:isolate}
${X}[data-tema=frutiger] .faixa::after{content:"";position:absolute;top:0;left:0;right:0;bottom:0;z-index:-1;pointer-events:none;
  background:radial-gradient(circle 5px at 18% 72%,rgba(255,255,255,.75),rgba(255,255,255,.15) 70%,transparent 100%),radial-gradient(circle 3px at 32% 84%,rgba(255,255,255,.7),transparent 100%),radial-gradient(circle 4px at 60% 78%,rgba(255,255,255,.7),rgba(255,255,255,.12) 70%,transparent 100%),radial-gradient(circle 2.5px at 74% 88%,rgba(255,255,255,.7),transparent 100%)}
${X}[data-tema=frutiger] .faixa::before{content:"";position:absolute;right:-10px;top:-12px;width:90px;height:70px;z-index:-1;pointer-events:none;opacity:.6;transform:rotate(-20deg);
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 60'><defs><linearGradient id='f' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23d4ff9a'/><stop offset='.5' stop-color='%2368c83a'/><stop offset='1' stop-color='%232f8a1a'/></linearGradient></defs><path d='M4 32 Q40 -6 86 26 Q46 64 4 32Z' fill='url(%23f)'/><path d='M8 32 Q46 28 84 27' fill='none' stroke='%23ffffff' stroke-opacity='.6' stroke-width='1.2'/><path d='M20 22 Q40 10 64 16' fill='none' stroke='%23ffffff' stroke-opacity='.7' stroke-width='2' stroke-linecap='round'/></svg>") center/contain no-repeat}
${X}[data-tema=frutiger] :is(.grupo,.an-grupo,.av-proposta){background:linear-gradient(180deg,rgba(255,255,255,.75),rgba(255,255,255,0) 26%),var(--card)}

/* ---------- Dark Aero: aurora verde, partículas de luz subindo e vidro preto brilhante ---------- */
${X}[data-tema=darkaero] body>.ceu .k1{left:0;top:18%;width:calc(100% + 600px);height:220px;opacity:.5;will-change:transform;animation:thNuvem600 60s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='220'><defs><linearGradient id='a' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%2346ff1e' stop-opacity='0'/><stop offset='.55' stop-color='%2346ff1e' stop-opacity='.35'/><stop offset='1' stop-color='%2318c8a0' stop-opacity='0'/></linearGradient></defs><path d='M0 110 Q150 40 300 110 T600 110 V160 Q450 90 300 160 T0 160Z' fill='url(%23a)'/></svg>") 0 0/600px 220px repeat-x}
${X}[data-tema=darkaero] body>.ceu .k2{left:0;right:0;top:0;height:calc(100% + 260px);will-change:transform;animation:thSobe260 24s linear infinite;
  background:radial-gradient(circle at 30px 50px,rgba(140,255,100,.55) 0 1.4px,transparent 3px),radial-gradient(circle at 160px 140px,rgba(140,255,100,.4) 0 1px,transparent 2.4px),radial-gradient(circle at 90px 230px,rgba(200,255,180,.5) 0 1.2px,transparent 2.6px);background-size:200px 260px}
${X}[data-tema=darkaero] .faixa{position:relative;overflow:hidden;isolation:isolate}
${X}[data-tema=darkaero] .faixa::before{content:"";position:absolute;top:-40%;left:-10%;width:60%;height:180%;z-index:-1;pointer-events:none;transform:rotate(18deg);background:linear-gradient(90deg,transparent,rgba(255,255,255,.07) 40%,rgba(255,255,255,.12) 50%,transparent)}
${X}[data-tema=darkaero] :is(.grupo,.an-grupo,.av-proposta){background:linear-gradient(180deg,rgba(255,255,255,.07),transparent 30%),var(--card);border-top-color:rgba(160,255,120,.35)}

/* ---------- Frutiger Metro: retícula de pontos, quadradinhos deslizando e selo estourado no value ---------- */
${X}[data-tema=metro] body>.ceu .k4{top:0;left:0;right:0;bottom:0;
  background:radial-gradient(circle,rgba(17,17,17,.55) 0 2.2px,transparent 2.6px) 0 0/12px 12px;
  -webkit-mask-image:linear-gradient(160deg,transparent 45%,#000 100%);mask-image:linear-gradient(160deg,transparent 45%,#000 100%)}
${X}[data-tema=metro] body>.ceu .k5{left:0;right:0;top:-240px;height:calc(100% + 240px);will-change:transform;animation:thQuadros 26s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><g fill='none' stroke-width='3'><rect x='30' y='30' width='26' height='26' stroke='%23111'/><rect x='150' y='90' width='18' height='18' stroke='white'/><rect x='80' y='170' width='34' height='34' stroke='%23111'/></g><rect x='196' y='196' width='14' height='14' fill='%237a2ad6'/><rect x='118' y='20' width='10' height='10' fill='white'/></svg>") 0 0/240px 240px}
${X}[data-tema=metro] .faixa{position:relative;isolation:isolate}
${X}[data-tema=metro] .faixa::after{content:"";position:absolute;right:-12px;top:-14px;width:54px;height:54px;pointer-events:none;will-change:transform;animation:pGira 24s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 60'><path d='M30 2 L35 14 L48 8 L45 21 L58 24 L48 33 L56 44 L42 44 L40 58 L30 49 L20 58 L18 44 L4 44 L12 33 L2 24 L15 21 L12 8 L25 14Z' fill='white' stroke='%23111' stroke-width='3' stroke-linejoin='round'/><circle cx='30' cy='30' r='8' fill='%23ff5fa8' stroke='%23111' stroke-width='2.5'/></svg>") center/contain no-repeat}

/* ---------- Gen X Soft Club: gotas de cromo líquido flutuando e um CD furta-cor no value ---------- */
${X}[data-tema=softclub] body>.ceu :is(.k2,.k3){will-change:transform;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><defs><linearGradient id='c' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23ffffff'/><stop offset='.3' stop-color='%23a9e6e2'/><stop offset='.5' stop-color='%23234a4e'/><stop offset='.7' stop-color='%23d6fbf7'/><stop offset='1' stop-color='%235c8f94'/></linearGradient></defs><path d='M60 6 C92 8 114 30 110 62 C106 94 84 116 54 112 C24 108 6 86 10 56 C14 26 32 4 60 6Z' fill='url(%23c)' fill-opacity='.55'/><ellipse cx='42' cy='34' rx='14' ry='8' fill='white' fill-opacity='.6' transform='rotate(-30 42 34)'/></svg>") center/contain no-repeat}
${X}[data-tema=softclub] body>.ceu .k2{left:-30px;top:20%;width:120px;height:120px;opacity:.6;animation:thGotaCromo 14s ease-in-out infinite alternate}
${X}[data-tema=softclub] body>.ceu .k3{right:-20px;top:58%;width:80px;height:80px;opacity:.5;animation:thGotaCromo 11s ease-in-out -4s infinite alternate-reverse}
${X}[data-tema=softclub] .faixa{position:relative;overflow:hidden;isolation:isolate}
${X}[data-tema=softclub] .faixa::after{content:"";position:absolute;right:-40px;top:50%;width:130px;height:130px;margin-top:-65px;z-index:-1;border-radius:50%;pointer-events:none;opacity:.55;will-change:transform;animation:pGira 18s linear infinite;
  background:radial-gradient(circle,transparent 0 9px,rgba(255,255,255,.8) 10px 11px,transparent 12px 20px,rgba(255,255,255,.3) 21px 22px,transparent 23px),conic-gradient(from 0deg,#ffd6f0,#d6f0ff,#d6ffe8,#fff0d6,#e8d6ff,#ffd6f0)}

/* ---------- Gatinhos: novelo rolando no pé da tela e corações subindo ---------- */
${X}[data-tema=gatinhos] body>.ceu .k4{left:0;bottom:10px;width:46px;height:46px;will-change:transform;animation:thNovelo 22s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 46 46'><circle cx='23' cy='23' r='20' fill='%23ff9cc2' stroke='%23c2336a' stroke-width='1.5'/><g fill='none' stroke='%23e0447f' stroke-width='1.4'><path d='M6 18 Q23 30 40 16'/><path d='M8 30 Q24 20 38 32'/><path d='M18 4 Q28 23 16 42'/><path d='M30 5 Q18 23 32 41'/></g></svg>") center/contain no-repeat}
${X}[data-tema=gatinhos] body>.ceu .k5{left:0;right:0;top:0;height:calc(100% + 260px);opacity:.5;will-change:transform;animation:thSobe260 28s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='260'><g fill='%23ff8ab6'><path d='M40 60 c-3-4-9-1-6 4 l6 6 6-6 c3-5-3-8-6-4z'/><path d='M150 180 c-2-3-6-1-4 3 l4 4 4-4 c2-4-2-6-4-3z'/><path d='M100 240 c-2.5-3.5-7.5-1-5 3.5 l5 5 5-5 c2.5-4.5-2.5-7-5-3.5z' fill-opacity='.7'/></g></svg>") 0 0/200px 260px}
${X}[data-tema=gatinhos] :is(.grupo,.an-grupo,.av-proposta){border-width:2px}

@keyframes thQuadros{from{transform:translateY(0)}to{transform:translateY(240px)}}
@keyframes thGotaCromo{from{transform:translate(0,0) rotate(0deg) scale(1)}to{transform:translate(20px,-30px) rotate(25deg) scale(1.1,.92)}}
@keyframes thNovelo{from{transform:translateX(-60px) rotate(0deg)}to{transform:translateX(calc(100vw + 60px)) rotate(1080deg)}}

@media (prefers-reduced-motion:reduce){
  :is([data-tema=frutiger],[data-tema=darkaero],[data-tema=metro],[data-tema=softclub],[data-tema=gatinhos],[data-tema=galaxia]) :is(.ceu>span,.ceu>i,.ceu>b,.toque){animation:none!important}
  :is([data-tema=frutiger],[data-tema=darkaero],[data-tema=metro],[data-tema=softclub],[data-tema=gatinhos],[data-tema=galaxia]) :is(.faixa,.btn)::before,:is([data-tema=frutiger],[data-tema=darkaero],[data-tema=metro],[data-tema=softclub],[data-tema=gatinhos],[data-tema=galaxia]) :is(.faixa,.btn)::after{animation:none!important}
}

/* ---------- Archangel (NOVO): o Angel Core exato, com as cores invertidas (preto no lugar do branco) ----------
   Mesmas formas, mesmos enfeites e mesmo fundo do Angel Core: pérola negra, prata, asas com auréola no value,
   raios, nuvens escuras, penas pretas caindo e brilhos prateados. */
[data-tema=archangel]{color-scheme:dark;--body-fundo:transparent;
  --topo:#141826;--bg:#07080c;--card:rgba(13,14,19,.95);--card2:#181a22;--borda:#252834;--card-borda:#2c303d;--fg:#e6e8f2;--sub:#8f94ad;
  --acc:#6b7290;--acc-fundo:linear-gradient(165deg,#3e4250 0%,#15161c 30%,#2c2f3a 55%,#08090c 75%,#3d4150 100%);--acc-press:#2c2f3a;--on-acc:#eef0f8;--acc-t:#b4bbe0;--rap:#9db6ff;
  --heroi:radial-gradient(ellipse 70% 60% at 50% -10%,rgba(0,0,0,.95),transparent 70%),linear-gradient(180deg,#1b2032 0%,#10131d 70%,#0a0a10 100%);
  --heroi-borda:#2d3242;--on-heroi:#e6e8f2;--heroi-linha:rgba(230,232,242,.12);--heroi-aviso:#f2a86a;
  --pos:#8fe0b8;--pos-bg:#12261d;--warn:#f2a86a;--warn-bg:#2a1b10;--neg:#ff8aa6;--neg-bg:#2e1220;
  --on-status:#07080c;--dou-bg:#12131b;--rec-bg:#0f1a16;
  --sombra:0 1px 2px rgba(0,0,0,.5),0 8px 24px rgba(0,0,0,.45);--vidro:none;--folha:#0d0e13;
  --btn-sombra:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -3px 7px rgba(0,0,0,.55),0 4px 14px rgba(110,120,170,.22);
  --c2-btn-sombra:inset 0 1px 0 rgba(255,255,255,.22),inset 0 -3px 7px rgba(0,0,0,.55),0 4px 14px rgba(140,110,200,.24);
  --r-btn:999px;--r-chip:999px;--r-card:22px;--r-heroi:26px;--r-thumb:50%;--r-seg:999px;--r-seg-b:999px;--r-campo:999px;
  --f-titulo:"Cormorant Garamond",Georgia,serif;--t-estilo:italic;--t-peso:600;--t-tam:42px;--t-esp:0;--t-cor:#d9ddf0;--t-sombra:0 0 18px rgba(150,160,215,.3);
  --ceu:radial-gradient(ellipse 90% 45% at 50% -8%,#000000,transparent 70%),linear-gradient(180deg,#151a2c 0%,#0d0f19 40%,#07080c 75%);
  --c2:#6a55a8;--c2-fundo:linear-gradient(165deg,#463a66 0%,#16121f 30%,#33294d 55%,#0b0910 75%,#4b3d70 100%);--c2-press:#33294d;--c2-on:#efe8ff;--c2-t:#c9b6f2;--c2-bg:#18131f;
  --c2-heroi:radial-gradient(ellipse 70% 60% at 50% -10%,rgba(0,0,0,.95),transparent 70%),linear-gradient(180deg,#221a36 0%,#141020 70%,#0b0910 100%);--c2-heroi-borda:#382c4f;--c2-on-heroi:#efe8ff}
/* Formas (iguais às do Angel Core). */
[data-tema=archangel] h1{letter-spacing:var(--t-esp);color:var(--t-cor)}
[data-tema=archangel] .btn{position:relative;border-radius:var(--r-btn);box-shadow:var(--btn-sombra)}
[data-tema=archangel] .btn.sec{box-shadow:none}
[data-tema=archangel] .seg.abas button.on{position:relative;box-shadow:var(--btn-sombra)}
[data-tema=archangel] :is(.chip,.chip-conta,.cont,.tag,.faixa-conta){border-radius:var(--r-chip)}
[data-tema=archangel] :is(.grupo,.vazio,.an-grupo,.av-proposta,.veredito,.av-resumo,.dia-card,.dia-lucro,.ti-graf,.ct-c,.ti-bloco){border-radius:var(--r-card)}
[data-tema=archangel] .faixa{position:relative;overflow:hidden;isolation:isolate;border-radius:var(--r-heroi)}
[data-tema=archangel] .folha{border-radius:var(--r-card)}
[data-tema=archangel] :is(input[type=search],.seg,.seg button,.ti-voltar,.ti-acao){border-radius:999px}
[data-tema=archangel] .thumb{border-radius:50%}
/* Detalhes (os do Angel Core, invertidos). */
[data-tema=archangel] :is(.btn,.seg.abas button.on){overflow:hidden}
[data-tema=archangel] :is(.btn,.seg.abas button.on)::after{content:"";position:absolute;top:0;bottom:0;left:0;width:38%;pointer-events:none;background:linear-gradient(100deg,transparent,rgba(210,190,255,.28) 45%,rgba(190,215,255,.26) 55%,transparent);transform:translateX(-160%) skewX(-18deg);animation:thPerola 5.5s ease-in-out infinite}
[data-tema=archangel] .seg.abas button.on::after{animation-delay:-2.6s}
[data-tema=archangel] .btn.sec{background:linear-gradient(180deg,#15161d,#0c0d12);border-color:#2c303d}
[data-tema=archangel] .btn.sec::after{opacity:.5}
[data-tema=archangel] .chip{background:linear-gradient(180deg,#15161d,#0d0e13);border-color:#262a36}
[data-tema=archangel] .chip.on{box-shadow:var(--btn-sombra)}
[data-tema=archangel] .chip.filtro.on{background:var(--neg-bg);box-shadow:none}
[data-tema=archangel] :is(.grupo,.an-grupo,.av-proposta,.veredito){outline:1px solid #22252f;outline-offset:3px}
[data-tema=archangel] .thumb{box-shadow:0 0 0 2px #07080c,0 0 0 3px #3a3e4c}
[data-tema=archangel] .faixa{padding-top:32px}
[data-tema=archangel] .faixa::after{content:"";position:absolute;left:50%;top:6px;width:120px;height:24px;transform:translateX(-50%);pointer-events:none;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 24'><g fill='%230c0d12' stroke='%238a92aa' stroke-width='.8' stroke-linejoin='round'><path d='M50 15 C42 6 26 3 8 6 C16 9 13 11 6 12 C15 14 12 16 8 18 C22 19 38 18 50 15Z'/><path d='M70 15 C78 6 94 3 112 6 C104 9 107 11 114 12 C105 14 108 16 112 18 C98 19 82 18 70 15Z'/></g><ellipse cx='60' cy='9' rx='9' ry='3.2' fill='none' stroke='%23454a5c' stroke-width='1.8'/><ellipse cx='60' cy='9' rx='9' ry='3.2' fill='none' stroke='%23c9cfe4' stroke-width='.7'/><circle cx='60' cy='17' r='1.6' fill='%238a92aa'/></svg>") center/contain no-repeat}
[data-tema=archangel] body>.ceu .k1{top:-10%;left:-30%;right:-30%;height:85%;opacity:.55;will-change:opacity;
  background:repeating-conic-gradient(from 150deg at 50% -12%,rgba(150,160,210,0) 0deg,rgba(150,160,210,.22) 3deg,rgba(150,160,210,0) 7deg,rgba(150,160,210,0) 14deg);
  -webkit-mask-image:linear-gradient(#000,transparent 80%);mask-image:linear-gradient(#000,transparent 80%);animation:thRaios 7s ease-in-out infinite alternate}
[data-tema=archangel] body>.ceu :is(.k2,.k3){left:0;width:calc(100% + 600px);height:180px;will-change:transform;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='180'><g fill='%2320232d' fill-opacity='.95'><ellipse cx='100' cy='120' rx='90' ry='26'/><ellipse cx='140' cy='98' rx='50' ry='34'/><ellipse cx='80' cy='104' rx='36' ry='24'/><ellipse cx='420' cy='70' rx='70' ry='20'/><ellipse cx='450' cy='54' rx='36' ry='24'/><ellipse cx='395' cy='60' rx='24' ry='16'/></g></svg>") 0 0/600px 180px repeat-x}
[data-tema=archangel] body>.ceu .k2{top:34%;opacity:.9;animation:thNuvem600 95s linear infinite}
[data-tema=archangel] body>.ceu .k3{bottom:-30px;opacity:1;animation:thNuvem600 140s linear -40s infinite reverse}
[data-tema=archangel] body>.ceu .k4{left:0;right:0;top:-400px;height:calc(100% + 400px);will-change:transform;animation:thCai 28s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='400'><defs><g id='p'><path d='M8 0 Q16 12 11 30 L8 40 L5 30 Q0 12 8 0Z'/><path d='M8 5 V40' fill='none'/></g></defs><g fill='%230a0b0f' stroke='%235a6078' stroke-width='.9'><use href='%23p' transform='translate(40 40) rotate(25)'/><use href='%23p' transform='translate(170 160) rotate(-35) scale(.8)'/><use href='%23p' transform='translate(90 290) rotate(60) scale(.65)'/></g></svg>") 0 0/240px 400px}
[data-tema=archangel] body>.ceu .k5{top:0;left:0;right:0;bottom:0;animation:thPisca2 3.2s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='220'><g fill='%23aeb6d8'><path d='M30 30 l1.6 5.4 5.4 1.6 -5.4 1.6 -1.6 5.4 -1.6 -5.4 -5.4 -1.6 5.4 -1.6z'/><path d='M140 120 l1.2 4 4 1.2 -4 1.2 -1.2 4 -1.2 -4 -4 -1.2 4 -1.2z'/><circle cx='90' cy='190' r='1.3'/><circle cx='160' cy='40' r='1'/></g></svg>") 0 0/180px 220px}
[data-tema=archangel] .toque{animation:thAureolaN .55s ease-out}
@keyframes thAureolaN{0%{box-shadow:0 0 0 0 rgba(200,210,240,.7),0 0 0 0 rgba(120,130,190,.5);filter:brightness(1.3)}100%{box-shadow:0 0 0 12px rgba(200,210,240,0),0 0 0 22px rgba(120,130,190,0);filter:none}}
@media (prefers-reduced-motion:reduce){
  [data-tema=archangel] :is(.ceu>span,.toque){animation:none!important}
  [data-tema=archangel] :is(.btn,.seg button)::after{animation:none!important}
}

/* =====================================================================
   RODADA DE BOTÕES (todos os 22 temas): material do tema + formato próprio + detalhe dentro.
   O detalhe é uma camada a mais no fundo do botão principal (sem ::before/::after),
   para não brigar com os enfeites que cada tema já usa nos pseudo-elementos.
   Cada regra começa com ${X} (só reforça a prioridade).
   ===================================================================== */
${X} .btn:not(.sec){background-repeat:no-repeat}

/* ---------- Clássicos ---------- */
/* Azul: pílula de vidro com uma ondinha antes do texto. */
${X}[data-tema=azul] .btn:not(.sec){padding-left:38px;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 10'><path d='M1 4 Q4.5 1 7 4 T13 4 M1 8 Q4.5 5 7 8 T13 8' fill='none' stroke='white' stroke-width='1.6' stroke-linecap='round'/></svg>") 16px 50%/14px 10px no-repeat,linear-gradient(180deg,rgba(255,255,255,.28),rgba(255,255,255,0) 52%),var(--acc-fundo)}
/* Dark: grafite escovado, canto cortado de ferramenta e um LED aceso. */
${X}[data-tema=dark] .btn:not(.sec){padding-left:30px;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);border-radius:6px;
  background:radial-gradient(circle 3.5px at 15px 50%,#d6f4ff,#8fe0ff 50%,rgba(143,224,255,0) 100%),repeating-linear-gradient(90deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px),linear-gradient(180deg,#2a4f9c,#173b82 60%,#11306b)}
${X}[data-tema=dark] .chip.on{clip-path:polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,0 100%)}
/* OLED: retângulo de tela com um pixel aceso em cada canto. */
${X}[data-tema=oled] .btn:not(.sec){border-radius:6px;
  background:linear-gradient(#f5f5f7,#f5f5f7) 4px 4px/3px 3px no-repeat,linear-gradient(#f5f5f7,#f5f5f7) calc(100% - 4px) 4px/3px 3px no-repeat,linear-gradient(#f5f5f7,#f5f5f7) 4px calc(100% - 4px)/3px 3px no-repeat,linear-gradient(#f5f5f7,#f5f5f7) calc(100% - 4px) calc(100% - 4px)/3px 3px no-repeat,transparent}
${X}[data-tema=oled] .chip.on{border-radius:5px}

/* ---------- Estéticos ---------- */
/* Galáxia: vidro de nebulosa com pontinhos de estrela e uma estrela de quatro pontas. */
${X}[data-tema=galaxia] .btn:not(.sec){padding-left:36px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M6 0 L7.4 4.6 12 6 7.4 7.4 6 12 4.6 7.4 0 6 4.6 4.6Z' fill='white'/></svg>") 16px 50%/12px 12px no-repeat,radial-gradient(1px 1px at 70% 30%,#ffffff,transparent),radial-gradient(1px 1px at 84% 70%,#ffffff,transparent),radial-gradient(1.2px 1.2px at 56% 76%,#f0dcff,transparent),radial-gradient(ellipse at 70% 20%,rgba(255,255,255,.28),transparent 60%),var(--acc-fundo)}
/* Frutiger Aero: bolha com uma gota d'água antes do texto. */
${X}[data-tema=frutiger] .btn:not(.sec){padding-left:34px;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 13'><path d='M5 0 C2 5 0 7 0 9 C0 11.3 2.2 13 5 13 C7.8 13 10 11.3 10 9 C10 7 8 5 5 0Z' fill='white' fill-opacity='.95'/><ellipse cx='3.4' cy='9' rx='1' ry='1.6' fill='%2322a3e6' fill-opacity='.6'/></svg>") 16px 50%/10px 13px no-repeat,var(--bolha)}
/* Gen X Soft Club: cromo líquido com reflexo forte, cápsula com friso e um equalizador. */
${X}[data-tema=softclub] .btn:not(.sec){padding-left:36px;color:#062022;
  box-shadow:inset 0 0 0 2px rgba(255,255,255,.55),inset 0 0 0 3px rgba(6,32,34,.22),0 0 14px rgba(95,211,204,.3);
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 12'><g fill='%23062022'><rect x='0' y='6' width='2.4' height='6' rx='1'/><rect x='3.8' y='2' width='2.4' height='10' rx='1'/><rect x='7.6' y='4' width='2.4' height='8' rx='1'/><rect x='11.4' y='7' width='2.4' height='5' rx='1'/></g></svg>") 16px 50%/14px 12px no-repeat,linear-gradient(180deg,#ffffff 0%,#d8f6f2 22%,#86d8d1 47%,#2f8f8a 52%,#a8e6e0 78%,#effffd 100%)}
/* Gatinhos: pelúcia (fofa por dentro) com uma patinha antes do texto. As orelhas continuam. */
${X}[data-tema=gatinhos] .btn:not(.sec){padding-left:38px;box-shadow:inset 0 -3px 0 rgba(0,0,0,.08),inset 0 2px 0 rgba(255,255,255,.45),0 4px 10px rgba(224,68,127,.25);
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'><g fill='white'><ellipse cx='17' cy='22' rx='8' ry='6.5'/><circle cx='8' cy='12' r='3.4'/><circle cx='14' cy='7.5' r='3.4'/><circle cx='21' cy='7.5' r='3.4'/><circle cx='27' cy='12' r='3.4'/></g></svg>") 16px 50%/15px 15px no-repeat,var(--acc-fundo)}
/* Dark Aero: vidro preto brilhante com um orbe verde aceso. */
${X}[data-tema=darkaero] .btn:not(.sec){padding-left:34px;
  background:radial-gradient(circle 6px at 17px 50%,#ffffff,#c8ffae 35%,rgba(70,255,30,.6) 70%,rgba(70,255,30,0) 100%),var(--acc-fundo)}
/* Frutiger Metro: impresso com retícula de pontos e uma seta no fim. */
${X}[data-tema=metro] .btn:not(.sec){padding-right:38px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 12'><path d='M0 6 H11 M7 1.5 L12 6 L7 10.5' fill='none' stroke='white' stroke-width='2.2' stroke-linecap='square'/></svg>") calc(100% - 14px) 50%/14px 12px no-repeat,radial-gradient(circle,rgba(255,95,168,.35) 0 1.2px,transparent 1.5px) 0 0/6px 6px,#111111}

/* ---------- Temáticos ---------- */
/* Abissal: geleia com duas bolhinhas dentro. */
${X}[data-tema=abissal] .btn:not(.sec){padding-left:36px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'><g fill='none' stroke='%2300161c' stroke-opacity='.65' stroke-width='1.3'><circle cx='5' cy='8.5' r='4'/><circle cx='11' cy='3.5' r='2.2'/></g><circle cx='3.6' cy='7' r='1' fill='%2300161c' fill-opacity='.5'/></svg>") 16px 50%/14px 14px no-repeat,var(--acc-fundo)}
/* Noir: papel fosco com furos de filme em cima e embaixo e um ponto de gravação. */
${X}[data-tema=noir] .btn:not(.sec){padding-left:28px;
  background:radial-gradient(circle 3.5px at 15px 50%,#0a0a0a 0 3px,transparent 3.6px),repeating-linear-gradient(90deg,#0a0a0a 0 4px,transparent 4px 10px) 0 3px/100% 3px no-repeat,repeating-linear-gradient(90deg,#0a0a0a 0 4px,transparent 4px 10px) 0 calc(100% - 3px)/100% 3px no-repeat,#f2f2f2}
/* Obsidiana: cristal com uma faceta de luz e um losango antes do texto (fica no miolo da moldura). */
${X}[data-tema=obsidiana] .btn:not(.sec){padding-left:38px;
  --miolo:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M6 0 L12 6 L6 12 L0 6Z' fill='white' fill-opacity='.9'/><path d='M6 0 L6 12 M0 6 H12' stroke='%235a22c8' stroke-width='.8'/></svg>") 18px 50%/12px 12px no-repeat,linear-gradient(115deg,transparent 40%,rgba(255,255,255,.28) 46%,transparent 52%),var(--acc-fundo)}
/* Acid: holográfico que corre, com uma espiral antes do texto. */
${X}[data-tema=acid] .btn:not(.sec){padding-left:36px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'><path d='M7 7 a1 1 0 0 1 2 0 a2 2 0 0 1 -4 0 a3 3 0 0 1 6 0 a4 4 0 0 1 -8 0 a5 5 0 0 1 10 0' fill='none' stroke='%231a0b2e' stroke-width='1.4' stroke-linecap='round'/></svg>") 15px 50%/14px 14px no-repeat,var(--acc-fundo) 0 50%/300% 100%;
  animation:thFluiA 6s linear infinite,thMorfa 7s ease-in-out infinite}

/* ---------- Novos ---------- */
/* Angel Core: pérola com uma auréola antes do texto. */
${X}[data-tema=angel] .btn:not(.sec){padding-left:40px;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 8'><ellipse cx='8' cy='4' rx='7' ry='2.6' fill='none' stroke='%235560a3' stroke-width='1.6'/></svg>") 16px 50%/16px 8px no-repeat,var(--acc-fundo)}
/* Archangel: pérola negra com a auréola de prata. */
${X}[data-tema=archangel] .btn:not(.sec){padding-left:40px;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 8'><ellipse cx='8' cy='4' rx='7' ry='2.6' fill='none' stroke='%23d9ddf0' stroke-width='1.6'/></svg>") 16px 50%/16px 8px no-repeat,var(--acc-fundo)}
/* Romantic Gothic: veludo carmim com brilho em cima e uma rosa antes do texto (no miolo da moldura). */
${X}[data-tema=gotico] .btn:not(.sec){padding-left:36px;
  --miolo:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><circle cx='6' cy='6' r='5.4' fill='%23ffd6dc'/><path d='M6 2.5 C8.6 3 8.6 6.4 6 6.6 C4 6.6 4 4.6 6 4.6 C7.2 4.6 7.2 5.8 6 5.8' fill='none' stroke='%23a8142d' stroke-width='.9'/></svg>") 16px 50%/12px 12px no-repeat,radial-gradient(ellipse at 50% 0%,rgba(255,200,210,.28),transparent 60%),var(--acc-fundo)}
/* Moonlight: pedra-da-lua com o reflexo azulado passando e uma lua crescente. */
${X}[data-tema=luar] .btn:not(.sec){padding-left:36px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M8 1 A5.5 5.5 0 1 0 11 9 A4.4 4.4 0 1 1 8 1Z' fill='%2314113a'/></svg>") 16px 50%/12px 12px no-repeat,linear-gradient(115deg,transparent 35%,rgba(190,220,255,.5) 48%,transparent 60%),var(--acc-fundo)}
/* Floresta Escura: pedra de névoa (formato irregular) com um pinheiro antes do texto. */
${X}[data-tema=floresta] .btn:not(.sec){padding-left:32px;border-radius:12px 8px 14px 9px / 9px 13px 8px 12px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 100'><path d='M20 0L34 34H27L38 60H30L40 86H23V100H17V86H0L10 60H2L13 34H6Z' fill='%230b0d0c'/></svg>") 15px 50%/8px 18px no-repeat,repeating-linear-gradient(0deg,rgba(0,0,0,.035) 0 1px,transparent 1px 3px),var(--acc-fundo)}
${X}[data-tema=floresta] .chip.on{border-radius:10px 7px 11px 8px / 8px 11px 7px 10px}
/* Barbiecore: bala com brilho e um brilhinho antes do texto. */
${X}[data-tema=barbie] .btn:not(.sec){padding-left:38px;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M6 0 L7.4 4.6 12 6 7.4 7.4 6 12 4.6 7.4 0 6 4.6 4.6Z' fill='white'/></svg>") 18px 50%/13px 13px no-repeat,var(--acc-fundo)}
/* Dreamcore: algodão-doce fofo (bolinhas de luz dentro) com uma nuvenzinha antes do texto. */
${X}[data-tema=dreamcore] .btn:not(.sec){padding-left:40px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 10'><path d='M3 9.5 A2.8 2.8 0 0 1 3.2 4 A3.6 3.6 0 0 1 10 3 A3 3 0 0 1 13.4 9.5Z' fill='white' stroke='%23e27aa9' stroke-width='.9'/></svg>") 16px 50%/16px 10px no-repeat,radial-gradient(circle 12px at 30% 30%,rgba(255,255,255,.6),transparent),radial-gradient(circle 10px at 78% 70%,rgba(255,255,255,.45),transparent),var(--acc-fundo)}
/* Elixir: gota (cantos desiguais), líquido verde-esmeralda girando dentro e uma gotinha antes do texto. */
${X}[data-tema=elixir] .btn:not(.sec){padding-left:34px;border-radius:20px 20px 20px 6px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 13'><path d='M5 0 C2 5 0 7 0 9 C0 11.3 2.2 13 5 13 C7.8 13 10 11.3 10 9 C10 7 8 5 5 0Z' fill='%231ee1a0'/><ellipse cx='3.4' cy='9' rx='1' ry='1.6' fill='white' fill-opacity='.8'/></svg>") 15px 50%/10px 13px no-repeat,radial-gradient(ellipse 40% 90% at 85% 75%,rgba(30,225,160,.6),transparent 70%),var(--acc-fundo)}
${X}[data-tema=elixir] .chip.on{border-radius:16px 16px 16px 5px}
/* Zen: nanquim laqueado com traço de pincel, cantos de pincelada e um ensō antes do texto. */
${X}[data-tema=zen] .btn:not(.sec){padding-left:36px;border-radius:2px 10px 3px 12px / 12px 3px 10px 2px;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'><path d='M10.5 2.5 A5.5 5.5 0 1 0 12.4 8' fill='none' stroke='%23f5f5f5' stroke-width='2' stroke-linecap='round'/></svg>") 15px 50%/14px 14px no-repeat,repeating-linear-gradient(100deg,rgba(255,255,255,.035) 0 2px,transparent 2px 6px),var(--acc-fundo)}
${X}[data-tema=zen] .chip.on{border-radius:2px 8px 3px 9px / 9px 3px 8px 2px}

/* Conserto: nestes temas o fundo de todos os chips passava por cima do chip ligado
   (Barbiecore e Zen ficavam com letra clara em fundo claro). O chip ligado volta a usar a cor de destaque. */
:is([data-tema=barbie],[data-tema=zen],[data-tema=angel],[data-tema=archangel],[data-tema=dreamcore],[data-tema=elixir]) .chip.on:not(.filtro){background:var(--acc-fundo);color:var(--on-acc)}

@keyframes thFluiA{from{background-position:15px 50%,0% 50%}to{background-position:15px 50%,300% 50%}}

`;

// Tudo de tema que vai no <style> da página.
function css() {
  return CSS_TEMAS + CSS_TEMATICOS + CSS_TODOS + CSS_NOVOS;
}

// v5.3: { id: { e: 'light'|'dark', f: fonte? } } para o script do <head>.
function mapaTemas() {
  const m = {};
  for (const t of TEMAS) m[t.id] = t.f ? { e: t.e, f: t.f } : { e: t.e };
  return m;
}

// Fundo decorado (painel e Ajuda). <i>/<b> são dos temas da v5.3; as camadas
// k1..k5 são dos Temáticos (vazias e invisíveis nos outros temas).
function ceu() {
  return '<div class="ceu" aria-hidden="true"><i></i><b></b><span class="k1"></span><span class="k2"></span><span class="k3"></span><span class="k4"></span><span class="k5"></span></div>';
}

// v5.3: folha do menu ⋯ > Temas, com uma miniatura de cada tema.
// v6.19: 4 grupos (Clássicos, Estéticos, Temáticos e Novos) e sem o interruptor dos sustos.
function folhaTemas() {
  const op = (t) =>
    '<button type="button" class="t-op" data-t="' + t.id + '">' +
    '<span class="amostra" data-tema="' + t.id + '"><span class="ceu"><i></i><b></b></span>' +
    '<span class="a-x"><span class="a-h"></span><span class="a-l"></span><span class="a-l c"></span></span><span class="ok">✓</span></span>' +
    '<span>' + esc(t.nome) + '<span class="tipo">' + (t.e === 'dark' ? 'escuro' : 'claro') + '</span></span></button>';
  const grupo = (g, titulo) =>
    '<div class="t-grupo">' + titulo + '</div><div class="temas">' + TEMAS.filter((t) => t.g === g).map(op).join('') + '</div>';
  return (
    '<div id="t-fundo" class="fundo oculto"></div>' +
    '<div id="t-folha" class="folha oculto">' +
    '<p>Temas · fica salvo neste iPhone</p>' +
    grupo('c', 'Clássicos') + grupo('e', 'Estéticos') + grupo('t', 'Temáticos') + grupo('n', 'Novos') +
    '<button type="button" class="op cancelar" id="t-pronto">Pronto</button>' +
    '</div>'
  );
}

// Script da página: reação ao toque (v6.5: em todos os temas escolhidos; no Azul
// sai uma ondinha do ponto do dedo e nos Gatinhos aparece uma patinha).
// v6.19: saíram o relógio da fita e o interruptor dos sustos; entram as reações dos Novos.
function script() {
  return `<script>
(function(){
  var raiz = document.documentElement;
  var TOQUES = { thGeleia: 1, thInverte: 1, thRacha: 1, thOnda: 1,
    pAfunda: 1, pAcende: 1, pSupernova: 1, pEstoura: 1, pPulsoSom: 1, pAmassa: 1, pVarreV: 1, pEmpurra: 1,
    thAureola: 1, thAureolaN: 1, thLacre: 1, thLua: 1, thNevoa: 1, thBala: 1, thGota: 1, thVeneno: 1, thTinta: 1 };
  function some(el){ el.addEventListener('animationend', function(){ if (el.parentNode) el.parentNode.removeChild(el); }); }
  document.addEventListener('pointerdown', function(ev){
    var tema = raiz.getAttribute('data-tema');
    if (!tema || !ev.target || !ev.target.closest) return;
    var b = ev.target.closest('.btn,.chip,.seg button,.mais,.chip-conta,.folha .op,.an-fbtn');
    if (!b) return;
    b.classList.remove('toque');
    void b.offsetWidth;
    b.classList.add('toque');
    if (tema === 'azul' && b.matches('.btn,.chip,.seg button')) {
      var r = b.getBoundingClientRect(), s = document.createElement('span');
      s.className = 'rip';
      s.style.left = (ev.clientX - r.left) + 'px';
      s.style.top = (ev.clientY - r.top) + 'px';
      b.appendChild(s);
      some(s);
    } else if (tema === 'gatinhos') {
      var p = document.createElement('span');
      p.className = 'pata';
      p.style.left = ev.clientX + 'px';
      p.style.top = ev.clientY + 'px';
      document.body.appendChild(p);
      some(p);
    }
  }, { passive: true });
  document.addEventListener('animationend', function(ev){
    var t = ev.target;
    if (TOQUES[ev.animationName] && t && t.classList) t.classList.remove('toque');
  });
})();
</script>`;
}

module.exports = { TEMAS, ANTIGOS, temaValido, temaAtual, mapaTemas, css, ceu, folhaTemas, script };
