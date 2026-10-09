'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { VaultService } = require('../src/vault-service')
const { SessionStore } = require('../src/sessions')

function setup({ vaultPath = null, find = () => [] } = {}) {
  const config = { vaultPath, vaultWriteMode: 'ask' }
  const saved = []
  const store = new SessionStore()
  const service = new VaultService({ config, save: (p) => (Object.assign(config, p), saved.push(p)), store, find })
  return { config, saved, store, service }
}

const makeVault = (files) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'island-svc-'))
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true })
    fs.writeFileSync(path.join(root, rel), text)
  }
  return root
}

test('ohne gewählten Ordner nimmt der Dienst den Vault aus Obsidian', async () => {
  const root = makeVault({ 'a.md': 'a', 'Ordner/b.md': 'b' })
  const { service, store } = setup({ find: () => [{ name: 'Gehirn', path: root }] })
  await service.init()
  const snap = service.snapshot()
  assert.equal(snap.vault.count, 2)
  assert.deepEqual(snap.vaults, [{ name: 'Gehirn', path: root }])
  assert.deepEqual(store.modPoll({ session_id: 's' }).vault, { name: path.basename(fs.realpathSync(root)), writeMode: 'ask' })
  service.close()
})

test('ohne Vault: leerer Zustand, Mod erfährt null', async () => {
  const { service, store } = setup()
  await service.init()
  assert.equal(service.snapshot().vault, null)
  assert.equal(store.modPoll({ session_id: 's' }).vault, null)
  assert.equal(service.uriFor('a.md'), null)
})

test('Ordner wählen, Schreibmodus umschalten, Suche und Obsidian-Link', async () => {
  const root = makeVault({ 'Rezepte/Pasta.md': 'Nudeln' })
  const { service, store, saved } = setup()
  await service.init()
  assert.equal(await service.choose('/gibt/es/nicht'), false)
  assert.equal(await service.choose(root), true)
  service.setWriteMode('free')
  assert.deepEqual(saved, [{ vaultPath: root }, { vaultWriteMode: 'free' }])
  assert.equal(store.modPoll({ session_id: 's' }).vault.writeMode, 'free')
  const { results } = await service.search('nudeln')
  assert.deepEqual(results.map((r) => r.path), ['Rezepte/Pasta.md'])
  assert.match(service.uriFor('Rezepte/Pasta.md'), /^obsidian:\/\/open\?path=.*Pasta\.md$/)
  assert.equal(service.uriFor('../raus.md'), null)
  service.close()
})

test('Vault-Wechsel während des Einlesens: der zuletzt gewählte gewinnt', async () => {
  const big = {}
  for (let i = 0; i < 1500; i++) big[`Ordner${i % 30}/n${i}.md`] = 'x'
  const a = makeVault(big)
  const b = makeVault({ 'klein.md': 'k' })
  const { service, config, store } = setup({ find: () => [{ name: 'A', path: a }] })
  const starting = service.init()
  await service.choose(b)
  await starting
  assert.equal(service.current().root, fs.realpathSync(b))
  assert.equal(config.vaultPath, b)
  assert.equal(store.modPoll({ session_id: 's' }).vault.name, path.basename(fs.realpathSync(b)))
  service.close()
})

test('Wechsel leert die Vault-Aktivität', async () => {
  const a = makeVault({ 'a.md': 'a' })
  const b = makeVault({ 'b.md': 'b' })
  const { service, store } = setup()
  await service.choose(a)
  store.recordVaultActivity({ sessionId: 's', op: 'read', path: 'a.md' })
  assert.equal(service.snapshot().activity.length, 1)
  await service.choose(b)
  assert.equal(service.snapshot().activity.length, 0)
  service.close()
})
