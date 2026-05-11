export interface Pane {
  id: string
  url: string
}

export interface Profile {
  id: string
  name: string
  order: number
  panes: Pane[]
  activePaneId: string
}

export interface QuickText {
  id: string
  label: string
  text: string
  order: number
}

export interface ElectronAPI {
  // Profiles
  getProfiles(): Promise<Profile[]>
  addProfile(): Promise<Profile>
  switchProfile(profileId: string): Promise<{ success: boolean }>
  removeProfile(profileId: string): Promise<{ success: boolean; remaining?: Profile[] }>
  renameProfile(profileId: string, name: string): Promise<void>
  reorderProfiles(orderedIds: string[]): Promise<{ success: boolean }>
  showProfileContextMenu(profileId: string): Promise<{ action: string | null }>

  // Panes
  navigatePane(profileId: string, paneId: string, url: string): Promise<void>
  addPane(profileId: string): Promise<Pane | null>
  removePane(profileId: string, paneId: string): Promise<{ success: boolean }>
  setActivePane(profileId: string, paneId: string): Promise<void>
  goBack(profileId: string, paneId: string): Promise<void>
  goForward(profileId: string, paneId: string): Promise<void>

  // Sidebar
  resizeSidebar(data: { rightSidebarWidth: number }): void

  // Quick Text
  quickTextGetAll(): Promise<QuickText[]>
  quickTextAdd(label: string, text: string): Promise<QuickText>
  quickTextUpdate(id: string, data: Partial<{ label: string; text: string }>): Promise<void>
  quickTextRemove(id: string): Promise<void>
  quickTextInject(text: string): Promise<{ success: boolean; error?: string }>

  // Events
  onPaneUrlChanged(callback: (data: { profileId: string; paneId: string; url: string }) => void): () => void
  onPaneNavState(callback: (data: { profileId: string; paneId: string; canGoBack: boolean; canGoForward: boolean }) => void): () => void
  onProfileSwitch(callback: (profileId: string) => void): () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
