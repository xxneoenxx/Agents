'use strict';
/* Step 1, Setup: checks the computer has what it needs and says what is missing, how big it is and why. */
const { spawnSync } = require('child_process');
const U = require('./util');
const V = require('./voice');

const INSTALL = {
  ffmpeg: { size: '~80 MB', why: 'encodes the video and mixes the sound', mac: 'brew install ffmpeg', win: 'winget install Gyan.FFmpeg', linux: 'sudo apt install ffmpeg' },
  chromium: { size: '~170 MB', why: 'draws every frame of the animation', all: 'cd reel-loop && npm install && npx playwright install chromium' },
  fonts: { size: '~35 MB', why: 'the typefaces the styles use', all: 'cd reel-loop && npm install' },
  'yt-dlp': { size: '~3 MB', why: 'only for the stream clipper: downloads parts of YouTube/Twitch/Kick streams', mac: 'brew install yt-dlp', win: 'winget install yt-dlp', linux: 'pip install yt-dlp' },
  'edge-tts': { size: '~1 MB', why: 'a free narrator voice (Microsoft Edge voices, needs internet)', all: 'pip install edge-tts' },
  streamlink: { size: '~10 MB', why: 'records live streams reliably and skips Twitch ad breaks (live autopilot)', all: 'pip install streamlink' },
};
function how(k) { const i = INSTALL[k]; const p = process.platform; return i.all || (p === 'darwin' ? i.mac : p === 'win32' ? i.win : i.linux); }

async function doctor(opts = {}) {
  const rows = []; const missing = [];
  const add = (name, ok, detail, key, optional) => { rows.push({ name, ok, detail, optional }); if (!ok && key) missing.push({ key, optional }); };
  const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
  add('Node.js ≥ 18', nodeMajor >= 18, process.versions.node);
  const ff = U.which('ffmpeg'), fp = U.which('ffprobe');
  let ffv = '';
  if (ff) { const r = spawnSync('ffmpeg', ['-hide_banner', '-filters'], { encoding: 'utf8' }); ffv = /loudnorm/.test(r.stdout) ? 'loudnorm ok' : 'no loudnorm filter'; if (!/ subtitles /.test(r.stdout)) ffv += ', no libass (clipper captions off)'; }
  add('ffmpeg + ffprobe', !!(ff && fp), ff ? ffv : 'not found', 'ffmpeg');
  let chromeOk = false, chromeDetail = '';
  try {
    const b = await U.launchBrowser(); chromeDetail = 'Chromium ' + b.version(); await b.close(); chromeOk = true;
  } catch (e) { chromeDetail = e.message.split('\n')[0].slice(0, 120); }
  add('Playwright + Chromium', chromeOk, chromeDetail, 'chromium');
  const fontsOk = U.exists(require('path').join(U.ROOT, 'node_modules', '@fontsource', 'inter'));
  add('Style fonts', fontsOk, fontsOk ? 'installed' : 'not installed (system fonts will be used)', 'fonts', true);
  const ps = V.providersStatus();
  add('Voice: ElevenLabs key', ps.elevenlabs, ps.elevenlabs ? 'ELEVENLABS_API_KEY set' : 'optional: export ELEVENLABS_API_KEY=…', null, true);
  add('Voice: OpenAI key', ps.openai, ps.openai ? 'OPENAI_API_KEY set' : 'optional: export OPENAI_API_KEY=…', null, true);
  add('Voice: free Edge voices', ps.edge, ps.edge ? 'edge-tts installed' : 'optional', 'edge-tts', true);
  add('Voice: built-in system voice', ps.system, ps.system ? (process.platform === 'darwin' ? 'say' : process.platform === 'win32' ? 'Windows SAPI' : 'espeak') : 'optional', null, true);
  const yt = U.which('yt-dlp');
  add('Clipper: yt-dlp', !!yt, yt ? 'found' : 'optional, only for stream clipping', 'yt-dlp', true);
  const sl = U.which('streamlink');
  add('Live autopilot: streamlink', !!sl, sl ? 'found (filters Twitch ads)' : 'optional, recommended for Twitch live recording', 'streamlink', true);
  const claude = require('./clipper/judge').hasClaudeCredentials();
  add('Live autopilot: Claude judge', claude, claude ? 'ANTHROPIC_API_KEY set' : 'optional: export ANTHROPIC_API_KEY=… (else the chat/audio score decides alone)', null, true);
  const tt = require('./clipper/tiktok').loggedIn();
  add('Live autopilot: TikTok upload', tt, tt ? 'connected' : 'optional: clip tiktok setup, then clip tiktok login', null, true);
  const voiceAny = ps.elevenlabs || ps.openai || ps.edge || ps.system;
  U.log(U.color.bold('\nReel Loop setup check\n'));
  for (const r of rows) U.log(`${r.ok ? U.color.green('✓') : r.optional ? U.color.yellow('○') : U.color.red('✗')} ${r.name.padEnd(30)} ${U.color.dim(r.detail || '')}`);
  const need = missing.filter((m) => !m.optional);
  if (missing.length) {
    U.log(U.color.bold('\nMissing (installed only after you say yes):'));
    for (const m of missing) { const i = INSTALL[m.key]; U.log(`  ${m.optional ? '(optional) ' : ''}${m.key}: ${i.size}, ${i.why}\n    ${U.color.cyan(how(m.key))}`); }
  }
  U.log(`\nNarrator: ${voiceAny ? U.color.green('available') + ` (auto picks: ${V.detectProvider()})` : U.color.yellow('no voice service; videos can still be made without a narrator, or with your own recording')}`);
  const ready = need.length === 0;
  U.log(ready ? U.color.green('\nReady to make videos.') : U.color.red('\nNot ready yet.'));
  return { ready, rows, missing };
}

module.exports = { doctor };
