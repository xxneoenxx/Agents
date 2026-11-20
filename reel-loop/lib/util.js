'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PLAYER_HTML = path.join(ROOT, 'player', 'player.html');
const STYLES_DIR = path.join(ROOT, 'styles');

const isTTY = process.stdout.isTTY;
const c = (code) => (s) => (isTTY ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const color = { dim: c(2), bold: c(1), green: c(32), yellow: c(33), red: c(31), cyan: c(36) };

function log(...a) { console.log(...a); }
function step(msg) { console.log(color.cyan('›'), msg); }
function ok(msg) { console.log(color.green('✓'), msg); }
function warn(msg) { console.log(color.yellow('!'), msg); }
function fail(msg) { const e = new Error(msg); e.userError = true; throw e; }

function readJSON(p, fallback) {
  if (!fs.existsSync(p)) { if (fallback !== undefined) return fallback; fail(`File not found: ${p}`); }
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { fail(`${p} is not valid JSON: ${e.message}`); }
}
function writeJSON(p, obj) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n'); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); return p; }
function hash(x) { return crypto.createHash('sha1').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 12); }
function exists(p) { try { fs.accessSync(p); return true; } catch (e) { return false; } }

function which(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null;
}

/* Run a command. Resolves {code, stdout(Buffer), stderr(string)}. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    let p;
    try {
      p = spawn(cmd, args, { stdio: [opts.input != null || opts.stdin ? 'pipe' : 'ignore', 'pipe', 'pipe'], cwd: opts.cwd, env: opts.env || process.env });
    } catch (e) { reject(e); return; }
    const out = []; const err = [];
    p.stdout.on('data', (d) => { if (!opts.noBuffer) out.push(d); if (opts.onStdout) opts.onStdout(d); });
    p.stderr.on('data', (d) => { err.push(d); if (err.length > 400) err.splice(0, 200); if (opts.onStderr) opts.onStderr(d); });
    p.on('error', (e) => reject(e.code === 'ENOENT' ? Object.assign(new Error(`"${cmd}" is not installed (run: node bin/loop.js doctor)`), { userError: true }) : e));
    p.on('close', (code) => {
      const res = { code, stdout: Buffer.concat(out), stderr: Buffer.concat(err).toString() };
      if (code !== 0 && !opts.allowFail) {
        const e = new Error(`${path.basename(cmd)} failed (exit ${code}): ${args.join(' ').slice(0, 240)}\n${res.stderr.slice(-1500)}`);
        e.res = res; reject(e);
      } else resolve(res);
    });
    if (opts.input != null) p.stdin.end(opts.input);
    if (opts.stdin) opts.stdin(p.stdin);
  });
}

async function ffmpeg(args, opts) { return run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], opts); }
async function probe(file) {
  const r = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  return JSON.parse(r.stdout.toString());
}
async function mediaDuration(file) { const j = await probe(file); return parseFloat(j.format.duration) || 0; }

/* Decode any audio file to mono Float32 samples. */
async function decodeAudio(file, rate = 48000) {
  const r = await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-ac', '1', '-ar', String(rate), '-f', 'f32le', '-']);
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength - (b.byteLength % 4)));
}

/* Write 16-bit PCM WAV from one or two Float32 channels. */
function writeWav(file, channels, rate = 48000) {
  const nch = channels.length, n = channels[0].length;
  const buf = Buffer.alloc(44 + n * nch * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nch * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(nch, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * nch * 2, 28); buf.writeUInt16LE(nch * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * nch * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) for (let ch = 0; ch < nch; ch++) {
    let v = channels[ch][i]; v = v > 1 ? 1 : v < -1 ? -1 : v;
    buf.writeInt16LE(Math.round(v * 32767), o); o += 2;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
      const k = a.slice(2), nx = argv[i + 1];
      if (nx != null && !nx.startsWith('--')) { out[k] = nx; i++; } else out[k] = true;
    } else out._.push(a);
  }
  return out;
}

function slugify(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'video';
}
function fmtTime(s) { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(1).padStart(4, '0')}`; }
function fmtSrtTime(s) {
  s = Math.max(0, s); const ms = Math.round(s * 1000);
  const hh = Math.floor(ms / 3600000), mm = Math.floor((ms % 3600000) / 60000), ss = Math.floor((ms % 60000) / 1000), mmm = ms % 1000;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')},${String(mmm).padStart(3, '0')}`;
}
function parseTime(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  const parts = String(v).split(':').map(Number);
  if (parts.some((x) => isNaN(x))) return null;
  return parts.reduce((a, b) => a * 60 + b, 0);
}

function loadPlaywright() {
  const tries = [() => require(path.join(ROOT, 'node_modules', 'playwright')), () => require('playwright'), () => require('playwright-core')];
  for (const t of tries) { try { return t(); } catch (e) { /* next */ } }
  fail('Playwright is not installed. In reel-loop/ run: npm install && npx playwright install chromium');
}
async function launchBrowser() {
  const pw = loadPlaywright();
  const opts = { args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb', '--allow-file-access-from-files'] };
  if (process.env.REEL_CHROMIUM) opts.executablePath = process.env.REEL_CHROMIUM;
  return pw.chromium.launch(opts);
}

module.exports = {
  ROOT, PLAYER_HTML, STYLES_DIR, color, log, step, ok, warn, fail, readJSON, writeJSON, ensureDir, hash, exists, which,
  run, ffmpeg, probe, mediaDuration, decodeAudio, writeWav, parseArgs, slugify, fmtTime, fmtSrtTime, parseTime,
  loadPlaywright, launchBrowser,
};
