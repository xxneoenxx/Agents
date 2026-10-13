// Gemeinsame Werte aller Szenen: Format, Farben und Schriften aus BRAND.md.
export const W = 1080;
export const H = 1920;
export const FPS = 60;

export const C = {
  bg: '#15110E',
  text: '#F6EFE8',
  muted: '#A99C90',
  accent: '#FF9A62',
  claude: '#D97757',
  ink: '#2A1A12',
  raise: 'rgba(246, 239, 232, 0.035)',
  raise2: 'rgba(246, 239, 232, 0.06)',
  line: 'rgba(246, 239, 232, 0.08)',
  lineStrong: 'rgba(246, 239, 232, 0.14)',
  sweat: '#BFE3FF',
} as const;

export type Mood = 'idle' | 'working' | 'waiting' | 'problem' | 'done';

export const MOOD_COLOR: Record<Mood, string> = {
  waiting: '#FFC857',
  problem: '#FF7A6B',
  working: '#8FB8FF',
  done: '#7ED6A8',
  idle: '#A99C90',
};

export const MOOD_LABEL: Record<Mood, string> = {
  waiting: 'Wartet auf dich',
  problem: 'Hängt fest',
  working: 'Arbeitet',
  done: 'Fertig',
  idle: 'Ruhig',
};

export const FONT = {
  display: "'Bricolage Grotesque', 'Segoe UI', sans-serif",
  sans: "'Figtree', 'Segoe UI', sans-serif",
  mono: "'IBM Plex Mono', Consolas, monospace",
} as const;

// Sekunden → Frames bei 60 fps.
export const sec = (s: number) => Math.round(s * FPS);
