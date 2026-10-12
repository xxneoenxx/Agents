'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { loadConfig, DEFAULTS } = require('../src/config')

const tempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'island-config-'))

test('ohne Datei gelten die Standardwerte', () => {
  const { config } = loadConfig(tempDir())
  assert.equal(config.scale, DEFAULTS.scale)
  assert.equal(config.scale, 0.9)
  assert.equal(config.figureMode, 'head')
  assert.deepEqual(config.models, DEFAULTS.models)
})

test('gespeichert wird nur Geändertes, Standardwerte bleiben austauschbar', () => {
  const dir = tempDir()
  const { save } = loadConfig(dir)
  save({ sound: false })
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'))
  assert.deepEqual(written, { sound: false })
  save({ scale: 0.75 })
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')), { sound: false, scale: 0.75 })
  const again = loadConfig(dir).config
  // Eine vor der Umstellung gespeicherte Größe wächst einmalig um 50 % (0.75 → 1).
  assert.equal(again.scale, 1)
  assert.equal(loadConfig(dir).config.scale, 1)
  assert.equal(again.pluginSource, DEFAULTS.pluginSource)
})

test('kaputte Datei und eigene Modell-IDs', () => {
  const dir = tempDir()
  fs.writeFileSync(path.join(dir, 'config.json'), '{kaputt')
  assert.equal(loadConfig(dir).config.port, 47821)
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ models: { opus: 'claude-opus-x' } }))
  const { config } = loadConfig(dir)
  assert.equal(config.models.opus, 'claude-opus-x')
  assert.equal(config.models.haiku, DEFAULTS.models.haiku)
})

test('gespeicherte Größe wächst einmalig um 50 %, danach nicht mehr', () => {
  const cases = [
    [0.5, 0.75],
    [0.6, 0.9],
    [0.75, 1],
    [1, 1],
  ]
  for (const [before, after] of cases) {
    const dir = tempDir()
    fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify({ scale: before, sound: false }))
    const first = loadConfig(dir)
    assert.equal(first.config.scale, after, `aus ${before}`)
    first.save({ scale: 0.6 })
    assert.equal(loadConfig(dir).config.scale, 0.6, 'eine neue Wahl bleibt, wie sie ist')
  }
  const fresh = tempDir()
  assert.equal(loadConfig(fresh).config.scale, 0.9)
  assert.equal(fs.existsSync(path.join(fresh, 'config.json')), false)
})
