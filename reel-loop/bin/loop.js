#!/usr/bin/env node
'use strict';
/* Reel Loop command line. Run from anywhere: node reel-loop/bin/loop.js <command> */
const fs = require('fs');
const path = require('path');
const U = require('../lib/util');

const HELP = `
Reel Loop — one line in, one finished animated vertical video out.

Setup
  doctor                              Step 1: check ffmpeg, Chromium, fonts, voices, yt-dlp

Styles
  styles [list]                       All styles in the library
  styles show <id>                    One style card (rules for colours, type, motion, sound)
  styles match "<topic>" [--n 5]      Styles that fit a topic, with reasons
  styles preview <id|file.json>... [--text "..."] [--out dir]
                                      Real still pictures of styles, to pick one
  styles learn <video> [--name "My style"] [--save]
                                      Measure a video you love (cuts, pace, colours) into a draft style card

A video  (<video> = folder under ./videos or a path)
  new "<title>" [--style S01] [--lang de] [--seconds 60] [--handle @you] [--voice auto|elevenlabs|openai|edge|system|recording|none]
  script <video>                      The script as a table: time, what you see, the words
  voice <video> [--samples] [--provider p] [--voice v] [--only s03,s04] [--force]
                                      Step 7: record every line (only changed lines are re-recorded)
  plan <video>                        Step 6: put every picture and sound on one clock, then check it
  stills <video> [--all] [--scene s03] [--at 1.5,7]
                                      Step 5: still pictures (default: first, busiest, quietest)
  sound <video>                       Step 10: music + effects under the voice, loudness, captions file
  render <video> --first              Step 8: the first 10-20 seconds with sound
  render <video> [--scene s04] [--from 0 --to 12]
                                      Preview a scene or a range
  render <video>                      Step 9: animate the whole video (cached)
  check <video>                       Step 11: automatic checks + contact sheets for the critic
  finish <video> [--size 1080p|2k|4k] Step 12: final file, captions, cover, note; verified
  make <video> [--size 1080p]         "Just make it": all steps in a row
  approve <video> script|look|first|finish [--note "..."]
  status <video>                      Which of the 12 steps are done
  demo [--voice none]                 Make the built-in German demo video end to end

Stream clipper
  clip fetch <url|file> [--out dir] [--range 1:00:00-2:30:00]
  clip analyze <dir> [--top 15] [--min 20 --max 60]
  clip frames <dir> [--top 12]
  clip cut <dir> --pick c01,c03 [--layout A|B|C|D|E] [--cam x,y,w,h] [--captions on|off] [--heading box|outline] [--fps 60]
  clip live <url> [--every 12] / clip live-check <dir> / clip live-stop <dir>
  clip layouts                        What layouts A-E look like

Live autopilot (watches a live stream, clips funny moments, uploads to TikTok)
  clip auto --init                    Write an autopilot.json template (url, permission, layout, upload …)
  clip auto [url] [--config autopilot.json] [--review] [--dry-run] [--layout A --cam x,y,w,h]
                                      Start in the background (drafts to TikTok by default)
  clip auto --simulate rec.mp4 --sim-chat chat.jsonl --speed 4 --dry-run --foreground
                                      Test the detection on a recording first
  clip auto-status <dir> · clip auto-stop <dir> · clip auto-approve <dir> m003
  clip auto-frame <url>               One frame from the live stream, to find the facecam
  clip tiktok setup --key … --secret … · clip tiktok login · clip tiktok status
  clip tiktok upload <file.mp4> [--mode draft|direct] [--privacy SELF_ONLY]
`;

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const a = U.parseArgs(argv.slice(1));
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') { console.log(HELP); return; }
  const Project = require('../lib/project');
  const P = () => require('../lib/pipeline');
  const load = () => Project.load(a._[0], a);
  switch (cmd) {
    case 'doctor': { const r = await require('../lib/doctor').doctor(a); process.exitCode = r.ready ? 0 : 2; return; }
    case 'styles': return stylesCmd(a);
    case 'new': {
      const r = Project.createProject(a._.join(' ') || a.title, a);
      U.ok(`Created ${path.relative(process.cwd(), r.dir) || r.dir}`);
      if (r.style) U.log(U.color.dim(`  style ${r.style.id} ${r.style.name} copied to style.json`));
      U.log(U.color.dim('  next: write script.json, then: script, voice, plan, stills'));
      return;
    }
    case 'script': { const proj = load(); console.log(Project.scriptTable(proj)); return; }
    case 'voice': return P().voice(load(), a);
    case 'plan': { const r = await P().plan(load()); if (r.issues.errors.length) process.exitCode = 1; return; }
    case 'stills': return P().stills(load(), a);
    case 'sound': return P().sound(load());
    case 'render': return P().render(load(), a);
    case 'check': return P().check(load(), a);
    case 'finish': return P().finish(load(), a);
    case 'make': return P().make(load(), a);
    case 'approve': {
      const proj = load(); const step = a._[1];
      if (!['script', 'look', 'first', 'finish'].includes(step)) U.fail('approve <video> script|look|first|finish');
      Project.approve(proj, step, a.note); U.ok(`Approved: ${step}`); return;
    }
    case 'status': { const proj = load(); console.log(`${proj.script.title}  (${proj.dir})\n`); console.log(Project.status(proj)); return; }
    case 'demo': {
      const tpl = U.readJSON(path.join(U.ROOT, 'templates', 'demo-de.json'));
      if (a.voice) tpl.voice.provider = a.voice;
      const r = Project.createProject(tpl.title, { slug: 'demo-panamakanal', style: tpl.style, lang: 'de', seconds: tpl.targetSeconds, handle: tpl.handle, force: true });
      U.writeJSON(path.join(r.dir, 'script.json'), tpl);
      const proj = Project.load(r.dir);
      ['script', 'look'].forEach((s) => Project.approve(proj, s, 'demo'));
      await P().make(proj, a);
      return;
    }
    case 'clip': return require('../lib/clipper').cli(a);
    default: U.fail(`Unknown command "${cmd}". Run: node reel-loop/bin/loop.js help`);
  }
}

async function stylesCmd(a) {
  const S = require('../lib/styles');
  const sub = a._[0] || 'list';
  if (sub === 'list') {
    const all = S.loadAll();
    const cats = [...new Set(all.map((s) => s.category))];
    for (const c of cats) {
      console.log(U.color.bold(`\n${c}`));
      for (const s of all.filter((x) => x.category === c)) console.log(`  ${U.color.cyan(String(s.id).padEnd(4))} ${s.name.padEnd(24)} ${U.color.dim(s.bestFor || s.summary || '')}`);
    }
    console.log(U.color.dim(`\n${all.length} styles. Show one: styles show S01`));
    return;
  }
  if (sub === 'show') { const s = S.find(a._[1]); console.log(JSON.stringify(s, null, 2)); return; }
  if (sub === 'match') {
    const r = S.match(a._.slice(1).join(' '), a.n ? +a.n : 5);
    r.forEach((m, i) => console.log(`${i + 1}. ${U.color.cyan(m.id)} ${m.name} ${U.color.dim(`(${m.category}, score ${m.score})`)}\n   ${m.bestFor}\n   ${U.color.dim('matches: ' + (m.why.join(', ') || '—'))}`));
    return;
  }
  if (sub === 'preview') {
    const list = a._.slice(1).map((x) => S.find(x));
    if (!list.length) U.fail('styles preview S01 S05 …  or  styles preview look-a.json look-b.json');
    const files = await S.preview(list, a);
    files.forEach((f) => console.log(path.relative(process.cwd(), f)));
    return;
  }
  if (sub === 'learn') {
    const r = await S.learn(a._[1], a);
    U.ok(`Draft style ${r.style.id}: ${path.relative(process.cwd(), r.file)}`);
    U.log(`  pace: ${r.style.learnedFrom.secondsPerShot}s per shot (${r.style.learnedFrom.cuts} cuts), palette: ${r.style.learnedFrom.palette.slice(0, 5).map((p) => p.hex).join(' ')}`);
    U.log(`  look at ${path.relative(process.cwd(), r.sheet)} and the frame-*.jpg files, then refine fonts, background, captions and motion in the card.`);
    return;
  }
  U.fail('styles list | show <id> | match "<topic>" | preview <ids> | learn <video>');
}

main().catch((e) => {
  if (e && e.userError) { console.error(U.color.red('✗ ' + e.message)); process.exit(1); }
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
