'use strict';
/* Step 7, Voice: records every line with the chosen voice service and keeps word timings.
   Providers: elevenlabs, openai, edge (free), system (say / SAPI / espeak), recording (your own file), none. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const U = require('./util');

const RATE = 48000;

function pythonBin() { return U.which('python3') ? 'python3' : U.which('python') ? 'python' : null; }
function edgeAvailable() {
  const py = pythonBin(); if (!py) return false;
  return spawnSync(py, ['-c', 'import edge_tts'], { stdio: 'ignore' }).status === 0;
}
function systemVoiceAvailable() {
  if (process.platform === 'darwin') return !!U.which('say');
  if (process.platform === 'win32') return !!U.which('powershell');
  return !!(U.which('espeak-ng') || U.which('espeak'));
}
function detectProvider() {
  if (process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY) return 'elevenlabs';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (edgeAvailable()) return 'edge';
  if (systemVoiceAvailable()) return 'system';
  return 'none';
}
function providersStatus() {
  return {
    elevenlabs: !!(process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY),
    openai: !!process.env.OPENAI_API_KEY,
    edge: edgeAvailable(),
    system: systemVoiceAvailable(),
  };
}

/* Pick the voice name for a provider from the config, then the style card. */
function pickVoice(provider, cfg, style, lang) {
  if (cfg.voice) return cfg.voice;
  const sv = (style && style.voice && style.voice.providers) || {};
  const l = String(lang || 'en').slice(0, 2).toLowerCase();
  if (provider === 'edge') {
    const m = sv.edge || {};
    if (typeof m === 'string') return m;
    if (m[l]) return m[l];
    const DEF = { en: 'en-US-AndrewMultilingualNeural', de: 'de-DE-FlorianMultilingualNeural', es: 'es-ES-AlvaroNeural', fr: 'fr-FR-RemyMultilingualNeural', it: 'it-IT-GiuseppeMultilingualNeural', pt: 'pt-BR-AntonioNeural', tr: 'tr-TR-AhmetNeural', nl: 'nl-NL-MaartenNeural', pl: 'pl-PL-MarekNeural' };
    return DEF[l] || 'en-US-AndrewMultilingualNeural';
  }
  if (provider === 'openai') return sv.openai || 'alloy';
  if (provider === 'elevenlabs') return sv.elevenlabs || 'George';
  if (provider === 'system') {
    const s = sv.system || {};
    if (process.platform === 'darwin') return l === 'en' ? s.mac || 'Samantha' : { de: 'Anna', es: 'Monica', fr: 'Thomas', it: 'Alice' }[l] || null;
    return l === 'en' ? s.espeak || 'en' : l;
  }
  return null;
}

/* ---------- providers ---------- */
let elevenVoiceCache = null;
async function elevenVoices(key) {
  if (elevenVoiceCache) return elevenVoiceCache;
  const r = await fetch('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': key } });
  if (!r.ok) throw new Error(`ElevenLabs voices: HTTP ${r.status} ${await r.text()}`);
  const j = await r.json();
  elevenVoiceCache = (j.voices || []).map((v) => ({ id: v.voice_id, name: v.name, labels: v.labels || {}, category: v.category }));
  return elevenVoiceCache;
}
async function elevenVoiceId(name, key) {
  if (/^[A-Za-z0-9]{18,}$/.test(name)) return name;
  const vs = await elevenVoices(key);
  const n = String(name).toLowerCase();
  const v = vs.find((x) => x.name.toLowerCase() === n) || vs.find((x) => x.name.toLowerCase().startsWith(n));
  if (!v) throw Object.assign(new Error(`ElevenLabs voice "${name}" not found. Available: ${vs.slice(0, 25).map((x) => x.name).join(', ')}`), { userError: true });
  return v.id;
}
async function synthElevenLabs(text, cfg, out, ctx) {
  const key = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
  if (!key) U.fail('ELEVENLABS_API_KEY is not set');
  const id = await elevenVoiceId(cfg.voice, key);
  const body = {
    text, model_id: cfg.model || 'eleven_multilingual_v2',
    voice_settings: { stability: cfg.stability != null ? cfg.stability : 0.45, similarity_boost: cfg.similarity != null ? cfg.similarity : 0.8, style: cfg.styleExaggeration != null ? cfg.styleExaggeration : 0.15, use_speaker_boost: true, speed: cfg.speed || 1.0 },
  };
  if (ctx.prev) body.previous_text = ctx.prev;
  if (ctx.next) body.next_text = ctx.next;
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}/with-timestamps?output_format=mp3_44100_128`, {
    method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`ElevenLabs TTS: HTTP ${r.status} ${(await r.text()).slice(0, 400)}`);
  const j = await r.json();
  const mp3 = out + '.mp3';
  fs.writeFileSync(mp3, Buffer.from(j.audio_base64, 'base64'));
  const al = j.alignment || j.normalized_alignment;
  let words = null;
  if (al && al.characters) {
    words = []; let cur = null;
    for (let i = 0; i < al.characters.length; i++) {
      const ch = al.characters[i];
      if (/\s/.test(ch)) { if (cur) { words.push(cur); cur = null; } continue; }
      if (!cur) cur = { w: '', s: al.character_start_times_seconds[i], e: al.character_end_times_seconds[i] };
      cur.w += ch; cur.e = al.character_end_times_seconds[i];
    }
    if (cur) words.push(cur);
  }
  return { file: mp3, words };
}
async function synthOpenAI(text, cfg, out, ctx) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) U.fail('OPENAI_API_KEY is not set');
  const body = { model: cfg.model || 'gpt-4o-mini-tts', voice: cfg.voice || 'alloy', input: text, response_format: 'wav' };
  const instr = cfg.instructions || (ctx.style && ctx.style.voice && ctx.style.voice.tone);
  if (instr && /gpt-4o/.test(body.model)) body.instructions = 'Voice: ' + instr + '. Read naturally for a short social video.';
  if (cfg.speed) body.speed = cfg.speed;
  const r = await fetch('https://api.openai.com/v1/audio/speech', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`OpenAI TTS: HTTP ${r.status} ${(await r.text()).slice(0, 400)}`);
  const wav = out + '.src.wav';
  fs.writeFileSync(wav, Buffer.from(await r.arrayBuffer()));
  return { file: wav, words: null };
}
async function synthEdge(text, cfg, out) {
  const py = pythonBin(); if (!py) U.fail('Python is needed for the free Edge voices (pip install edge-tts)');
  const mp3 = out + '.mp3', js = out + '.edge.json';
  const rate = cfg.rate || (cfg.speed ? `${Math.round((cfg.speed - 1) * 100) >= 0 ? '+' : ''}${Math.round((cfg.speed - 1) * 100)}%` : '+0%');
  await U.run(py, [path.join(U.ROOT, 'tools', 'edge_tts_words.py'), cfg.voice, rate, mp3, js], { input: text });
  const words = U.readJSON(js, { words: [] }).words;
  fs.rmSync(js, { force: true });
  return { file: mp3, words: words.length ? words : null };
}
async function synthSystem(text, cfg, out, ctx) {
  const wps = (ctx.style && ctx.style.voice && ctx.style.voice.wps) || 2.6;
  if (process.platform === 'darwin') {
    const f = out + '.aiff';
    const args = ['-o', f, '-r', String(Math.round(wps * 60 * (cfg.speed || 1)))];
    if (cfg.voice) args.unshift('-v', cfg.voice);
    await U.run('say', [...args, text]);
    return { file: f, words: null };
  }
  if (process.platform === 'win32') {
    const f = out + '.src.wav';
    const ps = "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; " +
      (cfg.voice ? "try { $s.SelectVoice($env:REEL_VOICE) } catch {}; " : '') + "$s.SetOutputToWaveFile($env:REEL_OUT); $s.Speak($env:REEL_TEXT); $s.Dispose()";
    await U.run('powershell', ['-NoProfile', '-Command', ps], { env: Object.assign({}, process.env, { REEL_OUT: f, REEL_TEXT: text, REEL_VOICE: cfg.voice || '' }) });
    return { file: f, words: null };
  }
  const bin = U.which('espeak-ng') ? 'espeak-ng' : 'espeak';
  const f = out + '.src.wav';
  await U.run(bin, ['-v', cfg.voice || 'en', '-s', String(Math.round(wps * 60 * 1.05 * (cfg.speed || 1))), '-w', f, text]);
  return { file: f, words: null };
}

/* ---------- clip clean-up ---------- */
function speechBounds(x, thr = 0.012) {
  const win = 480; let first = -1, last = -1;
  for (let i = 0; i + win <= x.length; i += win) {
    let s = 0; for (let k = i; k < i + win; k++) s += x[k] * x[k];
    if (Math.sqrt(s / win) > thr) { if (first < 0) first = i; last = i + win; }
  }
  if (first < 0) return [0, x.length];
  return [first, last];
}
function estimateWords(text, start, end) {
  const toks = String(text).replace(/[*^{}]/g, '').split(/\s+/).filter(Boolean);
  if (!toks.length) return [];
  const wts = toks.map((w) => Math.max(1.5, w.replace(/[^\p{L}\p{N}]/gu, '').length) + (/[.!?…]$/.test(w) ? 4 : /[,;:—-]$/.test(w) ? 2 : 0) + 1.2);
  const tot = wts.reduce((a, b) => a + b, 0);
  const span = Math.max(0.2, end - start);
  let t = start; const out = [];
  toks.forEach((w, i) => { const d = (wts[i] / tot) * span; const pause = /[.!?…]$/.test(w) ? Math.min(0.25, d * 0.35) : /[,;:]$/.test(w) ? Math.min(0.12, d * 0.25) : 0; out.push({ w, s: +t.toFixed(3), e: +(t + d - pause).toFixed(3) }); t += d; });
  return out;
}
/* Decode, trim silence, level the line, write 48 kHz mono wav. Returns duration + words. */
async function finalizeClip(src, outWav, text, words) {
  const x = await U.decodeAudio(src, RATE);
  const [a, b] = speechBounds(x);
  const s0 = Math.max(0, a - Math.round(0.04 * RATE)), s1 = Math.min(x.length, b + Math.round(0.14 * RATE));
  const y = x.slice(s0, s1);
  let ss = 0, n = 0, pk = 0;
  for (let i = 0; i < y.length; i++) { const v = Math.abs(y[i]); if (v > pk) pk = v; if (v > 0.01) { ss += y[i] * y[i]; n++; } }
  const rms = n ? Math.sqrt(ss / n) : 0.1;
  const g = Math.min(0.1 / (rms || 1e-6), 0.89 / (pk || 1e-6), 8);
  for (let i = 0; i < y.length; i++) y[i] *= g;
  U.writeWav(outWav, [y], RATE);
  const dur = y.length / RATE;
  let w;
  if (words && words.length) {
    const off = s0 / RATE;
    w = words.map((q) => ({ w: q.w, s: +Math.max(0, q.s - off).toFixed(3), e: +Math.min(dur, Math.max(0, q.e - off)).toFixed(3) }));
  } else {
    const [sa, sb] = speechBounds(y);
    w = estimateWords(text, sa / RATE, sb / RATE);
  }
  return { duration: +dur.toFixed(3), words: w };
}

/* Split one long recording into N lines at its N-1 longest pauses. */
async function splitRecording(file, n) {
  const x = await U.decodeAudio(file, RATE);
  const win = 480, env = [];
  for (let i = 0; i + win <= x.length; i += win) { let s = 0; for (let k = i; k < i + win; k++) s += x[k] * x[k]; env.push(Math.sqrt(s / win)); }
  const sorted = env.slice().sort((p, q) => p - q);
  const thr = Math.max(0.006, sorted[Math.floor(sorted.length * 0.2)] * 2.5);
  const gaps = []; let st = -1;
  env.forEach((v, i) => { if (v < thr) { if (st < 0) st = i; } else if (st >= 0) { if (i - st >= 20) gaps.push({ a: st, b: i, len: i - st }); st = -1; } });
  const inner = gaps.filter((g) => g.a > 10 && g.b < env.length - 10);
  if (inner.length < n - 1) U.fail(`The recording has ${inner.length + 1} parts separated by pauses, but the script has ${n} voiced scenes. Leave a clear pause (0.5 s) between lines, or put one file per line in voice/lines/<scene-id>.wav`);
  const cuts = inner.sort((p, q) => q.len - p.len).slice(0, n - 1).sort((p, q) => p.a - q.a).map((g) => Math.round(((g.a + g.b) / 2) * win));
  const bounds = [0, ...cuts, x.length];
  const parts = [];
  for (let i = 0; i < n; i++) parts.push(x.slice(bounds[i], bounds[i + 1]));
  return parts;
}

/* ---------- main ---------- */
async function voiceProject(proj, opts = {}) {
  const script = proj.script, style = proj.style;
  const cfg = Object.assign({}, script.voice || {});
  if (opts.provider) cfg.provider = opts.provider;
  if (opts.voice) cfg.voice = opts.voice;
  let provider = cfg.provider || 'auto';
  if (provider === 'auto') provider = detectProvider();
  const lang = script.language || 'en';
  if (provider !== 'recording' && provider !== 'none') cfg.voice = pickVoice(provider, cfg, style, lang);
  const vdir = U.ensureDir(path.join(proj.dir, 'voice'));
  const tfile = path.join(vdir, 'timings.json');
  const timings = U.readJSON(tfile, {});
  const scenes = script.scenes.filter((s) => s.voice && String(s.voice).trim());
  const only = opts.only ? String(opts.only).split(',') : null;
  const res = { provider, voice: cfg.voice, made: [], kept: [] };
  if (provider === 'none') {
    for (const k of Object.keys(timings)) delete timings[k];
    U.writeJSON(tfile, timings);
    U.warn('No narrator: scene lengths come from reading time, and the video gets no captions file.');
    return res;
  }
  let recParts = null;
  if (provider === 'recording') {
    const linesDir = path.join(proj.dir, 'voice', 'lines');
    if (!cfg.recording && !U.exists(linesDir)) U.fail('Set script.voice.recording to your narration file, or put one file per line in voice/lines/<scene-id>.wav');
    if (cfg.recording) recParts = await splitRecording(path.resolve(proj.dir, cfg.recording), scenes.length);
  }
  const plainText = (s) => String(s).replace(/\*([^*]+)\*/g, '$1').replace(/\^([^^]+)\^/g, '$1').replace(/\{\{(.+?)\}\}/g, '$1').trim();
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    if (only && !only.includes(sc.id)) continue;
    const text = plainText(sc.voice);
    const key = U.hash({ provider, voice: cfg.voice, model: cfg.model, speed: cfg.speed, rate: cfg.rate, text, rec: provider === 'recording' ? (cfg.recording || 'lines') + i : null });
    const wav = path.join(vdir, sc.id + '.wav');
    if (!opts.force && timings[sc.id] && timings[sc.id].hash === key && U.exists(wav)) { res.kept.push(sc.id); continue; }
    const base = path.join(os.tmpdir(), `reel-${process.pid}-${sc.id}`);
    let r;
    const ctx = { style, prev: i > 0 ? plainText(scenes[i - 1].voice) : null, next: scenes[i + 1] ? plainText(scenes[i + 1].voice) : null };
    try {
      if (provider === 'elevenlabs') r = await synthElevenLabs(text, cfg, base, ctx);
      else if (provider === 'openai') r = await synthOpenAI(text, cfg, base, ctx);
      else if (provider === 'edge') r = await synthEdge(text, cfg, base);
      else if (provider === 'system') r = await synthSystem(text, cfg, base, ctx);
      else if (provider === 'recording') {
        if (recParts) { const f = base + '.src.wav'; U.writeWav(f, [recParts[i]], RATE); r = { file: f, words: null }; }
        else { const f = ['wav', 'mp3', 'm4a'].map((e) => path.join(proj.dir, 'voice', 'lines', `${sc.id}.${e}`)).find(U.exists); if (!f) U.fail(`Missing voice/lines/${sc.id}.wav`); r = { file: f, words: null }; }
      } else U.fail(`Unknown voice provider "${provider}"`);
    } catch (e) {
      if (e.userError) throw e;
      throw new Error(`Voice for ${sc.id} failed with ${provider}: ${e.message}`);
    }
    const fin = await finalizeClip(r.file, wav, text, r.words);
    if (r.file.startsWith(os.tmpdir())) fs.rmSync(r.file, { force: true });
    timings[sc.id] = { file: path.relative(proj.dir, wav), duration: fin.duration, words: fin.words, hash: key, provider, voice: cfg.voice, text };
    res.made.push(sc.id);
    U.log(U.color.dim(`  ${sc.id}  ${fin.duration.toFixed(2)}s  ${text.slice(0, 70)}`));
  }
  const ids = new Set(script.scenes.map((s) => s.id));
  for (const k of Object.keys(timings)) if (!ids.has(k) || !script.scenes.find((s) => s.id === k && s.voice && String(s.voice).trim())) delete timings[k];
  U.writeJSON(tfile, timings);
  return res;
}

/* Two or three voices reading the first line, so the user can pick. */
async function voiceSamples(proj, opts = {}) {
  const script = proj.script, style = proj.style;
  let provider = opts.provider || (script.voice && script.voice.provider) || 'auto';
  if (provider === 'auto') provider = detectProvider();
  const first = script.scenes.find((s) => s.voice && String(s.voice).trim());
  if (!first) U.fail('No voiced line in the script');
  const text = String(first.voice).replace(/[*^{}]/g, '');
  let voices = [];
  const lang = String(script.language || 'en').slice(0, 2);
  if (provider === 'openai') voices = [pickVoice('openai', {}, style, lang), 'nova', 'onyx', 'coral', 'ash'];
  else if (provider === 'elevenlabs') {
    const key = process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
    const vs = await elevenVoices(key);
    voices = [pickVoice('elevenlabs', {}, style, lang), ...vs.slice(0, 4).map((v) => v.name)];
  } else if (provider === 'edge') {
    const per = { en: ['en-US-AndrewMultilingualNeural', 'en-US-AvaMultilingualNeural', 'en-GB-RyanNeural'], de: ['de-DE-ConradNeural', 'de-DE-KatjaNeural', 'de-DE-FlorianMultilingualNeural', 'de-DE-SeraphinaMultilingualNeural'] };
    voices = [pickVoice('edge', {}, style, lang), ...(per[lang] || per.en)];
  } else if (provider === 'system') voices = [pickVoice('system', {}, style, lang)];
  else U.fail(`Samples need a voice service; provider is "${provider}"`);
  voices = [...new Set(voices.filter(Boolean))].slice(0, 3);
  const dir = U.ensureDir(path.join(proj.dir, 'voice', 'samples'));
  const files = [];
  for (const v of voices) {
    const base = path.join(os.tmpdir(), `reel-sample-${process.pid}-${U.slugify(v)}`);
    const cfg = Object.assign({}, script.voice || {}, { voice: v });
    const ctx = { style };
    const r = provider === 'openai' ? await synthOpenAI(text, cfg, base, ctx) : provider === 'elevenlabs' ? await synthElevenLabs(text, cfg, base, ctx) : provider === 'edge' ? await synthEdge(text, cfg, base) : await synthSystem(text, cfg, base, ctx);
    const out = path.join(dir, U.slugify(v) + '.wav');
    await finalizeClip(r.file, out, text, r.words);
    files.push({ voice: v, file: out });
  }
  return { provider, files };
}

module.exports = { voiceProject, voiceSamples, detectProvider, providersStatus, pickVoice, estimateWords, edgeAvailable, systemVoiceAvailable };
