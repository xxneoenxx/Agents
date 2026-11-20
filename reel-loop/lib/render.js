'use strict';
/* Frame renderer: drives player.html in headless Chromium, one screenshot per frame,
   piped straight into ffmpeg. Several pages render contiguous chunks in parallel. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { once } = require('events');
const { pathToFileURL } = require('url');
const { spawn } = require('child_process');
const U = require('./util');

const SIZES = { '1080p': { w: 1080, h: 1920, scale: 1 }, '2k': { w: 1440, h: 2560, scale: 1440 / 1080 }, '4k': { w: 2160, h: 3840, scale: 2 } };
function sizeInfo(name) { const k = String(name || '1080p').toLowerCase(); return SIZES[k] || SIZES['1080p']; }

/* Find font files for the style: @fontsource packages in node_modules, else none (system font is used). */
function resolveFonts(style) {
  const out = []; const seen = new Set();
  const roots = [path.join(U.ROOT, 'node_modules', '@fontsource')];
  const fonts = (style && style.fonts) || {};
  for (const key of Object.keys(fonts)) {
    const f = fonts[key]; if (!f || !f.family) continue;
    const pkg = f.pkg || U.slugify(f.family);
    const weights = f.weights || (f.weight ? [f.weight] : [400, 700, 900]);
    for (const w of weights) {
      for (const subset of ['latin', 'latin-ext']) {
        const id = `${pkg}-${subset}-${w}`; if (seen.has(id)) continue;
        for (const r of roots) {
          const file = path.join(r, pkg, 'files', `${pkg}-${subset}-${w}-normal.woff2`);
          if (U.exists(file)) { seen.add(id); out.push({ family: f.family, weight: w, data: fs.readFileSync(file).toString('base64') }); break; }
        }
      }
    }
  }
  return out;
}

async function openPlayer(browser, plan, style, scale) {
  const context = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: scale || 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(pathToFileURL(U.PLAYER_HTML).href);
  const fonts = resolveFonts(style);
  await page.evaluate(async ({ plan, style, fonts }) => { await window.REEL.setup(plan, style, { fonts }); }, { plan, style, fonts });
  const cdp = await context.newCDPSession(page);
  return { page, context, cdp, errors };
}

async function shot(P, type, quality) {
  const params = { format: type, optimizeForSpeed: true, captureBeyondViewport: false, fromSurface: true };
  if (type === 'jpeg') params.quality = quality || 92;
  const r = await P.cdp.send('Page.captureScreenshot', params);
  return Buffer.from(r.data, 'base64');
}

async function seek(P, t) { await P.page.evaluate((tt) => window.REEL.seek(tt), t); }

/* Render a time range to an mp4 (video only, or muxed with audio). */
async function renderVideo(o) {
  o = Object.assign({}, o, { out: path.resolve(o.out), audio: o.audio ? path.resolve(o.audio) : null });
  const plan = o.plan, style = o.style;
  const fps = o.fps || plan.fps || 30;
  const from = Math.max(0, o.from || 0);
  const to = Math.min(o.to != null ? o.to : plan.duration, plan.duration);
  const f0 = Math.round(from * fps), f1 = Math.max(f0 + 1, Math.round(to * fps));
  const total = f1 - f0;
  const size = sizeInfo(o.size);
  const workers = Math.max(1, Math.min(o.workers || Math.min(4, os.cpus().length), Math.ceil(total / 30)));
  const tmp = U.ensureDir(path.join(path.dirname(o.out), '.frames-' + process.pid + '-' + Date.now()));
  const preset = o.final ? 'medium' : 'veryfast';
  const imgType = o.png ? 'png' : 'jpeg';
  const browser = await U.launchBrowser();
  let done = 0, lastPct = -1;
  const t0 = Date.now();
  const report = () => {
    const pct = Math.floor((done / total) * 100);
    if (pct >= lastPct + 10 || done === total) {
      lastPct = pct;
      const el = (Date.now() - t0) / 1000;
      U.log(U.color.dim(`  frames ${done}/${total} (${pct}%) ${el.toFixed(0)}s`));
    }
  };
  const chunk = Math.ceil(total / workers);
  const segs = [];
  const allErrors = [];
  try {
    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const a = f0 + w * chunk, b = Math.min(f1, a + chunk);
      if (a >= b) return;
      const seg = path.join(tmp, `seg${String(w).padStart(2, '0')}.mp4`);
      segs[w] = seg;
      const P = await openPlayer(browser, plan, style, size.scale);
      const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', imgType === 'png' ? 'png' : 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', preset, '-crf', String(o.crf || 18), '-pix_fmt', 'yuv420p', '-r', String(fps), seg], { stdio: ['pipe', 'ignore', 'pipe'] });
      let ffErr = '';
      ff.stderr.on('data', (d) => { ffErr += d; });
      const exit = new Promise((res) => ff.on('close', res));
      for (let f = a; f < b; f++) {
        await seek(P, f / fps);
        const buf = await shot(P, imgType, o.quality || 92);
        if (!ff.stdin.write(buf)) await once(ff.stdin, 'drain');
        done++; report();
      }
      ff.stdin.end();
      const code = await exit;
      allErrors.push(...P.errors);
      await P.context.close();
      if (code !== 0) throw new Error('ffmpeg encoding failed: ' + ffErr.slice(-800));
    }));
  } finally {
    await browser.close();
  }
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, segs.filter(Boolean).map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'));
  const silent = o.audio ? path.join(tmp, 'video.mp4') : o.out;
  await U.ffmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', silent]);
  if (o.audio) {
    await U.ffmpeg(['-i', silent, '-ss', String(from), '-t', String(to - from), '-i', o.audio, '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-shortest', '-movflags', '+faststart', o.out]);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const secs = (Date.now() - t0) / 1000;
  return { out: o.out, frames: total, seconds: secs, fpsRendered: total / secs, errors: [...new Set(allErrors)] };
}

/* Render single frames as PNG (or JPEG) files. */
async function renderStills(o) {
  const size = sizeInfo(o.size);
  const browser = await U.launchBrowser();
  const files = [];
  let errors = [];
  try {
    const P = await openPlayer(browser, o.plan, o.style, size.scale);
    for (const s of o.shots) {
      await seek(P, s.t);
      const type = /\.jpe?g$/i.test(s.file) ? 'jpeg' : 'png';
      const buf = await shot(P, type, 92);
      U.ensureDir(path.dirname(s.file));
      fs.writeFileSync(s.file, buf);
      files.push(s.file);
    }
    errors = P.errors;
    await P.context.close();
  } finally { await browser.close(); }
  return { files, errors: [...new Set(errors)] };
}

module.exports = { renderVideo, renderStills, resolveFonts, sizeInfo, SIZES };
