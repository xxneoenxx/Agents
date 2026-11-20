'use strict';
/* Step 6, Plan: turns the approved script + the recorded voice into one clock.
   Every picture, word, caption and sound effect gets its exact second. Then it checks the plan. */
const path = require('path');
const { pathToFileURL } = require('url');
const U = require('./util');

const TRANS = { cut: 0, fade: 0.4, slide: 0.45, slideX: 0.45, zoom: 0.45, whip: 0.32, wipe: 0.5, paper: 0.5, flash: 0.3 };
const TYPES = ['hook', 'title', 'text', 'statement', 'icon', 'number', 'list', 'bars', 'compare', 'meters', 'timeline', 'steps', 'choice', 'quote', 'image', 'cta', 'outro', 'stick', 'map', 'custom'];
const LISTS = { list: 'items', bars: 'items', meters: 'items', timeline: 'events', steps: 'steps', map: 'pins' };
const TEXTY = ['hook', 'title', 'text', 'statement', 'icon', 'quote', 'cta', 'outro'];

function count(d, k) { return Array.isArray(d[k]) ? d[k].length : 0; }
function minDuration(sc) {
  const d = sc.data || {};
  switch (sc.type) {
    case 'hook': case 'title': return 2.0;
    case 'text': case 'statement': case 'icon': case 'quote': case 'image': case 'cta': case 'outro': return 2.2;
    case 'number': return 2.6;
    case 'list': case 'steps': return 1.4 + 0.9 * (count(d, 'items') || count(d, 'steps'));
    case 'bars': case 'meters': return 1.6 + 0.6 * count(d, 'items');
    case 'timeline': return 1.6 + 1.1 * count(d, 'events');
    case 'compare': return 3.5;
    case 'choice': return 3 + (d.countdown == null ? 3 : +d.countdown) + (d.percentA != null ? 1.6 : 0.4);
    case 'map': return 2.4 + 1.3 * count(d, 'pins');
    case 'stick': return 3.0;
    default: return 2.5;
  }
}
function readingTime(sc) {
  const d = sc.data || {};
  const txt = JSON.stringify(d).replace(/"[a-zA-Z]+":/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const n = txt.split(/\s+/).filter((w) => w.length > 1 && isNaN(Number(w))).length;
  return 1.2 + n / 3.2;
}

const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, '');
const plain = (s) => String(s || '').replace(/\*([^*]+)\*/g, '$1').replace(/\^([^^]+)\^/g, '$1').replace(/\{\{(.+?)\}\}/g, '$1');

function findWord(words, needle, after = -1) {
  const parts = plain(needle).split(/\s+/).map(norm).filter(Boolean);
  if (!parts.length) return null;
  for (let i = 0; i < words.length; i++) {
    if (words[i].s <= after) continue;
    const w = norm(words[i].w);
    const stem = parts[0].length >= 5 ? parts[0].slice(0, Math.max(4, parts[0].length - 2)) : parts[0];
    if (w === parts[0] || (parts[0].length >= 4 && w.startsWith(stem))) {
      if (parts.length === 1 || (words[i + 1] && norm(words[i + 1].w).startsWith(parts[1].slice(0, 3)))) return words[i].s;
    }
  }
  return null;
}
function resolveAt(v, ps, unresolved) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (/^-?\d+(\.\d+)?%$/.test(s)) return (parseFloat(s) / 100) * ps.duration;
  const m = s.match(/^(?:word|w):(.+)$/i);
  if (m) { const t = findWord(ps.words, m[1]); if (t != null) return Math.max(0, t - 0.08); unresolved.push(`${ps.id}: word "${m[1]}" is not in the voice line`); return null; }
  const n = parseFloat(s); return isNaN(n) ? null : n;
}
/* Resolve every "at"/"…At" field (word:x, 40%, seconds). */
function walkAts(obj, ps, unresolved) {
  if (!obj || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if ((k === 'at' || /At$/.test(k)) && (typeof v === 'string' || typeof v === 'number')) { const r = resolveAt(v, ps, unresolved); if (r == null) delete obj[k]; else obj[k] = +r.toFixed(3); }
    else if (v && typeof v === 'object') walkAts(v, ps, unresolved);
  }
}
function itemText(it) { if (typeof it === 'string') return it; return it.text || it.label || it.title || (it.year != null ? String(it.year) : ''); }
function firstKeyword(txt) {
  const toks = plain(txt).split(/\s+/).filter(Boolean);
  return toks.find((w) => norm(w).length >= 4) || toks.find((w) => /\d/.test(w)) || toks[0] || '';
}

/* Give list-like items their arrival time: synced to the narrator when the item's key word is spoken. */
function syncItems(ps) {
  const key = LISTS[ps.type]; const d = ps.data;
  if (!key || !Array.isArray(d[key]) || !d[key].length) return;
  d[key] = d[key].map((it) => (typeof it === 'string' ? { text: it } : it));
  const items = d[key], n = items.length;
  const from = ps.type === 'map' ? 0.9 : 0.35, to = Math.max(from, ps.duration * (ps.type === 'map' ? 0.7 : ps.type === 'timeline' ? 0.72 : 0.62));
  const t = items.map((it) => (typeof it.at === 'number' ? it.at : null));
  if (ps.words.length && d.sync !== false) {
    let after = -1;
    items.forEach((it, i) => {
      if (t[i] != null) { after = t[i]; return; }
      const kw = it.sync || firstKeyword(itemText(it));
      const hit = kw ? findWord(ps.words, kw, after) : null;
      if (hit != null) { t[i] = Math.max(0.15, hit - 0.12); after = hit; }
    });
  }
  for (let i = 0; i < n; i++) if (t[i] == null) {
    let a = i - 1; while (a >= 0 && t[a] == null) a--;
    let b = i + 1; while (b < n && t[b] == null) b++;
    const ta = a >= 0 ? t[a] : from - (to - from) / Math.max(1, n - 1);
    const tb = b < n ? t[b] : null;
    if (tb != null) t[i] = ta + ((tb - ta) * (i - a)) / (b - a);
    else t[i] = n === 1 ? from : Math.max(ta + 0.35, from + ((to - from) * i) / (n - 1));
  }
  for (let i = 1; i < n; i++) if (t[i] < t[i - 1] + 0.25) t[i] = t[i - 1] + 0.25;
  items.forEach((it, i) => { it.at = +Math.min(t[i], Math.max(0.2, ps.duration - 0.5)).toFixed(3); });
}

/* Fill in the timings the player would otherwise guess, so sound effects and pictures share one clock. */
function fillDefaults(ps) {
  const d = ps.data;
  if (ps.type === 'number') { if (typeof d.at !== 'number') d.at = 0.15; if (!d.countDur) d.countDur = +Math.min(2.0, Math.max(0.8, ps.duration * 0.45)).toFixed(2); }
  if (ps.type === 'compare') {
    d.left = d.left || {}; d.right = d.right || {};
    if (typeof d.left.at !== 'number') d.left.at = 0.15;
    if (typeof d.right.at !== 'number') { const h = ps.words.length && d.right.title ? findWord(ps.words, firstKeyword(d.right.title), d.left.at) : null; d.right.at = h != null ? Math.max(d.left.at + 0.4, h - 0.12) : Math.max(d.left.at + 0.6, Math.min(1.4, ps.duration * 0.3)); }
    if (d.winner && typeof d.winnerAt !== 'number') d.winnerAt = +(ps.duration * 0.72).toFixed(2);
  }
  if (ps.type === 'choice') {
    if (typeof d.aAt !== 'number') { const h = ps.words.length && d.a ? findWord(ps.words, firstKeyword(d.a.text)) : null; d.aAt = h != null ? Math.max(0.3, h - 0.12) : 0.5; }
    if (typeof d.bAt !== 'number') { const h = ps.words.length && d.b ? findWord(ps.words, firstKeyword(d.b.text), d.aAt) : null; d.bAt = h != null ? Math.max(d.aAt + 0.4, h - 0.12) : d.aAt + 0.55; }
    const cd = d.countdown == null ? 3 : +d.countdown;
    const voiceEnd = ps.words.length ? ps.words[ps.words.length - 1].e : 0;
    if (typeof d.countdownAt !== 'number') d.countdownAt = +Math.max(d.bAt + 0.4, voiceEnd + 0.1).toFixed(2);
    if (typeof d.revealAt !== 'number') d.revealAt = +(d.countdownAt + cd + 0.1).toFixed(2);
  }
  if (ps.type === 'stick') {
    (d.figures || []).forEach((f, i) => {
      if (typeof f.at !== 'number') f.at = i === 0 ? 0 : 0.3 * i;
      if ((f.say || f.think) && typeof f.sayAt !== 'number') {
        const h = ps.words.length ? findWord(ps.words, firstKeyword(f.say || f.think)) : null;
        f.sayAt = h != null ? Math.max(f.at + 0.2, h - 0.15) : f.at + 0.35 + i * 0.5;
      }
    });
  }
}
/* Some scenes need time after their last event (a countdown, a result to read). */
function neededDuration(ps) {
  const d = ps.data;
  if (ps.type === 'choice') { const cd = d.countdown == null ? 3 : +d.countdown; return d.percentA != null ? d.revealAt + 2.2 : d.countdownAt + cd + 0.6; }
  if (ps.type === 'number') return (d.at || 0) + (d.countDur || 1.5) + 0.9;
  return 0;
}
/* Last moment something new appears in the scene, for stills. */
function fullAt(ps, style) {
  const d = ps.data; let t = 0.6;
  if (TEXTY.includes(ps.type) && !ps.words.length) {
    const n = plain(d.text || '').split(/\s+/).filter(Boolean).length;
    const stg = Math.min((style && style.motion && style.motion.stagger) || 0.08, Math.max(0.03, (ps.duration * 0.55) / Math.max(1, n)));
    t = Math.max(t, (typeof d.at === 'number' ? d.at : 0.18) + (n - 1) * stg + 0.6, d.sub ? (typeof d.subAt === 'number' ? d.subAt : 0) + 0.6 : 0);
  }
  const key = LISTS[ps.type];
  if (key && Array.isArray(d[key])) d[key].forEach((it) => { if (typeof it.at === 'number') t = Math.max(t, it.at + 0.7); });
  if (ps.type === 'number') t = Math.max(t, (d.at || 0) + (d.countDur || 1.5) + 0.5);
  if (ps.type === 'compare') t = Math.max(t, (d.right.at || 0) + 0.9 + 0.3 * Math.max(count(d.left, 'points'), count(d.right, 'points')), d.winnerAt ? d.winnerAt + 0.5 : 0);
  if (ps.type === 'choice') t = Math.max(t, d.percentA != null ? d.revealAt + 1.0 : d.countdownAt + 0.6);
  if (ps.type === 'stick') (d.figures || []).forEach((f) => { t = Math.max(t, (f.sayAt || f.at || 0) + 0.6); });
  if (TEXTY.includes(ps.type) && ps.words.length) t = Math.max(t, ps.words[ps.words.length - 1].s + 0.6);
  if (ps.type === 'map' && count(d, 'pins') > 1 && d.overview !== false) t = Math.max(t, ps.duration - 0.25);
  return +Math.min(Math.max(0.3, ps.duration - 0.15), t).toFixed(2);
}
/* When the first thing appears on screen (an empty screen loses viewers). */
function firstVisual(ps) {
  const d = ps.data;
  if (['map', 'stick', 'choice', 'image', 'custom', 'quote', 'timeline'].includes(ps.type)) return 0;
  if (ps.type === 'number') return d.at || 0;
  if (d.title || d.kicker || d.emoji) return 0;
  if (ps.type === 'compare') return d.left.at || 0;
  const key = LISTS[ps.type];
  if (key && Array.isArray(d[key]) && d[key].length) return Math.min(...d[key].map((i) => i.at || 0));
  if (TEXTY.includes(ps.type) && ps.words.length) return ps.words[0].s;
  return 0;
}
function complexity(ps) {
  const d = ps.data; const key = LISTS[ps.type];
  let c = { map: 5, compare: 5, choice: 5, stick: 3, timeline: 3, custom: 3, image: 2, number: 2 }[ps.type] || 1;
  if (key) c += 1.3 * count(d, key);
  c += plain(JSON.stringify(d)).length / 120;
  return +c.toFixed(2);
}

function buildCaptions(scenes, style) {
  const max = (style.captions && style.captions.maxWords) || 4;
  const chunks = [];
  for (const ps of scenes) {
    if (!ps.words.length) continue;
    const abs = ps.words.map((w) => ({ w: plain(w.w), s: +(ps.start + w.s).toFixed(3), e: +(ps.start + w.e).toFixed(3) }));
    let cur = [];
    const flush = () => { if (cur.length) chunks.push({ scene: ps.id, words: cur, start: cur[0].s, end: cur[cur.length - 1].e + 0.25 }); cur = []; };
    abs.forEach((w, i) => {
      cur.push(w);
      const nx = abs[i + 1];
      const punct = /[.!?…,;:]$/.test(w.w);
      if (cur.length >= max || (punct && cur.length >= 2) || /[.!?…]$/.test(w.w) || (nx && nx.s - w.e > 0.45)) flush();
    });
    flush();
  }
  for (let i = 0; i < chunks.length; i++) {
    const nx = chunks[i + 1];
    if (nx && chunks[i].end > nx.start) chunks[i].end = nx.start;
    chunks[i].end = +chunks[i].end.toFixed(3);
  }
  return chunks;
}

/* Subtitles file: sentence-aware cues, max ~42 characters per line, 2 lines. */
function srt(scenes) {
  const cues = [];
  for (const ps of scenes) {
    if (!ps.words.length) continue;
    let cur = [];
    const flush = () => { if (!cur.length) return; cues.push({ s: ps.start + cur[0].s, e: ps.start + cur[cur.length - 1].e + 0.15, text: wrap(cur.map((w) => plain(w.w)).join(' ')) }); cur = []; };
    ps.words.forEach((w) => { cur.push(w); const len = cur.map((x) => x.w).join(' ').length; if (/[.!?…]$/.test(w.w) || len > 70) flush(); });
    flush();
  }
  for (let i = 0; i < cues.length - 1; i++) if (cues[i].e > cues[i + 1].s) cues[i].e = cues[i + 1].s - 0.01;
  return cues.map((c, i) => `${i + 1}\n${U.fmtSrtTime(c.s)} --> ${U.fmtSrtTime(c.e)}\n${c.text}\n`).join('\n');
}
function wrap(s) {
  if (s.length <= 42) return s;
  const words = s.split(' '); let best = 1, bd = 1e9;
  for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' ').length, b = words.slice(i).join(' ').length; const d = Math.abs(a - b); if (d < bd) { bd = d; best = i; } }
  return words.slice(0, best).join(' ') + '\n' + words.slice(best).join(' ');
}

/* Sound effects on the same clock as the pictures. */
function buildSfx(scenes, style) {
  const S = style.sound || {};
  const ev = [];
  const add = (name, t, gain = 0.5, extra) => ev.push(Object.assign({ name, t: +Math.max(0, t).toFixed(3), gain }, extra || {}));
  const auto = S.sfx !== 'off' && S.sfx !== false;
  scenes.forEach((ps, i) => {
    const d = ps.data, st = ps.start;
    if (auto) {
      if (i > 0 && ps.transition.type !== 'cut') add(ps.transition.type === 'whip' || ps.transition.type === 'flash' ? 'whoosh' : 'swish', st - ps.transition.dur * 0.6, 0.45);
      if (i === 0) add('impact', st + 0.02, 0.45);
      const key = LISTS[ps.type];
      if (key && Array.isArray(d[key])) d[key].forEach((it) => { if (typeof it.at === 'number') add('pop', st + it.at, 0.35); });
      if (ps.type === 'number') { add('riser', st + d.at, 0.28, { dur: d.countDur }); add('ding', st + d.at + d.countDur, 0.45); }
      if (ps.type === 'compare') { add('pop', st + d.left.at, 0.4); add('pop', st + d.right.at, 0.4); if (d.winner) add('ding', st + d.winnerAt, 0.4); }
      if (ps.type === 'choice') { const cd = d.countdown == null ? 3 : +d.countdown; for (let k = 0; k < cd; k++) add('tick', st + d.countdownAt + k, 0.5); if (d.percentA != null) add('ding', st + d.revealAt, 0.45); }
      if (ps.type === 'stick') (d.figures || []).forEach((f) => { if (f.say || f.think) add('bubble', st + f.sayAt, 0.4); });
      if (ps.type === 'cta' || ps.type === 'outro') add('pop', st + Math.min(ps.duration - 0.3, 1.0), 0.35);
      if (d.shake) add('impact', st + 0.6, 0.4);
    }
    (ps.sfx || []).forEach((x) => {
      const o = typeof x === 'string' ? { name: x } : x;
      let t = typeof o.at === 'number' ? o.at : 0;
      if (typeof o.at === 'string') { const r = resolveAt(o.at, ps, []); if (r != null) t = r; }
      add(o.name, st + t, o.gain != null ? o.gain : 0.5, o.dur ? { dur: o.dur } : null);
    });
  });
  return ev.sort((a, b) => a.t - b.t);
}

function requiredCheck(ps, proj) {
  const d = ps.data, e = [];
  const need = (cond, msg) => { if (!cond) e.push(`${ps.id} (${ps.type}): ${msg}`); };
  switch (ps.type) {
    case 'hook': case 'title': case 'text': case 'statement': case 'icon': need(d.text, 'needs data.text'); break;
    case 'number': need(d.value != null && !isNaN(Number(d.value)), 'needs a numeric data.value'); break;
    case 'list': need(count(d, 'items'), 'needs data.items'); break;
    case 'bars': need(count(d, 'items'), 'needs data.items [{label, value}]'); break;
    case 'meters': need(count(d, 'items'), 'needs data.items [{label, value 0-100}]'); break;
    case 'timeline': need(count(d, 'events'), 'needs data.events [{year, text}]'); break;
    case 'steps': need(count(d, 'steps'), 'needs data.steps'); break;
    case 'compare': need(d.left && d.right, 'needs data.left and data.right'); break;
    case 'choice': need(d.question && d.a && d.b, 'needs data.question, data.a, data.b'); break;
    case 'quote': need(d.text, 'needs data.text'); break;
    case 'image': need(d.src, 'needs data.src'); if (d.src && !/^(https?:|data:|file:)/.test(d.src)) need(U.exists(path.resolve(proj.dir, d.src)), `image not found: ${d.src}`); break;
    case 'map': need(count(d, 'pins') || Array.isArray(d.land), 'needs data.pins [{x 0-1000, y 0-1000, label}]'); break;
    case 'custom': need(d.html || d.js, 'needs data.html and/or data.js'); break;
    default: break;
  }
  return e;
}

function build(proj) {
  const script = proj.script, style = proj.style;
  const timings = U.readJSON(proj.p('voice', 'timings.json'), {});
  const issues = { errors: [], warnings: [], info: [] };
  const unresolved = [];
  const scenes = []; let t = 0;
  const ids = new Set();
  const narrated = script.scenes.some((s) => s.voice && String(s.voice).trim());
  const provider = (script.voice && script.voice.provider) || 'auto';
  script.scenes.forEach((sc, i) => {
    if (!sc.id) sc.id = 's' + String(i + 1).padStart(2, '0');
    if (ids.has(sc.id)) issues.errors.push(`Scene id ${sc.id} is used twice`);
    ids.add(sc.id);
    if (!TYPES.includes(sc.type)) issues.errors.push(`${sc.id}: unknown type "${sc.type}". Use one of: ${TYPES.join(', ')}`);
    const tm = timings[sc.id];
    const text = plain(sc.voice || '').trim();
    if (text && provider !== 'none') {
      if (!tm) issues.errors.push(`${sc.id}: no voice recorded yet (run: voice)`);
      else if (tm.text !== text) issues.errors.push(`${sc.id}: the line changed since it was recorded (run: voice)`);
    }
    const vdur = tm && text ? tm.duration : 0;
    const lead = sc.voiceDelay != null ? sc.voiceDelay : i === 0 ? 0.05 : 0.18;
    const tail = sc.pad != null ? sc.pad : 0.3;
    const minD = sc.minDuration || minDuration(sc);
    let dur = vdur > 0 ? Math.max(minD, lead + vdur + tail) : sc.duration || Math.max(minD, narrated ? minD : readingTime(sc));
    if (sc.duration && sc.duration > dur) dur = sc.duration;
    dur += sc.hold || 0;
    dur = +dur.toFixed(3);
    const ttype = i === 0 ? 'cut' : sc.transition || (style.motion && style.motion.transition) || 'slide';
    const tr = { type: ttype, dur: TRANS[ttype] != null ? TRANS[ttype] : 0.4 };
    const words = vdur > 0 ? tm.words.map((w) => ({ w: w.w, s: +(w.s + lead).toFixed(3), e: +(w.e + lead).toFixed(3) })) : [];
    const ps = { id: sc.id, type: sc.type, data: JSON.parse(JSON.stringify(sc.data || {})), start: +t.toFixed(3), duration: dur, end: +(t + dur).toFixed(3), transition: tr, words, sfx: sc.sfx || [] };
    if (vdur > 0) { ps.voice = { file: tm.file, start: +(t + lead).toFixed(3), duration: vdur }; }
    walkAts(ps.data, ps, unresolved);
    syncItems(ps);
    fillDefaults(ps);
    const need = neededDuration(ps);
    if (need > ps.duration) { ps.duration = +need.toFixed(3); ps.end = +(ps.start + ps.duration).toFixed(3); dur = ps.duration; }
    if (sc.captions === false) ps.captionsHidden = true;
    else if (TEXTY.includes(sc.type) && words.length) {
      const shown = new Set(plain(ps.data.text || '').split(/\s+/).map(norm).filter(Boolean));
      const spoken = words.map((w) => norm(w.w)).filter(Boolean);
      const overlap = spoken.filter((w) => shown.has(w)).length / Math.max(1, spoken.length);
      if (overlap >= 0.6) ps.captionsHidden = true;
    }
    ps.fullAt = fullAt(ps, style);
    ps.complexity = complexity(ps);
    issues.errors.push(...requiredCheck(ps, proj));
    scenes.push(ps);
    t += dur;
  });
  const captionsOn = narrated && provider !== 'none' && style.captions && style.captions.enabled !== false;
  const plan = {
    version: 1, title: script.title || proj.slug, baseUrl: pathToFileURL(proj.dir + path.sep).href, language: script.language || 'en', fps: script.fps || 30, width: 1080, height: 1920,
    duration: +t.toFixed(3), handle: script.handle || proj.brief.handle || '', style: style.id || 'custom',
    scenes, captions: captionsOn ? buildCaptions(scenes, style) : [],
    sfx: buildSfx(scenes, style),
    music: Object.assign({ mood: (style.sound && style.sound.music) || 'calm', volume: (style.sound && style.sound.musicVolume) || 0.2 }, script.music || {}),
    stills: pickStills(scenes),
  };
  checks(plan, script, style, issues, unresolved);
  plan.hash = U.hash({ scenes: plan.scenes, captions: plan.captions, style });
  U.writeJSON(proj.p('plan.json'), plan);
  if (captionsOn) require('fs').writeFileSync(proj.p('captions.srt'), srt(scenes));
  return { plan, issues };
}

function pickStills(scenes) {
  if (!scenes.length) return {};
  const first = scenes[0];
  const sorted = scenes.slice(1).sort((a, b) => b.complexity - a.complexity);
  const busiest = sorted[0] || first;
  const quietest = sorted.length > 1 ? sorted[sorted.length - 1] : scenes[scenes.length - 1];
  const at = (ps) => +(ps.start + ps.fullAt).toFixed(2);
  return { first: { scene: first.id, t: at(first) }, busiest: { scene: busiest.id, t: at(busiest) }, quietest: { scene: quietest.id, t: at(quietest) } };
}

function checks(plan, script, style, issues, unresolved) {
  const target = script.targetSeconds || 60;
  const d = plan.duration;
  if (d > target * 1.12) issues.warnings.push(`Total ${d.toFixed(1)}s is over the ${target}s target. Shorten the longest lines: ${longest(plan).join(', ')}`);
  if (d < target * 0.7) issues.warnings.push(`Total ${d.toFixed(1)}s is well under the ${target}s target`);
  const h = plan.scenes[0];
  if (h && h.duration > 4) issues.warnings.push(`The hook (${h.id}) is ${h.duration.toFixed(1)}s. The first line should land in under 3 s`);
  if (h && !h.words.length && !['hook', 'title', 'text', 'icon', 'number', 'map', 'choice'].includes(h.type)) issues.warnings.push('The first scene has no voice and no big text: viewers decide in 1-2 s');
  for (const ps of plan.scenes) {
    const lk = LISTS[ps.type], nItems = lk ? count(ps.data, lk) : 0;
    if (ps.duration > 9 + 0.9 * nItems + (ps.type === 'choice' ? 4 : 0)) issues.warnings.push(`${ps.id} lasts ${ps.duration.toFixed(1)}s: split it, long static scenes lose viewers`);
    if (ps.duration < 1.2) issues.warnings.push(`${ps.id} is only ${ps.duration.toFixed(1)}s`);
    const fv = firstVisual(ps);
    if (fv > 1.5) issues.warnings.push(`${ps.id}: the screen is empty for the first ${fv.toFixed(1)}s; show something at once (a title, kicker or emoji, or an earlier "at")`);
    if (ps.words.length >= 3) {
      const span = ps.words[ps.words.length - 1].e - ps.words[0].s;
      const wps = ps.words.length / Math.max(0.5, span);
      if (wps > 3.7 && ps.words.length >= 6) issues.warnings.push(`${ps.id}: ${wps.toFixed(1)} words/s is fast; cut words or slow the voice`);
      const deadAir = ps.duration - ps.words[ps.words.length - 1].e;
      if (deadAir > 3 && ps.type !== 'choice') issues.warnings.push(`${ps.id}: ${deadAir.toFixed(1)}s without voice at the end`);
    }
    const dd = ps.data;
    if (TEXTY.includes(ps.type) && plain(dd.text || '').length > 90) issues.warnings.push(`${ps.id}: ${plain(dd.text).length} characters on screen is a lot; aim for under 60`);
    const key = LISTS[ps.type];
    if (key && count(dd, key) > 6) issues.warnings.push(`${ps.id}: ${count(dd, key)} ${key} is too many for a phone screen (max 6)`);
  }
  for (const u of unresolved) issues.warnings.push(u);
  const words = plan.scenes.reduce((a, ps) => a + ps.words.length, 0);
  if (words) issues.info.push(`${words} spoken words, ${(words / d).toFixed(2)} words/s overall`);
  issues.info.push(`${plan.scenes.length} scenes, ${d.toFixed(1)}s, ${plan.captions.length} caption chunks, ${plan.sfx.length} sound effects`);
}
function longest(plan) { return plan.scenes.filter((s) => s.voice).sort((a, b) => b.voice.duration - a.voice.duration).slice(0, 3).map((s) => `${s.id} (${s.voice.duration.toFixed(1)}s)`); }

function table(plan) {
  const lines = ['  #     start   dur   type       transition  words'];
  for (const ps of plan.scenes) lines.push(`  ${ps.id.padEnd(5)} ${U.fmtTime(ps.start).padStart(6)}  ${ps.duration.toFixed(1).padStart(4)}  ${ps.type.padEnd(10)} ${ps.transition.type.padEnd(11)} ${ps.words.length}`);
  return lines.join('\n');
}

module.exports = { build, table, srt, TYPES, TRANS };
