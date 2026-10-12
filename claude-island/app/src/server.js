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
const MAX_BODY = 1024 * 1024
const DENY_MESSAGE = 'Abgelehnt in Claude Island.'

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

function createIslandServer(store, { port, host = '127.0.0.1' }) {
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
