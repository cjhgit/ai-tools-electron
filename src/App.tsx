import { useState, useEffect, useRef } from 'react'
import { getApps, AppInfo } from './apps'
import './App.css'

function App() {
  const [apps, setApps] = useState<AppInfo[]>([])
  const [currentApp, setCurrentApp] = useState<AppInfo | null>(null)
  const [appsDirPath, setAppsDirPath] = useState<string>('')
  const [resolvedIconPaths, setResolvedIconPaths] = useState<Record<string, string>>({})
  const webviewRef = useRef<HTMLElement>(null)

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
      if (currentApp && webviewRef.current) {
        const webview = webviewRef.current as any
        
        // 检查是否在 Electron 环境中
        if (window.electronAPI) {
          const resolvedPath = await window.electronAPI.resolveAppPath(currentApp.url)
          webview.src = resolvedPath
        } else {
          // 浏览器环境直接使用相对路径
          webview.src = currentApp.url
        }
      }
    }
    
    loadApp()
  }, [currentApp])

  if (currentApp) {
    return (
      <div className='App app-page'>
        <div className="app-header">
          <button onClick={handleBackToHome} className="back-button">
            ← 返回首页
          </button>
          <h2>{currentApp.name}</h2>
        </div>
        <div className="app-iframe-container">
          <webview
            ref={webviewRef as any}
            className="app-iframe"
          />
        </div>
      </div>
    )
  }

  return (
    <div className='App home'>
      <header className="main-header">
        <h1>🛠️ AI 工具箱</h1>
        <p className="subtitle">实用工具集合</p>
        {appsDirPath && (
          <p className="apps-dir-path" style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
            应用目录: {appsDirPath}
          </p>
        )}
      </header>

      <div className="apps-grid">
        {apps.map((app) => (
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
        ))}
      </div>
    </div>
  )
}

export default App