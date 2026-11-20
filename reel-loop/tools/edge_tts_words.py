"""Synthesize one line with the free Microsoft Edge voices and keep word timings.

usage: python edge_tts_words.py <voice> <rate e.g. +0%> <out.mp3> <out.json>   (text on stdin)
Writes {"words": [{"w": str, "s": seconds, "e": seconds}, ...]} to out.json.
"""
import asyncio
import json
import sys

import edge_tts


async def main() -> None:
    voice, rate, out_mp3, out_json = sys.argv[1:5]
    text = sys.stdin.read().strip()
    com = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words = []
    with open(out_mp3, "wb") as f:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                s = chunk["offset"] / 1e7
                words.append({"w": chunk["text"], "s": s, "e": s + chunk["duration"] / 1e7})
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({"words": words}, f)


if __name__ == "__main__":
    asyncio.run(main())
