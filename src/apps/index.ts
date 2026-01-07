export interface AppInfo {
  id: string
  name: string
  description: string
  url: string
  icon: string
  preload?: string | null
  isBuiltIn?: boolean
  userAppPath?: string
}

// 默认应用列表（用于浏览器环境或作为后备）
const defaultApps: AppInfo[] = [
  {
    id: 'hello-world',
    name: 'Hello World',
    description: '经典的 Hello World 应用',
    url: '/apps/hello-world/index.html',
    icon: '👋'
  },
]

// 从文件系统动态加载应用列表
export async function getApps(): Promise<AppInfo[]> {
  // 检查是否在 Electron 环境中
  if (window.electronAPI?.getAppsList) {
    try {
      const apps = await window.electronAPI.getAppsList()
      return apps.length > 0 ? apps : defaultApps
    } catch (error) {
      console.error('Failed to load apps from file system:', error)
      return defaultApps
    }
  }
  
  // 浏览器环境或没有 electronAPI，返回默认列表
  return defaultApps
}
