'use strict'

const { app, BrowserWindow, Menu, ipcMain, screen, dialog } = require('electron')
const path = require('node:path')
const { loadConfig } = require('./config')
const { SessionStore } = require('./sessions')
const { createIslandServer } = require('./server')

const PILL = { width: 232, height: 48 }
const PANEL = { width: 720, height: 436 }
const TOP_GAP = 8
const CURSOR_MS = 33
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

function start() {
  const { config, save } = loadConfig(app.getPath('userData'))
  const store = new SessionStore({ modelIds: config.models })
  serverState.port = config.port

  win = new BrowserWindow({
    ...PILL,
    ...topCenter(PILL),
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
    },
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  win.once('ready-to-show', () => win.showInactive())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => event.preventDefault())

  // Zustand an das Fenster schicken, gebündelt auf höchstens einen Frame.
  let pushTimer = null
  const pushState = () => {
    if (pushTimer) return
    pushTimer = setTimeout(() => {
      pushTimer = null
      send('island:state', {
        ...store.snapshot(),
        ui: { expanded, pinned: config.pinned, sound: config.sound },
        server: serverState,
      })
    }, 16)
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

  // Pupillen: Mausposition auf dem ganzen Bildschirm, ca. 30x pro Sekunde.
  let last = { x: NaN, y: NaN }
  setInterval(() => {
    if (!win || win.isDestroyed()) return
    const p = screen.getCursorScreenPoint()
    if (p.x === last.x && p.y === last.y) return
    last = p
    send('island:cursor', { x: p.x, y: p.y })
  }, CURSOR_MS)

  const place = () => {
    if (!win || win.isDestroyed()) return
    const size = expanded ? PANEL : PILL
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

  ipcMain.handle('island:get-state', () => ({
    ...store.snapshot(),
    ui: { expanded, pinned: config.pinned, sound: config.sound },
    server: serverState,
  }))
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
        label: 'Mit Windows starten',
        type: 'checkbox',
        checked: login.openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
      },
      { label: 'Beenden', click: () => app.quit() },
    ]).popup({ window: win })
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
