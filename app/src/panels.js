// Panel state for Neon Boulevard: one photo per panel with its own crop (zoom + pan),
// plus the caption and the export size. The renderer in cover.js reads this state.

import { emptyPanel } from './cover.js';

export const DEFAULT_CAPTION = 'NEON BOULEVARD';
export const DEFAULT_TAGLINE = 'A NIGHT ON THE BOULEVARD';

/** A fresh editor state: three empty panels, the default caption, square export. */
export function createState() {
  return {
    size: 'square',
    selected: 0,
    panels: [emptyPanel(), emptyPanel(), emptyPanel()],
    caption: { text: DEFAULT_CAPTION, size: 0.105, color: '#ff2e88', glow: 0.8 },
    tagline: DEFAULT_TAGLINE,
  };
}

/** Loads an image from a URL or object URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

/** Reads a File into an image the canvas can draw. */
export function loadFile(file) {
  return loadImage(URL.createObjectURL(file));
}

/** Puts a photo in one panel, keeping its current crop. */
export function setPanelPhoto(state, index, photo) {
  state.panels[index].photo = photo;
}

/** Fills every panel with the same photo, each with its own crop preset. */
export function fillAllPanels(state, photo) {
  const crops = [
    { zoom: 1.0, ox: 0, oy: 0 },
    { zoom: 1.35, ox: 0.08, oy: -0.06 },
    { zoom: 1.25, ox: -0.06, oy: 0.08 },
  ];
  state.panels.forEach((panel, i) => {
    panel.photo = photo;
    panel.zoom = crops[i].zoom;
    panel.ox = crops[i].ox;
    panel.oy = crops[i].oy;
  });
}

/** Resets a panel's crop to centred and natural zoom. */
export function resetCrop(state, index) {
  state.panels[index].zoom = 1;
  state.panels[index].ox = 0;
  state.panels[index].oy = 0;
}

/** Clamps a panel's pan so the photo can never be dragged out of its frame. */
export function clampPan(panel) {
  const limit = 0.5 * (panel.zoom - 1) + 0.25;
  panel.ox = Math.max(-limit, Math.min(limit, panel.ox));
  panel.oy = Math.max(-limit, Math.min(limit, panel.oy));
}
