// Fixed scenes for screenshots: ?shot=editor shows the editor with a photo loaded;
// ?shot=cover shows the cover alone. `photo` picks the hero sample, `caption` the words
// and `size` the export size (square, portrait or wide). window.__shotReady is set
// once the cover has painted, so a headless screenshot can wait for it.

/** Builds the scene for one shot: fills the panels, sets the caption, then paints. */
export async function runShot(shot, query, setup) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const hero = query.get('photo') ?? 'boulevard';
  const second = query.get('photo2') ?? 'pier';
  const caption = query.get('caption') ?? 'Neon Boulevard';
  const tagline = query.get('tagline') ?? 'A night on the boulevard';
  const size = query.get('size') ?? 'square';
  await setup({ hero, second, caption, tagline, size });
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
