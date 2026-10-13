import data from './lib/timings.json';

// Die 14 freigegebenen Szenen (flick-plan.md) bei 60 fps. Die Länge kommt aus
// lib/timings.json (Sprachaufnahmen), der Sprechertext aus tools/script.py; siehe tools/timings.py.
export type SceneDef = {id: string; component: string; frames: number; transcript?: string};

export const SCENES: SceneDef[] = [
  {id: '01-hook-alt-tab', component: 'S01HookAltTab', frames: 216},
  {id: '02-problem-verpasst', component: 'S02ProblemVerpasst', frames: 192},
  {id: '03-reveal-island', component: 'S03RevealIsland', frames: 168},
  {id: '04-oben-im-vordergrund', component: 'S04ObenImVordergrund', frames: 180},
  {id: '05-ein-blick', component: 'S05EinBlick', frames: 180},
  {id: '06-mehrere-sitzungen', component: 'S06MehrereSitzungen', frames: 210},
  {id: '07-freigabe-klappt-auf', component: 'S07FreigabeKlapptAuf', frames: 258},
  {id: '08-freigeben', component: 'S08Freigeben', frames: 186},
  {id: '09-haengt-fest', component: 'S09HaengtFest', frames: 258},
  {id: '10-live-und-fertig', component: 'S10LiveUndFertig', frames: 294},
  {id: '11-modell-aufwand', component: 'S11ModellAufwand', frames: 210},
  {id: '12-mini-claude', component: 'S12MiniClaude', frames: 246},
  {id: '13-lokal-kostenlos', component: 'S13LokalKostenlos', frames: 258},
  {id: '14-cta-loop', component: 'S14CtaLoop', frames: 420},
].map((s) => {
  const t = (data as Record<string, {frames: number; text: string}>)[s.id];
  return {...s, frames: t?.frames ?? s.frames, transcript: t?.text};
});
