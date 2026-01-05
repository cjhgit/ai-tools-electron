import { useState } from 'react'
import { apps, AppInfo } from './apps'
import './App.css'

function App() {
  const [currentApp, setCurrentApp] = useState<AppInfo | null>(null)

  const handleBackToHome = () => {
    setCurrentApp(null)
  }

  if (currentApp) {
    return (
      <div className='App'>
        <div className="app-header">
          <button onClick={handleBackToHome} className="back-button">
            ← 返回首页
          </button>
          <h2>{currentApp.name}</h2>
        </div>
        <div className="app-iframe-container">
          <iframe
            src={currentApp.url}
            className="app-iframe"
            title={currentApp.name}
          />
        </div>
      </div>
    )
  }

  return (
    <div className='App'>
      <header className="main-header">
        <h1>🛠️ AI 工具箱</h1>
        <p className="subtitle">实用工具集合</p>
      </header>

      <div className="apps-grid">
        {apps.map((app) => (
          <div
            key={app.id}
            className="app-card"
            onClick={() => setCurrentApp(app)}
          >
            <div className="app-icon">{app.icon}</div>
            <h3>{app.name}</h3>
            <p>{app.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App