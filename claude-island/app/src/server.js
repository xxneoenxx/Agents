'use strict'

// Lokaler HTTP-Server für die Hooks und den Mod des Plugins „claude-island“.
// Nur 127.0.0.1; Browser-Anfragen (mit Origin-Header) und fremde Host-Namen
// werden abgewiesen, damit keine Webseite Freigaben oder Ereignisse fälschen kann.

const http = require('node:http')

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
const WRITE_APPROVAL_MS = 10 * 60 * 1000

// Im Modus „Fragen“ hält die Insel den Schreibwunsch an, bis in ihr
// entschieden wird: 'allow', 'deny', 'timeout' oder 'gone' (Anfrage weg).
function askToWrite(store, payload, planned, res) {
  return new Promise((resolve) => {
    let timer = null
    const approvalId = store.addApproval(
      {
        session_id: payload.session_id,
        tool_name: 'mcp__island-bridge__vault_write',
        tool_input: { path: planned.path, content: payload.content, mode: payload.mode || 'create' },
      },
      (behavior) => {
        clearTimeout(timer)
        resolve(behavior)
      },
    )
    if (!approvalId) {
      resolve('deny')
      return
    }
    timer = setTimeout(() => {
      store.dropApproval(approvalId)
      resolve('timeout')
    }, WRITE_APPROVAL_MS)
    res.on('close', () => {
      if (res.writableFinished) return
      clearTimeout(timer)
      store.dropApproval(approvalId)
      resolve('gone')
    })
  })
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
async function handleVault(op, payload, store, getVault, res) {
  const sessionId = payload.session_id
  if (typeof sessionId !== 'string' || !sessionId) return [400, { error: 'session_id', message: 'session_id fehlt.' }]
  const vault = getVault ? getVault() : null
  if (!vault) return [409, { error: 'no-vault', message: NO_VAULT }]
  try {
    switch (op) {
      case 'status':
        return [200, { name: vault.name, count: vault.count, truncated: vault.truncated }]
      case 'list': {
        const { folder, folders, notes } = vault.list(typeof payload.folder === 'string' ? payload.folder : '')
        return [200, { folder, folders, notes: notes.map((n) => ({ path: n.path, modified: new Date(n.mtimeMs).toISOString() })) }]
      }
      case 'search': {
        const found = await vault.search(payload.query, payload.limit)
        store.recordVaultActivity({ sessionId, op: 'search', query: String(payload.query || '') })
        return [
          200,
          {
            partial: found.partial,
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
          const decision = await askToWrite(store, payload, planned, res)
          if (decision === 'gone') return [0, null]
          if (decision === 'timeout') return [408, { error: 'timeout', message: 'Keine Antwort in Claude Island (10 Minuten). Nichts geschrieben.' }]
          if (decision !== 'allow') return [403, { error: 'denied', message: 'Abgelehnt in Claude Island. Nichts geschrieben.' }]
        }
        const written = await vault.write(payload.path, payload.content, mode)
        store.recordVaultActivity({ sessionId, op: 'write', path: written.path })
        return [200, written]
      }
    }
  } catch (err) {
    if (VAULT_ERRORS.has(err.code)) return [400, { error: err.code, message: err.message }]
    return [500, { error: 'io', message: `Dateifehler: ${err.code || err.message}` }]
  }
  return [404, { error: 'not found' }]
}

function createIslandServer(store, { port, host = '127.0.0.1', getVault = null }) {
  let allowedHosts = new Set()

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

    const vaultOp = /^\/vault\/([a-z]+)$/.exec(url.pathname)
    if (vaultOp && VAULT_OPS.has(vaultOp[1])) {
      const [status, body] = await handleVault(vaultOp[1], payload, store, getVault, res)
      if (status) send(res, status, body)
      return
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
      return new Promise((resolve) => {
        server.closeAllConnections?.()
        server.close(() => resolve())
      })
    },
  }
}

module.exports = { createIslandServer, permissionAnswer, STATUS_EVENTS }
