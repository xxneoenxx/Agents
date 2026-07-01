#!/usr/bin/env node
/**
 * Erstellt den statischen Export für die GitHub-Pages-Vorschau (Ordner `out/`).
 *
 * `output: "export"` unterstützt keine Server-Route-Handler und keine dynamische
 * OpenGraph-Bild-Route. Diese werden für den Export-Build temporär beiseitegeschoben
 * und danach wieder zurückgestellt (auch bei Fehlern).
 *
 * Aufruf: node scripts/build-static.mjs   (siehe npm-Script "build:static")
 */
import { execSync } from "node:child_process";
import { existsSync, renameSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

const TMP = ".static-build-stash";
const MOVES = [
  { from: "src/app/api", to: `${TMP}/api` },
  { from: "src/app/opengraph-image.tsx", to: `${TMP}/opengraph-image.tsx` },
];

function stash() {
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  for (const m of MOVES) {
    if (existsSync(m.from)) {
      mkdirSync(dirname(m.to), { recursive: true });
      renameSync(m.from, m.to);
      console.log(`• beiseitegeschoben: ${m.from}`);
    }
  }
}

function restore() {
  for (const m of MOVES) {
    if (existsSync(m.to)) {
      mkdirSync(dirname(m.from), { recursive: true });
      renameSync(m.to, m.from);
      console.log(`• zurückgestellt:   ${m.from}`);
    }
  }
  rmSync(TMP, { recursive: true, force: true });
}

stash();
try {
  rmSync(".next", { recursive: true, force: true });
  rmSync("out", { recursive: true, force: true });
  execSync("next build", {
    stdio: "inherit",
    env: {
      ...process.env,
      STATIC_EXPORT: "1",
      NEXT_PUBLIC_STATIC_PREVIEW: "1",
    },
  });
  console.log("\n✓ Statischer Export erstellt in ./out");
} finally {
  restore();
}
