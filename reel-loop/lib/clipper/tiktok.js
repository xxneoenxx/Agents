'use strict';
/* TikTok Content Posting API: sign in once (Login Kit for Desktop, PKCE), then upload clips
   - "draft": the clip lands in your TikTok inbox and you tap Post in the app (scope video.upload)
   - "direct": posted straight away (scope video.publish). Until TikTok has audited your app,
     direct posts are visible only to you and the account must be set to private.
   Credentials stay on this computer in ~/.reel-loop (file mode 600). */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const U = require('../util');

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const api = () => String(process.env.TIKTOK_API_BASE || 'https://open.tiktokapis.com').replace(/\/$/, '');
const home = () => process.env.REEL_HOME || path.join(os.homedir(), '.reel-loop');
const appFile = () => path.join(home(), 'tiktok-app.json');
const tokenFile = () => path.join(home(), 'tiktok-token.json');
const MB = 1024 * 1024;

const SETUP = `
One-time TikTok setup (about 10 minutes):
  1. Go to developers.tiktok.com, sign in, and create an app (type: Desktop).
  2. Add the products "Login Kit" and "Content Posting API".
  3. In Login Kit, register the redirect URI  http://127.0.0.1:8723/callback/
  4. Request the scopes user.info.basic and video.upload (drafts); add video.publish for direct posting.
  5. Add your own TikTok account as a test user (sandbox) or submit the app for review.
  6. Save the keys here (they stay on this computer):
       node reel-loop/bin/loop.js clip tiktok setup --key <client key> --secret <client secret>
     or set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in your environment.
  7. Sign in:  node reel-loop/bin/loop.js clip tiktok login
Direct posts from an app TikTok has not audited yet are only visible to you, and the account must be private.
Drafts go to your TikTok inbox; you finish them in the app with one tap.`;

function saveSecret(file, obj) {
  fs.mkdirSync(home(), { recursive: true, mode: 0o700 });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), { mode: 0o600 });
  try { fs.chmodSync(file, 0o600); } catch (e) { /* windows */ }
}
function appConfig() {
  const f = U.readJSON(appFile(), {});
  return {
    clientKey: process.env.TIKTOK_CLIENT_KEY || f.clientKey,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET || f.clientSecret,
    redirectUri: process.env.TIKTOK_REDIRECT_URI || f.redirectUri || 'http://127.0.0.1:8723/callback/',
  };
}
function setup(o) {
  const cur = U.readJSON(appFile(), {});
  const next = { clientKey: o.key || cur.clientKey, clientSecret: o.secret || cur.clientSecret, redirectUri: o.redirect || cur.redirectUri || 'http://127.0.0.1:8723/callback/' };
  if (!next.clientKey || !next.clientSecret) { U.log(SETUP); U.fail('Missing --key and --secret'); }
  saveSecret(appFile(), next);
  return next;
}
function openBrowser(url) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try { const p = spawn(cmd, args, { stdio: 'ignore', detached: true }); p.on('error', () => {}); p.unref(); } catch (e) { /* print only */ }
}

async function tokenRequest(params) {
  const r = await fetch(api() + '/v2/oauth/token/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cache-Control': 'no-cache' }, body: new URLSearchParams(params) });
  let j = {};
  try { j = await r.json(); } catch (e) { /* not json */ }
  if (!r.ok || j.error || !j.access_token) throw new Error(`TikTok sign-in failed: ${j.error || 'HTTP ' + r.status} ${j.error_description || ''} (log_id ${j.log_id || '-'})`);
  return j;
}
function saveToken(j) {
  const now = Date.now();
  saveSecret(tokenFile(), { access_token: j.access_token, refresh_token: j.refresh_token, open_id: j.open_id, scope: j.scope, expires_at: now + (j.expires_in || 86400) * 1000, refresh_expires_at: now + (j.refresh_expires_in || 31536000) * 1000 });
}

/* Login Kit for Desktop: local redirect + PKCE (S256, hex-encoded SHA-256 as TikTok's desktop guide specifies). */
async function login(o = {}) {
  const app = appConfig();
  if (!app.clientKey || !app.clientSecret) { U.log(SETUP); U.fail('Save your TikTok app keys first: clip tiktok setup --key … --secret …'); }
  const red = new URL(app.redirectUri);
  if (!['127.0.0.1', 'localhost'].includes(red.hostname)) U.fail('The redirect URI must be http://127.0.0.1:<port>/… or http://localhost:<port>/…');
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('hex');
  const state = crypto.randomBytes(16).toString('hex');
  const scope = o.scopes || 'user.info.basic,video.upload,video.publish';
  const url = AUTH_URL + '?' + new URLSearchParams({ client_key: app.clientKey, scope, response_type: 'code', redirect_uri: app.redirectUri, state, code_challenge: challenge, code_challenge_method: 'S256' }).toString();
  const code = await new Promise((resolve, reject) => {
    const srv = http.createServer((req, res) => {
      const q = new URL(req.url, app.redirectUri);
      if (q.pathname.replace(/\/$/, '') !== red.pathname.replace(/\/$/, '')) { res.writeHead(404); res.end(); return; }
      const fin = (ok, msg) => { res.writeHead(ok ? 200 : 400, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(`<html><body style="font:20px sans-serif;padding:40px"><h2>${msg}</h2></body></html>`); srv.close(); };
      if (q.searchParams.get('state') !== state) { fin(false, 'Sign-in failed (state mismatch). Start again.'); reject(new Error('state mismatch')); return; }
      if (q.searchParams.get('error')) { fin(false, 'TikTok said: ' + q.searchParams.get('error')); reject(new Error('TikTok: ' + q.searchParams.get('error') + ' ' + (q.searchParams.get('error_description') || ''))); return; }
      fin(true, 'TikTok is connected. You can close this window.');
      resolve(q.searchParams.get('code'));
    });
    srv.on('error', reject);
    srv.listen(Number(red.port) || 80, red.hostname, () => {
      U.log('Open this link to connect TikTok (it should open by itself):\n  ' + url);
      openBrowser(url);
    });
    const t = setTimeout(() => { srv.close(); reject(new Error('Sign-in timed out after 5 minutes')); }, 5 * 60 * 1000);
    if (t.unref) t.unref();
  });
  const j = await tokenRequest({ client_key: app.clientKey, client_secret: app.clientSecret, code, grant_type: 'authorization_code', redirect_uri: app.redirectUri, code_verifier: verifier });
  saveToken(j);
  return { scope: j.scope, open_id: j.open_id };
}
function logout() { fs.rmSync(tokenFile(), { force: true }); }
function loggedIn() { return U.exists(tokenFile()); }

async function accessToken() {
  const t = U.readJSON(tokenFile(), null);
  if (!t) U.fail('TikTok is not connected yet: clip tiktok login');
  if (Date.now() < t.expires_at - 5 * 60 * 1000) return t.access_token;
  if (Date.now() > t.refresh_expires_at) U.fail('The TikTok sign-in expired: clip tiktok login');
  const app = appConfig();
  const j = await tokenRequest({ client_key: app.clientKey, client_secret: app.clientSecret, grant_type: 'refresh_token', refresh_token: t.refresh_token });
  saveToken(j);
  return j.access_token;
}

async function call(p, body) {
  const tok = await accessToken();
  const r = await fetch(api() + p, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(body || {}) });
  let j;
  try {
    // post ids are 64-bit integers: keep them as strings so they are not rounded
    const text = (await r.text()).replace(/("publicaly_available_post_id"\s*:\s*\[)([^\]]*)\]/, (m, a, b) => a + b.split(',').map((x) => x.trim()).filter(Boolean).map((x) => '"' + x.replace(/"/g, '') + '"').join(',') + ']');
    j = JSON.parse(text);
  } catch (e) { throw new Error(`TikTok ${p}: HTTP ${r.status}`); }
  const code = j.error && j.error.code;
  if (code && code !== 'ok') {
    const hint = code === 'unaudited_client_can_only_post_to_private_accounts' ? ' — set your TikTok account to private, or use draft mode until TikTok has audited your app'
      : code === 'spam_risk_too_many_posts' ? ' — TikTok\'s daily post limit for this account is reached'
        : code === 'scope_not_authorized' ? ' — sign in again with the needed scope: clip tiktok login' : '';
    const e = new Error(`TikTok ${p}: ${code}${j.error.message ? ' — ' + j.error.message : ''}${hint} (log_id ${j.error.log_id || '-'})`);
    e.code = code; throw e;
  }
  if (!r.ok) throw new Error(`TikTok ${p}: HTTP ${r.status}`);
  return j.data || {};
}
const creatorInfo = () => call('/v2/post/publish/creator_info/query/', {});

/* Files up to 64 MB go in one chunk; bigger files in 10 MB chunks, the last one taking the remainder. */
function chunking(size) {
  if (size <= 64 * MB) return { chunkSize: size, count: 1 };
  const chunkSize = 10 * MB;
  return { chunkSize, count: Math.floor(size / chunkSize) };
}

async function upload(file, o = {}) {
  const mode = o.mode === 'direct' ? 'direct' : 'draft';
  const size = fs.statSync(file).size;
  const { chunkSize, count } = chunking(size);
  const source_info = { source: 'FILE_UPLOAD', video_size: size, chunk_size: chunkSize, total_chunk_count: count };
  let init;
  if (mode === 'direct') {
    const ci = await creatorInfo();
    const privacy = o.privacy || 'SELF_ONLY';
    if (Array.isArray(ci.privacy_level_options) && !ci.privacy_level_options.includes(privacy)) throw new Error(`TikTok does not allow privacy ${privacy} for this account (allowed: ${ci.privacy_level_options.join(', ')})`);
    if (ci.max_video_post_duration_sec && o.seconds && o.seconds > ci.max_video_post_duration_sec) throw new Error(`Clip is ${o.seconds}s, TikTok allows ${ci.max_video_post_duration_sec}s for this account`);
    init = await call('/v2/post/publish/video/init/', {
      post_info: {
        title: String(o.title || '').slice(0, 2200), privacy_level: privacy,
        disable_comment: !!(o.disableComment || ci.comment_disabled), disable_duet: !!(o.disableDuet || ci.duet_disabled), disable_stitch: !!(o.disableStitch || ci.stitch_disabled),
        video_cover_timestamp_ms: o.coverMs != null ? o.coverMs : 1000,
      },
      source_info,
    });
  } else {
    init = await call('/v2/post/publish/inbox/video/init/', { source_info });
  }
  const { publish_id, upload_url } = init;
  if (!publish_id || !upload_url) throw new Error('TikTok did not return an upload URL');
  const fd = fs.openSync(file, 'r');
  try {
    for (let i = 0; i < count; i++) {
      const start = i * chunkSize, end = i === count - 1 ? size - 1 : start + chunkSize - 1;
      const buf = Buffer.alloc(end - start + 1);
      fs.readSync(fd, buf, 0, buf.length, start);
      const r = await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': 'video/mp4', 'Content-Range': `bytes ${start}-${end}/${size}` }, body: buf });
      if (![200, 201, 206].includes(r.status)) throw new Error(`TikTok upload of bytes ${start}-${end} failed: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    }
  } finally { fs.closeSync(fd); }
  let st = { status: 'PROCESSING_UPLOAD' };
  const deadline = Date.now() + (o.waitSeconds || 180) * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, o.pollMs || 3000));
    st = await call('/v2/post/publish/status/fetch/', { publish_id });
    if (['PUBLISH_COMPLETE', 'SEND_TO_USER_INBOX', 'FAILED'].includes(st.status)) break;
  }
  if (st.status === 'FAILED') throw new Error(`TikTok processing failed: ${st.fail_reason || 'unknown reason'}`);
  return { publish_id, status: st.status, mode, postIds: st.publicaly_available_post_id || st.publicly_available_post_id || [] };
}

async function cli(a) {
  try { await cliInner(a); } catch (e) { if (e.userError) throw e; U.fail(e.message); }
}
async function cliInner(a) {
  const sub = a._[1];
  switch (sub) {
    case 'setup': { const r = setup(a); U.ok(`TikTok app saved (${appFile()}), redirect ${r.redirectUri}`); U.log(U.color.dim('next: clip tiktok login')); return; }
    case 'login': { const r = await login(a); U.ok(`TikTok connected (scopes: ${r.scope})`); return; }
    case 'logout': logout(); U.ok('TikTok sign-in removed from this computer'); return;
    case 'status': {
      if (!loggedIn()) { U.log('Not connected.'); U.log(SETUP); return; }
      try {
        const ci = await creatorInfo();
        U.ok(`Connected as @${ci.creator_username || '?'} (${ci.creator_nickname || ''})`);
        U.log(`  privacy options: ${(ci.privacy_level_options || []).join(', ')}`);
        U.log(`  max video length: ${ci.max_video_post_duration_sec || '?'}s`);
      } catch (e) { U.warn(e.message); U.log('  (creator info needs the video.publish scope; drafts work with video.upload alone)'); }
      return;
    }
    case 'upload': {
      const file = a._[2]; if (!file || !U.exists(file)) U.fail('clip tiktok upload <file.mp4> [--mode draft|direct] [--title "…"] [--privacy SELF_ONLY]');
      let title = a.title;
      const txt = file.replace(/\.mp4$/i, '.txt');
      if (!title && U.exists(txt)) title = fs.readFileSync(txt, 'utf8').trim();
      const r = await upload(file, { mode: a.mode, title, privacy: a.privacy });
      U.ok(`Uploaded (${r.mode}): ${r.status}${r.postIds.length ? ' · post ' + r.postIds.join(',') : ''}`);
      if (r.mode === 'draft') U.log('  Open the TikTok app: the clip is waiting in your inbox to be posted. Caption:\n' + (title || ''));
      return;
    }
    default: U.log(SETUP); U.log('\nclip tiktok setup | login | status | upload <file> | logout');
  }
}

module.exports = { cli, setup, login, logout, loggedIn, upload, creatorInfo, chunking, SETUP };
