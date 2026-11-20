'use strict';
/* Step 11, Check: automated checks on the rendered file plus contact sheets for a fresh critic. */
const fs = require('fs');
const path = require('path');
const U = require('./util');
const { measureLoudness } = require('./audio');

async function checkVideo(proj, file, plan) {
  const cdir = U.ensureDir(proj.p('check'));
  for (const f of fs.readdirSync(cdir)) if (/^sheet-\d+\.jpg$/.test(f)) fs.rmSync(path.join(cdir, f));
  const res = { file: path.relative(proj.dir, file), problems: [], notes: [], sheets: [] };
  const info = await U.probe(file);
  const v = info.streams.find((s) => s.codec_type === 'video');
  const a = info.streams.find((s) => s.codec_type === 'audio');
  const dur = parseFloat(info.format.duration);
  res.video = v ? { width: v.width, height: v.height, fps: v.r_frame_rate, codec: v.codec_name, pix: v.pix_fmt } : null;
  res.duration = +dur.toFixed(2);
  if (!v) res.problems.push('No video stream');
  if (v && v.width * 16 !== v.height * 9) res.problems.push(`Not 9:16: ${v.width}x${v.height}`);
  if (Math.abs(dur - plan.duration) > 0.25) res.problems.push(`Length ${dur.toFixed(2)}s differs from the plan (${plan.duration.toFixed(2)}s)`);
  const narrated = plan.scenes.some((s) => s.voice);
  if (!a) res.problems.push('No audio track');
  // black, frozen, silent
  const det = await U.run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vf', 'blackdetect=d=0.4:pix_th=0.08,freezedetect=n=0.002:d=3.5', '-af', 'silencedetect=n=-50dB:d=1.6', '-f', 'null', '-'], { allowFail: true });
  const black = [...det.stderr.matchAll(/black_start:([0-9.]+) black_end:([0-9.]+)/g)].map((m) => [+m[1], +m[2]]);
  const freeze = [...det.stderr.matchAll(/freeze_start: ([0-9.]+)[\s\S]*?freeze_end: ([0-9.]+)/g)].map((m) => [+m[1], +m[2]]);
  const silence = [...det.stderr.matchAll(/silence_start: ([0-9.]+)[\s\S]*?silence_end: ([0-9.]+)/g)].map((m) => [+m[1], +m[2]]);
  black.forEach(([s, e]) => res.problems.push(`Black picture ${s.toFixed(1)}-${e.toFixed(1)}s`));
  freeze.forEach(([s, e]) => res.problems.push(`Picture does not move ${s.toFixed(1)}-${e.toFixed(1)}s (${(e - s).toFixed(1)}s)`));
  silence.filter(([s, e]) => e - s > 1.6 && s > 0.3 && e < dur - 0.5).forEach(([s, e]) => res.problems.push(`Silence ${s.toFixed(1)}-${e.toFixed(1)}s`));
  if (a) {
    res.loudness = await measureLoudness(file);
    const L = res.loudness;
    if (L.integratedLUFS != null && (L.integratedLUFS > -11.5 || L.integratedLUFS < -17)) res.problems.push(`Loudness ${L.integratedLUFS} LUFS (aim for -14)`);
    if (L.truePeakDBFS != null && L.truePeakDBFS > -0.5) res.problems.push(`Peaks at ${L.truePeakDBFS} dBFS may distort (keep under -1)`);
    const lj = U.readJSON(proj.p('audio', 'loudness.json'), null);
    if (lj && lj.voiceOverMusicDb != null) {
      res.loudness.voiceOverMusicDb = lj.voiceOverMusicDb;
      if (narrated && lj.voiceOverMusicDb < 8) res.problems.push(`Music is close to the voice (${lj.voiceOverMusicDb} dB); lower music.volume`);
    }
  }
  // the plan's own warnings again
  const scenesOver = plan.scenes.filter((s) => s.duration > 12).map((s) => s.id);
  if (scenesOver.length) res.notes.push(`Long scenes: ${scenesOver.join(', ')}`);
  // contact sheets: one frame per second, 5 x 4 per sheet
  const per = 20; const step = dur > 80 ? dur / 60 : 1;
  const nSheets = Math.ceil(dur / step / per);
  for (let k = 0; k < nSheets; k++) {
    const out = path.join(cdir, `sheet-${String(k + 1).padStart(2, '0')}.jpg`);
    const ss = k * per * step;
    await U.ffmpeg(['-ss', String(ss), '-t', String(per * step), '-i', file, '-vf', `fps=1/${step},scale=216:384,drawtext=text='%{pts\\:hms}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,tile=5x4:padding=4:color=white`, '-frames:v', '1', '-q:v', '3', out], { allowFail: true });
    if (U.exists(out)) res.sheets.push(path.relative(proj.dir, out));
  }
  res.passed = res.problems.length === 0;
  U.writeJSON(path.join(cdir, 'report.json'), res);
  return res;
}

module.exports = { checkVideo };
