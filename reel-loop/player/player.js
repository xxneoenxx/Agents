/* Reel Loop player
 * A deterministic, time-addressable animation engine. The renderer calls
 *   await REEL.setup(plan, style, {fonts})   once, then
 *   REEL.seek(t)                              for every frame.
 * Nothing here uses CSS transitions, timers or real time: the picture is a pure
 * function of t, so any frame can be rendered in any order, in parallel.
 */
(function () {
  'use strict';
  const W = 1080, H = 1920;
  const SAFE = { top: 250, bottomCaps: 590, bottomNoCaps: 380, x: 84 };
  const SIZES = { hook: 132, title: 112, text: 80, number: 300, body: 52, small: 38 };
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------------- math ---------------- */
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, x) => a + (b - a) * x;
  const prog = (t, s, d) => (d <= 0 ? (t >= s ? 1 : 0) : clamp((t - s) / d));
  const E = {
    linear: (x) => x,
    inQuad: (x) => x * x,
    outQuad: (x) => 1 - (1 - x) * (1 - x),
    inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
    inCubic: (x) => x * x * x,
    outCubic: (x) => 1 - Math.pow(1 - x, 3),
    inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    outQuart: (x) => 1 - Math.pow(1 - x, 4),
    outExpo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
    inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
    outBack: (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
    outElastic: (x) => (x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1),
  };
  function strHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    let a = strHash(seed);
    return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* ---------------- dom ---------------- */
  function h(tag, cls, parent, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.textContent = text;
    if (parent) parent.appendChild(el);
    return el;
  }
  function svgEl(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  function addT(el, extra) { const cur = el.style.transform; el.style.transform = (cur && cur !== 'none' ? cur + ' ' : '') + extra; }

  /* Rich text: *accent*  ^accent2^  {{highlight}}  and \n line breaks.
     Every word becomes its own inline-block span so it can be animated. */
  function rich(el, text) {
    const words = [];
    const s = String(text == null ? '' : text);
    const re = /\*([^*]+)\*|\^([^^]+)\^|\{\{([\s\S]+?)\}\}/g;
    const segs = []; let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) segs.push({ t: s.slice(last, m.index), c: '' });
      segs.push({ t: m[1] || m[2] || m[3], c: m[1] ? 'a1' : m[2] ? 'a2' : 'hl' });
      last = re.lastIndex;
    }
    if (last < s.length) segs.push({ t: s.slice(last), c: '' });
    let needSpace = false, group = null;
    for (const sg of segs) {
      const lines = sg.t.split('\n');
      lines.forEach((line, li) => {
        if (li > 0) { el.appendChild(document.createElement('br')); needSpace = false; group = null; }
        const lead = /^\s/.test(line), trail = /\s$/.test(line);
        const parts = line.split(/\s+/).filter(Boolean);
        if (lead) needSpace = true;
        parts.forEach((p, i) => {
          if (needSpace || i > 0 || !group) {
            if ((needSpace || i > 0) && group) el.appendChild(document.createTextNode(' '));
            group = h('span', 'wg', el);
          }
          words.push(h('span', 'w' + (sg.c ? ' ' + sg.c : ''), group, p));
          needSpace = false;
        });
        if (trail && parts.length) needSpace = true;
      });
    }
    return words;
  }

  /* Shrink an element's font until it fits its box. Runs once at setup, so it is deterministic. */
  function fit(el, o) {
    o = o || {};
    let size = o.max || 80; const min = o.min || 24;
    el.style.fontSize = size + 'px';
    let guard = 0;
    const over = () => el.scrollWidth > el.clientWidth + 2 || (o.maxH && el.scrollHeight > o.maxH);
    while (guard++ < 90 && size > min && over()) { size -= Math.max(2, Math.round(size * 0.04)); el.style.fontSize = size + 'px'; }
    return size;
  }
  function fitGroup(container, els, o) {
    let size = o.max; const min = o.min || 24;
    const set = () => els.forEach((e) => { e.style.fontSize = size + 'px'; });
    set();
    let guard = 0;
    const over = () => container.scrollHeight > o.maxH + 2 || els.some((e) => e.scrollWidth > e.clientWidth + 2);
    while (guard++ < 90 && size > min && over()) { size -= 2; set(); }
    return size;
  }

  /* Entrance animation of one element, q = 0..1 progress. */
  function reveal(el, q, kind) {
    const s = el.style;
    if (q <= 0) { s.visibility = 'hidden'; return; }
    s.visibility = 'visible';
    let tr = '', op = 1, f = '', clip = '';
    if (q < 1) {
      switch (kind) {
        case 'pop': { const e = E.outBack(q); op = clamp(q * 3); tr = `scale(${lerp(0.35, 1, e)})`; break; }
        case 'rise': { const e = E.outCubic(q); op = clamp(q * 1.8); tr = `translateY(${lerp(70, 0, e)}px)`; break; }
        case 'drop': { const e = E.outBack(q); op = clamp(q * 2.5); tr = `translateY(${lerp(-80, 0, e)}px)`; break; }
        case 'slide': { const e = E.outCubic(q); op = clamp(q * 2); tr = `translateX(${lerp(-110, 0, e)}px)`; break; }
        case 'slideR': { const e = E.outCubic(q); op = clamp(q * 2); tr = `translateX(${lerp(110, 0, e)}px)`; break; }
        case 'fade': op = E.inOutSine(q); break;
        case 'blur': { const e = E.outCubic(q); op = clamp(q * 1.5); f = `blur(${(1 - e) * 18}px)`; tr = `scale(${lerp(1.12, 1, e)})`; break; }
        case 'wipe': clip = `inset(-10% ${(1 - E.outCubic(q)) * 100}% -10% -2%)`; break;
        case 'zoom': { const e = E.outCubic(q); op = clamp(q * 2); tr = `scale(${lerp(1.7, 1, e)})`; break; }
        case 'spin': { const e = E.outBack(q); op = clamp(q * 3); tr = `rotate(${lerp(-30, 0, e)}deg) scale(${lerp(0.3, 1, e)})`; break; }
        case 'type': case 'none': break;
        default: { const e = E.outCubic(q); op = clamp(q * 1.8); tr = `translateY(${lerp(60, 0, e)}px)`; }
      }
    }
    s.opacity = op; s.transform = tr;
    if (f || s.filter) s.filter = f;
    if (clip || s.clipPath) s.clipPath = clip;
  }

  function plainLen(t) { return String(t || '').replace(/[*^{}]/g, '').length; }
  function norm(s) {
    return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, '');
  }

  /* Times (scene-local) at which each displayed word appears. Synced to the narrator
     when the displayed words match the spoken ones, else a gentle stagger. */
  function wordTimes(sc, spans, start) {
    const n = spans.length; if (!n) return [];
    const d = sc.duration || 3;
    const stg = Math.min(STYLE.motion.stagger, Math.max(0.03, (d * 0.55) / n));
    const fallback = spans.map((_, i) => start + i * stg);
    const sw = sc.words || [];
    if (!sw.length || (sc.data && sc.data.sync === false)) return fallback;
    const out = new Array(n).fill(null); let j = 0, matched = 0;
    for (let i = 0; i < n; i++) {
      const a = norm(spans[i].textContent); if (!a) continue;
      for (let k = j; k < Math.min(sw.length, j + 6); k++) {
        if (norm(sw[k].w) === a) { out[i] = sw[k].s; j = k + 1; matched++; break; }
      }
    }
    if (matched < n * 0.5) return fallback;
    let lastT = start - 0.06;
    for (let i = 0; i < n; i++) { if (out[i] == null) out[i] = lastT + 0.06; lastT = out[i]; }
    for (let i = 1; i < n; i++) if (out[i] < out[i - 1]) out[i] = out[i - 1];
    return out.map((x) => Math.max(0, x - 0.06));
  }

  /* Paths in a script are relative to the video folder. */
  function asset(src) {
    if (!src || /^(https?:|data:|file:|blob:)/.test(src)) return src;
    try { return new URL(src, PLAN.baseUrl || document.baseURI).href; } catch (e) { return src; }
  }
  function fmtNum(v, dec, format) {
    try {
      if (format === 'compact') return new Intl.NumberFormat(LANG, { notation: 'compact', maximumFractionDigits: 1 }).format(v);
      if (format === 'raw') return v.toFixed(dec);
      return new Intl.NumberFormat(LANG, { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
    } catch (e) { return v.toFixed(dec); }
  }

  /* ---------------- state ---------------- */
  const R = (window.REEL = {});
  const C = (R.components = {});
  let PLAN = null, STYLE = null, LANG = 'en', stage = null, SC = [];
  let caps = null, capIn = null, capCur = null, capSpans = [], capChunks = [], hiddenScenes = {};
  let progEl = null, grainEl = null, flashEl = null;

  const NOISE = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

  function deepMerge(a, b) {
    const out = Array.isArray(a) ? a.slice() : Object.assign({}, a);
    for (const k in b || {}) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && typeof a[k] === 'object' && !Array.isArray(a[k])) out[k] = deepMerge(a[k], b[k]);
      else if (b[k] !== undefined) out[k] = b[k];
    }
    return out;
  }
  const DEFAULT_STYLE = {
    palette: { bg: '#101114', bg2: '#1b1d22', fg: '#ffffff', muted: '#a3a7b0', accent: '#ffcc33', accent2: '#ff5a4f', accent3: '#4fc3ff' },
    fonts: { display: { family: 'Inter' }, body: { family: 'Inter' }, mono: { family: 'JetBrains Mono' } },
    type: { case: 'none', tracking: '-0.02em', leading: 1.02, displayWeight: 900, bodyWeight: 650, scale: 1 },
    shape: { radius: 28, stroke: 12, shadow: '0 18px 50px rgba(0,0,0,.35)', cardBorder: '0 solid transparent' },
    background: { kind: 'gradient', grain: 0.06, vignette: 0.3 },
    motion: { reveal: 'rise', stagger: 0.08, wordDur: 0.42, transition: 'slide', drift: 0.03 },
    captions: { enabled: true, style: 'box', size: 62, uppercase: false, karaoke: false, top: 1395 },
    extras: { progress: false, handle: true },
  };
  function fontStack(f, kind) {
    const fam = (f && f.family) || 'Inter';
    const fb = (f && f.fallback) || (kind === 'mono' ? "'JetBrains Mono', 'DejaVu Sans Mono', monospace" : "'Inter', 'Helvetica Neue', Arial, sans-serif");
    return `'${fam}', ${fb}, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji'`;
  }
  function applyVars(st) {
    const p = st.palette, r = document.documentElement.style;
    const set = (k, v) => { if (v != null && v !== '') r.setProperty(k, String(v)); };
    set('--bg', p.bg); set('--bg2', p.bg2 || p.bg); set('--fg', p.fg); set('--muted', p.muted || p.fg);
    set('--accent', p.accent); set('--accent2', p.accent2 || p.accent); set('--accent3', p.accent3 || p.accent2 || p.accent);
    set('--card', p.card); set('--card-fg', p.cardFg); set('--hl-bg', p.hlBg || p.accent); set('--hl-fg', p.hlFg || p.bg);
    set('--card-accent', p.cardAccent); set('--card-accent2', p.cardAccent2);
    set('--land', p.land); set('--water', p.water); set('--coast', p.coast); set('--grid', p.grid); set('--line', p.line || p.fg);
    set('--font-display', fontStack(st.fonts.display, 'display'));
    set('--font-body', fontStack(st.fonts.body, 'body'));
    set('--font-mono', fontStack(st.fonts.mono, 'mono'));
    set('--display-weight', st.type.displayWeight); set('--display-case', st.type.case);
    set('--display-tracking', st.type.tracking); set('--display-leading', st.type.leading); set('--body-weight', st.type.bodyWeight);
    set('--radius', st.shape.radius + 'px'); set('--shadow', st.shape.shadow); set('--card-border', st.shape.cardBorder);
    set('--grain', st.background.grain); set('--vignette', st.background.vignette);
    set('--noise', NOISE);
    const cp = st.captions;
    set('--cap-size', (cp.size || 62) + 'px'); set('--cap-fg', cp.fg); set('--cap-bg', cp.bg); set('--cap-on', cp.on || p.accent);
    set('--cap-top', (cp.top || 1395) + 'px');
    if (cp.font) set('--cap-font', fontStack({ family: cp.font }, 'body'));
  }
  function b64ToBuf(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }

  /* ---------------- setup ---------------- */
  R.setup = async function (plan, style, opts) {
    opts = opts || {};
    PLAN = plan;
    STYLE = deepMerge(DEFAULT_STYLE, style || {});
    LANG = plan.language || 'en';
    document.documentElement.lang = LANG;
    applyVars(STYLE);
    if (STYLE.css) { const st = document.createElement('style'); st.textContent = STYLE.css; document.head.appendChild(st); }
    for (const f of opts.fonts || []) {
      try {
        const ff = new FontFace(f.family, b64ToBuf(f.data), { weight: String(f.weight || 400), style: f.style || 'normal' });
        await ff.load(); document.fonts.add(ff);
      } catch (e) { console.warn('font failed', f.family, e && e.message); }
    }
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
    stage = document.getElementById('stage');
    stage.innerHTML = '';
    document.body.className = 'cap-' + (STYLE.captions.style || 'box') + ' bgk-' + STYLE.background.kind + (STYLE.id ? ' style-' + STYLE.id : '');
    hiddenScenes = {};
    SC = plan.scenes.map((sc, i) => buildScene(sc, i));
    // overlays
    caps = h('div', null, stage); caps.id = 'caps';
    capIn = h('div', 'cap-in', caps);
    if (STYLE.captions.uppercase) capIn.style.textTransform = 'uppercase';
    capChunks = plan.captions || [];
    capCur = null;
    if (STYLE.background.grain > 0) { grainEl = h('div', null, stage); grainEl.id = 'grain'; } else grainEl = null;
    if (STYLE.background.vignette > 0) { const v = h('div', null, stage); v.id = 'vig'; }
    if (STYLE.extras.progress) { progEl = h('div', null, stage); progEl.id = 'prog'; } else progEl = null;
    if (plan.handle && STYLE.extras.handle !== false) { const hd = h('div', null, stage, plan.handle); hd.id = 'handle'; }
    flashEl = h('div', null, stage); flashEl.id = 'flash';
    await Promise.all([...stage.querySelectorAll('img')].map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
    R.seek(0);
    return { duration: plan.duration, scenes: SC.length };
  };

  function buildScene(sc, i) {
    sc.data = sc.data || {};
    sc.transition = sc.transition || { type: 'cut', dur: 0 };
    if (sc.captionsHidden) hiddenScenes[sc.id] = true;
    const el = h('div', 'scene scene-' + sc.type, stage);
    el.style.zIndex = String(10 + i);
    el.dataset.id = sc.id;
    const bgKind = sc.data.bg || STYLE.background.kind;
    const bg = { el: h('div', 'bg bg-' + bgKind, el), kind: bgKind, blobs: [] };
    if (bgKind === 'glow') for (let k = 0; k < 3; k++) bg.blobs.push(h('div', 'blob b' + k, bg.el));
    if (sc.data.bgColor) bg.el.style.background = sc.data.bgColor;
    const cam = h('div', 'cam', el);
    el.style.display = 'block'; el.style.visibility = 'hidden';
    const ctx = makeCtx(sc, cam);
    let comp = null;
    const fn = C[sc.type];
    try {
      comp = fn ? fn(sc, ctx) : errBox(cam, sc, new Error('unknown scene type "' + sc.type + '"'));
    } catch (e) { console.error(e); comp = errBox(cam, sc, e); }
    let label = null;
    if (sc.data.tag) label = h('div', 'scene-label', el, sc.data.tag);
    el.style.display = 'none'; el.style.visibility = '';
    return { sc, el, bg, cam, comp, label, shown: false };
  }
  function errBox(parent, sc, e) {
    h('div', 'err', parent, 'Scene ' + sc.id + ' (' + sc.type + '): ' + (e && e.message ? e.message : e));
    return { update() {} };
  }

  function makeCtx(sc, cam) {
    const capsOn = STYLE.captions.enabled !== false && (PLAN.captions || []).length > 0 && !sc.captionsHidden;
    const bottom = capsOn ? SAFE.bottomCaps : SAFE.bottomNoCaps;
    return {
      sc, cam, style: STYLE, plan: PLAN, E, clamp, lerp, prog, h, svgEl, rich, fit, fitGroup, reveal, addT, rng: rng(sc.id || 'scene'),
      kind: (sc.data && sc.data.reveal) || STYLE.motion.reveal || 'rise',
      wdur: STYLE.motion.wordDur || 0.42,
      capsOn, bottom,
      content(cls) { const c = h('div', 'content' + (cls ? ' ' + cls : ''), cam); c.style.bottom = bottom + 'px'; return c; },
      full(cls) { return h('div', 'full' + (cls ? ' ' + cls : ''), cam); },
      size(k) { const disp = ['hook', 'title', 'text', 'number'].includes(k); return Math.round((SIZES[k] || 60) * (disp ? STYLE.type.scale || 1 : STYLE.type.bodyScale || 1)); },
      at(v, def) { return typeof v === 'number' && isFinite(v) ? v : def; },
      wordTimes(spans, start) { return wordTimes(sc, spans, start); },
      fmtNum, asset,
      spread(n, i, from, to) { return n <= 1 ? from : lerp(from, to, i / (n - 1)); },
    };
  }

  /* ---------------- transitions ---------------- */
  function applyTransition(o, ink, outk, inType, outType) {
    const s = o.el.style;
    let tr = '', op = 1, clip = '', filt = '';
    if (ink < 1) {
      const e = E.inOutCubic(ink);
      switch (inType) {
        case 'fade': op = ink; break;
        case 'slide': tr = `translateY(${(1 - e) * H}px)`; break;
        case 'slideX': tr = `translateX(${(1 - e) * W}px)`; break;
        case 'zoom': op = clamp(ink * 1.7); tr = `scale(${lerp(0.8, 1, E.outCubic(ink))})`; break;
        case 'whip': tr = `translateX(${(1 - E.inOutQuad(ink)) * W}px)`; filt = `blur(${Math.sin(ink * Math.PI) * 16}px)`; break;
        case 'wipe': clip = `circle(${E.inOutQuad(ink) * 120}% at 50% 45%)`; break;
        case 'paper': { const k = E.outCubic(ink); tr = `translateY(${(1 - k) * H * 0.95}px) rotate(${(1 - k) * 7}deg)`; break; }
        case 'flash': op = ink < 0.5 ? 0 : 1; break;
        default: break;
      }
    }
    if (outk > 0) {
      const e = E.inOutCubic(outk);
      switch (outType) {
        case 'slide': tr = `translateY(${-e * H * 0.3}px)`; filt = `brightness(${1 - 0.3 * e})`; break;
        case 'slideX': tr = `translateX(${-e * W * 0.3}px)`; filt = `brightness(${1 - 0.3 * e})`; break;
        case 'zoom': tr = `scale(${lerp(1, 1.3, e)})`; op = 1 - clamp(outk * 1.5); break;
        case 'whip': tr = `translateX(${-E.inOutQuad(outk) * W}px)`; filt = `blur(${Math.sin(outk * Math.PI) * 16}px)`; break;
        case 'paper': filt = `brightness(${1 - 0.35 * e})`; tr = `scale(${1 - 0.05 * e})`; break;
        default: break;
      }
    }
    s.transform = tr; s.opacity = op; s.clipPath = clip; s.filter = filt;
  }

  /* ---------------- seek ---------------- */
  R.seek = function (t) {
    const n = SC.length;
    let flash = 0;
    for (let i = 0; i < n; i++) {
      const o = SC[i], sc = o.sc;
      const tin = i > 0 ? sc.transition.dur || 0 : 0;
      const next = SC[i + 1];
      const tout = next ? next.sc.transition.dur || 0 : 0;
      const a = sc.start - tin / 2, b = sc.end + tout / 2;
      const vis = t >= a && (t < b || (i === n - 1));
      if (sc.transition.type === 'flash' && tin > 0) flash = Math.max(flash, 1 - Math.abs((t - sc.start) / (tin / 2)));
      if (!vis) { if (o.shown) { o.el.style.display = 'none'; o.shown = false; } continue; }
      if (!o.shown) { o.el.style.display = 'block'; o.shown = true; }
      const lt = t - sc.start;
      const ink = tin > 0 ? clamp((t - a) / tin) : 1;
      const outk = tout > 0 ? clamp((t - (sc.end - tout / 2)) / tout) : 0;
      applyTransition(o, ink, outk, sc.transition.type, next ? next.sc.transition.type : 'cut');
      const drift = sc.data.drift != null ? sc.data.drift : STYLE.motion.drift;
      o.cam.style.transform = drift ? `scale(${1 + drift * clamp(lt / Math.max(0.5, sc.duration))})` : '';
      if (o.bg.blobs.length) o.bg.blobs.forEach((bl, k) => { const ph = k * 2.1; bl.style.transform = `translate(${Math.sin(t * 0.23 + ph) * 170}px, ${Math.cos(t * 0.17 + ph * 1.3) * 230}px)`; });
      try { o.comp.update(lt, t); } catch (e) { console.error(e); }
      if (o.label) reveal(o.label, prog(lt, 0.05, 0.4), 'fade');
    }
    updateCaptions(t);
    if (progEl) progEl.style.transform = `scaleX(${clamp(t / (PLAN.duration || 1))})`;
    if (grainEl) { const f = Math.round(t * 24); grainEl.style.transform = `translate(${(f * 53) % 300}px, ${(f * 97) % 300}px)`; }
    if (flashEl) flashEl.style.opacity = String(clamp(flash) * 0.9);
  };
  R.info = function () { return { duration: PLAN ? PLAN.duration : 0, scenes: SC.map((o) => ({ id: o.sc.id, type: o.sc.type, start: o.sc.start, end: o.sc.end })) }; };

  /* ---------------- captions ---------------- */
  function updateCaptions(t) {
    if (!caps) return;
    if (STYLE.captions.enabled === false || !capChunks.length) { caps.style.display = 'none'; return; }
    let ch = null;
    for (let i = 0; i < capChunks.length; i++) { const c = capChunks[i]; if (t >= c.start && t < c.end) { ch = c; break; } }
    if (ch && hiddenScenes[ch.scene]) ch = null;
    if (!ch) { caps.style.visibility = 'hidden'; return; }
    caps.style.visibility = 'visible';
    if (capCur !== ch) {
      capCur = ch; capIn.innerHTML = '';
      capSpans = ch.words.map((w, i) => { if (i) capIn.appendChild(document.createTextNode(' ')); return h('span', 'cw', capIn, w.w); });
      let size = STYLE.captions.size || 62; capIn.style.fontSize = size + 'px';
      let g = 0;
      while (g++ < 30 && size > 34 && (capIn.offsetHeight > size * 1.14 * 2 + 40 || capIn.scrollWidth > 942)) { size -= 3; capIn.style.fontSize = size + 'px'; }
    }
    for (let i = 0; i < capSpans.length; i++) {
      const w = ch.words[i], nx = ch.words[i + 1];
      const on = t >= w.s && t < (nx ? nx.s : ch.end);
      capSpans[i].className = 'cw' + (on ? ' on' : '') + (STYLE.captions.karaoke && t < w.s ? ' future' : '');
    }
    const q = prog(t, ch.start, 0.16);
    caps.style.transform = `scale(${lerp(0.86, 1, E.outBack(q))})`;
    caps.style.opacity = String(clamp(q * 3));
  }

  /* =================================================================
     Scene components. Each gets (scene, ctx) and returns {update(localT)}.
     ================================================================= */

  /* title / hook / text / statement / icon */
  function titleLike(sizeKey) {
    return function (sc, ctx) {
      const d = sc.data;
      const root = ctx.content('t-' + (d.align || 'center'));
      let emo = null, kick = null, sub = null;
      if (d.emoji) { emo = h('div', 'emoji-big', root, d.emoji); if (d.emojiSize) emo.style.fontSize = d.emojiSize + 'px'; }
      if (d.kicker) kick = h('div', 'kicker', root, d.kicker);
      const tx = h('div', 'display ttl', root);
      const words = rich(tx, d.text || '');
      if (d.sub) { sub = h('div', 'sub', root); rich(sub, d.sub); }
      const avail = root.clientHeight;
      const reserved = (emo ? emo.offsetHeight + 34 : 0) + (kick ? kick.offsetHeight + 34 : 0);
      if (sub) fit(sub, { max: d.subSize || ctx.size('body'), min: 30, maxH: avail * 0.28 });
      const len = plainLen(d.text);
      const auto = sizeKey === 'hook' ? (len <= 24 ? 150 : len <= 44 ? 132 : 112) : sizeKey === 'title' ? (len <= 24 ? 132 : len <= 44 ? 112 : 96) : (len <= 24 ? 120 : len <= 44 ? 100 : len <= 80 ? 84 : 72);
      fit(tx, { max: d.size || Math.round(auto * (STYLE.type.scale || 1)), min: 44, maxH: Math.max(200, avail - reserved - (sub ? sub.offsetHeight + 34 : 0)) });
      const times = ctx.wordTimes(words, ctx.at(d.at, emo ? 0.18 : 0.08));
      const lastW = times.length ? times[times.length - 1] : 0.3;
      const subAt = ctx.at(d.subAt, lastW + 0.35);
      const kind = d.reveal || ctx.kind;
      return {
        update(t) {
          if (emo) { reveal(emo, prog(t, 0, 0.6), 'pop'); if (t > 0) addT(emo, `translateY(${Math.sin(t * 2.4) * 12}px) rotate(${Math.sin(t * 1.7) * 4}deg)`); }
          if (kick) reveal(kick, prog(t, 0.02, 0.4), 'drop');
          for (let i = 0; i < words.length; i++) reveal(words[i], prog(t, times[i], ctx.wdur), kind);
          if (sub) reveal(sub, prog(t, subAt, 0.5), 'rise');
          if (d.shake && t > lastW && t < lastW + 0.4) { const a = (1 - prog(t, lastW, 0.4)) * 12; root.style.transform = `translate(${Math.sin(t * 90) * a}px,0)`; }
          else if (root.style.transform) root.style.transform = '';
        },
      };
    };
  }
  C.hook = titleLike('hook');
  C.title = titleLike('title');
  C.text = titleLike('text');
  C.statement = C.text;
  C.icon = function (sc, ctx) { sc.data.emojiSize = sc.data.emojiSize || 360; return titleLike('text')(sc, ctx); };

  /* number: a big counter */
  C.number = function (sc, ctx) {
    const d = sc.data, root = ctx.content();
    const emo = d.emoji ? h('div', 'emoji-big', root, d.emoji) : null;
    if (emo) emo.style.fontSize = (d.emojiSize || 170) + 'px';
    const kick = d.kicker ? h('div', 'kicker', root, d.kicker) : null;
    const num = h('div', 'display bignum', root);
    const lab = d.label ? h('div', 'num-label', root) : null; if (lab) rich(lab, d.label);
    const sub = d.sub ? h('div', 'sub', root) : null; if (sub) rich(sub, d.sub);
    const to = Number(d.value) || 0, from = Number(d.from) || 0;
    const dec = d.decimals != null ? d.decimals : Math.abs(to) % 1 ? 1 : 0;
    const fmt = (v) => (d.prefix || '') + fmtNum(v, dec, d.format) + (d.suffix || '');
    num.textContent = fmt(to);
    fit(num, { max: d.size || ctx.size('number'), min: 80 });
    if (lab) fit(lab, { max: ctx.size('body') + 10, min: 30, maxH: 330 });
    const at = ctx.at(d.at, 0.15);
    const cd = d.countDur || Math.min(2.0, Math.max(0.8, sc.duration * 0.45));
    return {
      update(t) {
        if (emo) { reveal(emo, prog(t, 0, 0.5), 'pop'); if (t > 0) addT(emo, `translateY(${Math.sin(t * 2.2) * 10}px)`); }
        if (kick) reveal(kick, prog(t, 0.02, 0.4), 'drop');
        const q = prog(t, at, cd);
        num.textContent = fmt(lerp(from, to, E.outExpo(q)));
        reveal(num, prog(t, at, 0.4), 'pop');
        if (q >= 1) { const k = prog(t, at + cd, 0.32); num.style.transform = `scale(${1 + 0.09 * Math.sin(k * Math.PI)})`; }
        if (lab) reveal(lab, prog(t, at + 0.3, 0.45), 'rise');
        if (sub) reveal(sub, prog(t, at + cd * 0.75, 0.45), 'rise');
      },
    };
  };

  /* list: items that arrive one by one */
  C.list = function (sc, ctx) {
    const d = sc.data, root = ctx.content();
    let ttl = null;
    if (d.title) { ttl = h('div', 'display list-title', root); rich(ttl, d.title); fit(ttl, { max: d.titleSize || Math.round(ctx.size('title') * 0.72), min: 44, maxH: 360 }); }
    const list = h('div', 'list', root);
    const items = (d.items || []).map((it, i) => {
      if (typeof it === 'string') it = { text: it };
      const row = h('div', 'li card', list);
      const mk = h('div', 'li-mark' + (it.emoji ? ' is-emoji' : ''), row, it.emoji || (d.numbered === false ? '•' : String(i + 1)));
      const tx = h('div', 'li-text', row); rich(tx, it.text || '');
      return { row, mk, tx, it };
    });
    fitGroup(list, items.map((o) => o.tx), { max: d.size || ctx.size('body') + 6, min: 28, maxH: root.clientHeight - (ttl ? ttl.offsetHeight + 34 : 0) });
    const n = items.length;
    const times = items.map((o, i) => ctx.at(o.it.at, ctx.spread(n, i, 0.35, Math.max(0.35, sc.duration * 0.62))));
    const focus = d.focus !== false && n > 1;
    return {
      update(t) {
        if (ttl) reveal(ttl, prog(t, 0, 0.45), 'drop');
        let active = -1; for (let i = 0; i < n; i++) if (t >= times[i]) active = i;
        items.forEach((o, i) => {
          reveal(o.row, prog(t, times[i], 0.45), d.reveal || 'slide');
          if (!focus) return;
          o.row.classList.toggle('active', i === active);
          if (i < active) o.row.style.opacity = String(lerp(1, 0.5, prog(t, times[i + 1], 0.3)));
        });
      },
    };
  };

  /* bars: a horizontal bar chart */
  C.bars = function (sc, ctx) {
    const d = sc.data, root = ctx.content();
    let ttl = null;
    if (d.title) { ttl = h('div', 'display list-title', root); rich(ttl, d.title); fit(ttl, { max: Math.round(ctx.size('title') * 0.72), min: 44, maxH: 360 }); }
    const box = h('div', 'bars', root);
    const items = d.items || [];
    const max = d.max || Math.max(1e-9, ...items.map((x) => Math.abs(+x.value || 0)));
    const rows = items.map((it) => {
      const r = h('div', 'bar-row', box);
      const top = h('div', 'bar-top', r);
      const lab = h('div', 'bar-label', top); if (it.emoji) h('span', 'emoji', lab, it.emoji + ' '); lab.appendChild(document.createTextNode(it.label || ''));
      const val = h('div', 'bar-val', top);
      const tr = h('div', 'bar-track', r);
      const fill = h('div', 'bar-fill' + (it.highlight ? ' hi' : ''), tr);
      if (it.color) fill.style.background = it.color;
      return { r, val, fill, top, it, frac: Math.abs(+it.value || 0) / max };
    });
    if (!items.some((x) => x.highlight || x.color) && rows.length) rows.reduce((a, b) => (b.frac > a.frac ? b : a)).fill.classList.add('hi');
    fitGroup(box, rows.map((o) => o.top), { max: 46, min: 26, maxH: root.clientHeight - (ttl ? ttl.offsetHeight + 34 : 0) });
    const n = rows.length;
    const times = rows.map((o, i) => ctx.at(o.it.at, ctx.spread(n, i, 0.3, Math.max(0.3, sc.duration * 0.5))));
    const dec = d.decimals != null ? d.decimals : 0;
    return {
      update(t) {
        if (ttl) reveal(ttl, prog(t, 0, 0.45), 'drop');
        rows.forEach((o, i) => {
          reveal(o.r, prog(t, times[i], 0.35), 'fade');
          const q = E.outCubic(prog(t, times[i] + 0.1, 0.9));
          o.fill.style.transform = `scaleX(${q * o.frac})`;
          o.val.textContent = (d.prefix || '') + fmtNum((+o.it.value || 0) * q, dec, d.format) + (d.unit || '');
        });
      },
    };
  };

  /* compare: A vs B */
  C.compare = function (sc, ctx) {
    const d = sc.data, root = ctx.content();
    let ttl = null;
    if (d.title) { ttl = h('div', 'display list-title', root); rich(ttl, d.title); fit(ttl, { max: Math.round(ctx.size('title') * 0.7), min: 44, maxH: 300 }); }
    const row = h('div', 'cmp', root);
    const mk = (side, cls) => {
      side = side || {};
      const c = h('div', 'cmp-card card ' + cls, row);
      const emo = side.emoji ? h('div', 'emoji', c, side.emoji) : null;
      const tt = h('div', 'cmp-title display', c); rich(tt, side.title || '');
      const v = side.value != null ? h('div', 'cmp-val display', c, String(side.value)) : null;
      const pts = (side.points || []).map((p) => { const e = h('div', 'cmp-pt', c); rich(e, p); return e; });
      return { c, emo, tt, v, pts, side };
    };
    const L = mk(d.left, 'left'), Rt = mk(d.right, 'right');
    const vs = h('div', 'cmp-vs', row, d.vs || 'VS');
    [L, Rt].forEach((s) => { fit(s.tt, { max: 58, min: 30 }); if (s.v) fit(s.v, { max: 92, min: 40 }); });
    fitGroup(row, [...L.pts, ...Rt.pts], { max: 38, min: 24, maxH: root.clientHeight - (ttl ? ttl.offsetHeight + 34 : 0) });
    const aL = ctx.at(d.left && d.left.at, 0.15), aR = ctx.at(d.right && d.right.at, Math.max(aL + 0.6, Math.min(1.4, sc.duration * 0.3)));
    const win = d.winner === 'left' ? L : d.winner === 'right' ? Rt : null;
    const winAt = ctx.at(d.winnerAt, sc.duration * 0.72);
    return {
      update(t) {
        if (ttl) reveal(ttl, prog(t, 0, 0.45), 'drop');
        reveal(L.c, prog(t, aL, 0.5), 'slide');
        reveal(Rt.c, prog(t, aR, 0.5), 'slideR');
        reveal(vs, prog(t, (aL + aR) / 2, 0.45), 'spin');
        [[L, aL], [Rt, aR]].forEach(([s, a]) => s.pts.forEach((p, i) => reveal(p, prog(t, a + 0.35 + i * 0.3, 0.4), 'rise')));
        if (win) {
          const q = prog(t, winAt, 0.4);
          win.c.classList.toggle('win', q > 0);
          if (q > 0) addT(win.c, `scale(${1 + 0.05 * E.outBack(q)})`);
          const lose = win === L ? Rt : L; lose.c.style.filter = q > 0 ? `saturate(${1 - 0.7 * q}) brightness(${1 - 0.25 * q})` : '';
        }
      },
    };
  };

  /* meters: battery bars for traits or levels */
  C.meters = function (sc, ctx) {
    const d = sc.data, root = ctx.content();
    let ttl = null;
    if (d.title) { ttl = h('div', 'display list-title', root); rich(ttl, d.title); fit(ttl, { max: Math.round(ctx.size('title') * 0.7), min: 44, maxH: 320 }); }
    const box = h('div', 'meters', root);
    const segs = d.segments || 5;
    const rows = (d.items || []).map((it) => {
      const r = h('div', 'mt-row card', box);
      if (it.emoji) h('div', 'mt-emoji emoji', r, it.emoji);
      const lab = h('div', 'mt-label', r); rich(lab, it.label || '');
      const bat = h('div', 'mt-bat', r); const body = h('div', 'mt-body', bat); h('div', 'mt-nub', bat);
      const ss = []; for (let k = 0; k < segs; k++) { const sg = h('div', 'mt-seg', body); ss.push(h('i', null, sg)); }
      const pct = h('div', 'mt-pct', r, '0%');
      const v = clamp((+it.value || 0) / 100);
      const col = it.color || (v < 0.25 ? '#ff4d4d' : v < 0.6 ? '#ffb020' : '#35d07f');
      ss.forEach((x) => { x.style.background = col; });
      return { r, lab, ss, pct, v, it };
    });
    fitGroup(box, rows.map((o) => o.lab), { max: 46, min: 26, maxH: root.clientHeight - (ttl ? ttl.offsetHeight + 34 : 0) });
    const n = rows.length;
    const times = rows.map((o, i) => ctx.at(o.it.at, ctx.spread(n, i, 0.3, Math.max(0.3, sc.duration * 0.6))));
    return {
      update(t) {
        if (ttl) reveal(ttl, prog(t, 0, 0.45), 'drop');
        rows.forEach((o, i) => {
          reveal(o.r, prog(t, times[i], 0.4), 'slide');
          const f = E.outCubic(prog(t, times[i] + 0.2, 1.0)) * o.v;
          o.ss.forEach((x, k) => { x.style.transform = `scaleX(${clamp(f * segs - k)})`; });
          o.pct.textContent = Math.round(f * 100) + '%';
          if (o.v < 0.2 && f >= o.v - 1e-6 && t > times[i] + 1.2) o.r.querySelector('.mt-body').style.opacity = String(0.55 + 0.45 * Math.abs(Math.cos(t * 5)));
        });
      },
    };
  };

  /* timeline: a vertical line of dates */
  C.timeline = function (sc, ctx) {
    const d = sc.data, root = ctx.content('t-top');
    let ttl = null;
    if (d.title) { ttl = h('div', 'display list-title', root); rich(ttl, d.title); fit(ttl, { max: Math.round(ctx.size('title') * 0.7), min: 44, maxH: 300 }); }
    const view = h('div', 'tl-view', root);
    const tl = h('div', 'tl', view);
    const line = h('div', 'tl-line', tl);
    const evs = (d.events || []).map((ev) => {
      const r = h('div', 'tl-ev', tl);
      const dot = h('div', 'tl-dot emoji', r, ev.emoji || '');
      const body = h('div', 'tl-body', r);
      const yr = h('div', 'tl-year', body, ev.year != null ? String(ev.year) : ev.label || '');
      const tx = h('div', 'tl-text', body); rich(tx, ev.text || '');
      return { r, dot, yr, tx, ev };
    });
    evs.forEach((o) => { fit(o.tx, { max: 46, min: 28 }); fit(o.yr, { max: 70, min: 36 }); });
    const n = evs.length;
    const times = evs.map((o, i) => ctx.at(o.ev.at, ctx.spread(n, i, 0.3, Math.max(0.3, sc.duration * 0.72))));
    const tops = evs.map((o) => o.r.offsetTop + 62);
    const viewH = view.clientHeight;
    const maxScroll = Math.max(0, tl.offsetHeight - viewH + 10);
    line.style.height = Math.max(0, (tops[n - 1] || 0) - 20) + 'px';
    return {
      update(t) {
        if (ttl) reveal(ttl, prog(t, 0, 0.45), 'drop');
        let reach = 0, cur = 0;
        evs.forEach((o, i) => {
          reveal(o.r, prog(t, times[i], 0.45), 'slideR');
          const q = prog(t, times[i] - 0.35, 0.35);
          if (q > 0) { reach = lerp(i ? tops[i - 1] : 20, tops[i], E.inOutQuad(q)); cur = i; }
        });
        const full = Math.max(1, (tops[n - 1] || 1) - 20);
        line.style.transform = `scaleY(${clamp((reach - 20) / full)})`;
        const target = tops[cur] || 0;
        const scroll = clamp(target - viewH * 0.6, 0, maxScroll);
        const prev = cur > 0 ? clamp(tops[cur - 1] - viewH * 0.6, 0, maxScroll) : 0;
        const qs = E.inOutCubic(prog(t, times[cur] - 0.4, 0.5));
        tl.style.transform = `translateY(${-lerp(prev, scroll, qs)}px)`;
      },
    };
  };

  /* steps: a vertical flow, box -> arrow -> box */
  C.steps = function (sc, ctx) {
    const d = sc.data, root = ctx.content();
    let ttl = null;
    if (d.title) { ttl = h('div', 'display list-title', root); rich(ttl, d.title); fit(ttl, { max: Math.round(ctx.size('title') * 0.7), min: 44, maxH: 300 }); }
    const box = h('div', 'steps', root);
    const steps = (d.steps || []).map((s, i) => {
      if (typeof s === 'string') s = { text: s };
      let arrow = null;
      if (i > 0) { arrow = h('div', 'st-arrow', box); h('i', null, arrow); h('b', null, arrow); }
      const b = h('div', 'st-box card', box);
      h('div', 'st-n' + (s.emoji ? ' is-emoji emoji' : ''), b, s.emoji || String(i + 1));
      const tx = h('div', 'st-text', b); rich(tx, s.text || '');
      return { b, tx, arrow, s };
    });
    fitGroup(box, steps.map((o) => o.tx), { max: d.size || 58, min: 26, maxH: root.clientHeight - (ttl ? ttl.offsetHeight + 34 : 0) });
    const n = steps.length;
    const times = steps.map((o, i) => ctx.at(o.s.at, ctx.spread(n, i, 0.3, Math.max(0.3, sc.duration * 0.68))));
    return {
      update(t) {
        if (ttl) reveal(ttl, prog(t, 0, 0.45), 'drop');
        steps.forEach((o, i) => {
          if (o.arrow) {
            const q = prog(t, times[i] - 0.3, 0.3);
            o.arrow.style.visibility = q > 0 ? 'visible' : 'hidden';
            o.arrow.firstChild.style.transform = `scaleY(${E.outCubic(q)})`;
            o.arrow.lastChild.style.opacity = String(q >= 1 ? 1 : 0);
          }
          reveal(o.b, prog(t, times[i], 0.45), 'pop');
        });
      },
    };
  };

  /* choice: "which one would you pick?" with countdown */
  C.choice = function (sc, ctx) {
    const d = sc.data, root = ctx.content();
    const q = h('div', 'display ch-q', root); const qw = rich(q, d.question || '');
    const cards = h('div', 'ch-cards', root);
    const mk = (side, cls, letter) => {
      side = side || {};
      const c = h('div', 'ch-card card ' + cls, cards);
      const pct = h('div', 'ch-pct', c);
      h('div', 'ch-letter', c, letter);
      const tx = h('div', 'ch-text', c); rich(tx, side.text || '');
      if (side.emoji) h('div', 'ch-emoji emoji', c, side.emoji);
      const pl = h('div', 'ch-pctl', c, '');
      return { c, tx, pct, pl };
    };
    const A = mk(d.a, 'a', 'A');
    const orEl = h('div', 'ch-or', cards, d.or || 'or');
    const B = mk(d.b, 'b', 'B');
    let ring = null, ringNum = null, circ = 0, arc = null;
    const cdn = d.countdown == null ? 3 : +d.countdown;
    if (cdn > 0) {
      ring = h('div', 'ch-ring', root);
      const s = svgEl('svg', { viewBox: '0 0 200 200' }, ring);
      svgEl('circle', { cx: 100, cy: 100, r: 86, fill: 'none', stroke: 'rgba(127,127,127,.25)', 'stroke-width': 16 }, s);
      arc = svgEl('circle', { cx: 100, cy: 100, r: 86, fill: 'none', 'stroke-width': 16, 'stroke-linecap': 'round' }, s);
      arc.style.stroke = 'var(--accent)';
      circ = 2 * Math.PI * 86; arc.setAttribute('stroke-dasharray', String(circ));
      ringNum = h('div', 'num', ring, String(cdn));
    }
    fit(q, { max: d.size || 86, min: 44, maxH: 360 });
    fitGroup(cards, [A.tx, B.tx], { max: 50, min: 28, maxH: root.clientHeight - q.offsetHeight - (ring ? 230 : 0) - 40 });
    const aAt = ctx.at(d.aAt, 0.5), bAt = ctx.at(d.bAt, aAt + 0.55);
    const cAt = ctx.at(d.countdownAt, bAt + 0.4);
    const pa = d.percentA != null ? clamp(+d.percentA / 100) : null;
    const rAt = ctx.at(d.revealAt, cAt + cdn + 0.1);
    const qt = ctx.wordTimes(qw, 0.05);
    return {
      update(t) {
        qw.forEach((w, i) => reveal(w, prog(t, qt[i], ctx.wdur), ctx.kind));
        reveal(A.c, prog(t, aAt, 0.45), 'slide');
        reveal(orEl, prog(t, (aAt + bAt) / 2, 0.35), 'pop');
        reveal(B.c, prog(t, bAt, 0.45), 'slideR');
        if (ring) {
          reveal(ring, prog(t, cAt - 0.2, 0.3), 'pop');
          const rem = clamp(cdn - (t - cAt), 0, cdn);
          arc.setAttribute('stroke-dashoffset', String(circ * (1 - rem / cdn)));
          ringNum.textContent = String(Math.max(0, Math.ceil(rem - 1e-6)));
        }
        if (pa != null) {
          const k = E.outCubic(prog(t, rAt, 0.9));
          A.pct.style.transform = `scaleX(${k * pa})`; B.pct.style.transform = `scaleX(${k * (1 - pa)})`;
          A.pl.textContent = k > 0 ? Math.round(k * pa * 100) + '%' : '';
          B.pl.textContent = k > 0 ? Math.round(k * (1 - pa) * 100) + '%' : '';
          const winA = pa >= 0.5;
          (winA ? B : A).c.classList.toggle('dim', k >= 1);
        }
      },
    };
  };

  /* quote */
  C.quote = function (sc, ctx) {
    const d = sc.data, root = ctx.content();
    const mark = h('div', 'qt-mark', root, '“');
    const tx = h('div', 'display qt-text', root); const words = rich(tx, d.text || '');
    const au = d.author ? h('div', 'qt-author', root, '— ' + d.author) : null;
    fit(tx, { max: d.size || 100, min: 40, maxH: root.clientHeight - 260 });
    const times = ctx.wordTimes(words, ctx.at(d.at, 0.25));
    const auAt = (times[times.length - 1] || 0.5) + 0.35;
    return {
      update(t) {
        reveal(mark, prog(t, 0, 0.5), 'pop');
        words.forEach((w, i) => reveal(w, prog(t, times[i], 0.5), d.reveal || 'fade'));
        if (au) reveal(au, prog(t, auAt, 0.5), 'rise');
      },
    };
  };

  /* image: a still picture with a slow camera move */
  C.image = function (sc, ctx) {
    const d = sc.data, root = ctx.full('img-box');
    const im = h('img', null, root); im.src = asset(d.src || '');
    if (d.fit) im.style.objectFit = d.fit;
    if (d.shade !== false) h('div', 'img-shade', root);
    const cap = d.caption ? h('div', 'display img-cap', root) : null; const cw = cap ? rich(cap, d.caption) : [];
    if (cap) fit(cap, { max: 84, min: 40, maxH: 420 });
    const kb = Object.assign({ from: { scale: 1.0, x: 0, y: 0 }, to: { scale: 1.14, x: -30, y: -40 } }, d.kenburns || {});
    const ct = ctx.wordTimes(cw, 0.25);
    return {
      update(t) {
        const q = E.inOutSine(prog(t, 0, sc.duration));
        im.style.transform = `translate(${lerp(kb.from.x, kb.to.x, q)}px, ${lerp(kb.from.y, kb.to.y, q)}px) scale(${lerp(kb.from.scale, kb.to.scale, q)})`;
        cw.forEach((w, i) => reveal(w, prog(t, ct[i], ctx.wdur), ctx.kind));
      },
    };
  };

  /* cta / outro */
  C.cta = function (sc, ctx) {
    const d = sc.data, root = ctx.content();
    const emo = d.emoji ? h('div', 'emoji-big', root, d.emoji) : null;
    const tx = h('div', 'display ttl', root); const words = rich(tx, d.text || 'Follow for more');
    fit(tx, { max: d.size || ctx.size('title'), min: 44, maxH: root.clientHeight * 0.5 });
    const btn = d.button === false ? null : h('div', 'cta-btn', root, (d.button || 'Follow') + ' →');
    const hd = d.handle ? h('div', 'cta-handle', root, d.handle) : null;
    const times = ctx.wordTimes(words, 0.1);
    const bAt = (times[times.length - 1] || 0.4) + 0.3;
    return {
      update(t) {
        if (emo) { reveal(emo, prog(t, 0, 0.5), 'pop'); if (t > 0) addT(emo, `translateY(${-Math.abs(Math.sin(t * 3.2)) * 26}px)`); }
        words.forEach((w, i) => reveal(w, prog(t, times[i], ctx.wdur), ctx.kind));
        if (btn) { reveal(btn, prog(t, bAt, 0.45), 'pop'); if (t > bAt + 0.45) btn.style.transform = `scale(${1 + 0.045 * Math.sin((t - bAt) * 6)})`; }
        if (hd) reveal(hd, prog(t, bAt + 0.25, 0.4), 'fade');
      },
    };
  };
  C.outro = C.cta;

  /* stick: stick-figure characters with poses, faces and speech bubbles */
  const LEGS = { rt: 8, rs: 4, lt: -8, ls: -4 };
  const POSES = {
    stand: Object.assign({ ru: 16, rl: 7, lu: -16, ll: -7 }, LEGS),
    wave: Object.assign({ ru: 140, rl: 165, lu: -16, ll: -7, anim: 'wave' }, LEGS),
    point: Object.assign({ ru: 92, rl: 90, lu: -16, ll: -7 }, LEGS),
    pointLeft: Object.assign({ ru: 16, rl: 7, lu: -92, ll: -90 }, LEGS),
    think: Object.assign({ ru: 32, rl: 168, lu: -22, ll: 58 }, LEGS),
    cheer: { ru: 150, rl: 162, lu: -150, ll: -162, rt: 14, rs: 8, lt: -14, ls: -8, anim: 'jump' },
    happy: Object.assign({ ru: 40, rl: 20, lu: -40, ll: -20 }, LEGS),
    sad: { ru: 5, rl: 2, lu: -5, ll: -2, rt: 5, rs: 2, lt: -5, ls: -2, slump: 10 },
    shrug: Object.assign({ ru: 52, rl: 128, lu: -52, ll: -128 }, LEGS),
    angry: { ru: 52, rl: -32, lu: -52, ll: 32, rt: 15, rs: 8, lt: -15, ls: -8 },
    surprised: Object.assign({ ru: 122, rl: 148, lu: -122, ll: -148 }, LEGS),
    facepalm: Object.assign({ ru: 28, rl: 172, lu: -16, ll: -7, slump: 6 }, LEGS),
    walk: Object.assign({ ru: 16, rl: 7, lu: -16, ll: -7, anim: 'walk' }, LEGS),
    run: Object.assign({ ru: 16, rl: 7, lu: -16, ll: -7, anim: 'run' }, LEGS),
  };
  const DEG = Math.PI / 180;
  const dir = (a) => [Math.sin(a * DEG), Math.cos(a * DEG)];
  function limb(o, a1, l1, a2, l2) { const d1 = dir(a1), m = [o[0] + d1[0] * l1, o[1] + d1[1] * l1]; const d2 = dir(a2); return [m, [m[0] + d2[0] * l2, m[1] + d2[1] * l2]]; }

  C.stick = function (sc, ctx) {
    const d = sc.data, root = ctx.full('stick-stage');
    const figs = (d.figures || [{}]).map((f, i, arr) => Object.assign({ x: arr.length === 1 ? 0.5 : lerp(0.27, 0.73, i / (arr.length - 1)) }, f));
    const n = figs.length;
    const figH = d.size || (n === 1 ? 660 : n === 2 ? 580 : 470);
    const ground = d.groundY || (ctx.capsOn ? 1330 : 1520);
    let title = null, tw = [];
    if (d.title) { title = h('div', 'display stick-title', root); tw = rich(title, d.title); fit(title, { max: 84, min: 40, maxH: 330 }); }
    const tt = ctx.wordTimes(tw, 0.1);
    let gl = null;
    if (d.ground !== false) { gl = h('div', 'ground', root); gl.style.top = (ground - 2) + 'px'; }
    const props = (d.props || []).map((p) => { const el = h('div', 'prop', root, p.emoji || '⭐'); el.style.left = (p.x != null ? p.x : 0.5) * W + 'px'; el.style.top = (p.y != null ? p.y : 0.4) * H + 'px'; if (p.size) el.style.fontSize = p.size + 'px'; return { el, p }; });
    const sw = (ctx.style.shape.stroke || 12) * 1.1;
    const F = figs.map((f, idx) => {
      const el = h('div', 'fig', root);
      const scale = figH / 600;
      el.style.width = 300 * scale + 'px'; el.style.height = 600 * scale + 'px';
      const s = svgEl('svg', { viewBox: '0 0 300 600' }, el);
      if (f.color) el.style.setProperty('--line', f.color);
      const P = (cls) => { const p = svgEl('path', { 'stroke-width': sw }, s); if (cls) p.setAttribute('class', cls); return p; };
      const legL = P(), legR = P(), body = P(), armL = P(), armR = P();
      const head = svgEl('circle', { r: 52, 'stroke-width': sw, class: 'head' }, s);
      const eyeL = svgEl('ellipse', { rx: 7, ry: 8, class: 'eye' }, s), eyeR = svgEl('ellipse', { rx: 7, ry: 8, class: 'eye' }, s);
      const mouth = P(); mouth.setAttribute('stroke-width', sw * 0.7);
      const brows = P(); brows.setAttribute('stroke-width', sw * 0.6);
      let bub = null;
      if (f.say || f.think) {
        bub = h('div', 'bubble' + (f.think ? ' think' : ''), root);
        rich(bub, f.say || f.think);
        fit(bub, { max: f.bubbleSize || 50, min: 28, maxH: 360 });
      }
      const label = f.label ? h('div', 'kicker', root, f.label) : null;
      if (label) { label.style.position = 'absolute'; label.style.top = ground + 26 + 'px'; label.style.width = '420px'; label.style.textAlign = 'center'; }
      const poses = (f.poses && f.poses.length ? f.poses : [{ at: 0, pose: f.pose || 'stand', mood: f.mood || 'neutral' }]).map((p) => Object.assign({ at: 0 }, p));
      return { f, el, scale, legL, legR, body, armL, armR, head, eyeL, eyeR, mouth, brows, bub, label, poses, idx, ph: idx * 1.7 + 0.3 };
    });
    function poseAt(fo, t) {
      const ps = fo.poses; let cur = ps[0], prev = null;
      for (let i = 0; i < ps.length; i++) if (t >= (ps[i].at || 0)) { prev = i > 0 ? ps[i - 1] : null; cur = ps[i]; }
      const A = POSES[cur.pose] || POSES.stand;
      if (!prev) return { p: A, mood: cur.mood || 'neutral', anim: A.anim };
      const B = POSES[prev.pose] || POSES.stand; const k = E.inOutCubic(prog(t, cur.at, 0.3));
      const out = {}; for (const key of ['ru', 'rl', 'lu', 'll', 'rt', 'rs', 'lt', 'ls', 'slump']) out[key] = lerp(B[key] || 0, A[key] || 0, k);
      return { p: out, mood: k > 0.5 ? cur.mood || 'neutral' : prev.mood || 'neutral', anim: A.anim };
    }
    return {
      update(t) {
        if (title) tw.forEach((w, i) => reveal(w, prog(t, tt[i], ctx.wdur), ctx.kind));
        if (gl) { gl.style.visibility = 'visible'; gl.style.transform = `scaleX(${E.outCubic(prog(t, 0, 0.6))})`; }
        props.forEach((o) => { reveal(o.el, prog(t, ctx.at(o.p.at, 0.4), 0.5), 'pop'); if (t > 0) addT(o.el, `translateY(${Math.sin(t * 2 + o.p.x * 9) * 12}px)`); });
        F.forEach((fo) => {
          const f = fo.f, at = ctx.at(f.at, 0);
          const lt = t - at;
          if (lt < 0) { fo.el.style.visibility = 'hidden'; if (fo.bub) fo.bub.style.visibility = 'hidden'; if (fo.label) fo.label.style.visibility = 'hidden'; return; }
          fo.el.style.visibility = 'visible';
          const st = poseAt(fo, t);
          const p = Object.assign({}, st.p);
          let x = f.x, bob = Math.sin(t * 2.3 + fo.ph) * 4, walking = st.anim === 'walk' || st.anim === 'run';
          // entering and moving
          if (f.enter === 'left' || f.enter === 'right') {
            const k = prog(lt, 0, 1.1); const from = f.enter === 'left' ? -0.25 : 1.25;
            if (k < 1) { x = lerp(from, f.x, E.outQuad(k)); walking = true; }
          }
          if (f.walkTo) {
            const wa = ctx.at(f.walkTo.at, 1), wd = f.walkTo.dur || 1.4; const k = prog(t, wa, wd);
            if (k > 0) x = lerp(x, f.walkTo.x, E.inOutQuad(k));
            if (k > 0 && k < 1) walking = true;
          }
          if (walking) {
            const w = t * (st.anim === 'run' ? 11 : 8);
            const sw2 = st.anim === 'run' ? 38 : 26;
            p.rt = sw2 * Math.sin(w); p.lt = -sw2 * Math.sin(w);
            p.rs = p.rt - 18 * Math.max(0, Math.cos(w)); p.ls = p.lt - 18 * Math.max(0, -Math.cos(w));
            p.ru = 14 - 26 * Math.sin(w); p.rl = p.ru + 18; p.lu = -14 - 26 * Math.sin(w); p.ll = p.lu + 18;
            bob = -Math.abs(Math.sin(w)) * 8;
          }
          if (st.anim === 'wave') p.rl = 165 + 24 * Math.sin(t * 9);
          if (st.anim === 'jump') bob = -Math.abs(Math.sin(t * 5)) * 34;
          const slump = p.slump || 0;
          const hip = [150, 360], sh = [150 + slump * 0.6, 200 + slump], hc = [150 + slump, 120 + slump * 1.6];
          const [eR, hR] = limb(sh, p.ru, 92, p.rl, 84), [eL, hL] = limb(sh, p.lu, 92, p.ll, 84);
          const [kR, fR] = limb(hip, p.rt, 116, p.rs, 116), [kL, fL] = limb(hip, p.lt, 116, p.ls, 116);
          const pt = (a) => a[0].toFixed(1) + ',' + a[1].toFixed(1);
          fo.body.setAttribute('d', `M${pt([hc[0], hc[1] + 52])} Q${pt([150 + slump * 1.4, 280])} ${pt(hip)}`);
          fo.armR.setAttribute('d', `M${pt(sh)} L${pt(eR)} L${pt(hR)}`);
          fo.armL.setAttribute('d', `M${pt(sh)} L${pt(eL)} L${pt(hL)}`);
          fo.legR.setAttribute('d', `M${pt(hip)} L${pt(kR)} L${pt(fR)}`);
          fo.legL.setAttribute('d', `M${pt(hip)} L${pt(kL)} L${pt(fL)}`);
          fo.head.setAttribute('cx', hc[0]); fo.head.setAttribute('cy', hc[1]);
          const face = f.face === 'left' ? -9 : f.face === 'right' ? 9 : 0;
          const blinkP = (t + fo.ph * 1.3) % 3.4; const blink = blinkP < 0.12 ? 0.12 : 1;
          const ey = hc[1] - 6, mood = st.mood;
          [[fo.eyeL, -20], [fo.eyeR, 20]].forEach(([e, dx]) => { e.setAttribute('cx', hc[0] + dx + face); e.setAttribute('cy', ey); e.setAttribute('ry', String((mood === 'surprised' ? 10 : 8) * blink)); });
          const mx = hc[0] + face, my = hc[1] + 22;
          let md;
          if (mood === 'happy') md = `M${mx - 20},${my - 4} Q${mx},${my + 18} ${mx + 20},${my - 4}`;
          else if (mood === 'sad') md = `M${mx - 18},${my + 10} Q${mx},${my - 6} ${mx + 18},${my + 10}`;
          else if (mood === 'surprised') md = `M${mx - 8},${my + 4} a8,10 0 1,0 16,0 a8,10 0 1,0 -16,0`;
          else if (mood === 'angry') md = `M${mx - 16},${my + 6} L${mx + 16},${my + 6}`;
          else md = `M${mx - 14},${my + 4} L${mx + 14},${my + 4}`;
          fo.mouth.setAttribute('d', md);
          fo.brows.setAttribute('d', mood === 'angry' ? `M${hc[0] - 34 + face},${ey - 22} L${hc[0] - 10 + face},${ey - 12} M${hc[0] + 34 + face},${ey - 22} L${hc[0] + 10 + face},${ey - 12}`
            : mood === 'sad' ? `M${hc[0] - 32 + face},${ey - 14} L${hc[0] - 12 + face},${ey - 22} M${hc[0] + 32 + face},${ey - 14} L${hc[0] + 12 + face},${ey - 22}` : '');
          const wpx = 300 * fo.scale, hpx = 600 * fo.scale;
          const left = x * W - wpx / 2, top = ground - hpx + 6 * fo.scale;
          fo.el.style.left = left + 'px'; fo.el.style.top = top + 'px';
          const enterPop = f.enter === 'pop' || !f.enter ? E.outBack(prog(lt, 0, 0.45)) : 1;
          fo.el.style.transform = `translateY(${bob * fo.scale}px) scale(${lerp(0.4, 1, enterPop)})` + (f.flip ? ' scaleX(-1)' : '');
          fo.el.style.opacity = String(clamp(prog(lt, 0, 0.2)));
          if (fo.label) { fo.label.style.left = (x * W - 210) + 'px'; reveal(fo.label, prog(lt, 0.2, 0.4), 'fade'); }
          if (fo.bub) {
            const bw = fo.bub.offsetWidth, bh = fo.bub.offsetHeight;
            const cx = x * W; const bl = clamp(cx - bw / 2, 50, W - 50 - bw);
            fo.bub.style.left = bl + 'px';
            fo.bub.style.top = (top + (hc[1] - 52) * fo.scale - bh - 52) + 'px';
            fo.bub.style.setProperty('--tail', clamp(cx - bl, 40, bw - 40) + 'px');
            reveal(fo.bub, prog(t, ctx.at(f.sayAt, at + 0.35), 0.4), 'pop');
          }
        });
      },
    };
  };

  /* map: a stylised flying map with pins and a route */
  function closedCurve(p) {
    const n = p.length; const f = (v) => v.toFixed(1);
    let s = `M${f(p[0][0])},${f(p[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
      s += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    return s + 'Z';
  }
  C.map = function (sc, ctx) {
    const d = sc.data, root = ctx.full('map'), r = ctx.rng;
    const world = h('div', 'map-world', root);
    const svg = svgEl('svg', { viewBox: '0 0 1000 1000' }, world);
    const over = h('div', 'map-over', root);
    const pins = (d.pins || []).map((p) => Object.assign({}, p, { x: +p.x || 500, y: +p.y || 500 }));
    const grat = svgEl('g', { fill: 'none', 'stroke-width': 1.4 }, svg); grat.style.stroke = 'rgba(255,255,255,.08)';
    for (let i = -1000; i <= 2000; i += 100) { svgEl('line', { x1: i, y1: -1000, x2: i, y2: 2000 }, grat); svgEl('line', { x1: -1000, y1: i, x2: 2000, y2: i }, grat); }
    const contours = [];
    function blob(cx, cy, rad, irr) {
      const ph = [r() * 6.28, r() * 6.28, r() * 6.28, r() * 6.28], n = 64;
      const ring = (rr) => { const pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832; const k = 1 + irr * (0.5 * Math.sin(2 * a + ph[0]) + 0.3 * Math.sin(3 * a + ph[1]) + 0.15 * Math.sin(7 * a + ph[2]) + 0.08 * Math.sin(13 * a + ph[3])); pts.push([cx + Math.cos(a) * rr * k, cy + Math.sin(a) * rr * k * 0.9]); } return closedCurve(pts); };
      if (rad > 70) { contours.push(ring(rad * 0.74)); contours.push(ring(rad * 0.48)); }
      return ring(rad);
    }
    let lands = Array.isArray(d.land) ? d.land.slice() : [];
    if (!lands.length && d.land !== 'none') {
      const mode = d.land === 'islands' ? 'islands' : 'continent';
      pins.forEach((p) => lands.push(blob(p.x + (r() - 0.5) * 70, p.y + (r() - 0.5) * 70, mode === 'islands' ? 90 + r() * 50 : 160 + r() * 80, 0.3)));
      if (mode === 'continent') for (let i = 0; i < pins.length - 1; i++) {
        const a = pins[i], b = pins[i + 1]; const steps = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 130);
        for (let k = 1; k < steps; k++) { const f = k / steps; lands.push(blob(lerp(a.x, b.x, f) + (r() - 0.5) * 90, lerp(a.y, b.y, f) + (r() - 0.5) * 90, 120 + r() * 70, 0.35)); }
      }
      for (let i = 0; i < 7; i++) lands.push(blob(-300 + r() * 1600, -300 + r() * 1600, 50 + r() * 120, 0.45));
    }
    const coastG = svgEl('g', { 'stroke-width': 16, 'stroke-linejoin': 'round' }, svg); coastG.style.fill = 'var(--coast)'; coastG.style.stroke = 'var(--coast)';
    const landG = svgEl('g', {}, svg); landG.style.fill = 'var(--land)';
    lands.forEach((pd) => { svgEl('path', { d: pd }, coastG); svgEl('path', { d: pd }, landG); });
    const clipId = 'lc-' + String(sc.id).replace(/[^a-zA-Z0-9_-]/g, '');
    const defs = svgEl('defs', {}, svg); const cp = svgEl('clipPath', { id: clipId }, defs);
    lands.forEach((pd) => svgEl('path', { d: pd }, cp));
    const shore = svgEl('g', { 'clip-path': `url(#${clipId})`, fill: 'none' }, svg);
    lands.forEach((pd) => { const e = svgEl('path', { d: pd, 'stroke-width': 26 }, shore); e.style.stroke = 'rgba(0,0,0,.07)'; });
    contours.forEach((pd) => { const e = svgEl('path', { d: pd, 'stroke-width': 2.2, 'stroke-dasharray': '7 9' }, shore); e.style.stroke = 'rgba(0,0,0,.10)'; });
    const hiG = svgEl('g', { fill: 'none' }, svg);
    const highlights = (d.highlights || []).map((hl) => { const c = svgEl('circle', { cx: hl.x, cy: hl.y, r: hl.r || 60 }, hiG); c.style.stroke = hl.color || 'var(--accent)'; return { c, hl }; });
    // route
    const order = Array.isArray(d.route) ? d.route : d.route === false ? [] : pins.map((_, i) => i);
    const segs = [];
    for (let i = 0; i < order.length - 1; i++) {
      const a = pins[order[i]], b = pins[order[i + 1]]; if (!a || !b) continue;
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
      const sgn = i % 2 ? 1 : -1, cx = mx + (-dy / L) * L * 0.18 * sgn, cy = my + (dx / L) * L * 0.18 * sgn;
      const pts = []; for (let k = 0; k <= 60; k++) { const u = k / 60; pts.push([(1 - u) * (1 - u) * a.x + 2 * (1 - u) * u * cx + u * u * b.x, (1 - u) * (1 - u) * a.y + 2 * (1 - u) * u * cy + u * u * b.y]); }
      const el = svgEl('polyline', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg); el.style.stroke = d.routeColor || 'var(--accent)';
      segs.push({ el, pts, to: order[i + 1] });
    }
    // pins (screen space)
    const PE = pins.map((p) => {
      const el = h('div', 'pin', over);
      const ring = h('div', 'pin-ring', el), dot = h('div', 'pin-dot', el);
      const lab = p.label ? h('div', 'pin-lab', el) : null;
      if (lab) { if (p.emoji) h('span', 'emoji', lab, p.emoji); lab.appendChild(document.createTextNode(p.label)); }
      return { el, ring, dot, lab, p };
    });
    const head = segs.length ? h('div', 'route-head', over) : null;
    const veh = d.vehicle ? h('div', 'veh', over, d.vehicle) : null;
    let title = null, tw = [];
    if (d.title) { title = h('div', 'display map-title', root); tw = rich(title, d.title); fit(title, { max: 84, min: 40, maxH: 330 }); }
    const tt = ctx.wordTimes(tw, 0.1);
    // camera
    const MY = d.centerY || (ctx.capsOn ? 800 : 900) + (title ? 110 : 0), s0 = 1.08;
    let ov = { x: 500, y: 500, z: 1 };
    if (pins.length) {
      const xs = pins.map((p) => p.x), ys = pins.map((p) => p.y);
      const bx = [Math.min(...xs), Math.max(...xs)], by = [Math.min(...ys), Math.max(...ys)];
      const z = clamp(Math.min(1000 / (bx[1] - bx[0] + 380), 820 / (by[1] - by[0] + 380)), 0.7, 2.2);
      ov = { x: (bx[0] + bx[1]) / 2, y: (by[0] + by[1]) / 2, z };
    }
    if (d.start) ov = Object.assign({}, ov, d.start);
    const n = pins.length;
    const times = pins.map((p, i) => ctx.at(p.at, ctx.spread(n, i, 0.9, Math.max(0.9, sc.duration * (n > 1 ? 0.7 : 0.3)))));
    const keys = [{ t: 0, x: ov.x, y: ov.y, z: ov.z }];
    const flyDur = d.fly || 1.1;
    const zPin = d.zoom || 2.0;
    pins.forEach((p, i) => {
      const prev = keys[keys.length - 1];
      const f0 = Math.max(prev.t + 0.2, times[i] - flyDur);
      keys.push({ t: f0, x: prev.x, y: prev.y, z: prev.z });
      keys.push({ t: Math.max(f0 + 0.3, times[i]), x: p.x, y: p.y, z: p.zoom || zPin });
    });
    if (n > 1 && d.overview !== false) {
      const last = keys[keys.length - 1], tEnd = sc.duration - 0.35;
      if (tEnd - 1.3 > last.t + 0.4) { keys.push({ t: tEnd - 1.3, x: last.x, y: last.y, z: last.z }); keys.push({ t: tEnd, x: ov.x, y: ov.y, z: ov.z }); }
    }
    function camAt(t) {
      if (t <= keys[0].t) return keys[0];
      for (let i = 0; i < keys.length - 1; i++) {
        const a = keys[i], b = keys[i + 1];
        if (t < b.t) {
          const q = E.inOutCubic(prog(t, a.t, b.t - a.t));
          const dist = Math.hypot(b.x - a.x, b.y - a.y);
          const dip = clamp(dist / 700) * 0.38;
          return { x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q), z: lerp(a.z, b.z, q) * (1 - dip * Math.sin(Math.PI * q)) };
        }
      }
      return keys[keys.length - 1];
    }
    const rotAmp = d.rotate != null ? d.rotate : 2;
    return {
      update(t) {
        const cam = camAt(t), S = s0 * cam.z, deg = rotAmp * Math.sin(t * 0.35), rad = deg * DEG;
        world.style.transform = `translate(${W / 2}px,${MY}px) rotate(${deg}deg) scale(${S}) translate(${-cam.x}px,${-cam.y}px)`;
        const cs = Math.cos(rad), sn = Math.sin(rad);
        const scr = (x, y) => { const dx = (x - cam.x) * S, dy = (y - cam.y) * S; return [W / 2 + dx * cs - dy * sn, MY + dx * sn + dy * cs]; };
        grat.setAttribute('stroke-width', String(1.4 / S));
        highlights.forEach(({ c, hl }) => {
          const q = prog(t, ctx.at(hl.at, 0.5), 0.6);
          c.style.visibility = q > 0 ? 'visible' : 'hidden';
          c.setAttribute('stroke-width', String(8 / S)); c.setAttribute('stroke-dasharray', `${18 / S} ${12 / S}`);
          c.setAttribute('r', String((hl.r || 60) * lerp(1.6, 1, E.outBack(q)) * (1 + 0.04 * Math.sin(t * 4))));
        });
        let headPt = null, headAng = 0;
        segs.forEach((sg, i) => {
          const end = times[sg.to] != null ? times[sg.to] : 0;
          const q = E.inOutCubic(prog(t, end - flyDur, flyDur));
          if (q <= 0) { sg.el.style.visibility = 'hidden'; return; }
          sg.el.style.visibility = 'visible';
          const m = Math.max(1, Math.round(q * 60));
          sg.el.setAttribute('points', sg.pts.slice(0, m + 1).map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
          sg.el.setAttribute('stroke-width', String(9 / S)); sg.el.setAttribute('stroke-dasharray', `${24 / S} ${16 / S}`);
          if (q < 1) { const a = sg.pts[m], b = sg.pts[Math.max(0, m - 1)]; headPt = a; headAng = Math.atan2(a[1] - b[1], a[0] - b[0]) / DEG + deg; }
        });
        if (head) { if (headPt) { const s = scr(headPt[0], headPt[1]); head.style.visibility = 'visible'; head.style.transform = `translate(${s[0]}px,${s[1]}px)`; } else head.style.visibility = 'hidden'; }
        if (veh) { if (headPt) { const s = scr(headPt[0], headPt[1]); veh.style.visibility = 'visible'; veh.style.transform = `translate(${s[0] - 42}px,${s[1] - 42}px) rotate(${headAng + (d.vehicleAngle || 0)}deg)`; } else veh.style.visibility = 'hidden'; }
        PE.forEach((o, i) => {
          const s = scr(o.p.x, o.p.y);
          o.el.style.transform = `translate(${s[0]}px,${s[1]}px)`;
          const a = times[i];
          reveal(o.dot, prog(t, a - 0.1, 0.45), 'drop');
          const rp = t - a; o.ring.style.visibility = rp > 0 ? 'visible' : 'hidden';
          if (rp > 0) { const k = (rp % 1.6) / 1.6; o.ring.style.transform = `scale(${1 + 2.2 * k})`; o.ring.style.opacity = String(0.8 * (1 - k)); }
          if (o.lab) reveal(o.lab, prog(t, a + 0.12, 0.4), 'pop');
        });
        if (title) tw.forEach((w, i) => reveal(w, prog(t, tt[i], ctx.wdur), ctx.kind));
      },
    };
  };

  /* custom: write your own scene. data.html / data.css / data.setup (body of fn(el,ctx)) /
     data.js (body of fn(t, d, el, ctx), called every frame, t = scene-local seconds). */
  C.custom = function (sc, ctx) {
    const d = sc.data, root = ctx.full('custom');
    if (d.css) h('style', null, root, d.css);
    if (d.html) root.insertAdjacentHTML('beforeend', d.html);
    if (d.setup) new Function('el', 'ctx', d.setup)(root, ctx);
    const fn = d.js ? new Function('t', 'd', 'el', 'ctx', d.js) : null;
    return { update(t) { if (fn) fn(t, sc.duration, root, ctx); } };
  };
})();
