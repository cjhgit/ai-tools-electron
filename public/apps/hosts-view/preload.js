/**
 * Hosts 查看器插件 - Preload 脚本
 * 
 * 通过 contextBridge 安全地暴露插件 API 到渲染进程
 */

const { contextBridge, ipcRenderer } = require('electron');

console.log('[Preload:hosts-view] Loading preload script...');

// 暴露 hostsApi 到渲染进程
contextBridge.exposeInMainWorld('hostsAPI', {
  /**
   * 读取 hosts 文件
   * @returns {Promise<{success: boolean, content?: string, error?: string, path: string}>}
   */
  readHosts: () => {
    return ipcRenderer.invoke('plugin:hosts-view:read-hosts');
  },
  
  /**
   * 获取 hosts 文件路径
   * @returns {Promise<string>}
   */
  getHostsPath: () => {
    return ipcRenderer.invoke('plugin:hosts-view:get-hosts-path');
  }
});

console.log('[Preload:hosts-view] hostsAPI exposed successfully');
