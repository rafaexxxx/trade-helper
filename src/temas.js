// Temas do painel. v5.3 (protótipo M2): cada tema tem visual fixo; sem tema
// escolhido, o painel segue o iPhone (Azul no claro, Dark no escuro). v5.3.1: a
// escolha fica no arquivo de ajustes (ponte PONTE + 'tema?t=<id>').
// v6.4: tudo de tema mora aqui (antes ficava no html.js) e entram os 6
// "Temáticos" (protótipo N6): além das cores, mudam a FORMA de botões, chips e
// cartões, o fundo animado e a reação ao toque. Regras de desempenho do N6:
// animação de tela cheia só com transform/opacity e sem backdrop-filter sobre
// fundo animado. A Fita Perdida tem sustos que o usuário pode desligar
// (ajustes.sustos, ponte PONTE + 'sustos?v=0|1').

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
  { id: 'chromecore', nome: 'Chromecore', g: 'e', e: 'dark', f: 'Zen+Dots' },
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

// Tudo de tema que vai no <style> da página (os 13 + os Temáticos).
function css() {
  return CSS_TEMAS + CSS_TEMATICOS;
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

// Script da página: reação ao toque dos Temáticos, relógio da fita e o
// interruptor dos sustos (grava pela ponte PONTE + 'sustos?v=0|1').
function script(ponte) {
  return `<script>
(function(){
  var raiz = document.documentElement;
  var PONTE = ${JSON.stringify(ponte)};
  var TEMATICOS = { abissal: 1, noir: 1, obsidiana: 1, veludo: 1, acid: 1, horror: 1 };
  var TOQUES = { thGeleia: 1, thBrilho: 1, thInverte: 1, thRacha: 1, thOnda: 1, thFita: 1 };
  document.addEventListener('pointerdown', function(ev){
    if (!TEMATICOS[raiz.getAttribute('data-tema')] || !ev.target || !ev.target.closest) return;
    var b = ev.target.closest('.btn,.chip,.seg button,.mais,.chip-conta,.folha .op,.an-fbtn');
    if (!b) return;
    b.classList.remove('toque');
    void b.offsetWidth;
    b.classList.add('toque');
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
