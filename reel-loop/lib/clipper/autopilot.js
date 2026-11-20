'use strict';
/* Live autopilot: watches a live stream, finds the funny moments as they happen, cuts vertical clips
   and uploads them to TikTok (as drafts by default). Runs until stopped:
     node reel-loop/bin/loop.js clip auto <url>        (starts this file in the background)
   Signals: chat laugh floods (LUL, KEKW, OMEGALUL, 😂, 💀 …), chat speed, "clip it" calls, loudness spikes
   and screams. Optional: Claude judges each moment from frames + chat + words and writes the heading. */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const U = require('../util');
const A = require('./analyze');
const Chat = require('./chat');
const Judge = require('./judge');
const TT = require('./tiktok');
const STT = require('./transcribe');

const WIN = A.WIN;
const LAUGH = /\b(lul|lulw|kekw|omegalul|lmao+|lmfao|lol+|kek|icant|kekl|xd+|haha+|ahaha+|hahaha+|jaja+|lachflash|ded|dead)\b|💀|😂|🤣|😭|☠️/i;
const CLIPCALL = /\bclip\b|\bclipp?(ed|t)\b|📸/i;

const DEFAULTS = {
  url: '', permission: '', language: 'de', title: '',
  record: { tool: 'auto', quality: 'best[height<=1080]/best', segmentSeconds: 30, keepMinutes: 60, waitForLive: true },
  detect: { threshold: 6, minLaughs: 5, chatLagSeconds: 4, pre: 12, post: 8, minSeconds: 15, maxSeconds: 40, cooldownSeconds: 45, holdbackSeconds: 15 },
  judge: { mode: 'auto', model: 'claude-opus-5-5', minScore: 7, effort: 'low' },
  clip: { layout: 'E', cam: '', focus: 0.5, heading: 'box', captions: 'auto' },
  post: { streamer: '', platform: '', hashtags: ['gta6', 'gta', 'gaming'], credit: '🎥 @{streamer} on {platform}', adLabel: '' },
  upload: { mode: 'draft', privacy: 'SELF_ONLY', review: false, maxPerDay: 8, minGapMinutes: 20 },
  notify: { webhook: '' },
  simulate: null,
};
function merge(a, b) {
  const o = Object.assign({}, a);
  for (const k of Object.keys(b || {})) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object' ? merge(a[k], b[k]) : b[k];
  return o;
}
function loadConfig(dir) { return merge(DEFAULTS, U.readJSON(path.join(dir, 'autopilot.json'), {})); }
const median = (arr) => { if (!arr.length) return 0; const s = arr.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
function robust(arr) { const vals = arr.filter((v) => v != null && isFinite(v)); const med = median(vals); const mad = median(vals.map((v) => Math.abs(v - med))); return { med, mad, n: vals.length }; }

async function run(dir) {
  const cfg = loadConfig(dir);
  const sim = cfg.simulate && cfg.simulate.file ? cfg.simulate : null;
  const speed = sim ? Number(sim.speed || 1) : 1;
  const platform = cfg.post.platform || (sim ? 'stream' : Chat.platformFromUrl(cfg.url));
  const recDir = U.ensureDir(path.join(dir, 'rec'));
  const workDir = U.ensureDir(path.join(dir, 'work'));
  const outDir = U.ensureDir(path.join(dir, 'out'));
  const framesDir = U.ensureDir(path.join(dir, 'frames'));
  const statePath = path.join(dir, 'state.json');
  const prev = U.readJSON(statePath, {});
  const S = {
    startedAt: new Date().toISOString(), runs: [], segs: [], db: [], bright: [], chat: [], pairs: [],
    analyzedUntil: 0, lastPeak: -1e9, moments: prev.moments || [], uploads: prev.uploads || [], counter: (prev.moments || []).length,
    recorder: null, chatReader: null, stopping: false, simDone: false, busy: false, chatTotal: 0,
  };
  const log = (m) => console.log(`${new Date().toISOString().slice(11, 19)} ${m}`);
  const notify = async (m) => {
    log('» ' + m);
    if (!cfg.notify.webhook) return;
    try { await fetch(cfg.notify.webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: m, text: m }) }); } catch (e) { log('notify failed: ' + e.message); }
  };
  const save = () => U.writeJSON(statePath, {
    url: cfg.url, platform, startedAt: S.startedAt, updatedAt: new Date().toISOString(), pid: process.pid,
    recordedSeconds: S.segs.length ? +S.segs[S.segs.length - 1].end.toFixed(1) : 0, chatMessages: S.chatTotal,
    judge: judgeMode(), upload: cfg.upload.mode + (cfg.upload.review ? ' (review)' : ''),
    moments: S.moments, uploads: S.uploads,
  });
  function judgeMode() { return cfg.judge.mode === 'auto' ? (Judge.hasClaudeCredentials() ? 'claude' : 'heuristic') : cfg.judge.mode; }

  fs.writeFileSync(path.join(dir, 'autopilot.pid'), String(process.pid));
  log(`autopilot started for ${sim ? 'simulation ' + sim.file + ' at ' + speed + 'x' : cfg.url} · judge ${judgeMode()} · upload ${cfg.upload.mode}${cfg.upload.review ? ' with review' : ''}`);

  /* ---------- recording ---------- */
  function startRecorder() {
    if (S.stopping) return;
    const last = S.segs[S.segs.length - 1];
    const gap = last ? Math.max(0, (Date.now() - last.wall) / 1000) : 0;
    const runInfo = { idx: S.runs.length + 1, offset: last ? last.end + gap : 0, seen: 0 };
    runInfo.csv = path.join(recDir, `r${runInfo.idx}.csv`);
    S.runs.push(runInfo);
    const seg = ['-map', '0:v:0?', '-map', '0:a:0?', '-c', 'copy', '-f', 'segment', '-segment_time', String(cfg.record.segmentSeconds), '-reset_timestamps', '1', '-segment_list', runInfo.csv, '-segment_list_type', 'csv', path.join(recDir, `r${runInfo.idx}_%05d.ts`)];
    let ff, src = null;
    if (sim) {
      ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-readrate', String(speed), '-i', path.resolve(sim.file), ...seg], { stdio: ['ignore', 'ignore', 'pipe'] });
    } else {
      const useSL = cfg.record.tool === 'streamlink' || (cfg.record.tool === 'auto' && U.which('streamlink'));
      src = useSL
        ? spawn('streamlink', ['--stdout', ...(platform === 'Twitch' ? ['--twitch-disable-ads'] : []), cfg.url, cfg.record.streamlinkQuality || '1080p60,1080p,720p60,best'], { stdio: ['ignore', 'pipe', 'pipe'] })
        : spawn('yt-dlp', ['--no-warnings', '--no-part', '-f', cfg.record.quality, '--hls-use-mpegts', '-o', '-', cfg.url], { stdio: ['ignore', 'pipe', 'pipe'] });
      ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', ...seg], { stdio: ['pipe', 'ignore', 'pipe'] });
      src.stdout.pipe(ff.stdin);
      ff.stdin.on('error', () => {});
      src.stderr.on('data', (d) => { const s = String(d).trim(); if (/error|offline|not currently live|no playable/i.test(s)) log('recorder: ' + s.split('\n').pop().slice(0, 200)); });
      src.on('close', () => { try { ff.stdin.end(); } catch (e) { /* closed */ } });
    }
    ff.stderr.on('data', (d) => log('ffmpeg: ' + String(d).trim().slice(0, 200)));
    S.recorder = { ff, src };
    log(`recording run ${runInfo.idx}${runInfo.offset ? ' from ' + U.fmtTime(runInfo.offset) : ''}`);
    ff.on('close', (code) => {
      S.recorder = null;
      if (S.stopping) return;
      if (sim) { log('simulated stream ended'); S.simDone = true; return; }
      log(`recorder stopped (${code}); the stream may be offline. Trying again in 30 s`);
      if (cfg.record.waitForLive !== false) setTimeout(startRecorder, 30000);
    });
  }

  async function readSegments() {
    for (const r of S.runs) {
      if (!fs.existsSync(r.csv)) continue;
      const lines = fs.readFileSync(r.csv, 'utf8').split('\n').filter((l) => l.trim());
      for (let k = r.seen; k < lines.length; k++) {
        const [name, a, b] = lines[k].split(',');
        const file = path.join(recDir, path.basename(name));
        if (!fs.existsSync(file)) continue;
        const sg = { file, start: +(r.offset + Number(a)).toFixed(3), end: +(r.offset + Number(b)).toFixed(3), wall: Date.now() };
        S.segs.push(sg);
        S.pairs.push([sg.wall, sg.end]); if (S.pairs.length > 20) S.pairs.shift();
        try {
          const f = await A.audioFeatures(file);
          const i0 = Math.round(sg.start / WIN);
          f.db.forEach((v, j) => { S.db[i0 + j] = v; });
          f.bright.forEach((v, j) => { S.bright[i0 + j] = v; });
        } catch (e) { log('audio analysis failed for ' + path.basename(file) + ': ' + e.message); }
        r.seen = k + 1;
      }
    }
  }

  /* ---------- chat ---------- */
  function onChat(m) { S.chat.push(m); S.chatTotal++; if (S.chat.length > 60000) S.chat.splice(0, 20000); }
  if (sim && sim.chat) S.chatReader = Chat.simChat(path.resolve(sim.chat), speed, onChat);
  else if (!sim && platform === 'Twitch' && Chat.twitchChannel(cfg.url)) S.chatReader = Chat.twitchChat(Chat.twitchChannel(cfg.url), onChat, log);
  else if (!sim && platform === 'YouTube' && U.which('yt-dlp')) S.chatReader = Chat.youtubeChat(cfg.url, path.join(dir, 'ytchat.live_chat.json'), onChat, log);
  else log(`no live chat for ${platform}: moments come from the audio${judgeMode() === 'claude' ? ' and Claude' : ''}`);
  const chatAvailable = () => !!S.chatReader;
  function chatTime(m) {
    const lag = cfg.detect.chatLagSeconds;
    if (m.st != null) return m.st - lag;
    if (!S.pairs.length) return null;
    const off = median(S.pairs.map(([w, e]) => w - e * 1000));
    return (m.wall - off) / 1000 - lag;
  }

  /* ---------- detection ---------- */
  function detect() {
    const recEnd = S.segs.length ? S.segs[S.segs.length - 1].end : 0;
    const until = recEnd - cfg.detect.holdbackSeconds;
    if (until <= S.analyzedUntil + 2) return;
    const i0 = Math.floor(S.analyzedUntil / WIN), i1 = Math.floor(until / WIN);
    const lo = Math.max(0, i0 - 600), hi = i1 + 40;
    const msgs = new Float32Array(hi - lo), laughs = new Float32Array(hi - lo), clips = new Float32Array(hi - lo);
    for (const m of S.chat) {
      const t = chatTime(m); if (t == null) continue;
      const i = Math.floor(t / WIN) - lo; if (i < 0 || i >= msgs.length) continue;
      msgs[i]++; if (LAUGH.test(m.text)) laughs[i]++; if (CLIPCALL.test(m.text)) clips[i]++;
    }
    const sum10 = (arr, i) => { let s = 0; for (let k = i - 10; k < i + 10; k++) if (k >= 0 && k < arr.length) s += arr[k]; return s; };
    const hist = [];
    for (let i = lo; i < Math.max(lo + 1, i0); i += 4) hist.push(i);
    const pool = hist.length >= 30 ? hist : Array.from({ length: i1 - lo }, (_, k) => lo + k);
    const bDb = robust(pool.map((i) => S.db[i]));
    const bBr = robust(pool.map((i) => S.bright[i]));
    const bMsg = robust(pool.map((i) => sum10(msgs, i - lo)));
    const bLau = robust(pool.map((i) => sum10(laughs, i - lo)));
    const cands = [];
    for (let i = i0; i < i1; i++) {
      const db = S.db[i]; if (db == null) continue;
      const dbZ = (db - bDb.med) / (1.4826 * bDb.mad + 0.5);
      const brZ = S.bright[i] != null ? (S.bright[i] - bBr.med) / (1.4826 * bBr.mad + 0.02) : 0;
      const L = sum10(laughs, i - lo), M = sum10(msgs, i - lo), K = sum10(clips, i - lo);
      const lauZ = (L - bLau.med) / (1.4826 * bLau.mad + 1), msgZ = (M - bMsg.med) / (1.4826 * bMsg.mad + 1);
      const scream = dbZ > 2 && brZ > 1;
      const F = 1.6 * Math.min(Math.max(lauZ, 0), 8) + 0.6 * Math.min(Math.max(msgZ, 0), 8) + 0.8 * Math.min(Math.max(dbZ, 0), 6) + (scream ? 1.5 : 0) + Math.min(K, 4);
      const ok = chatAvailable() ? L >= cfg.detect.minLaughs || K >= 2 : dbZ >= 3;
      if (F >= cfg.detect.threshold && ok) cands.push({ i, F, L, M, K, dbZ, scream, chatX: bMsg.med > 0 ? M / bMsg.med : null });
    }
    cands.sort((a, b) => b.F - a.F);
    const picked = [];
    for (const c of cands) {
      const t = c.i * WIN;
      if (Math.abs(t - S.lastPeak) < cfg.detect.cooldownSeconds || picked.some((p) => Math.abs(p.i * WIN - t) < cfg.detect.cooldownSeconds)) continue;
      picked.push(c);
    }
    picked.sort((a, b) => a.i - b.i);
    for (const c of picked) {
      const peak = c.i * WIN;
      S.lastPeak = Math.max(S.lastPeak, peak);
      const signals = [];
      if (c.L >= cfg.detect.minLaughs) signals.push(`laugh flood (${c.L} laughs in 10 s)`);
      if (c.chatX && c.chatX >= 2) signals.push(`chat x${c.chatX.toFixed(1)}`);
      if (c.K) signals.push(`${c.K} "clip it" calls`);
      if (c.scream) signals.push('scream'); else if (c.dbZ >= 3) signals.push('loud spike');
      const kind = c.L >= cfg.detect.minLaughs ? 'laugh' : c.scream ? 'scream' : 'loud';
      const start = Math.max(0, peak - cfg.detect.pre), end = Math.min(recEnd, peak + cfg.detect.post);
      const id = 'm' + String(++S.counter).padStart(3, '0');
      S.moments.push({ id, peak: +peak.toFixed(1), start: +start.toFixed(1), end: +end.toFixed(1), score: +c.F.toFixed(2), kind, signals, status: 'new', foundAt: new Date().toISOString() });
      log(`moment ${id} at ${U.fmtTime(peak)} · score ${c.F.toFixed(1)} · ${signals.join(', ')}`);
    }
    S.analyzedUntil = until;
  }

  /* ---------- per moment: cut, judge, render, upload ---------- */
  async function sourceFor(m) {
    const segs = S.segs.filter((s) => s.end > m.start - 0.5 && s.start < m.end + 0.5);
    if (!segs.length) throw new Error('no recording covers this moment');
    const joined = path.join(workDir, `${m.id}.ts`);
    if (segs.length === 1) fs.copyFileSync(segs[0].file, joined);
    else {
      const list = path.join(workDir, `${m.id}.txt`);
      fs.writeFileSync(list, segs.map((s) => `file '${s.file.replace(/'/g, "'\\''")}'`).join('\n'));
      await U.ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);
    }
    const base = segs[0].start;
    return { file: joined, ss: Math.max(0, m.start - base), to: m.end - base, peak: m.peak - base };
  }
  function chatDuring(m) { return S.chat.filter((x) => { const t = chatTime(x); return t != null && t >= m.start && t <= m.end; }).map((x) => x.text).filter(Boolean); }
  function todayUploads() { const d = new Date().toDateString(); return S.uploads.filter((u) => new Date(u.at).toDateString() === d).length; }
  function canUploadNow() {
    if (todayUploads() >= cfg.upload.maxPerDay) return false;
    const last = S.uploads[S.uploads.length - 1];
    return !last || Date.now() - new Date(last.at).getTime() >= cfg.upload.minGapMinutes * 60000;
  }

  async function processMoment(m) {
    m.status = 'cutting';
    const src = await sourceFor(m);
    const dur = src.to - src.ss;
    const frames = [0.15, 0.4, 0.62, 0.88].map((f, k) => ({ t: src.ss + dur * f, file: path.join(workDir, `${m.id}-${k + 1}.jpg`) }));
    for (const f of frames) await U.ffmpeg(['-ss', String(f.t), '-i', src.file, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', f.file], { allowFail: true });
    const have = frames.filter((f) => fs.existsSync(f.file)).map((f) => f.file);
    if (have.length) {
      const fc = have.map((_, i) => `[${i}:v]scale=480:270:force_original_aspect_ratio=decrease,pad=480:270:(ow-iw)/2:(oh-ih)/2[p${i}]`).join(';') + ';' + have.map((_, i) => `[p${i}]`).join('') + `hstack=inputs=${have.length}`;
      await U.ffmpeg([...have.flatMap((f) => ['-i', f]), '-filter_complex', fc, '-q:v', '4', path.join(framesDir, `${m.id}.jpg`)], { allowFail: true });
    }
    let words = null;
    if (cfg.clip.captions !== 'off') {
      try { words = await STT.transcribe(src.file, src.ss, src.to, cfg.language); } catch (e) { log(`${m.id}: transcription failed: ${e.message}`); }
    }
    const chat = chatDuring(m);
    m.chatSample = chat.slice(0, 8);
    let verdict;
    const mode = judgeMode();
    if (mode === 'claude') {
      try {
        verdict = await Judge.claudeJudge({ frames: have, chat, words: words ? words.map((w) => w.w).join(' ') : '', signals: m.signals, duration: dur, streamer: cfg.post.streamer, platform, title: cfg.title }, Object.assign({ language: cfg.language }, cfg.judge));
        m.judge = 'claude';
      } catch (e) { log(`${m.id}: Claude judge failed (${e.message}); using the score alone`); }
    }
    if (!verdict) {
      verdict = { post: true, safe: true, funny: Math.min(10, Math.round(m.score)), kind: m.kind, heading: Judge.templateHeading(m.kind, cfg.language, S.counter), caption: '', reason: m.signals.join(', '), start_offset: 0, end_offset: 0 };
      m.judge = 'heuristic';
    }
    Object.assign(m, { funny: verdict.funny, heading: verdict.heading, caption: verdict.caption, reason: verdict.reason, momentKind: verdict.kind });
    const minScore = cfg.judge.minScore;
    if (!(verdict.post && verdict.safe !== false && (m.judge === 'heuristic' || verdict.funny >= minScore))) {
      m.status = 'rejected';
      log(`${m.id}: not posted — ${verdict.reason}`);
      return;
    }
    let ss = src.ss + Math.min(6, Math.max(0, Number(verdict.start_offset) || 0));
    let to = src.to - Math.min(6, Math.max(0, Number(verdict.end_offset) || 0));
    if (to - ss < cfg.detect.minSeconds) { ss = src.ss; to = Math.min(src.to, ss + Math.max(cfg.detect.minSeconds, src.to - src.ss)); }
    if (to - ss > cfg.detect.maxSeconds) to = ss + cfg.detect.maxSeconds;
    m.status = 'rendering';
    const out = path.join(outDir, `${m.id}-${U.slugify(m.heading || m.id).slice(0, 40)}.mp4`);
    const C = require('./index');
    const cam = cfg.clip.cam ? String(cfg.clip.cam).split(',').map(Number) : null;
    const layout = ['A', 'C', 'D'].includes(String(cfg.clip.layout).toUpperCase()) && !cam ? 'E' : cfg.clip.layout;
    const r = await C.renderClip({ id: m.id, file: src.file, ss, to, peak: src.peak, layout, cam, focus: cfg.clip.focus, heading: m.heading, headingStyle: cfg.clip.heading,
      words, wordsOffset: ss, out, workDir });
    const text = C.postText({ meta: { uploader: cfg.post.streamer, extractor_key: platform } }, Object.assign({}, cfg.post, { platform }), m.heading, m.caption);
    fs.writeFileSync(out.replace(/\.mp4$/, '.txt'), text);
    Object.assign(m, { file: path.relative(dir, out), seconds: r.seconds, status: 'ready' });
    fs.rmSync(src.file, { force: true });
    log(`${m.id}: clip ready (${r.seconds}s) "${m.heading}"`);
    await afterRender(m);
  }

  async function afterRender(m) {
    if (cfg.upload.mode === 'none') { m.status = 'saved'; await notify(`🎬 ${m.id} saved: "${m.heading}" → ${m.file}`); return; }
    if (cfg.upload.review) { m.status = 'waiting'; await notify(`🎬 ${m.id} ready for your OK: "${m.heading}" → ${m.file}  (approve: clip auto-approve ${path.relative(process.cwd(), dir)} ${m.id})`); return; }
    m.status = 'queued';
    await uploadQueued();
  }

  async function uploadOne(m) {
    m.status = 'uploading';
    const file = path.join(dir, m.file);
    const title = fs.readFileSync(file.replace(/\.mp4$/, '.txt'), 'utf8').trim();
    try {
      const r = await TT.upload(file, { mode: cfg.upload.mode, title, privacy: cfg.upload.privacy, seconds: m.seconds });
      Object.assign(m, { status: 'uploaded', tiktok: { mode: r.mode, status: r.status, publish_id: r.publish_id, postIds: r.postIds }, uploadedAt: new Date().toISOString() });
      S.uploads.push({ id: m.id, at: m.uploadedAt });
      await notify(`✅ ${m.id} on TikTok (${r.mode === 'draft' ? 'draft in your inbox — tap Post' : r.status}): "${m.heading}"`);
    } catch (e) {
      Object.assign(m, { status: 'upload-failed', error: e.message });
      await notify(`⚠️ ${m.id} upload failed: ${e.message}`);
    }
  }
  async function uploadQueued() {
    const q = S.moments.filter((x) => x.status === 'queued' || x.status === 'approved');
    for (const m of q) { if (!canUploadNow()) { if (!m.waitLogged) { log(`${m.id}: waiting for the daily limit / gap between posts`); m.waitLogged = true; } return; } await uploadOne(m); }
  }
  function pickApprovals() {
    const adir = path.join(dir, 'approve');
    if (!fs.existsSync(adir)) return;
    for (const f of fs.readdirSync(adir)) {
      const m = S.moments.find((x) => x.id === f && x.status === 'waiting');
      if (m) { m.status = 'approved'; log(`${m.id}: approved`); }
      fs.rmSync(path.join(adir, f), { force: true });
    }
  }

  function cleanup() {
    const recEnd = S.segs.length ? S.segs[S.segs.length - 1].end : 0;
    const keepFrom = recEnd - cfg.record.keepMinutes * 60;
    const pending = S.moments.filter((m) => ['new', 'cutting'].includes(m.status));
    S.segs = S.segs.filter((s) => {
      if (s.end >= keepFrom || pending.some((m) => s.end > m.start - 5 && s.start < m.end + 5)) return true;
      fs.rmSync(s.file, { force: true });
      return false;
    });
  }

  /* ---------- main loop ---------- */
  const shutdown = (why) => {
    if (S.stopping) return;
    S.stopping = true;
    log(`stopping (${why})`);
    try { if (S.chatReader) S.chatReader.stop(); } catch (e) { /* */ }
    try { if (S.recorder) { if (S.recorder.src) S.recorder.src.kill('SIGTERM'); S.recorder.ff.kill('SIGTERM'); } } catch (e) { /* */ }
    save();
    fs.rmSync(path.join(dir, 'autopilot.pid'), { force: true });
    setTimeout(() => process.exit(0), 1500);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  if (!cfg.permission && !sim) { log('refusing to start: autopilot.json has no "permission" (who allowed you to clip this channel)'); process.exit(2); }
  startRecorder();
  while (!S.stopping) {
    await new Promise((r) => setTimeout(r, sim ? 1000 : 3000));
    try {
      await readSegments();
      if (S.simDone) { cfg.detect.holdbackSeconds = 0; }
      detect();
      pickApprovals();
      if (!S.busy) {
        const m = S.moments.find((x) => x.status === 'new');
        if (m) {
          S.busy = true;
          processMoment(m).catch((e) => { m.status = 'failed'; m.error = e.message; log(`${m.id} failed: ${e.message}`); }).finally(() => { S.busy = false; save(); });
        } else await uploadQueued();
      }
      cleanup();
      save();
      if (S.simDone && !S.busy && !S.moments.some((x) => ['new', 'cutting', 'rendering', 'uploading'].includes(x.status))) {
        const recEnd = S.segs.length ? S.segs[S.segs.length - 1].end : 0;
        if (S.analyzedUntil >= recEnd - 0.5) { shutdown('simulation finished'); }
      }
    } catch (e) { log('loop error: ' + (e.stack || e.message)); }
  }
}

/* For the CLI: a readable summary of a running or finished autopilot folder. */
function summary(dir) {
  const st = U.readJSON(path.join(dir, 'state.json'), null);
  const pidf = path.join(dir, 'autopilot.pid');
  let alive = false;
  if (U.exists(pidf)) { try { process.kill(parseInt(fs.readFileSync(pidf, 'utf8'), 10), 0); alive = true; } catch (e) { alive = false; } }
  return { alive, st };
}

module.exports = { run, summary, DEFAULTS, loadConfig };

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error('usage: autopilot.js <dir>'); process.exit(1); }
  run(path.resolve(dir)).catch((e) => { console.error(e.stack || e.message); process.exit(1); });
}
