'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { parsePluginList, checkPlugin, activatePlugin } = require('../src/plugin')

const listed = (enabled) =>
  JSON.stringify([
    { id: 'other@x', enabled: true },
    { id: 'island-bridge@neo-agents', version: '0.1.0', scope: 'user', enabled },
  ])

// Eine claude-CLI zum Mitschreiben: antwortet je Befehl aus `script`.
function fakeClaude(script) {
  const calls = []
  const run = async (args) => {
    calls.push(args.join(' '))
    const answer = script(args.join(' '), calls.length)
    return { code: 0, out: '', err: '', missing: false, ...answer }
  }
  return { run, calls }
}

test('Plugin-Liste lesen', () => {
  assert.deepEqual(parsePluginList(listed(true)), { state: 'active', id: 'island-bridge@neo-agents' })
  assert.deepEqual(parsePluginList(listed(false)), { state: 'disabled', id: 'island-bridge@neo-agents' })
  assert.deepEqual(parsePluginList('[]'), { state: 'missing', id: null })
  assert.deepEqual(parsePluginList('kaputt'), { state: 'unknown', id: null })
})

test('ohne claude-CLI meldet die Prüfung no-cli', async () => {
  const { run } = fakeClaude(() => ({ code: 1, missing: true }))
  assert.deepEqual(await checkPlugin(run), { state: 'no-cli', id: null })
  assert.deepEqual(await activatePlugin('a/b', run), { ok: false, state: { state: 'no-cli', id: null }, reason: 'no-cli' })
})

test('fehlendes Plugin wird mit Marketplace installiert', async () => {
  let installed = false
  const { run, calls } = fakeClaude((cmd) => {
    if (cmd.startsWith('plugin install')) installed = true
    return cmd === 'plugin list --json' ? { out: installed ? listed(true) : '[]' } : {}
  })
  const result = await activatePlugin('xxneoenxx/Agents#zweig', run)
  assert.equal(result.ok, true)
  assert.equal(result.changed, true)
  assert.deepEqual(calls, [
    'plugin list --json',
    'plugin install island-bridge --marketplace xxneoenxx/Agents#zweig --json',
    'plugin list --json',
  ])
})

test('abgeschaltetes Plugin wird eingeschaltet, aktives bleibt', async () => {
  let enabled = false
  const { run, calls } = fakeClaude((cmd) => {
    if (cmd.startsWith('plugin enable')) enabled = true
    return cmd === 'plugin list --json' ? { out: listed(enabled) } : {}
  })
  assert.equal((await activatePlugin('a/b', run)).ok, true)
  assert.equal(calls[1], 'plugin enable island-bridge@neo-agents')
  const again = await activatePlugin('a/b', run)
  assert.deepEqual([again.ok, again.changed], [true, false])
})

test('ein Fehlschlag bringt die letzten Zeilen der Ausgabe mit', async () => {
  const { run } = fakeClaude((cmd) =>
    cmd === 'plugin list --json' ? { out: '[]' } : { code: 1, err: 'Zeile 1\nMarketplace nicht erreichbar' },
  )
  const result = await activatePlugin('a/b', run)
  assert.equal(result.ok, false)
  assert.equal(result.reason, 'failed')
  assert.match(result.detail, /Marketplace nicht erreichbar/)
})
