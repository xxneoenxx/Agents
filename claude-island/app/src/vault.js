'use strict'

// Der Obsidian-Vault auf der Platte: finden, indizieren, suchen, lesen,
// schreiben und beobachten. Reines Node, ohne Electron, damit es testbar ist.
//
// Jeder Pfad von außen (Claude, Widget) ist relativ zum Vault und wird hart
// geprüft: erst die Eingabe (kein `..`, kein absoluter Pfad, keine
// Punkt-Ordner, keine unter Windows ungültigen Namen), dann der aufgelöste
// echte Pfad. Der muss im Vault liegen und darf selbst keinen versteckten
// Ordner enthalten; so helfen weder Verknüpfungen noch Windows-Kurznamen
// (OBSIDI~1 für .obsidian) nach draußen oder in .obsidian/.git hinein.

const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { EventEmitter } = require('node:events')

const MAX_NOTES = 50_000
const MAX_READ = 1024 * 1024
const MAX_PATH = 400
const SEARCH_BUDGET_MS = 1500
const SKIP_DIRS = new Set(['node_modules'])
const WRITE_MODES = new Set(['create', 'replace', 'append'])
// Endungen, die sicher keine Notiz sind; alles andere bekommt ".md" angehängt
// (so bleibt „Besprechung 10.10.2026“ eine Notiz).
const NOT_NOTES = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'avif', 'pdf', 'canvas', 'base', 'json', 'txt', 'csv',
  'mp3', 'mp4', 'm4a', 'wav', 'webm', 'mov', 'ogg', 'zip', 'js', 'ts', 'css', 'html', 'htm', 'xml', 'docx', 'xlsx', 'pptx',
])
const RESERVED = /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(\..*)?$/i

class VaultError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const baseName = (p) => String(p).split(/[\\/]+/).filter(Boolean).pop() || String(p)
const hiddenPart = (part) => part.startsWith('.') || SKIP_DIRS.has(part)

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

// Liegt `child` in `parent` (oder ist es)? Über path.relative, das unter
// Windows Groß-/Kleinschreibung ignoriert und mit Laufwerkswurzeln umgehen kann.
function within(parent, child) {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

class Vault extends EventEmitter {
  constructor(root) {
    super()
    // Der Pfad, wie die Person ihn kennt (für Anzeige und Obsidian-Links) …
    this.root = fs.realpathSync(path.resolve(root))
    // … und wie Windows ihn auflöst (Netz- und subst-Laufwerke): dagegen prüft der Schutz.
    try {
      this.realRoot = fs.realpathSync.native(this.root)
    } catch {
      this.realRoot = this.root
    }
    this.name = baseName(this.root)
    this.notes = new Map()
    this.truncated = false
    this.watcher = null
    this.timer = null
    this.scanning = null
    this.rescanPending = false
    this.dirty = null
    this.locks = new Map()
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
    if (clean.length > MAX_PATH || /[\x00-\x1f]/.test(clean)) throw new VaultError('bad-path', 'Ungültiger Pfad.')
    if (clean.startsWith('/') || /^[A-Za-z]:/.test(clean)) {
      throw new VaultError('bad-path', 'Bitte einen Pfad relativ zum Vault angeben, z. B. "Projekte/Idee.md".')
    }
    const parts = clean.split('/').filter(Boolean)
    for (const part of parts) {
      if (part === '..' || part === '.') throw new VaultError('bad-path', 'Pfade mit ".." sind nicht erlaubt.')
      if (hiddenPart(part)) throw new VaultError('bad-path', `"${part}" ist ein versteckter Ordner und tabu.`)
      if (/[:*?"<>|]/.test(part)) throw new VaultError('bad-path', `Unerlaubtes Zeichen in "${part}".`)
      if (/[. ]$/.test(part)) throw new VaultError('bad-path', `"${part}" endet mit Punkt oder Leerzeichen; das geht unter Windows nicht.`)
      if (RESERVED.test(part)) throw new VaultError('bad-path', `"${part}" ist unter Windows ein reservierter Name.`)
      if (/~\d/.test(part)) throw new VaultError('bad-path', `"${part}" sieht aus wie ein Windows-Kurzname; bitte den vollen Namen angeben.`)
    }
    return parts
  }

  // Der echte Ort einer (evtl. noch nicht existierenden) Datei unter `this.root`,
  // oder VaultError, wenn er außerhalb oder in einem versteckten Ordner liegt.
  async locate(parts) {
    let probe = path.join(this.root, ...parts)
    let rest = []
    let real
    for (;;) {
      try {
        real = await fsp.realpath(probe)
        break
      } catch (err) {
        if (err.code !== 'ENOENT' || probe === this.root) throw err
        rest = [path.basename(probe), ...rest]
        probe = path.dirname(probe)
      }
    }
    const full = rest.length ? path.join(real, ...rest) : real
    if (!within(this.realRoot, full)) throw new VaultError('bad-path', 'Dieser Pfad führt aus dem Vault hinaus.')
    // Den aufgelösten Pfad prüfen, nicht die Eingabe: Kurznamen und Verknüpfungen
    // sind hier schon in ihre echten Namen übersetzt.
    const relParts = path.relative(this.realRoot, full).split(path.sep).filter(Boolean)
    if (relParts.some(hiddenPart)) throw new VaultError('bad-path', 'Versteckte Ordner wie .obsidian sind tabu.')
    const abs = path.join(this.root, ...relParts)
    return { abs, exists: rest.length === 0, rel: relParts.join('/') }
  }

  relOf(abs) {
    return path.relative(this.root, abs).split(path.sep).join('/')
  }

  // ---------- Index ----------

  // Ein Scan auf einmal; wer währenddessen fragt, bekommt danach noch einen.
  scan() {
    if (this.scanning) {
      this.rescanPending = true
      return this.scanning
    }
    this.dirty = new Set()
    this.scanning = this.scanOnce().finally(() => {
      this.scanning = null
      this.dirty = null
      if (this.rescanPending) {
        this.rescanPending = false
        this.scan()
      }
    })
    return this.scanning
  }

  async scanOnce() {
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
        if (hiddenPart(entry.name)) continue
        const rel = dir ? `${dir}/${entry.name}` : entry.name
        // Verknüpfungen sind weder Ordner noch Dateien und bleiben draußen.
        if (entry.isDirectory()) stack.push(rel)
        else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
          if (notes.size >= MAX_NOTES) {
            truncated = true
            continue
          }
          try {
            notes.set(rel, noteEntry(rel, await fsp.lstat(path.join(this.root, rel))))
          } catch {
            // Gerade gelöscht.
          }
        }
      }
    }
    // Was während des Scans geschrieben oder geändert wurde, gilt.
    for (const rel of this.dirty) await this.refreshEntry(rel, notes)
    this.notes = notes
    this.truncated = truncated
    this.emit('change')
    return notes.size
  }

  // Einen Eintrag nach dem Stand auf der Platte setzen oder entfernen.
  async refreshEntry(rel, notes = this.notes) {
    try {
      const st = await fsp.lstat(path.join(this.root, ...rel.split('/')))
      if (st.isFile()) notes.set(rel, noteEntry(rel, st))
      else notes.delete(rel)
    } catch {
      notes.delete(rel)
    }
  }

  touched(rel) {
    this.dirty?.add(rel)
  }

  // Änderungen auf der Platte beobachten; einzelne Notizen werden direkt
  // aktualisiert, alles andere löst (entprellt) einen neuen Scan aus.
  watch() {
    if (this.watcher) return
    try {
      this.watcher = fs.watch(this.root, { recursive: true }, (type, filename) => this.onFsEvent(type, filename))
      this.watcher.on('error', () => this.schedule())
    } catch {
      this.poll = setInterval(() => this.scan(), 30_000)
    }
  }

  async onFsEvent(type, filename) {
    const rel = filename ? String(filename).split(/[\\/]+/).filter(Boolean).join('/') : null
    if (rel && rel.split('/').some(hiddenPart)) return
    if (!rel || !rel.toLowerCase().endsWith('.md')) return this.schedule()
    this.touched(rel)
    await this.refreshEntry(rel)
    // Umbenennen nur in der Schreibweise (idee.md → Idee.md) erkennt Windows
    // nicht als Löschen; ein Scan räumt den alten Namen weg.
    if (type === 'rename' && process.platform === 'win32') this.schedule()
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

  async list(folder = '') {
    const parts = this.segments(folder, { allowRoot: true })
    const fold = (s) => (process.platform === 'win32' ? s.toLowerCase() : s)
    const prefix = parts.length ? fold(`${parts.join('/')}/`) : ''
    const folders = new Set()
    const notes = []
    for (const note of this.notes.values()) {
      if (!fold(note.path).startsWith(prefix)) continue
      const rest = note.path.slice(prefix.length)
      const cut = rest.indexOf('/')
      if (cut >= 0) folders.add(rest.slice(0, cut))
      else notes.push(note)
    }
    if (prefix && !notes.length && !folders.size) {
      // Ordner ohne Notizen (leer oder nur Anhänge) gibt es trotzdem.
      const { abs, exists } = await this.locate(parts)
      const isDir = exists && (await fsp.stat(abs)).isDirectory()
      if (!isDir) throw new VaultError('not-found', `Ordner "${parts.join('/')}" gibt es nicht.`)
    }
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
      const abs = path.join(this.root, ...note.path.split('/'))
      let text
      try {
        // Nur echte Dateien, keine Verknüpfungen, die nach draußen zeigen könnten.
        if (!(await fsp.lstat(abs)).isFile()) continue
        text = await fsp.readFile(abs, 'utf8')
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
    let found = await this.locate(parts)
    const last = parts[parts.length - 1]
    // „Projekte/Insel“ meint „Projekte/Insel.md“, auch bei „Notiz 10.10.2026“.
    if (!found.exists && !/\.md$/i.test(last)) found = await this.locate([...parts.slice(0, -1), `${last}.md`])
    if (!found.exists) throw new VaultError('not-found', `Notiz "${parts.join('/')}" gibt es nicht.`)
    if (!/\.md$/i.test(found.abs)) throw new VaultError('bad-path', 'Nur Markdown-Notizen (.md) können gelesen werden.')
    const st = await fsp.stat(found.abs)
    if (!st.isFile()) throw new VaultError('not-found', `"${found.rel}" ist keine Datei.`)
    if (st.size > MAX_READ) throw new VaultError('too-big', 'Die Notiz ist größer als 1 MB.')
    return { path: found.rel, content: await fsp.readFile(found.abs, 'utf8'), mtimeMs: st.mtimeMs }
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
    const ext = /\.([^.]+)$/.exec(last)?.[1]?.toLowerCase()
    if (ext !== 'md') {
      if (ext && NOT_NOTES.has(ext)) throw new VaultError('bad-path', 'Nur Markdown-Notizen (.md) können geschrieben werden.')
      parts[parts.length - 1] = `${last}.md`
    }
    const { abs, exists, rel: relPath } = await this.locate(parts)
    if (exists && mode === 'create') {
      throw new VaultError('exists', `"${relPath}" gibt es schon. Nimm mode "append" oder "replace".`)
    }
    let size = 0
    if (exists) {
      const st = await fsp.stat(abs)
      if (!st.isFile()) throw new VaultError('bad-path', `"${relPath}" ist keine Datei.`)
      size = st.size
    }
    return { abs, exists, path: relPath, size }
  }

  // Schreibvorgänge auf dieselbe Datei laufen nacheinander.
  async withLock(key, fn) {
    const before = this.locks.get(key) || Promise.resolve()
    const run = before.then(fn, fn)
    const tail = run.catch(() => {})
    this.locks.set(key, tail)
    try {
      return await run
    } finally {
      if (this.locks.get(key) === tail) this.locks.delete(key)
    }
  }

  async write(rel, content, mode = 'create') {
    const first = await this.plan(rel, content, mode)
    return this.withLock(first.abs.toLowerCase(), async () => {
      const { abs, exists, path: relPath } = await this.plan(rel, content, mode)
      await fsp.mkdir(path.dirname(abs), { recursive: true })
      if (!exists || mode === 'create') {
        // Exklusiv anlegen: kam jemand zuvor, gewinnt nicht der Letzte.
        try {
          await fsp.writeFile(abs, content, { encoding: 'utf8', flag: 'wx' })
        } catch (err) {
          if (err.code === 'EEXIST') throw new VaultError('exists', `"${relPath}" gibt es schon. Nimm mode "append" oder "replace".`)
          throw err
        }
      } else if (mode === 'append') {
        // Echtes Anhängen: der bisherige Inhalt wird nicht neu geschrieben.
        const handle = await fsp.open(abs, 'r')
        let lastByte = ''
        try {
          const { size } = await handle.stat()
          if (size > 0) {
            const buf = Buffer.alloc(1)
            await handle.read(buf, 0, 1, size - 1)
            lastByte = buf.toString('latin1')
          }
        } finally {
          await handle.close()
        }
        await fsp.appendFile(abs, (lastByte && lastByte !== '\n' ? '\n' : '') + content, 'utf8')
      } else {
        // Ersetzen über eine Zwischendatei: nie eine halb geschriebene Notiz.
        const tmp = `${abs}.${randomUUID().slice(0, 8)}.tmp`
        await fsp.writeFile(tmp, content, 'utf8')
        try {
          await fsp.rename(tmp, abs)
        } catch (err) {
          await fsp.rm(tmp, { force: true })
          throw err
        }
      }
      const st = await fsp.stat(abs)
      this.notes.set(relPath, noteEntry(relPath, st))
      this.touched(relPath)
      this.emitSoon()
      return { path: relPath, created: !exists, bytes: st.size }
    })
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

module.exports = { Vault, VaultError, findVaults, obsidianConfigPath, obsidianUri, within }
