'use strict';
/* Live chat readers for the autopilot.
   - Twitch: anonymous read-only IRC (no account, no key).
   - YouTube: yt-dlp's live chat downloader, tailed while it writes.
   - Simulation: replays a chat file in step with a simulated stream.
   Every message is handed to onMsg({ wall, text, user }) with wall = milliseconds since epoch
   (or { st, text } with st = stream seconds in simulation). */
const fs = require('fs');
const tls = require('tls');
const { spawn } = require('child_process');

function platformFromUrl(url) {
  const u = String(url || '').toLowerCase();
  if (u.includes('twitch.tv')) return 'Twitch';
  if (u.includes('kick.com')) return 'Kick';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YouTube';
  return 'stream';
}
function twitchChannel(url) {
  const m = String(url || '').match(/twitch\.tv\/(?!videos\/)([A-Za-z0-9_]{3,})/i);
  return m ? m[1].toLowerCase() : null;
}

function twitchChat(channel, onMsg, log) {
  let sock = null, stopped = false, backoff = 2000, buf = '';
  const connect = () => {
    buf = '';
    sock = tls.connect(6697, 'irc.chat.twitch.tv', { servername: 'irc.chat.twitch.tv' }, () => {
      sock.write('CAP REQ :twitch.tv/tags\r\n');
      sock.write('PASS SCHMOOPIIE\r\n');
      sock.write(`NICK justinfan${10000 + Math.floor(Math.random() * 80000)}\r\n`);
      sock.write(`JOIN #${channel}\r\n`);
      log(`chat: connected to #${channel}`);
      backoff = 2000;
    });
    sock.setEncoding('utf8');
    sock.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\r\n')) >= 0) {
        const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (line.startsWith('PING')) { sock.write('PONG :tmi.twitch.tv\r\n'); continue; }
        const m = line.match(/^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/);
        if (!m) continue;
        const tags = {};
        (m[1] || '').split(';').forEach((kv) => { const k = kv.indexOf('='); if (k > 0) tags[kv.slice(0, k)] = kv.slice(k + 1); });
        onMsg({ wall: tags['tmi-sent-ts'] ? Number(tags['tmi-sent-ts']) : Date.now(), user: m[2], text: m[3] });
      }
    });
    sock.on('error', (e) => log('chat error: ' + e.message));
    sock.on('close', () => { if (!stopped) { log(`chat: reconnecting in ${backoff / 1000}s`); setTimeout(connect, backoff); backoff = Math.min(backoff * 2, 60000); } });
  };
  connect();
  return { stop() { stopped = true; try { sock.end(); } catch (e) { /* closed */ } } };
}

/* yt-dlp writes one JSON object per line while the stream is live; we read new lines every 2 s. */
function youtubeChat(url, file, onMsg, log) {
  let stopped = false, pos = 0, rest = '';
  const p = spawn('yt-dlp', ['--no-warnings', '--skip-download', '--write-subs', '--sub-langs', 'live_chat', '-o', file.replace(/\.live_chat\.json$/, '') + '.%(ext)s', url], { stdio: ['ignore', 'ignore', 'pipe'] });
  p.stderr.on('data', (d) => { const s = String(d).trim(); if (/error/i.test(s)) log('youtube chat: ' + s.slice(0, 200)); });
  p.on('close', (c) => { if (!stopped) log(`youtube chat downloader ended (${c})`); });
  const timer = setInterval(() => {
    if (!fs.existsSync(file)) return;
    const size = fs.statSync(file).size;
    if (size <= pos) return;
    const fd = fs.openSync(file, 'r'); const b = Buffer.alloc(size - pos); fs.readSync(fd, b, 0, b.length, pos); fs.closeSync(fd);
    pos = size;
    const lines = (rest + b.toString('utf8')).split('\n'); rest = lines.pop();
    for (const line of lines) {
      const ts = line.match(/"timestampUsec"\s*:\s*"(\d+)"/);
      if (!ts) continue;
      const texts = [...line.matchAll(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((x) => { try { return JSON.parse('"' + x[1] + '"'); } catch (e) { return x[1]; } });
      const emo = [...line.matchAll(/"shortcuts"\s*:\s*\["((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
      onMsg({ wall: Math.round(Number(ts[1]) / 1000), user: '', text: (texts.join(' ') + ' ' + emo.join(' ')).trim() });
    }
  }, 2000);
  return { stop() { stopped = true; clearInterval(timer); try { p.kill('SIGTERM'); } catch (e) { /* gone */ } } };
}

/* Simulation: a JSON-lines file of {"t": seconds, "text": "..."} or a YouTube chat replay
   (videoOffsetTimeMsec). Messages are emitted in step with a stream played at `speed`. */
function simChat(file, speed, onMsg) {
  const raw = fs.readFileSync(file, 'utf8');
  const msgs = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    const off = line.match(/"videoOffsetTimeMsec"\s*:\s*"?(\d+)/);
    if (off) {
      const texts = [...line.matchAll(/"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g)].map((x) => { try { return JSON.parse('"' + x[1] + '"'); } catch (e) { return x[1]; } });
      msgs.push({ st: Number(off[1]) / 1000, text: texts.join(' ') });
      continue;
    }
    try { const j = JSON.parse(line); if (j.t != null) msgs.push({ st: Number(j.t), text: String(j.text || '') }); } catch (e) { /* skip */ }
  }
  msgs.sort((a, b) => a.st - b.st);
  const t0 = Date.now();
  const timers = msgs.map((m) => setTimeout(() => onMsg({ st: m.st, text: m.text, user: 'sim' }), (m.st * 1000) / (speed || 1)));
  return { stop() { timers.forEach(clearTimeout); }, count: msgs.length, t0 };
}

module.exports = { platformFromUrl, twitchChannel, twitchChat, youtubeChat, simChat };
