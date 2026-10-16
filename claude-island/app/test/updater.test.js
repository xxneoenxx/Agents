'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { createUpdater, createIdleGate, isNewer, feedVersion, FEED_URL, IDLE_INSTALL_MS } = require('../src/updater')

const fakeApp = (version) => ({ getVersion: () => version })

test('Versionen vergleichen und aus latest.yml lesen', () => {
  assert.equal(isNewer('0.4.12', '0.3.0'), true)
  assert.equal(isNewer('0.4.12', '0.4.9'), true)
  assert.equal(isNewer('0.4.9', '0.4.12'), false)
  assert.equal(isNewer('0.4.12', '0.4.12'), false)
  assert.equal(isNewer('1.0.0', '0.99.99'), true)
  const yml = "version: 0.4.31\nfiles:\n  - url: Claude-Island-Setup.exe\n    sha512: abc\npath: Claude-Island-Setup.exe\nreleaseDate: '2026-10-15T12:00:00.000Z'\n"
  assert.equal(feedVersion(yml), '0.4.31')
  assert.equal(feedVersion("version: '0.5.1'\n"), '0.5.1')
  assert.equal(feedVersion('<html>Not Found</html>'), null)
})

test('Portable: meldet eine neue Version, prüft nur über latest.yml', async () => {
  const urls = []
  const changes = []
  const u = createUpdater({
    app: fakeApp('0.4.3'),
    mode: 'portable',
    onChange: (s) => changes.push(s.phase),
    fetchText: async (url) => {
      urls.push(url)
      return 'version: 0.4.7\npath: Claude-Island-Setup.exe\n'
    },
  })
  const result = await u.checkNow()
  assert.deepEqual(urls, [FEED_URL])
  assert.equal(result.phase, 'available')
  assert.equal(result.version, '0.4.7')
  assert.deepEqual(changes, ['checking', 'available'])
  assert.equal(u.install(), false, 'portable installiert nie selbst')
})

test('Portable: aktuell und Fehler', async () => {
  let reply = async () => 'version: 0.4.3\n'
  const u = createUpdater({ app: fakeApp('0.4.3'), mode: 'portable', onChange: () => {}, fetchText: (url) => reply(url) })
  assert.equal((await u.checkNow()).phase, 'current')
  reply = async () => {
    throw new Error('getaddrinfo ENOTFOUND github.com')
  }
  const failed = await u.checkNow()
  assert.equal(failed.phase, 'error')
  assert.match(failed.error, /ENOTFOUND/)
})

test('Aus dem Quellcode: keine Prüfung, kein Netz', async () => {
  const u = createUpdater({
    app: fakeApp('0.4.0'),
    mode: 'dev',
    onChange: () => assert.fail('kein Zustandswechsel'),
    fetchText: async () => assert.fail('kein Netz'),
  })
  u.start()
  assert.equal((await u.checkNow()).phase, 'idle')
  assert.equal(u.install(), false)
})

test('Portable: offline beim nächsten Prüfen behält die gefundene Version', async () => {
  let reply = async () => 'version: 0.4.9\n'
  const u = createUpdater({ app: fakeApp('0.4.3'), mode: 'portable', onChange: () => {}, fetchText: (url) => reply(url) })
  assert.equal((await u.checkNow()).phase, 'available')
  reply = async () => {
    throw new Error('offline')
  }
  const again = await u.checkNow()
  assert.equal(again.phase, 'available')
  assert.equal(again.version, '0.4.9')
  assert.equal(u.state.error, 'offline')
})

test('Update installiert sich nur nach einer Weile ohne Sitzung und bei zugeklapptem Panel', () => {
  let t = 0
  const gate = createIdleGate({ now: () => t })
  const step = (ms, state) => {
    t += ms
    return gate(state)
  }
  // Sitzungen offen: nie
  assert.equal(step(1000, { sessions: 1, expanded: false, ready: true }), false)
  // /clear: die Liste ist eine Sekunde leer, dann meldet sich die neue Sitzung
  assert.equal(step(1000, { sessions: 0, expanded: false, ready: true }), false)
  assert.equal(step(1000, { sessions: 1, expanded: false, ready: true }), false)
  // Aufwachen aus dem Standby: erst leer (verstummte Sitzungen entfernt), dann pollt der Mod wieder
  assert.equal(step(3 * 60 * 60 * 1000, { sessions: 0, expanded: false, ready: true }), false)
  assert.equal(step(1000, { sessions: 2, expanded: false, ready: true }), false)
  // Claude-App geschlossen: nach der Wartezeit ja, aber nicht bei offenem Panel
  assert.equal(step(1000, { sessions: 0, expanded: false, ready: true }), false)
  assert.equal(step(IDLE_INSTALL_MS - 2000, { sessions: 0, expanded: false, ready: true }), false)
  assert.equal(step(2000, { sessions: 0, expanded: true, ready: true }), false)
  // Panel zugeklappt: jetzt
  assert.equal(step(1000, { sessions: 0, expanded: false, ready: true }), true)
  // Ohne fertiges Update nie
  assert.equal(createIdleGate({ now: () => t })({ sessions: 0, expanded: false, ready: false }), false)
})

test('Nach dem Start ohne Sitzung: Wartezeit zählt ab dem Start', () => {
  let t = 1000
  const gate = createIdleGate({ now: () => t })
  t += IDLE_INSTALL_MS - 1
  assert.equal(gate({ sessions: 0, expanded: false, ready: true }), false)
  t += 1
  assert.equal(gate({ sessions: 0, expanded: false, ready: true }), true)
})
