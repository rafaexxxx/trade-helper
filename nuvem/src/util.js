// Formatação e respostas HTTP usadas por todos os módulos.

export function num(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function kb(b) {
  return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.round(b / 1024) + ' KB';
}

export function minutos(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return 'menos de 1 min';
  if (m < 120) return m + ' min';
  return Math.round(m / 60) + ' h';
}

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function texto(s, status) {
  return new Response(s, { status: status || 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
}

export function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function html(s) {
  return new Response(s, {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export function erroTexto(e) {
  return e && e.stack ? e.stack : String(e);
}
