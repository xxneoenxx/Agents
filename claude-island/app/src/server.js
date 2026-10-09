'use strict'

// Lokaler HTTP-Server für die Hooks und den Mod des Plugins „claude-island“.
// Nur 127.0.0.1; Browser-Anfragen (mit Origin-Header) und fremde Host-Namen
// werden abgewiesen, damit keine Webseite Freigaben oder Ereignisse fälschen kann.

const http = require('node:http')
const { randomUUID, timingSafeEqual } = require('node:crypto')

const STATUS_EVENTS = new Set([
  'SessionStart',
  'UserPromptSubmit',
  'PostToolUse',
  'PostToolUseFailure',
  'Notification',
  'Stop',
  'StopFailure',
  'SessionEnd',
])
// Notizen bis 1 MB plus JSON-Hülle.
const MAX_BODY = 2 * 1024 * 1024
const DENY_MESSAGE = 'Abgelehnt in Claude Island.'
const VAULT_OPS = new Set(['status', 'list', 'search', 'read', 'write'])
const VAULT_ERRORS = new Set(['bad-path', 'not-found', 'exists', 'too-big', 'bad-input'])
const NO_VAULT = 'Kein Obsidian-Vault verbunden. In Claude Island im Vault-Widget einen Vault wählen.'
// Freigabe eines Schreibwunschs im Modus „Fragen“: Claude Code bricht eine
// Mod-Anfrage nach 30 s ab, also hält eine Abfrage höchstens WAIT_MS und der
// Mod fragt nach. Fragt er GRACE_MS lang nicht nach, ist Claude weg.
const WRITE_APPROVAL_MS = 10 * 60 * 1000
const WAIT_MS = 20_000
const GRACE_MS = 60_000
const KEEP_RESULT_MS = 2 * 60 * 1000

const vaultError = (err) =>
  VAULT_ERRORS.has(err.code) ? [400, { error: err.code, message: err.message }] : [500, { error: 'io', message: `Dateifehler: ${err.code || err.message}` }]

// Schreibwünsche, die auf eine Entscheidung in der Insel warten.
class PendingWrites {
  constructor(store, { approvalMs = WRITE_APPROVAL_MS, waitMs = WAIT_MS, graceMs = GRACE_MS, keepMs = KEEP_RESULT_MS } = {}) {
    this.store = store
    this.items = new Map()
    this.ms = { approval: approvalMs, wait: waitMs, grace: graceMs, keep: keepMs }
  }

  start(payload, planned, vault) {
    const mode = payload.mode || 'create'
    const item = { id: randomUUID(), sessionId: payload.session_id, state: 'waiting', result: null, waiters: new Set(), timers: {} }
    this.items.set(item.id, item)
    item.approvalId = this.store.addApproval(
      {
        session_id: payload.session_id,
        tool_name: 'mcp__island-bridge__vault_write',
        tool_input: { path: planned.path, content: payload.content, mode, existingBytes: planned.exists ? planned.size : null },
      },
      (behavior) => this.decided(item, behavior, payload, mode, vault),
    )
    if (!item.approvalId) {
      this.finish(item, [403, { error: 'denied', message: 'Abgelehnt in Claude Island. Nichts geschrieben.' }])
      return item.id
    }
    item.timers.total = setTimeout(() => {
      this.store.dropApproval(item.approvalId)
      this.finish(item, [408, { error: 'timeout', message: 'Keine Antwort in Claude Island (10 Minuten). Nichts geschrieben.' }])
    }, this.ms.approval)
    this.graceIfIdle(item)
    return item.id
  }

  async decided(item, behavior, payload, mode, vault) {
    if (item.state !== 'waiting') return
    if (behavior !== 'allow') {
      this.finish(item, [403, { error: 'denied', message: 'Abgelehnt in Claude Island. Nichts geschrieben.' }])
      return
    }
    item.state = 'writing'
    try {
      const written = await vault.write(payload.path, payload.content, mode)
      this.store.recordVaultActivity({ sessionId: item.sessionId, op: 'write', path: written.path })
      this.finish(item, [200, written])
    } catch (err) {
      this.finish(item, vaultError(err))
    }
  }

  // Wartet niemand auf die Antwort, läuft die Frist, nach der Claude als weg gilt.
  graceIfIdle(item) {
    clearTimeout(item.timers.grace)
    if (item.state !== 'waiting' || item.waiters.size) return
    item.timers.grace = setTimeout(() => {
      if (item.state !== 'waiting' || item.waiters.size) return
      this.store.dropApproval(item.approvalId)
      this.finish(item, [410, { error: 'gone', message: 'Claude hat nicht mehr nachgefragt. Nichts geschrieben.' }])
    }, this.ms.grace)
  }

  finish(item, result) {
    item.state = 'done'
    item.result = result
    clearTimeout(item.timers.total)
    clearTimeout(item.timers.grace)
    for (const w of item.waiters) {
      clearTimeout(w.timer)
      send(w.res, ...result)
    }
    item.waiters.clear()
    // Kurz aufheben, falls die Antwort unterwegs verloren ging und der Mod nachfragt.
    item.timers.keep = setTimeout(() => this.items.delete(item.id), this.ms.keep)
  }

  wait(id, sessionId, res) {
    const item = this.items.get(id)
    if (!item || item.sessionId !== sessionId) {
      send(res, 404, { error: 'unknown-write', message: 'Dieser Schreibwunsch ist nicht mehr bekannt. Nichts geschrieben.' })
      return
    }
    if (item.state === 'done') {
      send(res, ...item.result)
      return
    }
    const waiter = { res, timer: null }
    item.waiters.add(waiter)
    clearTimeout(item.timers.grace)
    waiter.timer = setTimeout(() => {
      item.waiters.delete(waiter)
      send(res, 202, { pending: item.id })
      this.graceIfIdle(item)
    }, this.ms.wait)
    res.on('close', () => {
      clearTimeout(waiter.timer)
      if (item.waiters.delete(waiter)) this.graceIfIdle(item)
    })
  }

  cancel(id, sessionId) {
    const item = this.items.get(id)
    if (!item || item.sessionId !== sessionId || item.state !== 'waiting') return false
    this.store.dropApproval(item.approvalId)
    this.finish(item, [410, { error: 'cancelled', message: 'Abgebrochen. Nichts geschrieben.' }])
    return true
  }

  close() {
    for (const item of this.items.values()) {
      for (const t of Object.values(item.timers)) clearTimeout(t)
      for (const w of item.waiters) clearTimeout(w.timer)
    }
    this.items.clear()
  }
}

function send(res, status, body) {
  if (res.headersSent || res.destroyed) return
  if (body === undefined) {
    res.writeHead(status, { 'Content-Length': 0 })
    res.end()
    return
  }
  const text = JSON.stringify(body)
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(text) })
  res.end(text)
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('zu groß'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'))
      } catch {
        reject(Object.assign(new Error('kein JSON'), { status: 400 }))
      }
    })
    req.on('error', reject)
  })
}

function permissionAnswer(behavior) {
  const decision = behavior === 'allow' ? { behavior: 'allow' } : { behavior: 'deny', message: DENY_MESSAGE }
  return { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision } }
}

// Ein Vault-Aufruf des Mods; `getVault()` liefert den verbundenen Vault oder null.
async function handleVault(op, payload, store, getVault, pending) {
  const sessionId = payload.session_id
  if (typeof sessionId !== 'string' || !sessionId) return [400, { error: 'session_id', message: 'session_id fehlt.' }]
  const vault = getVault ? getVault() : null
  if (!vault) return [409, { error: 'no-vault', message: NO_VAULT }]
  try {
    switch (op) {
      case 'status':
        return [200, { name: vault.name, count: vault.count, truncated: vault.truncated }]
      case 'list': {
        const { folder, folders, notes } = await vault.list(typeof payload.folder === 'string' ? payload.folder : '')
        return [200, { folder, folders, notes: notes.map((n) => ({ path: n.path, modified: new Date(n.mtimeMs).toISOString() })) }]
      }
      case 'search': {
        const found = await vault.search(payload.query, payload.limit)
        store.recordVaultActivity({ sessionId, op: 'search', query: String(payload.query || '') })
        return [
          200,
          {
            partial: found.partial,
            truncated: vault.truncated,
            results: found.results.map((r) => ({ path: r.path, match: r.match, snippet: r.snippet, modified: new Date(r.mtimeMs).toISOString() })),
          },
        ]
      }
      case 'read': {
        const note = await vault.read(payload.path)
        store.recordVaultActivity({ sessionId, op: 'read', path: note.path })
        return [200, { path: note.path, content: note.content, modified: new Date(note.mtimeMs).toISOString() }]
      }
      case 'write': {
        const mode = payload.mode || 'create'
        const planned = await vault.plan(payload.path, payload.content, mode)
        if (store.vaultInfo?.writeMode !== 'free') {
          // Modus „Fragen“: erst nach der Entscheidung in der Insel schreiben.
          return [202, { pending: pending.start(payload, planned, vault), message: 'Wartet auf Freigabe in Claude Island.' }]
        }
        const written = await vault.write(payload.path, payload.content, mode)
        store.recordVaultActivity({ sessionId, op: 'write', path: written.path })
        return [200, written]
      }
    }
  } catch (err) {
    return vaultError(err)
  }
  return [404, { error: 'not found' }]
}

function tokenMatches(given, token) {
  if (typeof given !== 'string') return false
  const a = Buffer.from(given)
  const b = Buffer.from(token)
  return a.length === b.length && timingSafeEqual(a, b)
}

// `token`: Schlüssel, den der Mod für /vault/* mitschicken muss (aus einer
// Datei, die nur der angemeldete Benutzer lesen kann). Ohne Token keine Prüfung.
function createIslandServer(store, { port, host = '127.0.0.1', getVault = null, token = null, timing = {} }) {
  let allowedHosts = new Set()
  const pending = new PendingWrites(store, timing)

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}`)
    if (!allowedHosts.has(String(req.headers.host).toLowerCase()) || req.headers.origin !== undefined) {
      send(res, 403, { error: 'forbidden' })
      return
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      send(res, 200, { ok: true, app: 'claude-island' })
      return
    }
    if (req.method !== 'POST') {
      send(res, 405, { error: 'method' })
      return
    }
    if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) {
      send(res, 415, { error: 'content-type' })
      return
    }
    let payload
    try {
      payload = await readJson(req)
    } catch (err) {
      send(res, err.status || 400, { error: err.message })
      return
    }

    if (url.pathname === '/hook/PermissionRequest') {
      // Offen halten, bis in der Insel entschieden wird. Schließt Claude Code
      // die Verbindung vorher (Timeout, im Dialog beantwortet), fällt die Karte weg.
      const approvalId = store.addApproval(payload, (behavior) => send(res, 200, permissionAnswer(behavior)))
      if (!approvalId) {
        send(res, 200)
        return
      }
      res.on('close', () => {
        if (!res.writableFinished) store.dropApproval(approvalId)
      })
      return
    }

    const hook = /^\/hook\/([A-Za-z]+)$/.exec(url.pathname)
    if (hook && STATUS_EVENTS.has(hook[1])) {
      store.handleHook(hook[1], payload)
      send(res, 200)
      return
    }

    const vaultOp = /^\/vault\/([a-z-]+)$/.exec(url.pathname)
    if (vaultOp) {
      if (token && !tokenMatches(req.headers['x-island-token'], token)) {
        send(res, 401, { error: 'token', message: 'Claude Island hat den Zugriff abgelehnt (Schlüssel fehlt oder ist falsch).' })
        return
      }
      if (vaultOp[1] === 'write-wait') {
        pending.wait(String(payload.id || ''), payload.session_id, res)
        return
      }
      if (vaultOp[1] === 'write-cancel') {
        send(res, 200, { cancelled: pending.cancel(String(payload.id || ''), payload.session_id) })
        return
      }
      if (VAULT_OPS.has(vaultOp[1])) {
        const [status, body] = await handleVault(vaultOp[1], payload, store, getVault, pending)
        send(res, status, body)
        return
      }
    }

    if (url.pathname === '/mod/poll') {
      const answer = store.modPoll(payload)
      send(res, answer ? 200 : 400, answer || { error: 'session_id' })
      return
    }

    send(res, 404, { error: 'not found' })
  })

  // Freigaben dürfen lange offen bleiben; Claude Code bricht selbst nach `timeout` ab.
  server.requestTimeout = 0
  server.headersTimeout = 30_000
  server.keepAliveTimeout = 5_000

  return {
    server,
    listen() {
      return new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, () => {
          server.off('error', reject)
          const actual = server.address().port
          allowedHosts = new Set([`127.0.0.1:${actual}`, `localhost:${actual}`])
          resolve(server.address())
        })
      })
    },
    close() {
      pending.close()
      return new Promise((resolve) => {
        server.closeAllConnections?.()
        server.close(() => resolve())
      })
    },
  }
}

module.exports = { createIslandServer, permissionAnswer, STATUS_EVENTS, WAIT_MS }
