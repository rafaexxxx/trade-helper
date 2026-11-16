// Página do painel (v4): visual profissional, tema claro/escuro seguindo o iPhone.
// Três abas: Inventário, Avaliar trade (módulo avaliador) e Anúncios (módulo anuncios).
// v5.1: no Inventário a lista vem logo depois de uma faixa compacta de totais;
// alertas e mudanças aparecem na linha de cada item (etiqueta e setas) e no menu do item.
// v5.2: alternador de conta no topo (a conta 2 troca Inventário e Anúncios, em vinho)
// e menu ⋯ (trocar/remover a conta 2; Temas e Ajuda entram aqui depois).
// v5.3: temas no menu ⋯ (Clássicos e Estéticos). v5.3.1: 13 temas, escolha
// gravada no arquivo de ajustes do Scriptable pela ponte (PONTE + 'tema?t=').
// v5.4: tela de Ajuda (módulo ajuda) no menu ⋯ e links "Ver na Ajuda" nas abas.
// v6.0: Lista de desejos (módulo desejos) no menu ⋯; destaque na aba Anúncios.
const a = require('analise');
const avaliador = require('avaliador');
const anuncios = require('anuncios');
const ajuda = require('ajuda');
const desejos = require('desejos');

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
  { id: 'softclub', nome: 'Gen X Soft Club', g: 'e', e: 'dark', f: 'Syncopate:wght@700' },
  { id: 'gatinhos', nome: 'Gatinhos', g: 'e', e: 'light', f: 'Fredoka:wght@600' },
  { id: 'darkaero', nome: 'Dark Aero', g: 'e', e: 'dark', f: 'Exo+2:ital,wght@1,700' },
  { id: 'chromecore', nome: 'Chromecore', g: 'e', e: 'dark', f: 'Zen+Dots' },
  { id: 'metalheart', nome: 'MetalHeart', g: 'e', e: 'dark', f: 'Grenze+Gotisch:wght@700' },
  { id: 'metro', nome: 'Frutiger Metro', g: 'e', e: 'light', f: 'Righteous' },
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
h1{margin:0;font-family:var(--f-titulo);font-style:var(--t-estilo);font-size:var(--t-tam);font-weight:var(--t-peso);line-height:1.1;letter-spacing:-.02em;text-shadow:var(--t-sombra)}
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
body.c2ativa{--acc:var(--c2);--acc-fundo:var(--c2-fundo);--acc-press:var(--c2-press);--on-acc:var(--c2-on);--acc-t:var(--c2-t);--rap:var(--c2-t);--heroi:var(--c2-heroi);--heroi-borda:var(--c2-heroi-borda);--on-heroi:var(--c2-on-heroi);--dou-bg:var(--c2-bg)}
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
</div>
${ajuda.link('aj-armadilhas', 'O que significam as etiquetas?')}`;
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
<html lang="pt-BR"${r.tema ? ' data-tema="' + esc(r.tema) + '"' : ''}><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>Inventário</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
<script>
// v5.3: aplica o tema salvo antes do primeiro desenho (sem piscar o tema errado).
// v5.3.1: o tema vem do arquivo de ajustes (TH_TEMA_ARQ); ao escolher, a página
// avisa o Scriptable pela ponte, que grava no arquivo. O localStorage fica só de reserva.
var TH_TEMAS = ${avaliador.serializar(mapaTemas())};
var TH_PONTE_TEMA = ${avaliador.serializar(avaliador.PONTE + 'tema?t=')};
var TH_TEMA_ARQ = ${avaliador.serializar(r.tema || null)};
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
  if (salvar) {
    try { localStorage.setItem('tema', id); } catch (e) {}
    try {
      var f = document.createElement('iframe');
      f.style.display = 'none';
      f.src = TH_PONTE_TEMA + encodeURIComponent(id) + '&x=' + Date.now();
      document.body.appendChild(f);
      setTimeout(function(){ if (f.parentNode) f.parentNode.removeChild(f); }, 5000);
    } catch (e) {}
  }
}
try {
  var temaSalvo = TH_TEMA_ARQ;
  if (!temaSalvo) temaSalvo = localStorage.getItem('tema');
  if (temaSalvo) thTema(temaSalvo);
} catch (e) { if (TH_TEMA_ARQ) thTema(TH_TEMA_ARQ); }
</script>
<style>
${CSS_BASE}
${avaliador.css()}
${anuncios.css()}
${ajuda.css()}
${desejos.css()}
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
  <button type="button" class="op" id="m-desejos"${av.erro ? ' disabled' : ''}>Lista de desejos <small id="m-desejos-n"></small></button>
  <button type="button" class="op" id="m-temas">Temas</button>
  <button type="button" class="op" id="m-ajuda">Ajuda</button>
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
${av.erro ? '' : avaliador.folhas() + anuncios.folha() + desejos.secao()}
${ajuda.secao(cfg)}

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
  // ---------- Ajuda (v5.4) ----------
  $('m-ajuda').addEventListener('click', function(){
    fecharMenu();
    if (window.thAbrirAjuda) window.thAbrirAjuda();
  });
  // ---------- Lista de desejos (v6.0) ----------
  $('m-desejos').addEventListener('click', function(){
    fecharMenu();
    if (window.thAbrirDesejos) window.thAbrirDesejos();
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
${av.erro ? '' : avaliador.script(av.json, cfg) + anuncios.script(cfg, r.usuario.id) + desejos.script(r.desejos, cfg)}
${ajuda.script()}
</body></html>`;
}

module.exports = { gerar, inventario, temaValido };
