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
  assert.equal(config.vaultWriteMode, 'ask')
  assert.deepEqual(config.models, DEFAULTS.models)
})

test('gespeichert wird nur Geändertes, Standardwerte bleiben austauschbar', () => {
  const dir = tempDir()
  const { save } = loadConfig(dir)
  save({ scale: 0.75 })
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'))
  assert.deepEqual(written, { scale: 0.75 })
  save({ sound: false })
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')), { scale: 0.75, sound: false })
  const again = loadConfig(dir).config
  assert.equal(again.scale, 0.75)
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
