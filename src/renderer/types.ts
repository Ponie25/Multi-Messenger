export interface Account {
  id: string
  name: string
  avatarUrl: string
  notificationsEnabled: boolean
  order: number
}

export interface QuickText {
  id: string
  label: string
  text: string
  order: number
}

export interface ElectronAPI {
  // Account management
  getAccounts: () => Promise<Account[]>
  addAccount: () => Promise<Account>
  switchAccount: (accountId: string) => Promise<{ success: boolean }>
  removeAccount: (accountId: string) => Promise<{ success: boolean; remaining?: Account[] }>
  toggleNotifications: (accountId: string, enabled: boolean) => Promise<{ success: boolean }>
  reorderAccounts: (orderedIds: string[]) => Promise<{ success: boolean }>
  // Sidebar
  resizeSidebar: (data: { rightSidebarWidth: number }) => void
  // Context menu
  showAccountContextMenu: (accountId: string, notificationsEnabled: boolean) => Promise<{ action: 'remove' | 'toggleNotifications' | null }>
  // Quick Text
  quickTextGetAll: () => Promise<QuickText[]>
  quickTextAdd: (label: string, text: string) => Promise<QuickText>
  quickTextUpdate: (id: string, data: Partial<{ label: string; text: string }>) => Promise<void>
  quickTextRemove: (id: string) => Promise<void>
  quickTextInject: (text: string) => Promise<{ success: boolean; error?: string }>
  // Event listeners
  onBadgeUpdate: (callback: (data: { accountId: string; count: number }) => void) => void
  onAccountInfoUpdated: (callback: (data: { accountId: string; name: string; avatarUrl: string }) => void) => void
  onAccountSwitch: (callback: (accountId: string) => void) => void
  removeAllListeners: (channel: string) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
