// Página do painel (v4): visual profissional, tema claro/escuro seguindo o iPhone.
// Três abas: Inventário, Avaliar trade (módulo avaliador) e Anúncios (módulo anuncios).
// v5.1: no Inventário a lista vem logo depois de uma faixa compacta de totais;
// alertas e mudanças aparecem na linha de cada item (etiqueta e setas) e no menu do item.
// v5.2: alternador de conta no topo (a conta 2 troca Inventário e Anúncios, em vinho)
// e menu ⋯ (trocar/remover a conta 2; Temas e Ajuda entram aqui depois).
// v5.3: 10 temas no menu ⋯ (Clássicos e Estéticos), salvos no iPhone.
const a = require('analise');
const avaliador = require('avaliador');
const anuncios = require('anuncios');

function esc(s) {
  const mapa = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => mapa[c]);
}

function corDemanda(d) {
  if (d === 0) return 'neg';
  if (d === 1) return 'warn';
  if (d >= 3) return 'pos';
  return '';
}

function corTendencia(t) {
  if (t === 0) return 'neg';
  if (t === 3) return 'pos';
  if (t === 1 || t === 4) return 'warn';
  return '';
}

const COR_GRAVIDADE = { alta: 'neg', media: 'warn', baixa: 'sub' };
const PESO_GRAVIDADE = { alta: 3, media: 2, baixa: 1 };
const COR_DIRECAO = { sobe: 'pos', desce: 'neg', neutro: 'sub' };

function maiuscula(s) {
  s = String(s || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function pct(antes, depois) {
  return antes ? ((depois - antes) / antes) * 100 : null;
}

// Período real da comparação (a base é o retrato mais perto de 24h atrás):
// "em 24h" quase sempre; "em 6h" no começo do histórico; "desde 13/11 14:05"
// quando o painel ficou dias sem ser aberto.
function periodoReal(base, agora) {
  if (!base) return null;
  const h = (agora - base.data) / 3600000;
  if (h >= 20 && h <= 30) return { curto: 'em 24h', longo: 'Em 24 horas' };
  if (h < 20) {
    const n = Math.max(1, Math.round(h));
    return { curto: 'em ' + n + 'h', longo: 'Em ' + n + (n === 1 ? ' hora' : ' horas') };
  }
  const q = quando(base.data, agora);
  return { curto: 'desde ' + q, longo: 'Desde ' + q };
}

// Alertas de encontrarRiscos por uaid, do mais grave para o mais leve.
// As quedas de value/RAP ganham o período ("value caiu 6,3% em 24h").
function alertasPorUaid(riscos, per) {
  const m = {};
  for (const r of riscos) {
    m[r.item.uaid] = r.motivos
      .map((x) => Object.assign({}, x, { texto: x.texto + (x.queda && per ? ' ' + per.curto : '') }))
      .sort((x, y) => PESO_GRAVIDADE[y.grav] - PESO_GRAVIDADE[x.grav]);
  }
  return m;
}

// Etiqueta da linha: o pior alerta e "+N" para os outros (todos aparecem no menu do item).
function etiqueta(motivos) {
  if (!motivos || !motivos.length) return '';
  const pior = motivos[0];
  const mais = motivos.length > 1 ? ' +' + (motivos.length - 1) : '';
  return '<span class="tag ' + COR_GRAVIDADE[pior.grav] + '">' + esc(maiuscula(pior.texto)) + mais + '</span>';
}

// Variação % do value e do RAP do item contra o retrato base (24h).
function variacaoItem(i, base) {
  const p = base && base.itens ? base.itens[i.uaid] : null;
  if (!p) return null;
  return { v: pct(p.valorEfetivo, i.valorEfetivo), r: pct(p.rap, i.rap) };
}

// Seta pequena ao lado do número ("▲ 6,2%"), só a partir do limite de mudança.
function seta(p, lim) {
  if (p == null || Math.abs(p) < lim) return '';
  return '<small class="seta ' + (p > 0 ? 'pos' : 'neg') + '">' + (p > 0 ? '▲ ' : '▼ ') + a.fmtPct(Math.abs(p)) + '</small>';
}

// Linha pequena embaixo do nome: demanda · tendência · detalhes.
// "projected" não entra aqui: ele sempre vira a etiqueta vermelha da linha.
function detalhes(i) {
  const d = [];
  if (i.demanda >= 0) d.push('<span class="' + corDemanda(i.demanda) + '">' + esc(a.demandaCurta(i.demanda)) + '</span>');
  if (i.tendencia >= 0) d.push('<span class="' + corTendencia(i.tendencia) + '">' + esc(a.tendenciaCurta(i.tendencia)) + '</span>');
  if (i.serial) d.push('#' + esc(i.serial));
  if (i.hyped) d.push('hyped');
  if (i.rare) d.push('rare');
  if (i.hold) d.push('<span class="warn">hold</span>');
  if (i.value == null && !i.semRolimons) d.push('sem value');
  if (i.semRolimons) d.push("fora do Rolimon's");
  return d.join(' · ');
}

// Uma linha da lista. "motivos" são os alertas do item; "vari" a variação em 24h.
function linhaItem(i, miniatura, motivos, vari, lim) {
  const det = detalhes(i);
  const tag = etiqueta(motivos);
  const img = miniatura
    ? '<img class="thumb" src="' + esc(miniatura) + '" alt="">'
    : '<span class="thumb"></span>';
  const setaV = i.value != null ? seta(vari && vari.v, lim) : '';
  const setaR = seta(vari && vari.r, lim);
  return (
    '<div class="item" data-uaid="' + esc(i.uaid) + '" data-asset="' + esc(i.assetId) + '" data-titulo="' + esc(i.nome) +
    '" data-nome="' + esc((i.nome + ' ' + i.sigla).toLowerCase()) +
    '" data-value="' + i.valorEfetivo + '" data-rap="' + i.rap +
    '" data-dem="' + i.demanda + '" data-tend="' + i.tendencia +
    '" data-alerta="' + (tag ? '1' : '0') + '">' +
    img +
    '<div class="item-txt"><span class="nome">' + esc(i.nome) + '</span>' +
    (tag || det ? '<span class="det">' + tag + (det ? '<span>' + det + '</span>' : '') + '</span>' : '') + '</div>' +
    '<div class="item-num"><span class="v">' + (i.value != null ? setaV + a.fmtNum(i.value) : '<span class="sub">—</span>') + '</span>' +
    '<span class="r">' + setaR + '<small>RAP</small>' + a.fmtNum(i.rap) + '</span></div>' +
    '</div>'
  );
}

// Texto de uma mudança no menu: "Value subiu 6,8% (25.749 → 27.500)".
function textoMudanca(y) {
  if (y.campo === 'value' || y.campo === 'rap') {
    return (y.campo === 'value' ? 'Value ' : 'RAP ') + (y.pct > 0 ? 'subiu ' : 'caiu ') + a.fmtPct(Math.abs(y.pct)) +
      ' (' + a.fmtNum(y.antes) + ' → ' + a.fmtNum(y.depois) + ')';
  }
  return y.texto;
}

// Dados do menu de cada item: a = alertas [texto, cor]; m = mudanças em 24h [texto, cor].
function dadosDoMenu(alertas, c) {
  const m = {};
  const pegar = (uaid) => (m[uaid] = m[uaid] || { a: [], m: [] });
  for (const uaid of Object.keys(alertas)) {
    pegar(uaid).a = alertas[uaid].map((x) => [maiuscula(x.texto), COR_GRAVIDADE[x.grav]]);
  }
  for (const x of c.mudancas || []) {
    pegar(x.item.uaid).m = x.mudancas.map((y) => [textoMudanca(y), COR_DIRECAO[y.dir]]);
  }
  return m;
}

// Hora curta ("13:35"); com a data na frente quando não for o mesmo dia.
function quando(ms, agora) {
  const x = new Date(ms);
  const y = new Date(agora);
  const mesmoDia = x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  return mesmoDia ? a.fmtData(ms).slice(6) : a.fmtData(ms);
}

// Variação de um total na faixa: "▲ 2,1% em 24h".
function varTotal(v, per) {
  if (!per || !v || v.pct == null) return '<span class="f-var vazio">—</span>';
  const s = v.pct > 0 ? '▲ ' : v.pct < 0 ? '▼ ' : '';
  return '<span class="f-var">' + s + a.fmtPct(Math.abs(v.pct)) + ' ' + esc(per.curto) + '</span>';
}

// ---------- Temas (v5.3, protótipo M2) ----------
// Cada tema tem visual fixo. Sem tema escolhido, o painel segue o iPhone
// (Azul no claro, Dark no escuro), como na v4. A escolha fica no localStorage
// ('tema') e é aplicada no <head>, antes do primeiro desenho.
// g: c = Clássicos, e = Estéticos; e: esquema (claro/escuro); f: fonte do título (Google Fonts).
const TEMAS = [
  { id: 'azul', nome: 'Azul', g: 'c', e: 'light' },
  { id: 'dark', nome: 'Dark', g: 'c', e: 'dark' },
  { id: 'oled', nome: 'OLED', g: 'c', e: 'dark' },
  { id: 'rosinha', nome: 'Rosinha', g: 'c', e: 'light' },
  { id: 'vermelho', nome: 'Vermelho', g: 'c', e: 'dark' },
  { id: 'galaxia', nome: 'Galáxia', g: 'e', e: 'dark' },
  { id: 'frutiger', nome: 'Frutiger Aero', g: 'e', e: 'light' },
  { id: 'y2k', nome: 'Y2K', g: 'e', e: 'light', f: 'Audiowide' },
  { id: 'dreamcore', nome: 'Dreamcore', g: 'e', e: 'light', f: 'Cormorant+Garamond:ital,wght@1,600' },
  { id: 'dungeon', nome: 'Dungeon Synth', g: 'e', e: 'dark', f: 'UnifrakturMaguntia' },
];

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
  --on-acc:#ffffff;--c2-on:#ffffff;--on-heroi:#ffffff;--heroi-linha:rgba(255,255,255,.2);--heroi-aviso:#f5c98a;
  --acc-fundo:var(--acc);--c2-fundo:var(--c2);--folha:var(--card);
  --f-ui:"Montserrat",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  --f-titulo:var(--f-ui);--t-estilo:normal;--t-peso:700;--t-tam:30px;
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
[data-tema=y2k]{color-scheme:light;--body-fundo:transparent;
  --topo:#f3e7ff;--bg:#f7f0ff;
  --card:rgba(255,255,255,.74);--card2:rgba(238,228,255,.8);--borda:#dccff5;--fg:#1d1638;--sub:#6a6090;
  --acc:#4b2cff;--acc-fundo:linear-gradient(135deg,#ff4fd8 0%,#7b5cff 50%,#2fc6ff 100%);--acc-press:#3a1fd6;--acc-t:#4b2cff;--rap:#c81f92;
  --heroi:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0) 55%),linear-gradient(120deg,#ffb3ec 0%,#c7b5ff 28%,#a8e6ff 55%,#c9ffe6 78%,#ffd9f5 100%);
  --heroi-borda:rgba(255,255,255,.95);--card-borda:rgba(255,255,255,.95);--on-heroi:#1d1638;--heroi-linha:rgba(29,22,56,.15);--heroi-aviso:#a3400a;
  --pos:#0f7f52;--pos-bg:#d8f5e8;--warn:#9a5806;--warn-bg:#fff0d6;--neg:#cc1f4c;--neg-bg:#ffe0ea;
  --on-status:#ffffff;--dou-bg:rgba(236,228,255,.85);--rec-bg:rgba(222,248,236,.85);
  --sombra:0 6px 20px rgba(120,80,200,.16),inset 0 1px 0 #fff;
  --vidro:blur(10px) saturate(140%);--folha:rgba(250,246,255,.95);
  --f-titulo:"Audiowide",var(--f-ui);--t-peso:400;--t-tam:28px;
  --ceu:radial-gradient(circle at 85% 12%,rgba(255,120,220,.35),transparent 30%),radial-gradient(circle at 10% 45%,rgba(120,200,255,.35),transparent 32%),radial-gradient(circle at 80% 80%,rgba(170,140,255,.32),transparent 35%),linear-gradient(135deg,#f6e9ff 0%,#ffe4f5 35%,#e2f5ff 70%,#effff7 100%);
  --estrelas:radial-gradient(2px 2px at 30px 40px,#fff,transparent),radial-gradient(1.5px 1.5px at 120px 90px,#ff9be6,transparent),radial-gradient(2px 2px at 70px 150px,#9fdcff,transparent),radial-gradient(1.5px 1.5px at 170px 20px,#c9b5ff,transparent);
  --estrelas-tam:190px 190px;
  --c2:#2c2650;--c2-fundo:linear-gradient(180deg,#6a6488,#2c2650);--c2-press:#1d1638;--c2-t:#2c2650;--c2-bg:rgba(228,226,238,.92);
  --c2-heroi:linear-gradient(180deg,rgba(255,255,255,.6),rgba(255,255,255,0) 55%),linear-gradient(120deg,#c9cfdc 0%,#f4f6fb 28%,#9aa3b8 52%,#eef1f7 76%,#b8c0d2 100%);--c2-heroi-borda:rgba(255,255,255,.95)}
[data-tema=dreamcore]{color-scheme:light;--body-fundo:transparent;
  --topo:#bcdcff;--bg:#fdf3fb;
  --card:rgba(255,255,255,.62);--card2:rgba(255,255,255,.46);--borda:rgba(255,255,255,.92);--fg:#352f52;--sub:#736c96;
  --acc:#5f6fe8;--acc-fundo:linear-gradient(180deg,#9aa8ff,#5f6fe8);--acc-press:#4a58c8;--acc-t:#4f5bd0;--rap:#b0408a;
  --heroi:linear-gradient(160deg,#bcd9ff 0%,#ffd0e8 58%,#fff0c2 100%);
  --heroi-borda:rgba(255,255,255,.95);--card-borda:rgba(255,255,255,.95);--on-heroi:#352f52;--heroi-linha:rgba(53,47,82,.15);--heroi-aviso:#9a4a00;
  --pos:#2a8655;--pos-bg:rgba(226,245,234,.92);--warn:#9a5e0c;--warn-bg:rgba(253,240,218,.92);--neg:#c23a5c;--neg-bg:rgba(253,228,236,.92);
  --on-status:#ffffff;--dou-bg:rgba(235,238,255,.75);--rec-bg:rgba(230,248,238,.75);
  --sombra:0 6px 22px rgba(120,100,180,.16);
  --vidro:blur(14px) saturate(120%);--folha:rgba(255,250,253,.95);
  --f-titulo:"Cormorant Garamond",Georgia,serif;--t-estilo:italic;--t-peso:600;--t-tam:36px;
  --ceu:radial-gradient(ellipse 130px 46px at 22% 9%,rgba(255,255,255,.95),transparent 70%),radial-gradient(ellipse 90px 38px at 33% 7%,#fff,transparent 70%),radial-gradient(ellipse 150px 50px at 78% 24%,rgba(255,255,255,.9),transparent 70%),radial-gradient(ellipse 100px 40px at 88% 21%,#fff,transparent 70%),radial-gradient(ellipse 140px 48px at 15% 48%,rgba(255,255,255,.8),transparent 70%),radial-gradient(circle at 70% 4%,rgba(255,244,190,.9),transparent 22%),linear-gradient(180deg,#a7d0ff 0%,#d4e6ff 32%,#ffe1f0 68%,#fff4d4 100%);
  --chao:conic-gradient(rgba(255,205,235,.75) 25%,rgba(255,255,255,.75) 0 50%,rgba(255,205,235,.75) 0 75%,rgba(255,255,255,.75) 0);--chao-tam:28px 28px;--chao-h:170px;
  --c2:#9a3d84;--c2-fundo:linear-gradient(180deg,#d07fbd,#8a3a7a);--c2-press:#6f2e62;--c2-t:#8a3a7a;--c2-bg:rgba(250,230,245,.88);
  --c2-heroi:linear-gradient(160deg,#d6a6ec 0%,#f0a2c8 60%,#ffd1b0 100%);--c2-heroi-borda:rgba(255,255,255,.95)}
[data-tema=dungeon]{color-scheme:dark;--body-fundo:transparent;
  --topo:#1a1712;--bg:#0b0a08;
  --card:rgba(28,25,19,.94);--card2:#27221a;--borda:#3b3226;--fg:#ece1c7;--sub:#a8997a;
  --acc:#8c6a2a;--acc-fundo:linear-gradient(180deg,#a8823a,#76561c);--on-acc:#fff3d6;--acc-press:#6b4f1a;--acc-t:#d9b765;--rap:#d9b765;
  --heroi:linear-gradient(180deg,#2c251a,#18140e);--heroi-borda:#6b5426;--card-borda:#3b3226;--on-heroi:#ecd9a6;--heroi-linha:rgba(217,183,101,.25);--heroi-aviso:#f09a5a;
  --pos:#a6d68f;--pos-bg:#1c2a17;--warn:#f09a5a;--warn-bg:#33200f;--neg:#ff8f80;--neg-bg:#3a1a16;
  --on-status:#0b0a08;--dou-bg:#241c10;--rec-bg:#18221a;
  --sombra:0 8px 24px rgba(0,0,0,.5);
  --f-titulo:"UnifrakturMaguntia",Georgia,serif;--t-peso:400;--t-tam:36px;
  --ceu:radial-gradient(circle at 80% 6%,#efe3c0 0 20px,rgba(239,227,192,.28) 23px,rgba(239,227,192,0) 70px),radial-gradient(ellipse 70% 30% at 70% 0%,rgba(230,200,130,.14),transparent 70%),linear-gradient(180deg,transparent 35%,rgba(70,80,60,.16) 55%,transparent 72%),radial-gradient(ellipse at 50% 40%,transparent 45%,rgba(0,0,0,.6) 100%),linear-gradient(180deg,#16140f,#0b0a08);
  --estrelas:radial-gradient(1px 1px at 20px 30px,rgba(239,227,192,.5),transparent),radial-gradient(1px 1px at 140px 90px,rgba(239,227,192,.35),transparent);--estrelas-tam:220px 260px;
  --chao:conic-gradient(from 150deg at 50% 0%,#141810 0deg 60deg,transparent 60deg);--chao-tam:36px 100%;--chao-h:110px;
  --c2:#5e3a8c;--c2-fundo:linear-gradient(180deg,#7a4fb0,#4e2f78);--c2-press:#432866;--c2-on:#f3eaff;--c2-t:#c4a6f0;--c2-bg:#221a30;
  --c2-heroi:linear-gradient(180deg,#2a1f3d,#17121f);--c2-heroi-borda:#5e3a8c}

/* Fundo decorado: camada fixa atrás de tudo (galáxia, bolhas, nuvens, floresta). */
.ceu{position:fixed;top:0;left:0;right:0;bottom:0;z-index:-1;pointer-events:none;overflow:hidden;background-image:var(--ceu);background-repeat:no-repeat;background-size:100% 100%}
.ceu::before{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background-image:var(--estrelas);background-size:var(--estrelas-tam)}
.ceu::after{content:"";position:absolute;top:0;left:0;right:0;bottom:0;background-image:var(--estrelas2);background-size:var(--estrelas2-tam);animation:pisca 3.5s ease-in-out infinite alternate}
.ceu i{position:absolute;left:-45%;right:-45%;top:2%;height:44%;background-image:var(--ceu-giro);background-repeat:no-repeat;transform:rotate(-24deg)}
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
.t-op.on .amostra{border-color:var(--fg)}
.amostra .a-x{position:relative;z-index:1;display:flex;flex-direction:column;gap:4px;padding:7px;height:100%}
.amostra .a-h{display:block;height:24px;border-radius:6px;background:var(--heroi);border:1px solid var(--heroi-borda)}
.amostra .a-l{display:block;height:9px;border-radius:4px;background:var(--card);border:1px solid var(--card-borda)}
.amostra .a-l.c{width:60%;background:var(--acc-fundo);border:0}
.amostra .ok{position:absolute;right:5px;bottom:5px;z-index:2;width:18px;height:18px;border-radius:50%;background:var(--fg);color:var(--bg);font-size:11px;font-weight:700;display:none;place-items:center}
.t-op.on .ok{display:grid}
`;

// Paleta v4 (aprovada no protótipo L), agora em temas. Os nomes antigos (--cab,
// --linha, --link, --rotulo) ficam como apelidos para nada sem cor escapar.
const CSS_BASE = `
${CSS_TEMAS}
*{box-sizing:border-box}
html{background:var(--bg);-webkit-text-size-adjust:100%}
body{margin:0;min-height:100vh;color:var(--fg);font:16px/1.4 var(--f-ui);font-variant-numeric:tabular-nums;
  background:var(--body-fundo);
  padding:max(14px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 40px max(16px,env(safe-area-inset-left))}
button{font:inherit;color:inherit}
.app{display:flex;flex-direction:column;gap:22px}
.aba{display:flex;flex-direction:column;gap:22px}
.oculto{display:none!important}
.pos{color:var(--pos)}.neg{color:var(--neg)}.warn{color:var(--warn)}.sub{color:var(--sub)}.acc{color:var(--acc-t)}

.topo{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
h1{margin:0;font-family:var(--f-titulo);font-style:var(--t-estilo);font-size:var(--t-tam);font-weight:var(--t-peso);line-height:1.1;letter-spacing:-.02em}
.user{color:var(--sub);font-size:15px}
.meta{margin:4px 0 0;color:var(--sub);font-size:13px}
.aviso{margin:0;color:var(--warn);font-size:14px}

.seg{display:flex;padding:3px;border-radius:12px;background:var(--card2)}
.seg button{flex:1;padding:9px 4px;border:0;border-radius:9px;background:none;color:var(--sub);font-size:15px;font-weight:600}
.seg button.on{background:var(--card);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.seg.abas button{font-size:14px}
.seg.abas button.on{background:var(--acc-fundo);color:var(--on-acc);box-shadow:none}
.seg.peq button,.seg.mini button{font-size:14px;padding:7px 4px}

.chips{display:flex;flex-wrap:wrap;gap:6px}
.chip{padding:7px 13px;border:1px solid var(--borda);border-radius:999px;background:var(--card);color:var(--fg);font-size:14px;font-weight:500;-webkit-user-select:none;user-select:none}
.chip.on{color:var(--on-acc);background:var(--acc-fundo);border-color:var(--acc)}
.chip.filtro{border-style:dashed}
.chip.filtro.on{border-style:solid;background:var(--neg-bg);border-color:var(--neg);color:var(--neg)}
.btn{padding:11px 16px;border-radius:12px;border:0;background:var(--acc-fundo);color:var(--on-acc);font-size:15px;font-weight:600}
.btn.sec{background:var(--card);color:var(--acc-t);border:1px solid var(--borda)}
.btn:active,.chip:active{background:var(--acc-press);color:var(--on-acc)}
.btn:disabled{opacity:.45}

.faixa{padding:14px 16px 12px;border-radius:18px;background:var(--heroi);color:var(--on-heroi);border:1px solid var(--heroi-borda);box-shadow:var(--sombra);display:flex;flex-direction:column;gap:12px}
.f-tot{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.f-col{display:flex;flex-direction:column;gap:3px;min-width:0}
.f-rot{font-size:12px;font-weight:600;opacity:.8;text-transform:uppercase;letter-spacing:.06em}
.f-num{font-size:24px;font-weight:700;line-height:1.1;letter-spacing:-.01em}
.f-var{font-size:13px;font-weight:600;opacity:.92}
.f-var.vazio{font-weight:500;opacity:.7}
.f-pe{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding-top:10px;border-top:1px solid var(--heroi-linha)}
.f-dir{display:flex;align-items:center;gap:8px}
.f-info{font-size:13px;opacity:.85}
.f-alerta{flex:none;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.16);color:var(--heroi-aviso);font-size:11px;font-weight:700;line-height:18px;text-align:center}
.f-aviso{display:flex;flex-direction:column;gap:6px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.12);font-size:13px;line-height:1.35}
.f-aviso p{margin:0}
.ferramentas{display:flex;flex-direction:column;gap:10px}

.secao{display:flex;flex-direction:column;gap:10px}
.secao>h2,details.bloco>summary{display:flex;align-items:center;gap:8px;margin:0;font-family:var(--f-titulo);font-style:var(--t-estilo);font-size:20px;font-weight:var(--t-peso);line-height:1.2;letter-spacing:-.01em}
.cont{min-width:24px;padding:3px 8px;border-radius:999px;font-size:13px;font-weight:600;line-height:1.2;text-align:center;background:var(--card2);color:var(--sub)}
.cont:empty{display:none}
.cont.neg{background:var(--neg-bg);color:var(--neg)}
.cont.warn{background:var(--warn-bg);color:var(--warn)}
.cont.pos{background:var(--pos-bg);color:var(--pos)}

.grupo{margin:0;padding:0;list-style:none;border-radius:16px;background:var(--card);border:1px solid var(--card-borda);box-shadow:var(--sombra);overflow:hidden}
.grupo>li+li{border-top:1px solid var(--borda)}
.grupo li{display:flex;gap:12px;align-items:flex-start;padding:13px 16px;font-size:15px}
.grupo li.sub{display:block}
.grupo b{font-weight:600}
.txt{min-width:0}
.marca{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;background:var(--card2);color:var(--sub)}
.marca.neg{background:var(--neg-bg);color:var(--neg)}
.marca.warn{background:var(--warn-bg);color:var(--warn)}
.marca.pos{background:var(--pos-bg);color:var(--pos)}
.vazio{margin:0;padding:14px 16px;border-radius:16px;background:var(--card);color:var(--sub);font-size:15px}
.nota{margin:0;font-size:13px;color:var(--sub)}

input[type=search]{width:100%;font:inherit;padding:12px 14px;border:1px solid var(--borda);border-radius:12px;background:var(--card);color:var(--fg);-webkit-appearance:none}
input[type=search]::placeholder{color:var(--sub)}

.item{display:flex;align-items:center;gap:12px;padding:12px 16px;-webkit-tap-highlight-color:transparent}
.item:active{background:var(--card2)}
.inv-lista .item+.item{border-top:1px solid var(--borda)}
.thumb{flex:none;width:46px;height:46px;border-radius:12px;background:var(--card2);object-fit:cover;display:block}
.item-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.nome{font-size:16px;font-weight:600;line-height:1.25;overflow-wrap:anywhere}
.det{font-size:13px;color:var(--sub);display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px}
.tag{display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;line-height:1.35;white-space:nowrap}
.tag.neg{background:var(--neg-bg);color:var(--neg)}
.tag.warn{background:var(--warn-bg);color:var(--warn)}
.tag.sub{background:var(--card2);color:var(--sub)}
.item-num small.seta{font-weight:700}
.item-num small.seta.pos{color:var(--pos)}
.item-num small.seta.neg{color:var(--neg)}
.item-num{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:5px;text-align:right;white-space:nowrap}
.item-num .v{font-size:18px;font-weight:700;line-height:1}
.item-num .r{font-size:16px;font-weight:600;line-height:1;color:var(--rap)}
.item-num small{margin-right:5px;font-size:13px;font-weight:500;color:var(--sub)}
.item-num .v small.tag{margin:0 0 0 5px}
.total{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 16px;border-top:1px solid var(--borda);background:var(--card2);font-weight:700}
.total .item-num .v{font-size:20px}
.total .item-num .r{font-size:17px}

details.bloco>summary{list-style:none;padding:2px 0;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
details.bloco>summary::-webkit-details-marker{display:none}
details.bloco>summary::after{content:"\\203A";margin-left:auto;font-size:26px;font-weight:400;line-height:1;color:var(--sub);transition:transform .15s}
details.bloco[open]>summary::after{transform:rotate(90deg)}
details.bloco>.dentro{margin-top:10px;display:flex;flex-direction:column;gap:10px}

details.diag{font-size:13px;color:var(--sub)}
details.diag p{margin:8px 0 0}
textarea{width:100%;height:240px;margin-top:8px;font:12px/1.4 ui-monospace,Menlo,monospace;background:var(--card);color:var(--fg);border:1px solid var(--borda);border-radius:12px;padding:10px}
footer{color:var(--sub);font-size:13px;text-align:center}

.fundo{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4)}
.folha{position:fixed;left:8px;right:8px;bottom:max(8px,env(safe-area-inset-bottom));background:var(--folha);border:1px solid var(--card-borda);border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.25)}
.folha p{margin:0;padding:14px 16px;text-align:center;font-size:14px;color:var(--sub);border-bottom:1px solid var(--borda)}
.folha a,.folha button{display:block;width:100%;padding:16px;text-align:center;font:inherit;font-size:17px;font-weight:500;color:var(--acc-t);text-decoration:none;background:none;border:0;border-bottom:1px solid var(--borda)}
.folha .cancelar{font-weight:700;border-bottom:0}
.folha{max-height:85vh;overflow-y:auto}
.folha-bloco{padding:12px 16px;border-bottom:1px solid var(--borda);display:flex;flex-direction:column;gap:8px;text-align:left}
.folha-bloco h3{margin:0;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--sub)}
.motivo{display:flex;gap:10px;align-items:center;font-size:15px}

/* v5.2: topo com o menu ⋯, alternador de conta e a cor da conta 2 (vinho).
   A conta 2 só troca os tokens de destaque: todo o resto segue igual. */
.cab{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.mais{flex:none;width:38px;height:38px;padding:0;border:1px solid var(--card-borda);border-radius:50%;background:var(--card);box-shadow:var(--sombra);color:var(--sub);font-size:20px;font-weight:700;line-height:1;-webkit-tap-highlight-color:transparent}
.mais:active{background:var(--card2)}
.cab .meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.chip-conta{display:inline-flex;align-items:center;gap:6px;max-width:100%;padding:3px 10px 3px 3px;border:1px solid var(--borda);border-radius:999px;background:var(--card);color:var(--fg);font-size:13px;font-weight:600;-webkit-tap-highlight-color:transparent}
.chip-conta:active{background:var(--card2)}
.chip-conta .n{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.chip-conta .av{width:20px;height:20px;font-size:10px}
.chip-conta .tr{color:var(--sub);font-size:12px}
.faixa-conta .voltar{margin-left:auto;padding:0;border:0;background:none;color:var(--c2-t);font-size:13px;font-weight:700;text-decoration:underline}
.av{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--on-acc);background:var(--acc-fundo)}
.av.c2{color:var(--c2-on);background:var(--c2-fundo)}
.faixa-conta{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:12px;background:var(--c2-bg);color:var(--c2-t);font-size:13px;font-weight:600}
.c2-estado{display:flex;flex-direction:column;gap:10px}
.c2-estado .acoes{display:flex;gap:8px;flex-wrap:wrap}
.esq{height:56px;border-radius:14px;background:var(--card)}
.esq.alto{height:118px;border-radius:18px;background:var(--heroi);opacity:.35}
/* v5.3: as cores da conta 2 vêm do tema (--c2, --c2-fundo, --c2-t, --c2-bg, --c2-heroi...). */
body.c2ativa{--acc:var(--c2);--acc-fundo:var(--c2-fundo);--acc-press:var(--c2-press);--on-acc:var(--c2-on);--acc-t:var(--c2-t);--rap:var(--c2-t);--heroi:var(--c2-heroi);--heroi-borda:var(--c2-heroi-borda);--dou-bg:var(--c2-bg)}
.folha .op{display:block;width:100%;padding:16px;text-align:center;font:inherit;font-size:17px;font-weight:500;color:var(--acc-t);background:none;border:0;border-bottom:1px solid var(--borda)}
.folha .op.perigo{color:var(--neg)}
.folha .op:disabled{color:var(--sub)}
.folha .op small{font-size:13px;font-weight:500}
.c2-form{display:flex;flex-direction:column;gap:12px;padding:18px 16px 16px;top:max(12px,env(safe-area-inset-top));bottom:auto}
.c2-form h3{margin:0;font-size:19px;font-weight:700}
.c2-form label{font-size:14px;color:var(--sub)}
.c2-form input{width:100%;font:inherit;padding:12px 14px;border:1px solid var(--borda);border-radius:12px;background:var(--bg);color:var(--fg);-webkit-appearance:none}
.c2-form .acoes{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.c2-form .erro{margin:0;padding:0;border:0;text-align:left;color:var(--neg);font-size:14px}
.c2-form .acoes .btn{display:block;width:100%;padding:12px 8px;border:0;border-radius:12px;background:var(--acc-fundo);color:var(--on-acc);font-size:16px;font-weight:600;text-align:center}
.c2-form .acoes .btn.sec{background:var(--card2);color:var(--acc-t)}
.c2-form .acoes .btn:disabled{opacity:.45}
#diag-conta2{white-space:pre-wrap;overflow-wrap:anywhere}
`;

// Bloco do Inventário de uma conta (faixa de totais, busca, chips e lista).
// v5.2: o mesmo bloco serve para a conta 2, montado no Scriptable e enviado
// pela ponte. Sem ids: o script da página liga cada bloco pelas classes.
// r = { itens, totais, riscos, comparacoes: { dia }, miniaturas, avisos, agora }.
function inventario(r, cfg) {
  const t = r.totais;
  // v5.1: o Inventário compara sempre com 24h atrás (sem seletor de período).
  const d = r.comparacoes.dia;
  const per = periodoReal(d.base, r.agora);

  // Avisos gerais (cache, fonte que não respondeu...): "!" discreto na faixa; o toque mostra o texto.
  const temAvisos = r.avisos.length > 0;
  const avisos = r.avisos.map((x) => '<p>' + esc(x) + '</p>').join('');
  const emHold = r.itens.filter((i) => i.hold).length;
  const pe = t.qtd + (t.qtd === 1 ? ' item' : ' itens') + (emHold ? ' · ' + emHold + ' em hold' : '');

  const lim = cfg.LIMITE_MUDANCA_PCT;
  const alertas = alertasPorUaid(r.riscos, per);
  const comAlerta = Object.keys(alertas).length;
  const linhas = r.itens
    .map((i) => linhaItem(i, r.miniaturas[String(i.assetId)], alertas[i.uaid], variacaoItem(i, d.base), lim))
    .join('');

  const html = `<div class="faixa">
  <div class="f-tot">
    <div class="f-col"><span class="f-rot">Value</span><span class="f-num">${a.fmtNum(t.value)}</span>${varTotal(d.var && d.var.value, per)}</div>
    <div class="f-col"><span class="f-rot">RAP</span><span class="f-num">${a.fmtNum(t.rap)}</span>${varTotal(d.var && d.var.rap, per)}</div>
  </div>
  <div class="f-pe">
    <span class="f-info">${per ? 'Variação ' + esc(per.curto) : 'Histórico de 24h em formação'}</span>
    <span class="f-dir"><span class="f-info">${pe}</span>${temAvisos ? '<button class="f-alerta" aria-expanded="false" aria-label="Ver avisos">!</button>' : ''}</span>
  </div>
  ${temAvisos ? '<div class="f-aviso oculto">' + avisos + '</div>' : ''}
</div>

<div class="ferramentas">
  <input class="inv-busca" type="search" placeholder="Buscar item" autocomplete="off" aria-label="Buscar item">
  <div class="chips inv-ordem">
    <button class="chip on" data-campo="value">Value</button>
    <button class="chip" data-campo="rap">RAP</button>
    <button class="chip" data-campo="dem">Demanda</button>
    <button class="chip" data-campo="tend">Tendência</button>
    <button class="chip" data-campo="nome">Nome</button>
    ${comAlerta ? '<button class="chip filtro inv-so-alerta">Com alerta · ' + comAlerta + '</button>' : ''}
  </div>
</div>

<div class="grupo">
  <div class="inv-lista">${linhas}</div>
  <p class="vazio oculto inv-vazio">${r.itens.length ? 'Nada encontrado.' : 'Nenhum item.'}</p>
  <div class="total"><span>Total</span><div class="item-num"><span class="v">${a.fmtNum(t.value)}</span><span class="r"><small>RAP</small>${a.fmtNum(t.rap)}</span></div></div>
</div>`;
  return { html, menu: dadosDoMenu(alertas, d), titulo: per ? per.longo : 'Mudanças' };
}

// Linha embaixo do título. v5.2.1: com conta 2, um chip pequeno com a conta
// ATUAL e ⇄ (um toque troca) + a hora; sem conta 2, só "Atualizado HH:MM".
// A conta 2 é adicionada pelo menu ⋯.
function linhaMeta(principal, c2, hora) {
  const ini = esc(String(principal || '?').charAt(0).toUpperCase());
  return (
    '<p class="meta">' +
    '<button type="button" class="chip-conta' + (c2 ? '' : ' oculto') + '" id="conta-chip" aria-label="Trocar de conta">' +
    '<span class="av" id="chip-ini">' + ini + '</span><span class="n" id="chip-nome">' + esc(principal) + '</span><span class="tr">⇄</span></button>' +
    '<span id="meta-hora" data-hora="' + esc(hora) + '">' + (c2 ? '· ' : 'Atualizado ') + esc(hora) + '</span></p>'
  );
}

// v5.3: { id: { e: 'light'|'dark', f: fonte? } } para o script do <head>.
function mapaTemas() {
  const m = {};
  for (const t of TEMAS) m[t.id] = t.f ? { e: t.e, f: t.f } : { e: t.e };
  return m;
}

// v5.3: folha do menu ⋯ > Temas, com uma miniatura de cada tema.
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
    grupo('c', 'Clássicos') + grupo('e', 'Estéticos') +
    '<button type="button" class="op cancelar" id="t-pronto">Pronto</button>' +
    '</div>'
  );
}

function gerar(r, cfg) {
  const hora = quando(r.agora, r.agora);
  const av = r.avaliador || { erro: 'dados não preparados' };
  const inv = inventario(r, cfg);
  const menu = inv.menu;
  const tituloMud = inv.titulo;

  return `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Inventário</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<script>
// v5.3: aplica o tema salvo antes do primeiro desenho (sem piscar o tema errado).
var TH_TEMAS = ${avaliador.serializar(mapaTemas())};
function thTema(id, salvar) {
  var t = TH_TEMAS[id];
  if (!t) return;
  document.documentElement.setAttribute('data-tema', id);
  var m = document.querySelector('meta[name="color-scheme"]');
  if (m) m.setAttribute('content', t.e);
  if (t.f && !document.getElementById('fonte-' + id)) {
    var l = document.createElement('link');
    l.id = 'fonte-' + id;
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + t.f + '&display=swap';
    document.head.appendChild(l);
  }
  if (salvar) { try { localStorage.setItem('tema', id); } catch (e) {} }
}
try { var temaSalvo = localStorage.getItem('tema'); if (temaSalvo) thTema(temaSalvo); } catch (e) {}
</script>
<style>
${CSS_BASE}
${avaliador.css()}
${anuncios.css()}
</style></head><body>
<div class="ceu" aria-hidden="true"><i></i><b></b></div>
<div class="app">

<div class="cab">
  <div><h1 id="titulo">Inventário</h1>${linhaMeta(r.usuario.nome, r.conta2, hora)}</div>
  <button type="button" class="mais" id="mais" aria-label="Mais opções">⋯</button>
</div>

<nav class="seg abas" id="abas">
  <button data-aba="inv" class="on">Inventário</button>
  <button data-aba="avaliar">Avaliar trade</button>
  <button data-aba="anuncios">Anúncios</button>
</nav>

<div class="faixa-conta oculto" id="faixa-conta"><span class="av c2" id="fc-ini"></span><span id="fc-txt"></span><button type="button" class="voltar" id="fc-voltar">Voltar</button></div>
<div class="c2-estado oculto" id="c2-estado"></div>

<div id="aba-inv" class="aba">
<div class="inv aba" id="inv-1">
${inv.html}
</div>
<div class="inv aba oculto" id="inv-2"></div>
</div>

${avaliador.secao(cfg, av.base, av.erro)}
${anuncios.secao(cfg, av.erro ? 'os dados do avaliador não foram preparados (' + av.erro + ')' : null)}

<details class="diag">
  <summary>Diagnóstico</summary>
  <p id="diag-ponte"></p>
  <p id="diag-anuncios"></p>
  <p id="diag-conta2">Conta 2: ${r.conta2 ? 'salva, ainda não aberta nesta abertura' : 'nenhuma'}</p>
  <textarea readonly>${esc(JSON.stringify(r.diag, null, 2))}</textarea>
</details>

<footer>v${esc(r.versao)} · ${esc(String(r.sha || '').slice(0, 7))} · dados: Rolimon's e Roblox · somente leitura</footer>
</div>

<div id="fundo" class="fundo oculto"></div>
<div id="folha" class="folha oculto">
  <p id="folha-nome"></p>
  <div id="folha-alertas" class="folha-bloco oculto"></div>
  <div id="folha-mud" class="folha-bloco oculto"></div>
  <a id="link-rol" href="#">Ver no Rolimon's</a>
  <a id="link-rbx" href="#">Ver no Roblox</a>
  <button id="cancelar" class="cancelar">Cancelar</button>
</div>
<div id="m-fundo" class="fundo oculto"></div>
<div id="m-folha" class="folha oculto">
  <p>Opções</p>
  <button type="button" class="op" id="m-trocar">Adicionar conta 2</button>
  <button type="button" class="op perigo oculto" id="m-remover">Remover conta 2</button>
  <button type="button" class="op" id="m-temas">Temas</button>
  <button type="button" class="op" disabled>Ajuda <small>(em breve)</small></button>
  <button type="button" class="op cancelar" id="m-cancelar">Cancelar</button>
</div>
${folhaTemas()}
<div id="f-fundo" class="fundo oculto"></div>
<form id="f-folha" class="folha c2-form oculto" autocomplete="off">
  <h3>Conta 2</h3>
  <label for="c2-campo">Username do Roblox da outra conta. Fica salvo só neste iPhone.</label>
  <input id="c2-campo" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="20" placeholder="username">
  <p class="erro oculto" id="c2-erro"></p>
  <div class="acoes"><button type="button" class="btn sec" id="c2-cancelar">Cancelar</button><button type="submit" class="btn" id="c2-salvar">Salvar</button></div>
</form>
${av.erro ? '' : avaliador.folhas() + anuncios.folha()}

<script>
(function(){
  var PONTE = ${avaliador.serializar(avaliador.PONTE)};
  var ROTULOS = { value: 'Value', rap: 'RAP', dem: 'Demanda', tend: 'Tendência', nome: 'Nome' };
  function $(id){ return document.getElementById(id); }
  function textoSeguro(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // ---------- Conta (v5.2) ----------
  // conta 1 = a principal (montada com o painel); conta 2 = buscada pela ponte
  // só no primeiro toque no nome dela.
  var conta = 1;
  var c2 = { nome: ${avaliador.serializar(r.conta2 ? r.conta2.nome : null)}, carregada: false, carregando: false, erro: null, anuncios: null, timer: null };
  var abaAtual = 'inv';

  // Abas (Inventário / Avaliar trade / Anúncios). Na conta 2 o Avaliar some.
  var TITULOS = { inv: 'Inventário', avaliar: 'Avaliar trade', anuncios: 'Anúncios' };
  function aba(x){
    if (!TITULOS[x] || (conta === 2 && x === 'avaliar')) x = 'inv';
    abaAtual = x;
    // Na conta 2, enquanto os itens dela não chegam, o lugar da aba mostra o estado.
    var esperando = conta === 2 && !c2.carregada;
    for (var nome in TITULOS) {
      var el = $('aba-' + nome);
      if (el) el.classList.toggle('oculto', nome !== x || esperando);
    }
    $('c2-estado').classList.toggle('oculto', !esperando);
    $('titulo').textContent = TITULOS[x];
    var bs = document.querySelectorAll('#abas button');
    for (var k = 0; k < bs.length; k++) {
      var b = bs[k].getAttribute('data-aba');
      bs[k].classList.toggle('on', b === x);
      bs[k].classList.toggle('oculto', conta === 2 && b === 'avaliar');
    }
    try { localStorage.setItem('aba', x); } catch (e) {}
    // A aba Anúncios só busca os anúncios quando é aberta.
    if (x === 'anuncios' && !esperando && window.thAbrirAnuncios) window.thAbrirAnuncios();
  }
  var botoesAba = document.querySelectorAll('#abas button');
  for (var k = 0; k < botoesAba.length; k++) {
    botoesAba[k].addEventListener('click', function(){ aba(this.getAttribute('data-aba')); window.scrollTo(0, 0); });
  }
  try { var abaSalva = localStorage.getItem('aba'); if (abaSalva && abaSalva !== 'inv' && TITULOS[abaSalva]) aba(abaSalva); } catch (e) {}

  // Blocos recolhíveis (Avaliar trade e Anúncios): lembram se você os abriu ou fechou.
  // (No Inventário, alertas e mudanças ficam na linha de cada item.)
  var recolhiveis = document.querySelectorAll('details.bloco[data-chave]');
  for (var k = 0; k < recolhiveis.length; k++) {
    (function(b){
      var chave = 'aberto:' + b.getAttribute('data-chave');
      try {
        var s = localStorage.getItem(chave);
        if (s === '1') b.open = true;
        else if (s === '0') b.open = false;
      } catch (e) {}
      b.addEventListener('toggle', function(){
        try { localStorage.setItem(chave, b.open ? '1' : '0'); } catch (e) {}
      });
    })(recolhiveis[k]);
  }

  // Menu ao tocar no item (folha única, usada pelas duas contas):
  // alertas e mudanças do período em cima, links embaixo.
  var fundo = $('fundo');
  var folha = $('folha');
  function fechar(){ fundo.classList.add('oculto'); folha.classList.add('oculto'); }
  function blocoMenu(id, titulo, linhas, simbolo){
    var el = $(id);
    if (!linhas || !linhas.length) { el.classList.add('oculto'); el.innerHTML = ''; return; }
    el.innerHTML = '<h3>' + textoSeguro(titulo) + '</h3>' + linhas.map(function(x){
      return '<div class="motivo"><span class="marca ' + x[1] + '">' + simbolo(x[1]) + '</span><span class="' + x[1] + '">' + textoSeguro(x[0]) + '</span></div>';
    }).join('');
    el.classList.remove('oculto');
  }
  fundo.addEventListener('click', fechar);
  $('cancelar').addEventListener('click', fechar);
  $('link-rol').addEventListener('click', function(){ setTimeout(fechar, 300); });
  $('link-rbx').addEventListener('click', function(){ setTimeout(fechar, 300); });

  // Liga um bloco do Inventário (o seu ou o da conta 2).
  // INV = menu de cada item (por uaid): a = alertas, m = mudanças em 24h.
  function ligarInventario(raiz, INV, TITULO_MUD){
    var lista = raiz.querySelector('.inv-lista');
    var chips = raiz.querySelectorAll('.inv-ordem .chip[data-campo]');
    var busca = raiz.querySelector('.inv-busca');
    var vazio = raiz.querySelector('.inv-vazio');
    var estado = { campo: 'value', dir: 'desc' };
    var soAlerta = false;

    // Ordenação pelos chips (toque de novo inverte)
    function marcarChips(){
      for (var k = 0; k < chips.length; k++) {
        var c = chips[k].getAttribute('data-campo');
        var on = c === estado.campo;
        chips[k].classList.toggle('on', on);
        chips[k].textContent = ROTULOS[c] + (on ? (estado.dir === 'desc' ? ' ↓' : ' ↑') : '');
      }
    }
    function ordenar(campo){
      if (estado.campo === campo) estado.dir = estado.dir === 'desc' ? 'asc' : 'desc';
      else { estado.campo = campo; estado.dir = campo === 'nome' ? 'asc' : 'desc'; }
      var linhas = Array.prototype.slice.call(lista.children);
      linhas.sort(function(x, y){
        var p = x.getAttribute('data-' + campo), q = y.getAttribute('data-' + campo);
        var c = campo === 'nome' ? p.localeCompare(q) : Number(p) - Number(q);
        return estado.dir === 'asc' ? c : -c;
      });
      linhas.forEach(function(l){ lista.appendChild(l); });
      marcarChips();
      filtrar();
    }
    for (var k = 0; k < chips.length; k++) {
      chips[k].addEventListener('click', function(){ ordenar(this.getAttribute('data-campo')); });
    }
    marcarChips();

    // Busca e filtro "Com alerta" (a divisória entre linhas segue a ordem das linhas visíveis)
    function filtrar(){
      var q = busca.value.trim().toLowerCase();
      var visiveis = 0;
      for (var k = 0; k < lista.children.length; k++) {
        var l = lista.children[k];
        var mostra = l.getAttribute('data-nome').indexOf(q) >= 0 && (!soAlerta || l.getAttribute('data-alerta') === '1');
        l.style.display = mostra ? '' : 'none';
        l.style.borderTop = mostra && visiveis ? '1px solid var(--borda)' : '0';
        if (mostra) visiveis++;
      }
      vazio.classList.toggle('oculto', visiveis > 0);
    }
    busca.addEventListener('input', filtrar);
    var chipAlerta = raiz.querySelector('.inv-so-alerta');
    if (chipAlerta) chipAlerta.addEventListener('click', function(){
      soAlerta = !soAlerta;
      chipAlerta.classList.toggle('on', soAlerta);
      filtrar();
    });
    filtrar();

    // Avisos gerais: o "!" da faixa mostra ou esconde o texto.
    var botaoAviso = raiz.querySelector('.f-alerta');
    if (botaoAviso) botaoAviso.addEventListener('click', function(){
      var txt = raiz.querySelector('.f-aviso');
      var abre = txt.classList.contains('oculto');
      txt.classList.toggle('oculto', !abre);
      botaoAviso.setAttribute('aria-expanded', abre ? 'true' : 'false');
    });

    lista.addEventListener('click', function(ev){
      var it = ev.target.closest('.item');
      if (!it) return;
      var id = it.getAttribute('data-asset');
      var info = INV[it.getAttribute('data-uaid')] || { a: [], m: [] };
      blocoMenu('folha-alertas', 'Alertas', info.a, function(){ return '!'; });
      blocoMenu('folha-mud', TITULO_MUD, info.m, function(c){
        return c === 'pos' ? '▲' : c === 'neg' ? '▼' : '•';
      });
      $('folha-nome').textContent = it.getAttribute('data-titulo');
      $('link-rol').href = 'https://www.rolimons.com/item/' + id;
      $('link-rbx').href = 'https://www.roblox.com/catalog/' + id;
      fundo.classList.remove('oculto');
      folha.classList.remove('oculto');
    });
  }
  ligarInventario($('inv-1'), ${avaliador.serializar(menu)}, ${avaliador.serializar(tituloMud)});

  // ---------- Alternador de conta (v5.2) ----------
  function inicial(s){ return String(s || '?').charAt(0).toUpperCase(); }
  var PRINCIPAL = ${avaliador.serializar(r.usuario.nome)};
  // Chip sob o título: mostra a conta ATUAL; some se não houver conta 2.
  function mostrarBotoesConta(){
    var nomeAtual = conta === 2 ? c2.nome : PRINCIPAL;
    $('conta-chip').classList.toggle('oculto', !c2.nome);
    $('chip-nome').textContent = nomeAtual || '';
    $('chip-ini').textContent = inicial(nomeAtual);
    $('chip-ini').classList.toggle('c2', conta === 2);
    $('meta-hora').textContent = (c2.nome ? '· ' : 'Atualizado ') + $('meta-hora').getAttribute('data-hora');
    $('m-trocar').textContent = c2.nome ? 'Trocar conta 2 (' + c2.nome + ')' : 'Adicionar conta 2';
    $('m-remover').classList.toggle('oculto', !c2.nome);
  }
  // Estado da conta 2 enquanto os itens dela não chegam (buscando ou erro).
  function desenharEstadoC2(){
    var el = $('c2-estado');
    if (c2.carregando) {
      el.innerHTML = '<p class="meta">Buscando os itens de ' + textoSeguro(c2.nome) + '...</p><div class="esq alto"></div><div class="esq"></div><div class="esq"></div>';
    } else if (c2.erro) {
      el.innerHTML = '<p class="aviso">Não consegui buscar os itens de ' + textoSeguro(c2.nome) + ' (' + textoSeguro(c2.erro) + ').</p>' +
        '<div class="acoes"><button type="button" class="btn" id="c2-tentar">Tentar de novo</button><button type="button" class="btn sec" id="c2-trocar2">Trocar conta 2</button></div>';
      $('c2-tentar').addEventListener('click', function(){ pedirConta2('conta2/carregar'); });
      $('c2-trocar2').addEventListener('click', function(){ abrirForm(); });
    } else {
      el.innerHTML = '';
    }
  }
  function mostrarConta(k){
    if (k === 2 && !c2.nome) k = 1;
    conta = k;
    document.body.classList.toggle('c2ativa', k === 2);
    $('inv-1').classList.toggle('oculto', k !== 1);
    $('inv-2').classList.toggle('oculto', k !== 2);
    $('faixa-conta').classList.toggle('oculto', k !== 2);
    $('fc-ini').textContent = inicial(c2.nome);
    $('fc-txt').textContent = 'Vendo a conta de ' + (c2.nome || '');
    mostrarBotoesConta();
    desenharEstadoC2();
    // A aba Anúncios passa a cruzar os anúncios com os itens da conta escolhida.
    if (window.thAnunciosConta) {
      try { window.thAnunciosConta(k === 2 && c2.carregada ? c2.anuncios : null); } catch (e) {}
    }
    aba(abaAtual);
    if (k === 2 && !c2.carregada && !c2.carregando && !c2.erro) pedirConta2('conta2/carregar');
  }
  // Pede à ponte (o Scriptable intercepta o endereço; nada sai do iPhone).
  function pedirConta2(caminho){
    c2.carregando = true;
    c2.erro = null;
    desenharEstadoC2();
    var f = document.createElement('iframe');
    f.style.display = 'none';
    f.src = PONTE + caminho + (caminho.indexOf('?') < 0 ? '?' : '&') + 't=' + Date.now();
    document.body.appendChild(f);
    setTimeout(function(){ if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    clearTimeout(c2.timer);
    c2.timer = setTimeout(function(){
      if (!c2.carregando) return;
      c2.carregando = false;
      c2.erro = 'sem resposta do Scriptable';
      desenharEstadoC2();
    }, 120000);
  }
  window.receberConta2 = function(res){
    clearTimeout(c2.timer);
    c2.carregando = false;
    res = res || { erro: 'resposta vazia' };
    var diag = $('diag-conta2');
    if (diag) diag.textContent = 'Conta 2: ' + (res.diag || res.erro || (res.removida ? 'removida' : ''));
    if (res.removida) {
      c2 = { nome: null, carregada: false, carregando: false, erro: null, anuncios: null, timer: null };
      $('inv-2').innerHTML = '';
      mostrarConta(1);
      return;
    }
    if (res.erro) {
      if (res.acao === 'salvar') {
        // Username novo recusado: a conta 2 anterior (se houver) continua.
        c2.nome = res.nome || null;
        c2.erro = null;
        mostrarConta(c2.nome ? conta : 1);
        abrirForm(res.erro, res.tentado);
        return;
      }
      c2.erro = res.erro;
      desenharEstadoC2();
      aba(abaAtual);
      return;
    }
    c2.nome = res.nome;
    c2.carregada = true;
    c2.erro = null;
    c2.anuncios = { inventario: res.inventario, meuId: res.id, chave: '-c2', nome: res.nome };
    // Miniaturas dos itens dela entram no mesmo objeto usado pela aba Anúncios.
    if (typeof TH_D !== 'undefined' && TH_D.miniaturas) {
      for (var id in res.miniaturas || {}) if (!TH_D.miniaturas[id]) TH_D.miniaturas[id] = res.miniaturas[id];
    }
    var raiz = $('inv-2');
    raiz.innerHTML = res.html;
    ligarInventario(raiz, res.menu || {}, res.titulo || 'Mudanças');
    if (conta === 2) mostrarConta(2);
    else mostrarBotoesConta();
  };

  // Toque no chip: troca para a outra conta. "Voltar" na faixa vinho: volta para a sua.
  $('conta-chip').addEventListener('click', function(){
    mostrarConta(conta === 1 ? 2 : 1);
    window.scrollTo(0, 0);
  });
  $('fc-voltar').addEventListener('click', function(){
    mostrarConta(1);
    window.scrollTo(0, 0);
  });

  // ---------- Menu ⋯ e formulário da conta 2 ----------
  var removerArmado = null;
  function abrirMenu(){
    mostrarBotoesConta();
    $('m-fundo').classList.remove('oculto');
    $('m-folha').classList.remove('oculto');
  }
  function fecharMenu(){
    $('m-fundo').classList.add('oculto');
    $('m-folha').classList.add('oculto');
    clearTimeout(removerArmado);
    removerArmado = null;
    $('m-remover').textContent = 'Remover conta 2';
  }
  function abrirForm(erro, tentado){
    fecharMenu();
    $('c2-campo').value = tentado || c2.nome || '';
    $('c2-erro').textContent = erro || '';
    $('c2-erro').classList.toggle('oculto', !erro);
    $('f-fundo').classList.remove('oculto');
    $('f-folha').classList.remove('oculto');
  }
  function fecharForm(){
    $('f-fundo').classList.add('oculto');
    $('f-folha').classList.add('oculto');
    try { $('c2-campo').blur(); } catch (e) {}
  }
  $('mais').addEventListener('click', abrirMenu);
  $('m-fundo').addEventListener('click', fecharMenu);
  $('m-cancelar').addEventListener('click', fecharMenu);
  $('m-trocar').addEventListener('click', function(){ abrirForm(); });
  // Remover pede um segundo toque (sem confirm(), que pode não existir no Scriptable).
  $('m-remover').addEventListener('click', function(){
    var b = this;
    if (!removerArmado) {
      b.textContent = 'Toque de novo para remover';
      removerArmado = setTimeout(function(){ removerArmado = null; b.textContent = 'Remover conta 2'; }, 3000);
      return;
    }
    fecharMenu();
    mostrarConta(1);
    pedirConta2('conta2/remover');
  });
  // ---------- Temas (v5.3) ----------
  // O toque aplica na hora e salva no iPhone; a folha fica aberta para testar outros.
  function temaAtual(){
    var t = document.documentElement.getAttribute('data-tema');
    if (t) return t;
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'azul'; } catch (e) { return 'azul'; }
  }
  function marcarTemas(){
    var at = temaAtual();
    var ops = document.querySelectorAll('#t-folha .t-op');
    for (var k = 0; k < ops.length; k++) ops[k].classList.toggle('on', ops[k].getAttribute('data-t') === at);
  }
  function fecharTemas(){
    $('t-fundo').classList.add('oculto');
    $('t-folha').classList.add('oculto');
  }
  $('m-temas').addEventListener('click', function(){
    fecharMenu();
    marcarTemas();
    $('t-fundo').classList.remove('oculto');
    $('t-folha').classList.remove('oculto');
  });
  $('t-fundo').addEventListener('click', fecharTemas);
  $('t-pronto').addEventListener('click', fecharTemas);
  $('t-folha').addEventListener('click', function(ev){
    var b = ev.target.closest('.t-op');
    if (!b) return;
    thTema(b.getAttribute('data-t'), true);
    marcarTemas();
  });

  $('f-fundo').addEventListener('click', fecharForm);
  $('c2-cancelar').addEventListener('click', fecharForm);
  $('f-folha').addEventListener('submit', function(ev){
    ev.preventDefault();
    var u = $('c2-campo').value.trim();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(u)) {
      $('c2-erro').textContent = 'O username do Roblox tem de 3 a 20 letras, números ou _.';
      $('c2-erro').classList.remove('oculto');
      return;
    }
    fecharForm();
    // Mostra a conta nova já buscando; a resposta da ponte confirma (ou recusa).
    c2.nome = u;
    c2.carregada = false;
    c2.anuncios = null;
    $('inv-2').innerHTML = '';
    // Primeiro marca "buscando" (para mostrarConta não pedir de novo), depois troca a tela.
    pedirConta2('conta2/salvar?u=' + encodeURIComponent(u));
    mostrarConta(2);
  });
})();
</script>
${av.erro ? '' : avaliador.script(av.json, cfg) + anuncios.script(cfg, r.usuario.id)}
</body></html>`;
}

module.exports = { gerar, inventario };
