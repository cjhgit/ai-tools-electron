/**
 * 插件 IPC Handlers 注册
 * 
 * 由于 ESM/CommonJS 互操作问题，我们直接在主进程中注册各个插件的 IPC handlers
 */

import { ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * 获取 hosts 文件路径
 */
function getHostsPath(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts');
  } else {
    return '/etc/hosts';
  }
}

/**
 * 注册所有插件的 IPC handlers
 */
export function registerPluginHandlers(): void {
  console.log('[Plugins] Registering plugin IPC handlers...');
  
  // ==================== Hosts 查看器插件 ====================
  ipcMain.handle('plugin:hosts-view:read-hosts', async () => {
    const hostsPath = getHostsPath();
    
    try {
      const content = await fs.readFile(hostsPath, 'utf-8');
      return {
        success: true,
        content,
        path: hostsPath
      };
    } catch (error) {
      console.error('[Plugin:hosts-view] Failed to read hosts file:', error);
      return {
        success: false,
        error: (error as Error).message,
        path: hostsPath
      };
    }
  });
  
  ipcMain.handle('plugin:hosts-view:get-hosts-path', async () => {
    return getHostsPath();
  });
  
  console.log('[Plugins] Registered IPC handler: plugin:hosts-view:read-hosts');
  console.log('[Plugins] Registered IPC handler: plugin:hosts-view:get-hosts-path');
  
  // 可以在这里继续注册其他插件的 handlers
  // ...
  
  console.log('[Plugins] All plugin IPC handlers registered');
}
