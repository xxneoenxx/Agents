// Kleine selbst erzeugte Geräusche (WebAudio), keine Audiodateien nötig.

let ctx = null;
let enabled = true;

export function setSoundEnabled(on) {
  enabled = on;
}

function audio() {
  if (!enabled) return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      enabled = false;
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBurst(duration, freq, gain = 0.25, q = 1) {
  const a = audio();
  if (!a) return;
  const len = Math.floor(a.sampleRate * duration);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(a.destination);
  src.start();
}

function tone(freq, duration, type = 'sine', gain = 0.15, slide = 0) {
  const a = audio();
  if (!a) return;
  const o = a.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, a.currentTime + duration);
  const g = a.createGain();
  g.gain.setValueAtTime(gain, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duration);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + duration);
}

export const sfx = {
  dig: () => noiseBurst(0.08, 600, 0.18),
  breakBlock: () => noiseBurst(0.18, 400, 0.3),
  place: () => noiseBurst(0.1, 250, 0.3),
  pop: () => tone(500 + Math.random() * 300, 0.08, 'sine', 0.12, 1.8),
  hurt: () => tone(180, 0.18, 'square', 0.12, 0.6),
  hit: () => noiseBurst(0.07, 900, 0.25),
  eat: () => {
    noiseBurst(0.06, 1500, 0.15);
    setTimeout(() => noiseBurst(0.06, 1300, 0.15), 150);
    setTimeout(() => noiseBurst(0.06, 1400, 0.15), 300);
  },
  step: () => noiseBurst(0.05, 300, 0.08),
  explode: () => noiseBurst(0.9, 120, 0.8, 0.5),
  fuse: () => noiseBurst(0.3, 3000, 0.1),
  click: () => tone(800, 0.04, 'square', 0.06),
};
