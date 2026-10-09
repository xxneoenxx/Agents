'use strict'

const { app, BrowserWindow, Menu, ipcMain, screen, dialog } = require('electron')
const path = require('node:path')
const { loadConfig } = require('./config')
const { SessionStore } = require('./sessions')
const { createIslandServer } = require('./server')
const { checkPlugin, activatePlugin } = require('./plugin')

// Grundmaße bei Größe 100 %; die Fenster werden mit `scale` verkleinert und
// der Inhalt per Zoom mitskaliert, sodass das Layout in CSS gleich bleibt.
const PILL = { width: 232, height: 48 }
const PANEL = { width: 720, height: 436 }
const SCALES = [
  [0.5, 'Klein (50 %)'],
  [0.6, 'Kompakt (60 %)'],
  [0.75, 'Mittel (75 %)'],
  [1, 'Groß (100 %)'],
]
const TOP_GAP = 8
const MAX_HZ = 144
const RETRY_TEXT = 'Bitte versuche es erneut.'

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setAppUserModelId('local.claude-island')
  app.whenReady().then(start)
}

let win = null
let expanded = false
let serverState = { listening: false, error: null, port: null }
let pluginState = { state: 'checking', busy: false, message: '' }

const scaled = (size, scale) => ({ width: Math.round(size.width * scale), height: Math.round(size.height * scale) })
const validScale = (value) => (SCALES.some(([s]) => s === value) ? value : 0.6)

function start() {
  const { config, save } = loadConfig(app.getPath('userData'))
  const store = new SessionStore({ modelIds: config.models })
  serverState.port = config.port
  let scale = validScale(config.scale)
  const pill = scaled(PILL, scale)

  win = new BrowserWindow({
    ...pill,
    ...topCenter(pill),
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
      zoomFactor: scale,
    },
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.webContents.setVisualZoomLevelLimits(1, 1)
  // Chromium merkt sich Zoom je Herkunft; nach jedem Laden die eigene Größe setzen.
  win.webContents.on('did-finish-load', () => win.webContents.setZoomFactor(scale))
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  win.once('ready-to-show', () => win.showInactive())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => event.preventDefault())

  // Zustand an das Fenster schicken, gebündelt auf höchstens einen Frame.
  const fullState = () => ({
    ...store.snapshot(),
    ui: { expanded, pinned: config.pinned, sound: config.sound, scale },
    server: serverState,
    plugin: pluginState,
  })
  let pushTimer = null
  const pushState = () => {
    if (pushTimer) return
    pushTimer = setTimeout(() => {
      pushTimer = null
      send('island:state', fullState())
    }, 8)
  }
  store.on('change', pushState)
  store.on('signal', (signal) => {
    send('island:signal', signal)
    if (signal.type === 'approval') {
      send('island:select', signal.sessionId)
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
  // unter der Insel Bilder zeigt (60 Hz am Laptop, bis 144 Hz am Monitor).
  // Der Renderer glättet die Bewegung zusätzlich in jedem Frame.
  let cursorEvery = 1000 / 60
  const measureRefresh = () => {
    if (!win || win.isDestroyed()) return
    const hz = screen.getDisplayMatching(win.getBounds()).displayFrequency
    cursorEvery = 1000 / Math.min(MAX_HZ, Math.max(30, Number.isFinite(hz) && hz > 0 ? hz : 60))
  }
  let last = { x: NaN, y: NaN }
  const sampleCursor = () => {
    if (!win || win.isDestroyed()) return
    const p = screen.getCursorScreenPoint()
    if (p.x !== last.x || p.y !== last.y) {
      last = p
      const b = win.getBounds()
      send('island:cursor', { x: p.x, y: p.y, wx: b.x, wy: b.y })
    }
    setTimeout(sampleCursor, cursorEvery)
  }
  win.once('ready-to-show', () => {
    measureRefresh()
    sampleCursor()
  })

  const place = () => {
    if (!win || win.isDestroyed()) return
    measureRefresh()
    const size = scaled(expanded ? PANEL : PILL, scale)
    // Ein nicht skalierbares Fenster nimmt neue Maße unter Windows nicht immer an.
    win.setResizable(true)
    win.setBounds({ ...size, ...topCenter(size) })
    win.setResizable(false)
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

  win.on('blur', () => {
    if (expanded && !config.pinned) send('island:blur')
  })

  function setScale(next) {
    scale = validScale(next)
    save({ scale })
    win.webContents.setZoomFactor(scale)
    place()
    pushState()
  }

  let pluginCheckedAt = 0
  const refreshPlugin = async () => {
    pluginCheckedAt = Date.now()
    const found = await checkPlugin()
    if (pluginState.busy) return
    pluginState = { ...pluginState, state: found.state }
    pushState()
  }
  refreshPlugin()

  async function enablePlugin() {
    if (pluginState.busy) return
    pluginState = { ...pluginState, busy: true, message: 'Aktiviere das Plugin …' }
    pushState()
    const result = await activatePlugin(config.pluginSource)
    let message
    if (result.ok) {
      message = result.changed
        ? 'Plugin aktiviert. Starte die Claude-App neu (oder tippe /reload-plugins in offenen Sitzungen).'
        : 'Plugin ist schon aktiv.'
    } else if (result.reason === 'no-cli') {
      message = 'claude-CLI nicht gefunden. In PowerShell installieren: irm https://claude.ai/install.ps1 | iex'
    } else {
      message = `Aktivieren fehlgeschlagen.${result.detail ? ` ${result.detail}` : ''}`
    }
    pluginState = { state: result.state.state, busy: false, message }
    pushState()
  }

  ipcMain.handle('island:get-state', () => fullState())
  ipcMain.on('island:activate-plugin', () => enablePlugin())
  ipcMain.on('island:expand', (_e, value) => setExpanded(Boolean(value)))
  ipcMain.on('island:pin', (_e, value) => {
    save({ pinned: Boolean(value) })
    pushState()
  })
  ipcMain.on('island:sound', (_e, value) => {
    save({ sound: Boolean(value) })
    pushState()
  })
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
    const login = app.getLoginItemSettings()
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
        label: pluginState.state === 'active' ? 'Plugin ist aktiv' : 'Plugin aktivieren',
        enabled: pluginState.state !== 'active' && !pluginState.busy,
        click: () => enablePlugin(),
      },
      { type: 'separator' },
      {
        label: 'Mit Windows starten',
        type: 'checkbox',
        checked: login.openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
      },
      { label: 'Beenden', click: () => app.quit() },
    ]).popup({ window: win })
  })

  // Wer das Plugin von Hand installiert, sieht den neuen Stand beim nächsten Klick.
  win.on('focus', () => {
    if (pluginState.state !== 'active' && !pluginState.busy && Date.now() - pluginCheckedAt > 10_000) refreshPlugin()
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

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload)
}
