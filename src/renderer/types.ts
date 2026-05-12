export type { Pane, Tab, Profile, QuickText, SplitNode, SplitDirection, NotificationItem, MediaState } from '../shared/types'
import type { Pane, Tab, Profile, SplitDirection, MediaState } from '../shared/types'

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
  navigatePane(profileId: string, paneId: string, tabId: string, url: string): Promise<void>
  addPane(profileId: string, targetPaneId: string, direction: SplitDirection): Promise<Pane | null>
  removePane(profileId: string, paneId: string): Promise<{ success: boolean }>
  setActivePane(profileId: string, paneId: string): Promise<void>
  goBack(profileId: string, paneId: string, tabId: string): Promise<void>
  goForward(profileId: string, paneId: string, tabId: string): Promise<void>
  reloadPane(profileId: string, paneId: string, tabId: string): Promise<void>
  swapPanes(profileId: string, paneIdA: string, paneIdB: string): Promise<{ success: boolean }>
  updateSplitRatio(profileId: string, path: number[], ratio: number): Promise<void>

  // Tabs
  addTab(profileId: string, paneId: string): Promise<Tab | null>
  removeTab(profileId: string, paneId: string, tabId: string): Promise<{ success: boolean; removedPane: boolean }>
  setActiveTab(profileId: string, paneId: string, tabId: string): Promise<void>
  moveTab(profileId: string, fromPaneId: string, tabId: string, toPaneId: string): Promise<{ success: boolean; removedPane: boolean }>

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

  // Media
  getMediaState(): Promise<MediaState | null>
  onMediaState(callback: (state: MediaState | null) => void): () => void

  // Events
  onPaneUrlChanged(callback: (data: { profileId: string; paneId: string; tabId: string; url: string }) => void): () => void
  onPaneNavState(callback: (data: { profileId: string; paneId: string; tabId: string; canGoBack: boolean; canGoForward: boolean }) => void): () => void
  onPaneLoading(callback: (data: { profileId: string; paneId: string; tabId: string; loading: boolean }) => void): () => void
  onProfileSwitch(callback: (profileId: string) => void): () => void

  // Settings
  getSettings(): Promise<{ adblockEnabled: boolean; adblockFilterIds: string[] }>
  setAdblockEnabled(enabled: boolean): Promise<{ success: boolean; settings?: { adblockEnabled: boolean; adblockFilterIds: string[] } }>
  setAdblockFilterIds(filterIds: string[]): Promise<{ success: boolean; settings?: { adblockEnabled: boolean; adblockFilterIds: string[] } }>
  setAdblockSettings(enabled: boolean, filterIds: string[]): Promise<{ success: boolean; settings?: { adblockEnabled: boolean; adblockFilterIds: string[] } }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
