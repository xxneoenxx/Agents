import data from './lib/timings.json';

// Die 14 freigegebenen Szenen (flick-plan.md) bei 60 fps. Die Länge kommt aus
// lib/timings.json (Sprechtempo bzw. Sprachaufnahmen), siehe tools/timings.py.
export type SceneDef = {id: string; component: string; frames: number; transcript: string};

export const SCENES: SceneDef[] = [
  {id: '01-hook-alt-tab', component: 'S01HookAltTab', frames: 216, transcript: 'Alt-Tab. Wartet Claude? Alt-Tab. Hängt er fest?'},
  {id: '02-problem-verpasst', component: 'S02ProblemVerpasst', frames: 192, transcript: 'Ständig nachsehen. Und trotzdem die Freigabe verpassen.'},
  {id: '03-reveal-island', component: 'S03RevealIsland', frames: 168, transcript: 'Schluss damit. Das ist Claude Island.'},
  {id: '04-oben-im-vordergrund', component: 'S04ObenImVordergrund', frames: 180, transcript: 'Eine kleine Insel, oben auf deinem Bildschirm.'},
  {id: '05-ein-blick', component: 'S05EinBlick', frames: 180, transcript: 'Ein Blick genügt: Stimmung, Sitzung, Anzahl.'},
  {id: '06-mehrere-sitzungen', component: 'S06MehrereSitzungen', frames: 210, transcript: 'Mehrere Sitzungen? Sie zeigt dir immer die dringendste.'},
  {id: '07-freigabe-klappt-auf', component: 'S07FreigabeKlapptAuf', frames: 258, transcript: 'Braucht Claude eine Freigabe, klappt die Insel von selbst auf.'},
  {id: '08-freigeben', component: 'S08Freigeben', frames: 186, transcript: 'Freigeben oder ablehnen. Direkt hier, ohne Fensterwechsel.'},
  {id: '09-haengt-fest', component: 'S09HaengtFest', frames: 258, transcript: 'Hängt Claude fest? Gib einen Hinweis oder versuch es erneut.'},
  {id: '10-live-und-fertig', component: 'S10LiveUndFertig', frames: 294, transcript: 'Sieh live, woran Claude arbeitet. Fertig? Schick gleich die nächste Anweisung.'},
  {id: '11-modell-aufwand', component: 'S11ModellAufwand', frames: 210, transcript: 'Modell und Aufwand stellst du pro Sitzung um.'},
  {id: '12-mini-claude', component: 'S12MiniClaude', frames: 246, transcript: 'Und Mini-Claude fiebert mit: schläft, tippt, winkt, zittert, jubelt.'},
  {id: '13-lokal-kostenlos', component: 'S13LokalKostenlos', frames: 258, transcript: 'Kostenlos, Open Source. Die Insel läuft lokal auf deinem PC.'},
  {id: '14-cta-loop', component: 'S14CtaLoop', frames: 420, transcript: 'Claude Island für Windows. Hol sie dir jetzt auf GitHub.'},
].map((s) => ({...s, frames: (data as Record<string, {frames: number}>)[s.id]?.frames ?? s.frames}));
