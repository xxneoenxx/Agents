// Vorschau: bündelt einmal und rendert Einzelbilder (verkleinert) als Kontaktbogen.
// node preview.mjs <out.png> <compId>:<f1>,<f2>,... [<compId>:...]   (f = Frame oder "end")
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import path from 'node:path';

const [out, ...specs] = process.argv.slice(2);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({entryPoint: path.resolve('src/index.tsx')});
const tmp = path.join(path.dirname(out), 'preview-tmp');
mkdirSync(tmp, {recursive: true});
const rows = [];
for (const spec of specs) {
  const [id, frames] = spec.split(':');
  const composition = await selectComposition({serveUrl, id, browserExecutable});
  const files = [];
  for (const fr of frames.split(',')) {
    const frame = fr === 'end' ? composition.durationInFrames - 1 : Math.min(Number(fr), composition.durationInFrames - 1);
    const file = path.join(tmp, `${id}-${frame}.png`);
    await renderStill({composition, serveUrl, output: file, frame, scale: 0.34, browserExecutable});
    execFileSync('convert', [file, '-gravity', 'North', '-background', '#000', '-fill', '#ff0', '-pointsize', '16', '-annotate', '+0+2', `${id} f${frame}`, file]);
    files.push(file);
  }
  const row = path.join(tmp, `row-${id}.png`);
  execFileSync('convert', [...files, '+append', row]);
  rows.push(row);
}
execFileSync('convert', [...rows, '-background', '#222', '-append', out]);
console.log(out);
