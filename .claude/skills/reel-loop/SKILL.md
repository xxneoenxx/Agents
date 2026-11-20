---
name: reel-loop
description: Make a finished animated vertical video (Reels, Shorts, TikTok, YouTube) from one line the user types. Runs a 12-step loop with 4 approval stops (script, look, first seconds, finish), or "just make it" straight through, or autopilot over a queue of ideas. Use when the user asks for an animated/faceless/explainer short video, a reel, a TikTok, names a style (S01-S13 or a style name), wants a video "in the style of" one they love, or says "/reel-loop".
---

# Reel Loop: one line in, one video out

You turn one line ("Make a 60 second video on why the Panama Canal needs locks, in the Atlas Flight style") into a finished 1080×1920 video with script, animation, voice, music, sound effects, captions, a cover and a note. The engine lives in `reel-loop/` in this repository. You are the director: you write, decide and look; the CLI renders, mixes and checks.

```
CLI = node reel-loop/bin/loop.js          (run from the repository root)
```

Talk to the user in their language (German if they write German). The video's language is whatever the brief says.

References (read when you reach that step):
- `reference/scenes.md` — every scene type and its fields (needed to write `script.json`)
- `reference/writing.md` — hooks, structure, pacing, words per second
- `reference/styles.md` — style cards, learning a style from a video, designing looks from a blank page

## The 12 steps

Four times you STOP and wait for the user's yes: Script (4), Look (5), First seconds (8), Finish (12). Nothing moves on until they say yes. Record each yes with `CLI approve <video> script|look|first|finish`.

**1 · Setup.** Run `CLI doctor`. If something required is missing, tell the user what it is, how big it is and why it is needed (doctor prints this), and install it only after they say yes. If `reel-loop/node_modules` is missing, the fix is `cd reel-loop && npm install && npx playwright install chromium` (ask first). Do this once per machine; skip it when doctor already passed in this session.

**2 · Questions.** Ask at most five short questions, all in one message, and skip anything already said:
1. How to pick the style: from the library, from a video they love, or from a blank page?
2. What is the video about, and who is it for?
3. Where will it be posted (Reels, Shorts, TikTok, YouTube)? How long (default 45-60 s)?
4. Do they have a script already?
5. Narrator or no narrator? (If yes: their own voice service key, a free voice, or their own recording.)
Then `CLI new "<title>" --style <id> --lang <de|en|…> --seconds <n> --handle <@name>`. This creates `videos/<slug>/` with `brief.json`, `style.json`, `script.json`.

**3 · Style.** Three ways, then copy the result to `videos/<slug>/style.json`:
- *Library:* `CLI styles match "<topic>"`, then `CLI styles preview S01 S04 S08 --text "<their hook>" --out videos/<slug>/looks` and show 3-5 styles with one-sentence reasons and the preview pictures. They pick.
- *Their video:* `CLI styles learn <file> --name "<name>"`. Look at the printed `sheet.jpg` and `frame-*.jpg` yourself (Read tool), then refine the draft card: closest fonts from the installed list, background kind, caption style, motion, music mood, rules. Never reuse its words, characters, logo or music.
- *Blank page:* ask 2-3 plain questions about the feel (calm or punchy? light or dark? playful or serious?), write three style cards (`looks/a.json`, `b.json`, `c.json`), render them with `CLI styles preview looks/a.json looks/b.json looks/c.json --text "<hook>"`, show the three pictures. They pick.
The style card is the set of rules for the whole video. Follow its `structure`, `scenes`, `rules` and `voice.tone`.

**4 · Script — STOP for yes.** Read `reference/writing.md`. Offer three opening lines and say which one you would pick and why. Then write the whole `script.json` (schema in `reference/scenes.md`): one idea per scene, every scene has `see` (what you see), `voice` (the words) and `data`. Fill `post.caption` and `post.hashtags`. Show it with `CLI script <video>`, which prints the table: time, what you see, the words. Nothing is built until they say yes.

**5 · Look — STOP for yes.** Before anything moves: `CLI voice <video>` (it records quickly and gives real lengths; use `--provider none` if they want no narrator) then `CLI stills <video>`. It draws three still pictures: the first one, the busiest one, the quietest one. Look at each one yourself with the Read tool and fix problems before the user sees them: text cut off or too small, overlaps, low contrast, empty areas, anything in the top 220 px or bottom 380 px (the app's buttons cover those), anything off-style. Re-render, then show the three pictures. This stop decides the look of the whole video.

**6 · Plan.** `CLI plan <video>`. Every picture and sound gets its moment on one clock. Fix every ✗ error. Treat warnings as real (empty screen at a scene start, scene too long, too many words per second, over the target length) and fix them in `script.json` unless there is a reason not to.

**7 · Voice.** `CLI voice <video>` records only lines that changed. When the service allows it, offer two or three voices first: `CLI voice <video> --samples` and let the user listen (files are in `voice/samples/`). Set the chosen one in `script.voice.voice`. Providers: `elevenlabs` (ELEVENLABS_API_KEY), `openai` (OPENAI_API_KEY), `edge` (free, `pip install edge-tts`), `system` (built-in), `recording` (their file in `script.voice.recording`, or one file per line in `voice/lines/<id>.wav`), `none`. The real length of every line goes into the plan. A line that no longer fits is fixed now, not later: shorten it and run `voice` again.

**8 · First seconds — STOP for yes.** `CLI render <video> --first` builds the opening completely (the first 10-20 s: the hook and the first scene that shows what the video is about) with voice, effects and music. Check it yourself first: `CLI stills <video> --at 0.5,1.5,3,6,9` and look. Then give the user `videos/<slug>/preview/first-seconds.mp4` to watch and listen. This is the cheapest moment to change direction.

**9 · Animate.** Work scene by scene, in order. For each scene after the opening: `CLI stills <video> --scene <id>` and look at the three pictures before going to the next one, so it keeps the look they said yes to. `CLI stills <video> --all` makes one sheet of every scene (`stills/scenes-sheet.jpg`) for a fast overview. Then `CLI render <video>` animates the whole video (cached: re-running costs nothing if nothing changed).

**10 · Sound.** `CLI sound <video>`: music and effects under the voice, loudness measured (-14 LUFS target), and a captions file when there is a narrator. You cannot hear, so tell the user the numbers it prints (loudness, peak, voice-over-music dB, music mood) and ask them to listen. Change `script.music` (`mood`: calm, upbeat, playful, suspense, epic, lofi, chip, none; `volume`; or `file` for their own track) if they want.

**11 · Check.** `CLI check <video>` runs the automatic checks (size, length, black or frozen picture, silence, loudness) and writes contact sheets to `check/sheet-*.jpg`. Then start a fresh critic: use the Agent tool (general-purpose) with only the style card and the sheets, using the critic prompt below. Everything on its list is fixed in one round; run `check` again. A second critic round happens only if something is still broken.

**12 · Finish — STOP for yes.** Ask which size: 1080p, 2K or 4K. `CLI finish <video> --size <size>` makes the file, the captions, a cover frame (`cover.jpg`) and a short note (`note.md`), then looks inside the finished file before it says done. Give the user the paths in `videos/<slug>/out/`. Then ask what they would change. Changes loop back to the step they belong to (a line → 4/7, a look → 5, timing → 6, music → 10) and only that part is redone.

### Critic prompt (step 11)

> You are a strict video critic who has not seen this project before. Read the style card `<abs path>/style.json` and these contact sheets: `<abs paths>`. Each tile is one second (timestamp top-left). List everything that is wrong, most severe first, as `sheet · time · problem · fix`: text cut off, too small for a phone, overlapping or low contrast; captions covering content; empty or static stretches; anything in the top 220 px or bottom 380 px of the 1080×1920 frame; colours, fonts or motion that break the style card; spelling mistakes; a weak first second. No praise, no summary. If nothing is wrong, say "nothing".

## "Just make it"

If the user says "just make it" (or "mach einfach"), skip the first three stops: pick the best style yourself, write the script, and run straight to the end. Still check the look (stills) and the first seconds yourself, fix what you see, and still run the critic. Fast path: write `script.json`, then `CLI make <video> --size 1080p`, then look at `stills/` and `check/sheet-*.jpg`, fix and re-run `CLI finish`. Report the finished file and ask what they would change.

## Autopilot (a loop over many ideas)

For a queue of videos, keep a file such as `ideas.md` (template: `reel-loop/templates/ideas.md`), one idea per line: `- [ ] <idea> | <style or auto> | <lang> | <seconds>`.
Each run of `/reel-loop autopilot ideas.md`:
1. Take the first unchecked idea. If the style is `auto`, use `CLI styles match`.
2. Make it the "just make it" way, including your own look check and the critic.
3. Tick the line: `- [x] <idea> → videos/<slug>/out/<slug>.mp4`, and append a line to `videos/autopilot-log.md` (date, title, length, loudness, anything you could not fix).
4. Continue with the next idea until the queue is empty or the user's limit is reached.
To make one video on a schedule, the user can combine it with the loop command, for example `/loop 3h /reel-loop autopilot ideas.md`. You never post anything; the user posts, so their accounts stay in their hands.

## Good to know

- Re-running any command is safe; voice, render and mix reuse what has not changed.
- `CLI status <video>` shows which of the 12 steps are done.
- `CLI render <video> --scene s04` previews one scene with sound; `--from 10 --to 20` a range.
- Images you generate or the user gives can go into an `image` scene (`data.src` relative to the video folder).
- A `custom` scene accepts your own HTML/CSS/JS when no scene type fits (see `reference/scenes.md`); keep it deterministic.
- Results depend on the idea and the script. Never promise views.
