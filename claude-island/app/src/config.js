'use strict'

// Einstellungen in <userData>/config.json. Fehlende Werte kommen aus DEFAULTS,
// eine kaputte Datei wird ignoriert statt die App am Start zu hindern.
// Gespeichert wird nur, was in der Datei stand oder geändert wurde, damit eine
// neue Version ihre Standardwerte (etwa pluginSource) noch ändern kann.

const fs = require('node:fs')
const path = require('node:path')

// Der Port steht fest in plugin/hooks/hooks.json und im Mod; bei Änderung dort mitziehen.
const DEFAULTS = {
  port: 47821,
  models: {
    opus: 'claude-opus-5-5',
    sonnet: 'claude-sonnet-5-5',
    haiku: 'claude-haiku-5-5',
  },
  sound: true,
  pinned: false,
  // Größe der Insel: 1 = 232×48 bzw. 720×436, 0.9 = 90 % davon.
  scale: 0.9,
  // Woher „Plugin aktivieren“ das Plugin holt (GitHub owner/repo#branch).
  pluginSource: 'xxneoenxx/Agents#claude/fervent-tesla-3kfm1o',
  // Mini-Claude in der Pille: 'head' = nur der Kopf (die ganze Figur wächst
  // beim Aufklappen heraus), 'full' = überall die ganze Figur.
  figureMode: 'head',
  // Aufgeklapptes Panel höher (mehr Platz zum Lesen), höchstens so hoch wie der Bildschirm.
  tall: false,
}

// Einmalige Umstellung: Die Insel wurde 50 % größer (Standard 60 % → 90 %).
// Wer eine Größe gespeichert hat, bekommt sie ebenfalls 1,5-fach, höchstens 100 %.
const SIZE_VERSION = 2
const SIZES = [0.5, 0.6, 0.75, 0.9, 1]
const nearestSize = (value) => SIZES.reduce((best, s) => (Math.abs(s - value) < Math.abs(best - value) ? s : best), SIZES[0])

function migrate(stored) {
  if (stored.sizeVersion === SIZE_VERSION) return null
  if (typeof stored.scale !== 'number') return { sizeVersion: SIZE_VERSION }
  return { scale: nearestSize(Math.min(1, stored.scale * 1.5)), sizeVersion: SIZE_VERSION }
}

function loadConfig(dir) {
  const file = path.join(dir, 'config.json')
  let stored = {}
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = parsed
  } catch {
    stored = {}
  }
  const config = {
    ...DEFAULTS,
    ...stored,
    models: { ...DEFAULTS.models, ...(stored.models && typeof stored.models === 'object' ? stored.models : {}) },
  }
  const save = (patch) => {
    Object.assign(config, patch)
    Object.assign(stored, patch)
    try {
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(file, JSON.stringify(stored, null, 2))
    } catch {
      // Nicht speicherbar: die Einstellung gilt dann nur bis zum Neustart.
    }
  }
  const upgrade = migrate(stored)
  // Nur eine gespeicherte Größe muss sofort umgeschrieben werden. Sonst merkt
  // sich `stored` die Umstellung, damit das nächste Speichern sie mitschreibt
  // und eine danach gewählte Größe beim Neustart nicht noch einmal wächst.
  if (upgrade && 'scale' in upgrade) save(upgrade)
  else if (upgrade) Object.assign(stored, upgrade)
  return { config, save }
}

module.exports = { loadConfig, DEFAULTS, SIZES, nearestSize }
