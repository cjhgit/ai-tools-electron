/**
 * Hosts 查看器插件 - 主进程入口
 * 
 * 在主进程中运行，处理需要文件系统访问权限的操作
 */

const fs = require('fs/promises');
const path = require('path');

/**
 * 获取 hosts 文件路径
 */
function getHostsPath() {
  if (process.platform === 'win32') {
    return path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts');
  } else {
    return '/etc/hosts';
  }
}

module.exports = {
  /**
   * 插件激活时调用
   * @param {Object} ctx - 插件上下文
   * @param {Object} ctx.ipc - IPC 作用域对象
   * @param {string} ctx.pluginDir - 插件目录路径
   */
  activate(ctx) {
    console.log('[Plugin:hosts-view] Activating plugin...');
    
    // 注册读取 hosts 文件的 IPC 处理器
    ctx.ipc.handle('read-hosts', async () => {
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
          error: error.message,
          path: hostsPath
        };
      }
    });
    
    // 注册获取 hosts 路径的 IPC 处理器
    ctx.ipc.handle('get-hosts-path', async () => {
      return getHostsPath();
    });
    
    console.log('[Plugin:hosts-view] Plugin activated successfully');
  },

  /**
   * 插件停用时调用
   * 用于清理资源、取消订阅等
   */
  deactivate() {
    console.log('[Plugin:hosts-view] Deactivating plugin...');
    // 清理工作：IPC handlers 会被 PluginManager 自动清理
  }
};
