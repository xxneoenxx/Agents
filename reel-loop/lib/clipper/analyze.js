'use strict';
/* Finds the moments worth clipping: loudness spikes and screams in the audio, chat explosions,
   and hype words in the transcript. The agent then looks at the frames (WASTED, BUSTED, ...) and picks. */
const fs = require('fs');
const path = require('path');
const U = require('../util');

const WIN = 0.5; // seconds per analysis window
const SR = 8000;

/* Stream-decode audio at 8 kHz and measure every half second: loudness, brightness (scream proxy). */
async function audioFeatures(file) {
  const per = Math.round(WIN * SR);
  const db = [], bright = [];
  let acc = 0, accD = 0, accA = 0, n = 0, prev = 0, left = Buffer.alloc(0);
  await U.run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], {
    noBuffer: true,
    onStdout: (chunk) => {
      const buf = left.length ? Buffer.concat([left, chunk]) : chunk;
      const usable = buf.length - (buf.length % 4);
      for (let o = 0; o < usable; o += 4) {
        const x = buf.readFloatLE(o);
        acc += x * x; accA += Math.abs(x); accD += Math.abs(x - prev); prev = x; n++;
        if (n === per) {
          const rms = Math.sqrt(acc / n);
          db.push(rms > 1e-6 ? 20 * Math.log10(rms) : -120);
          bright.push(accA > 1e-6 ? accD / accA : 0);
          acc = 0; accA = 0; accD = 0; n = 0;
        }
      }
      left = buf.subarray(usable);
    },
  });
  return { db, bright };
}

function rollingMedian(arr, half) {
  // approximate with block medians for speed on long streams
  const out = new Float32Array(arr.length);
  const block = Math.max(1, Math.floor(half / 4));
  const meds = [];
  for (let i = 0; i < arr.length; i += block) { const s = arr.slice(Math.max(0, i - half), Math.min(arr.length, i + half)).slice().sort((a, b) => a - b); meds.push(s[Math.floor(s.length / 2)] || 0); }
  for (let i = 0; i < arr.length; i++) out[i] = meds[Math.floor(i / block)];
  return out;
}
function zscore(arr, half) {
  const med = rollingMedian(arr, half);
  const dev = arr.map((v, i) => Math.abs(v - med[i]));
  const mad = rollingMedian(dev, half);
  return arr.map((v, i) => (v - med[i]) / (1.4826 * (mad[i] || 1e-6) + 1e-6));
}

/* ---------- chat ---------- */
const CHAT_HYPE = /\b(lul|kekw|omegalul|lmao+|lmfao|lol+|kek|pog(gers|champ)?|w+|clip( it|ped)?|no way|wtf|omg|holy|bruh|icant|monkas|sadge|kekl|xd+|haha+|ahaha+|jaja+|nooo+|yooo+|dead)\b|💀|😂|🤣|😭|🔥|‼️|❗/i;
const CHAT_LAUGH = /\b(lul|kekw|omegalul|lmao+|lmfao|lol+|kek|icant|kekl|xd+|haha+|ahaha+)\b|💀|😂|🤣|😭/i;
function parseChat(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const msgs = [];
  if (/videoOffsetTimeMsec/.test(raw)) {
    for (const line of raw.split('\n')) {
      const m = line.match(/"videoOffsetTimeMsec"\s*:\s*"?(\d+)/); if (!m) continue;
      const texts = [...line.matchAll(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((x) => { try { return JSON.parse('"' + x[1] + '"'); } catch (e) { return x[1]; } });
      const emo = [...line.matchAll(/"emojiId"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
      msgs.push({ t: parseInt(m[1], 10) / 1000, text: (texts.join(' ') + ' ' + emo.join(' ')).trim() });
    }
    return msgs;
  }
  try {
    const j = JSON.parse(raw);
    const list = Array.isArray(j) ? j : j.comments || j.data || [];
    for (const c of list) {
      const t = c.content_offset_seconds != null ? c.content_offset_seconds : c.offset != null ? c.offset : c.contentOffsetSeconds;
      const body = (c.message && (c.message.body || (c.message.fragments || []).map((f) => f.text).join(''))) || c.body || c.text || '';
      if (t != null) msgs.push({ t: +t, text: body });
    }
  } catch (e) { /* unknown format */ }
  return msgs;
}

/* ---------- transcript (YouTube json3 or VTT with word timings) ---------- */
function parseSubs(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const words = [];
  if (file.endsWith('.json3') || /"events"\s*:/.test(raw.slice(0, 2000))) {
    const j = JSON.parse(raw);
    for (const ev of j.events || []) {
      if (!ev.segs) continue;
      const t0 = (ev.tStartMs || 0) / 1000;
      const dur = (ev.dDurationMs || 0) / 1000;
      const segs = ev.segs.filter((s) => s.utf8 && s.utf8 !== '\n');
      segs.forEach((s, i) => {
        const w = s.utf8.trim(); if (!w) return;
        const st = t0 + (s.tOffsetMs || 0) / 1000;
        const nx = segs[i + 1];
        const en = nx ? t0 + (nx.tOffsetMs || 0) / 1000 : t0 + Math.max(0.3, dur);
        w.split(/\s+/).forEach((x) => words.push({ w: x, s: st, e: Math.max(st + 0.15, en) }));
      });
    }
  } else {
    const cues = raw.split(/\r?\n\r?\n/);
    const ts = (s) => { const p = s.split(':').map(parseFloat); return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]; };
    for (const cue of cues) {
      const m = cue.match(/(\d[\d:.]+)\s+-->\s+(\d[\d:.]+)/); if (!m) continue;
      const a = ts(m[1]), b = ts(m[2]);
      const body = cue.slice(cue.indexOf(m[0]) + m[0].length).replace(/align:\S+|position:\S+/g, '').trim();
      if (/<\d[\d:.]+>/.test(body)) {
        const parts = body.split(/(<\d[\d:.]+>)/);
        let t = a;
        for (const p of parts) {
          const tm = p.match(/^<(\d[\d:.]+)>$/);
          if (tm) { t = ts(tm[1]); continue; }
          p.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).forEach((w) => words.push({ w, s: t, e: t + 0.3 }));
        }
      } else if (!/<c>/.test(body)) {
        const toks = body.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean);
        toks.forEach((w, i) => words.push({ w, s: a + ((b - a) * i) / toks.length, e: a + ((b - a) * (i + 1)) / toks.length }));
      }
    }
  }
  words.sort((x, y) => x.s - y.s);
  // remove duplicates that rolling auto-captions repeat
  const out = [];
  for (const w of words) { const l = out[out.length - 1]; if (l && l.w === w.w && Math.abs(l.s - w.s) < 0.05) continue; out.push(w); }
  for (let i = 0; i < out.length - 1; i++) if (out[i].e > out[i + 1].s) out[i].e = Math.max(out[i].s + 0.1, out[i + 1].s);
  return out;
}
const SPEECH_HYPE = /^(no+|way|oh+|god|what+|bro+|let'?s|go+|wasted|busted|passed|holy|wtf|kidding|can'?t|dude|run+|help|yo+|dead|insane|crazy|bruh|nah+|wait+|stop+|scheisse|alter|krass|digga|was|nein+)$/i;

function analyze(dir, feats, opts = {}) {
  const src = U.readJSON(path.join(dir, 'source.json'));
  const camp = U.readJSON(path.join(dir, 'campaign.json'), {});
  const minS = +(opts.min || camp.minSeconds || 15), maxS = +(opts.max || camp.maxSeconds || 60);
  const n = feats.db.length;
  const half = Math.round(90 / WIN);
  const loudZ = zscore(feats.db, half);
  const brightZ = zscore(feats.bright, half);
  // chat per window
  const chat = new Float32Array(n), chatKw = new Float32Array(n), chatLaugh = new Float32Array(n);
  const chatMsgs = src.chat ? parseChat(path.join(dir, src.chat)) : [];
  const off = src.offset || 0;
  for (const m of chatMsgs) {
    const i = Math.floor((m.t - off) / WIN); if (i < 0 || i >= n) continue;
    chat[i]++; if (CHAT_HYPE.test(m.text)) chatKw[i]++; if (CHAT_LAUGH.test(m.text)) chatLaugh[i]++;
  }
  const smooth = (a, k) => { const o = new Float32Array(a.length); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= k) s -= a[i - k]; o[i] = s / Math.min(i + 1, k); } return o; };
  const chat10 = smooth(chat, Math.round(10 / WIN));
  const chatZ = chatMsgs.length ? zscore(Array.from(chat10), Math.round(300 / WIN)) : new Float32Array(n);
  const kw10 = smooth(chatKw, Math.round(10 / WIN));
  // transcript
  const words = src.subs ? parseSubs(path.join(dir, src.subs)).map((w) => ({ w: w.w, s: w.s - off, e: w.e - off })) : [];
  const hype = new Float32Array(n);
  for (const w of words) { if (SPEECH_HYPE.test(w.w.replace(/[^\p{L}']/gu, ''))) { const i = Math.floor(w.s / WIN); if (i >= 0 && i < n) hype[i] += 1; } if (/\[(laughter|laughs|lachen)\]/i.test(w.w)) { const i = Math.floor(w.s / WIN); if (i >= 0 && i < n) hype[i] += 2; } }
  const hype6 = smooth(hype, Math.round(6 / WIN));
  // combined score
  const score = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const loud = Math.max(0, loudZ[i]);
    const scream = loudZ[i] > 2 && brightZ[i] > 1 ? Math.min(3, brightZ[i]) : 0;
    score[i] = 1.0 * Math.min(loud, 6) + 0.6 * scream + 1.2 * Math.max(0, Math.min(chatZ[i], 8)) + 0.25 * kw10[i] + 0.8 * hype6[i];
  }
  const k3 = Math.round(3 / WIN), sTrail = smooth(score, k3);
  const sc = sTrail.map((_, i) => sTrail[Math.min(sTrail.length - 1, i + Math.floor(k3 / 2))]);
  // pick peaks
  const order = Array.from(sc.keys()).sort((a, b) => sc[b] - sc[a]);
  const sep = Math.max(20, minS) / WIN;
  const picks = [];
  for (const i of order) {
    if (sc[i] <= 0.5) break;
    if (picks.some((p) => Math.abs(p - i) < sep)) continue;
    picks.push(i);
    if (picks.length >= (+opts.top || 15)) break;
  }
  const dur = n * WIN;
  const cands = picks.map((i) => {
    const peak = i * WIN;
    // start at a pause in the talk about 10 s before the peak, end at a pause about 8 s after it
    const gaps = [];
    for (let k = 1; k < words.length; k++) if (words[k].s - words[k - 1].e > 0.6) gaps.push({ a: words[k - 1].e, b: words[k].s });
    const near = (lo, hi, want, pick) => { const c = gaps.filter((g) => g[pick] >= lo && g[pick] <= hi); if (!c.length) return null; return c.reduce((x, y) => (Math.abs(y[pick] - want) < Math.abs(x[pick] - want) ? y : x))[pick]; };
    let start = near(peak - 18, peak - 5, peak - 10, 'b');
    start = start != null ? start - 0.25 : peak - 10;
    let end = near(peak + 4, peak + 15, peak + 8, 'a');
    end = end != null ? end + 0.4 : peak + 8;
    start = Math.max(0, start); end = Math.min(dur, end);
    if (end - start < minS) { const pad = (minS - (end - start)) / 2; start = Math.max(0, start - pad); end = Math.min(dur, end + pad); }
    if (end - start > maxS) end = start + maxS;
    const inWin = (t) => t >= start && t <= end;
    const lo = Math.max(0, Math.floor(start / WIN)), hi = Math.min(n - 1, Math.ceil(end / WIN));
    let mx = { loud: 0, chat: 0, scream: 0 };
    for (let k = lo; k <= hi; k++) { mx.loud = Math.max(mx.loud, loudZ[k]); mx.chat = Math.max(mx.chat, chat10[k]); if (loudZ[k] > 2 && brightZ[k] > 1) mx.scream++; }
    const base = chatMsgs.length ? chatMsgs.length / Math.max(1, n) : 0;
    const chatX = base ? +(mx.chat / base).toFixed(1) : null;
    const tags = [];
    if (mx.loud > 3) tags.push('loud spike');
    if (mx.scream >= 2) tags.push('scream');
    if (chatX && chatX >= 3) tags.push(`chat x${Math.round(chatX)}`);
    const laughs = chatMsgs.filter((m) => inWin(m.t - off) && CHAT_LAUGH.test(m.text)).length;
    if (laughs >= 8) tags.push('laugh flood');
    const sample = chatMsgs.filter((m) => inWin(m.t - off) && m.text).slice(0, 400).sort((a, b) => (CHAT_HYPE.test(b.text) ? 1 : 0) - (CHAT_HYPE.test(a.text) ? 1 : 0)).slice(0, 6).map((m) => m.text.slice(0, 60));
    const said = words.filter((w) => inWin(w.s)).map((w) => w.w).join(' ');
    return { peak: +(peak + off).toFixed(1), start: +(start + off).toFixed(1), end: +(end + off).toFixed(1), score: +sc[i].toFixed(2), tags, chatX, chat: sample, said: said.slice(0, 600) };
  }).sort((a, b) => a.peak - b.peak).map((c, k) => Object.assign({ id: 'c' + String(k + 1).padStart(2, '0') }, c));
  const res = { source: src.meta && src.meta.title, duration: +dur.toFixed(1), chatMessages: chatMsgs.length, transcriptWords: words.length, candidates: cands };
  U.writeJSON(path.join(dir, 'candidates.json'), res);
  const md = [`# Moments in "${(src.meta && src.meta.title) || 'stream'}"`, '', `${cands.length} candidates · chat ${chatMsgs.length ? chatMsgs.length + ' messages' : 'not available'} · transcript ${words.length ? words.length + ' words' : 'not available'}`, '', '| id | time | len | score | signals | said |', '|---|---|---|---|---|---|'];
  for (const c of cands) md.push(`| ${c.id} | ${U.fmtTime(c.start)}–${U.fmtTime(c.end)} | ${(c.end - c.start).toFixed(0)}s | ${c.score} | ${c.tags.join(', ') || '—'} | ${c.said.slice(0, 90).replace(/\|/g, '/')} |`);
  fs.writeFileSync(path.join(dir, 'candidates.md'), md.join('\n') + '\n');
  return res;
}

module.exports = { audioFeatures, analyze, parseSubs, parseChat, WIN };
