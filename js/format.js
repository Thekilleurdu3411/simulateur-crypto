// Mise en forme des nombres à la française.

const cache = {};
function nf(min, max) {
  const k = min + ':' + max;
  if (!cache[k]) cache[k] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: min, maximumFractionDigits: max });
  return cache[k];
}

export function eur(n) {
  if (n == null || !isFinite(n)) return '—';
  return nf(2, 2).format(n) + ' €';
}

export function eurSigne(n) {
  if (n == null || !isFinite(n)) return '—';
  return (n > 0 ? '+' : n < 0 ? '−' : '') + nf(2, 2).format(Math.abs(n)) + ' €';
}

// Prix d'une crypto : plus de décimales pour les petites valeurs.
export function prix(n) {
  if (n == null || !isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1000) return nf(2, 2).format(n);
  if (a >= 1) return nf(2, 4).format(n);
  if (a >= 0.01) return nf(4, 6).format(n);
  return nf(6, 10).format(n);
}

export function qte(n) {
  if (n == null || !isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a === 0) return '0';
  if (a >= 1000) return nf(0, 2).format(n);
  if (a >= 1) return nf(0, 4).format(n);
  return nf(0, 8).format(n);
}

export function pct(n) {
  if (n == null || !isFinite(n)) return '—';
  return (n > 0 ? '+' : n < 0 ? '−' : '') + nf(2, 2).format(Math.abs(n * 100)) + ' %';
}

export function duree(ms) {
  if (ms <= 0) return '0 s';
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60), r = s % 60;
  if (m >= 60) return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min';
  if (m > 0) return m + ' min ' + String(r).padStart(2, '0') + ' s';
  return r + ' s';
}

export function dateHeure(t) {
  return new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');
}

export function echapper(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
