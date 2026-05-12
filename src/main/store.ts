import Store from 'electron-store'
import { MAX_PANES_PER_PROFILE } from '../shared/constants'
import { Profile, Pane, Tab, SplitNode, SplitDirection, QuickText } from '../shared/types'
import { splitLeaf, removeLeaf, swapLeaves, countLeaves, getAllLeafPaneIds } from '../shared/split-tree'

export type { Profile, Pane, Tab, QuickText }

export interface Settings {
  adblockEnabled: boolean
}

interface StoreSchema {
  profiles: Profile[]
  quickTexts: QuickText[]
  settings: Settings
}

// Legacy types for migration
interface LegacyAccount {
  id: string
  name: string
  order: number
}

const { randomUUID } = require('crypto') as { randomUUID: () => string }

export class ProfileStore {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: { profiles: [], quickTexts: [], settings: { adblockEnabled: true } },
    })
    this.migrate()
  }

  private migrate(): void {
    const raw = this.store.store as any

    // Migrate from old AccountStore format
    if (raw.accounts && Array.isArray(raw.accounts)) {
      const legacyAccounts: LegacyAccount[] = raw.accounts
      const profiles: Profile[] = legacyAccounts.map((acc) => {
        const paneId = `${acc.id}-pane-0`
        const tabId = randomUUID()
        return {
          id: acc.id,
          name: acc.name || `Profile ${acc.order + 1}`,
          order: acc.order,
          panes: [{ id: paneId, tabs: [{ id: tabId, url: '' }], activeTabId: tabId }],
          splitTree: { type: 'leaf', paneId } as SplitNode,
          activePaneId: paneId,
        }
      })
      this.store.clear()
      this.store.set('profiles', profiles)
      return
    }

    // Migrate profiles that have panes but no splitTree, or old pane format (url instead of tabs)
    const profiles = this.store.get('profiles')
    let needsSave = false
    for (const profile of profiles) {
      // Migrate old pane format: { id, url } → { id, tabs, activeTabId }
      for (let i = 0; i < profile.panes.length; i++) {
        const pane = profile.panes[i] as any
        if (!pane.tabs) {
          needsSave = true
          const tabId = randomUUID()
          profile.panes[i] = {
            id: pane.id,
            tabs: [{ id: tabId, url: pane.url || '' }],
            activeTabId: tabId,
          }
        }
      }

      if (!(profile as any).splitTree) {
        needsSave = true
        const panes = profile.panes
        if (panes.length === 0) {
          const paneId = `${profile.id}-pane-0`
          const tabId = randomUUID()
          profile.panes = [{ id: paneId, tabs: [{ id: tabId, url: '' }], activeTabId: tabId }]
          profile.activePaneId = paneId
          ;(profile as any).splitTree = { type: 'leaf', paneId }
        } else if (panes.length === 1) {
          ;(profile as any).splitTree = { type: 'leaf', paneId: panes[0].id }
        } else if (panes.length === 2) {
          ;(profile as any).splitTree = {
            type: 'branch',
            direction: 'horizontal',
            ratio: 0.5,
            children: [
              { type: 'leaf', paneId: panes[0].id },
              { type: 'leaf', paneId: panes[1].id },
            ],
          }
        } else if (panes.length >= 3) {
          ;(profile as any).splitTree = {
            type: 'branch',
            direction: 'horizontal',
            ratio: 0.33,
            children: [
              { type: 'leaf', paneId: panes[0].id },
              {
                type: 'branch',
                direction: 'horizontal',
                ratio: 0.5,
                children: [
                  { type: 'leaf', paneId: panes[1].id },
                  { type: 'leaf', paneId: panes[2].id },
                ],
              },
            ],
          }
        }
      }
    }
    if (needsSave) {
      this.store.set('profiles', profiles)
    }
  }

  getAll(): Profile[] {
    return [...this.store.get('profiles')].sort((a, b) => a.order - b.order)
  }

  add(profile: Profile): void {
    const profiles = this.store.get('profiles')
    profiles.push(profile)
    this.store.set('profiles', profiles)
  }

  update(id: string, changes: Partial<Omit<Profile, 'id'>>): void {
    const profiles = this.store.get('profiles')
    const idx = profiles.findIndex((p) => p.id === id)
    if (idx !== -1) {
      profiles[idx] = { ...profiles[idx], ...changes }
      this.store.set('profiles', profiles)
    }
  }

  remove(id: string): void {
    const profiles = this.store.get('profiles').filter((p) => p.id !== id)
    this.store.set('profiles', profiles)
  }

  reorder(orderedIds: string[]): void {
    const profiles = this.store.get('profiles')
    orderedIds.forEach((id, index) => {
      const profile = profiles.find((p) => p.id === id)
      if (profile) profile.order = index
    })
    this.store.set('profiles', profiles)
  }

  addPane(profileId: string, pane: Pane, targetPaneId: string, direction: SplitDirection): Pane | null {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return null
    if (countLeaves(profile.splitTree) >= MAX_PANES_PER_PROFILE) return null

    const newTree = splitLeaf(profile.splitTree, targetPaneId, pane.id, direction)
    if (!newTree) return null

    profile.panes.push(pane)
    profile.splitTree = newTree
    profile.activePaneId = pane.id
    this.store.set('profiles', profiles)
    return pane
  }

  removePane(profileId: string, paneId: string): void {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile || profile.panes.length <= 1) return

    const newTree = removeLeaf(profile.splitTree, paneId)
    if (!newTree) return

    profile.splitTree = newTree
    profile.panes = profile.panes.filter((p) => p.id !== paneId)
    if (profile.activePaneId === paneId) {
      profile.activePaneId = profile.panes[0].id
    }
    this.store.set('profiles', profiles)
  }

  updateSplitRatioByPath(profileId: string, path: number[], ratio: number): void {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return

    const updateAtPath = (node: SplitNode, remainingPath: number[]): SplitNode => {
      if (remainingPath.length === 0 && node.type === 'branch') {
        return { ...node, ratio }
      }
      if (node.type === 'leaf') return node
      const [next, ...rest] = remainingPath
      const children: [SplitNode, SplitNode] = [node.children[0], node.children[1]]
      children[next] = updateAtPath(children[next], rest)
      return { ...node, children }
    }

    profile.splitTree = updateAtPath(profile.splitTree, path)
    this.store.set('profiles', profiles)
  }

  swapPanes(profileId: string, paneIdA: string, paneIdB: string): boolean {
    if (paneIdA === paneIdB) return false
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return false

    profile.splitTree = swapLeaves(profile.splitTree, paneIdA, paneIdB)
    this.store.set('profiles', profiles)
    return true
  }

  getProfile(id: string): Profile | undefined {
    return this.store.get('profiles').find((p) => p.id === id)
  }

  // Tab methods
  addTab(profileId: string, paneId: string): Tab | null {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return null
    const pane = profile.panes.find((p) => p.id === paneId)
    if (!pane) return null

    const tab: Tab = { id: randomUUID(), url: '' }
    pane.tabs.push(tab)
    pane.activeTabId = tab.id
    this.store.set('profiles', profiles)
    return tab
  }

  removeTab(profileId: string, paneId: string, tabId: string): { removedPane: boolean } {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return { removedPane: false }
    const pane = profile.panes.find((p) => p.id === paneId)
    if (!pane) return { removedPane: false }

    if (pane.tabs.length <= 1) {
      // Last tab — remove the entire pane
      this.removePane(profileId, paneId)
      return { removedPane: true }
    }

    const idx = pane.tabs.findIndex((t) => t.id === tabId)
    if (idx === -1) return { removedPane: false }

    pane.tabs.splice(idx, 1)
    if (pane.activeTabId === tabId) {
      pane.activeTabId = pane.tabs[Math.min(idx, pane.tabs.length - 1)].id
    }
    this.store.set('profiles', profiles)
    return { removedPane: false }
  }

  setActiveTab(profileId: string, paneId: string, tabId: string): void {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return
    const pane = profile.panes.find((p) => p.id === paneId)
    if (!pane) return
    pane.activeTabId = tabId
    this.store.set('profiles', profiles)
  }

  moveTab(profileId: string, fromPaneId: string, tabId: string, toPaneId: string): { removedPane: boolean } {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return { removedPane: false }

    const fromPane = profile.panes.find((p) => p.id === fromPaneId)
    const toPane = profile.panes.find((p) => p.id === toPaneId)
    if (!fromPane || !toPane) return { removedPane: false }

    const tabIdx = fromPane.tabs.findIndex((t) => t.id === tabId)
    if (tabIdx === -1) return { removedPane: false }

    const [tab] = fromPane.tabs.splice(tabIdx, 1)
    toPane.tabs.push(tab)
    toPane.activeTabId = tab.id

    if (fromPane.tabs.length === 0) {
      this.store.set('profiles', profiles)
      this.removePane(profileId, fromPaneId)
      return { removedPane: true }
    }

    if (fromPane.activeTabId === tabId) {
      fromPane.activeTabId = fromPane.tabs[Math.min(tabIdx, fromPane.tabs.length - 1)].id
    }
    this.store.set('profiles', profiles)
    return { removedPane: false }
  }

  updateTab(profileId: string, paneId: string, tabId: string, changes: Partial<Omit<Tab, 'id'>>): void {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return
    const pane = profile.panes.find((p) => p.id === paneId)
    if (!pane) return
    const tab = pane.tabs.find((t) => t.id === tabId)
    if (tab) {
      Object.assign(tab, changes)
      this.store.set('profiles', profiles)
    }
  }

  // Quick Text methods
  getAllQuickTexts(): QuickText[] {
    return [...this.store.get('quickTexts')].sort((a, b) => a.order - b.order)
  }

  addQuickText(id: string, label: string, text: string): QuickText {
    const quickTexts = this.store.get('quickTexts')
    const newItem: QuickText = { id, label, text, order: quickTexts.length }
    quickTexts.push(newItem)
    this.store.set('quickTexts', quickTexts)
    return newItem
  }

  updateQuickText(id: string, data: Partial<{ label: string; text: string }>): void {
    const quickTexts = this.store.get('quickTexts')
    const idx = quickTexts.findIndex((q) => q.id === id)
    if (idx !== -1) {
      quickTexts[idx] = { ...quickTexts[idx], ...data }
      this.store.set('quickTexts', quickTexts)
    }
  }

  removeQuickText(id: string): void {
    const quickTexts = this.store.get('quickTexts').filter((q) => q.id !== id)
    this.store.set('quickTexts', quickTexts)
  }

  // Settings methods
  getSettings(): Settings {
    return this.store.get('settings')
  }

  updateSettings(changes: Partial<Settings>): void {
    const current = this.store.get('settings')
    this.store.set('settings', { ...current, ...changes })
  }
}