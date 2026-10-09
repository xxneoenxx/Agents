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
  // Größe der Insel: 1 = 232×48 bzw. 720×436, 0.6 = 60 % davon.
  scale: 0.6,
  // Woher „Plugin aktivieren“ das Plugin holt (GitHub owner/repo#branch).
  pluginSource: 'xxneoenxx/Agents#claude/fervent-tesla-3kfm1o',
  // Obsidian: null = den in Obsidian zuletzt geöffneten Vault nehmen.
  vaultPath: null,
  vaultWidget: true,
  // 'ask': Schreiben fragt jedes Mal; 'free': Claude schreibt ohne Rückfrage.
  vaultWriteMode: 'ask',
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
  return {
    config,
    save(patch) {
      Object.assign(config, patch)
      Object.assign(stored, patch)
      try {
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(file, JSON.stringify(stored, null, 2))
      } catch {
        // Nicht speicherbar: die Einstellung gilt dann nur bis zum Neustart.
      }
    },
  }
}

module.exports = { loadConfig, DEFAULTS }
