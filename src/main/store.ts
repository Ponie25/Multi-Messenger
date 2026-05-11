import Store from 'electron-store'
import { MAX_PANES_PER_PROFILE } from '../shared/constants'

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

interface StoreSchema {
  profiles: Profile[]
  quickTexts: QuickText[]
}

// Legacy types for migration
interface LegacyAccount {
  id: string
  name: string
  order: number
}

export class ProfileStore {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: { profiles: [], quickTexts: [] },
    })
    this.migrate()
  }

  private migrate(): void {
    // Migrate from old AccountStore format
    const raw = this.store.store as any
    if (raw.accounts && Array.isArray(raw.accounts)) {
      const legacyAccounts: LegacyAccount[] = raw.accounts
      const profiles: Profile[] = legacyAccounts.map((acc) => ({
        id: acc.id,
        name: acc.name || `Profile ${acc.order + 1}`,
        order: acc.order,
        panes: [{ id: `${acc.id}-pane-0`, url: '' }],
        activePaneId: `${acc.id}-pane-0`,
      }))
      this.store.clear()
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

  addPane(profileId: string, pane: Pane): Pane | null {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile || profile.panes.length >= MAX_PANES_PER_PROFILE) return null
    profile.panes.push(pane)
    profile.activePaneId = pane.id
    this.store.set('profiles', profiles)
    return pane
  }

  removePane(profileId: string, paneId: string): void {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile || profile.panes.length <= 1) return
    profile.panes = profile.panes.filter((p) => p.id !== paneId)
    if (profile.activePaneId === paneId) {
      profile.activePaneId = profile.panes[0].id
    }
    this.store.set('profiles', profiles)
  }

  updatePane(profileId: string, paneId: string, changes: Partial<Omit<Pane, 'id'>>): void {
    const profiles = this.store.get('profiles')
    const profile = profiles.find((p) => p.id === profileId)
    if (!profile) return
    const pane = profile.panes.find((p) => p.id === paneId)
    if (pane) {
      Object.assign(pane, changes)
      this.store.set('profiles', profiles)
    }
  }

  getProfile(id: string): Profile | undefined {
    return this.store.get('profiles').find((p) => p.id === id)
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
}
