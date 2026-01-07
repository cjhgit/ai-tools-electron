import { app, BrowserWindow, shell, ipcMain, screen } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { update } from './update'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '../..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
  // 获取主屏幕的工作区尺寸
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  
  win = new BrowserWindow({
    title: 'Main window',
    width: width,
    height: height,
    icon: path.join(process.env.VITE_PUBLIC, 'favicon.ico'),
    webPreferences: {
      preload,
      webviewTag: true, // 启用 webview 标签
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      // contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) { // #298
    win.loadURL(VITE_DEV_SERVER_URL)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  // Auto update
  update(win)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})

// Resolve app path for webview
ipcMain.handle('resolve-app-path', (_, url: string) => {
  // 如果已经是完整的 file:// 路径（用户应用），直接返回
  if (url.startsWith('file://')) {
    return url
  }
  
  if (VITE_DEV_SERVER_URL) {
    // 开发环境：使用 dev server URL
    return `${VITE_DEV_SERVER_URL}${url}`
  } else {
    // 生产环境：使用 file:// 协议
    const appPath = path.join(RENDERER_DIST, url)
    return `file://${appPath}`
  }
})

// Resolve preload script path for webview (must return file:// protocol path)
ipcMain.handle('resolve-preload-path', async (_, preloadPath: string) => {
  console.log('[Main] resolve-preload-path called with:', preloadPath)
  
  let absolutePath: string
  
  // 如果已经是完整的文件系统路径（用户应用），使用它
  if (path.isAbsolute(preloadPath) && !preloadPath.startsWith('/apps')) {
    console.log('[Main] Already absolute path:', preloadPath)
    absolutePath = preloadPath
  } else {
    // 内置应用的 preload 脚本路径
    // preloadPath 格式: /apps/hosts-view/preload.js
    // 移除开头的斜杠，避免 path.join 的问题
    const relativePath = preloadPath.startsWith('/') ? preloadPath.slice(1) : preloadPath
    const publicDir = process.env.VITE_PUBLIC!
    absolutePath = path.join(publicDir, relativePath)
    
    console.log('[Main] Public dir:', publicDir)
    console.log('[Main] Relative path:', relativePath)
  }
  
  console.log('[Main] Absolute path:', absolutePath)
  
  // 检查文件是否存在
  try {
    const fs = await import('node:fs/promises')
    await fs.access(absolutePath)
    console.log('[Main] Preload file exists ✓')
  } catch (error) {
    console.error('[Main] Preload file does not exist ✗')
  }
  
  // 转换为 file:// 协议 URL
  const fileUrl = `file://${absolutePath}`
  console.log('[Main] Final preload URL:', fileUrl)
  
  return fileUrl
})

// Read icon as base64 for user apps
ipcMain.handle('read-icon-as-base64', async (_, iconPath: string) => {
  try {
    const fs = await import('node:fs/promises')
    const buffer = await fs.readFile(iconPath)
    const base64 = buffer.toString('base64')
    
    // 检测文件类型
    let mimeType = 'image/png'
    if (iconPath.endsWith('.jpg') || iconPath.endsWith('.jpeg')) {
      mimeType = 'image/jpeg'
    } else if (iconPath.endsWith('.svg')) {
      mimeType = 'image/svg+xml'
    } else if (iconPath.endsWith('.gif')) {
      mimeType = 'image/gif'
    } else if (iconPath.endsWith('.webp')) {
      mimeType = 'image/webp'
    }
    
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error('Failed to read icon:', error)
    return null
  }
})

// Get apps directory path
ipcMain.handle('get-apps-dir-path', () => {
  const appsDir = path.join(process.env.VITE_PUBLIC!, 'apps')
  return appsDir
})

// Get apps list from public/apps directory and ~/.ai-tools/apps
ipcMain.handle('get-apps-list', async () => {
  const fs = await import('node:fs/promises')
  const builtInAppsDir = path.join(process.env.VITE_PUBLIC!, 'apps')
  const userAppsDir = path.join(os.homedir(), '.ai-tools', 'apps')
  
  const apps = []
  
  // 读取内置应用
  try {
    const entries = await fs.readdir(builtInAppsDir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(builtInAppsDir, entry.name, 'manifest.json')
        try {
          const manifestContent = await fs.readFile(manifestPath, 'utf-8')
          const manifest = JSON.parse(manifestContent)
          
          apps.push({
            id: manifest.id,
            name: manifest.name,
            description: manifest.description,
            url: `/apps/${entry.name}/index.html`,
            icon: manifest.icon,
            preload: manifest.preload || null,
            isBuiltIn: true
          })
        } catch (error) {
          console.error(`Failed to read manifest for ${entry.name}:`, error)
        }
      }
    }
  } catch (error) {
    console.error('Failed to read built-in apps directory:', error)
  }
  
  // 读取用户自定义应用
  try {
    const entries = await fs.readdir(userAppsDir, { withFileTypes: true })
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const manifestPath = path.join(userAppsDir, entry.name, 'manifest.json')
        try {
          const manifestContent = await fs.readFile(manifestPath, 'utf-8')
          const manifest = JSON.parse(manifestContent)
          
          apps.push({
            id: manifest.id,
            name: manifest.name,
            description: manifest.description,
            url: `file://${path.join(userAppsDir, entry.name, 'index.html')}`,
            icon: manifest.icon,
            preload: manifest.preload || null,
            isBuiltIn: false,
            userAppPath: path.join(userAppsDir, entry.name)
          })
        } catch (error) {
          console.error(`Failed to read manifest for user app ${entry.name}:`, error)
        }
      }
    }
  } catch (error) {
    // 用户目录可能不存在，这是正常的，不需要报错
    console.log('User apps directory does not exist or cannot be read:', (error as Error).message)
  }
  
  return apps
})

// 读取 hosts 文件
ipcMain.handle('read-hosts-file', async () => {
  const fs = await import('node:fs/promises')
  
  // 根据操作系统确定 hosts 文件路径
  let hostsPath: string
  if (process.platform === 'win32') {
    hostsPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
  } else {
    hostsPath = '/etc/hosts'
  }
  
  try {
    const content = await fs.readFile(hostsPath, 'utf-8')
    return {
      success: true,
      content,
      path: hostsPath
    }
  } catch (error) {
    console.error('Failed to read hosts file:', error)
    return {
      success: false,
      error: (error as Error).message,
      path: hostsPath
    }
  }
})

// 获取 hosts 文件路径
ipcMain.handle('get-hosts-path', () => {
  if (process.platform === 'win32') {
    return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
  } else {
    return '/etc/hosts'
  }
})
