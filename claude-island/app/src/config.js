'use strict'

// Einstellungen in <userData>/config.json. Fehlende Werte kommen aus DEFAULTS,
// eine kaputte Datei wird ignoriert statt die App am Start zu hindern.

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
}

function loadConfig(dir) {
  const file = path.join(dir, 'config.json')
  let stored = {}
  try {
    stored = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    stored = {}
  }
  const config = {
    ...DEFAULTS,
    ...stored,
    models: { ...DEFAULTS.models, ...(stored && typeof stored.models === 'object' ? stored.models : {}) },
  }
  return {
    config,
    save(patch) {
      Object.assign(config, patch)
      try {
        fs.mkdirSync(dir, { recursive: true })
        fs.writeFileSync(file, JSON.stringify(config, null, 2))
      } catch {
        // Nicht speicherbar: die Einstellung gilt dann nur bis zum Neustart.
      }
    },
  }
}

module.exports = { loadConfig, DEFAULTS }
