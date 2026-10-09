'use strict'

// Prüft und aktiviert das Plugin „island-bridge“ über die claude-CLI des
// Rechners. Die Desktop-App und das Terminal lesen dieselben Einstellungen,
// ein Plugin im Benutzerbereich gilt also auch für den Code-Tab.

const { spawn } = require('node:child_process')

const PLUGIN = 'island-bridge'
const NOT_FOUND = /not recognized|nicht als interner|nicht gefunden|command not found|ENOENT/i

// Führt `claude <args>` aus. Unter Windows über die Shell, weil die CLI dort
// je nach Installation `claude.exe` oder `claude.cmd` (npm) heißt.
function runClaude(args, { timeoutMs = 120_000 } = {}) {
  return new Promise((resolve) => {
    let out = ''
    let err = ''
    let child
    const windows = process.platform === 'win32'
    try {
      child = windows
        ? spawn(`claude ${args.join(' ')}`, { shell: true, windowsHide: true })
        : spawn('claude', args, { windowsHide: true })
    } catch (e) {
      resolve({ code: -1, out, err: e.message, missing: true })
      return
    }
    const timer = setTimeout(() => child.kill(), timeoutMs)
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => {
      clearTimeout(timer)
      resolve({ code: -1, out, err: e.message, missing: e.code === 'ENOENT' })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, out, err, missing: code !== 0 && NOT_FOUND.test(err) })
    })
  })
}

// Aus `claude plugin list --json`: 'active', 'disabled' oder 'missing' samt ID.
function parsePluginList(text) {
  let list
  try {
    list = JSON.parse(text)
  } catch {
    return { state: 'unknown', id: null }
  }
  const entry = Array.isArray(list) ? list.find((p) => typeof p?.id === 'string' && p.id.split('@')[0] === PLUGIN) : null
  if (!entry) return { state: 'missing', id: null }
  return { state: entry.enabled === false ? 'disabled' : 'active', id: entry.id }
}

async function checkPlugin(run = runClaude) {
  const res = await run(['plugin', 'list', '--json'], { timeoutMs: 30_000 })
  if (res.missing) return { state: 'no-cli', id: null }
  if (res.code !== 0) return { state: 'unknown', id: null }
  return parsePluginList(res.out)
}

// Installiert (Marketplace wird dabei hinzugefügt) oder schaltet wieder ein.
async function activatePlugin(source, run = runClaude) {
  const before = await checkPlugin(run)
  if (before.state === 'no-cli') return { ok: false, state: before, reason: 'no-cli' }
  if (before.state === 'active') return { ok: true, state: before, changed: false }
  const res =
    before.state === 'disabled'
      ? await run(['plugin', 'enable', before.id])
      : await run(['plugin', 'install', PLUGIN, '--marketplace', source, '--json'])
  const after = await checkPlugin(run)
  if (after.state === 'active') return { ok: true, state: after, changed: true }
  const detail = (res.err || res.out || '').trim().split('\n').slice(-3).join('\n')
  return { ok: false, state: after, reason: 'failed', detail }
}

module.exports = { checkPlugin, activatePlugin, parsePluginList, runClaude, PLUGIN }
