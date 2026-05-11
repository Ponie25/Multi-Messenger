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
  navigatePane: (profileId: string, paneId: string, url: string) =>
    ipcRenderer.invoke('pane:navigate', profileId, paneId, url),
  addPane: (profileId: string) => ipcRenderer.invoke('pane:add', profileId),
  removePane: (profileId: string, paneId: string) => ipcRenderer.invoke('pane:remove', profileId, paneId),
  setActivePane: (profileId: string, paneId: string) => ipcRenderer.invoke('pane:setActive', profileId, paneId),
  goBack: (profileId: string, paneId: string) => ipcRenderer.invoke('pane:goBack', profileId, paneId),
  goForward: (profileId: string, paneId: string) => ipcRenderer.invoke('pane:goForward', profileId, paneId),

  // Events
  onPaneUrlChanged: (callback: (data: { profileId: string; paneId: string; url: string }) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('pane:urlChanged', handler)
    return () => ipcRenderer.removeListener('pane:urlChanged', handler)
  },
  onPaneNavState: (callback: (data: { profileId: string; paneId: string; canGoBack: boolean; canGoForward: boolean }) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('pane:navState', handler)
    return () => ipcRenderer.removeListener('pane:navState', handler)
  },
  onProfileSwitch: (callback: (profileId: string) => void) => {
    const handler = (_event: any, profileId: string) => callback(profileId)
    ipcRenderer.on('profile:switch', handler)
    return () => ipcRenderer.removeListener('profile:switch', handler)
  },
})
