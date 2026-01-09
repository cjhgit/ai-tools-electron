/**
 * 插件管理器
 * 
 * 负责加载、激活和管理所有插件
 * 为每个插件提供隔离的 IPC 作用域
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);

interface PluginManifest {
  id: string;
  name: string;
  description?: string;
  main?: string;
  preload?: string;
}

interface PluginModule {
  activate: (ctx: PluginContext) => void;
  deactivate?: () => void;
}

interface PluginContext {
  ipc: IpcScope;
  pluginDir: string;
}

interface IpcScope {
  handle: (channel: string, handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any) => void;
}

interface LoadedPlugin {
  manifest: PluginManifest;
  module: PluginModule;
  channels: string[];
}

export class PluginManager {
  private plugins: Map<string, LoadedPlugin> = new Map();

  /**
   * 加载指定目录下的所有插件
   * @param dir - 插件根目录
   */
  loadAll(dir: string): void {
    console.log('[PluginManager] Loading plugins from:', dir);
    
    if (!fs.existsSync(dir)) {
      console.warn('[PluginManager] Plugin directory does not exist:', dir);
      return;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginDir = path.join(dir, entry.name);
        try {
          this.load(pluginDir);
        } catch (error) {
          console.error(`[PluginManager] Failed to load plugin from ${pluginDir}:`, error);
        }
      }
    }
    
    console.log(`[PluginManager] Loaded ${this.plugins.size} plugins`);
  }

  /**
   * 加载单个插件
   * @param pluginDir - 插件目录路径
   */
  load(pluginDir: string): void {
    const manifestPath = path.join(pluginDir, 'manifest.json');
    
    // 读取 manifest.json
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`manifest.json not found in ${pluginDir}`);
    }
    
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest: PluginManifest = JSON.parse(manifestContent);
    
    // 检查是否有 main 入口
    if (!manifest.main) {
      console.log(`[PluginManager] Plugin ${manifest.id} has no main entry, skipping...`);
      return;
    }
    
    // 加载主模块
    const mainPath = path.join(pluginDir, manifest.main);
    if (!fs.existsSync(mainPath)) {
      throw new Error(`Main entry ${manifest.main} not found in ${pluginDir}`);
    }
    
    console.log(`[PluginManager] Loading plugin module from: ${mainPath}`);
    
    // 清除 require 缓存，允许热重载
    const resolvedPath = require.resolve(mainPath);
    delete require.cache[resolvedPath];
    
    let pluginModule: PluginModule;
    try {
      pluginModule = require(mainPath);
    } catch (error) {
      console.error(`[PluginManager] Failed to require plugin module:`, error);
      throw error;
    }
    
    if (!pluginModule || !pluginModule.activate) {
      throw new Error(`Plugin ${manifest.id} does not export an activate function`);
    }
    
    // 创建插件上下文
    const channels: string[] = [];
    const ipcScope = this.createIpcScope(manifest.id, channels);
    const context: PluginContext = {
      ipc: ipcScope,
      pluginDir
    };
    
    // 激活插件
    console.log(`[PluginManager] Activating plugin: ${manifest.id}`);
    try {
      pluginModule.activate(context);
    } catch (error) {
      console.error(`[PluginManager] Failed to activate plugin ${manifest.id}:`, error);
      throw error;
    }
    
    // 保存插件信息
    this.plugins.set(manifest.id, {
      manifest,
      module: pluginModule,
      channels
    });
    
    console.log(`[PluginManager] Plugin ${manifest.id} loaded successfully, registered ${channels.length} IPC handlers`);
  }

  /**
   * 卸载指定插件
   * @param pluginId - 插件 ID
   */
  unload(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      console.warn(`[PluginManager] Plugin ${pluginId} not found`);
      return;
    }
    
    console.log(`[PluginManager] Unloading plugin: ${pluginId}`);
    
    // 调用 deactivate
    if (plugin.module.deactivate) {
      try {
        plugin.module.deactivate();
      } catch (error) {
        console.error(`[PluginManager] Error deactivating plugin ${pluginId}:`, error);
      }
    }
    
    // 移除所有 IPC handlers
    for (const channel of plugin.channels) {
      ipcMain.removeHandler(channel);
    }
    
    this.plugins.delete(pluginId);
    console.log(`[PluginManager] Plugin ${pluginId} unloaded`);
  }

  /**
   * 卸载所有插件
   */
  unloadAll(): void {
    console.log('[PluginManager] Unloading all plugins...');
    for (const pluginId of Array.from(this.plugins.keys())) {
      this.unload(pluginId);
    }
  }

  /**
   * 为插件创建隔离的 IPC 作用域
   * @param pluginId - 插件 ID
   * @param channels - 用于记录注册的频道
   * @returns IPC 作用域对象
   */
  private createIpcScope(pluginId: string, channels: string[]): IpcScope {
    return {
      handle: (channel: string, handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any) => {
        const fullChannel = `plugin:${pluginId}:${channel}`;
        console.log(`[PluginManager] Registering IPC handler: ${fullChannel}`);
        
        ipcMain.handle(fullChannel, handler);
        channels.push(fullChannel);
      }
    };
  }

  /**
   * 获取已加载的插件列表
   * @returns 插件信息数组
   */
  getLoadedPlugins(): Array<{ id: string; name: string; description?: string }> {
    return Array.from(this.plugins.values()).map(plugin => ({
      id: plugin.manifest.id,
      name: plugin.manifest.name,
      description: plugin.manifest.description
    }));
  }
}
