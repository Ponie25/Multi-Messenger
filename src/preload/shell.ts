import { contextBridge, ipcRenderer } from 'electron'

// shell.ts — preload for the main BrowserWindow (React renderer)
// Exposes safe IPC bridge to renderer process

contextBridge.exposeInMainWorld('electronAPI', {
  // Account management
  getAccounts: () => ipcRenderer.invoke('accounts:get'),
  addAccount: () => ipcRenderer.invoke('account:add'),
  switchAccount: (accountId: string) => ipcRenderer.invoke('account:switch', accountId),
  removeAccount: (accountId: string) => ipcRenderer.invoke('account:remove', accountId),
  toggleNotifications: (accountId: string, enabled: boolean) =>
    ipcRenderer.invoke('account:toggleNotifications', accountId, enabled),
  reorderAccounts: (orderedIds: string[]) => ipcRenderer.invoke('account:reorder', orderedIds),

  // Sidebar
  resizeSidebar: (data: { rightSidebarWidth: number }) => {
    ipcRenderer.send('sidebar:resize', data)
  },

  // Context menu (native)
  showAccountContextMenu: (accountId: string, notificationsEnabled: boolean) =>
    ipcRenderer.invoke('account:contextMenu', accountId, notificationsEnabled),

  // Quick Text
  quickTextGetAll: () => ipcRenderer.invoke('quicktext:getAll'),
  quickTextAdd: (label: string, text: string) => ipcRenderer.invoke('quicktext:add', label, text),
  quickTextUpdate: (id: string, data: Partial<{ label: string; text: string }>) =>
    ipcRenderer.invoke('quicktext:update', id, data),
  quickTextRemove: (id: string) => ipcRenderer.invoke('quicktext:remove', id),
  quickTextInject: (text: string) => ipcRenderer.invoke('quicktext:inject', text),

  // Event listeners
  onBadgeUpdate: (callback: (data: { accountId: string; count: number }) => void) => {
    ipcRenderer.on('badge:update', (_event, data) => callback(data))
  },
  onAccountInfoUpdated: (callback: (data: { accountId: string; name: string; avatarUrl: string }) => void) => {
    ipcRenderer.on('account:infoUpdated', (_event, data) => callback(data))
  },
  onAccountSwitch: (callback: (accountId: string) => void) => {
    ipcRenderer.on('account:switch', (_event, accountId) => callback(accountId))
  },

  // Cleanup
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  },
})
