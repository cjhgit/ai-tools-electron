// Hosts 查看器的 preload 脚本
const { contextBridge, ipcRenderer } = require('electron');

// 暴露 hosts 相关 API 到渲染进程
contextBridge.exposeInMainWorld('hostsAPI', {
  // 读取 hosts 文件
  readHosts: () => ipcRenderer.invoke('read-hosts-file'),
  
  // 获取 hosts 文件路径
  getHostsPath: () => ipcRenderer.invoke('get-hosts-path')
});

