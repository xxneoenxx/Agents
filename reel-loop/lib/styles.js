'use strict';
/* Step 3, Style: the library, matching a topic to styles, previews, and learning a style from a video you love. */
const fs = require('fs');
const path = require('path');
const U = require('./util');

const MY_DIR = path.join(U.ROOT, 'my-styles');

function loadAll() {
  const out = [];
  for (const dir of [U.STYLES_DIR, MY_DIR, process.env.REEL_STYLES].filter(Boolean)) {
    if (!U.exists(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
      try { const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); s._file = path.join(dir, f); out.push(s); } catch (e) { U.warn(`Skipping ${f}: ${e.message}`); }
    }
  }
  return out;
}
function find(idOrPath) {
  if (!idOrPath) U.fail('Which style? e.g. S01');
  if (typeof idOrPath === 'object') return idOrPath;
  if (/\.json$/i.test(idOrPath) && U.exists(path.resolve(idOrPath))) return U.readJSON(path.resolve(idOrPath));
  const q = String(idOrPath).toLowerCase();
  const all = loadAll();
  const s = all.find((x) => String(x.id).toLowerCase() === q) || all.find((x) => x.name.toLowerCase() === q) || all.find((x) => x.name.toLowerCase().includes(q));
  if (!s) U.fail(`Style "${idOrPath}" not found. Run: styles list`);
  const c = Object.assign({}, s); delete c._file; return c;
}

const STOP = new Set('a an the and or of to in on for with why how what is are was were be does do did make video second seconds about style my your this that it its from into than then them they you we our'.split(' '));
function tokens(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9äöüß]+/).filter((w) => w.length > 2 && !STOP.has(w)); }

/* Rank styles for a topic. Tags score 3, words in summary/bestFor score 1. */
function match(topic, n = 5) {
  const t = String(topic || '').toLowerCase();
  const tk = new Set(tokens(topic));
  const res = loadAll().map((s) => {
    let score = 0; const why = [];
    for (const tag of s.tags || []) {
      const tg = tag.toLowerCase();
      if (new RegExp('(^|[^\\p{L}])' + tg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'u').test(t)) { score += 3; why.push(tag); }
      else if (tag.split(' ').some((w) => tk.has(w))) { score += 1.5; why.push(tag); }
    }
    for (const w of new Set(tokens(`${s.summary} ${s.bestFor}`))) if (tk.has(w)) { score += 1; if (!why.includes(w)) why.push(w); }
    return { id: s.id, name: s.name, category: s.category, score, why: why.slice(0, 5), bestFor: s.bestFor, sample: s.sample };
  });
  res.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return res.slice(0, n);
}

/* A small sample scene for previews, per type. */
function sampleScene(type, text) {
  const T = text || 'Why does a canal need *stairs* for ships?';
  const S = {
    hook: { text: T, emoji: '🚢', kicker: 'Did you know' },
    title: { text: T }, text: { text: T }, icon: { text: T, emoji: '💡' },
    number: { value: 26, suffix: ' m', label: 'above the *sea*', emoji: '🌊' },
    list: { title: 'Three reasons', items: [{ text: 'The land is *high*' }, { text: 'Digging costs billions' }, { text: 'Rain fills the lake' }] },
    bars: { title: 'Ships per year', items: [{ label: 'Panama', value: 14000 }, { label: 'Suez', value: 20000 }, { label: 'Kiel', value: 28000 }] },
    compare: { left: { emoji: '⛰️', title: 'Dig it flat', value: '$$$' }, right: { emoji: '🪜', title: 'Use locks', value: '$' } },
    meters: { title: 'Social battery', items: [{ label: 'Monday', value: 15, emoji: '😴' }, { label: 'Friday', value: 90, emoji: '🥳' }] },
    timeline: { events: [{ year: 1881, text: 'France starts', emoji: '🇫🇷' }, { year: 1914, text: 'First ship', emoji: '🚢' }] },
    steps: { title: 'How it works', steps: ['Ship enters', 'Water rises', 'Gates open'] },
    choice: { question: 'Which would you pick?', a: { text: 'Sail around', emoji: '🌎' }, b: { text: 'Pay the toll', emoji: '💸' }, countdown: 3 },
    quote: { text: 'A plan, a canal: *Panama*.', author: 'Palindrome' },
    stick: { title: 'Nobody believed him', figures: [{ pose: 'shrug', mood: 'sad', say: 'Impossible.' }, { pose: 'point', mood: 'happy', say: 'Watch me.' }] },
    map: { pins: [{ x: 360, y: 380, label: 'Atlantic', emoji: '🌊' }, { x: 560, y: 560, label: 'Panama', emoji: '📍' }] },
    cta: { text: 'Would you build it *again*?', emoji: '👇', handle: '@you' },
  };
  return S[type] || S.text;
}
function samplePlan(style, text, types) {
  const scenes = types.map((type, i) => ({ id: 'p' + i, type, data: sampleScene(type, text), start: i * 6, duration: 6, end: i * 6 + 6, transition: { type: 'cut', dur: 0 }, words: [] }));
  const words = String(text || 'Why does a canal need stairs for ships').replace(/[*^{}]/g, '').split(/\s+/).slice(0, 4);
  return { fps: 30, duration: scenes.length * 6, language: 'en', scenes, handle: '@yourchannel', captions: [{ start: 0, end: 6, scene: 'p_none', words: words.map((w, i) => ({ w, s: i * 0.2 })) }] };
}

/* Render one picture per style (its hook + its favourite scene) so the user can pick. */
async function preview(styles, opts = {}) {
  const { renderStills } = require('./render');
  const outDir = U.ensureDir(path.resolve(opts.out || path.join(process.cwd(), 'style-previews')));
  const files = [];
  for (const st of styles) {
    const second = (st.scenes || []).find((x) => !['hook', 'title', 'text', 'cta'].includes(x)) || 'list';
    const plan = samplePlan(st, opts.text, ['hook', second]);
    const shots = [{ t: 4.0, file: path.join(outDir, `${st.id || 'style'}-a.png`) }, { t: 6 + 4.5, file: path.join(outDir, `${st.id || 'style'}-b.png`) }];
    await renderStills({ plan, style: st, shots });
    const out = path.join(outDir, `${st.id || 'style'}.jpg`);
    await U.ffmpeg(['-i', shots[0].file, '-i', shots[1].file, '-filter_complex', '[0:v]scale=540:960[a];[1:v]scale=540:960[b];[a][b]hstack=inputs=2', '-q:v', '3', out]);
    shots.forEach((s) => fs.rmSync(s.file, { force: true }));
    files.push(out);
  }
  return files;
}

/* ---------- learn a style from a video ---------- */
function toHex(c) { return '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function lum(c) { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); }
function contrast(a, b) { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
function sat(c) { const mx = Math.max(...c), mn = Math.min(...c); return mx === 0 ? 0 : (mx - mn) / mx; }
function fgPre(rest, bg) { const f = rest.slice().sort((a, b) => contrast(b.c, bg) - contrast(a.c, bg))[0]; return f ? f.c : [255, 255, 255]; }
function kmeans(px, k) {
  const n = px.length / 3; const cent = [];
  for (let i = 0; i < k; i++) { const j = Math.floor(((i + 0.5) / k) * n) * 3; cent.push([px[j], px[j + 1], px[j + 2]]); }
  const asg = new Int32Array(n);
  for (let it = 0; it < 14; it++) {
    const sum = Array.from({ length: k }, () => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const r = px[i * 3], g = px[i * 3 + 1], b = px[i * 3 + 2]; let best = 0, bd = 1e12;
      for (let c = 0; c < k; c++) { const d = (r - cent[c][0]) ** 2 + (g - cent[c][1]) ** 2 + (b - cent[c][2]) ** 2; if (d < bd) { bd = d; best = c; } }
      asg[i] = best; const s = sum[best]; s[0] += r; s[1] += g; s[2] += b; s[3]++;
    }
    for (let c = 0; c < k; c++) if (sum[c][3]) cent[c] = [sum[c][0] / sum[c][3], sum[c][1] / sum[c][3], sum[c][2] / sum[c][3]];
  }
  const cnt = new Array(k).fill(0); for (let i = 0; i < n; i++) cnt[asg[i]]++;
  return cent.map((c, i) => ({ c, share: cnt[i] / n })).filter((x) => x.share > 0).sort((a, b) => b.share - a.share);
}

async function learn(video, opts = {}) {
  const file = path.resolve(video);
  if (!U.exists(file)) U.fail(`Video not found: ${file}`);
  const info = await U.probe(file);
  const dur = parseFloat(info.format.duration) || 0;
  const vs = info.streams.find((s) => s.codec_type === 'video');
  if (!vs) U.fail('That file has no video stream');
  const outDir = U.ensureDir(path.resolve(opts.out || path.join(process.cwd(), 'style-learn-' + U.slugify(path.basename(file, path.extname(file))))));
  U.step('Measuring cuts');
  const sc = await U.run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vf', "select='gt(scene,0.30)',showinfo", '-an', '-f', 'null', '-'], { allowFail: true });
  const cuts = (sc.stderr.match(/pts_time:([0-9.]+)/g) || []).map((m) => parseFloat(m.split(':')[1]));
  const avgShot = dur / (cuts.length + 1);
  U.step('Sampling frames');
  const nFrames = 16;
  await U.ffmpeg(['-i', file, '-vf', `fps=${(nFrames / Math.max(1, dur)).toFixed(4)},scale=270:480:force_original_aspect_ratio=decrease,pad=270:480:(ow-iw)/2:(oh-ih)/2,tile=4x4`, '-frames:v', '1', '-q:v', '3', path.join(outDir, 'sheet.jpg')]);
  for (let i = 0; i < Math.min(6, cuts.length + 1); i++) {
    const t = i === 0 ? Math.min(0.5, dur / 2) : cuts[Math.floor((i / 6) * cuts.length)] + 0.2;
    await U.ffmpeg(['-ss', String(t), '-i', file, '-frames:v', '1', '-vf', 'scale=540:-2', '-q:v', '3', path.join(outDir, `frame-${i + 1}.jpg`)], { allowFail: true });
  }
  U.step('Measuring colours');
  const raw = await U.run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-vf', `fps=${(24 / Math.max(1, dur)).toFixed(4)},scale=64:-2`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']);
  const px = raw.stdout;
  const clusters = kmeans(px, 7);
  const bg = clusters[0].c;
  const rest = clusters.slice(1);
  let fg = rest.slice().sort((a, b) => contrast(b.c, bg) - contrast(a.c, bg))[0];
  let fgc = fg && contrast(fg.c, bg) >= 4.5 ? fg.c : lum(bg) > 0.4 ? [17, 17, 17] : [250, 250, 250];
  // accents: vivid pixels only (high chroma, not dark), clustered separately so small bright details are found
  const vivid = [];
  for (let i = 0; i + 2 < px.length; i += 3) { const r = px[i], g = px[i + 1], b = px[i + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn > 80 && mx > 110) vivid.push(r, g, b); }
  const dist = (p, q) => Math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);
  let accents = vivid.length / 3 > 150 ? kmeans(Uint8Array.from(vivid), 4).filter((x) => x.share > 0.04).map((x) => x.c) : [];
  accents = accents.filter((c) => dist(c, bg) > 70 && dist(c, fgPre(rest, bg)) > 40);
  for (const x of rest) if (accents.length < 3 && x !== fg && Math.max(...x.c) - Math.min(...x.c) > 60 && dist(x.c, bg) > 70 && !accents.some((a) => dist(a, x.c) < 50)) accents.push(x.c);
  const DEF = [[255, 196, 0], [255, 90, 79], [79, 195, 255]];
  for (const d of DEF) if (accents.length < 3 && !accents.some((a) => dist(a, d) < 60)) accents.push(d);
  const dark = lum(bg) < 0.2;
  let loud = null;
  if (info.streams.some((s) => s.codec_type === 'audio')) {
    const r = await U.run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vn', '-af', 'ebur128', '-f', 'null', '-'], { allowFail: true });
    const m = r.stderr.match(/I:\s+(-?[0-9.]+) LUFS/g); if (m) loud = parseFloat(m[m.length - 1].replace(/[^-0-9.]/g, ''));
  }
  const pace = avgShot < 1.3 ? 'fast' : avgShot < 2.8 ? 'medium' : 'slow';
  const id = opts.id || nextMyId();
  const style = {
    id, name: opts.name || `Learned from ${path.basename(file)}`, category: 'Mine', tags: [], learned: true,
    summary: `Learned from ${path.basename(file)}: ${pace} pace (${avgShot.toFixed(1)} s per shot), ${dark ? 'dark' : 'light'} palette. Refine fonts, background and captions after looking at sheet.jpg.`,
    bestFor: '', sample: '',
    palette: { bg: toHex(bg), bg2: toHex(bg.map((v) => v * (dark ? 1.35 : 0.94) + (dark ? 8 : 0))), fg: toHex(fgc), muted: toHex(fgc.map((v, i) => v * 0.65 + bg[i] * 0.35)), accent: toHex(accents[0]), accent2: toHex(accents[1]), accent3: toHex(accents[2]), card: dark ? 'rgba(255,255,255,.07)' : '#ffffff', cardFg: toHex(fgc), hlBg: toHex(accents[0]), hlFg: toHex(bg) },
    fonts: { display: { family: 'Inter', pkg: 'inter', weights: [800, 900] }, body: { family: 'Inter', pkg: 'inter', weights: [600, 700, 800] }, mono: { family: 'JetBrains Mono', pkg: 'jetbrains-mono', weights: [700] } },
    type: { case: 'none', tracking: '-0.02em', leading: 1.02, displayWeight: 900, bodyWeight: 700, scale: 1 },
    shape: { radius: 24, stroke: 12, shadow: dark ? '0 18px 50px rgba(0,0,0,.4)' : '0 14px 34px rgba(0,0,0,.12)' },
    background: { kind: dark ? 'radial' : 'gradient', grain: 0.05, vignette: dark ? 0.35 : 0 },
    motion: { reveal: pace === 'fast' ? 'pop' : pace === 'medium' ? 'rise' : 'fade', stagger: pace === 'fast' ? 0.06 : 0.09, transition: pace === 'fast' ? 'whip' : pace === 'medium' ? 'slide' : 'fade', drift: 0.03 },
    captions: { enabled: true, style: 'box', size: 60, maxWords: pace === 'fast' ? 3 : 4 },
    sound: { music: pace === 'fast' ? 'upbeat' : pace === 'slow' ? 'calm' : 'playful', musicVolume: 0.22, sfx: pace === 'slow' ? 'soft' : 'punchy', sfxVolume: 0.55 },
    voice: { tone: '', wps: pace === 'fast' ? 3.0 : 2.6, providers: {} },
    structure: [], scenes: ['hook', 'text', 'list', 'number', 'cta'], rules: ['Never reuse the reference video\'s words, characters, logos or music'],
    learnedFrom: { file: path.basename(file), duration: +dur.toFixed(2), cuts: cuts.length, secondsPerShot: +avgShot.toFixed(2), loudnessLUFS: loud, palette: clusters.map((x) => ({ hex: toHex(x.c), share: +x.share.toFixed(3) })) },
    css: '',
  };
  const outFile = opts.save ? path.join(U.ensureDir(MY_DIR), `${id}-${U.slugify(style.name)}.json`) : path.join(outDir, 'style.json');
  U.writeJSON(outFile, style);
  return { style, file: outFile, sheet: path.join(outDir, 'sheet.jpg'), dir: outDir };
}
function nextMyId() {
  const ids = loadAll().map((s) => String(s.id)).filter((x) => /^M\d+$/.test(x)).map((x) => parseInt(x.slice(1), 10));
  return 'M' + String((ids.length ? Math.max(...ids) : 0) + 1).padStart(2, '0');
}

module.exports = { loadAll, find, match, preview, learn, sampleScene, samplePlan, MY_DIR };
