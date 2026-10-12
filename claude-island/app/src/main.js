'use strict'

const { app, BrowserWindow, Menu, ipcMain, screen, dialog } = require('electron')
const path = require('node:path')
const { loadConfig, DEFAULTS } = require('./config')
const { SessionStore } = require('./sessions')
const { createIslandServer } = require('./server')
const { checkPlugin, activatePlugin, updatePlugin } = require('./plugin')

// Grundmaße bei Größe 100 %; das Fenster wird mit `scale` verkleinert und
// der Inhalt per Zoom mitskaliert, sodass das Layout in CSS gleich bleibt.
const PILL = { width: 232, height: 48 }
const PANEL = { width: 720, height: 436 }
const SCALES = [
  [0.5, 'Klein (50 %)'],
  [0.6, 'Kompakt (60 %)'],
  [0.75, 'Mittel (75 %)'],
  [0.9, 'Groß (90 %)'],
  [1, 'Sehr groß (100 %)'],
]
const FIGURES = [
  ['head', 'Nur Kopf (wächst beim Aufklappen)'],
  ['full', 'Ganzer Mini-Claude'],
]
const TOP_GAP = 8
// Die portable .exe entpackt sich bei jedem Start in einen Temp-Ordner. Für
// „Mit Windows starten“ zählt die .exe, die man doppelklickt hat.
const loginTarget = process.env.PORTABLE_EXECUTABLE_FILE ? { path: process.env.PORTABLE_EXECUTABLE_FILE } : {}
const MAX_HZ = 144
const RETRY_TEXT = 'Bitte versuche es erneut.'
// Strg/Cmd mit diesen Tasten würde zoomen und die Größe verstellen.
const ZOOM_KEYS = new Set(['0', '+', '-', '=', 'Add', 'Subtract'])

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setAppUserModelId('local.claude-island')
  app.whenReady().then(start)
}

let win = null
let expanded = false
let quitting = false
let serverState = { listening: false, error: null, port: null }
let pluginState = { state: 'checking', busy: false, message: '', outdated: false, version: null }

const scaled = (size, scale) => ({ width: Math.round(size.width * scale), height: Math.round(size.height * scale) })
const validScale = (value) => (SCALES.some(([s]) => s === value) ? value : DEFAULTS.scale)
const validFigure = (value) => (FIGURES.some(([f]) => f === value) ? value : DEFAULTS.figureMode)
const alive = (w) => w && !w.isDestroyed()

// Ein rahmenloses, durchsichtiges Fenster, das immer oben bleibt und seinen
// Zoom (= die gewählte Größe) gegen Tastenkürzel und Mausrad verteidigt.
function makeWindow({ bounds, zoom }) {
  const w = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    title: 'Claude Island',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      autoplayPolicy: 'no-user-gesture-required',
      zoomFactor: zoom(),
    },
  })
  w.setAlwaysOnTop(true, 'screen-saver')
  const wc = w.webContents
  wc.setVisualZoomLevelLimits(1, 1)
  const keepZoom = () => {
    if (Math.abs(wc.getZoomFactor() - zoom()) > 0.001) wc.setZoomFactor(zoom())
  }
  // Chromium merkt sich Zoom je Herkunft; nach jedem Laden die eigene Größe setzen.
  wc.on('did-finish-load', keepZoom)
  wc.on('zoom-changed', keepZoom)
  wc.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && ZOOM_KEYS.has(input.key)) event.preventDefault()
  })
  wc.setWindowOpenHandler(() => ({ action: 'deny' }))
  wc.on('will-navigate', (event) => event.preventDefault())
  w.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  return w
}

// Ein nicht skalierbares Fenster nimmt neue Maße unter Windows nicht immer an.
function setBoundsSafely(w, bounds) {
  w.setResizable(true)
  w.setBounds(bounds)
  w.setResizable(false)
}

function start() {
  // Ohne Standardmenü: kein Strg+R, Strg+Shift+I oder Zoom über Menükürzel.
  Menu.setApplicationMenu(null)
  const { config, save } = loadConfig(app.getPath('userData'))
  const store = new SessionStore({ modelIds: config.models })
  serverState.port = config.port
  let scale = validScale(config.scale)
  let figureMode = validFigure(config.figureMode)
  const islandZoom = () => scale

  const islandBounds = () => {
    const size = scaled(expanded ? PANEL : PILL, scale)
    return { ...size, ...topCenter(size) }
  }
  win = makeWindow({ bounds: islandBounds(), zoom: islandZoom })
  // Die Insel ist die App: Alt+F4 schließt sie nicht, „Beenden“ und das
  // Herunterfahren schon.
  app.on('before-quit', () => (quitting = true))
  win.on('close', (event) => {
    if (!quitting) event.preventDefault()
  })
  win.once('ready-to-show', () => {
    win.showInactive()
    measureRefresh()
  })

  // Zustand an die Insel schicken, gebündelt auf höchstens einen Frame.
  const fullState = () => ({
    ...store.snapshot(),
    ui: { expanded, pinned: config.pinned, sound: config.sound, scale, figureMode },
    server: serverState,
    plugin: pluginState,
  })
  let pushTimer = null
  const pushState = () => {
    if (pushTimer) return
    pushTimer = setTimeout(() => {
      pushTimer = null
      send(win, 'island:state', fullState())
    }, 8)
  }
  store.on('change', pushState)
  store.on('signal', (signal) => {
    send(win, 'island:signal', signal)
    if (signal.type === 'approval') {
      send(win, 'island:select', signal.sessionId)
      setExpanded(true)
    }
  })
  setInterval(() => store.tick(), 1000)

  const island = createIslandServer(store, { port: config.port })
  island
    .listen()
    .then(() => {
      serverState = { listening: true, error: null, port: config.port }
      pushState()
    })
    .catch((err) => {
      serverState = { listening: false, error: err.code === 'EADDRINUSE' ? 'Port belegt' : err.message, port: config.port }
      pushState()
      dialog.showErrorBox(
        'Claude Island',
        `Der lokale Server konnte 127.0.0.1:${config.port} nicht öffnen (${err.code || err.message}).\n` +
          'Läuft Claude Island schon, oder belegt ein anderes Programm den Port?',
      )
    })

  // Pupillen: Mausposition auf dem ganzen Bildschirm, so oft wie der Monitor
  // unter der Insel Bilder zeigt (60 Hz am Laptop, bis 144 Hz am Monitor),
  // aber mindestens alle 8 ms, damit grobe Windows-Timer noch ≥64 Hz liefern.
  // Der Renderer glättet die Bewegung zusätzlich in jedem Bild.
  let cursorTimer = null
  let cursorEvery = 0
  let last = { x: NaN, y: NaN, wx: NaN, wy: NaN }
  function sampleCursor() {
    if (!alive(win)) return
    const p = screen.getCursorScreenPoint()
    const b = win.getBounds()
    if (p.x === last.x && p.y === last.y && b.x === last.wx && b.y === last.wy) return
    last = { x: p.x, y: p.y, wx: b.x, wy: b.y }
    send(win, 'island:cursor', { x: p.x, y: p.y, wx: b.x, wy: b.y, zoom: win.webContents.getZoomFactor() })
  }
  function measureRefresh() {
    if (!alive(win)) return
    const hz = screen.getDisplayMatching(win.getBounds()).displayFrequency
    const every = Math.min(8, 1000 / Math.min(MAX_HZ, Math.max(30, Number.isFinite(hz) && hz > 0 ? hz : 60)))
    if (cursorTimer && every === cursorEvery) return
    cursorEvery = every
    clearInterval(cursorTimer)
    cursorTimer = setInterval(sampleCursor, cursorEvery)
  }

  function place() {
    if (!alive(win)) return
    setBoundsSafely(win, islandBounds())
    // Erst nach dem Verschieben messen: die Insel kann jetzt auf einem anderen Monitor stehen.
    measureRefresh()
  }
  function setExpanded(next) {
    if (expanded === next) return
    expanded = next
    place()
    pushState()
  }
  screen.on('display-metrics-changed', place)
  screen.on('display-added', place)
  screen.on('display-removed', place)

  // Klick woandershin klappt die Insel zu, außer sie ist angepinnt.
  win.on('blur', () => {
    if (expanded && !config.pinned) send(win, 'island:blur')
  })

  function setScale(next) {
    scale = validScale(next)
    save({ scale })
    win.webContents.setZoomFactor(islandZoom())
    place()
    pushState()
  }

  function setFigure(next) {
    figureMode = validFigure(next)
    save({ figureMode })
    pushState()
  }

  // ---------- Plugin ----------

  let pluginCheck = null
  let pluginCheckedAt = 0
  const refreshPlugin = () => {
    if (pluginCheck) return pluginCheck
    pluginCheck = (async () => {
      const found = await checkPlugin()
      pluginCheckedAt = Date.now()
      if (pluginState.busy) return
      // Eine alte Meldung gilt nicht mehr, wenn sich der Zustand geändert hat.
      const changed = found.state !== pluginState.state || found.outdated !== pluginState.outdated
      pluginState = {
        ...pluginState,
        state: found.state,
        outdated: found.outdated,
        version: found.version,
        message: changed ? '' : pluginState.message,
      }
      pushState()
    })().finally(() => (pluginCheck = null))
    return pluginCheck
  }
  refreshPlugin()

  async function runPluginTask(task, busyText) {
    if (pluginState.busy) return
    // Sofort sperren, damit ein zweiter Klick keinen zweiten Lauf startet.
    pluginState = { ...pluginState, busy: true, message: busyText }
    pushState()
    await pluginCheck
    let message
    let result
    try {
      result = await task()
    } catch (err) {
      result = { ok: false, reason: 'failed', detail: err.message, state: { state: pluginState.state } }
    }
    if (result.ok) {
      message =
        result.changed === false
          ? 'Plugin ist schon aktiv.'
          : 'Fertig. Starte die Claude-App neu (oder tippe /reload-plugins in offenen Sitzungen).'
    } else if (result.reason === 'no-cli') {
      message = 'claude-CLI nicht gefunden. In PowerShell installieren: irm https://claude.ai/install.ps1 | iex – danach Claude Island neu starten.'
    } else if (result.reason === 'timeout') {
      message = 'Die claude-CLI hat nicht rechtzeitig geantwortet. Bitte später noch einmal versuchen.'
    } else {
      message = `Das hat nicht geklappt.${result.detail ? ` ${result.detail}` : ''}`
    }
    const s = result.state || {}
    pluginState = {
      state: s.state || pluginState.state,
      outdated: Boolean(s.outdated),
      version: s.version || null,
      busy: false,
      message,
    }
    pushState()
  }
  const enablePlugin = () => runPluginTask(() => activatePlugin(config.pluginSource), 'Aktiviere das Plugin …')
  const upgradePlugin = () => runPluginTask(() => updatePlugin(), 'Aktualisiere das Plugin …')

  // ---------- Insel ----------

  ipcMain.handle('island:get-state', () => fullState())
  ipcMain.on('island:activate-plugin', () => enablePlugin())
  ipcMain.on('island:update-plugin', () => upgradePlugin())
  ipcMain.on('island:expand', (_e, value) => setExpanded(Boolean(value)))
  ipcMain.on('island:pin', (_e, value) => {
    save({ pinned: Boolean(value) })
    pushState()
  })
  ipcMain.on('island:sound', (_e, value) => {
    save({ sound: Boolean(value) })
    pushState()
  })
  ipcMain.on('island:figure-mode', (_e, value) => setFigure(value))
  ipcMain.on('island:decide', (_e, approvalId, behavior) => store.decide(String(approvalId), behavior))
  ipcMain.on('island:hint', (_e, sessionId, text) => store.queueHint(String(sessionId), String(text)))
  ipcMain.on('island:retry', (_e, sessionId) => store.queueHint(String(sessionId), RETRY_TEXT))
  ipcMain.on('island:desired', (_e, sessionId, desired) => {
    if (!desired || typeof desired !== 'object') return
    store.setDesired(String(sessionId), {
      ...('model' in desired ? { model: desired.model } : {}),
      ...('effort' in desired ? { effort: desired.effort } : {}),
    })
  })
  ipcMain.on('island:menu', () => {
    const login = app.getLoginItemSettings(loginTarget)
    const pluginItem =
      pluginState.state === 'active' && pluginState.outdated
        ? { label: 'Plugin aktualisieren', enabled: !pluginState.busy, click: () => upgradePlugin() }
        : {
            label: pluginState.state === 'active' ? 'Plugin ist aktiv' : 'Plugin aktivieren',
            enabled: pluginState.state !== 'active' && !pluginState.busy,
            click: () => enablePlugin(),
          }
    Menu.buildFromTemplate([
      { label: 'Claude Island', enabled: false },
      { type: 'separator' },
      {
        label: 'Größe',
        submenu: SCALES.map(([value, label]) => ({
          label,
          type: 'radio',
          checked: value === scale,
          click: () => setScale(value),
        })),
      },
      {
        label: 'Figur in der Pille',
        submenu: FIGURES.map(([value, label]) => ({
          label,
          type: 'radio',
          checked: value === figureMode,
          click: () => setFigure(value),
        })),
      },
      pluginItem,
      { type: 'separator' },
      {
        label: 'Mit Windows starten',
        type: 'checkbox',
        // Aus dem Quellcode (npm start) würde nur electron.exe ohne App eingetragen.
        enabled: app.isPackaged,
        checked: login.openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, ...loginTarget }),
      },
      { label: 'Beenden', click: () => app.quit() },
    ]).popup({ window: win })
  })

  // Wer das Plugin von Hand installiert, sieht den neuen Stand beim nächsten Klick.
  win.on('focus', () => {
    const settled = pluginState.state === 'active' && !pluginState.outdated
    if (!settled && !pluginState.busy && Date.now() - pluginCheckedAt > 10_000) refreshPlugin()
  })
  app.on('second-instance', () => setExpanded(true))
  app.on('window-all-closed', () => app.quit())
  app.on('before-quit', () => island.close())
}

function topCenter(size) {
  const { workArea } = screen.getPrimaryDisplay()
  return {
    x: Math.round(workArea.x + (workArea.width - size.width) / 2),
    y: workArea.y + TOP_GAP,
  }
}

function send(target, channel, payload) {
  if (alive(target)) target.webContents.send(channel, payload)
}
