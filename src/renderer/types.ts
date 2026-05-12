export type { Pane, Profile, QuickText, SplitNode, SplitDirection, NotificationItem } from '../shared/types'
import type { Pane, Profile, SplitDirection } from '../shared/types'

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
  addPane(profileId: string, targetPaneId: string, direction: SplitDirection): Promise<Pane | null>
  removePane(profileId: string, paneId: string): Promise<{ success: boolean }>
  setActivePane(profileId: string, paneId: string): Promise<void>
  goBack(profileId: string, paneId: string): Promise<void>
  goForward(profileId: string, paneId: string): Promise<void>
  reloadPane(profileId: string, paneId: string): Promise<void>
  swapPanes(profileId: string, paneIdA: string, paneIdB: string): Promise<{ success: boolean }>
  updateSplitRatio(profileId: string, path: number[], ratio: number): Promise<void>

  // Window controls
  windowMinimize(): void
  windowMaximize(): void
  windowClose(): void
  windowIsMaximized(): Promise<boolean>

  // View management
  hideAllViews(): void
  showProfileViews(profileId: string): void

  // Notifications
  onNotification(callback: (data: { profileId: string; paneId: string; title: string; body: string; icon?: string }) => void): () => void

  // Events
  onPaneUrlChanged(callback: (data: { profileId: string; paneId: string; url: string }) => void): () => void
  onPaneNavState(callback: (data: { profileId: string; paneId: string; canGoBack: boolean; canGoForward: boolean }) => void): () => void
  onPaneLoading(callback: (data: { profileId: string; paneId: string; loading: boolean }) => void): () => void
  onProfileSwitch(callback: (profileId: string) => void): () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
