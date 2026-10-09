'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { Vault, findVaults, obsidianConfigPath, obsidianUri } = require('../src/vault')

function makeVault(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'island-vault-'))
  for (const [rel, text] of Object.entries(files)) {
    const abs = path.join(root, rel)
    fs.mkdirSync(path.dirname(abs), { recursive: true })
    fs.writeFileSync(abs, text)
  }
  return root
}

const touch = (root, rel, secondsAgo) => {
  const t = new Date(Date.now() - secondsAgo * 1000)
  fs.utimesSync(path.join(root, rel), t, t)
}

test('Obsidians Vault-Liste lesen: offener zuerst, dann zuletzt benutzt', () => {
  const where = { platform: 'win32', env: { APPDATA: 'C:\\Users\\neo\\AppData\\Roaming' } }
  assert.equal(obsidianConfigPath(where), 'C:\\Users\\neo\\AppData\\Roaming\\obsidian\\obsidian.json')
  const json = JSON.stringify({
    vaults: {
      a: { path: 'C:\\Users\\neo\\Alt', ts: 300 },
      b: { path: 'C:\\Users\\neo\\Zweites Gehirn', ts: 100, open: true },
      c: { path: 'C:\\weg', ts: 999 },
    },
  })
  const vaults = findVaults({ ...where, readFile: () => json, isDir: (p) => p !== 'C:\\weg' })
  assert.deepEqual(vaults.map((v) => [v.name, v.open]), [
    ['Zweites Gehirn', true],
    ['Alt', false],
  ])
  assert.deepEqual(findVaults({ ...where, readFile: () => '{kaputt' }), [])
  assert.equal(obsidianConfigPath({ platform: 'linux', env: {}, home: '/home/neo' }), '/home/neo/.config/obsidian/obsidian.json')
})

test('Index: Markdown-Notizen, versteckte Ordner bleiben draußen', async () => {
  const root = makeVault({
    'Start.md': '# Start',
    'Projekte/Insel.md': 'Die Insel zeigt Sitzungen.',
    'Projekte/Ideen/Funke.md': 'Funke schläft.',
    '.obsidian/workspace.md': 'intern',
    '.trash/alt.md': 'weg',
    'Bilder/foto.png': 'png',
  })
  const vault = new Vault(root)
  assert.equal(await vault.scan(), 3)
  assert.deepEqual([...vault.notes.keys()].sort(), ['Projekte/Ideen/Funke.md', 'Projekte/Insel.md', 'Start.md'])
  const top = vault.list('')
  assert.deepEqual(top.folders, ['Projekte'])
  assert.deepEqual(top.notes.map((n) => n.name), ['Start'])
  assert.deepEqual(vault.list('Projekte').folders, ['Ideen'])
  assert.throws(() => vault.list('Gibtsnicht'), /gibt es nicht/)
})

test('recent sortiert nach Änderung', async () => {
  const root = makeVault({ 'a.md': 'a', 'b.md': 'b', 'c.md': 'c' })
  touch(root, 'a.md', 300)
  touch(root, 'b.md', 10)
  touch(root, 'c.md', 100)
  const vault = new Vault(root)
  await vault.scan()
  assert.deepEqual(vault.recent(2).map((n) => n.name), ['b', 'c'])
})

test('Suche: erst Name, dann Inhalt mit Ausschnitt', async () => {
  const root = makeVault({
    'Rezepte/Pasta.md': 'Nudeln mit Tomaten',
    'Tagebuch/2026-10-09.md': 'Heute habe ich Pasta gekocht und an der Insel gebaut.',
    'Sonstiges.md': 'nichts',
  })
  const vault = new Vault(root)
  await vault.scan()
  const { results } = await vault.search('pasta')
  assert.deepEqual(results.map((r) => [r.path, r.match]), [
    ['Rezepte/Pasta.md', 'name'],
    ['Tagebuch/2026-10-09.md', 'content'],
  ])
  assert.match(results[1].snippet, /Pasta gekocht/)
  assert.deepEqual((await vault.search('pasta insel')).results.map((r) => r.path), ['Tagebuch/2026-10-09.md'])
  assert.deepEqual((await vault.search('   ')).results, [])
})

test('Lesen und Schreiben in allen Modi', async () => {
  const root = makeVault({ 'Ideen.md': 'Erste Idee' })
  const vault = new Vault(root)
  await vault.scan()
  assert.equal((await vault.read('Ideen.md')).content, 'Erste Idee')
  assert.equal((await vault.read('./Ideen.md')).path, 'Ideen.md')

  await assert.rejects(vault.write('Ideen.md', 'x', 'create'), /gibt es schon/)
  assert.deepEqual(await vault.write('Ideen', 'Zweite Idee', 'append'), { path: 'Ideen.md', created: false, bytes: 22 })
  assert.equal(fs.readFileSync(path.join(root, 'Ideen.md'), 'utf8'), 'Erste Idee\nZweite Idee')
  await vault.write('Ideen.md', 'Neu', 'replace')
  assert.equal(fs.readFileSync(path.join(root, 'Ideen.md'), 'utf8'), 'Neu')

  const created = await vault.write('Projekte/2026/Plan', '# Plan', 'create')
  assert.deepEqual(created, { path: 'Projekte/2026/Plan.md', created: true, bytes: 6 })
  assert.ok(vault.notes.has('Projekte/2026/Plan.md'))
  await assert.rejects(vault.read('Fehlt.md'), /gibt es nicht/)
  await assert.rejects(vault.write('Bild.png', 'x'), /Nur Markdown/)
  await assert.rejects(vault.write('a.md', 'x', 'löschen'), /mode/)
})

test('Pfad-Schutz: nichts außerhalb des Vaults und nichts Verstecktes', async () => {
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'island-outside-'))
  fs.writeFileSync(path.join(outside, 'geheim.md'), 'geheim')
  const root = makeVault({ 'ok.md': 'ok' })
  fs.symlinkSync(outside, path.join(root, 'Link'), 'dir')
  const vault = new Vault(root)
  await vault.scan()
  for (const bad of ['../geheim.md', 'a/../../geheim.md', '/etc/passwd', 'C:\\Windows\\win.ini', '.obsidian/app.json', 'a\0b.md', '']) {
    await assert.rejects(vault.read(bad), (err) => err.code === 'bad-path', `nicht abgewiesen: ${JSON.stringify(bad)}`)
  }
  await assert.rejects(vault.read('Link/geheim.md'), /aus dem Vault hinaus/)
  await assert.rejects(vault.write('Link/neu.md', 'x'), /aus dem Vault hinaus/)
  assert.equal(fs.existsSync(path.join(outside, 'neu.md')), false)
  await assert.rejects(vault.write('..\\raus.md', 'x'), (err) => err.code === 'bad-path')
})

test('Änderungen auf der Platte kommen im Index an', async () => {
  const root = makeVault({ 'a.md': 'a' })
  const vault = new Vault(root)
  await vault.scan()
  vault.watch()
  const changed = new Promise((resolve) => vault.once('change', resolve))
  fs.writeFileSync(path.join(root, 'neu.md'), 'neu')
  await Promise.race([changed, new Promise((_, reject) => setTimeout(() => reject(new Error('kein change')), 3000))])
  await new Promise((r) => setTimeout(r, 50))
  assert.ok(vault.notes.has('neu.md'))
  vault.close()
})

test('Obsidian-Link', () => {
  assert.equal(obsidianUri('C:\\Vault\\Ideen.md'), 'obsidian://open?path=C%3A%5CVault%5CIdeen.md')
})
