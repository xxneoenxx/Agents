'use strict';
/* Project folder: videos/<slug>/ with brief.json, style.json, script.json, voice/, plan.json, audio/, stills/, check/, out/. */
const fs = require('fs');
const path = require('path');
const U = require('./util');
const Styles = require('./styles');

const STEPS = [
  ['setup', 'Setup'], ['brief', 'Questions'], ['style', 'Style'], ['script', 'Script (your yes)'], ['look', 'Look (your yes)'],
  ['plan', 'Plan'], ['voice', 'Voice'], ['first', 'First seconds (your yes)'], ['animate', 'Animate'], ['sound', 'Sound'],
  ['check', 'Check'], ['finish', 'Finish (your yes)'],
];

function videosRoot(opts) { return path.resolve((opts && opts.root) || process.env.REEL_VIDEOS || path.join(process.cwd(), 'videos')); }

function resolveDir(arg, opts) {
  if (!arg) {
    if (U.exists(path.join(process.cwd(), 'script.json'))) return process.cwd();
    U.fail('Which video? Pass the project folder or its name, e.g. "videos/panama-locks" or "panama-locks"');
  }
  const cands = [path.resolve(arg), path.join(videosRoot(opts), arg)];
  for (const c of cands) if (U.exists(path.join(c, 'script.json')) || U.exists(path.join(c, 'brief.json'))) return c;
  U.fail(`No video project found at "${arg}" (looked in ${cands.join(' and ')})`);
}

function load(arg, opts) {
  const dir = resolveDir(arg, opts);
  const p = (...a) => path.join(dir, ...a);
  const script = U.readJSON(p('script.json'));
  let style;
  if (U.exists(p('style.json'))) style = U.readJSON(p('style.json'));
  else if (script.style) style = Styles.find(script.style);
  else U.fail('No style: add style.json to the project or set "style" in script.json');
  const brief = U.readJSON(p('brief.json'), {});
  const slug = path.basename(dir);
  return { dir, p, script, style, brief, slug, state: U.readJSON(p('state.json'), { done: {}, approved: {} }) };
}

function saveState(proj) { U.writeJSON(proj.p('state.json'), proj.state); }
function mark(proj, step, extra) { proj.state.done[step] = Object.assign({ at: new Date().toISOString() }, extra || {}); saveState(proj); }
function approve(proj, step, note) {
  proj.state.approved[step] = { at: new Date().toISOString(), note: note || '' };
  proj.state.done[step] = proj.state.done[step] || { at: new Date().toISOString() };
  saveState(proj);
}

function createProject(title, opts = {}) {
  if (!title) U.fail('Give the video a title: new "Why the Panama Canal needs locks"');
  const slug = opts.slug || U.slugify(title);
  const dir = path.join(videosRoot(opts), slug);
  if (U.exists(path.join(dir, 'script.json')) && !opts.force) U.fail(`${dir} already exists (use --force to overwrite the script)`);
  U.ensureDir(dir);
  const style = opts.style ? Styles.find(opts.style) : null;
  const lang = opts.lang || 'en';
  const seconds = Number(opts.seconds) || 60;
  const brief = {
    title, topic: opts.topic || title, audience: opts.audience || '', platforms: String(opts.platforms || 'reels,shorts,tiktok').split(','),
    language: lang, targetSeconds: seconds, handle: opts.handle || '', voice: opts.voice !== 'none', createdAt: new Date().toISOString(),
  };
  U.writeJSON(path.join(dir, 'brief.json'), brief);
  if (style) U.writeJSON(path.join(dir, 'style.json'), style);
  const script = {
    title, language: lang, targetSeconds: seconds, fps: 30, style: style ? style.id : '', handle: opts.handle || '',
    voice: { provider: opts.voice || 'auto' }, music: {}, post: { caption: '', hashtags: [] },
    hookOptions: [], scenes: [
      { id: 's01', type: 'hook', see: 'Describe what is on screen', voice: 'The first line the narrator says.', data: { text: 'The *hook* on screen', emoji: '' } },
      { id: 's02', type: 'text', see: '', voice: '', data: { text: '' } },
      { id: 's03', type: 'cta', see: 'Outro', voice: 'Follow for more.', data: { text: 'Follow for *more*', handle: opts.handle || '' } },
    ],
  };
  U.writeJSON(path.join(dir, 'script.json'), script);
  U.writeJSON(path.join(dir, 'state.json'), { done: { brief: { at: new Date().toISOString() } }, approved: {} });
  return { dir, slug, style };
}

/* The script as a readable table: time, what you see, the words. */
function scriptTable(proj) {
  const plan = U.readJSON(proj.p('plan.json'), null);
  const wps = (proj.style.voice && proj.style.voice.wps) || 2.6;
  const rows = []; let t = 0;
  for (const sc of proj.script.scenes) {
    const ps = plan && plan.scenes.find((x) => x.id === sc.id);
    let a, b;
    if (ps) { a = ps.start; b = ps.end; }
    else { const n = String(sc.voice || '').split(/\s+/).filter(Boolean).length; const d = sc.duration || Math.max(2, n / wps + 0.6); a = t; b = t + d; t = b; }
    const see = sc.see || summarizeData(sc);
    rows.push({ id: sc.id, time: `${U.fmtTime(a)}-${U.fmtTime(b)}`, type: sc.type, see, words: sc.voice || '' });
  }
  const total = rows.length ? rows[rows.length - 1].time.split('-')[1] : '0:00.0';
  const lines = ['| # | Time | Type | What you see | Words |', '|---|---|---|---|---|'];
  for (const r of rows) lines.push(`| ${r.id} | ${r.time} | ${r.type} | ${r.see.replace(/\|/g, '/')} | ${r.words.replace(/\|/g, '/')} |`);
  lines.push('', `Total: ${total}${plan ? '' : ' (estimated before voice)'}  ·  target ${proj.script.targetSeconds || 60}s  ·  style ${proj.style.id || ''} ${proj.style.name || ''}`);
  return lines.join('\n');
}
function summarizeData(sc) {
  const d = sc.data || {};
  const clean = (s) => String(s || '').replace(/[*^{}]/g, '');
  switch (sc.type) {
    case 'hook': case 'title': case 'text': case 'statement': case 'icon': return `${d.emoji || ''} ${clean(d.text)}`.trim();
    case 'number': return `${d.prefix || ''}${d.value}${d.suffix || ''} — ${clean(d.label)}`;
    case 'list': return `List: ${(d.items || []).map((i) => clean(i.text || i)).join(' / ')}`;
    case 'bars': return `Bars: ${(d.items || []).map((i) => `${i.label} ${i.value}`).join(', ')}`;
    case 'compare': return `${clean(d.left && d.left.title)} vs ${clean(d.right && d.right.title)}`;
    case 'meters': return `Meters: ${(d.items || []).map((i) => `${clean(i.label)} ${i.value}%`).join(', ')}`;
    case 'timeline': return `Timeline: ${(d.events || []).map((e) => e.year || e.label).join(', ')}`;
    case 'steps': return `Steps: ${(d.steps || []).map((s) => clean(s.text || s)).join(' → ')}`;
    case 'choice': return `${clean(d.question)} A) ${clean(d.a && d.a.text)} B) ${clean(d.b && d.b.text)}`;
    case 'map': return `Map: ${(d.pins || []).map((p) => p.label).join(' → ')}`;
    case 'stick': return `Stick: ${(d.figures || []).map((f) => `${f.pose || 'stand'}${f.say ? ` "${clean(f.say)}"` : ''}`).join(', ')}`;
    case 'quote': return `"${clean(d.text)}"`;
    case 'image': return `Image ${d.src}`;
    case 'cta': return clean(d.text);
    default: return sc.type;
  }
}

function status(proj) {
  const out = [];
  const has = (f) => U.exists(proj.p(f));
  const auto = {
    setup: true, brief: has('brief.json'), style: has('style.json') || !!proj.script.style, script: proj.script.scenes && proj.script.scenes.length > 0 && !!proj.state.approved.script,
    look: !!proj.state.approved.look, plan: has('plan.json'), voice: has('voice/timings.json'), first: !!proj.state.approved.first,
    animate: fs.existsSync(proj.p('render')) && fs.readdirSync(proj.p('render')).some((f) => f.startsWith('video-')), sound: has('audio/mix.wav'),
    check: has('check/report.json'), finish: !!proj.state.approved.finish || (fs.existsSync(proj.p('out')) && fs.readdirSync(proj.p('out')).some((f) => f.endsWith('.mp4'))),
  };
  STEPS.forEach(([k, label], i) => {
    const done = auto[k] || proj.state.done[k];
    out.push(`${done ? U.color.green('✓') : U.color.dim('·')} ${String(i + 1).padStart(2)} ${label}${proj.state.approved[k] ? U.color.dim('  approved ' + proj.state.approved[k].at.slice(0, 16).replace('T', ' ')) : ''}`);
  });
  return out.join('\n');
}

module.exports = { load, createProject, scriptTable, status, mark, approve, saveState, resolveDir, videosRoot, STEPS, summarizeData };
