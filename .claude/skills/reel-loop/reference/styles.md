# Styles

A style card is the set of rules for a video: colours, fonts, motion, structure and sound. Library cards are in `reel-loop/styles/` (S01-S13); learned or saved cards go to `reel-loop/my-styles/`. The project uses its own copy, `videos/<slug>/style.json`, so you can tweak it per video.

## Library
`CLI styles list`, `CLI styles show S04`, `CLI styles match "<topic>"`, `CLI styles preview S01 S07 --text "<hook>"`.

| id | name | for |
|---|---|---|
| S01 | Atlas Flight | flying-map why-stories about places |
| S02 | Chalk Fable | quiet stick-figure moral stories |
| S03 | Neon Sayings | glowing sayings, mindset |
| S04 | Ink & Gilt Chronicle | history on parchment |
| S05 | Cut Paper | friendly paper explainers |
| S06 | Swiss Kinetic | bold kinetic typography, tips |
| S07 | Data Pop | charts, rankings, money |
| S08 | Midnight Lab | dark glowing science |
| S09 | Fork in the Road | you-choose suspense series |
| S10 | Blueprint | how machines work |
| S11 | Doodle Mascot | relatable comedy with a doodle mascot |
| S12 | Battery Personality | personality as battery meters |
| S13 | Pixel Arcade | retro pixel / gaming |

## Card fields
```json
{
  "id": "M01", "name": "…", "category": "Explainer", "tags": ["…"], "summary": "…", "bestFor": "…", "sample": "…",
  "palette": { "bg": "#…", "bg2": "#…", "fg": "#…", "muted": "#…", "accent": "#…", "accent2": "#…", "accent3": "#…",
               "card": "#…", "cardFg": "#…", "cardAccent": "#…", "hlBg": "#…", "hlFg": "#…", "line": "#…",
               "land": "#…", "water": "#…", "coast": "#…", "grid": "rgba(…)" },
  "fonts": { "display": {"family": "Archivo Black", "pkg": "archivo-black", "weights": [400]},
             "body": {"family": "Inter", "pkg": "inter", "weights": [600, 800]},
             "mono": {"family": "JetBrains Mono", "pkg": "jetbrains-mono", "weights": [700]} },
  "type": { "case": "none|uppercase", "tracking": "-0.02em", "leading": 1.02, "displayWeight": 900, "bodyWeight": 700, "scale": 1 },
  "shape": { "radius": 26, "stroke": 12, "shadow": "0 18px 50px rgba(0,0,0,.35)", "cardBorder": "3px solid #…" },
  "background": { "kind": "gradient|radial|paper|parchment|grid|blueprint|dots|chalk|glow|solid", "grain": 0.07, "vignette": 0.3 },
  "motion": { "reveal": "rise|pop|drop|slide|fade|blur|wipe|zoom|spin|type", "stagger": 0.08, "transition": "zoom|slide|slideX|fade|whip|wipe|paper|flash|cut", "drift": 0.03 },
  "captions": { "enabled": true, "style": "box|outline|highlight|plain", "size": 60, "maxWords": 4, "uppercase": false, "bg": "#fff", "fg": "#111", "on": "#…", "font": "…" },
  "sound": { "music": "calm|upbeat|playful|suspense|epic|lofi|chip|none", "musicVolume": 0.2, "sfx": "soft|punchy|off", "sfxVolume": 0.5 },
  "voice": { "tone": "…", "wps": 2.6, "providers": { "openai": "onyx", "elevenlabs": "George", "edge": {"en": "…", "de": "…"} } },
  "structure": ["…"], "scenes": ["map", "hook", "…"], "rules": ["…"],
  "css": ".card{…}  /* optional extra CSS for this style */"
}
```
Installed font packages (`pkg`): anton, archivo-black, bebas-neue, caveat, cinzel, dm-serif-display, fraunces, inter, jetbrains-mono, kalam, nunito, patrick-hand, permanent-marker, press-start-2p, space-grotesk. Any other family falls back to system fonts (add the `@fontsource/<pkg>` package to `reel-loop/package.json` to bundle it).

## From a video the user loves
`CLI styles learn <video> --name "<name>" [--save]` measures cuts per minute, seconds per shot, the colour palette (k-means), brightness and loudness, and writes a draft card plus `sheet.jpg` (16 frames) and `frame-*.jpg`. Then you look at the pictures and decide what numbers can't: closest font, uppercase or not, background kind, caption style, how text moves in, music mood. It never reuses the video's words, characters, logo or music. `--save` keeps it in `my-styles/` as M01, M02 … for future videos.

## From a blank page
Ask 2-3 plain questions (calm or punchy, light or dark, playful or serious, any colours they love or hate). Write three different cards (`looks/a.json`, `b.json`, `c.json`) — different palettes, type and background — then `CLI styles preview looks/a.json looks/b.json looks/c.json --text "<hook>"` and show the three pictures. The picked one becomes `style.json`.
