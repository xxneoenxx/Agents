'use strict'

// Prüft, aktiviert und aktualisiert das Plugin „island-bridge“ über die
// claude-CLI des Rechners. Die Desktop-App und das Terminal lesen dieselben
// Einstellungen, ein Plugin im Benutzerbereich gilt also auch im Code-Tab.

const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const PLUGIN = 'island-bridge'
const MARKETPLACE = 'neo-agents'
// Die Plugin-Version, zu der diese App passt; ältere bietet sie zum Aktualisieren an.
const EXPECTED_VERSION = '0.3.0'
const NOT_FOUND = /not recognized|nicht als interner|nicht gefunden|command not found|ENOENT/i

// Wo die Installer die CLI ablegen, unabhängig davon, ob PATH schon stimmt
// (die Insel erbt PATH vom Start; ein später installiertes claude fehlt dort).
function knownLocations(env = process.env, platform = process.platform) {
  if (platform === 'win32') {
    const list = []
    if (env.USERPROFILE) list.push(path.win32.join(env.USERPROFILE, '.local', 'bin', 'claude.exe'))
    if (env.LOCALAPPDATA) list.push(path.win32.join(env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Links', 'claude.exe'))
    if (env.APPDATA) list.push(path.win32.join(env.APPDATA, 'npm', 'claude.cmd'))
    return list
  }
  return env.HOME ? [path.posix.join(env.HOME, '.local', 'bin', 'claude')] : []
}

// Wie die Shell suchen würde: Ordner für Ordner, unter Windows .exe vor .cmd
// (nvm-windows, eigener npm-Präfix, pnpm legen claude.cmd woanders ab).
function onPath(env, platform, exists) {
  const p = platform === 'win32' ? path.win32 : path.posix
  const dirs = String(env.PATH || env.Path || '').split(platform === 'win32' ? ';' : ':').filter(Boolean)
  const names = platform === 'win32' ? ['claude.exe', 'claude.cmd'] : ['claude']
  for (const dir of dirs) {
    for (const name of names) {
      const file = p.join(dir.replace(/^"|"$/g, ''), name)
      if (exists(file)) return file
    }
  }
  return null
}

function resolveClaude({ env = process.env, platform = process.platform, exists = fs.existsSync } = {}) {
  return knownLocations(env, platform).find((file) => exists(file)) || onPath(env, platform, exists) || 'claude'
}

// Wie spawn() die CLI startet: .exe und Unix direkt, .cmd über cmd.exe mit
// gequoteten Argumenten. Argumente mit " % oder Zeilenumbruch lehnt sie ab,
// weil cmd.exe sie auch in Anführungszeichen auswertet.
function commandFor(exe, args, { platform = process.platform, comspec = process.env.ComSpec } = {}) {
  if (platform === 'win32' && /\.cmd$/i.test(exe)) {
    if ([exe, ...args].some((a) => /["%\r\n]/.test(a))) throw new Error('unsicheres Argument')
    const line = [exe, ...args].map((a) => `"${a}"`).join(' ')
    return { file: comspec || 'cmd.exe', argv: ['/d', '/s', '/c', `"${line}"`], verbatim: true }
  }
  return { file: exe, argv: args, verbatim: false }
}

function killTree(child, platform = process.platform) {
  try {
    if (platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
    else child.kill('SIGKILL')
  } catch {
    // Schon beendet.
  }
}

// Führt `claude <args>` aus und löst immer auf, spätestens nach `timeoutMs`.
function runClaude(args, { timeoutMs = 120_000 } = {}) {
  return new Promise((resolve) => {
    let out = ''
    let err = ''
    let done = false
    const finish = (result) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve({ code: -1, out, err, missing: false, timedOut: false, ...result })
    }
    let child
    let timer = null
    try {
      const cmd = commandFor(resolveClaude(), args)
      child = spawn(cmd.file, cmd.argv, {
        windowsHide: true,
        windowsVerbatimArguments: cmd.verbatim,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (e) {
      finish({ err: e.message, missing: e.code === 'ENOENT' })
      return
    }
    timer = setTimeout(() => {
      killTree(child)
      finish({ timedOut: true, err: `${err}\nZeitüberschreitung nach ${Math.round(timeoutMs / 1000)} s` })
    }, timeoutMs)
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    child.on('error', (e) => finish({ err: e.message, missing: e.code === 'ENOENT' }))
    child.on('close', (code) => finish({ code, missing: code !== 0 && NOT_FOUND.test(err) }))
  })
}

// Aus `claude plugin list --json`: aktiv, wenn irgendein island-bridge@… aktiv
// ist; sonst der abgeschaltete Eintrag (bevorzugt aus neo-agents) oder missing.
function parsePluginList(text) {
  let list
  try {
    list = JSON.parse(text)
  } catch {
    return { state: 'unknown', id: null, version: null }
  }
  const mine = (Array.isArray(list) ? list : []).filter((p) => typeof p?.id === 'string' && p.id.split('@')[0] === PLUGIN)
  const prefer = (entries) => entries.find((p) => p.id === `${PLUGIN}@${MARKETPLACE}`) || entries[0]
  const enabled = mine.filter((p) => p.enabled !== false)
  const pick = enabled.length ? prefer(enabled) : mine.length ? prefer(mine) : null
  if (!pick) return { state: 'missing', id: null, version: null }
  return { state: enabled.length ? 'active' : 'disabled', id: pick.id, version: typeof pick.version === 'string' ? pick.version : null }
}

function olderThan(version, expected = EXPECTED_VERSION) {
  if (!version) return false
  const a = version.split('.').map((n) => parseInt(n, 10) || 0)
  const b = expected.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0)
  return false
}

async function checkPlugin(run = runClaude) {
  const res = await run(['plugin', 'list', '--json'], { timeoutMs: 30_000 })
  if (res.missing) return { state: 'no-cli', id: null, version: null, outdated: false }
  if (res.code !== 0) return { state: 'unknown', id: null, version: null, outdated: false }
  const found = parsePluginList(res.out)
  return { ...found, outdated: found.state === 'active' && found.id === `${PLUGIN}@${MARKETPLACE}` && olderThan(found.version) }
}

async function hasMarketplace(run) {
  const res = await run(['plugin', 'marketplace', 'list', '--json'], { timeoutMs: 30_000 })
  if (res.code !== 0) return false
  try {
    return JSON.parse(res.out).some((m) => m?.name === MARKETPLACE)
  } catch {
    return false
  }
}

const lastLines = (res) => (res.err || res.out || '').trim().split('\n').slice(-3).join('\n')

// Installiert (Marketplace wird bei Bedarf hinzugefügt) oder schaltet wieder ein.
async function activatePlugin(source, run = runClaude) {
  const before = await checkPlugin(run)
  if (before.state === 'no-cli') return { ok: false, state: before, reason: 'no-cli' }
  if (before.state === 'active') return { ok: true, state: before, changed: false }
  let res
  if (before.state === 'disabled') {
    res = await run(['plugin', 'enable', before.id])
  } else if (await hasMarketplace(run)) {
    // Schon eingetragen (etwa von Hand oder über die Desktop-App): nicht neu hinzufügen.
    await run(['plugin', 'marketplace', 'update', MARKETPLACE])
    res = await run(['plugin', 'install', `${PLUGIN}@${MARKETPLACE}`, '--json'])
  } else {
    res = await run(['plugin', 'install', PLUGIN, '--marketplace', source, '--json'])
  }
  const after = await checkPlugin(run)
  if (after.state === 'active') return { ok: true, state: after, changed: true }
  return { ok: false, state: after, reason: res.timedOut ? 'timeout' : 'failed', detail: lastLines(res) }
}

// Holt den neuesten Stand des Marketplace und aktualisiert das Plugin.
async function updatePlugin(run = runClaude) {
  await run(['plugin', 'marketplace', 'update', MARKETPLACE])
  const res = await run(['plugin', 'update', `${PLUGIN}@${MARKETPLACE}`, '--json'])
  const after = await checkPlugin(run)
  if (after.state === 'active' && !after.outdated) return { ok: true, state: after }
  return { ok: false, state: after, reason: res.timedOut ? 'timeout' : 'failed', detail: lastLines(res) }
}

module.exports = {
  checkPlugin,
  activatePlugin,
  updatePlugin,
  parsePluginList,
  olderThan,
  resolveClaude,
  commandFor,
  knownLocations,
  runClaude,
  PLUGIN,
  MARKETPLACE,
  EXPECTED_VERSION,
}
