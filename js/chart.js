// Graphique en chandeliers sur un canvas.
const C = { hausse: '#2EBD85', baisse: '#F6465D', grille: '#1C222B', texte: '#8B95A5', dernier: '#F3B33D' };

export function dessinerBougies(canvas, bougies, formatPrix) {
  if (!canvas || !bougies || !bougies.length) return;
  const dpr = window.devicePixelRatio || 1;
  const L = canvas.clientWidth, H = canvas.clientHeight;
  if (!L || !H) return;
  canvas.width = Math.round(L * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, L, H);

  const margeD = 64, margeH = 8, margeB = 8;
  const zoneL = L - margeD, zoneH = H - margeH - margeB;
  let min = Infinity, max = -Infinity;
  for (const b of bougies) { if (b.l < min) min = b.l; if (b.h > max) max = b.h; }
  const pad = (max - min) * 0.06 || max * 0.001;
  min -= pad; max += pad;
  const y = p => margeH + (max - p) / (max - min) * zoneH;

  // Grille et graduations
  ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const p = min + (max - min) * (i / 4);
    const yy = Math.round(y(p)) + 0.5;
    ctx.strokeStyle = C.grille; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(zoneL, yy); ctx.stroke();
    ctx.fillStyle = C.texte; ctx.fillText(formatPrix(p), zoneL + 6, yy);
  }

  // Bougies
  const pasX = zoneL / bougies.length;
  const largeur = Math.max(1, Math.min(10, pasX * 0.62));
  bougies.forEach((b, i) => {
    const x = i * pasX + pasX / 2;
    const col = b.c >= b.o ? C.hausse : C.baisse;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, y(b.h)); ctx.lineTo(Math.round(x) + 0.5, y(b.l)); ctx.stroke();
    const haut = y(Math.max(b.o, b.c)), bas = y(Math.min(b.o, b.c));
    ctx.fillRect(x - largeur / 2, haut, largeur, Math.max(1, bas - haut));
  });

  // Dernier prix
  const der = bougies[bougies.length - 1].c;
  const yd = Math.round(y(der)) + 0.5;
  ctx.setLineDash([4, 4]); ctx.strokeStyle = C.dernier;
  ctx.beginPath(); ctx.moveTo(0, yd); ctx.lineTo(zoneL, yd); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = C.dernier; ctx.fillRect(zoneL + 2, yd - 9, margeD - 4, 18);
  ctx.fillStyle = '#15120A'; ctx.fillText(formatPrix(der), zoneL + 6, yd);
}
