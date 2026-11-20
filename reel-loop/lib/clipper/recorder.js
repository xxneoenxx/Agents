'use strict';
/* Background recorder for live clipping: yt-dlp pipes the live stream into ffmpeg,
   which writes fixed-length segments (rec/seg0000.ts, ...). Started by "clip live". */
const { spawn } = require('child_process');
const path = require('path');

const [url, dir, segSeconds] = process.argv.slice(2);
if (!url || !dir) { console.error('usage: recorder.js <url> <dir> <segmentSeconds>'); process.exit(1); }
const log = (m) => console.log(new Date().toISOString(), m);

function start() {
  log(`recording ${url} in ${segSeconds}s segments`);
  const y = spawn('yt-dlp', ['--no-warnings', '-f', 'best[height<=720]/best', '--hls-use-mpegts', '-o', '-', url], { stdio: ['ignore', 'pipe', 'inherit'] });
  const f = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'warning', '-i', 'pipe:0', '-c', 'copy', '-f', 'segment', '-segment_time', String(segSeconds || 720), '-reset_timestamps', '1', path.join(dir, 'rec', 'seg%04d.ts')], { stdio: ['pipe', 'inherit', 'inherit'] });
  y.stdout.pipe(f.stdin);
  const stop = () => { try { y.kill('SIGTERM'); } catch (e) { /* */ } try { f.stdin.end(); } catch (e) { /* */ } };
  process.on('SIGTERM', () => { log('stopping'); stop(); setTimeout(() => process.exit(0), 3000); });
  y.on('close', (code) => { log(`stream ended (yt-dlp exit ${code})`); try { f.stdin.end(); } catch (e) { /* */ } });
  f.on('close', (code) => { log(`ffmpeg exit ${code}`); process.exit(0); });
}
start();
