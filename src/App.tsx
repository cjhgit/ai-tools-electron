import { useState, useEffect, useRef } from 'react'
import { getApps, AppInfo } from './apps'
import './App.css'

function App() {
  const [apps, setApps] = useState<AppInfo[]>([])
  const [currentApp, setCurrentApp] = useState<AppInfo | null>(null)
  const [appsDirPath, setAppsDirPath] = useState<string>('')
  const [resolvedIconPaths, setResolvedIconPaths] = useState<Record<string, string>>({})
  const [webviewSrc, setWebviewSrc] = useState<string>('')
  const [preloadPath, setPreloadPath] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const webviewRef = useRef<HTMLElement>(null)

  // 监听 webview 事件
  useEffect(() => {
    const webview = webviewRef.current as any
    if (!webview) return

    const handleDidFinishLoad = async () => {
      console.log('[Webview] Page finished loading')
      
      // 检查 hostsAPI 是否被注入
      try {
        const result = await webview.executeJavaScript('typeof window.hostsAPI')
        console.log('[Webview] window.hostsAPI type:', result)
        
        if (result === 'undefined') {
          console.error('[Webview] hostsAPI was not injected by preload script!')
          console.log('[Webview] Preload path was:', preloadPath)
        } else {
          console.log('[Webview] hostsAPI successfully injected ✓')
        }
      } catch (error) {
        console.error('[Webview] Failed to check hostsAPI:', error)
      }
    }

    const handleConsoleMessage = (e: any) => {
      console.log(`[Webview Console] [${e.level}]`, e.message)
    }

    const handleDidFailLoad = (e: any) => {
      console.error('[Webview] Failed to load:', e)
    }

    webview.addEventListener('did-finish-load', handleDidFinishLoad)
    webview.addEventListener('console-message', handleConsoleMessage)
    webview.addEventListener('did-fail-load', handleDidFailLoad)

    return () => {
      webview.removeEventListener('did-finish-load', handleDidFinishLoad)
      webview.removeEventListener('console-message', handleConsoleMessage)
      webview.removeEventListener('did-fail-load', handleDidFailLoad)
    }
  }, [currentApp, preloadPath])

  const handleBackToHome = () => {
    setCurrentApp(null)
  }

  // 加载应用列表
  useEffect(() => {
    const loadApps = async () => {
      const loadedApps = await getApps()
      setApps(loadedApps)
      
      // 解析所有图标路径
      if (window.electronAPI?.resolveAppPath) {
        const iconPaths: Record<string, string> = {}
        for (const app of loadedApps) {
          if (app.isBuiltIn === false && app.userAppPath) {
            // 用户应用：读取图标为 base64
            if (window.electronAPI.readIconAsBase64) {
              const iconFullPath = `${app.userAppPath}/${app.icon}`
              const base64Icon = await window.electronAPI.readIconAsBase64(iconFullPath)
              if (base64Icon) {
                iconPaths[app.id] = base64Icon
              }
            }
          } else {
            // 内置应用：使用相对路径
            const iconPath = `/apps/${app.id}/${app.icon}`
            iconPaths[app.id] = await window.electronAPI.resolveAppPath(iconPath)
          }
        }
        setResolvedIconPaths(iconPaths)
      }
    }
    
    loadApps()
    
    // 获取 apps 目录路径
    if (window.electronAPI?.getAppsDirPath) {
      window.electronAPI.getAppsDirPath().then(setAppsDirPath)
    }
  }, [])

  useEffect(() => {
    const loadApp = async () => {
      if (currentApp) {
        console.log('[App] Loading app:', currentApp.name, 'ID:', currentApp.id)
        // 检查是否在 Electron 环境中
        if (window.electronAPI) {
          // 解析 preload 路径（如果有）
          if (currentApp.preload) {
            let preloadPathToResolve: string
            if (currentApp.isBuiltIn === false && currentApp.userAppPath) {
              // 用户应用的 preload（传递绝对路径）
              preloadPathToResolve = `${currentApp.userAppPath}/${currentApp.preload}`
            } else {
              // 内置应用的 preload
              preloadPathToResolve = `/apps/${currentApp.id}/${currentApp.preload}`
            }
            // 统一通过 resolvePreloadPath 处理，确保返回 file:// 格式
            const resolvedPreloadPath = await window.electronAPI.resolvePreloadPath(preloadPathToResolve)
            console.log('[App] Resolved preload path:', resolvedPreloadPath)
            setPreloadPath(resolvedPreloadPath)
          } else {
            console.log('[App] No preload script for this app')
            setPreloadPath('')
          }
          
          // 解析应用 URL
          const resolvedPath = await window.electronAPI.resolveAppPath(currentApp.url)
          console.log('[App] Resolved webview src:', resolvedPath)
          setWebviewSrc(resolvedPath)
        } else {
          // 浏览器环境直接使用相对路径
          setWebviewSrc(currentApp.url)
          setPreloadPath('')
        }
      }
    }
    
    loadApp()
  }, [currentApp])

  if (currentApp && webviewSrc) {
    const webviewProps: any = {
      ref: webviewRef,
      src: webviewSrc,
      className: "app-iframe"
    }
    
    // 如果有 preload 路径，添加到属性中
    if (preloadPath) {
      webviewProps.preload = preloadPath
      // 允许 preload 脚本访问 Node.js 模块
      webviewProps.webpreferences = "nodeIntegration=yes, contextIsolation=yes, sandbox=no"
      console.log('[App] Webview will use preload:', preloadPath)
    }
    
    console.log('[App] Rendering webview with props:', webviewProps)
    
    return (
      <div className='App app-page'>
        <div className="app-header">
          <button onClick={handleBackToHome} className="back-button">
            ← 返回首页
          </button>
          <h2>{currentApp.name}</h2>
        </div>
        <div className="app-iframe-container">
          <webview key={currentApp.id} {...webviewProps} />
        </div>
      </div>
    )
  }

  // 过滤应用
  const filteredApps = apps.filter((app) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      app.name.toLowerCase().includes(searchLower) ||
      app.description.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div className='App home'>
      <header className="main-header">
        <h1>🛠️ AI 工具箱</h1>
        <p className="subtitle">实用工具集合</p>
        
        {/* 搜索框 */}
        <div className="search-container" style={{ marginTop: '20px' }}>
          <input
            type="text"
            placeholder="搜索应用名称或描述..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '10px 16px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
            onBlur={(e) => e.target.style.borderColor = '#ddd'}
          />
        </div>
      </header>

      <div className="apps-grid">
        {filteredApps.length > 0 ? (
          filteredApps.map((app) => (
            <div
              key={app.id}
              className="app-card"
              onClick={() => setCurrentApp(app)}
            >
              <div className="app-icon">
                <img 
                  src={resolvedIconPaths[app.id] || `/apps/${app.id}/${app.icon}`} 
                  alt={app.name} 
                />
              </div>
              <h3>{app.name}</h3>
              <p>{app.description}</p>
            </div>
          ))
        ) : (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '40px 20px',
            color: '#999'
          }}>
            <p>未找到匹配的应用</p>
          </div>
        )}
      </div>

      {/* 应用目录路径放在底部 */}
      {appsDirPath && (
        <footer className="apps-dir-footer" style={{ 
          marginTop: 'auto',
          padding: '20px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#666',
          borderTop: '1px solid #eee'
        }}>
          应用目录: {appsDirPath}
        </footer>
      )}
    </div>
  )
}

export default App