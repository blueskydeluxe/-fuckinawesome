// Deliberate aliases only. Related specialties remain distinct unless explicitly grouped.
const aliases={watch:'watches',watchmaking:'watches',horology:'watches',car:'cars',automotive:'cars',automobiles:'cars',automobile:'cars','artificial intelligence':'ai'};
export function canonicalTag(tag){const clean=String(tag||'').trim().toLowerCase().replace(/\s+/g,' ');return aliases[clean]||clean}
