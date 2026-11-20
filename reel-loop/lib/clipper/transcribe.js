'use strict';
/* Optional: word timings for clip captions from OpenAI's speech-to-text (whisper-1), when OPENAI_API_KEY is set.
   Returns [{ w, s, e }] in the file's own seconds, or null without a key. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const U = require('../util');

async function transcribe(file, ss, to, language) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const tmp = path.join(os.tmpdir(), `reel-stt-${process.pid}-${Date.now()}.mp3`);
  await U.ffmpeg(['-ss', String(ss), '-to', String(to), '-i', file, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'libmp3lame', '-b:a', '64k', tmp]);
  try {
    const fd = new FormData();
    fd.append('file', new Blob([fs.readFileSync(tmp)], { type: 'audio/mpeg' }), 'clip.mp3');
    fd.append('model', 'whisper-1');
    fd.append('response_format', 'verbose_json');
    fd.append('timestamp_granularities[]', 'word');
    if (language) fd.append('language', String(language).slice(0, 2));
    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + key }, body: fd });
    if (!r.ok) throw new Error(`transcription HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    const j = await r.json();
    return (j.words || []).map((w) => ({ w: String(w.word).trim(), s: ss + Number(w.start), e: ss + Number(w.end) })).filter((w) => w.w);
  } finally { fs.rmSync(tmp, { force: true }); }
}

module.exports = { transcribe };
