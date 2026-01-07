import { contextBridge, ipcRenderer } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

// --------- Expose app path resolver ---------
contextBridge.exposeInMainWorld('electronAPI', {
  resolveAppPath: (url: string) => ipcRenderer.invoke('resolve-app-path', url),
  resolvePreloadPath: (preloadPath: string) => ipcRenderer.invoke('resolve-preload-path', preloadPath),
  getAppsList: () => ipcRenderer.invoke('get-apps-list'),
  getAppsDirPath: () => ipcRenderer.invoke('get-apps-dir-path'),
  readIconAsBase64: (iconPath: string) => ipcRenderer.invoke('read-icon-as-base64', iconPath)
})
