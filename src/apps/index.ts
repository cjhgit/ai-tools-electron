export interface AppInfo {
  id: string
  name: string
  description: string
  url: string
  icon: string
}

export const apps: AppInfo[] = [
  {
    id: 'hello-world',
    name: 'Hello World',
    description: '经典的 Hello World 应用',
    url: '/apps/hello-world/index.html',
    icon: '👋'
  },
  {
    id: 'base64-encode',
    name: 'Base64 编码',
    description: '将文本编码为 Base64 格式',
    url: '/apps/base64-encode/index.html',
    icon: '🔒'
  },
  {
    id: 'base64-decode',
    name: 'Base64 解码',
    description: '将 Base64 文本解码为原始文本',
    url: '/apps/base64-decode/index.html',
    icon: '🔓'
  }
]
