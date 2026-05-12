import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Profiles
  getProfiles: () => ipcRenderer.invoke('profiles:get'),
  addProfile: () => ipcRenderer.invoke('profile:add'),
  switchProfile: (profileId: string) => ipcRenderer.invoke('profile:switch', profileId),
  removeProfile: (profileId: string) => ipcRenderer.invoke('profile:remove', profileId),
  renameProfile: (profileId: string, name: string) => ipcRenderer.invoke('profile:rename', profileId, name),
  reorderProfiles: (orderedIds: string[]) => ipcRenderer.invoke('profile:reorder', orderedIds),
  showProfileContextMenu: (profileId: string) => ipcRenderer.invoke('profile:contextMenu', profileId),

  // Panes
  navigatePane: (profileId: string, paneId: string, tabId: string, url: string) =>
    ipcRenderer.invoke('pane:navigate', profileId, paneId, tabId, url),
  addPane: (profileId: string, targetPaneId: string, direction: string) =>
    ipcRenderer.invoke('pane:add', profileId, targetPaneId, direction),
  removePane: (profileId: string, paneId: string) => ipcRenderer.invoke('pane:remove', profileId, paneId),
  setActivePane: (profileId: string, paneId: string) => ipcRenderer.invoke('pane:setActive', profileId, paneId),
  goBack: (profileId: string, paneId: string, tabId: string) => ipcRenderer.invoke('pane:goBack', profileId, paneId, tabId),
  goForward: (profileId: string, paneId: string, tabId: string) => ipcRenderer.invoke('pane:goForward', profileId, paneId, tabId),
  reloadPane: (profileId: string, paneId: string, tabId: string) => ipcRenderer.invoke('pane:reload', profileId, paneId, tabId),
  swapPanes: (profileId: string, paneIdA: string, paneIdB: string) =>
    ipcRenderer.invoke('pane:swap', profileId, paneIdA, paneIdB),
  updateSplitRatio: (profileId: string, path: number[], ratio: number) =>
    ipcRenderer.invoke('pane:updateRatio', profileId, path, ratio),

  // Tabs
  addTab: (profileId: string, paneId: string) => ipcRenderer.invoke('tab:add', profileId, paneId),
  removeTab: (profileId: string, paneId: string, tabId: string) => ipcRenderer.invoke('tab:remove', profileId, paneId, tabId),
  setActiveTab: (profileId: string, paneId: string, tabId: string) => ipcRenderer.invoke('tab:setActive', profileId, paneId, tabId),
  moveTab: (profileId: string, fromPaneId: string, tabId: string, toPaneId: string) =>
    ipcRenderer.invoke('tab:move', profileId, fromPaneId, tabId, toPaneId),

  // Window controls
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // View management
  hideAllViews: () => ipcRenderer.send('view:hideAll'),
  showProfileViews: (profileId: string) => ipcRenderer.send('view:showProfile', profileId),

  // Notifications
  onNotification: (callback: (data: { profileId: string; paneId: string; title: string; body: string; icon?: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('notification:received', handler)
    return () => ipcRenderer.removeListener('notification:received', handler)
  },

  // Events
  onPaneUrlChanged: (callback: (data: { profileId: string; paneId: string; tabId: string; url: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('pane:urlChanged', handler)
    return () => ipcRenderer.removeListener('pane:urlChanged', handler)
  },
  onPaneNavState: (callback: (data: { profileId: string; paneId: string; tabId: string; canGoBack: boolean; canGoForward: boolean }) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('pane:navState', handler)
    return () => ipcRenderer.removeListener('pane:navState', handler)
  },
  onPaneLoading: (callback: (data: { profileId: string; paneId: string; tabId: string; loading: boolean }) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('pane:loading', handler)
    return () => ipcRenderer.removeListener('pane:loading', handler)
  },
  onProfileSwitch: (callback: (profileId: string) => void) => {
    const handler = (_event: any, profileId: string) => callback(profileId)
    ipcRenderer.on('profile:switch', handler)
    return () => ipcRenderer.removeListener('profile:switch', handler)
  },
})
