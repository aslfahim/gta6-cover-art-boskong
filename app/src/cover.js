// Neon Boulevard cover renderer: three diagonal-split panels (one tall hero on the
// left, two stacked action panels on the right), a pink/cyan neon grade, halftone dots
// and chrome-effect caption lettering with glow. Draws any of the three export sizes.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

// Panel outlines as fractions of the cover, so one layout fits every export size.
// The hero slants left as it falls; the two right panels split on a rising diagonal.
export const LAYOUT = [
  [[0, 0], [0.60, 0], [0.52, 1], [0, 1]],
  [[0.60, 0], [1, 0], [1, 0.50], [0.545, 0.44]],
  [[0.545, 0.44], [1, 0.50], [1, 1], [0.52, 1]],
];

const PANEL_NAMES = ['Hero', 'Top right', 'Bottom right'];

export function panelName(i) { return PANEL_NAMES[i] ?? `Panel ${i + 1}`; }

/** A fresh, empty panel state: no photo yet, centred, natural zoom. */
export function emptyPanel() { return { photo: null, zoom: 1, ox: 0, oy: 0 }; }

/** True when the point (px, py, in canvas pixels) lies inside panel i's outline. */
export function pointInPanel(i, px, py, w, h) {
  const poly = LAYOUT[i].map(([fx, fy]) => [fx * w, fy * h]);
  let inside = false;
  for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
    const [ax, ay] = poly[a];
    const [bx, by] = poly[b];
    if ((ay > py) !== (by > py) && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

/** Which panel holds the point, or -1 when the point is on a seam. */
export function panelAt(px, py, w, h) {
  for (let i = 0; i < LAYOUT.length; i++) if (pointInPanel(i, px, py, w, h)) return i;
  return -1;
}

function clipPanel(ctx, i, w, h) {
  ctx.beginPath();
  LAYOUT[i].forEach(([fx, fy], k) => (k === 0 ? ctx.moveTo(fx * w, fy * h) : ctx.lineTo(fx * w, fy * h)));
  ctx.closePath();
  ctx.clip();
}

/** Cover-fits a photo into a panel rect, then applies its zoom and pan offsets. */
function drawPanelPhoto(ctx, panel, x, y, pw, ph) {
  const img = panel.photo;
  if (!img) return;
  const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * panel.zoom;
  const dw = img.naturalWidth * base;
  const dh = img.naturalHeight * base;
  ctx.drawImage(img, x + (pw - dw) / 2 + panel.ox * pw, y + (ph - dh) / 2 + panel.oy * ph, dw, dh);
}

/** The neon grade: cyan light from the top, magenta heat from the bottom. */
function neonGrade(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w * 0.35, h);
  g.addColorStop(0, 'rgba(0, 229, 255, 0.16)');
  g.addColorStop(0.55, 'rgba(120, 40, 200, 0.05)');
  g.addColorStop(1, 'rgba(255, 0, 128, 0.30)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** A vignette that darkens the corners so the caption and panels read clearly. */
function vignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(10, 4, 24, 0)');
  g.addColorStop(1, 'rgba(10, 4, 24, 0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Halftone dots fading out of the hero panel's lower corner, a print-poster texture. */
function halftoneCorner(ctx, w, h) {
  const s = w / 1080;
  const step = 15 * s;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h * 0.62);
  ctx.lineTo(w * 0.34, h * 0.86);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.clip();
  for (let y = h * 0.60; y < h + step; y += step) {
    for (let x = -step; x < w * 0.4; x += step) {
      const depth = (y - h * 0.60) / (h * 0.40) + (x / (w * 0.4)) * 0.25;
      const r = Math.max(0.6, 3.4 * s * Math.min(1, depth));
      ctx.fillStyle = `rgba(255, 94, 168, ${0.10 + 0.28 * Math.min(1, depth)})`;
      ctx.beginPath();
      ctx.arc(x + (Math.round(y / step) % 2 ? step / 2 : 0), y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The glowing seams between panels: a dark gap edged with neon. */
function panelSeams(ctx, w, h) {
  ctx.lineJoin = 'round';
  const seams = [
    [[0.60, 0], [0.52, 1]],
    [[0.545, 0.44], [1, 0.50]],
  ];
  for (const [[ax, ay], [bx, by]] of seams) {
    ctx.beginPath();
    ctx.moveTo(ax * w, ay * h);
    ctx.lineTo(bx * w, by * h);
    ctx.strokeStyle = 'rgba(8, 2, 20, 0.9)';
    ctx.lineWidth = Math.max(4, w * 0.008);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax * w, ay * h);
    ctx.lineTo(bx * w, by * h);
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.75)';
    ctx.lineWidth = Math.max(1.5, w * 0.0016);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255, 94, 168, 0.9)';
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** Shrinks the font until the caption fits 92% of the cover width. */
function fitFont(ctx, text, size, w) {
  let s = size;
  ctx.font = `900 ${s}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  while (ctx.measureText(text).width > w * 0.92 && s > 16) {
    s -= 2;
    ctx.font = `900 ${s}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  }
  return s;
}

/** The caption: chrome gradient fill, dark outline, neon glow, tilted two degrees. */
function chromeCaption(ctx, caption, w, h) {
  const text = (caption.text || '').trim().toUpperCase();
  if (!text) return;
  const base = h * (caption.size ?? 0.105);
  const size = fitFont(ctx, text, base, w);
  const cx = w / 2;
  const cy = h - h * 0.075;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.035);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, -size * 0.55, 0, size * 0.55);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#8ef6ff');
  grad.addColorStop(0.62, '#ff5ea8');
  grad.addColorStop(1, '#ffffff');
  ctx.shadowColor = caption.color || '#ff2e88';
  ctx.shadowBlur = size * 0.45 * (caption.glow ?? 0.8);
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeStyle = 'rgba(16, 4, 32, 0.95)';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = grad;
  ctx.fillText(text, 0, 0);
  ctx.shadowBlur = 0;
  ctx.restore();
}

/** A small letterspaced tagline riding above the caption. */
function tagline(ctx, text, w, h) {
  const line = (text || '').trim().toUpperCase();
  if (!line) return;
  const size = Math.max(14, h * 0.026);
  ctx.save();
  ctx.font = `700 ${size}px "Arial Black", Arial, sans-serif`;
  try { ctx.letterSpacing = `${size * 0.42}px`; } catch { /* older canvas: no spacing */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#eafcff';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.9)';
  ctx.shadowBlur = size * 0.5;
  ctx.fillText(line, w / 2, h - h * 0.075 - size * 3.4);
  ctx.restore();
}

/** Draws the whole cover onto the canvas at its export size. */
export function drawCover(canvas, state) {
  const size = SIZES[state.size] ?? SIZES.square;
  canvas.width = size.w;
  canvas.height = size.h;
  const { width: w, height: h } = canvas;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#160a2e';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < LAYOUT.length; i++) {
    ctx.save();
    clipPanel(ctx, i, w, h);
    const panel = state.panels[i];
    if (panel.photo) {
      const xs = LAYOUT[i].map(([fx]) => fx * w);
      const ys = LAYOUT[i].map(([, fy]) => fy * h);
      drawPanelPhoto(ctx, panel, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    } else {
      const g = ctx.createLinearGradient(0, 0, w * 0.3, h);
      g.addColorStop(0, '#241145');
      g.addColorStop(1, '#3d1150');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }
  neonGrade(ctx, w, h);
  halftoneCorner(ctx, w, h);
  vignette(ctx, w, h);
  panelSeams(ctx, w, h);
  tagline(ctx, state.tagline, w, h);
  chromeCaption(ctx, state.caption, w, h);
}
