import data from './timings.json';

// Zeiten je Szene (60 fps), erzeugt von tools/timings.py aus den Sprachaufnahmen
// (bzw. dem Sprechtempo). Szenen hängen ihre Bild-Beats an Wörter, damit Bild,
// Untertitel und Stimme zusammenpassen – auch wenn sich der Text ändert.
export type SceneTiming = {frames: number; start: number; speech: number; words: number[]; voice: string | null; text: string};
const T = data as unknown as Record<string, SceneTiming>;

const clean = (w: string) => w.replace(/[.,!?:;„“"()]/g, '').toLowerCase();

export const timing = (id: string) => {
  const t = T[id];
  if (!t) throw new Error(`Keine Zeiten für ${id}`);
  const words = t.text.split(/\s+/).filter(Boolean);
  /** Frame, an dem Wort i (0-basiert) beginnt. */
  const w = (i: number) => t.words[Math.max(0, Math.min(t.words.length - 1, i))];
  /** Frame des n-ten Wortes (1-basiert), das mit `prefix` beginnt. */
  const at = (prefix: string, n = 1) => {
    const p = prefix.toLowerCase();
    let seen = 0;
    for (let i = 0; i < words.length; i++) {
      if (clean(words[i]).startsWith(p) && ++seen === n) return t.words[i];
    }
    throw new Error(`Wort „${prefix}“ (${n}.) nicht in ${id}`);
  };
  /** Frame, an dem die Stimme endet. */
  const speechEnd = t.start + t.speech;
  return {...t, w, at, speechEnd};
};
