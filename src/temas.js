// Temas do painel. v5.3 (protótipo M2): cada tema tem visual fixo; sem tema
// escolhido, o painel segue o iPhone (Azul no claro, Dark no escuro). v5.3.1: a
// escolha fica no arquivo de ajustes (ponte PONTE + 'tema?t=<id>').
// v6.4: tudo de tema mora aqui (antes ficava no html.js) e entram os 6
// "Temáticos" (protótipo N6): além das cores, mudam a FORMA de botões, chips e
// cartões, o fundo animado e a reação ao toque. Regras de desempenho do N6:
// animação de tela cheia só com transform/opacity e sem backdrop-filter sobre
// fundo animado. A Fita Perdida tem sustos que o usuário pode desligar
// (ajustes.sustos, ponte PONTE + 'sustos?v=0|1').
// v6.5 (protótipo P3): os 13 temas antigos também viram temáticos (CSS_TODOS),
// com as cores de sempre; o Chromecore foi refeito como cromo tribal. Sem tema
// escolhido (seguindo o iPhone), o Azul/Dark continuam simples.

function esc(s) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => mapa[c]);
}

// g: c = Clássicos, e = Estéticos, t = Temáticos; e: esquema (claro/escuro);
// f: fonte do título (parâmetro family do Google Fonts; pode juntar duas famílias).
const TEMAS = [
  { id: 'azul', nome: 'Azul', g: 'c', e: 'light' },
  { id: 'dark', nome: 'Dark', g: 'c', e: 'dark' },
  { id: 'oled', nome: 'OLED', g: 'c', e: 'dark' },
  { id: 'rosinha', nome: 'Rosinha', g: 'c', e: 'light' },
  { id: 'vermelho', nome: 'Vermelho', g: 'c', e: 'dark' },
  { id: 'galaxia', nome: 'Galáxia', g: 'e', e: 'dark' },
  { id: 'frutiger', nome: 'Frutiger Aero', g: 'e', e: 'light' },
  { id: 'softclub', nome: 'Gen X Soft Club', g: 'e', e: 'dark', f: 'Syncopate:wght@700' },
  { id: 'gatinhos', nome: 'Gatinhos', g: 'e', e: 'light', f: 'Fredoka:wght@600' },
  { id: 'darkaero', nome: 'Dark Aero', g: 'e', e: 'dark', f: 'Exo+2:ital,wght@1,700' },
  { id: 'chromecore', nome: 'Chromecore', g: 'e', e: 'dark', f: 'Pirata+One' },
  { id: 'metalheart', nome: 'MetalHeart', g: 'e', e: 'dark', f: 'Grenze+Gotisch:wght@700' },
  { id: 'metro', nome: 'Frutiger Metro', g: 'e', e: 'light', f: 'Righteous' },
  { id: 'abissal', nome: 'Abissal', g: 't', e: 'dark', f: 'Comfortaa:wght@700' },
  { id: 'noir', nome: 'Noir', g: 't', e: 'dark', f: 'Bodoni+Moda:ital,opsz,wght@1,6..96,700' },
  { id: 'obsidiana', nome: 'Obsidiana', g: 't', e: 'dark', f: 'Cinzel:wght@700' },
  { id: 'veludo', nome: 'Veludo', g: 't', e: 'dark', f: 'Playfair+Display:ital,wght@1,700' },
  { id: 'acid', nome: 'Acid', g: 't', e: 'light', f: 'Climate+Crisis:YEAR@1979..2050' },
  { id: 'horror', nome: 'Fita Perdida', g: 't', e: 'dark', f: 'Special+Elite&family=VT323' },
];

// v5.3.1: confere se um id de tema existe (usado pela ponte que grava o tema).
function temaValido(id) {
  return TEMAS.some((t) => t.id === id);
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
[data-tema=rosinha]{color-scheme:light;
  --topo:#fde2ee;--bg:#fdf5f9;--card:#ffffff;--card2:#fbe9f1;--borda:#f2d4e2;--fg:#2b1a24;--sub:#7f6774;
  --acc:#c23a74;--acc-press:#9e2c5d;--acc-t:#b0306a;--rap:#b0306a;--heroi:linear-gradient(135deg,#d65490,#b32f68);
  --pos:#1f8a5b;--pos-bg:#e2f3ea;--warn:#a8660f;--warn-bg:#fbf0dd;--neg:#c62f2f;--neg-bg:#fde3e0;
  --on-status:#ffffff;--dou-bg:#fdeef5;--rec-bg:#eef8f3;
  --sombra:0 1px 2px rgba(90,20,50,.06),0 6px 18px rgba(90,20,50,.06);
  --c2:#5b3fa8;--c2-press:#47308a;--c2-t:#5b3fa8;--c2-bg:#ece6fa;--c2-heroi:#5b3fa8}
[data-tema=vermelho]{color-scheme:dark;
  --topo:#3a1116;--bg:#140a0c;--card:#22141a;--card2:#2e1b21;--borda:#3f262d;--fg:#f8eef0;--sub:#bba2a8;
  --acc:#c8102e;--acc-press:#9e0c24;--acc-t:#ffb199;--rap:#ffb199;--heroi:linear-gradient(160deg,#8f0b20,#c8102e);
  --pos:#8fe0b8;--pos-bg:#16302a;--warn:#f5c98a;--warn-bg:#3a2a1a;--neg:#ff86b0;--neg-bg:#3d1a2a;
  --on-status:#140a0c;--dou-bg:#33141b;--rec-bg:#172a24;--sombra:none;
  --c2:#6b3fc4;--c2-press:#5430a3;--c2-t:#c7b0ff;--c2-bg:#261d3d;--c2-heroi:#5a33a8}
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
[data-tema=chromecore]{color-scheme:dark;--body-fundo:transparent;
  --topo:#0b1024;--bg:#05060f;
  --card:rgba(10,14,30,.78);--card2:rgba(40,52,90,.55);--borda:rgba(190,210,255,.18);--fg:#eef3ff;--sub:#9aa6c4;
  --acc:#b8c8e6;--acc-fundo:linear-gradient(160deg,#ffffff 0%,#a9bcdf 25%,#f2f6ff 45%,#6a7ea6 62%,#dfe8f7 80%,#8a9bbd 100%);--on-acc:#0a1020;--acc-press:#8a9bbd;--acc-t:#bcd4ff;--rap:#8fb6ff;
  --heroi:linear-gradient(160deg,#f4f8ff 0%,#9fb4d8 22%,#ffffff 38%,#5f7398 55%,#dfe8f7 72%,#8091b3 100%);
  --heroi-borda:rgba(255,255,255,.7);--card-borda:rgba(190,210,255,.24);--on-heroi:#0a1020;--heroi-linha:rgba(10,16,32,.2);--heroi-aviso:#8a3d00;
  --pos:#8fe0b8;--pos-bg:rgba(30,100,80,.3);--warn:#f5c98a;--warn-bg:rgba(130,95,30,.3);--neg:#ff8fa3;--neg-bg:rgba(140,40,70,.32);
  --on-status:#05060f;--dou-bg:rgba(188,212,255,.08);--rec-bg:rgba(143,224,184,.08);
  --sombra:inset 0 1px 0 rgba(255,255,255,.12),0 10px 30px rgba(0,0,0,.5);
  --vidro:blur(10px) saturate(130%);--folha:rgba(10,14,30,.95);
  --f-titulo:"Zen Dots",var(--f-ui);--t-peso:400;--t-tam:28px;--t-sombra:0 0 12px rgba(190,215,255,.6);
  --ceu:radial-gradient(ellipse 70% 35% at 30% 20%,rgba(90,120,220,.2),transparent 70%),linear-gradient(180deg,#0b1024,#05060f 60%);
  --giro-l:-30%;--giro-t:70px;--giro-t-mini:-10px;--giro-h:auto;--giro-r:-18deg;
  --ceu-giro:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='c' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23ffffff'/><stop offset='.3' stop-color='%237f9bd6'/><stop offset='.5' stop-color='%23151b33'/><stop offset='.7' stop-color='%23cfe0ff'/><stop offset='1' stop-color='%234a5f8f'/></linearGradient><radialGradient id='s' cx='.35' cy='.3' r='.8'><stop offset='0' stop-color='%23ffffff'/><stop offset='.25' stop-color='%23aac4f0'/><stop offset='.6' stop-color='%23121830'/><stop offset='1' stop-color='%236d84b8'/></radialGradient></defs><g opacity='.6'><circle cx='100' cy='100' r='30' fill='url(%23s)'/><ellipse cx='100' cy='100' rx='92' ry='28' fill='none' stroke='url(%23c)' stroke-width='8'/></g></svg>");
  --estrelas:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='200'><g fill='%23e6f0ff'><path d='M30 20 l2.5 9 9 2.5 -9 2.5 -2.5 9 -2.5 -9 -9 -2.5 9 -2.5z'/><path d='M130 90 l1.6 6 6 1.6 -6 1.6 -1.6 6 -1.6 -6 -6 -1.6 6 -1.6z'/><circle cx='80' cy='150' r='1.2'/><circle cx='160' cy='30' r='1'/><circle cx='20' cy='120' r='.9'/></g></svg>");--estrelas-tam:180px 200px;
  --estrelas2:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='300'><path d='M200 50 l3.5 12 12 3.5 -12 3.5 -3.5 12 -3.5 -12 -12 -3.5 12 -3.5z' fill='%23ffffff'/><path d='M60 220 l2 7 7 2 -7 2 -2 7 -2 -7 -7 -2 7 -2z' fill='%23cfe0ff'/></svg>");--estrelas2-tam:260px 300px;
  --chao:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='120'><g fill='%230a0d1c'><rect x='0' y='50' width='30' height='70'/><rect x='32' y='20' width='24' height='100'/><rect x='58' y='60' width='34' height='60'/><rect x='94' y='8' width='20' height='112'/><rect x='116' y='40' width='36' height='80'/><rect x='154' y='70' width='22' height='50'/><rect x='178' y='30' width='22' height='90'/></g><g fill='%23cfe0ff' fill-opacity='.55'><rect x='38' y='30' width='2' height='2'/><rect x='46' y='44' width='2' height='2'/><rect x='98' y='20' width='2' height='2'/><rect x='106' y='52' width='2' height='2'/><rect x='124' y='50' width='2' height='2'/><rect x='140' y='66' width='2' height='2'/><rect x='184' y='40' width='2' height='2'/><rect x='66' y='72' width='2' height='2'/></g></svg>");--chao-tam:200px 120px;--chao-h:120px;
  --c2:#b8a6ff;--c2-fundo:linear-gradient(160deg,#ffffff 0%,#c4b4ff 25%,#f6f2ff 45%,#7a68b8 62%,#e6dfff 80%,#9a8acc 100%);--c2-on:#120a24;--c2-press:#9a8acc;--c2-t:#d2c6ff;--c2-bg:rgba(184,166,255,.1);
  --c2-heroi:linear-gradient(160deg,#f8f4ff 0%,#b9a8e6 22%,#ffffff 38%,#6f5f9e 55%,#e8e0fa 72%,#8f80b8 100%);--c2-heroi-borda:rgba(255,255,255,.7);--c2-on-heroi:#120a24}
[data-tema=metalheart]{color-scheme:dark;--body-fundo:transparent;
  --topo:#0a0716;--bg:#040309;
  --card:rgba(8,6,16,.8);--card2:rgba(40,32,80,.5);--borda:rgba(160,140,255,.16);--fg:#efecff;--sub:#9d96c0;
  --acc:#7b4dff;--acc-fundo:linear-gradient(135deg,#3a5bff,#8a3dff 60%,#d14dff);--acc-press:#5e36d6;--acc-t:#c3b4ff;--rap:#8fc4ff;
  --heroi:linear-gradient(180deg,rgba(255,255,255,.12),transparent 45%),linear-gradient(160deg,#1a1830 0%,#4a3f8a 28%,#0d0b1a 50%,#6b5fc4 72%,#121022 100%);
  --heroi-borda:rgba(180,160,255,.5);--card-borda:rgba(160,140,255,.22);
  --pos:#8fe0b8;--pos-bg:rgba(30,100,80,.3);--warn:#f5c98a;--warn-bg:rgba(130,95,30,.3);--neg:#ff8fa3;--neg-bg:rgba(140,40,70,.32);
  --on-status:#040309;--dou-bg:rgba(123,77,255,.12);--rec-bg:rgba(143,224,184,.08);
  --sombra:inset 0 1px 0 rgba(255,255,255,.08),0 10px 30px rgba(0,0,0,.6);
  --vidro:blur(10px) saturate(140%);--folha:rgba(10,8,22,.95);
  --f-titulo:"Grenze Gotisch",Georgia,serif;--t-peso:700;--t-tam:38px;--t-sombra:0 0 10px rgba(140,110,255,.7);
  --ceu:radial-gradient(ellipse 60% 30% at 20% 75%,rgba(120,60,255,.3),transparent 70%),radial-gradient(ellipse 50% 30% at 85% 30%,rgba(60,110,255,.25),transparent 70%),linear-gradient(115deg,transparent 45%,rgba(200,190,255,.07) 49%,transparent 53%),linear-gradient(180deg,#0a0716,#020106 70%);
  --giro-l:0%;--giro-t:30px;--giro-t-mini:0px;--giro-h:auto;--giro-r:0deg;
  --ceu-giro:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs><linearGradient id='m' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23ffffff'/><stop offset='.35' stop-color='%238a7cff'/><stop offset='.55' stop-color='%23120f24'/><stop offset='.75' stop-color='%23c9c2ff'/><stop offset='1' stop-color='%233a2f80'/></linearGradient></defs><g fill='url(%23m)' fill-opacity='.5'><path d='M100 6 L106 92 L100 196 L94 92 Z'/><path d='M98 84 Q60 58 14 16 Q54 66 98 98 Z'/><path d='M102 84 Q140 58 186 16 Q146 66 102 98 Z'/><path d='M98 118 Q66 140 30 192 Q74 152 98 132 Z'/><path d='M102 118 Q134 140 170 192 Q126 152 102 132 Z'/><path d='M96 102 Q50 96 2 112 Q50 108 96 110 Z'/><path d='M104 102 Q150 96 198 112 Q150 108 104 110 Z'/><path d='M80 60 Q70 40 74 18 Q78 44 88 62 Z'/><path d='M120 60 Q130 40 126 18 Q122 44 112 62 Z'/></g></svg>");
  --estrelas2:radial-gradient(2px 2px at 60px 80px,#d8d0ff,transparent),radial-gradient(1.6px 1.6px at 190px 210px,#9fc4ff,transparent);--estrelas2-tam:240px 280px;
  --c2:#2fd6b4;--c2-fundo:linear-gradient(135deg,#1fa3c4,#2fd6b4 60%,#9cf5e0);--c2-on:#01140f;--c2-press:#22a88d;--c2-t:#8ff0dc;--c2-bg:rgba(47,214,180,.1);
  --c2-heroi:linear-gradient(180deg,rgba(255,255,255,.12),transparent 45%),linear-gradient(160deg,#0f1f22 0%,#2f7a80 28%,#06100f 50%,#4fb8b0 72%,#0b1616 100%);--c2-heroi-borda:rgba(120,240,215,.5)}
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
// Só valem dentro de [data-tema=<um dos 6>], então os 13 temas acima não mudam.
const T = ':is([data-tema=abissal],[data-tema=noir],[data-tema=obsidiana],[data-tema=veludo],[data-tema=acid],[data-tema=horror])';
// Temas com moldura recortada: o elemento pinta a moldura (--mold-borda) e o
// ::before pinta o miolo (--miolo) com o mesmo recorte (--clip).
const R = ':is([data-tema=veludo],[data-tema=obsidiana])';
const MOLDURA = '.btn,.chip,.chip-conta,.faixa,.grupo,.an-grupo,.av-proposta,.veredito,.dia-card,.dia-lucro,.seg,.seg.abas button.on,.mais,.amostra .a-h,.amostra .a-l.c';
const CARTOES = '.grupo,.vazio,.an-grupo,.av-proposta,.veredito,.av-resumo,.dia-card,.dia-lucro,.aj-ind,.aj-prop,.aj-forma,.aj-regua,.aj-robux,.aj-armas,.aj-glos,.aj-faq,.aj-bx';
// Sustos da Fita Perdida: ligados, a não ser que o <html> tenha data-sustos="0".
const S = '[data-tema=horror]:not([data-sustos="0"])';
// Silhueta da Fita Perdida (porta do value e vulto).
const VULTO = "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 200' preserveAspectRatio='xMidYMax meet'><g fill='%23000'><ellipse cx='30' cy='17' rx='8' ry='11'/><path d='M23 28 Q30 25 37 28 L40 108 L36 198 L33 198 L31 118 L29 118 L27 198 L24 198 L20 108 Z'/><path d='M23 32 L13 122 L15.5 123 L25 48Z M37 32 L47 122 L44.5 123 L35 48Z'/></g></svg>\")";
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

[data-tema=veludo]{color-scheme:dark;--body-fundo:transparent;
  --topo:#2a0812;--bg:#12040a;--card:#2a0b16;--card2:#3a1120;--borda:rgba(215,220,230,.16);--card-borda:rgba(215,220,230,.35);--fg:#f7ebe6;--sub:#c9a7a4;
  --acc:#c9ced6;--acc-fundo:linear-gradient(180deg,#ffffff 0%,#dfe2e8 42%,#a9afb8 55%,#7d838d 100%);--acc-press:#a9afb8;--on-acc:#2a0812;--acc-t:#e2e6ec;--rap:#f0a8bc;
  --heroi:radial-gradient(ellipse 70% 60% at 25% 12%,rgba(255,140,170,.22),transparent 70%),linear-gradient(160deg,#6e1430 0%,#410a1a 55%,#26040e 100%);--on-heroi:#fbeee8;--heroi-linha:rgba(220,225,232,.3);
  --pos:#9fe0b5;--pos-bg:#173226;--warn:#f3cd7a;--warn-bg:#3a2a12;--neg:#ff9aa8;--neg-bg:#45121e;
  --on-status:#12040a;--dou-bg:rgba(201,206,214,.08);--rec-bg:rgba(159,224,181,.08);
  --sombra:none;--vidro:none;--folha:#2a0b16;
  --mold-borda:linear-gradient(135deg,#ffffff 0%,#8a9099 30%,#e8ebef 55%,#5c6169 80%,#d2d6dc 100%);
  --c2-mold-borda:linear-gradient(135deg,#ffffff 0%,#8a9099 30%,#e8ebef 55%,#5c6169 80%,#d2d6dc 100%);
  --clip-btn:polygon(9px 0,calc(100% - 9px) 0,100% 9px,100% calc(100% - 9px),calc(100% - 9px) 100%,9px 100%,0 calc(100% - 9px),0 9px);
  --clip-chip:polygon(6px 0,calc(100% - 6px) 0,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0 calc(100% - 6px),0 6px);
  --clip-card:polygon(14px 0,calc(100% - 14px) 0,100% 14px,100% calc(100% - 14px),calc(100% - 14px) 100%,14px 100%,0 calc(100% - 14px),0 14px);
  --clip-heroi:polygon(18px 0,calc(100% - 18px) 0,100% 18px,100% calc(100% - 18px),calc(100% - 18px) 100%,18px 100%,0 calc(100% - 18px),0 18px);
  --clip-seg:polygon(10px 0,calc(100% - 10px) 0,100% 10px,100% calc(100% - 10px),calc(100% - 10px) 100%,10px 100%,0 calc(100% - 10px),0 10px);
  --clip-thumb:polygon(9px 0,calc(100% - 9px) 0,100% 9px,100% calc(100% - 9px),calc(100% - 9px) 100%,9px 100%,0 calc(100% - 9px),0 9px);
  --clip-mini:polygon(4px 0,calc(100% - 4px) 0,100% 4px,100% calc(100% - 4px),calc(100% - 4px) 100%,4px 100%,0 calc(100% - 4px),0 4px);
  --clip-mini-h:polygon(6px 0,calc(100% - 6px) 0,100% 6px,100% calc(100% - 6px),calc(100% - 6px) 100%,6px 100%,0 calc(100% - 6px),0 6px);
  --btn-caixa:uppercase;--btn-esp:.12em;
  --f-titulo:"Playfair Display",Georgia,serif;--t-estilo:italic;--t-peso:700;--t-tam:36px;--t-esp:0;--t-cor:#e4e7ec;--t-sombra:0 2px 0 rgba(0,0,0,.55);
  --ceu:radial-gradient(ellipse 90% 40% at 50% -5%,rgba(220,225,255,.14),transparent 70%),radial-gradient(ellipse 60% 50% at 15% 60%,rgba(140,20,50,.35),transparent 70%),radial-gradient(ellipse 60% 50% at 90% 85%,rgba(110,10,40,.4),transparent 70%),linear-gradient(180deg,#2a0812,#14040a 60%,#0c0206);
  --c2:#2f9e78;--c2-fundo:linear-gradient(180deg,#a6f0d0 0%,#3fbf90 45%,#25845f 55%,#16573f 100%);--c2-press:#25845f;--c2-on:#03140d;--c2-t:#8fe6c3;--c2-bg:rgba(47,158,120,.16);
  --c2-heroi:radial-gradient(ellipse 70% 60% at 25% 12%,rgba(140,255,200,.16),transparent 70%),linear-gradient(160deg,#0f5a42 0%,#073427 55%,#03190f 100%)}

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

[data-tema=horror]{color-scheme:dark;--body-fundo:transparent;
  --topo:#0b0c0b;--bg:#030403;--card:rgba(10,12,10,.93);--card2:#161816;--borda:rgba(220,225,210,.1);--card-borda:rgba(220,225,210,.18);--fg:#dedbd2;--sub:#878780;
  --acc:#8b1010;--acc-fundo:#5e0a0a;--acc-press:#3e0606;--on-acc:#efe6de;--acc-t:#d46a60;--rap:#9fb2c2;
  --heroi:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0 1px,transparent 1px 3px),radial-gradient(ellipse 80% 90% at 25% 0%,rgba(255,255,255,.06),transparent 65%),linear-gradient(180deg,#1b1e1b,#0a0b0a);
  --heroi-borda:rgba(220,220,210,.26);--on-heroi:#e4e1d8;--heroi-linha:rgba(220,220,210,.14);
  --pos:#9cc4a2;--pos-bg:#121d15;--warn:#d4a070;--warn-bg:#261b10;--neg:#e0645c;--neg-bg:#281010;
  --on-status:#030403;--dou-bg:rgba(139,16,16,.12);--rec-bg:rgba(156,196,162,.07);
  --sombra:0 10px 30px rgba(0,0,0,.7);--vidro:none;--folha:#0d0e0d;
  --r-btn:2px;--r-chip:2px;--r-card:3px;--r-heroi:3px;--r-thumb:2px;--r-seg:2px;--r-seg-b:2px;--r-campo:2px;--r-mais:2px;
  --f-titulo:"Special Elite","Courier New",monospace;--t-peso:400;--t-tam:34px;--t-esp:.01em;--t-cor:#e8e4da;
  --t-sombra:1px 0 rgba(255,50,50,.32),-1px 0 rgba(60,120,255,.28),0 0 4px rgba(255,255,255,.25);
  --ceu:radial-gradient(ellipse 60% 40% at 50% 30%,rgba(120,130,110,.08),transparent 70%),linear-gradient(180deg,#0b0c0b,#040504);
  --c2:#1f3fc4;--c2-fundo:#1a34b0;--c2-press:#11248a;--c2-on:#f0f4ff;--c2-t:#93a8ff;--c2-bg:rgba(31,63,196,.16);
  --c2-heroi:repeating-linear-gradient(0deg,rgba(0,0,0,.18) 0 1px,transparent 1px 3px),linear-gradient(180deg,#1733bd,#0d2290);--c2-heroi-borda:rgba(190,205,255,.35);--c2-on-heroi:#f4f6ff}

/* Conta 2: os tokens de forma que dependem da cor também trocam. */
body.c2ativa{--btn-sombra:var(--c2-btn-sombra,none);--mold-borda:var(--c2-mold-borda,none)}

/* Formas comuns aos 6 (os tokens só existem neles). */
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

/* Moldura recortada (Veludo e Obsidiana). */
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

/* Veludo: ornamento de prata, damasco e luz de lua */
[data-tema=veludo] .faixa,[data-tema=veludo] .veredito{padding-top:26px}
[data-tema=veludo] :is(.faixa,.veredito)::after{content:"";position:absolute;left:50%;top:6px;width:120px;height:14px;transform:translateX(-50%);pointer-events:none;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 16'><g stroke='%23dfe3ea' fill='none' stroke-width='1.1'><path d='M2 8 H40 M80 8 H118'/><path d='M40 8 q7 -8 13 0 M80 8 q-7 -8 -13 0'/><path d='M40 8 q7 8 13 0 M80 8 q-7 8 -13 0'/></g><path d='M60 1 L66 8 L60 15 L54 8Z' fill='%23dfe3ea'/></svg>") center/contain no-repeat}
[data-tema=veludo] .ceu .k1{top:0;left:0;right:0;bottom:0;opacity:.9;background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='90' height='120' viewBox='0 0 90 120'><g fill='none' stroke='%23ffb0c0' stroke-opacity='.08' stroke-width='1.2'><path d='M45 0 C70 20 70 40 45 60 C20 40 20 20 45 0Z'/><path d='M45 60 C70 80 70 100 45 120 C20 100 20 80 45 60Z'/><path d='M0 60 C25 80 25 100 0 120 M90 60 C65 80 65 100 90 120 M0 0 C25 20 25 40 0 60 M90 0 C65 20 65 40 90 60'/></g><g fill='%23ffb0c0' fill-opacity='.07'><path d='M45 18 l5 12 -5 12 -5 -12z'/><path d='M45 78 l5 12 -5 12 -5 -12z'/><circle cx='0' cy='60' r='3'/><circle cx='90' cy='60' r='3'/></g></svg>") 0 0/90px 120px;
  -webkit-mask-image:linear-gradient(transparent,#000 15%,#000 70%,transparent);mask-image:linear-gradient(transparent,#000 15%,#000 70%,transparent)}
[data-tema=veludo] .ceu .k2{top:-10%;left:-10%;right:-10%;bottom:-10%;background:linear-gradient(115deg,transparent 35%,rgba(255,120,150,.08) 47%,transparent 60%);animation:thVeludo 14s ease-in-out infinite alternate}
[data-tema=veludo] .ceu .k3{left:0;right:0;top:0;height:260px;background:radial-gradient(ellipse 50% 60% at 50% 0%,rgba(225,230,255,.14),transparent 70%);animation:thChama 4s ease-in-out infinite alternate}

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

/* Fita Perdida: imagem de fita, menu de videocassete e a porta no value */
.vhs{display:none}
[data-tema=horror] .vhs{display:block;position:fixed;top:0;left:0;right:0;bottom:0;z-index:60;pointer-events:none;overflow:hidden}
[data-tema=horror] .vhs::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.2) 0 1px,transparent 1px 3px),radial-gradient(ellipse at 50% 50%,transparent 45%,rgba(0,0,0,.72) 100%),linear-gradient(rgba(40,60,30,.07),rgba(40,60,30,.07))}
[data-tema=horror] .vhs::after{content:"";position:absolute;top:-40px;left:-40px;right:-40px;bottom:-40px;opacity:.1;will-change:transform;animation:thGrao .5s steps(1) infinite;background:${RUIDO} 0 0/200px 200px}
[data-tema=horror] .vhs b{position:absolute;left:-10px;right:-10px;bottom:0;height:22px;opacity:.45;filter:blur(.7px);animation:thTracking 16s linear infinite;
  background:repeating-linear-gradient(0deg,rgba(255,255,255,.22) 0 1px,transparent 1px 2px,rgba(255,255,255,.08) 2px 3px),url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='22'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.02 .9' numOctaves='2'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1.2 -.2'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>") 0 0/300px 22px}
[data-tema=horror] .vhs span{position:absolute;font-family:"VT323","Courier New",monospace;font-size:21px;line-height:1;color:#f2f0ea;letter-spacing:.04em;text-shadow:1px 0 rgba(255,50,50,.4),-1px 0 rgba(60,120,255,.35),0 0 4px rgba(255,255,255,.45)}
[data-tema=horror] .vhs .osd-play{top:calc(10px + env(safe-area-inset-top,0px));right:max(14px,env(safe-area-inset-right,0px));animation:thOsd 1.2s steps(1) infinite}
[data-tema=horror] .vhs .osd-hora{bottom:calc(30px + env(safe-area-inset-bottom,0px));left:max(14px,env(safe-area-inset-left,0px));opacity:.85}
[data-tema=horror] .vhs i{display:none}
${S} .vhs .estatica{display:block;position:absolute;top:0;left:0;right:0;bottom:0;opacity:0;animation:thEstatica 23s steps(1) infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='1' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 2 -.6'/></filter><rect width='100%' height='100%' fill='black'/><rect width='100%' height='100%' filter='url(%23n)'/></svg>") 0 0/160px 160px,#000}
${S} .vhs .vulto{display:block;position:absolute;left:50%;bottom:-2vh;width:min(60vw,280px);height:88vh;transform:translateX(-50%);opacity:0;filter:blur(2px);animation:thVulto 23s steps(1) infinite;background:${VULTO} center bottom/contain no-repeat}
[data-tema=horror] .app{animation:thTremor 9s steps(1) infinite}
[data-tema=horror] h1{position:relative;animation:thPiscaT 7s steps(1) infinite}
${S} h1::after{content:"ELE ESTÁ NA PORTA";position:absolute;left:0;top:0;bottom:0;display:flex;align-items:center;white-space:nowrap;padding-right:12px;background:var(--bg);font-size:.72em;opacity:0;animation:thSubliminar 31s steps(1) infinite}
[data-tema=horror] :is(.f-num,.secao>h2){text-shadow:var(--t-sombra)}
[data-tema=horror] .f-rot{font-family:"VT323","Courier New",monospace;font-size:17px;font-weight:400;opacity:.85;letter-spacing:.08em}
[data-tema=horror] :is(.btn,.chip,.seg button){font-family:"VT323","Courier New",monospace;font-weight:400;text-transform:uppercase;letter-spacing:.06em;text-shadow:1px 0 rgba(255,50,50,.3),-1px 0 rgba(60,120,255,.28)}
[data-tema=horror] .btn{font-size:23px;padding-top:7px;padding-bottom:7px;border:1px solid rgba(240,220,210,.3)}
[data-tema=horror] .btn.sec{background:transparent;color:var(--fg);border-color:rgba(220,220,210,.35)}
[data-tema=horror] .chip{font-size:19px;padding:4px 10px}
[data-tema=horror] .seg{background:transparent;border:1px solid var(--borda);padding:2px}
[data-tema=horror] .seg button{font-size:18px;padding-top:5px;padding-bottom:5px}
[data-tema=horror] :is(.chip.on,.seg.abas button.on){background:#e4e1d8;color:#080808;border-color:#e4e1d8;box-shadow:none;text-shadow:none}
[data-tema=horror] .chip.on:not(.filtro)::before{content:"▶ ";font-size:.8em}
[data-tema=horror] body.c2ativa :is(.chip.on,.seg.abas button.on){background:#dfe6ff;color:#0a1450}
[data-tema=horror] .faixa::before{content:"";position:absolute;right:14px;top:14px;bottom:44px;width:34px;pointer-events:none;background:linear-gradient(180deg,rgba(205,210,195,.16),rgba(205,210,195,.05));box-shadow:0 0 20px rgba(205,210,195,.08);animation:thLuz 6s steps(1) infinite}
${S} .faixa::after{content:"";position:absolute;right:14px;top:16px;bottom:44px;width:34px;pointer-events:none;opacity:0;filter:blur(.3px);background:${VULTO} center bottom/contain no-repeat;animation:thAparece 19s steps(1) infinite}
[data-tema=horror] .thumb{background:#1e211e}
[data-tema=horror] .ceu .k1{top:0;left:0;right:0;bottom:0;background:radial-gradient(ellipse 22% 30% at 50% 58%,rgba(160,170,150,.09),transparent 70%);animation:thLuz 11s steps(1) -4s infinite}

/* Interruptor dos sustos na folha de Temas (só aparece com a Fita Perdida). */
.t-sustos{display:none}
[data-tema=horror] .t-sustos{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border-bottom:1px solid var(--borda);text-align:left;font-size:15px;font-weight:600;color:var(--fg)}
.t-sustos small{display:block;font-size:12px;font-weight:500;color:var(--sub)}
.t-sustos input{flex:none;width:22px;height:22px;accent-color:var(--acc)}

/* Reação ao toque de cada tema */
[data-tema=abissal] .toque{animation:thGeleia .55s ease-out}
[data-tema=veludo] .toque{animation:thBrilho .4s ease-out}
[data-tema=noir] .toque{animation:thInverte .3s steps(2)}
[data-tema=obsidiana] .toque{animation:thRacha .3s ease-out}
[data-tema=acid] .toque{animation:thOnda .6s linear,thFlui 6s linear infinite}
[data-tema=horror] .toque{animation:thFita .28s steps(4)}

@keyframes thGeleia{0%{transform:scale(1)}30%{transform:scale(1.08,.9)}50%{transform:scale(.94,1.06)}70%{transform:scale(1.03,.97)}100%{transform:scale(1)}}
@keyframes thBrilho{0%{filter:brightness(1.5)}100%{filter:brightness(1)}}
@keyframes thInverte{0%{filter:invert(1)}100%{filter:invert(0)}}
@keyframes thRacha{0%{transform:translateX(0);filter:brightness(1.6)}25%{transform:translateX(-3px)}50%{transform:translateX(3px)}75%{transform:translateX(-1px)}100%{transform:translateX(0);filter:brightness(1)}}
@keyframes thOnda{0%{filter:hue-rotate(0deg) saturate(1.6)}100%{filter:hue-rotate(360deg) saturate(1)}}
@keyframes thFita{0%{transform:none;filter:none}25%{transform:translateX(3px) skewX(-4deg);filter:blur(1.1px) brightness(1.35)}55%{transform:translateX(-2px);filter:blur(.5px) brightness(.85)}100%{transform:none;filter:none}}
@keyframes thSobe{from{transform:translateY(0)}to{transform:translateY(-300px)}}
@keyframes thBoia{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-20px) scale(1.04,.95)}}
@keyframes thBalanca{from{transform:translateX(-12px)}to{transform:translateX(12px)}}
@keyframes thVeludo{from{transform:translateX(-6%)}to{transform:translateX(6%)}}
@keyframes thChama{from{opacity:.7}to{opacity:1}}
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
@keyframes thTremor{0%,93%,100%{transform:none}94%{transform:translateX(1.5px)}95%{transform:translateX(-1px)}96%{transform:translateY(1px)}97%{transform:translateY(-9px)}97.4%{transform:translateY(3px)}97.8%{transform:none}}
@keyframes thPiscaT{0%,61%,65%,100%{opacity:1}62%{opacity:.55}63%{opacity:.9}64%{opacity:.4}}
@keyframes thOsd{0%,100%{opacity:1}50%{opacity:.85}}
@keyframes thLuz{0%,40%,44%,100%{opacity:1}41%{opacity:.3}42%{opacity:.85}43%{opacity:.2}}
@keyframes thAparece{0%,40%{opacity:0}40.5%{opacity:1}41.6%{opacity:0}71%{opacity:0}71.5%{opacity:1;transform:scale(1.15);transform-origin:50% 100%}73%{opacity:0;transform:none}88%{opacity:0}88.3%{opacity:1;transform:scale(1.35);transform-origin:50% 100%}90.5%{opacity:0;transform:none}}
@keyframes thTracking{0%,86%{transform:translateY(0)}86.5%{transform:translateY(-2px)}87%{transform:translateY(0)}93%{transform:translateY(-105vh)}93.1%,100%{transform:translateY(0)}}
@keyframes thEstatica{0%,57.9%{opacity:0}58%{opacity:1}58.5%{opacity:.8}58.8%,100%{opacity:0}}
@keyframes thVulto{0%,58.7%{opacity:0}58.8%{opacity:.6}60.2%,100%{opacity:0}}
@keyframes thSubliminar{0%,77.9%{opacity:0}78%{opacity:1}78.5%,100%{opacity:0}}

/* "Reduzir movimento" no iPhone: tudo parado, inclusive os sustos. */
@media (prefers-reduced-motion:reduce){
  ${T} :is(.ceu>span,.vhs b,.vhs span,.app,h1,.faixa,.btn,.chip,.seg button,.grupo,.an-grupo,.av-proposta,.toque){animation:none!important}
  ${T} .vhs::after,${T} :is(.faixa,h1)::before,${T} :is(.faixa,h1)::after{animation:none!important}
  .vhs i{display:none!important}
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
[data-tema=azul],[data-tema=dark],[data-tema=rosinha],[data-tema=vermelho]{--body-fundo:transparent;--ceu:linear-gradient(180deg,var(--topo),var(--bg) 640px)}
[data-tema=oled]{--body-fundo:transparent;--ceu:linear-gradient(#000,#000)}
/* Temas de vidro: sem desfoque (o fundo agora se mexe) e cartões um pouco mais cheios. */
[data-tema=galaxia]{--vidro:none;--card:rgba(30,14,62,.84);--card2:rgba(72,40,130,.6)}
[data-tema=frutiger]{--vidro:none;--card:rgba(255,255,255,.86);--card2:rgba(255,255,255,.7)}
[data-tema=softclub]{--vidro:none;--card:rgba(10,32,36,.92);--card2:rgba(30,64,70,.85);
  --acc-fundo:linear-gradient(180deg,#e6fffb 0%,#9fe8e2 40%,#4fbdb7 52%,#86dcd6 100%);--c2-fundo:linear-gradient(180deg,#ffffff 0%,#dfe7ec 40%,#a3b0b9 52%,#d0dae0 100%)}
[data-tema=darkaero]{--vidro:none;--card:rgba(10,14,10,.92);--p-brilho:rgba(70,255,30,.38)}
[data-tema=darkaero] body.c2ativa{--p-brilho:rgba(47,140,255,.42)}
[data-tema=chromecore]{--vidro:none;--card:rgba(10,14,30,.92)}
[data-tema=metalheart]{--vidro:none;--card:rgba(8,6,16,.92)}
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

/* ---------- Rosinha: marshmallow, corações flutuando, quica ---------- */
[data-tema=rosinha] .btn{border-radius:999px;padding-top:13px;padding-bottom:13px;box-shadow:0 4px 0 var(--acc-press),inset 0 2px 0 rgba(255,255,255,.35),inset 0 -3px 0 rgba(0,0,0,.08)}
[data-tema=rosinha] .btn.sec{border:2px solid #f2d4e2;box-shadow:0 3px 0 #f2d4e2,inset 0 2px 0 #fff}
[data-tema=rosinha] .chip{border-radius:999px;border-width:2px;box-shadow:0 2px 0 #f2d4e2}
[data-tema=rosinha] .chip.on{box-shadow:0 3px 0 var(--acc-press),inset 0 2px 0 rgba(255,255,255,.3)}
[data-tema=rosinha] .seg,[data-tema=rosinha] .seg button,[data-tema=rosinha] input[type=search]{border-radius:999px}
[data-tema=rosinha] .seg{box-shadow:inset 0 2px 4px rgba(90,20,50,.08)}
[data-tema=rosinha] .seg.abas button.on{box-shadow:0 3px 0 var(--acc-press),inset 0 2px 0 rgba(255,255,255,.3)}
[data-tema=rosinha] input[type=search]{border-width:2px}
[data-tema=rosinha] .grupo{border-radius:26px;border:2px solid #f2d4e2}
[data-tema=rosinha] .faixa{border-radius:28px;box-shadow:0 6px 0 var(--acc-press),inset 0 3px 0 rgba(255,255,255,.25)}
[data-tema=rosinha] .mais{border:2px solid #f2d4e2;box-shadow:0 2px 0 #f2d4e2}
[data-tema=rosinha] .thumb{border-radius:50%}
[data-tema=rosinha] body>.ceu :is(.k1,.k2){left:0;right:0;top:0;will-change:transform}
[data-tema=rosinha] body>.ceu .k1{height:calc(100% + 260px);animation:pSobe260 22s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='260'><g fill='%23e06a9c' fill-opacity='.18'><path d='M30 40 c-6-8-18-2-12 8 l12 12 12-12 c6-10-6-16-12-8z'/><path d='M120 150 c-4-6-13-2-9 6 l9 9 9-9 c4-8-5-12-9-6z'/><path d='M70 230 c-3-5-10-1-7 5 l7 7 7-7 c3-6-4-10-7-5z'/></g></svg>") 0 0/160px 260px}
[data-tema=rosinha] body>.ceu .k2{height:calc(100% + 200px);animation:pSobe200 32s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='200'><g fill='%23f7b6d1' fill-opacity='.45'><circle cx='20' cy='30' r='5'/><circle cx='90' cy='90' r='3.5'/><circle cx='50' cy='160' r='6'/></g></svg>") 0 0/120px 200px}

/* ---------- Vermelho: inclinado de corrida, listras de velocidade, arranca ---------- */
[data-tema=vermelho] .btn{border:0;border-radius:0;clip-path:polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%);font-style:italic;text-transform:uppercase;letter-spacing:.06em}
[data-tema=vermelho] .btn.sec{background:var(--card2)}
[data-tema=vermelho] .chip{border-radius:0;border-color:transparent;background:var(--card2);clip-path:polygon(7px 0,100% 0,calc(100% - 7px) 100%,0 100%);font-style:italic;padding-left:16px;padding-right:16px}
[data-tema=vermelho] .chip.on{background:var(--acc-fundo)}
[data-tema=vermelho] .seg{border-radius:0;clip-path:polygon(10px 0,100% 0,calc(100% - 10px) 100%,0 100%);padding:3px 12px}
[data-tema=vermelho] .seg button{border-radius:0;font-style:italic;text-transform:uppercase;letter-spacing:.04em;font-size:13px}
[data-tema=vermelho] .seg.abas button.on{clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}
[data-tema=vermelho] .grupo{border-radius:4px;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,0 100%)}
[data-tema=vermelho] .faixa{position:relative;overflow:hidden;border-radius:0;clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px))}
[data-tema=vermelho] .faixa::after{content:"";position:absolute;top:0;bottom:0;right:26px;width:46px;transform:skewX(-18deg);pointer-events:none;background:linear-gradient(90deg,rgba(255,255,255,.16) 0 12px,transparent 12px 20px,rgba(255,255,255,.1) 20px 28px,transparent 28px)}
[data-tema=vermelho] :is(h1,.secao>h2){font-style:italic;text-transform:uppercase;letter-spacing:.02em}
[data-tema=vermelho] body>.ceu :is(.k1,.k2){top:0;bottom:0;left:0;width:calc(100% + 400px);will-change:transform}
[data-tema=vermelho] body>.ceu .k1{animation:pCorrida 2.2s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='220'><g fill='white' fill-opacity='.06'><rect x='20' y='30' width='120' height='1.5'/><rect x='220' y='90' width='160' height='1'/><rect x='90' y='150' width='80' height='1.5'/><rect x='300' y='200' width='70' height='1'/></g></svg>") 0 0/400px 220px}
[data-tema=vermelho] body>.ceu .k2{animation:pCorrida 4.4s linear infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><g fill='%23ff4a5e' fill-opacity='.09'><rect x='60' y='60' width='180' height='2'/><rect x='250' y='180' width='120' height='2'/><rect x='10' y='260' width='90' height='1.5'/></g></svg>") 0 0/400px 300px}

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

/* ---------- Chromecore (refeito no P2): cromo tribal / cybersigilism ----------
   Preto profundo + cromo prata puro; espinhos cromados nos botões e nos cantos;
   sigilo tribal cromado no fundo; título gótico afiado em cromo. */
[data-tema=chromecore]{color-scheme:dark;--body-fundo:transparent;
  --topo:#0b0b0e;--bg:#040405;--card:rgba(12,12,15,.94);--card2:#18181d;--borda:rgba(220,225,235,.13);--card-borda:rgba(220,225,235,.24);--fg:#f1f2f5;--sub:#9a9ca6;
  --acc:#d9dde5;--acc-fundo:linear-gradient(160deg,#ffffff 0%,#b8bec9 22%,#ffffff 40%,#5d636e 58%,#e9ecf1 76%,#8b919c 100%);--acc-press:#8b919c;--on-acc:#08090b;--acc-t:#e6e9ef;--rap:#9fd8ff;
  --heroi:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.07) 40%,transparent 50%),linear-gradient(160deg,#1c1d22 0%,#060607 55%,#17181c 100%);--heroi-borda:rgba(235,238,245,.45);--on-heroi:#ffffff;--heroi-linha:rgba(255,255,255,.15);--heroi-aviso:#f5c98a;
  --pos:#8fe0b8;--pos-bg:rgba(30,100,80,.3);--warn:#f5c98a;--warn-bg:rgba(130,95,30,.3);--neg:#ff8fa3;--neg-bg:rgba(140,40,70,.32);
  --on-status:#040405;--dou-bg:rgba(230,233,239,.06);--rec-bg:rgba(143,224,184,.08);
  --sombra:0 10px 30px rgba(0,0,0,.7);--vidro:none;--folha:#0c0c0f;
  --f-titulo:"Pirata One",Georgia,serif;--t-estilo:normal;--t-peso:400;--t-tam:40px;--t-sombra:none;
  --ceu:radial-gradient(ellipse 70% 40% at 50% 30%,rgba(200,205,220,.07),transparent 70%),linear-gradient(180deg,#0b0b0e,#030304 65%);
  --ceu-giro:none;--estrelas:none;--estrelas2:none;--chao:none;--chao-h:0px;
  --c2:#ff9ad5;--c2-fundo:linear-gradient(160deg,#ffffff 0%,#f2b8da 22%,#ffffff 40%,#8a4f72 58%,#fbe3f1 76%,#b07a98 100%);--c2-press:#b07a98;--c2-on:#1a0812;--c2-t:#ffc2e6;--c2-bg:rgba(255,154,213,.1);
  --c2-heroi:linear-gradient(115deg,transparent 30%,rgba(255,200,235,.08) 40%,transparent 50%),linear-gradient(160deg,#241820 0%,#080506 55%,#1e141a 100%);--c2-heroi-borda:rgba(255,200,235,.45);--c2-on-heroi:#ffffff;
  --espinho:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23ffffff'/><stop offset='.35' stop-color='%238a909b'/><stop offset='.55' stop-color='%23ffffff'/><stop offset='1' stop-color='%234a4f58'/></linearGradient></defs><path d='M30 7 Q14 8 0 0 Q12 10 30 13 Z' fill='url(%23g)'/><path d='M30 12 Q19 14 9 20 Q20 11 30 10 Z' fill='url(%23g)'/></svg>");
  --cantos:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23ffffff'/><stop offset='.4' stop-color='%238a909b'/><stop offset='.6' stop-color='%23ffffff'/><stop offset='1' stop-color='%234a4f58'/></linearGradient></defs><g fill='url(%23g)'><path d='M16 16 Q6 12 0 3 Q10 8 19 12 Z'/><path d='M16 16 Q12 6 3 0 Q8 10 12 19 Z'/></g></svg>")}
[data-tema=chromecore] body.c2ativa{--espinho:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 20'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23ffffff'/><stop offset='.35' stop-color='%23b07a98'/><stop offset='.55' stop-color='%23ffffff'/><stop offset='1' stop-color='%236a3a56'/></linearGradient></defs><path d='M30 7 Q14 8 0 0 Q12 10 30 13 Z' fill='url(%23g)'/><path d='M30 12 Q19 14 9 20 Q20 11 30 10 Z' fill='url(%23g)'/></svg>")}
[data-tema=chromecore] :is(h1,.secao>h2){background:linear-gradient(180deg,#ffffff 0%,#c9ced8 40%,#5d636e 55%,#f1f3f6 75%,#9aa0aa 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 6px rgba(255,255,255,.18))}
[data-tema=chromecore] body.c2ativa :is(h1,.secao>h2){background-image:linear-gradient(180deg,#ffffff 0%,#f6cfe5 40%,#8a4f72 55%,#fde9f4 75%,#c08aa8 100%)}
[data-tema=chromecore] .btn{position:relative;margin:0 18px;border-radius:999px;box-shadow:inset 0 1px 0 #fff,0 0 12px rgba(255,255,255,.18)}
[data-tema=chromecore] .btn.sec{background:var(--card2);color:var(--acc-t);border:1px solid rgba(230,233,239,.45)}
[data-tema=chromecore] .btn::before,[data-tema=chromecore] .btn::after{content:"";position:absolute;top:50%;width:26px;height:18px;margin-top:-9px;pointer-events:none;background:var(--espinho) center/contain no-repeat;animation:pPonta 3s ease-in-out infinite alternate}
[data-tema=chromecore] .btn::before{left:-21px}
[data-tema=chromecore] .btn::after{right:-21px;transform:scaleX(-1);animation-delay:-1.5s}
[data-tema=chromecore] .seg,[data-tema=chromecore] .seg button,[data-tema=chromecore] input[type=search],[data-tema=chromecore] .chip{border-radius:999px}
[data-tema=chromecore] .seg.abas button.on,[data-tema=chromecore] .chip.on{box-shadow:inset 0 1px 0 #fff,0 0 10px rgba(255,255,255,.2)}
[data-tema=chromecore] :is(.faixa,.grupo){position:relative;overflow:visible;border-radius:6px}
[data-tema=chromecore] :is(.faixa,.grupo)::before{content:"";position:absolute;top:-12px;right:-12px;bottom:-12px;left:-12px;pointer-events:none;
  background:var(--cantos) 0 0/40px 40px no-repeat;animation:pPonta 3.6s ease-in-out infinite alternate}
[data-tema=chromecore] .faixa::after{content:"";position:absolute;top:-12px;right:-12px;bottom:-12px;left:-12px;pointer-events:none;background:var(--cantos) 0 0/40px 40px no-repeat;transform:rotate(180deg);animation:pPonta 3.6s ease-in-out -1.8s infinite alternate}
[data-tema=chromecore] .grupo::before{transform:scaleX(-1)}
[data-tema=chromecore] .thumb{border-radius:4px}
[data-tema=chromecore] body>.ceu .k1{left:50%;top:6%;width:300px;height:600px;margin-left:-150px;opacity:.32;will-change:transform;animation:pRespiraC 8s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 400'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23ffffff'/><stop offset='.3' stop-color='%23767c87'/><stop offset='.5' stop-color='%23ffffff'/><stop offset='.72' stop-color='%233c4048'/><stop offset='1' stop-color='%23e6e9ee'/></linearGradient></defs><path d='M100 0 Q108 100 100 200 Q92 300 100 400' fill='none' stroke='url(%23g)' stroke-width='3'/><g fill='url(%23g)'><path d='M100 50 Q140 40 172 6 Q138 52 100 60 Z'/><path d='M100 115 Q150 112 192 160 Q146 126 100 125 Z'/><path d='M100 190 Q128 200 146 250 Q122 210 100 200 Z'/><path d='M100 270 Q138 290 164 352 Q130 300 100 282 Z'/><path d='M140 128 Q150 108 166 100 Q154 116 146 132 Z'/><path d='M126 205 Q140 196 154 196 Q142 204 130 212 Z'/><path d='M100 50 Q60 40 28 6 Q62 52 100 60 Z'/><path d='M100 115 Q50 112 8 160 Q54 126 100 125 Z'/><path d='M100 190 Q72 200 54 250 Q78 210 100 200 Z'/><path d='M100 270 Q62 290 36 352 Q70 300 100 282 Z'/><path d='M60 128 Q50 108 34 100 Q46 116 54 132 Z'/><path d='M74 205 Q60 196 46 196 Q58 204 70 212 Z'/></g></svg>") center/contain no-repeat}
[data-tema=chromecore] body>.ceu .k2{top:-20%;bottom:-20%;left:0;width:45%;will-change:transform;background:linear-gradient(105deg,transparent,rgba(255,255,255,.05) 45%,rgba(255,255,255,.09) 50%,transparent 60%);animation:pLuzC 9s ease-in-out infinite}
[data-tema=chromecore] body>.ceu :is(.k3,.k4){will-change:transform,opacity;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'><path d='M20 0 L22 18 L40 20 L22 22 L20 40 L18 22 L0 20 L18 18 Z' fill='%23ffffff'/></svg>") center/contain no-repeat}
[data-tema=chromecore] body>.ceu .k3{right:10%;top:20%;width:26px;height:26px;animation:pBrilha 3.5s ease-in-out infinite alternate}
[data-tema=chromecore] body>.ceu .k4{left:9%;top:64%;width:18px;height:18px;animation:pBrilha 4.5s ease-in-out -2s infinite alternate}
[data-tema=chromecore] .toque{animation:pEspeta .35s ease-out}
[data-tema=chromecore] .btn.toque::before,[data-tema=chromecore] .btn.toque::after{animation:none;filter:brightness(1.6)}

/* ---------- MetalHeart: cantos góticos (côncavos), coração girando ---------- */
[data-tema=metalheart] :is(.btn,.chip,.chip-conta,.seg,.seg.abas button.on,.grupo,.faixa,.mais,input[type=search]){border-radius:0;
  -webkit-mask:radial-gradient(circle at 0 0,#0000 var(--cv),#000 calc(var(--cv) + .5px)) 0 0/51% 51% no-repeat,radial-gradient(circle at 100% 0,#0000 var(--cv),#000 calc(var(--cv) + .5px)) 100% 0/51% 51% no-repeat,radial-gradient(circle at 0 100%,#0000 var(--cv),#000 calc(var(--cv) + .5px)) 0 100%/51% 51% no-repeat,radial-gradient(circle at 100% 100%,#0000 var(--cv),#000 calc(var(--cv) + .5px)) 100% 100%/51% 51% no-repeat;
  mask:radial-gradient(circle at 0 0,#0000 var(--cv),#000 calc(var(--cv) + .5px)) 0 0/51% 51% no-repeat,radial-gradient(circle at 100% 0,#0000 var(--cv),#000 calc(var(--cv) + .5px)) 100% 0/51% 51% no-repeat,radial-gradient(circle at 0 100%,#0000 var(--cv),#000 calc(var(--cv) + .5px)) 0 100%/51% 51% no-repeat,radial-gradient(circle at 100% 100%,#0000 var(--cv),#000 calc(var(--cv) + .5px)) 100% 100%/51% 51% no-repeat}
[data-tema=metalheart] :is(.btn,.seg,.mais,input[type=search]){--cv:9px}
[data-tema=metalheart] :is(.chip,.chip-conta,.seg.abas button.on){--cv:6px}
[data-tema=metalheart] .grupo{--cv:14px}
[data-tema=metalheart] .faixa{--cv:18px}
[data-tema=metalheart] .btn{letter-spacing:.04em}
[data-tema=metalheart] body>.ceu i{animation:pCoracao 16s linear infinite}
[data-tema=metalheart] body>.ceu .k1{top:0;left:0;right:0;bottom:0;animation:pPixel 2.6s steps(1) infinite;
  background:url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='240'><g fill='%23c9c2ff'><path d='M40 50 l1.5 5 5 1.5 -5 1.5 -1.5 5 -1.5 -5 -5 -1.5 5 -1.5z'/><path d='M160 170 l1.2 4 4 1.2 -4 1.2 -1.2 4 -1.2 -4 -4 -1.2 4 -1.2z'/></g></svg>") 0 0/200px 240px}

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
[data-tema=rosinha] .toque{animation:pQuica .5s ease-out}
[data-tema=vermelho] .toque{animation:pArranca .3s ease-out}
[data-tema=galaxia] .toque{animation:pSupernova .5s ease-out}
[data-tema=frutiger] .toque{animation:pEstoura .4s ease-out}
[data-tema=softclub] .toque{animation:pPulsoSom .7s ease-out}
[data-tema=gatinhos] .toque{animation:pAmassa .3s ease-out}
[data-tema=darkaero] .toque{animation:pVarreV .45s ease-out}
[data-tema=metalheart] .toque{animation:pMetal .35s ease-out}
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

// Tudo de tema que vai no <style> da página (os 13 + os Temáticos).
function css() {
  return CSS_TEMAS + CSS_TEMATICOS + CSS_TODOS;
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

// Camada de fita por cima de tudo (só aparece na Fita Perdida).
function vhs() {
  return '<div class="vhs" aria-hidden="true"><i class="vulto"></i><i class="estatica"></i>' +
    '<span class="osd-play" id="osd-play">PLAY ▶</span><span class="osd-hora" id="osd-hora">NOV.17 1996 03:17:42</span><b></b></div>';
}

// v5.3: folha do menu ⋯ > Temas, com uma miniatura de cada tema.
// v6.4: 3º grupo (Temáticos) e o interruptor dos sustos da Fita Perdida.
function folhaTemas(sustos) {
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
    grupo('c', 'Clássicos') + grupo('e', 'Estéticos') + grupo('t', 'Temáticos') +
    '<label class="t-sustos" for="t-sustos"><span>Sustos da Fita Perdida<small>Vulto, mensagens e a fita voltando sozinha</small></span>' +
    '<input type="checkbox" id="t-sustos"' + (sustos === false ? '' : ' checked') + '></label>' +
    '<button type="button" class="op cancelar" id="t-pronto">Pronto</button>' +
    '</div>'
  );
}

// Script da página: reação ao toque (v6.5: em todos os temas escolhidos; no Azul
// sai uma ondinha do ponto do dedo e nos Gatinhos aparece uma patinha), relógio
// da fita e o interruptor dos sustos (grava pela ponte PONTE + 'sustos?v=0|1').
function script(ponte) {
  return `<script>
(function(){
  var raiz = document.documentElement;
  var PONTE = ${JSON.stringify(ponte)};
  var TOQUES = { thGeleia: 1, thBrilho: 1, thInverte: 1, thRacha: 1, thOnda: 1, thFita: 1,
    pAfunda: 1, pAcende: 1, pQuica: 1, pArranca: 1, pSupernova: 1, pEstoura: 1, pPulsoSom: 1,
    pAmassa: 1, pVarreV: 1, pEspeta: 1, pMetal: 1, pEmpurra: 1 };
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

  // Fita Perdida: a hora da gravação corre; com os sustos ligados, a fita volta
  // sozinha para 03:17:42 e o PLAY vira REC por um instante.
  var INICIO = 3 * 3600 + 17 * 60 + 42, seg = INICIO, tique = 0;
  var hora = document.getElementById('osd-hora'), play = document.getElementById('osd-play');
  function dois(n){ return (n < 10 ? '0' : '') + n; }
  setInterval(function(){
    if (raiz.getAttribute('data-tema') !== 'horror' || !hora || !play) return;
    var sustos = raiz.getAttribute('data-sustos') !== '0';
    tique++;
    seg = (seg + 1) % 86400;
    if (sustos && tique % 47 === 0) seg = INICIO;
    play.textContent = sustos && tique % 37 < 2 ? 'REC ●' : 'PLAY ▶';
    hora.textContent = 'NOV.17 1996 ' + dois(Math.floor(seg / 3600)) + ':' + dois(Math.floor(seg / 60) % 60) + ':' + dois(seg % 60);
  }, 1000);

  var cx = document.getElementById('t-sustos');
  if (cx) cx.addEventListener('change', function(){
    var v = cx.checked ? '1' : '0';
    if (v === '0') raiz.setAttribute('data-sustos', '0'); else raiz.removeAttribute('data-sustos');
    try {
      var f = document.createElement('iframe');
      f.style.display = 'none';
      f.src = PONTE + 'sustos?v=' + v + '&x=' + Date.now();
      document.body.appendChild(f);
      setTimeout(function(){ if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    } catch (e) {}
  });
})();
</script>`;
}

module.exports = { TEMAS, temaValido, mapaTemas, css, ceu, vhs, folhaTemas, script };
