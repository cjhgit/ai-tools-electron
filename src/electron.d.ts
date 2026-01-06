import { AppInfo } from './apps'

export interface IElectronAPI {
  resolveAppPath: (url: string) => Promise<string>
  getAppsList: () => Promise<AppInfo[]>
  getAppsDirPath: () => Promise<string>
  readIconAsBase64: (iconPath: string) => Promise<string | null>
}

declare global {
  interface Window {
    electronAPI: IElectronAPI
    ipcRenderer: {
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void
      off: (channel: string, listener: (event: any, ...args: any[]) => void) => void
      send: (channel: string, ...args: any[]) => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

export {}


