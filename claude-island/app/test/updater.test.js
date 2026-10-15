'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { createUpdater, isNewer, feedVersion, FEED_URL } = require('../src/updater')

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
