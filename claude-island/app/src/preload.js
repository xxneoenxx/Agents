'use strict'

const { contextBridge, ipcRenderer } = require('electron')

const listen = (channel) => (fn) => {
  const handler = (_event, payload) => fn(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.off(channel, handler)
}

contextBridge.exposeInMainWorld('island', {
  getState: () => ipcRenderer.invoke('island:get-state'),
  onState: listen('island:state'),
  onCursor: listen('island:cursor'),
  onSignal: listen('island:signal'),
  onSelect: listen('island:select'),
  onBlur: listen('island:blur'),
  setExpanded: (value) => ipcRenderer.send('island:expand', value),
  setPinned: (value) => ipcRenderer.send('island:pin', value),
  setSound: (value) => ipcRenderer.send('island:sound', value),
  decide: (approvalId, behavior) => ipcRenderer.send('island:decide', approvalId, behavior),
  hint: (sessionId, text) => ipcRenderer.send('island:hint', sessionId, text),
  retry: (sessionId) => ipcRenderer.send('island:retry', sessionId),
  setDesired: (sessionId, desired) => ipcRenderer.send('island:desired', sessionId, desired),
  openMenu: () => ipcRenderer.send('island:menu'),
  activatePlugin: () => ipcRenderer.send('island:activate-plugin'),
  updatePlugin: () => ipcRenderer.send('island:update-plugin'),
  setFigureMode: (mode) => ipcRenderer.send('island:figure-mode', mode),
})
