'use strict';
/* Stream clipper: paste a YouTube, Twitch or Kick link (live or finished) or a local file,
   find the moments, pick, and get finished vertical clips with heading, captions and credit. */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const U = require('../util');
const A = require('./analyze');

const LAYOUTS = `
  A  Streamer on top, game below      B  The whole stream (blurred fill)   C  Game on top, streamer below
  ┌────────────┐                      ┌────────────┐                       ┌────────────┐
  │  STREAMER  │                      │  heading   │                       │            │
  ├──[heading]─┤                      │░░░░░░░░░░░░│                       │    GAME    │
  │            │                      │ ▣ stream ▣ │                       ├──[heading]─┤
  │    GAME    │                      │░░░░░░░░░░░░│                       │  STREAMER  │
  └────────────┘                      └────────────┘                       └────────────┘
  D  Full game, streamer card          E  Game only
  ┌────────────┐                      ┌────────────┐
  │  heading   │                      │  heading   │
  │      ┌───┐ │                      │            │
  │ GAME │cam│ │                      │    GAME    │
  │      └───┘ │                      │            │
  └────────────┘                      └────────────┘
  A, C and D need the facecam position: --cam x,y,w,h as fractions of the frame (e.g. 0.72,0.05,0.26,0.3).
`;

function clipsRoot() { return path.resolve(process.env.REEL_CLIPS || path.join(process.cwd(), 'clips')); }
function needYtdlp() { if (!U.which('yt-dlp')) U.fail('yt-dlp is needed for links (about 3 MB): pip install yt-dlp  (or brew/winget install yt-dlp)'); }
function platformOf(meta) {
  const k = String((meta && (meta.extractor_key || meta.extractor)) || '').toLowerCase();
  if (k.includes('twitch')) return 'Twitch'; if (k.includes('kick')) return 'Kick'; if (k.includes('youtube')) return 'YouTube'; return meta && meta.extractor_key ? meta.extractor_key : 'stream';
}
function parseRange(r) { if (!r) return null; const [a, b] = String(r).split('-'); return { a: U.parseTime(a) || 0, b: b ? U.parseTime(b) : null }; }

/* ---------- fetch ---------- */
async function fetchSource(input, opts = {}) {
  const isFile = U.exists(path.resolve(input));
  const range = parseRange(opts.range);
  let meta = {}, dir;
  if (isFile) {
    const file = path.resolve(input);
    const info = await U.probe(file);
    meta = { title: path.basename(file, path.extname(file)), duration: parseFloat(info.format.duration), uploader: opts.streamer || '', extractor_key: 'file' };
    dir = U.ensureDir(path.resolve(opts.out || path.join(clipsRoot(), U.slugify(meta.title))));
    const src = { input: file, kind: 'file', video: file, audio: null, offset: range ? range.a : 0, meta };
    if (range) {
      U.step('Cutting the audio range for analysis');
      await U.ffmpeg(['-ss', String(range.a), ...(range.b ? ['-to', String(range.b)] : []), '-i', file, '-vn', '-ac', '1', '-c:a', 'aac', path.join(dir, 'audio.m4a')]);
      src.audio = 'audio.m4a';
    }
    for (const f of fs.readdirSync(path.dirname(file))) {
      const base = path.basename(file, path.extname(file));
      if (f.startsWith(base) && /\.(json3|vtt)$/.test(f)) { fs.copyFileSync(path.join(path.dirname(file), f), path.join(dir, f)); src.subs = f; }
      if (f.startsWith(base) && /(live_chat|rechat|chat)\.json$/.test(f)) { fs.copyFileSync(path.join(path.dirname(file), f), path.join(dir, f)); src.chat = f; }
    }
    U.writeJSON(path.join(dir, 'source.json'), src);
    return { dir, src };
  }
  needYtdlp();
  U.step('Reading the stream info');
  const j = await U.run('yt-dlp', ['-J', '--no-warnings', '--no-playlist', input]);
  const m = JSON.parse(j.stdout.toString());
  meta = { title: m.title, uploader: m.uploader || m.channel || m.uploader_id, channel: m.channel, duration: m.duration, is_live: !!m.is_live, extractor_key: m.extractor_key, webpage_url: m.webpage_url || input, id: m.id };
  if (meta.is_live) U.warn('This stream is live right now. For live clipping use: clip live <url> --every 12');
  dir = U.ensureDir(path.resolve(opts.out || path.join(clipsRoot(), U.slugify(`${meta.uploader || ''}-${meta.title || meta.id}`))));
  const sec = range ? ['--download-sections', `*${range.a}-${range.b != null ? range.b : 'inf'}`] : [];
  U.step('Downloading only the audio (not the whole video) to find the moments');
  await U.run('yt-dlp', ['--no-warnings', '--no-playlist', '-f', 'bestaudio/best[height<=360]/worst', ...sec, '-o', path.join(dir, 'audio.%(ext)s'), input], { onStderr: () => {} });
  const audio = fs.readdirSync(dir).find((f) => f.startsWith('audio.'));
  U.step('Getting subtitles and chat replay, if the platform has them');
  await U.run('yt-dlp', ['--no-warnings', '--no-playlist', '--skip-download', '--write-subs', '--write-auto-subs', '--sub-langs', 'en.*,de.*,live_chat,rechat', '--sub-format', 'json3/vtt/best', '-o', path.join(dir, 'subs.%(ext)s'), input], { allowFail: true });
  const files = fs.readdirSync(dir);
  const chat = files.find((f) => /^subs\.(live_chat|rechat)\.json/.test(f));
  const subs = files.find((f) => /^subs\.(en|de)[^.]*\.json3$/.test(f)) || files.find((f) => /^subs\.(en|de)[^.]*\.vtt$/.test(f)) || files.find((f) => /^subs\..*\.(json3|vtt)$/.test(f) && !/live_chat|rechat/.test(f));
  const src = { input, kind: 'url', audio, offset: range ? range.a : 0, meta, chat: chat || null, subs: subs || null };
  U.writeJSON(path.join(dir, 'source.json'), src);
  return { dir, src };
}

/* ---------- analyze ---------- */
async function analyzeDir(dir, opts) {
  const src = U.readJSON(path.join(dir, 'source.json'));
  const audioFile = src.audio ? path.join(dir, src.audio) : src.video;
  U.step('Listening for screams, spikes and chat explosions');
  const feats = await A.audioFeatures(audioFile);
  return A.analyze(dir, feats, opts);
}

/* ---------- frames & pick list ---------- */
async function sectionFile(dir, src, c, quality) {
  if (src.kind === 'file') return { file: src.video, ss: c.start, to: c.end, base: 0 };
  if (src.kind === 'live') return liveSection(dir, src, c);
  needYtdlp();
  const sub = U.ensureDir(path.join(dir, quality === 'hq' ? 'src' : 'preview'));
  const pre = `${c.id}-${quality}`;
  let f = fs.readdirSync(sub).find((x) => x.startsWith(pre + '.'));
  if (!f) {
    const fmt = quality === 'hq' ? 'bv*[height<=1080]+ba/b[height<=1080]/b' : 'bv*[height<=360]/b[height<=360]/worst';
    const args = ['--no-warnings', '--no-playlist', '-f', fmt, '--download-sections', `*${c.start}-${c.end}`, '-o', path.join(sub, pre + '.%(ext)s')];
    if (quality === 'hq') args.push('--force-keyframes-at-cuts', '--merge-output-format', 'mp4');
    await U.run('yt-dlp', [...args, src.input]);
    f = fs.readdirSync(sub).find((x) => x.startsWith(pre + '.') && !x.endsWith('.part'));
  }
  return { file: path.join(sub, f), ss: 0, to: c.end - c.start, base: c.start };
}

async function frames(dir, opts = {}) {
  const src = U.readJSON(path.join(dir, 'source.json'));
  const cj = U.readJSON(path.join(dir, 'candidates.json'));
  const fdir = U.ensureDir(path.join(dir, 'frames'));
  const top = cj.candidates.slice().sort((a, b) => b.score - a.score).slice(0, +opts.top || 12).sort((a, b) => a.peak - b.peak);
  const lines = [`# Pick list — ${cj.source || ''}`, '', 'Look at each strip (start · peak · end), read the game screen and the words, write a heading, then cut the ones worth posting.', ''];
  for (const c of top) {
    const s = await sectionFile(dir, src, c, 'lo');
    const ts = [c.start + (c.end - c.start) * 0.2, c.peak, c.end - (c.end - c.start) * 0.15].map((t) => Math.max(0, t - s.base));
    const parts = [];
    for (let k = 0; k < 3; k++) {
      const out = path.join(fdir, `${c.id}-${k + 1}.jpg`);
      await U.ffmpeg(['-ss', String(ts[k]), '-i', s.file, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '3', out], { allowFail: true });
      if (U.exists(out)) parts.push(out);
    }
    if (parts.length) {
      const strip = path.join(fdir, `${c.id}.jpg`);
      const fc = parts.map((_, i) => `[${i}:v]scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2[p${i}]`).join(';') + ';' + parts.map((_, i) => `[p${i}]`).join('') + `hstack=inputs=${parts.length}`;
      await U.ffmpeg([...parts.flatMap((p) => ['-i', p]), '-filter_complex', fc, '-q:v', '3', strip]);
      parts.forEach((p) => fs.rmSync(p, { force: true }));
    }
    lines.push(`## ${c.id} · ${U.fmtTime(c.start)}–${U.fmtTime(c.end)} · score ${c.score}`, '', `![${c.id}](frames/${c.id}.jpg)`, '', `- signals: ${c.tags.join(', ') || '—'}${c.chat.length ? ` · chat: ${c.chat.slice(0, 4).map((x) => `“${x}”`).join(' ')}` : ''}`, `- said: ${c.said ? c.said.slice(0, 280) : '—'}`, '- heading: ', '');
  }
  fs.writeFileSync(path.join(dir, 'picklist.md'), lines.join('\n'));
  if (!U.exists(path.join(dir, 'headings.json'))) {
    const h = {}; top.forEach((c) => { h[c.id] = { heading: '', start: c.start, end: c.end }; });
    U.writeJSON(path.join(dir, 'headings.json'), h);
  }
  return { list: path.join(dir, 'picklist.md'), frames: top.map((c) => path.join(fdir, `${c.id}.jpg`)) };
}

/* ---------- heading picture ---------- */
async function renderHeadings(items, outDir, styleName) {
  if (!items.length) return {};
  const browser = await U.launchBrowser();
  const res = {};
  try {
    const ctx = await browser.newContext({ viewport: { width: 1080, height: 700 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const fontFile = path.join(U.ROOT, 'node_modules', '@fontsource', 'inter', 'files', 'inter-latin-900-normal.woff2');
    const face = U.exists(fontFile) ? `@font-face{font-family:'H';font-weight:900;src:url(data:font/woff2;base64,${fs.readFileSync(fontFile).toString('base64')}) format('woff2')}` : '';
    for (const it of items) {
      const esc = String(it.text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
      const box = styleName !== 'outline';
      const css = box
        ? '#h{display:inline-block;max-width:940px;background:#fff;color:#111;font:900 64px/1.1 H,Inter,Arial,sans-serif;padding:22px 34px 26px;border-radius:24px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.35)}'
        : '#h{display:inline-block;max-width:980px;color:#fff;font:900 80px/1.05 H,Inter,Arial,sans-serif;text-transform:uppercase;text-align:center;text-shadow:0 0 2px #000,5px 0 0 #000,-5px 0 0 #000,0 5px 0 #000,0 -5px 0 #000,4px 4px 0 #000,-4px 4px 0 #000,4px -4px 0 #000,-4px -4px 0 #000,0 10px 24px rgba(0,0,0,.5)}';
      await page.setContent(`<html><head><style>${face}html,body{margin:0;background:transparent}#w{width:1080px;display:flex;justify-content:center;padding:24px 0}${css}#h .e{font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji'}</style></head><body><div id="w"><div id="h">${esc}</div></div></body></html>`);
      await page.evaluate(async () => { await document.fonts.ready; const h = document.getElementById('h'); let s = parseFloat(getComputedStyle(h).fontSize); while (h.offsetHeight > 330 && s > 34) { s -= 3; h.style.fontSize = s + 'px'; } });
      const file = path.join(outDir, `${it.id}-heading.png`);
      await (await page.$('#w')).screenshot({ path: file, omitBackground: true });
      const dims = await page.evaluate(() => { const r = document.getElementById('w').getBoundingClientRect(); return { w: r.width, h: r.height }; });
      res[it.id] = { file, h: Math.round(dims.h) };
    }
  } finally { await browser.close(); }
  return res;
}

/* ---------- word-by-word captions (ASS) ---------- */
function assTime(t) { t = Math.max(0, t); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`; }
function buildAss(words, offset, dur, file) {
  const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Cap,Inter,82,&H00FFFFFF,&H0000E5FF,&H00000000,&H78000000,-1,0,0,0,100,100,0,0,1,7,3,2,70,70,500,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const ws = words.map((w) => ({ w: w.w.replace(/[{}\\]/g, '').toUpperCase(), s: w.s - offset, e: w.e - offset })).filter((w) => w.e > 0 && w.s < dur && w.w.trim());
  const ev = [];
  for (let i = 0; i < ws.length; i += 3) {
    const ch = ws.slice(i, i + 3);
    ch.forEach((w, k) => {
      const st = w.s, en = k < ch.length - 1 ? ch[k + 1].s : Math.min(w.e + 0.35, ws[i + 3] ? ws[i + 3].s : w.e + 0.35);
      if (en <= st) return;
      const txt = ch.map((x, j) => (j === k ? `{\\c&H0000E5FF&}${x.w}{\\c&H00FFFFFF&}` : x.w)).join(' ');
      ev.push(`Dialogue: 0,${assTime(st)},${assTime(en)},Cap,,0,0,0,,${txt}`);
    });
  }
  fs.writeFileSync(file, head + ev.join('\n') + '\n');
  return ev.length;
}

/* ---------- cut ---------- */
async function cropDetect(file, ss) {
  const r = await U.run('ffmpeg', ['-hide_banner', '-nostats', '-ss', String(ss + 0.5), '-t', '4', '-i', file, '-vf', 'cropdetect=24:2:0', '-f', 'null', '-'], { allowFail: true });
  const all = [...r.stderr.matchAll(/crop=(\d+):(\d+):(\d+):(\d+)/g)];
  if (!all.length) return null;
  const [, w, h, x, y] = all[all.length - 1].map(Number);
  return { w, h, x, y };
}
function zoomExpr(a, b, amount) { return `zoompan=z='1+${amount}*if(between(it,${a.toFixed(2)},${b.toFixed(2)}),sin((it-${a.toFixed(2)})/${(b - a).toFixed(2)}*PI),0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:fps=60`; }

/* Text for the post: heading or caption, the streamer credit, hashtags and the ad label. */
function postText(src, camp, heading, caption) {
  const streamer = camp.streamer || (src.meta && (src.meta.uploader || src.meta.channel)) || 'the streamer';
  const plat = camp.platform || platformOf(src.meta);
  let credit = camp.credit || '🎥 @{streamer} on {platform}';
  if (plat === 'file' || plat === 'stream') credit = credit.replace(/\s*on \{platform\}/, '');
  credit = credit.replace('{streamer}', String(streamer).replace(/^@/, '')).replace('{platform}', plat);
  const tags = (camp.hashtags || []).map((h) => (h.startsWith('#') ? h : '#' + h)).join(' ');
  return [caption || heading, '', credit, [tags, camp.adLabel || ''].filter(Boolean).join(' ')].join('\n').trim() + '\n';
}

/* Render one vertical clip (1080x1920, 60 fps) from a source file.
   o = { id, file, ss, to, peak (seconds in the file), layout A-E, cam [x,y,w,h] or null, focus 0-1,
         heading, headingStyle, words, wordsOffset (time in the words' clock that equals ss), out, workDir, zoom } */
async function renderClip(o) {
  const wdir = U.ensureDir(o.workDir);
  const dur = o.to - o.ss;
  const layout = String(o.layout || 'E').toUpperCase();
  const cam = o.cam;
  if (['A', 'C', 'D'].includes(layout) && !cam) U.fail(`Layout ${layout} needs the facecam position (cam x,y,w,h)`);
  const crop = await cropDetect(o.file, o.ss);
  const info = await U.probe(o.file);
  const vs = info.streams.find((x) => x.codec_type === 'video');
  const useCrop = crop && vs && (crop.w < vs.width * 0.97 || crop.h < vs.height * 0.97) && crop.w > vs.width * 0.4 && crop.h > vs.height * 0.4;
  const bars = useCrop ? `crop=${crop.w}:${crop.h}:${crop.x}:${crop.y},` : '';
  const pre = `${bars}fps=60,setsar=1`;
  // the facecam is located on the original frame (as seen in the pick-list strips), so it is cut before the black bars go
  const split = `[0:v]fps=60,setsar=1,split[g0][c0];[g0]${bars}null[g]`;
  const pk = Math.max(0.3, Math.min(dur - 0.3, (o.peak != null ? o.peak : o.ss + dur / 2) - o.ss));
  const za = Math.max(0, pk - 1.3), zb = Math.min(dur, pk + 1.3);
  const zoom = o.zoom === false ? null : zoomExpr(za, zb, 0.14);
  const focus = o.focus != null ? o.focus : 0.5;
  const gameCrop = (ar) => `crop=w='min(iw,ih*${ar})':h='min(ih,iw/${ar})':x='(iw-ow)*${focus}':y='(ih-oh)/2'`;
  const camCrop = cam ? `crop=iw*${cam[2]}:ih*${cam[3]}:iw*${cam[0]}:ih*${cam[1]}` : '';
  const z = (size) => (zoom ? ',' + zoom.replace('fps=60', `s=${size}:fps=60`) : '');
  let fc, headY;
  switch (layout) {
    case 'A': fc = `${split};[c0]${camCrop},scale=1080:700:force_original_aspect_ratio=increase,crop=1080:700[cv];[g]${gameCrop(1080 / 1220)},scale=1080:1220${z('1080x1220')}[gv];[cv][gv]vstack=inputs=2[base]`; headY = 700; break;
    case 'C': fc = `${split};[c0]${camCrop},scale=1080:700:force_original_aspect_ratio=increase,crop=1080:700[cv];[g]${gameCrop(1080 / 1220)},scale=1080:1220${z('1080x1220')}[gv];[gv][cv]vstack=inputs=2[base]`; headY = 1220; break;
    case 'D': fc = `${split};[c0]${camCrop},scale=420:-2,pad=iw+16:ih+16:8:8:white[cv];[g]${gameCrop(9 / 16)},scale=1080:1920${z('1080x1920')}[gv];[gv][cv]overlay=W-w-40:430[base]`; headY = 0; break;
    case 'B': fc = `[0:v]${pre},split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=24:2,eq=brightness=-0.12[bg];[b]scale=1080:-2[fg];[bg][fg]overlay=0:(H-h)/2-60[base]`; headY = 0; break;
    default: fc = `[0:v]${pre},${gameCrop(9 / 16)},scale=1080:1920${z('1080x1920')}[base]`; headY = 0;
  }
  let last = 'base';
  const inputs = ['-ss', String(o.ss), '-to', String(o.to), '-i', path.resolve(o.file)];
  if (o.heading) {
    const hp = (await renderHeadings([{ id: o.id, text: o.heading }], wdir, o.headingStyle || 'box'))[o.id];
    if (hp) {
      inputs.push('-i', path.resolve(hp.file));
      const y = headY ? Math.round(headY - hp.h / 2) : 190;
      fc += `;[${last}][1:v]overlay=0:${y}[hd]`; last = 'hd';
    }
  }
  if (o.words && o.words.length) {
    const n = buildAss(o.words, o.wordsOffset != null ? o.wordsOffset : o.ss, dur, path.join(wdir, `${o.id}.ass`));
    if (n) { fc += `;[${last}]subtitles=${o.id}.ass[cap]`; last = 'cap'; }
  }
  fc += ';[0:a]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]';
  U.ensureDir(path.dirname(o.out));
  await U.run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...inputs, '-filter_complex', fc, '-map', `[${last}]`, '-map', '[aout]', '-t', String(dur),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '60', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', path.resolve(o.out)], { cwd: wdir });
  const pi = await U.probe(o.out); const v = pi.streams.find((x) => x.codec_type === 'video');
  return { out: o.out, seconds: +parseFloat(pi.format.duration).toFixed(1), size: v ? `${v.width}×${v.height}` : '?', fps: v ? v.r_frame_rate : '?' };
}

async function cut(dir, opts = {}) {
  const src = U.readJSON(path.join(dir, 'source.json'));
  const cj = U.readJSON(path.join(dir, 'candidates.json'), { candidates: [] });
  const heads = U.readJSON(path.join(dir, 'headings.json'), {});
  const camp = U.readJSON(path.join(dir, 'campaign.json'), {});
  const picks = String(opts.pick || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!picks.length) U.fail('Which moments? --pick c01,c04  (or --pick all)');
  const list = picks[0] === 'all' ? Object.keys(heads).filter((k) => heads[k].heading) : picks;
  const odir = U.ensureDir(path.join(dir, 'out'));
  const wdir = U.ensureDir(path.join(dir, 'work'));
  const layoutDefault = String(opts.layout || camp.layout || 'E').toUpperCase();
  const cam = opts.cam || camp.cam ? String(opts.cam || camp.cam).split(',').map(Number) : null;
  const words = src.subs ? A.parseSubs(path.join(dir, src.subs)) : [];
  const capsOn = String(opts.captions || camp.captions || 'on') !== 'off' && words.length > 0;
  const headingStyle = opts.heading || camp.headingStyle || 'box';
  const minS = camp.minSeconds || 0, maxS = camp.maxSeconds || 0;
  const items = list.map((id) => {
    const c = cj.candidates.find((x) => x.id === id) || {};
    const h = heads[id] || {};
    let start = h.start != null ? U.parseTime(h.start) : c.start, end = h.end != null ? U.parseTime(h.end) : c.end;
    if (start == null || end == null) U.fail(`${id}: no start/end (add them to headings.json)`);
    if (maxS && end - start > maxS) end = start + maxS;
    if (minS && end - start < minS) end = start + minS;
    return { id, start, end, peak: h.peak != null ? U.parseTime(h.peak) : c.peak != null ? c.peak : (start + end) / 2, heading: h.heading || '', layout: String(h.layout || layoutDefault).toUpperCase(), focus: h.focus != null ? +h.focus : 0.5, caption: h.caption };
  });
  if (items.some((it) => ['A', 'C', 'D'].includes(it.layout)) && !cam) U.fail('Layouts A, C and D need the facecam position: --cam x,y,w,h (fractions, e.g. 0.72,0.04,0.26,0.30). Look at frames/<id>.jpg to find it.');
  const results = [];
  for (const it of items) {
    U.step(`Cutting ${it.id} (${U.fmtTime(it.start)}–${U.fmtTime(it.end)}, layout ${it.layout})`);
    const s = await sectionFile(dir, src, { id: it.id, start: it.start, end: it.end }, 'hq');
    const ss = s.base ? 0 : s.ss, to = s.base ? it.end - it.start : s.to;
    const out = path.join(odir, `${it.id}-${U.slugify(it.heading || it.id).slice(0, 40)}.mp4`);
    const r = await renderClip({ id: it.id, file: s.file, ss, to, peak: ss + (it.peak - it.start), layout: it.layout, cam, focus: it.focus, heading: it.heading, headingStyle,
      words: capsOn ? words : null, wordsOffset: it.start, out, workDir: wdir, zoom: opts.zoom !== 'off' });
    fs.writeFileSync(out.replace(/\.mp4$/, '.txt'), postText(src, camp, it.heading, it.caption));
    results.push(Object.assign({ id: it.id }, r));
    U.ok(`${path.relative(process.cwd(), out)}  ${r.size} · ${r.seconds}s`);
  }
  return results;
}

/* ---------- live ---------- */
async function liveStart(url, opts = {}) {
  needYtdlp();
  const every = +(opts.every || 12);
  const dir = U.ensureDir(path.resolve(opts.out || path.join(clipsRoot(), 'live-' + U.slugify(url).slice(-40) + '-' + new Date().toISOString().slice(0, 10))));
  U.ensureDir(path.join(dir, 'rec'));
  const log = fs.openSync(path.join(dir, 'recorder.log'), 'a');
  const p = spawn(process.execPath, [path.join(__dirname, 'recorder.js'), url, dir, String(every * 60)], { detached: true, stdio: ['ignore', log, log] });
  p.unref();
  fs.writeFileSync(path.join(dir, 'recorder.pid'), String(p.pid));
  let meta = {};
  try { const j = await U.run('yt-dlp', ['-J', '--no-warnings', url]); const m = JSON.parse(j.stdout.toString()); meta = { title: m.title, uploader: m.uploader || m.channel, extractor_key: m.extractor_key, is_live: m.is_live }; } catch (e) { /* recorder will report */ }
  U.writeJSON(path.join(dir, 'source.json'), { input: url, kind: 'live', segmentSeconds: every * 60, meta, offset: 0 });
  U.writeJSON(path.join(dir, 'live-state.json'), { analyzed: [], candidates: [] });
  return { dir, every };
}
function liveSegments(dir) {
  const rec = path.join(dir, 'rec');
  return U.exists(rec) ? fs.readdirSync(rec).filter((f) => /^seg\d+\.ts$/.test(f)).sort() : [];
}
function recorderAlive(dir) {
  const pidf = path.join(dir, 'recorder.pid'); if (!U.exists(pidf)) return false;
  try { process.kill(parseInt(fs.readFileSync(pidf, 'utf8'), 10), 0); return true; } catch (e) { return false; }
}
async function liveCheck(dir, opts = {}) {
  const src = U.readJSON(path.join(dir, 'source.json'));
  const st = U.readJSON(path.join(dir, 'live-state.json'), { analyzed: [], candidates: [] });
  const segs = liveSegments(dir);
  const alive = recorderAlive(dir);
  const done = alive ? segs.slice(0, -1) : segs;
  const fresh = [];
  for (const sname of done) {
    if (st.analyzed.includes(sname)) continue;
    const idx = parseInt(sname.match(/\d+/)[0], 10);
    const offset = idx * src.segmentSeconds;
    const file = path.join(dir, 'rec', sname);
    const tmp = U.ensureDir(path.join(dir, 'work', sname.replace('.ts', '')));
    U.writeJSON(path.join(tmp, 'source.json'), { kind: 'file', video: file, offset, meta: src.meta });
    const feats = await A.audioFeatures(file);
    const r = A.analyze(tmp, feats, Object.assign({ top: 4 }, opts));
    for (const c of r.candidates) {
      const id = 'c' + String(st.candidates.length + 1).padStart(2, '0');
      const cc = Object.assign({}, c, { id });
      st.candidates.push(cc); fresh.push(cc);
    }
    st.analyzed.push(sname);
  }
  U.writeJSON(path.join(dir, 'live-state.json'), st);
  U.writeJSON(path.join(dir, 'candidates.json'), { source: src.meta && src.meta.title, candidates: st.candidates });
  if (fresh.length) await frames(dir, { top: 99 });
  return { alive, segments: segs.length, fresh };
}
async function liveSection(dir, src, c) {
  const segLen = src.segmentSeconds;
  const a = Math.floor(c.start / segLen), b = Math.floor(c.end / segLen);
  const segs = liveSegments(dir).filter((f) => { const i = parseInt(f.match(/\d+/)[0], 10); return i >= a && i <= b; });
  if (!segs.length) U.fail(`No recording covers ${U.fmtTime(c.start)}`);
  if (segs.length === 1) return { file: path.join(dir, 'rec', segs[0]), ss: c.start - a * segLen, to: c.end - a * segLen, base: 0, shift: a * segLen };
  const list = path.join(dir, 'work', `${c.id}-concat.txt`);
  U.ensureDir(path.dirname(list));
  fs.writeFileSync(list, segs.map((f) => `file '${path.join(dir, 'rec', f)}'`).join('\n'));
  const out = path.join(dir, 'work', `${c.id}-joined.ts`);
  await U.ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
  return { file: out, ss: c.start - a * segLen, to: c.end - a * segLen, base: 0, shift: a * segLen };
}
function liveStop(dir) {
  const pidf = path.join(dir, 'recorder.pid'); if (!U.exists(pidf)) U.fail('No recorder running here');
  const pid = parseInt(fs.readFileSync(pidf, 'utf8'), 10);
  try { process.kill(-pid, 'SIGTERM'); } catch (e) { try { process.kill(pid, 'SIGTERM'); } catch (e2) { /* gone */ } }
  fs.rmSync(pidf, { force: true });
}


/* ---------- live autopilot (start / status) ---------- */
const AUTO_TEMPLATE = {
  url: 'https://www.twitch.tv/<channel>',
  permission: 'Who allowed you to clip this channel, e.g. "Clipping campaign of <channel>, Discord, 2026-11-21"',
  language: 'de',
  title: 'GTA 6',
  detect: { threshold: 6, minLaughs: 5, chatLagSeconds: 4, pre: 12, post: 8, minSeconds: 15, maxSeconds: 40, cooldownSeconds: 45 },
  judge: { mode: 'auto', model: 'claude-opus-5-5', minScore: 7 },
  clip: { layout: 'E', cam: '', focus: 0.5, heading: 'box', captions: 'auto' },
  post: { streamer: '<channel>', platform: 'Twitch', hashtags: ['gta6', 'gta', 'gaming'], credit: '🎥 @{streamer} on {platform}', adLabel: '' },
  upload: { mode: 'draft', privacy: 'SELF_ONLY', review: false, maxPerDay: 8, minGapMinutes: 20 },
  record: { tool: 'auto', segmentSeconds: 30, keepMinutes: 60 },
  notify: { webhook: '' },
};
function dirArgAuto(a) {
  const d = a._[1]; if (!d) U.fail(`clip ${a._[0]} <dir>`);
  const p = U.exists(path.resolve(d)) ? path.resolve(d) : path.join(clipsRoot(), d);
  if (!U.exists(path.join(p, 'autopilot.json'))) U.fail(`No autopilot folder at ${p}`);
  return p;
}
async function autoStart(a) {
  const AP = require('./autopilot');
  if (a.init) {
    const f = path.resolve(typeof a.init === 'string' ? a.init : 'autopilot.json');
    if (U.exists(f)) U.fail(`${f} exists already`);
    U.writeJSON(f, AUTO_TEMPLATE); U.ok(`Wrote ${path.relative(process.cwd(), f)} — fill in url, permission, streamer, layout (and cam for A/C/D)`); return;
  }
  const cfgFile = a.config ? path.resolve(a.config) : U.exists(path.resolve('autopilot.json')) ? path.resolve('autopilot.json') : null;
  const cfg = cfgFile ? U.readJSON(cfgFile) : {};
  const url = a._[1] || cfg.url;
  if (a.simulate) cfg.simulate = { file: path.resolve(a.simulate), chat: a['sim-chat'] ? path.resolve(a['sim-chat']) : null, speed: Number(a.speed || 1) };
  else if (!url || url.includes('<channel>')) U.fail('Which stream? clip auto <url>  (or put "url" in autopilot.json; template: clip auto --init)');
  if (url && !a.simulate) cfg.url = url;
  if (a.permission) cfg.permission = a.permission;
  if (!a.simulate && (!cfg.permission || /^Who allowed/.test(cfg.permission))) U.fail('Only clip streamers who allow it. Put where your permission comes from into autopilot.json as "permission" (e.g. a clipping campaign), or pass --permission "…"');
  const set = (k1, k2, v) => { if (v == null) return; cfg[k1] = Object.assign({}, cfg[k1] || {}, { [k2]: v }); };
  set('clip', 'layout', a.layout); set('clip', 'cam', a.cam); set('clip', 'heading', a.heading); set('upload', 'mode', a.mode);
  if (a.review) set('upload', 'review', true);
  if (a['dry-run']) set('upload', 'mode', 'none');
  if (a.judge) set('judge', 'mode', a.judge);
  if (a.lang) cfg.language = a.lang;
  const name = a.simulate ? 'sim-' + U.slugify(path.basename(a.simulate, path.extname(a.simulate))) : 'auto-' + (require('./chat').twitchChannel(url) || U.slugify(url).slice(-30));
  const dir = U.ensureDir(path.resolve(a.out || path.join(clipsRoot(), `${name}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}`)));
  U.writeJSON(path.join(dir, 'autopilot.json'), cfg);
  const eff = AP.loadConfig(dir);
  if ((eff.upload.mode === 'draft' || eff.upload.mode === 'direct') && !require('./tiktok').loggedIn()) U.warn('TikTok is not connected yet (clip tiktok setup / login): clips will be cut, but uploads will fail until you connect it.');
  if (a.foreground) { await AP.run(dir); return; }
  const log = fs.openSync(path.join(dir, 'autopilot.log'), 'a');
  const p = spawn(process.execPath, [path.join(__dirname, 'autopilot.js'), dir], { detached: true, stdio: ['ignore', log, log], env: process.env });
  p.unref();
  U.ok(`Autopilot running in the background: ${path.relative(process.cwd(), dir)}`);
  U.log(U.color.dim(`  status: clip auto-status ${path.relative(process.cwd(), dir)}    log: ${path.relative(process.cwd(), path.join(dir, 'autopilot.log'))}\n  stop:   clip auto-stop ${path.relative(process.cwd(), dir)}`));
}
function autoStatus(dir) {
  const { alive, st } = require('./autopilot').summary(dir);
  if (!st) { U.log(alive ? 'Starting…' : 'No state yet.'); return; }
  U.log(`${alive ? U.color.green('running') : U.color.yellow('stopped')} · ${st.url || 'simulation'} · recorded ${U.fmtTime(st.recordedSeconds || 0)} · chat ${st.chatMessages || 0} messages · judge ${st.judge} · upload ${st.upload}`);
  const by = {}; (st.moments || []).forEach((m) => { by[m.status] = (by[m.status] || 0) + 1; });
  U.log(`moments: ${Object.entries(by).map(([k, v]) => `${v} ${k}`).join(', ') || 'none yet'} · uploads today: ${(st.uploads || []).filter((u) => new Date(u.at).toDateString() === new Date().toDateString()).length}`);
  for (const m of (st.moments || []).slice(-10)) U.log(`  ${m.id} ${U.fmtTime(m.peak)} ${String(m.status).padEnd(13)} ${m.funny != null ? 'funny ' + m.funny + ' ' : ''}${m.heading ? '"' + m.heading + '" ' : ''}${m.file ? U.color.dim(m.file) : ''}${m.error ? U.color.red(' ' + m.error) : ''}`);
}

/* ---------- cli ---------- */
async function cli(a) {
  const sub = a._[0];
  const dirArg = () => { const d = a._[1]; if (!d) U.fail(`clip ${sub} <dir>`); const p = U.exists(path.resolve(d)) ? path.resolve(d) : path.join(clipsRoot(), d); if (!U.exists(path.join(p, 'source.json'))) U.fail(`No clip folder at ${p}`); return p; };
  switch (sub) {
    case 'layouts': console.log(LAYOUTS); return;
    case 'fetch': {
      if (!a._[1]) U.fail('clip fetch <url|file>');
      const r = await fetchSource(a._[1], a);
      U.ok(`Ready: ${path.relative(process.cwd(), r.dir)}`);
      U.log(U.color.dim(`  ${r.src.meta.title || ''} · ${r.src.meta.duration ? U.fmtTime(r.src.meta.duration) : ''} · chat ${r.src.chat ? 'yes' : 'no'} · transcript ${r.src.subs ? 'yes' : 'no'}`));
      U.log(U.color.dim(`  next: clip analyze ${path.relative(process.cwd(), r.dir)}`));
      return;
    }
    case 'analyze': {
      const d = dirArg(); const r = await analyzeDir(d, a);
      U.ok(`${r.candidates.length} moments found (${path.relative(process.cwd(), path.join(d, 'candidates.md'))})`);
      r.candidates.forEach((c) => U.log(`  ${c.id}  ${U.fmtTime(c.start)}–${U.fmtTime(c.end)}  score ${String(c.score).padStart(5)}  ${c.tags.join(', ')}`));
      U.log(U.color.dim(`  next: clip frames ${path.relative(process.cwd(), d)}`));
      return;
    }
    case 'frames': {
      const d = dirArg(); const r = await frames(d, a);
      U.ok(`Pick list: ${path.relative(process.cwd(), r.list)}`);
      r.frames.forEach((f) => U.log('  ' + path.relative(process.cwd(), f)));
      U.log(U.color.dim('  next: write headings into headings.json, then: clip cut <dir> --pick c01,c03 --layout E'));
      return;
    }
    case 'cut': { const d = dirArg(); await cut(d, a); return; }
    case 'live': {
      if (!a._[1]) U.fail('clip live <url> [--every 12]');
      const r = await liveStart(a._[1], a);
      U.ok(`Recording in the background: ${path.relative(process.cwd(), r.dir)}`);
      U.log(U.color.dim(`  every ${r.every} min run: clip live-check ${path.relative(process.cwd(), r.dir)}   (stop: clip live-stop …)`));
      return;
    }
    case 'live-check': {
      const d = dirArg(); const r = await liveCheck(d, a);
      U.log(`${r.alive ? U.color.green('recording') : U.color.yellow('recorder stopped')} · ${r.segments} segments`);
      if (!r.fresh.length) U.log('No new moments yet.');
      r.fresh.forEach((c) => U.log(`  NEW ${c.id}  ${U.fmtTime(c.start)}–${U.fmtTime(c.end)}  score ${c.score}  ${c.tags.join(', ')}`));
      return;
    }
    case 'live-stop': { const d = dirArg(); liveStop(d); U.ok('Recorder stopped'); return; }
    case 'tiktok': return require('./tiktok').cli(a);
    case 'auto-frame': {
      const url = a._[1]; if (!url) U.fail('clip auto-frame <live url>  (saves one frame to find the facecam position)');
      needYtdlp();
      const r = await U.run('yt-dlp', ['--no-warnings', '-g', '-f', 'best[height<=1080]/best', url]);
      const media = r.stdout.toString().trim().split('\n')[0];
      const out = path.resolve(a.out || 'live-frame.jpg');
      await U.ffmpeg(['-i', media, '-frames:v', '1', '-q:v', '2', out]);
      U.ok(`Saved ${path.relative(process.cwd(), out)}: look where the facecam is and write it as cam "x,y,w,h" (fractions of width/height) into autopilot.json`);
      return;
    }
    case 'auto': return autoStart(a);
    case 'auto-status': return autoStatus(dirArgAuto(a));
    case 'auto-stop': {
      const d = dirArgAuto(a); const pidf = path.join(d, 'autopilot.pid');
      if (!U.exists(pidf)) U.fail('The autopilot is not running in ' + d);
      try { process.kill(parseInt(fs.readFileSync(pidf, 'utf8'), 10), 'SIGTERM'); } catch (e) { fs.rmSync(pidf, { force: true }); }
      U.ok('Autopilot stopping (recording and chat end, clips stay in out/)'); return;
    }
    case 'auto-approve': {
      const d = dirArgAuto(a); const ids = a._.slice(2); if (!ids.length) U.fail('clip auto-approve <dir> m003 [m004 …]');
      const AP = require('./autopilot');
      if (AP.summary(d).alive) { U.ensureDir(path.join(d, 'approve')); ids.forEach((id) => fs.writeFileSync(path.join(d, 'approve', id), '')); U.ok(`Approved ${ids.join(', ')}: the autopilot uploads them next (daily limit and gap still apply)`); return; }
      const st = U.readJSON(path.join(d, 'state.json'));
      const cfg = AP.loadConfig(d);
      for (const id of ids) {
        const m = st.moments.find((x) => x.id === id); if (!m || !m.file) { U.warn(`${id}: no finished clip`); continue; }
        const file = path.join(d, m.file);
        const title = fs.readFileSync(file.replace(/\.mp4$/, '.txt'), 'utf8').trim();
        const r = await require('./tiktok').upload(file, { mode: a.mode || (cfg.upload.mode === 'none' ? 'draft' : cfg.upload.mode), title, privacy: cfg.upload.privacy, seconds: m.seconds });
        Object.assign(m, { status: 'uploaded', tiktok: r, uploadedAt: new Date().toISOString() });
        st.uploads.push({ id, at: m.uploadedAt });
        U.ok(`${id} uploaded (${r.mode}): ${r.status}`);
      }
      U.writeJSON(path.join(d, 'state.json'), st); return;
    }
    default: U.fail('clip fetch | analyze | frames | cut | live | live-check | live-stop | layouts | auto | auto-status | auto-stop | auto-approve | tiktok');
  }
}

module.exports = { cli, fetchSource, analyzeDir, frames, cut, renderClip, renderHeadings, postText, platformOf, liveStart, liveCheck, liveStop, buildAss, cropDetect, LAYOUTS };
