---
name: stream-clipper
description: Turn a YouTube, Twitch or Kick stream (live or finished) or a local recording into finished vertical clips (1080×1920, 60 fps) with a hook heading, word-by-word captions, zoom on the reaction, no black bars, and a post caption with the streamer's credit. Finds the moments from screams, loudness, chat explosions and the transcript; you read the game screen from the frames. Use when the user pastes a stream/VOD link or file and wants clips, highlights, Shorts/Reels/TikToks from it, or says "clip this" or "/stream-clipper".
---

# Stream Clipper

Paste a stream, pick the moments, post the clips. The engine is in `reel-loop/`:

```
CLI = node reel-loop/bin/loop.js clip      (run from the repository root)
```

Talk to the user in their language. Only clip streamers who allow it (for example ones running clipping campaigns), follow their rules, and always credit them. The user posts; you never post.

## Flow (four steps, one decision: which moments)

**0 · Ready?** `node reel-loop/bin/loop.js doctor`. Links need `yt-dlp` (about 3 MB); install only after the user says yes. Local files need nothing extra.

**1 · Paste the stream.** Ask in one message only what you don't know: the link or file; a campaign brief if they clip for one; the layout (show `CLI layouts`); captions on or off; whether you should pick ("you pick") or they pick. If they paste a campaign brief, turn it into `clips/<dir>/campaign.json` once (see below) so every clip follows it.
`CLI fetch <url|file> [--range 1:00:00-3:30:00]` pulls only the audio, subtitles and chat replay — never the whole 10 hours. For a stream that is live right now, use live mode instead.

**2 · It finds the moments.** `CLI analyze clips/<dir>` scores every half second from loudness spikes, screams, chat explosions (`chat x9`), laugh floods and hype words in the transcript, and writes `candidates.md`. Then `CLI frames clips/<dir> --top 12` saves a three-picture strip per moment (`frames/<id>.jpg`: start · peak · end) and `picklist.md`.
Look at every strip yourself (Read tool). Read the game screen (WASTED, BUSTED, MISSION PASSED, kill feeds, scoreboards), the streamer's face, the words (`said`) and the chat sample. Decide for each: is it really a moment, which kind (list below), and write a heading. Drop the false alarms.

**3 · They pick.** Show a short pick list: id, time, one picture (the strip path), your heading, and the signals ("Scream + chat x9"). They tap the ones they want, or say "you pick" (then take the strongest 3-5). Write the chosen headings into `clips/<dir>/headings.json`:
```json
{ "c04": { "heading": "He was NOT ready for the alligator 🐊", "start": 5512.0, "end": 5546.5, "layout": "A", "focus": 0.5, "caption": "optional longer post text" } }
```
Adjust `start`/`end` (seconds) so the clip starts right before the action and ends on the reaction: hook first, no slow build-up; 15-45 s is the sweet spot.

**4 · Post.** `CLI cut clips/<dir> --pick c04,c07 --layout A --cam 0.72,0.04,0.26,0.30 [--heading box|outline] [--captions on|off]`
- Layouts: A streamer on top / game below, B whole stream on blurred fill, C game on top / streamer below, D full game + streamer card, E game only (`CLI layouts`).
- A, C, D need the facecam rectangle as fractions of the original frame `x,y,w,h`. Find it by looking at a strip, then verify on the first clip: `ffmpeg -ss 3 -i clips/<dir>/out/<file>.mp4 -frames:v 1 clips/<dir>/work/check.png` and look; adjust and re-cut if the face is cropped.
- `focus` (0-1) moves the 9:16 game crop left/right when the action is not centred.
Each clip comes out as `clips/<dir>/out/<id>-<heading>.mp4` (1080×1920, 60 fps, black bars removed, zoom on the peak, heading, word captions, -14 LUFS) plus `<id>-<heading>.txt` with the post caption, the streamer credit, hashtags and the ad label. Give the user the list of files.

## Campaign brief → campaign.json
```json
{ "streamer": "name", "platform": "Twitch", "credit": "🎥 @{streamer} on {platform}", "hashtags": ["gta6", "ad"],
  "adLabel": "#ad", "minSeconds": 15, "maxSeconds": 60, "layout": "A", "cam": "0.72,0.04,0.26,0.30",
  "headingStyle": "box", "captions": "on", "rules": ["no swearing in the heading", "must show the streamer's face"] }
```
Check every clip against `rules` before you hand it over; a clip that misses the tag, the length or the ad label earns nothing.

## Live mode (be first in the feed)
`CLI live <url> --every 12` starts a background recorder that saves the live stream in 12-minute pieces. Then check for new moments every 10-15 minutes: `CLI live-check clips/<dir>` analyses each finished piece and makes strips for new moments. Run it on a schedule with the loop command, e.g. `/loop 12m node reel-loop/bin/loop.js clip live-check clips/<dir>` and tell the user about new moments with your headings; cut the ones they want right away. Stop with `CLI live-stop clips/<dir>`.

## 25 kinds of viral moments
1 crash-out / rage · 2 epic fail · 3 clutch escape (5-star chase) · 4 WASTED/BUSTED moment · 5 funny NPC · 6 glitch / physics bug · 7 "the game has THIS?" feature · 8 jump scare / scream · 9 laugh flood · 10 plot twist / story reveal · 11 big win / heist done · 12 insane stunt or jump · 13 near miss · 14 rage quit · 15 roasting chat or reading chat · 16 wholesome moment · 17 IRL moment (pet, family, food) · 18 hot take · 19 collab banter · 20 skill shot / perfect timing · 21 prank / trolling · 22 chase highlight · 23 roleplay character bit · 24 reaction to news or a trailer · 25 unexpected music / dance.
The best moment is often one nobody says out loud: trust the face, the screen and the chat, not only the words.

## Headings
Max ~8 words, present tense, one emoji at the end, a little mystery, no spoiler of the punchline in the first word. Examples: "He was NOT ready for the alligator 🐊", "GTA 6 really has the Red Hulk 💀", "Bro tried to ignore it 😭". Write them in the clip audience's language.

Nobody can promise views. You find the moments with the strongest signs and make clean clips fast; the moment, the timing and their page do the rest.
