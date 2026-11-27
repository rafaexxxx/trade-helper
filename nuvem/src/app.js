// /app: esqueleto do Mini App. Só confirma que abriu dentro do Telegram e que
// a trava (trava.js) aceitou o dono. O visual de verdade vem na Fase 1.
// Cores: as do tema do Telegram (variáveis --tg-theme-*), sem amarelo.

import { html } from './util.js';

const PAGINA = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Trade Helper</title>
<script src="https://telegram.org/js/telegram-web-app.js"></script>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; padding: 24px 16px;
    font: 16px/1.45 -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    background: var(--tg-theme-bg-color, #15181d);
    color: var(--tg-theme-text-color, #eef1f6);
  }
  .cartao { background: var(--tg-theme-secondary-bg-color, #22262e); border-radius: 14px; padding: 18px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { margin: 0; color: var(--tg-theme-hint-color, #a3abb9); font-size: 14px; }
  .ok { color: #2fb67c; }
  .erro { color: #e5484d; }
  dl { margin: 16px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; font-size: 15px; }
  dt { color: var(--tg-theme-hint-color, #a3abb9); }
  dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<div class="cartao">
  <h1 id="titulo">Abrindo…</h1>
  <p class="sub" id="sub">Conferindo a trava.</p>
  <dl id="det"></dl>
</div>
<script>
(function () {
  var tg = window.Telegram && window.Telegram.WebApp;
  var titulo = document.getElementById('titulo');
  var sub = document.getElementById('sub');
  var det = document.getElementById('det');

  function linha(k, v) {
    var dt = document.createElement('dt'); dt.textContent = k;
    var dd = document.createElement('dd'); dd.textContent = v;
    det.appendChild(dt); det.appendChild(dd);
  }
  function hora(ms) {
    var d = new Date(ms);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function falhou(t, s) { titulo.textContent = t; titulo.className = 'erro'; sub.textContent = s; }

  if (!tg || !tg.initData) {
    falhou('Abra pelo Telegram', 'Esta tela só funciona dentro do bot: mande /app para ele.');
    return;
  }
  tg.ready();
  tg.expand();

  fetch('/api/eu', { headers: { Authorization: 'tma ' + tg.initData } })
    .then(function (r) { return r.json().then(function (j) { return { st: r.status, j: j }; }); })
    .then(function (x) {
      if (!x.j.ok) { falhou('Trava recusou (' + x.st + ')', x.j.erro || 'sem detalhe'); return; }
      var u = x.j.usuario;
      titulo.textContent = '✓ Trava ok'; titulo.className = 'ok';
      sub.textContent = 'O Mini App abriu e a nuvem reconheceu você.';
      linha('Telegram', (u.nome || '') + (u.username ? ' · @' + u.username : ''));
      linha('Id', String(u.id));
      if (x.j.catalogo) {
        var min = Math.max(0, Math.round((x.j.agora - x.j.catalogo.em) / 60000));
        linha('Catálogo', x.j.catalogo.n.toLocaleString('pt-BR') + ' itens');
        linha('Atualizado', hora(x.j.catalogo.em) + ' (há ' + min + ' min)');
        linha('Veio de', x.j.catalogo.origem === 'rolimons' ? "Rolimon's (KV vazio)" : 'KV');
      } else {
        linha('Catálogo', 'erro: ' + (x.j.erroCatalogo || '?'));
      }
    })
    .catch(function (e) { falhou('Sem resposta da nuvem', String(e && e.message ? e.message : e)); });
})();
</script>
</body>
</html>`;

export function paginaApp() {
  return html(PAGINA);
}
