'use strict'

// Welcher Vault verbunden ist, in welchem Schreibmodus, und was das Widget
// davon zeigt. Ohne Electron, damit es testbar bleibt; main.js verdrahtet es.

const fs = require('node:fs')
const { EventEmitter } = require('node:events')
const { Vault, findVaults, obsidianUri } = require('./vault')

const isDir = (p) => {
  try {
    return typeof p === 'string' && fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

class VaultService extends EventEmitter {
  constructor({ config, save, store, find = findVaults }) {
    super()
    this.config = config
    this.save = save
    this.store = store
    this.find = find
    this.vault = null
    this.error = null
    this.openSeq = 0
    this.pending = null
    // Obsidians Vault-Liste; wird beim Start und beim Öffnen des Menüs gelesen,
    // nicht bei jeder Änderung (ein getrenntes Netzlaufwerk darin kann hängen).
    this.known = []
    this.store.on('vault-activity', () => this.emit('change'))
  }

  refreshKnown() {
    this.known = this.find()
    return this.known
  }

  get writeMode() {
    return this.config.vaultWriteMode === 'free' ? 'free' : 'ask'
  }

  // Gewählter Ordner, sonst der in Obsidian offene bzw. zuletzt benutzte Vault.
  async init() {
    this.refreshKnown()
    const chosen = isDir(this.config.vaultPath) ? this.config.vaultPath : this.known[0]?.path
    if (chosen) await this.open(chosen)
    else this.publish()
  }

  // Der bisherige Vault bleibt erreichbar, bis der neue eingelesen ist; wird
  // währenddessen ein dritter gewählt, gewinnt der zuletzt gewählte.
  async open(dir) {
    const seq = ++this.openSeq
    this.pending?.close()
    let vault = null
    try {
      vault = new Vault(dir)
      this.pending = vault
      await vault.scan()
      if (seq !== this.openSeq) {
        vault.close()
        return
      }
      vault.watch()
      vault.on('change', () => this.emit('change'))
      const switched = this.vault?.root !== vault.root
      this.vault?.close()
      this.vault = vault
      this.error = null
      // Die Aktivität gehört zum alten Vault; ihre Pfade passen hier nicht.
      if (switched) this.store.vaultActivity.length = 0
    } catch (err) {
      vault?.close()
      if (seq !== this.openSeq) return
      this.vault?.close()
      this.vault = null
      this.error = `Vault nicht lesbar: ${err.code || err.message}`
    } finally {
      if (this.pending === vault) this.pending = null
    }
    this.publish()
  }

  async choose(dir) {
    if (!isDir(dir)) return false
    this.save({ vaultPath: dir })
    await this.open(dir)
    return true
  }

  setWriteMode(mode) {
    this.save({ vaultWriteMode: mode === 'free' ? 'free' : 'ask' })
    this.publish()
  }

  // Der Mod erfährt Name und Modus über /mod/poll; das Widget über `change`.
  publish() {
    this.store.setVaultInfo(this.vault ? { name: this.vault.name, writeMode: this.writeMode } : null)
    this.emit('change')
  }

  current() {
    return this.vault
  }

  async search(query) {
    if (!this.vault || !String(query || '').trim()) return { results: [], partial: false }
    const found = await this.vault.search(query, 12)
    return { partial: found.partial, results: found.results.map(noteView) }
  }

  // Den Obsidian-Link einer Notiz, oder null für einen unzulässigen Pfad.
  uriFor(rel) {
    if (!this.vault) return null
    try {
      return obsidianUri(this.vault.absolute(rel))
    } catch {
      return null
    }
  }

  snapshot() {
    const vault = this.vault
    return {
      vault: vault ? { name: vault.name, path: vault.root, count: vault.count, truncated: vault.truncated } : null,
      error: this.error,
      vaults: this.known.map(({ name, path }) => ({ name, path })),
      writeMode: this.writeMode,
      recent: vault ? vault.recent(8).map(noteView) : [],
      activity: this.store.vaultActivity.slice(0, 4),
    }
  }

  close() {
    ++this.openSeq
    this.pending?.close()
    this.vault?.close()
  }
}

const noteView = (n) => ({ path: n.path, name: n.name, folder: n.folder, mtimeMs: n.mtimeMs, snippet: n.snippet || '' })

module.exports = { VaultService }
