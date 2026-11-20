# script.json and scene types

## script.json

```json
{
  "title": "Why the Panama Canal needs locks",
  "language": "en",
  "targetSeconds": 60,
  "fps": 30,
  "style": "S01",
  "handle": "@yourchannel",
  "voice": { "provider": "auto", "voice": "George", "speed": 1.0 },
  "music": { "mood": "calm", "volume": 0.2 },
  "post": { "caption": "Why ships climb stairs in Panama 🚢", "hashtags": ["history", "geography"] },
  "hookOptions": ["…", "…", "…"],
  "hookChoice": 0,
  "scenes": [
    { "id": "s01", "type": "hook", "see": "Ship emoji, the question big", "voice": "Why would anyone build stairs for ships?",
      "data": { "kicker": "Panama Canal", "text": "Why build *stairs* for ships?", "emoji": "🚢" } }
  ]
}
```

- `voice` providers: `auto` (ElevenLabs key → OpenAI key → free Edge voices → system voice), `elevenlabs`, `openai`, `edge`, `system`, `recording` (+ `"recording": "narration.wav"` relative to the video folder, split at pauses; or files `voice/lines/<id>.wav`), `none`. `voice.voice` is a voice name (ElevenLabs name or id, OpenAI voice, Edge voice like `de-DE-ConradNeural`). Also `model`, `speed`, `instructions` (OpenAI tone), `stability`.
- `music.mood`: `calm`, `upbeat`, `playful`, `suspense`, `epic`, `lofi`, `chip`, `none` (all synthesized, no licences). Or `music.file` (their own track). `music.volume` 0.1-0.35.
- The narrator text in `voice` is what is spoken. Markup like `*word*` is removed before speaking.

## Every scene

| field | meaning |
|---|---|
| `id` | `s01`, `s02` … (unique) |
| `type` | one of the types below |
| `see` | what you see, in plain words (for the script table) |
| `voice` | the narrator's words for this scene ("" for none) |
| `data` | the type's fields (below) |
| `transition` | how this scene comes in: `cut`, `fade`, `slide` (push up), `slideX`, `zoom`, `whip`, `wipe` (circle), `paper`, `flash`. Default from the style |
| `sfx` | extra effects: `["whoosh", {"name": "ding", "at": "word:locks", "gain": 0.5}]`. Names: `swish`, `whoosh`, `pop`, `bubble`, `tick`, `type`, `ding`, `riser`, `impact`, `chime`, `glitch` |
| `duration` | seconds for a silent scene (or a longer minimum) |
| `minDuration`, `hold` | minimum length; extra seconds after the voice |
| `voiceDelay`, `pad` | seconds of silence before / after the line (defaults 0.18 / 0.3) |
| `captions` | `false` hides the caption overlay in this scene (auto-hidden when the on-screen text equals the narration) |

Common `data` fields for any type: `tag` (small badge at the top, e.g. "PART 1"), `bg` (background kind: `gradient`, `radial`, `paper`, `parchment`, `grid`, `blueprint`, `dots`, `chalk`, `glow`, `solid`), `bgColor`, `drift` (slow camera zoom, e.g. 0.04, 0 = still), `reveal` (`pop`, `rise`, `drop`, `slide`, `slideR`, `fade`, `blur`, `wipe`, `zoom`, `spin`, `type`, `none`), `sync: false` (do not sync words to the voice).

**Text markup** in any text field: `*accent*`, `^second accent^`, `{{highlighter}}`, `\n` line break. Emoji work everywhere.

**Times** (`at`, `sayAt`, `winnerAt`, …) are seconds from the scene start, or `"word:locks"` (the moment that word is spoken), or `"40%"` of the scene. Items in lists, steps, bars, meters, timelines and map pins sync to the narrator automatically when their first key word is spoken; set `at` only to override.

## Types

### hook · title · text · statement · icon
Big kinetic text; words appear as they are spoken.
`text` (required), `kicker` (small line above), `emoji`, `emojiSize`, `sub` (smaller line below), `subAt`, `align` (`center`|`left`), `size` (px, auto by length), `shake: true` (a jolt on the last word). `icon` = text with a huge emoji. Keep it under ~60 characters.

### number
A counter that rolls up. `value` (required), `from`, `prefix`, `suffix`, `decimals`, `format` (`compact` → 1.5M), `label`, `sub`, `emoji`, `kicker`, `at` (when counting starts), `countDur`, `size`.

### list
`title`, `items`: `[{ "text": "…", "emoji": "🌧️", "at": … }]` or plain strings, `numbered: false`, `focus: false` (no dimming of earlier items). Max 6 items, short lines.

### bars
Bar chart. `title`, `items`: `[{ "label": "Kiel", "value": 28000, "emoji": "🇩🇪", "highlight": true, "color": "#hex" }]`, `max`, `unit`, `prefix`, `decimals`, `format`. Biggest bar is highlighted unless you choose.

### compare
A vs B cards. `title`, `left`/`right`: `{ "emoji", "title", "value", "points": ["…"], "at" }`, `vs` ("VS"), `winner` (`left`|`right`), `winnerAt`.

### meters
Battery bars 0-100. `title`, `items`: `[{ "label", "value": 75, "emoji", "color" }]`, `segments` (5). Low values blink.

### timeline
Vertical dates. `title`, `events`: `[{ "year": 1914, "text": "First ship passes", "emoji": "🚢" }]` (or `label` instead of `year`). Scrolls when long.

### steps
A flow, box → arrow → box. `title`, `steps`: `[{ "text", "emoji" }]` or strings. Max 5.

### choice
"Which would you pick?" `question`, `a`/`b`: `{ "text", "emoji" }`, `or` ("or"), `countdown` (seconds, default 3, 0 = none), `percentA` (0-100, reveals the result), `aAt`, `bAt`, `countdownAt`, `revealAt`.

### quote
`text`, `author`, `at`, `size`, `reveal`.

### image
A still picture with a slow camera move. `src` (path relative to the video folder, or URL), `fit` (`cover`|`contain`), `kenburns`: `{ "from": {"scale":1,"x":0,"y":0}, "to": {"scale":1.15,"x":-30,"y":-40} }`, `caption`, `shade: false`.

### cta · outro
`text`, `emoji`, `button` (label, or `false`), `handle`, `size`.

### stick
Stick-figure characters. `title` (a line at the top), `figures`: up to 3 of
`{ "x": 0.3, "pose": "shrug", "mood": "sad", "say": "It cannot be done.", "think": "…", "at": 0, "sayAt": …, "enter": "left"|"right"|"pop"|"none", "walkTo": {"x": 0.7, "at": 1.5, "dur": 1.4}, "poses": [{"at": 0, "pose": "stand", "mood": "neutral"}, {"at": 2, "pose": "cheer", "mood": "happy"}], "face": "left"|"right", "color": "#hex", "label": "Anna", "bubbleSize": 50 }`
Poses: `stand`, `wave`, `point`, `pointLeft`, `think`, `cheer`, `happy`, `sad`, `shrug`, `angry`, `surprised`, `facepalm`, `walk`, `run`. Moods: `neutral`, `happy`, `sad`, `angry`, `surprised`.
Also `props`: `[{ "emoji": "💰", "x": 0.8, "y": 0.45, "size": 120, "at": 1 }]`, `ground: false`, `groundY`, `size` (figure height px).

### map
A stylised flying map; the camera flies pin to pin while a route draws. World coordinates are 0-1000 in x and y.
`pins`: `[{ "x": 300, "y": 330, "label": "Atlantic", "emoji": "🌊", "at": "word:Atlantic", "zoom": 2.2 }]`, `land` (`auto` = a continent around the pins, `islands`, `none`, or your own SVG path strings in 0-1000 space), `route` (`true`, `false`, or pin indexes `[0,2,1]`), `routeColor`, `vehicle` (emoji moving along the route, e.g. "🚢"), `vehicleAngle`, `zoom` (default 2.0), `fly` (seconds per flight), `overview: false` (no zoom-out at the end), `start` `{x,y,z}`, `title`, `highlights`: `[{ "x", "y", "r", "at", "color" }]`, `rotate` (camera sway, degrees).

### custom
When nothing fits: your own HTML, CSS and JavaScript, still on the same clock.
`html`, `css`, `setup` (JS body run once with `(el, ctx)`), `js` (JS body run every frame with `(t, d, el, ctx)`; `t` = seconds into the scene, `d` = scene length).
`ctx` gives you: `E` (easings: outCubic, outBack, inOutCubic, outExpo, …), `prog(t, start, dur)` → 0..1, `lerp`, `clamp`, `reveal(el, q, kind)`, `rich(el, text)`, `fit(el, {max, min, maxH})`, `h(tag, cls, parent, text)`, `svgEl(tag, attrs, parent)`, `rng()` (seeded random), `asset('pic.png')` (URL of a file in the video folder), `style`, `plan`.
Rules: everything must be a pure function of `t` — no `Date`, `Math.random`, timers, `requestAnimationFrame` or CSS transitions/animations. Use CSS variables like `var(--accent)`, `var(--fg)`, `var(--font-display)` so it follows the style.

```json
{ "id": "s05", "type": "custom", "voice": "The water rises twenty-six metres.",
  "data": {
    "html": "<div class='tank'><div class='water'></div><div class='boat'>🚢</div></div>",
    "css": ".tank{position:absolute;left:190px;top:420px;width:700px;height:700px;border:10px solid var(--fg);border-top:none;border-radius:0 0 30px 30px;overflow:hidden}.water{position:absolute;left:0;right:0;bottom:0;background:var(--accent3)}.boat{position:absolute;left:280px;font-size:140px}",
    "js": "const q = ctx.E.inOutCubic(ctx.prog(t, 0.4, d - 1)); const h = 120 + q * 420; el.querySelector('.water').style.height = h + 'px'; el.querySelector('.boat').style.bottom = (h - 30 + Math.sin(t * 3) * 6) + 'px';"
  } }
```
