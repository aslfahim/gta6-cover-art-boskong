// Neon Boulevard editor wiring: photo per panel (file picker or drag-drop), drag to
// pan and a slider to zoom each panel's crop, caption editing, the three export sizes
// and the live canvas preview. A `?shot=` query sets up a fixed scene instead.

import { drawCover, SIZES, panelAt, panelName } from './cover.js';
import { createState, loadFile, loadImage, setPanelPhoto, fillAllPanels, resetCrop, clampPan } from './panels.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const state = createState();

const $ = (id) => document.getElementById(id);
const captionInput = $('caption');
const taglineInput = $('tagline');
const zoomSlider = $('zoom');
const zoomValue = $('zoom-value');
const panelLabel = $('panel-label');

function redraw() {
  drawCover(canvas, state);
  syncPanelControls();
}

function say(message) { status.textContent = message; }

/** Refreshes the panel controls to describe the selected panel. */
function syncPanelControls() {
  const panel = state.panels[state.selected];
  panelLabel.textContent = `${panelName(state.selected)} panel — ${panel.photo ? 'photo loaded' : 'no photo yet'}`;
  zoomSlider.value = String(panel.zoom);
  zoomValue.textContent = `${Math.round(panel.zoom * 100)}%`;
  document.querySelectorAll('[data-panel]').forEach((row) => {
    row.classList.toggle('selected', Number(row.dataset.panel) === state.selected);
  });
}

/** Picks a panel and shows its controls. */
function selectPanel(i) {
  state.selected = i;
  syncPanelControls();
}

/** Downloads a PNG of the cover at one export size, drawn off-screen. */
function exportPng(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  drawCover(off, { ...state, size: sizeKey });
  off.toBlob((blob) => {
    if (!blob) { say('Export failed — try again.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-boulevard-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    say(`Saved neon-boulevard-${size.w}x${size.h}.png`);
  }, 'image/png');
}

/** Loads one dropped or picked file into a panel. */
async function loadIntoPanel(file, index) {
  if (!file || !file.type.startsWith('image/')) { say('That file is not an image.'); return; }
  try {
    const photo = await loadFile(file);
    setPanelPhoto(state, index, photo);
    selectPanel(index);
    redraw();
    say(`Loaded ${file.name} into the ${panelName(index).toLowerCase()} panel.`);
  } catch {
    say(`Could not read ${file.name}.`);
  }
}

// --- panel pickers, one row per panel ---
document.querySelectorAll('[data-panel]').forEach((row) => {
  const i = Number(row.dataset.panel);
  row.querySelector('.pick').addEventListener('click', () => selectPanel(i));
  row.querySelector('input[type=file]').addEventListener('change', (e) => loadIntoPanel(e.target.files[0], i));
  row.querySelector('.reset-crop').addEventListener('click', () => {
    resetCrop(state, i);
    selectPanel(i);
    redraw();
    say(`${panelName(i)} crop reset.`);
  });
});

$('fill-all').addEventListener('click', async () => {
  const file = $('fill-all-file').files[0];
  if (!file) { say('Choose a photo first, then Fill all panels.'); return; }
  try {
    fillAllPanels(state, await loadFile(file));
    redraw();
    say('One photo now fills all three panels — drag each to reframe it.');
  } catch { say(`Could not read ${file.name}.`); }
});

// --- caption controls ---
captionInput.addEventListener('input', () => { state.caption.text = captionInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });
$('caption-size').addEventListener('input', (e) => {
  state.caption.size = Number(e.target.value) / 1000;
  $('caption-size-value').textContent = `${e.target.value}%`;
  redraw();
});
document.querySelectorAll('[data-glow]').forEach((swatch) => {
  swatch.addEventListener('click', () => {
    state.caption.color = swatch.dataset.glow;
    document.querySelectorAll('[data-glow]').forEach((s) => s.classList.toggle('active', s === swatch));
    redraw();
  });
});
$('glow').addEventListener('input', (e) => {
  state.caption.glow = Number(e.target.value) / 100;
  $('glow-value').textContent = `${e.target.value}%`;
  redraw();
});

// --- export size + export buttons ---
document.querySelectorAll('[data-size]').forEach((button) => {
  button.addEventListener('click', () => {
    state.size = button.dataset.size;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === button));
    redraw();
    say(`Previewing ${SIZES[state.size].label}.`);
  });
});
document.querySelectorAll('[data-export]').forEach((button) => {
  button.addEventListener('click', () => exportPng(button.dataset.export));
});

// --- drag to pan the photo inside a panel; click a panel to select it ---
let drag = null;
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y, canvas.width, canvas.height);
  if (i < 0) return;
  selectPanel(i);
  drag = { panel: i, x: p.x, y: p.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const panel = state.panels[drag.panel];
  if (Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y) > 2) drag.moved = true;
  panel.ox += (p.x - drag.x) / canvas.width;
  panel.oy += (p.y - drag.y) / canvas.height;
  clampPan(panel);
  drag.x = p.x;
  drag.y = p.y;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// --- zoom slider for the selected panel ---
zoomSlider.addEventListener('input', () => {
  const panel = state.panels[state.selected];
  panel.zoom = Number(zoomSlider.value);
  clampPan(panel);
  zoomValue.textContent = `${Math.round(panel.zoom * 100)}%`;
  redraw();
});

// --- drag-drop photos onto the preview: one file fills the panel under it ---
canvas.addEventListener('dragover', (e) => { e.preventDefault(); canvas.classList.add('drop'); });
canvas.addEventListener('dragleave', () => canvas.classList.remove('drop'));
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  canvas.classList.remove('drop');
  const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
  if (!files.length) { say('Drop an image file to use it as a photo.'); return; }
  if (files.length === 1) {
    const p = canvasPoint(e);
    const i = panelAt(p.x, p.y, canvas.width, canvas.height);
    await loadIntoPanel(files[0], i >= 0 ? i : state.selected);
  } else {
    for (let k = 0; k < Math.min(files.length, 3); k++) await loadIntoPanel(files[k], k);
  }
});

// --- screenshot scenes ---
const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, async ({ hero, second, caption, tagline, size }) => {
    state.size = SIZES[size] ? size : 'square';
    state.caption.text = caption;
    state.tagline = tagline;
    captionInput.value = caption;
    taglineInput.value = tagline;
    const heroPhoto = await loadImage(`samples/${hero}.jpg`);
    const secondPhoto = await loadImage(`samples/${second}.jpg`);
    state.panels[0].photo = heroPhoto;
    state.panels[0].zoom = 1.05;
    state.panels[1].photo = secondPhoto;
    state.panels[1].zoom = 1.2;
    state.panels[1].ox = 0.05;
    state.panels[1].oy = 0.10;
    state.panels[2].photo = heroPhoto;
    state.panels[2].zoom = 1.45;
    state.panels[2].ox = -0.08;
    state.panels[2].oy = 0.06;
    redraw();
  });
} else {
  redraw();
}
