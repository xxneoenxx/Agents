'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  parsePluginList,
  checkPlugin,
  activatePlugin,
  updatePlugin,
  olderThan,
  resolveClaude,
  commandFor,
} = require('../src/plugin')

const entry = (id, enabled, version = '0.2.0') => ({ id, version, scope: 'user', enabled })
const listed = (...entries) => JSON.stringify([{ id: 'other@x', enabled: true }, ...entries])
const MARKETS = JSON.stringify([{ name: 'neo-agents', source: 'github', repo: 'xxneoenxx/Agents' }])

// Eine claude-CLI zum Mitschreiben: antwortet je Befehl aus `script`.
function fakeClaude(script) {
  const calls = []
  const run = async (args) => {
    calls.push(args.join(' '))
    const answer = script(args.join(' '), calls.length)
    return { code: 0, out: '', err: '', missing: false, timedOut: false, ...answer }
  }
  return { run, calls }
}

test('Plugin-Liste lesen', () => {
  assert.deepEqual(parsePluginList(listed(entry('island-bridge@neo-agents', true))), {
    state: 'active',
    id: 'island-bridge@neo-agents',
    version: '0.2.0',
  })
  assert.equal(parsePluginList(listed(entry('island-bridge@neo-agents', false))).state, 'disabled')
  assert.equal(parsePluginList('[]').state, 'missing')
  assert.equal(parsePluginList('kaputt').state, 'unknown')
})

test('ein aktiver Eintrag zählt, auch wenn ein abgeschalteter davor steht', () => {
  const text = listed(entry('island-bridge@aaa-dev', false), entry('island-bridge@neo-agents', true))
  assert.deepEqual(parsePluginList(text), { state: 'active', id: 'island-bridge@neo-agents', version: '0.2.0' })
  const off = listed(entry('island-bridge@aaa-dev', false), entry('island-bridge@neo-agents', false))
  assert.equal(parsePluginList(off).id, 'island-bridge@neo-agents')
})

test('Versionen vergleichen', () => {
  assert.equal(olderThan('0.1.0', '0.2.0'), true)
  assert.equal(olderThan('0.2.0', '0.2.0'), false)
  assert.equal(olderThan('0.10.0', '0.2.0'), false)
  assert.equal(olderThan(null), false)
})

test('ohne claude-CLI meldet die Prüfung no-cli', async () => {
  const { run } = fakeClaude(() => ({ code: 1, missing: true }))
  assert.equal((await checkPlugin(run)).state, 'no-cli')
  const result = await activatePlugin('a/b', run)
  assert.deepEqual([result.ok, result.reason], [false, 'no-cli'])
})

test('fehlendes Plugin ohne Marketplace: Installation mit --marketplace', async () => {
  let installed = false
  const { run, calls } = fakeClaude((cmd) => {
    if (cmd.startsWith('plugin install')) installed = true
    if (cmd === 'plugin marketplace list --json') return { out: '[]' }
    return cmd === 'plugin list --json' ? { out: installed ? listed(entry('island-bridge@neo-agents', true)) : '[]' } : {}
  })
  const result = await activatePlugin('xxneoenxx/Agents#zweig', run)
  assert.deepEqual([result.ok, result.changed], [true, true])
  assert.deepEqual(calls, [
    'plugin list --json',
    'plugin marketplace list --json',
    'plugin install island-bridge --marketplace xxneoenxx/Agents#zweig --json',
    'plugin list --json',
  ])
})

test('vorhandener Marketplace wird aktualisiert statt neu hinzugefügt', async () => {
  let installed = false
  const { run, calls } = fakeClaude((cmd) => {
    if (cmd.startsWith('plugin install')) installed = true
    if (cmd === 'plugin marketplace list --json') return { out: MARKETS }
    return cmd === 'plugin list --json' ? { out: installed ? listed(entry('island-bridge@neo-agents', true)) : '[]' } : {}
  })
  assert.equal((await activatePlugin('egal', run)).ok, true)
  assert.deepEqual(calls.slice(2, 4), ['plugin marketplace update neo-agents', 'plugin install island-bridge@neo-agents --json'])
})

test('abgeschaltetes Plugin wird eingeschaltet, aktives bleibt', async () => {
  let enabled = false
  const { run, calls } = fakeClaude((cmd) => {
    if (cmd.startsWith('plugin enable')) enabled = true
    return cmd === 'plugin list --json' ? { out: listed(entry('island-bridge@neo-agents', enabled)) } : {}
  })
  assert.equal((await activatePlugin('a/b', run)).ok, true)
  assert.equal(calls[1], 'plugin enable island-bridge@neo-agents')
  const again = await activatePlugin('a/b', run)
  assert.deepEqual([again.ok, again.changed], [true, false])
})

test('Fehlschlag und Zeitüberschreitung bringen den Grund mit', async () => {
  const failing = fakeClaude((cmd) =>
    cmd === 'plugin list --json' ? { out: '[]' } : cmd.includes('marketplace list') ? { out: '[]' } : { code: 1, err: 'Zeile 1\nMarketplace nicht erreichbar' },
  )
  const result = await activatePlugin('a/b', failing.run)
  assert.deepEqual([result.ok, result.reason], [false, 'failed'])
  assert.match(result.detail, /Marketplace nicht erreichbar/)

  const hanging = fakeClaude((cmd) =>
    cmd === 'plugin list --json' ? { out: '[]' } : cmd.includes('marketplace list') ? { out: '[]' } : { code: -1, timedOut: true },
  )
  assert.equal((await activatePlugin('a/b', hanging.run)).reason, 'timeout')
})

test('veraltetes Plugin wird erkannt und aktualisiert', async () => {
  let version = '0.1.0'
  const { run, calls } = fakeClaude((cmd) => {
    if (cmd.startsWith('plugin update')) version = '0.2.0'
    return cmd === 'plugin list --json' ? { out: listed(entry('island-bridge@neo-agents', true, version)) } : {}
  })
  assert.equal((await checkPlugin(run)).outdated, true)
  const result = await updatePlugin(run)
  assert.equal(result.ok, true)
  assert.deepEqual(calls.slice(1, 3), ['plugin marketplace update neo-agents', 'plugin update island-bridge@neo-agents --json'])
})

test('CLI wird an bekannten Orten gefunden, bevor PATH gilt', () => {
  const env = { USERPROFILE: 'C:\\Users\\neo', APPDATA: 'C:\\Users\\neo\\AppData\\Roaming' }
  const has = (file) => (f) => f === file
  assert.equal(resolveClaude({ env, platform: 'win32', exists: has('C:\\Users\\neo\\.local\\bin\\claude.exe') }), 'C:\\Users\\neo\\.local\\bin\\claude.exe')
  assert.equal(resolveClaude({ env, platform: 'win32', exists: has('C:\\Users\\neo\\AppData\\Roaming\\npm\\claude.cmd') }), 'C:\\Users\\neo\\AppData\\Roaming\\npm\\claude.cmd')
  assert.equal(resolveClaude({ env, platform: 'win32', exists: () => false }), 'claude')
})

test('.cmd läuft über cmd.exe mit gequoteten Argumenten, .exe direkt', () => {
  const exe = commandFor('C:\\x\\claude.exe', ['plugin', 'list'], { platform: 'win32' })
  assert.deepEqual(exe, { file: 'C:\\x\\claude.exe', argv: ['plugin', 'list'], verbatim: false })
  const cmd = commandFor('C:\\Program Files\\npm\\claude.cmd', ['plugin', 'install', 'C:\\Users\\Max Mustermann\\Agents'], {
    platform: 'win32',
    comspec: 'C:\\Windows\\system32\\cmd.exe',
  })
  assert.equal(cmd.file, 'C:\\Windows\\system32\\cmd.exe')
  assert.deepEqual(cmd.argv.slice(0, 3), ['/d', '/s', '/c'])
  assert.equal(cmd.argv[3], '""C:\\Program Files\\npm\\claude.cmd" "plugin" "install" "C:\\Users\\Max Mustermann\\Agents""')
  assert.throws(() => commandFor('a.cmd', ['%PATH%'], { platform: 'win32' }), /unsicher/)
})

test('runClaude löst nach Zeitüberschreitung auf und beendet den Prozess', { skip: process.platform === 'win32' }, async () => {
  const fs = require('node:fs')
  const os = require('node:os')
  const path = require('node:path')
  const { runClaude } = require('../src/plugin')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'island-cli-'))
  const bin = path.join(home, '.local', 'bin')
  fs.mkdirSync(bin, { recursive: true })
  fs.writeFileSync(path.join(bin, 'claude'), '#!/bin/sh\nif [ "$1" = "hang" ]; then sleep 30; fi\necho "[]"\n', { mode: 0o755 })
  const saved = process.env.HOME
  process.env.HOME = home
  try {
    const ok = await runClaude(['plugin', 'list'])
    assert.deepEqual([ok.code, ok.out.trim(), ok.timedOut], [0, '[]', false])
    const started = Date.now()
    const hung = await runClaude(['hang'], { timeoutMs: 300 })
    assert.equal(hung.timedOut, true)
    assert.ok(Date.now() - started < 3000)
  } finally {
    process.env.HOME = saved
    fs.rmSync(home, { recursive: true, force: true })
  }
})
