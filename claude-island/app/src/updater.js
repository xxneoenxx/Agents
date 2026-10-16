'use strict'

// Updates über die GitHub-Releases dieses Repos. Die installierte Version
// (Setup.exe) lädt eine neue Version mit electron-updater im Hintergrund und
// installiert sie beim nächsten Beenden oder sofort per Klick. Die portable
// .exe kann sich nicht selbst ersetzen; sie meldet nur, dass es eine neue gibt.

const RELEASES_URL = 'https://github.com/xxneoenxx/Agents/releases/latest'
const FEED_URL = `${RELEASES_URL}/download/latest.yml`
const FIRST_CHECK_MS = 15 * 1000
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000
// So lange darf keine Sitzung offen sein, bevor ein fertiges Update sich von
// selbst installiert. Länger als die 2 min, nach denen eine verstummte Sitzung
// verschwindet: ein /clear oder das Aufwachen aus dem Standby leeren die Liste nur kurz.
const IDLE_INSTALL_MS = 3 * 60 * 1000

// Ist Version a neuer als b? Nur Major.Minor.Patch, wie in den Releases.
function isNewer(a, b) {
  const parts = (v) => String(v || '').split(/[.+-]/).slice(0, 3).map((x) => Number.parseInt(x, 10) || 0)
  const [pa, pb] = [parts(a), parts(b)]
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] > pb[i]
  return false
}

// Die Version aus latest.yml (electron-builder schreibt `version: 0.4.12`).
function feedVersion(text) {
  const match = /^version:\s*['"]?(\d+\.\d+\.\d+)/m.exec(String(text || ''))
  return match ? match[1] : null
}

// Entscheidet jede Sekunde, ob ein fertiges Update jetzt still installiert
// werden darf: Panel zu und seit graceMs keine Sitzung offen.
function createIdleGate({ graceMs = IDLE_INSTALL_MS, now = Date.now } = {}) {
  let emptySince = now()
  return ({ sessions, expanded, ready }) => {
    if (sessions > 0) {
      emptySince = null
      return false
    }
    if (emptySince === null) emptySince = now()
    return Boolean(ready) && !expanded && now() - emptySince >= graceMs
  }
}

// mode: 'installed' (Setup.exe), 'portable' oder 'dev' (npm start, kein Update).
function createUpdater({ app, mode, onChange, fetchText }) {
  let state = { mode, current: app.getVersion(), phase: 'idle', version: null, percent: 0, error: null }
  let timer = null
  let manual = null
  let updater = null

  const set = (patch) => {
    state = { ...state, ...patch }
    onChange(state)
    if (manual && ['current', 'error', 'available', 'downloading', 'ready'].includes(state.phase)) {
      const done = manual
      manual = null
      done({ ...state })
    }
  }

  if (mode === 'installed') {
    updater = require('electron-updater').autoUpdater
    updater.autoDownload = true
    updater.autoInstallOnAppQuit = true
    // Alte Releases werden gelöscht; ohne Blockmap der alten Version immer ganz laden.
    updater.disableDifferentialDownload = true
    updater.logger = null
    updater.on('checking-for-update', () => {
      if (state.phase !== 'ready' && state.phase !== 'downloading') set({ phase: 'checking', error: null })
    })
    updater.on('update-available', (info) => set({ phase: 'downloading', version: info.version, percent: 0 }))
    updater.on('update-not-available', () => set({ phase: 'current', version: null }))
    updater.on('download-progress', (p) => set({ phase: 'downloading', percent: Math.max(0, Math.min(100, Math.round(p.percent || 0))) }))
    updater.on('update-downloaded', (info) => set({ phase: 'ready', version: info.version, percent: 100 }))
    updater.on('error', (err) => {
      // Ein fertig geladenes Update bleibt bereit, auch wenn eine spätere Prüfung scheitert.
      if (state.phase === 'ready' || state.phase === 'installing') return
      set({ phase: 'error', error: String((err && err.message) || err).split('\n')[0].slice(0, 200) })
    })
  }

  async function checkPortable() {
    const before = state
    set({ phase: 'checking', error: null })
    try {
      const latest = feedVersion(await fetchText(FEED_URL))
      if (!latest) throw new Error('latest.yml ohne Version')
      set(isNewer(latest, state.current) ? { phase: 'available', version: latest } : { phase: 'current', version: null })
    } catch (err) {
      const error = String((err && err.message) || err).slice(0, 200)
      // Offline beim nächsten Prüfen: die schon gefundene neue Version bleibt angezeigt.
      set(before.phase === 'available' ? { phase: 'available', version: before.version, error } : { phase: 'error', error })
    }
  }

  function check() {
    if (mode === 'dev') return
    if (['checking', 'downloading', 'ready', 'installing'].includes(state.phase)) return
    if (mode === 'portable') {
      checkPortable()
      return
    }
    // Fehler kommen zusätzlich als 'error'-Ereignis.
    updater.checkForUpdates().catch(() => {})
  }

  return {
    get state() {
      return state
    },
    releasesUrl: RELEASES_URL,
    start() {
      if (mode === 'dev' || timer) return
      setTimeout(check, FIRST_CHECK_MS)
      timer = setInterval(check, CHECK_EVERY_MS)
    },
    // Von Hand: das Ergebnis kommt als Promise zurück (für eine Rückmeldung).
    checkNow() {
      if (mode === 'dev') return Promise.resolve({ ...state })
      if (state.phase === 'downloading' || state.phase === 'ready') return Promise.resolve({ ...state })
      return new Promise((resolve) => {
        manual = resolve
        if (state.phase === 'checking') return
        check()
      })
    },
    install() {
      if (mode !== 'installed' || state.phase !== 'ready') return false
      // Nur einmal: still installieren und danach wieder starten.
      set({ phase: 'installing' })
      updater.quitAndInstall(true, true)
      return true
    },
  }
}

module.exports = { createUpdater, createIdleGate, isNewer, feedVersion, RELEASES_URL, FEED_URL, IDLE_INSTALL_MS }
