'use strict';
/* Step 10, Sound: original music and sound effects are synthesized here (no samples, no licences),
   mixed under the voice with ducking, then loudness-normalised for social platforms. */
const fs = require('fs');
const path = require('path');
const U = require('./util');

const SR = 48000;
const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function rng(seed) { let a = 0; for (const ch of String(seed)) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) >>> 0); return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* RBJ biquad */
function biquad(type, f, q) {
  const w = (TAU * f) / SR, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
function onePoleLP(f) { const a = Math.exp((-TAU * f) / SR); let y = 0; return (x) => (y = (1 - a) * x + a * y); }

/* Small stereo reverb (Freeverb-like). */
function reverb(inp, mix = 0.25, size = 0.8) {
  const n = inp.length, L = new Float32Array(n), R = new Float32Array(n);
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round(d * (SR / 44100)));
  const make = (delays) => delays.map((d) => ({ buf: new Float32Array(d), i: 0, f: 0 }));
  const cl = make(combs), cr = make(combs.map((d) => d + 23));
  const ap = [556, 441].map((d) => ({ buf: new Float32Array(Math.round(d * (SR / 44100))), i: 0 }));
  const apR = [579, 464].map((d) => ({ buf: new Float32Array(Math.round(d * (SR / 44100))), i: 0 }));
  const fb = 0.7 + 0.26 * size, damp = 0.3;
  const run = (cs, aps, x) => {
    let o = 0;
    for (const c of cs) { const y = c.buf[c.i]; c.f = y * (1 - damp) + c.f * damp; c.buf[c.i] = x + c.f * fb; c.i = (c.i + 1) % c.buf.length; o += y; }
    for (const a of aps) { const b = a.buf[a.i]; const y = -o + b; a.buf[a.i] = o + b * 0.5; a.i = (a.i + 1) % a.buf.length; o = y; }
    return o;
  };
  for (let i = 0; i < n; i++) { const x = inp[i] * 0.015; L[i] = inp[i] * (1 - mix) + run(cl, ap, x) * mix; R[i] = inp[i] * (1 - mix) + run(cr, apR, x) * mix; }
  return [L, R];
}

/* ---------- instruments ---------- */
function addTone(buf, t0, dur, freq, amp, o = {}) {
  const s0 = Math.max(0, Math.round(t0 * SR)), len = Math.round((dur + (o.release || 0.05)) * SR);
  const att = Math.max(1, Math.round((o.attack || 0.005) * SR)), rel = Math.round((o.release || 0.05) * SR), sus = len - rel;
  const wave = o.wave || 'sine', decay = o.decay || 0, harm = o.harmonics || null, vib = o.vibrato || 0;
  let ph = 0;
  for (let i = 0; i < len && s0 + i < buf.length; i++) {
    const t = i / SR;
    let env = i < att ? i / att : i < sus ? 1 : Math.max(0, 1 - (i - sus) / rel);
    if (decay) env *= Math.exp(-t / decay);
    const f = freq * (1 + vib * Math.sin(TAU * 5 * t));
    ph += f / SR;
    let v;
    if (harm) { v = 0; for (let h = 0; h < harm.length; h++) v += harm[h] * Math.sin(TAU * ph * (h + 1)); }
    else if (wave === 'tri') { const x = ph % 1; v = 4 * Math.abs(x - 0.5) - 1; }
    else if (wave === 'square') { v = ph % 1 < (o.duty || 0.5) ? 0.6 : -0.6; }
    else if (wave === 'saw') { v = 0; for (let h = 1; h <= 6; h++) v += Math.sin(TAU * ph * h) / h; v *= 0.55; }
    else v = Math.sin(TAU * ph);
    buf[s0 + i] += v * env * amp;
  }
}
function kick(buf, t0, amp = 0.9, o = {}) {
  const s0 = Math.round(t0 * SR), len = Math.round(0.32 * SR); let ph = 0;
  for (let i = 0; i < len && s0 + i < buf.length; i++) { const t = i / SR; const f = (o.low || 45) + ((o.high || 130) - (o.low || 45)) * Math.exp(-t / 0.045); ph += f / SR; buf[s0 + i] += Math.sin(TAU * ph) * Math.exp(-t / (o.decay || 0.13)) * amp; }
}
function noiseHit(buf, t0, dur, amp, r, filt) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR);
  for (let i = 0; i < len && s0 + i < buf.length; i++) { const t = i / SR; let v = r() * 2 - 1; if (filt) v = filt(v); buf[s0 + i] += v * Math.exp(-t / (dur / 4)) * amp; }
}
const hat = (buf, t0, amp, r) => noiseHit(buf, t0, 0.05, amp, r, biquad('hp', 7000, 0.7));
const clap = (buf, t0, amp, r) => { const f = biquad('bp', 1500, 0.8); noiseHit(buf, t0, 0.16, amp, r, f); noiseHit(buf, t0 + 0.012, 0.12, amp * 0.6, r, biquad('bp', 1200, 0.9)); };

/* ---------- music ---------- */
const MOODS = {
  calm: { bpm: 84, root: 57, prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], pad: 0.16, arp: 'tri8', bass: 'whole', drums: null },
  upbeat: { bpm: 116, root: 60, prog: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], pad: 0.08, arp: 'pluck8', bass: 'eighths', drums: 'four' },
  playful: { bpm: 120, root: 65, prog: [[0, 4, 7], [7, 11, 14], [2, 5, 9], [-2, 2, 5]], pad: 0.05, arp: 'marimba', bass: 'bounce', drums: 'light' },
  suspense: { bpm: 90, root: 50, prog: [[0, 3, 7], [-2, 2, 5], [-5, -2, 2], [-5, -1, 2]], pad: 0.12, arp: 'pulse', bass: 'drone', drums: 'heart' },
  epic: { bpm: 72, root: 48, prog: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], pad: 0.17, arp: 'strings', bass: 'whole', drums: 'taiko' },
  lofi: { bpm: 76, root: 53, prog: [[0, 4, 7, 11], [-1, 2, 5, 9], [-3, 0, 3, 7], [-5, -1, 2, 5]], pad: 0.0, arp: 'keys', bass: 'lofi', drums: 'lofi' },
  chip: { bpm: 128, root: 60, prog: [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]], pad: 0.0, arp: 'chip', bass: 'chip', drums: 'chip' },
};

function synthMusic(mood, dur, seed = 'reel') {
  const M = MOODS[mood] || MOODS.calm;
  const n = Math.ceil((dur + 1) * SR);
  const tonal = new Float32Array(n), drums = new Float32Array(n), bass = new Float32Array(n);
  const r = rng(seed + mood);
  const beat = 60 / M.bpm, bar = beat * 4;
  const bars = Math.ceil(dur / bar) + 1;
  for (let b = 0; b < bars; b++) {
    const t0 = b * bar, ch = M.prog[b % M.prog.length], root = M.root;
    const notes = ch.map((x) => root + x);
    if (M.pad > 0) for (const nn of notes) addTone(tonal, t0, bar, mtof(nn), M.pad / notes.length, { attack: 0.6, release: 0.8, harmonics: M.arp === 'strings' ? [1, 0.5, 0.33, 0.25, 0.2] : [1, 0.3, 0.1], vibrato: 0.002 });
    const arpNotes = [...notes, notes[0] + 12, notes[1] + 12];
    if (M.arp === 'tri8') for (let k = 0; k < 8; k++) addTone(tonal, t0 + k * beat / 2, beat * 0.45, mtof(arpNotes[(k * 2 + b) % arpNotes.length] + 12), 0.05, { wave: 'tri', attack: 0.01, decay: 0.35, release: 0.2 });
    if (M.arp === 'pluck8') for (let k = 0; k < 8; k++) addTone(tonal, t0 + k * beat / 2, beat * 0.4, mtof(arpNotes[(k + (k % 3)) % arpNotes.length] + 12), 0.07, { harmonics: [1, 0.6, 0.35, 0.2, 0.12], attack: 0.003, decay: 0.16, release: 0.08 });
    if (M.arp === 'marimba') for (let k = 0; k < 8; k++) { if (r() < 0.22) continue; addTone(tonal, t0 + k * beat / 2, 0.25, mtof(arpNotes[Math.floor(r() * arpNotes.length)] + 12), 0.09, { harmonics: [1, 0, 0, 0.35], attack: 0.002, decay: 0.12, release: 0.05 }); }
    if (M.arp === 'pulse') for (let k = 0; k < 8; k++) addTone(tonal, t0 + k * beat / 2, beat * 0.25, mtof(root + 12), 0.045 * (k % 2 ? 0.6 : 1), { harmonics: [1, 0.4, 0.2], attack: 0.003, decay: 0.08, release: 0.05 });
    if (M.arp === 'pulse' && b % 2 === 1) addTone(tonal, t0, bar, mtof(root + 31), 0.025, { attack: 1.2, release: 1, vibrato: 0.004 });
    if (M.arp === 'strings') for (let k = 0; k < 4; k++) addTone(tonal, t0 + k * beat, beat * 0.9, mtof(arpNotes[(k + b) % arpNotes.length] + 12), 0.035, { harmonics: [1, 0.5, 0.33, 0.25], attack: 0.12, release: 0.3, vibrato: 0.004 });
    if (M.arp === 'keys') for (let k = 0; k < 2; k++) for (const nn of notes) addTone(tonal, t0 + k * beat * 2 + (k ? beat * 0.25 : 0), beat * 1.6, mtof(nn + 12), 0.045, { harmonics: [1, 0.25, 0.05], attack: 0.01, decay: 0.9, release: 0.3, vibrato: 0.003 });
    if (M.arp === 'chip') for (let k = 0; k < 16; k++) addTone(tonal, t0 + k * beat / 4, beat * 0.22, mtof(arpNotes[k % arpNotes.length] + 12), 0.04, { wave: 'square', duty: 0.25, attack: 0.002, release: 0.02 });
    // bass
    const bn = mtof(root - 12 + ch[0]);
    if (M.bass === 'whole') addTone(bass, t0, bar * 0.95, bn, 0.16, { attack: 0.08, release: 0.3, harmonics: [1, 0.25] });
    if (M.bass === 'eighths') for (let k = 0; k < 8; k++) addTone(bass, t0 + k * beat / 2, beat * 0.4, bn, 0.14, { harmonics: [1, 0.4, 0.15], attack: 0.004, decay: 0.2, release: 0.05 });
    if (M.bass === 'bounce') [0, 1.5, 2, 3.5].forEach((p) => addTone(bass, t0 + p * beat, beat * 0.4, p === 2 ? bn * 1.5 : bn, 0.15, { harmonics: [1, 0.3], attack: 0.004, decay: 0.18, release: 0.05 }));
    if (M.bass === 'drone') addTone(bass, t0, bar, bn, 0.14, { attack: 0.5, release: 0.6, harmonics: [1, 0.5, 0.2], vibrato: 0.003 });
    if (M.bass === 'lofi') [0, 2.5].forEach((p) => addTone(bass, t0 + p * beat, beat * 1.2, bn, 0.15, { harmonics: [1, 0.2], attack: 0.01, decay: 0.6, release: 0.1 }));
    if (M.bass === 'chip') for (let k = 0; k < 8; k++) addTone(bass, t0 + k * beat / 2, beat * 0.35, k % 2 ? bn * 2 : bn, 0.12, { wave: 'tri', attack: 0.002, release: 0.02 });
    // drums
    for (let k = 0; k < 4; k++) {
      const tb = t0 + k * beat;
      if (M.drums === 'four') { kick(drums, tb, 0.55); hat(drums, tb + beat / 2, 0.11, r); if (k % 2) clap(drums, tb, 0.2, r); }
      if (M.drums === 'light') { if (k % 2 === 0) kick(drums, tb, 0.35, { decay: 0.09 }); hat(drums, tb + beat / 2, 0.07, r); if (r() < 0.5) hat(drums, tb + beat * 0.75, 0.04, r); }
      if (M.drums === 'heart' && k === 0) { kick(drums, tb, 0.5, { low: 40, high: 90, decay: 0.16 }); kick(drums, tb + 0.28, 0.35, { low: 40, high: 90, decay: 0.14 }); }
      if (M.drums === 'taiko' && (k === 0 || (k === 2 && b % 2))) { kick(drums, tb, 0.7, { low: 55, high: 160, decay: 0.3 }); noiseHit(drums, tb, 0.2, 0.08, r, biquad('lp', 900, 0.7)); }
      if (M.drums === 'lofi') { if (k === 0 || k === 2.5) kick(drums, tb, 0.4, { decay: 0.12 }); if (k === 2) kick(drums, tb + beat * 0.5, 0.3, { decay: 0.1 }); if (k % 2) clap(drums, tb + 0.02, 0.12, r); hat(drums, tb + beat * 0.55, 0.05, r); }
      if (M.drums === 'chip') { if (k % 2 === 0) kick(drums, tb, 0.4, { decay: 0.08 }); else noiseHit(drums, tb, 0.08, 0.12, r, null); hat(drums, tb + beat / 2, 0.05, r); }
    }
  }
  if (mood === 'lofi') { for (let i = 0; i < n; i++) { if (r() < 0.00012) tonal[i] += (r() - 0.5) * 0.25; tonal[i] += (r() - 0.5) * 0.004; } }
  const lp = onePoleLP(mood === 'lofi' ? 3500 : 9000);
  for (let i = 0; i < n; i++) tonal[i] = lp(tonal[i]);
  const [L, R] = reverb(tonal, mood === 'epic' || mood === 'suspense' ? 0.38 : mood === 'chip' ? 0.12 : 0.28, 0.85);
  for (let i = 0; i < n; i++) { L[i] += bass[i] + drums[i]; R[i] += bass[i] + drums[i]; }
  // fades + normalize
  const fi = Math.round(1.0 * SR), fo = Math.round(2.2 * SR), end = Math.round(dur * SR);
  let pk = 0;
  for (let i = 0; i < n; i++) {
    let g = 1; if (i < fi) g = i / fi; if (i > end - fo) g *= Math.max(0, (end - i) / fo);
    L[i] *= g; R[i] *= g; pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  }
  const k = pk > 0 ? 0.9 / pk : 1;
  for (let i = 0; i < n; i++) { L[i] *= k; R[i] *= k; }
  return [L.subarray(0, end), R.subarray(0, end)];
}

/* ---------- sound effects ---------- */
function sfxSample(name, o = {}) {
  const r = rng(name + (o.dur || ''));
  const mk = (sec) => new Float32Array(Math.round(sec * SR));
  let b;
  switch (name) {
    case 'swish': case 'whoosh': {
      const loud = name === 'whoosh'; const d = loud ? 0.55 : 0.38; b = mk(d);
      let f = biquad('bp', 600, 0.8);
      for (let i = 0; i < b.length; i++) {
        const p = i / b.length; if (i % 64 === 0) f = biquad('bp', 500 + 3500 * Math.sin(Math.PI * p), 0.9);
        b[i] = f(r() * 2 - 1) * Math.sin(Math.PI * Math.pow(p, 0.7)) * (loud ? 1.4 : 1.0);
      }
      break;
    }
    case 'pop': { b = mk(0.12); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (300 + 500 * Math.exp(-t / 0.018)) / SR; b[i] = Math.sin(TAU * ph) * Math.exp(-t / 0.035) * 0.9; } break; }
    case 'bubble': { b = mk(0.14); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (280 + 900 * (t / 0.14)) / SR; b[i] = Math.sin(TAU * ph) * Math.sin(Math.PI * t / 0.14) * 0.7; } break; }
    case 'tick': { b = mk(0.05); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(TAU * 2600 * t) * 0.7 + (r() - 0.5) * 0.5) * Math.exp(-t / 0.006); } break; }
    case 'type': { b = mk(0.03); const f = biquad('hp', 2000, 0.7); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = f(r() * 2 - 1) * Math.exp(-t / 0.004); } break; }
    case 'ding': { b = mk(1.0); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(TAU * 1568 * t) * 0.6 + Math.sin(TAU * 2352 * t) * 0.25 + Math.sin(TAU * 3136 * t) * 0.1) * Math.exp(-t / 0.28) * Math.min(1, t / 0.002); } break; }
    case 'riser': { const d = Math.max(0.5, o.dur || 1.2); b = mk(d); let ph = 0; const f = biquad('hp', 900, 0.7); for (let i = 0; i < b.length; i++) { const p = i / b.length; ph += (220 + 1100 * p * p) / SR; b[i] = (Math.sin(TAU * ph) * 0.35 + f(r() * 2 - 1) * 0.4) * p * p; } break; }
    case 'impact': case 'boom': { b = mk(0.9); let ph = 0; const lp = biquad('lp', 400, 0.7); for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (38 + 60 * Math.exp(-t / 0.06)) / SR; b[i] = Math.sin(TAU * ph) * Math.exp(-t / 0.28) + lp(r() * 2 - 1) * Math.exp(-t / 0.05) * 0.6; } break; }
    case 'chime': { b = mk(1.2); [1047, 1319, 1568].forEach((f, k) => { const s0 = Math.round(k * 0.09 * SR); for (let i = s0; i < b.length; i++) { const t = (i - s0) / SR; b[i] += Math.sin(TAU * f * t) * Math.exp(-t / 0.3) * 0.35; } }); break; }
    case 'glitch': { b = mk(0.25); for (let i = 0; i < b.length; i++) { const blk = Math.floor(i / 900); b[i] = (blk % 2 ? Math.sign(Math.sin(i * 0.3 * (1 + blk))) * 0.3 : (r() - 0.5) * 0.6); } break; }
    default: b = mk(0.01);
  }
  return b;
}

/* ---------- mix ---------- */
async function mixProject(proj, plan) {
  const S = proj.style.sound || {};
  const dur = plan.duration;
  const n = Math.ceil((dur + 0.05) * SR);
  const adir = U.ensureDir(proj.p('audio'));
  // voice
  const voice = new Float32Array(n);
  for (const ps of plan.scenes) {
    if (!ps.voice) continue;
    const x = await U.decodeAudio(proj.p(ps.voice.file), SR);
    const s0 = Math.round(ps.voice.start * SR);
    for (let i = 0; i < x.length && s0 + i < n; i++) voice[s0 + i] += x[i];
  }
  // music
  const mood = plan.music.mood || 'calm';
  let mL = new Float32Array(n), mR = new Float32Array(n);
  if (plan.music.file) {
    const x = await U.decodeAudio(path.resolve(proj.dir, plan.music.file), SR);
    for (let i = 0; i < n; i++) { const v = x.length ? x[i % x.length] : 0; mL[i] = v; mR[i] = v; }
    const fo = Math.round(2 * SR); for (let i = Math.max(0, n - fo); i < n; i++) { const g = (n - i) / fo; mL[i] *= g; mR[i] *= g; }
  } else if (mood !== 'none' && mood) {
    const [L, R] = synthMusic(mood, dur + 0.05, proj.slug);
    mL.set(L.subarray(0, n)); mR.set(R.subarray(0, n));
  }
  // ducking: follow the voice envelope
  const env = new Float32Array(n); let e = 0;
  const att = Math.exp(-1 / (0.02 * SR)), rel = Math.exp(-1 / (0.35 * SR));
  for (let i = 0; i < n; i++) { const a = Math.abs(voice[i]); e = a > e ? att * e + (1 - att) * a : rel * e + (1 - rel) * a; env[i] = e; }
  const musicVol = plan.music.volume != null ? plan.music.volume : 0.2;
  const duckDepth = S.duck != null ? S.duck : 0.72;
  // sfx
  const sfx = new Float32Array(n);
  const sfxVol = S.sfxVolume != null ? S.sfxVolume : 0.5;
  const cache = {};
  const soft = S.sfx === 'soft';
  for (const ev of plan.sfx || []) {
    const key = ev.name + (ev.dur || '');
    const smp = cache[key] || (cache[key] = sfxSample(ev.name, ev));
    const s0 = Math.round(ev.t * SR), g = ev.gain * sfxVol * (soft ? 0.7 : 1);
    for (let i = 0; i < smp.length && s0 + i < n; i++) sfx[s0 + i] += smp[i] * g;
  }
  if (soft) { const lp = onePoleLP(5000); for (let i = 0; i < n; i++) sfx[i] = lp(sfx[i]); }
  // master
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const duck = 1 - duckDepth * Math.min(1, env[i] / 0.05);
    const m = musicVol * duck;
    const l = voice[i] + mL[i] * m + sfx[i], r = voice[i] + mR[i] * m + sfx[i];
    L[i] = Math.tanh(l * 1.1) / 1.1; R[i] = Math.tanh(r * 1.1) / 1.1;
  }
  const pre = path.join(adir, 'premix.wav');
  U.writeWav(pre, [L, R], SR);
  U.writeWav(path.join(adir, 'music.wav'), [mL, mR], SR);
  // two-pass loudness normalisation to -14 LUFS, -1.5 dBTP
  const target = S.lufs || -14;
  const ln = `loudnorm=I=${target}:TP=-1.5:LRA=11`;
  const p1 = await U.run('ffmpeg', ['-hide_banner', '-nostats', '-i', pre, '-af', ln + ':print_format=json', '-f', 'null', '-']);
  const js = p1.stderr.slice(p1.stderr.lastIndexOf('{'), p1.stderr.lastIndexOf('}') + 1);
  let meas = null; try { meas = JSON.parse(js); } catch (e) { meas = null; }
  const mix = path.join(adir, 'mix.wav');
  const af = meas ? `${ln}:measured_I=${meas.input_i}:measured_TP=${meas.input_tp}:measured_LRA=${meas.input_lra}:measured_thresh=${meas.input_thresh}:offset=${meas.target_offset}:linear=true` : ln;
  await U.ffmpeg(['-i', pre, '-af', af, '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s16le', mix]);
  fs.rmSync(pre, { force: true });
  const loud = await measureLoudness(mix);
  // voice vs music balance, measured where the narrator speaks
  let vs = 0, ms = 0, cnt = 0;
  for (let i = 0; i < n; i += 4) if (env[i] > 0.02) { vs += voice[i] * voice[i]; const m = mL[i] * musicVol * (1 - duckDepth * Math.min(1, env[i] / 0.05)); ms += m * m; cnt++; }
  loud.voiceOverMusicDb = cnt && ms > 0 ? +(10 * Math.log10(vs / ms)).toFixed(1) : null;
  loud.music = plan.music.file ? path.basename(plan.music.file) : mood;
  U.writeJSON(path.join(adir, 'loudness.json'), loud);
  return { file: mix, loudness: loud };
}

async function measureLoudness(file) {
  const r = await U.run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { allowFail: true });
  const s = r.stderr.slice(r.stderr.lastIndexOf('Summary:'));
  const num = (re) => { const m = s.match(re); return m ? parseFloat(m[1]) : null; };
  return { integratedLUFS: num(/I:\s+(-?[0-9.]+) LUFS/), rangeLU: num(/LRA:\s+(-?[0-9.]+) LU/), truePeakDBFS: num(/Peak:\s+(-?[0-9.]+) dBFS/) };
}

module.exports = { mixProject, measureLoudness, synthMusic, sfxSample, MOODS };
