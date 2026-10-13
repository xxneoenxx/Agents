import data from './timings.json';

// Zeiten je Szene (60 fps), erzeugt von tools/timings.py: aus dem Sprechtempo oder,
// sobald es sie gibt, aus den Sprachaufnahmen. Szenen hängen ihre Bild-Beats an
// die Wortzeiten, damit Bild, Untertitel und Stimme zusammenpassen.
export type SceneTiming = {frames: number; start: number; speech: number; words: number[]; voice: string | null};
const T = data as Record<string, SceneTiming>;

export const timing = (id: string) => {
  const t = T[id];
  if (!t) throw new Error(`Keine Zeiten für ${id}`);
  /** Frame, an dem Wort i (0-basiert) beginnt. */
  const w = (i: number) => t.words[Math.max(0, Math.min(t.words.length - 1, i))];
  /** Frame, an dem die Stimme endet. */
  const speechEnd = t.start + t.speech;
  return {...t, w, speechEnd};
};
