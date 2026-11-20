'use strict';
/* The commands behind the 12 steps. Each one is safe to re-run: it reuses what has not changed. */
const fs = require('fs');
const path = require('path');
const U = require('./util');
const Project = require('./project');
const Plan = require('./plan');
const Voice = require('./voice');
const Audio = require('./audio');
const Render = require('./render');
const Check = require('./check');

function printIssues(issues) {
  for (const e of issues.errors) U.log(U.color.red('✗ ' + e));
  for (const w of issues.warnings) U.warn(w);
  for (const i of issues.info) U.log(U.color.dim('  ' + i));
}
function ensurePlan(proj, quiet) {
  const { plan, issues } = Plan.build(proj);
  if (!quiet || issues.errors.length) printIssues(quiet ? { errors: issues.errors, warnings: [], info: [] } : issues);
  if (issues.errors.length) U.fail('Fix the problems above, then run this again.');
  return { plan, issues };
}

async function plan(proj) {
  const { plan, issues } = Plan.build(proj);
  U.log(Plan.table(plan));
  printIssues(issues);
  if (!issues.errors.length) { Project.mark(proj, 'plan', { duration: plan.duration }); U.ok(`Plan holds together: ${plan.duration.toFixed(1)}s`); }
  return { plan, issues };
}

async function voice(proj, opts) {
  if (opts.samples) {
    const r = await Voice.voiceSamples(proj, opts);
    U.ok(`Voice samples (${r.provider}) — listen and pick one:`);
    r.files.forEach((f) => U.log(`  ${f.voice.padEnd(36)} ${path.relative(process.cwd(), f.file)}`));
    U.log(U.color.dim('Then set script.voice.voice to the one you like and run: voice'));
    return r;
  }
  const r = await Voice.voiceProject(proj, opts);
  U.ok(`Voice: ${r.provider}${r.voice ? ' / ' + r.voice : ''} — recorded ${r.made.length}, unchanged ${r.kept.length}`);
  Project.mark(proj, 'voice', { provider: r.provider, voice: r.voice });
  const { plan: p, issues } = Plan.build(proj);
  printIssues(issues);
  if (!issues.errors.length) U.log(U.color.dim(`  plan updated with the real line lengths: ${p.duration.toFixed(1)}s`));
  return r;
}

async function sound(proj, quiet) {
  const { plan } = ensurePlan(proj, true);
  if (!quiet) U.step('Mixing voice, music and sound effects');
  const r = await Audio.mixProject(proj, plan);
  const L = r.loudness;
  L.planHash = plan.hash; U.writeJSON(proj.p('audio', 'loudness.json'), L);
  if (!quiet) {
    U.ok(`Mix: ${L.integratedLUFS} LUFS (target -14), true peak ${L.truePeakDBFS} dBFS, range ${L.rangeLU} LU` + (L.voiceOverMusicDb != null ? `, voice ${L.voiceOverMusicDb} dB over music` : '') + `, music: ${L.music}`);
    if (plan.captions.length) U.log(U.color.dim('  captions file: ' + path.relative(process.cwd(), proj.p('captions.srt'))));
    U.log(U.color.dim('  I cannot hear: please listen to the first seconds and tell me if the music or effects are too loud.'));
  }
  Project.mark(proj, 'sound', { lufs: L.integratedLUFS });
  return r;
}
async function ensureMix(proj, plan) {
  const L = U.readJSON(proj.p('audio', 'loudness.json'), null);
  if (!L || L.planHash !== plan.hash || !U.exists(proj.p('audio', 'mix.wav'))) await sound(proj, true);
  return proj.p('audio', 'mix.wav');
}

async function stills(proj, opts = {}) {
  const { plan } = ensurePlan(proj, true);
  const dir = U.ensureDir(proj.p('stills'));
  let shots = [];
  if (opts.at) shots = String(opts.at).split(',').map((x) => { const t = parseFloat(x); return { t, file: path.join(dir, `t-${t.toFixed(1)}.png`) }; });
  else if (opts.scene) {
    const ps = plan.scenes.find((s) => s.id === opts.scene); if (!ps) U.fail(`No scene ${opts.scene}`);
    shots = [0.3, Math.max(0.4, ps.fullAt * 0.55), ps.fullAt].map((lt, i) => ({ t: +(ps.start + Math.min(lt, ps.duration - 0.05)).toFixed(2), file: path.join(dir, `${ps.id}-${i + 1}.png`) }));
  } else if (opts.all) {
    U.ensureDir(path.join(dir, 'scenes'));
    shots = plan.scenes.map((ps) => ({ t: +(ps.start + ps.fullAt).toFixed(2), file: path.join(dir, 'scenes', `${ps.id}.png`) }));
  } else {
    const s = plan.stills;
    shots = [{ t: s.first.t, file: path.join(dir, 'first.png') }, { t: s.busiest.t, file: path.join(dir, 'busiest.png') }, { t: s.quietest.t, file: path.join(dir, 'quietest.png') }];
  }
  const r = await Render.renderStills({ plan, style: proj.style, shots, size: opts.size });
  if (r.errors.length) r.errors.forEach((e) => U.warn('page: ' + e));
  if (opts.all && r.files.length) {
    const sheet = path.join(dir, 'scenes-sheet.jpg');
    const cols = Math.min(5, r.files.length);
    const inputs = r.files.flatMap((f) => ['-i', f]);
    const fc = r.files.map((_, i) => `[${i}:v]scale=216:384[v${i}]`).join(';') + ';' + r.files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${r.files.length}:layout=${r.files.map((_, i) => `${(i % cols) * 220}_${Math.floor(i / cols) * 388}`).join('|')}:fill=white`;
    if (r.files.length > 1) await U.ffmpeg([...inputs, '-filter_complex', fc, '-q:v', '3', sheet]);
    else fs.copyFileSync(r.files[0], sheet);
    U.ok('All scenes: ' + path.relative(process.cwd(), sheet));
  }
  r.files.forEach((f, i) => U.log(`  ${path.relative(process.cwd(), f)}  ${U.color.dim('t=' + shots[i].t + 's')}`));
  return r;
}

function firstSecondsEnd(plan) {
  let end = plan.scenes[0] ? plan.scenes[0].end : plan.duration;
  for (const ps of plan.scenes) { end = ps.end; if (end >= 10) break; }
  return Math.min(end, 20, plan.duration);
}

async function render(proj, opts = {}) {
  const { plan } = ensurePlan(proj, true);
  const prev = U.ensureDir(proj.p('preview'));
  if (opts.first || opts.from != null || opts.to != null || opts.scene) {
    let a = 0, b = firstSecondsEnd(plan), name = 'first-seconds.mp4';
    if (opts.scene) { const ps = plan.scenes.find((s) => s.id === opts.scene); if (!ps) U.fail(`No scene ${opts.scene}`); a = Math.max(0, ps.start - 0.3); b = Math.min(plan.duration, ps.end + 0.3); name = `${ps.id}.mp4`; }
    else if (!opts.first) { a = U.parseTime(opts.from) || 0; b = opts.to != null ? U.parseTime(opts.to) : plan.duration; name = `range-${a.toFixed(1)}-${b.toFixed(1)}.mp4`; }
    const mix = opts.silent ? null : await ensureMix(proj, plan);
    const out = opts.out ? path.resolve(opts.out) : path.join(prev, name);
    U.step(`Rendering ${a.toFixed(1)}-${b.toFixed(1)}s`);
    const r = await Render.renderVideo({ plan, style: proj.style, from: a, to: b, out, audio: mix, workers: opts.workers ? +opts.workers : undefined });
    if (r.errors.length) r.errors.forEach((e) => U.warn('page: ' + e));
    U.ok(`${path.relative(process.cwd(), out)}  (${r.frames} frames in ${r.seconds.toFixed(0)}s)`);
    if (opts.first) Project.mark(proj, 'firstRendered', { until: b });
    return { out, from: a, to: b };
  }
  return renderFull(proj, plan, opts);
}

async function renderFull(proj, plan, opts = {}) {
  const size = String(opts.size || '1080p').toLowerCase();
  const rdir = U.ensureDir(proj.p('render'));
  const vid = path.join(rdir, `video-${size}.mp4`), meta = path.join(rdir, `video-${size}.json`);
  const key = U.hash({ plan: plan.hash, size, fps: plan.fps, v: 3 });
  const m = U.readJSON(meta, null);
  if (!opts.force && m && m.key === key && U.exists(vid)) U.log(U.color.dim(`  reusing ${path.relative(process.cwd(), vid)} (nothing changed)`));
  else {
    U.step(`Animating ${plan.scenes.length} scenes, ${plan.duration.toFixed(1)}s at ${size}`);
    const r = await Render.renderVideo({ plan, style: proj.style, from: 0, to: plan.duration, out: vid, size, final: true, workers: opts.workers ? +opts.workers : undefined });
    if (r.errors.length) r.errors.forEach((e) => U.warn('page: ' + e));
    U.writeJSON(meta, { key, at: new Date().toISOString(), frames: r.frames, seconds: r.seconds });
    U.ok(`Animated ${r.frames} frames in ${r.seconds.toFixed(0)}s`);
  }
  const mix = await ensureMix(proj, plan);
  const full = path.join(rdir, `full-${size}.mp4`);
  await U.ffmpeg(['-i', vid, '-i', mix, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', size === '1080p' ? '192k' : '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', full]);
  Project.mark(proj, 'animate', { size });
  return { out: full, video: vid, size };
}

async function check(proj, opts = {}) {
  const { plan } = ensurePlan(proj, true);
  const r0 = await renderFull(proj, plan, { size: opts.size || '1080p' });
  U.step('Checking the video');
  const res = await Check.checkVideo(proj, r0.out, plan);
  if (res.passed) U.ok('All automatic checks passed');
  else res.problems.forEach((p) => U.log(U.color.red('✗ ' + p)));
  res.notes.forEach((n) => U.log(U.color.dim('  ' + n)));
  if (res.loudness) U.log(U.color.dim(`  loudness ${res.loudness.integratedLUFS} LUFS, peak ${res.loudness.truePeakDBFS} dBFS`));
  U.log('Contact sheets for the critic:');
  res.sheets.forEach((s) => U.log('  ' + path.relative(process.cwd(), proj.p(s))));
  Project.mark(proj, 'check', { passed: res.passed });
  return res;
}

async function finish(proj, opts = {}) {
  const { plan } = ensurePlan(proj, true);
  const size = String(opts.size || '1080p').toLowerCase();
  if (!Render.SIZES[size]) U.fail('Size must be 1080p, 2k or 4k');
  const r0 = await renderFull(proj, plan, { size });
  const odir = U.ensureDir(proj.p('out'));
  const base = proj.slug;
  const outVid = path.join(odir, `${base}${size === '1080p' ? '' : '-' + size}.mp4`);
  fs.copyFileSync(r0.out, outVid);
  if (U.exists(proj.p('captions.srt'))) fs.copyFileSync(proj.p('captions.srt'), path.join(odir, `${base}.srt`));
  const coverT = opts.cover != null ? parseFloat(opts.cover) : plan.stills.first.t;
  const coverPng = path.join(odir, '.cover.png');
  await Render.renderStills({ plan, style: proj.style, shots: [{ t: coverT, file: coverPng }], size });
  await U.ffmpeg(['-i', coverPng, '-q:v', '2', path.join(odir, 'cover.jpg')]);
  fs.rmSync(coverPng, { force: true });
  // look inside the finished file before saying done
  const info = await U.probe(outVid);
  const v = info.streams.find((s) => s.codec_type === 'video'), a = info.streams.find((s) => s.codec_type === 'audio');
  const dur = parseFloat(info.format.duration);
  const exp = Render.SIZES[size];
  const verified = [];
  const fails = [];
  (v && v.width === exp.w && v.height === exp.h ? verified : fails).push(`picture ${v ? v.width + '×' + v.height : 'missing'}`);
  (a ? verified : fails).push(a ? `sound ${a.codec_name} ${a.sample_rate} Hz` : 'sound missing');
  (Math.abs(dur - plan.duration) < 0.25 ? verified : fails).push(`length ${dur.toFixed(2)}s`);
  const L = U.readJSON(proj.p('audio', 'loudness.json'), {});
  const post = proj.script.post || {};
  const note = [
    `# ${proj.script.title || base}`, '',
    `- Video: \`${path.basename(outVid)}\` — ${exp.w}×${exp.h}, ${plan.fps} fps, ${dur.toFixed(1)} s`,
    U.exists(path.join(odir, `${base}.srt`)) ? `- Captions: \`${base}.srt\`` : '- Captions: none (no narrator)',
    '- Cover: `cover.jpg`',
    `- Style: ${proj.style.id || ''} ${proj.style.name || ''}`,
    `- Sound: ${L.integratedLUFS} LUFS, peak ${L.truePeakDBFS} dBFS${L.voiceOverMusicDb != null ? `, voice ${L.voiceOverMusicDb} dB over music` : ''}, music: ${L.music || plan.music.mood}`,
    '', '## Post', '', post.caption || proj.script.title || '', '', (post.hashtags || []).map((h) => (h.startsWith('#') ? h : '#' + h)).join(' '),
    '', '## What would you change?', '', 'Tell me a line, a scene, the voice, the music or the pace, and I will change just that.', '',
  ].join('\n');
  fs.writeFileSync(path.join(odir, 'note.md'), note);
  if (fails.length) { fails.forEach((f) => U.log(U.color.red('✗ ' + f))); U.fail('The finished file did not pass its final look'); }
  U.ok(`Finished and verified (${verified.join(', ')})`);
  U.log(`  ${path.relative(process.cwd(), outVid)}`);
  U.log(`  ${path.relative(process.cwd(), path.join(odir, 'cover.jpg'))}`);
  if (U.exists(path.join(odir, `${base}.srt`))) U.log(`  ${path.relative(process.cwd(), path.join(odir, base + '.srt'))}`);
  U.log(`  ${path.relative(process.cwd(), path.join(odir, 'note.md'))}`);
  Project.mark(proj, 'finish', { size, file: path.relative(proj.dir, outVid) });
  return { out: outVid, verified };
}

/* "Just make it": every step in order; the agent still looks at the stills and the first seconds itself. */
async function make(proj, opts = {}) {
  U.log(U.color.bold(`\nMaking "${proj.script.title}"\n`));
  await voice(proj, opts);
  proj = Project.load(proj.dir);
  const p = await plan(proj);
  if (p.issues.errors.length) U.fail('Plan has errors');
  await sound(proj);
  await stills(proj, {});
  if (!opts.skipFirst) await render(proj, { first: true });
  const c = await check(proj, { size: '1080p' });
  if (!c.passed) U.warn('Automatic checks found problems (see above). Finishing anyway; fix and re-run finish if needed.');
  return finish(proj, { size: opts.size || '1080p' });
}

module.exports = { plan, voice, sound, stills, render, check, finish, make, ensurePlan, firstSecondsEnd };
