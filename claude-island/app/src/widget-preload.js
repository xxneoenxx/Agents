'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vault', {
  getState: () => ipcRenderer.invoke('vault:get-state'),
  onState: (fn) => {
    const handler = (_event, payload) => fn(payload)
    ipcRenderer.on('vault:state', handler)
    return () => ipcRenderer.off('vault:state', handler)
  },
  search: (query) => ipcRenderer.invoke('vault:search', query),
  open: (rel) => ipcRenderer.send('vault:open', rel),
  setWriteMode: (mode) => ipcRenderer.send('vault:write-mode', mode),
  select: (dir) => ipcRenderer.send('vault:select', dir),
  choose: () => ipcRenderer.send('vault:choose'),
  menu: () => ipcRenderer.send('vault:menu'),
  hide: () => ipcRenderer.send('vault:hide'),
})
