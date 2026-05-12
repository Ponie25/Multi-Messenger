export interface Tab {
  id: string
  url: string
}

export interface Pane {
  id: string
  tabs: Tab[]
  activeTabId: string
}

export type SplitDirection = 'horizontal' | 'vertical'

export type SplitNode =
  | { type: 'leaf'; paneId: string }
  | { type: 'branch'; direction: SplitDirection; ratio: number; children: [SplitNode, SplitNode] }

export interface NotificationItem {
  id: string
  profileId: string
  paneId: string
  title: string
  body: string
  icon?: string
  timestamp: number
  read: boolean
}

export interface MediaState {
  profileId: string
  paneId: string
  tabId: string
  title: string
  artist?: string
  source: string
  url: string
  isPlaying: boolean
}

export interface Profile {
  id: string
  name: string
  order: number
  panes: Pane[]
  splitTree: SplitNode
  activePaneId: string
}

export interface QuickText {
  id: string
  label: string
  text: string
  order: number
}
