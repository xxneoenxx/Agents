'use strict'

// Der Obsidian-Vault auf der Platte: finden, indizieren, suchen, lesen,
// schreiben und beobachten. Reines Node, ohne Electron, damit es testbar ist.
//
// Jeder Pfad von außen (Claude, Widget) ist relativ zum Vault und wird hart
// geprüft: kein `..`, kein absoluter Pfad, keine Punkt-Ordner wie .obsidian,
// und der aufgelöste echte Pfad muss im Vault liegen (auch über Symlinks).

const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { EventEmitter } = require('node:events')

const MAX_NOTES = 50_000
const MAX_READ = 1024 * 1024
const MAX_PATH = 400
const SEARCH_BUDGET_MS = 1500
const SKIP_DIRS = new Set(['node_modules'])
const WRITE_MODES = new Set(['create', 'replace', 'append'])

class VaultError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const baseName = (p) => String(p).split(/[\\/]+/).filter(Boolean).pop() || String(p)

// Wo Obsidian sich seine Vaults merkt.
function obsidianConfigPath({ platform = process.platform, env = process.env, home = os.homedir() } = {}) {
  if (platform === 'win32') return env.APPDATA ? path.win32.join(env.APPDATA, 'obsidian', 'obsidian.json') : null
  if (platform === 'darwin') return path.posix.join(home, 'Library', 'Application Support', 'obsidian', 'obsidian.json')
  return path.posix.join(env.XDG_CONFIG_HOME || path.posix.join(home, '.config'), 'obsidian', 'obsidian.json')
}

const isDirectory = (p) => {
  try {
    return fs.statSync(p).isDirectory()
  } catch {
    return false
  }
}

// Die Vaults aus Obsidians eigener Liste: der offene zuerst, dann der zuletzt benutzte.
function findVaults({ readFile = fs.readFileSync, isDir = isDirectory, ...where } = {}) {
  const file = obsidianConfigPath(where)
  if (!file) return []
  let data
  try {
    data = JSON.parse(readFile(file, 'utf8'))
  } catch {
    return []
  }
  const entries = data && typeof data.vaults === 'object' && data.vaults ? Object.values(data.vaults) : []
  return entries
    .filter((v) => v && typeof v.path === 'string' && isDir(v.path))
    .map((v) => ({ path: v.path, name: baseName(v.path), open: v.open === true, ts: Number(v.ts) || 0 }))
    .sort((a, b) => Number(b.open) - Number(a.open) || b.ts - a.ts)
}

function obsidianUri(absPath) {
  return `obsidian://open?path=${encodeURIComponent(absPath)}`
}

class Vault extends EventEmitter {
  constructor(root, { platform = process.platform } = {}) {
    super()
    this.platform = platform
    this.root = fs.realpathSync(path.resolve(root))
    this.name = baseName(this.root)
    this.notes = new Map()
    this.truncated = false
    this.watcher = null
    this.timer = null
  }

  get count() {
    return this.notes.size
  }

  // ---------- Pfade ----------

  // Relativen Pfad prüfen und in Segmente zerlegen; wirft VaultError('bad-path').
  segments(rel, { allowRoot = false } = {}) {
    if (typeof rel !== 'string') throw new VaultError('bad-path', 'Pfad fehlt.')
    let clean = rel.trim().replace(/\\/g, '/')
    while (clean.startsWith('./')) clean = clean.slice(2)
    clean = clean.replace(/\/+$/, '')
    if (!clean) {
      if (allowRoot) return []
      throw new VaultError('bad-path', 'Pfad fehlt.')
    }
    if (clean.length > MAX_PATH || clean.includes('\0')) throw new VaultError('bad-path', 'Ungültiger Pfad.')
    if (clean.startsWith('/') || /^[A-Za-z]:/.test(clean)) {
      throw new VaultError('bad-path', 'Bitte einen Pfad relativ zum Vault angeben, z. B. "Projekte/Idee.md".')
    }
    const parts = clean.split('/').filter(Boolean)
    for (const part of parts) {
      if (part === '..' || part === '.') throw new VaultError('bad-path', 'Pfade mit ".." sind nicht erlaubt.')
      if (part.startsWith('.')) throw new VaultError('bad-path', `"${part}" ist ein versteckter Ordner und tabu.`)
      if (/[:*?"<>|]/.test(part)) throw new VaultError('bad-path', `Unerlaubtes Zeichen in "${part}".`)
    }
    return parts
  }

  inside(real) {
    const norm = (p) => (this.platform === 'win32' ? p.toLowerCase() : p)
    return norm(real) === norm(this.root) || norm(real).startsWith(norm(this.root + path.sep))
  }

  // Der echte Ort einer (evtl. noch nicht existierenden) Datei, oder Fehler, wenn er außerhalb liegt.
  async locate(parts) {
    const abs = path.join(this.root, ...parts)
    let probe = abs
    let rest = []
    for (;;) {
      try {
        const real = await fsp.realpath(probe)
        const full = rest.length ? path.join(real, ...rest) : real
        if (!this.inside(full)) throw new VaultError('bad-path', 'Dieser Pfad führt aus dem Vault hinaus.')
        return { abs: full, exists: rest.length === 0 }
      } catch (err) {
        if (err instanceof VaultError) throw err
        if (err.code !== 'ENOENT' || probe === this.root) throw err
        rest = [path.basename(probe), ...rest]
        probe = path.dirname(probe)
      }
    }
  }

  relOf(abs) {
    return path.relative(this.root, abs).split(path.sep).join('/')
  }

  // ---------- Index ----------

  async scan() {
    const notes = new Map()
    let truncated = false
    const stack = ['']
    while (stack.length) {
      const dir = stack.pop()
      let entries
      try {
        entries = await fsp.readdir(path.join(this.root, dir), { withFileTypes: true })
      } catch {
        continue
      }
      for (const entry of entries) {
        if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
        const rel = dir ? `${dir}/${entry.name}` : entry.name
        if (entry.isDirectory()) stack.push(rel)
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          if (notes.size >= MAX_NOTES) {
            truncated = true
            continue
          }
          try {
            const st = await fsp.stat(path.join(this.root, rel))
            notes.set(rel, noteEntry(rel, st))
          } catch {
            // Gerade gelöscht.
          }
        }
      }
    }
    this.notes = notes
    this.truncated = truncated
    this.emit('change')
    return notes.size
  }

  // Änderungen auf der Platte beobachten; einzelne Notizen werden direkt
  // aktualisiert, alles andere löst (entprellt) einen neuen Scan aus.
  watch() {
    if (this.watcher) return
    try {
      this.watcher = fs.watch(this.root, { recursive: true }, (_type, filename) => this.onFsEvent(filename))
      this.watcher.on('error', () => this.schedule())
    } catch {
      this.poll = setInterval(() => this.scan(), 30_000)
    }
  }

  async onFsEvent(filename) {
    const rel = filename ? String(filename).split(path.sep).join('/') : null
    if (rel && rel.split('/').some((p) => p.startsWith('.') || SKIP_DIRS.has(p))) return
    if (!rel || !rel.toLowerCase().endsWith('.md')) return this.schedule()
    try {
      const st = await fsp.stat(path.join(this.root, rel))
      if (st.isFile()) this.notes.set(rel, noteEntry(rel, st))
    } catch {
      this.notes.delete(rel)
    }
    this.emitSoon()
  }

  schedule() {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.scan(), 400)
  }

  emitSoon() {
    if (this.emitTimer) return
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null
      this.emit('change')
    }, 150)
  }

  close() {
    this.watcher?.close()
    this.watcher = null
    clearInterval(this.poll)
    clearTimeout(this.timer)
    clearTimeout(this.emitTimer)
  }

  // ---------- Lesen ----------

  recent(limit = 8) {
    return [...this.notes.values()].sort((a, b) => b.mtimeMs - a.mtimeMs).slice(0, limit)
  }

  list(folder = '') {
    const parts = this.segments(folder, { allowRoot: true })
    const prefix = parts.length ? `${parts.join('/')}/` : ''
    const folders = new Set()
    const notes = []
    for (const note of this.notes.values()) {
      if (!note.path.startsWith(prefix)) continue
      const rest = note.path.slice(prefix.length)
      const cut = rest.indexOf('/')
      if (cut >= 0) folders.add(rest.slice(0, cut))
      else notes.push(note)
    }
    if (prefix && !notes.length && !folders.size) throw new VaultError('not-found', `Ordner "${parts.join('/')}" gibt es nicht.`)
    notes.sort((a, b) => a.name.localeCompare(b.name, 'de'))
    return { folder: parts.join('/'), folders: [...folders].sort((a, b) => a.localeCompare(b, 'de')), notes }
  }

  async search(query, limit = 10) {
    const terms = String(query || '').toLowerCase().split(/\s+/).filter(Boolean)
    if (!terms.length) return { results: [], partial: false }
    const max = Math.max(1, Math.min(50, Number(limit) || 10))
    const results = []
    const seen = new Set()
    const byRecent = [...this.notes.values()].sort((a, b) => b.mtimeMs - a.mtimeMs)
    // Erst Name und Pfad: billig und meist das, was gemeint ist.
    for (const note of byRecent) {
      const hay = note.path.toLowerCase()
      if (terms.every((t) => hay.includes(t))) {
        results.push({ ...note, match: 'name', snippet: '' })
        seen.add(note.path)
        if (results.length >= max) return { results, partial: false }
      }
    }
    // Dann der Inhalt, neueste zuerst, mit Zeitbudget.
    const started = Date.now()
    for (const note of byRecent) {
      if (seen.has(note.path) || note.size > MAX_READ) continue
      if (Date.now() - started > SEARCH_BUDGET_MS) return { results, partial: true }
      let text
      try {
        text = await fsp.readFile(path.join(this.root, note.path), 'utf8')
      } catch {
        continue
      }
      const lower = text.toLowerCase()
      if (!terms.every((t) => lower.includes(t))) continue
      results.push({ ...note, match: 'content', snippet: snippetAround(text, lower.indexOf(terms[0]), terms[0].length) })
      if (results.length >= max) break
    }
    return { results, partial: false }
  }

  async read(rel) {
    const parts = this.segments(rel)
    let { abs, exists } = await this.locate(parts)
    // „Projekte/Insel“ meint „Projekte/Insel.md“.
    if (!exists && !/\.[^./]+$/.test(parts[parts.length - 1])) {
      ;({ abs, exists } = await this.locate([...parts.slice(0, -1), `${parts[parts.length - 1]}.md`]))
    }
    if (!exists) throw new VaultError('not-found', `Notiz "${parts.join('/')}" gibt es nicht.`)
    const st = await fsp.stat(abs)
    if (!st.isFile()) throw new VaultError('not-found', `"${parts.join('/')}" ist keine Datei.`)
    if (st.size > MAX_READ) throw new VaultError('too-big', 'Die Notiz ist größer als 1 MB.')
    return { path: this.relOf(abs), content: await fsp.readFile(abs, 'utf8'), mtimeMs: st.mtimeMs }
  }

  // ---------- Schreiben ----------

  // Prüft einen Schreibwunsch, ohne zu schreiben: so kann die Insel erst
  // fragen und lehnt Ungültiges ab, bevor jemand gefragt wird.
  async plan(rel, content, mode = 'create') {
    if (typeof content !== 'string') throw new VaultError('bad-input', 'Inhalt fehlt.')
    if (Buffer.byteLength(content) > MAX_READ) throw new VaultError('too-big', 'Inhalt ist größer als 1 MB.')
    if (!WRITE_MODES.has(mode)) throw new VaultError('bad-input', 'mode muss create, replace oder append sein.')
    const parts = this.segments(rel)
    const last = parts[parts.length - 1]
    if (/\.[^.]+$/.test(last) && !/\.md$/i.test(last)) throw new VaultError('bad-path', 'Nur Markdown-Notizen (.md) können geschrieben werden.')
    if (!/\.md$/i.test(last)) parts[parts.length - 1] = `${last}.md`
    const { abs, exists } = await this.locate(parts)
    if (exists && mode === 'create') {
      throw new VaultError('exists', `"${this.relOf(abs)}" gibt es schon. Nimm mode "append" oder "replace".`)
    }
    return { abs, exists, path: this.relOf(abs) }
  }

  async write(rel, content, mode = 'create') {
    const { abs, exists } = await this.plan(rel, content, mode)
    let text = content
    if (exists && mode === 'append') {
      const before = await fsp.readFile(abs, 'utf8')
      text = before + (before === '' || before.endsWith('\n') ? '' : '\n') + content
    }
    await fsp.mkdir(path.dirname(abs), { recursive: true })
    await fsp.writeFile(abs, text, 'utf8')
    const st = await fsp.stat(abs)
    const relPath = this.relOf(abs)
    this.notes.set(relPath, noteEntry(relPath, st))
    this.emitSoon()
    return { path: relPath, created: !exists, bytes: Buffer.byteLength(text) }
  }

  absolute(rel) {
    return path.join(this.root, ...this.segments(rel))
  }
}

function noteEntry(rel, st) {
  const cut = rel.lastIndexOf('/')
  return {
    path: rel,
    name: rel.slice(cut + 1).replace(/\.md$/i, ''),
    folder: cut >= 0 ? rel.slice(0, cut) : '',
    mtimeMs: st.mtimeMs,
    size: st.size,
  }
}

function snippetAround(text, at, len) {
  const start = Math.max(0, at - 60)
  const end = Math.min(text.length, at + len + 80)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`
}

module.exports = { Vault, VaultError, findVaults, obsidianConfigPath, obsidianUri }
