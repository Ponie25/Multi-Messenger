import { ProfileStore, Profile, Pane } from '../store'
import type { SplitNode } from '../../shared/types'

let sharedData: { profiles: Profile[] } = { profiles: [] }

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(({ defaults }: { defaults: { profiles: Profile[] } }) => {
    if (sharedData.profiles.length === 0) {
      sharedData = { ...defaults }
    }
    return {
      store: sharedData,
      get: (key: string) => sharedData[key as keyof typeof sharedData],
      set: (key: string, value: unknown) => {
        ;(sharedData as any)[key] = value
      },
      clear: () => { sharedData = { profiles: [] } },
    }
  })
})

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  const paneId = `pane-${overrides.id || 'test'}`
  return {
    id: 'test-id',
    name: 'Test Profile',
    order: 0,
    panes: [{ id: paneId, url: '' }],
    splitTree: { type: 'leaf', paneId } as SplitNode,
    activePaneId: paneId,
    ...overrides,
  }
}

describe('ProfileStore', () => {
  let store: ProfileStore

  beforeEach(() => {
    sharedData = { profiles: [] }
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
      const pane: Pane = { id: 'new-pane', url: '' }
      const existingPaneId = store.getProfile('p1')!.panes[0].id
      const result = store.addPane('p1', pane, existingPaneId, 'horizontal')
      expect(result).toEqual(pane)
      const profile = store.getProfile('p1')!
      expect(profile.panes).toHaveLength(2)
      expect(profile.activePaneId).toBe('new-pane')
    })

    it('enforces max 4 panes', () => {
      const profile = makeProfile({ id: 'p1' })
      profile.panes = [
        { id: 'pane1', url: '' },
        { id: 'pane2', url: '' },
        { id: 'pane3', url: '' },
        { id: 'pane4', url: '' },
      ]
      profile.splitTree = {
        type: 'branch', direction: 'horizontal', ratio: 0.5,
        children: [
          { type: 'branch', direction: 'vertical', ratio: 0.5, children: [{ type: 'leaf', paneId: 'pane1' }, { type: 'leaf', paneId: 'pane2' }] },
          { type: 'branch', direction: 'vertical', ratio: 0.5, children: [{ type: 'leaf', paneId: 'pane3' }, { type: 'leaf', paneId: 'pane4' }] },
        ],
      }
      store.add(profile)
      const result = store.addPane('p1', { id: 'pane5', url: '' }, 'pane1', 'horizontal')
      expect(result).toBeNull()
    })
  })

  describe('removePane()', () => {
    it('removes a pane', () => {
      const profile = makeProfile({ id: 'p1' })
      profile.panes = [{ id: 'pane1', url: '' }, { id: 'pane2', url: '' }]
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

  describe('updatePane()', () => {
    it('updates pane url', () => {
      store.add(makeProfile({ id: 'p1' }))
      const paneId = store.getProfile('p1')!.panes[0].id
      store.updatePane('p1', paneId, { url: 'https://example.com' })
      expect(store.getProfile('p1')!.panes[0].url).toBe('https://example.com')
    })
  })
})
