import { ProfileStore, Profile, Pane } from '../store'
import type { SplitNode } from '../../shared/types'

let sharedData: { profiles: Profile[]; quickTexts: any[] } = { profiles: [], quickTexts: [] }

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(({ defaults }: { defaults: { profiles: Profile[]; quickTexts: any[] } }) => {
    if (sharedData.profiles.length === 0) {
      sharedData = { ...defaults }
    }
    return {
      store: sharedData,
      get: (key: string) => sharedData[key as keyof typeof sharedData],
      set: (key: string, value: unknown) => {
        ;(sharedData as any)[key] = value
      },
      clear: () => { sharedData = { profiles: [], quickTexts: [] } },
    }
  })
})

function makePane(id: string): Pane {
  const tabId = `${id}-tab-0`
  return { id, tabs: [{ id: tabId, url: '' }], activeTabId: tabId }
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  const paneId = `pane-${overrides.id || 'test'}`
  return {
    id: 'test-id',
    name: 'Test Profile',
    order: 0,
    panes: [makePane(paneId)],
    splitTree: { type: 'leaf', paneId } as SplitNode,
    activePaneId: paneId,
    ...overrides,
  }
}

describe('ProfileStore', () => {
  let store: ProfileStore

  beforeEach(() => {
    sharedData = { profiles: [], quickTexts: [] }
    store = new ProfileStore()
  })

  describe('getAll()', () => {
    it('returns empty array when no profiles', () => {
      expect(store.getAll()).toEqual([])
    })

    it('returns profiles sorted by order', () => {
      store.add(makeProfile({ id: 'b', order: 1 }))
      store.add(makeProfile({ id: 'a', order: 0 }))
      const result = store.getAll()
      expect(result[0].id).toBe('a')
      expect(result[1].id).toBe('b')
    })
  })

  describe('add() / remove()', () => {
    it('adds a profile', () => {
      store.add(makeProfile({ id: 'p1' }))
      expect(store.getAll()).toHaveLength(1)
    })

    it('removes a profile', () => {
      store.add(makeProfile({ id: 'p1' }))
      store.add(makeProfile({ id: 'p2', order: 1 }))
      store.remove('p1')
      expect(store.getAll()).toHaveLength(1)
      expect(store.getAll()[0].id).toBe('p2')
    })
  })

  describe('reorder()', () => {
    it('reorders profiles', () => {
      store.add(makeProfile({ id: 'p1', order: 0 }))
      store.add(makeProfile({ id: 'p2', order: 1 }))
      store.reorder(['p2', 'p1'])
      const profiles = store.getAll()
      expect(profiles[0].id).toBe('p2')
      expect(profiles[1].id).toBe('p1')
    })
  })

  describe('addPane()', () => {
    it('adds a pane to a profile', () => {
      store.add(makeProfile({ id: 'p1' }))
      const pane = makePane('new-pane')
      const existingPaneId = store.getProfile('p1')!.panes[0].id
      const result = store.addPane('p1', pane, existingPaneId, 'horizontal')
      expect(result).toEqual(pane)
      const profile = store.getProfile('p1')!
      expect(profile.panes).toHaveLength(2)
      expect(profile.activePaneId).toBe('new-pane')
    })

    it('enforces max 4 panes', () => {
      const profile = makeProfile({ id: 'p1' })
      profile.panes = [makePane('pane1'), makePane('pane2'), makePane('pane3'), makePane('pane4')]
      profile.splitTree = {
        type: 'branch', direction: 'horizontal', ratio: 0.5,
        children: [
          { type: 'branch', direction: 'vertical', ratio: 0.5, children: [{ type: 'leaf', paneId: 'pane1' }, { type: 'leaf', paneId: 'pane2' }] },
          { type: 'branch', direction: 'vertical', ratio: 0.5, children: [{ type: 'leaf', paneId: 'pane3' }, { type: 'leaf', paneId: 'pane4' }] },
        ],
      }
      store.add(profile)
      const result = store.addPane('p1', makePane('pane5'), 'pane1', 'horizontal')
      expect(result).toBeNull()
    })
  })

  describe('removePane()', () => {
    it('removes a pane', () => {
      const profile = makeProfile({ id: 'p1' })
      profile.panes = [makePane('pane1'), makePane('pane2')]
      profile.splitTree = {
        type: 'branch', direction: 'horizontal', ratio: 0.5,
        children: [{ type: 'leaf', paneId: 'pane1' }, { type: 'leaf', paneId: 'pane2' }],
      }
      profile.activePaneId = 'pane1'
      store.add(profile)
      store.removePane('p1', 'pane1')
      const updated = store.getProfile('p1')!
      expect(updated.panes).toHaveLength(1)
      expect(updated.activePaneId).toBe('pane2')
    })

    it('does not remove last pane', () => {
      store.add(makeProfile({ id: 'p1' }))
      const paneId = store.getProfile('p1')!.panes[0].id
      store.removePane('p1', paneId)
      expect(store.getProfile('p1')!.panes).toHaveLength(1)
    })
  })

  describe('updateTab()', () => {
    it('updates tab url', () => {
      store.add(makeProfile({ id: 'p1' }))
      const profile = store.getProfile('p1')!
      const paneId = profile.panes[0].id
      const tabId = profile.panes[0].tabs[0].id
      store.updateTab('p1', paneId, tabId, { url: 'https://example.com' })
      expect(store.getProfile('p1')!.panes[0].tabs[0].url).toBe('https://example.com')
    })
  })

  describe('addTab() / removeTab()', () => {
    it('adds a tab to a pane', () => {
      store.add(makeProfile({ id: 'p1' }))
      const paneId = store.getProfile('p1')!.panes[0].id
      const tab = store.addTab('p1', paneId)
      expect(tab).not.toBeNull()
      expect(store.getProfile('p1')!.panes[0].tabs).toHaveLength(2)
      expect(store.getProfile('p1')!.panes[0].activeTabId).toBe(tab!.id)
    })

    it('removes a tab (keeps pane if not last)', () => {
      store.add(makeProfile({ id: 'p1' }))
      const paneId = store.getProfile('p1')!.panes[0].id
      store.addTab('p1', paneId)
      const tabs = store.getProfile('p1')!.panes[0].tabs
      expect(tabs).toHaveLength(2)
      const result = store.removeTab('p1', paneId, tabs[0].id)
      expect(result.removedPane).toBe(false)
      expect(store.getProfile('p1')!.panes[0].tabs).toHaveLength(1)
    })
  })
})
