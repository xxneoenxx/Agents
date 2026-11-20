'use strict';
/* Decides whether a detected moment becomes a clip, and writes its heading.
   - "claude": Claude looks at four frames, the chat and the words (needs ANTHROPIC_API_KEY or an `ant auth login` profile).
   - "heuristic": the chat/audio score decides alone and the heading comes from a template. */
const fs = require('fs');
const U = require('../util');

function hasClaudeCredentials() { return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN); }
function sdk() {
  let mod;
  try { mod = require('@anthropic-ai/sdk'); } catch (e) { U.fail('The Claude judge needs the Anthropic SDK: cd reel-loop && npm install'); }
  return mod.default || mod;
}

const SCHEMA = {
  type: 'object',
  properties: {
    post: { type: 'boolean', description: 'true if this should be posted as a clip' },
    funny: { type: 'integer', description: '0-10: how funny or shareable the moment is' },
    safe: { type: 'boolean', description: 'false if anything is unsuitable for TikTok' },
    kind: { type: 'string', description: 'kind of moment, e.g. crash-out, epic fail, funny NPC, glitch, chase, laughing fit, jump scare' },
    heading: { type: 'string', description: 'on-screen heading in the requested language, max 8 words, one emoji at the end' },
    caption: { type: 'string', description: 'one short line for the post caption, in the requested language' },
    reason: { type: 'string', description: 'one sentence: why post or why not' },
    start_offset: { type: 'number', description: 'seconds to cut from the start (0-6) so the clip starts right before the action' },
    end_offset: { type: 'number', description: 'seconds to cut from the end (0-6)' },
  },
  required: ['post', 'funny', 'safe', 'kind', 'heading', 'caption', 'reason', 'start_offset', 'end_offset'],
  additionalProperties: false,
};

const SYSTEM = `You review short moments recorded from a live gaming stream (usually GTA 6) and decide whether each one should become a TikTok clip.

You get four frames in time order (start to end of the moment), the signals that flagged it, chat messages sent during it, and the streamer's words when available.

Post only moments that people would watch to the end and share: funny NPC behaviour, an epic fail, a crash-out, a glitch, a chaotic chase, an unexpected reaction, a laughing fit, a WASTED or BUSTED screen with a reaction worth seeing, a surprising game feature. Reject boring gameplay, menus, loading screens, ad or "commercial break" screens, "starting soon" or "be right back" screens, chat reading with nothing happening, and moments that only make sense with long context.

Mark safe = false for anything unsuitable for TikTok: real-world violence, hate or slurs on screen or in the words, sexual content, personal data such as addresses or phone numbers, or anything involving minors at risk. Game violence alone is fine.

Write the heading in the requested language: at most 8 words, present tense, one emoji at the end, creating curiosity without giving away the punchline. Keep the caption to one short line. Use start_offset and end_offset to trim slow parts so the clip starts right before the action; use 0 when the timing is already right.`;

function buildPrompt(input, cfg) {
  const lines = [
    `Language for heading and caption: ${cfg.language || 'de'}`,
    `Streamer: ${input.streamer || 'unknown'} on ${input.platform || 'stream'}${input.title ? ` — stream title: "${input.title}"` : ''}`,
    `Moment length: ${input.duration.toFixed(1)} s. Signals: ${input.signals.join(', ') || 'none'}.`,
    `Chat during the moment (${input.chat.length} messages):`,
    ...(input.chat.length ? input.chat.slice(0, 30).map((m) => `- ${m}`) : ['- (no chat available)']),
    `Streamer's words: ${input.words || '(no transcript)'}`,
    `Post only if funny is at least ${cfg.minScore || 7} and the moment is safe.`,
  ];
  return lines.join('\n');
}

async function claudeJudge(input, cfg = {}) {
  const Anthropic = sdk();
  const client = new Anthropic();
  const content = input.frames.filter((f) => fs.existsSync(f)).map((f) => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: fs.readFileSync(f).toString('base64') } }));
  content.push({ type: 'text', text: buildPrompt(input, cfg) });
  let resp;
  try {
    resp = await client.beta.messages.create({
      model: cfg.model || 'claude-opus-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      output_config: { effort: cfg.effort || 'low', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content }],
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Claude judge: the API key was rejected');
    if (e instanceof Anthropic.RateLimitError) throw new Error('Claude judge: rate limited, try again later');
    if (e instanceof Anthropic.BadRequestError) throw new Error('Claude judge: bad request: ' + e.message);
    if (e instanceof Anthropic.APIError) throw new Error(`Claude judge: API error ${e.status}: ${e.message}`);
    throw e;
  }
  if (resp.stop_reason === 'refusal') {
    return { post: false, funny: 0, safe: false, kind: 'declined', heading: '', caption: '', reason: `declined (${(resp.stop_details && resp.stop_details.category) || 'no category'})`, start_offset: 0, end_offset: 0 };
  }
  const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  let j;
  try { j = JSON.parse(text); } catch (e) { throw new Error(`Claude judge: no valid JSON in the answer (stop_reason ${resp.stop_reason})`); }
  j.model = resp.model;
  return j;
}

/* Headings without AI: picked by the strongest signal, rotating so clips don't all look the same. */
const TEMPLATES = {
  de: {
    laugh: ['Chat konnte nicht mehr 💀', 'Er kriegt sich nicht mehr ein 😭', 'Damit hat keiner gerechnet 😂', 'Bester Moment des Streams 💀', 'Ich kann nicht mehr 😭'],
    scream: ['Er war NICHT bereit 😱', 'Der Schrei am Ende 😭', 'Damit hat er nicht gerechnet 😱'],
    loud: ['Komplett eskaliert 🔥', 'Das ging schneller als gedacht 😳', 'GTA 6 ist einfach Chaos 💀'],
  },
  en: {
    laugh: ['Chat lost it 💀', 'He could NOT stop laughing 😭', 'Nobody saw this coming 😂', 'Best moment of the stream 💀', 'I can\'t breathe 😭'],
    scream: ['He was NOT ready 😱', 'That scream at the end 😭', 'He did not see that coming 😱'],
    loud: ['That escalated quickly 🔥', 'Well that went fast 😳', 'GTA 6 is pure chaos 💀'],
  },
};
function templateHeading(kind, lang, n) {
  const t = TEMPLATES[String(lang || 'de').slice(0, 2)] || TEMPLATES.en;
  const list = t[kind] || t.loud;
  return list[n % list.length];
}

module.exports = { claudeJudge, templateHeading, hasClaudeCredentials, SCHEMA, SYSTEM, buildPrompt };
