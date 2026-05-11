import { AccountStore, Account } from '../store'

// Mock electron-store with shared persistent state (simulates file persistence)
let sharedData: { accounts: Account[] } = { accounts: [] }

jest.mock('electron-store', () => {
  return jest.fn().mockImplementation(({ defaults }: { defaults: { accounts: Account[] } }) => {
    // Initialize shared state with defaults only if empty
    if (sharedData.accounts.length === 0) {
      sharedData = { ...defaults }
    }
    return {
      get: (key: string) => sharedData[key as keyof typeof sharedData],
      set: (key: string, value: unknown) => {
        sharedData[key as keyof typeof sharedData] = value as Account[]
      },
    }
  })
})

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'test-id',
    name: 'Test Account',
    avatarUrl: '',
    notificationsEnabled: true,
    order: 0,
    ...overrides,
  }
}

describe('AccountStore', () => {
  let store: AccountStore

  beforeEach(() => {
    // Reset shared state before each test
    sharedData = { accounts: [] }
    store = new AccountStore()
  })

  describe('getAll()', () => {
    it('returns empty array when no accounts', () => {
      expect(store.getAll()).toEqual([])
    })

    it('returns accounts sorted by order', () => {
      store.add(makeAccount({ id: 'b', order: 1 }))
      store.add(makeAccount({ id: 'a', order: 0 }))
      const result = store.getAll()
      expect(result[0].id).toBe('a')
      expect(result[1].id).toBe('b')
    })
  })

  describe('add()', () => {
    it('adds an account', () => {
      const account = makeAccount({ id: 'acc1' })
      store.add(account)
      expect(store.getAll()).toHaveLength(1)
      expect(store.getAll()[0].id).toBe('acc1')
    })

    it('adds multiple accounts', () => {
      store.add(makeAccount({ id: 'acc1', order: 0 }))
      store.add(makeAccount({ id: 'acc2', order: 1 }))
      expect(store.getAll()).toHaveLength(2)
    })
  })

  describe('update()', () => {
    it('updates account fields', () => {
      store.add(makeAccount({ id: 'acc1', name: 'Old Name' }))
      store.update('acc1', { name: 'New Name', avatarUrl: 'https://example.com/avatar.jpg' })
      const accounts = store.getAll()
      expect(accounts[0].name).toBe('New Name')
      expect(accounts[0].avatarUrl).toBe('https://example.com/avatar.jpg')
    })

    it('does nothing for unknown id', () => {
      store.add(makeAccount({ id: 'acc1' }))
      store.update('unknown', { name: 'Changed' })
      expect(store.getAll()[0].name).toBe('Test Account')
    })

    it('toggles notificationsEnabled', () => {
      store.add(makeAccount({ id: 'acc1', notificationsEnabled: true }))
      store.update('acc1', { notificationsEnabled: false })
      expect(store.getAll()[0].notificationsEnabled).toBe(false)
    })
  })

  describe('remove()', () => {
    it('removes an account by id', () => {
      store.add(makeAccount({ id: 'acc1' }))
      store.add(makeAccount({ id: 'acc2', order: 1 }))
      store.remove('acc1')
      const accounts = store.getAll()
      expect(accounts).toHaveLength(1)
      expect(accounts[0].id).toBe('acc2')
    })

    it('does nothing for unknown id', () => {
      store.add(makeAccount({ id: 'acc1' }))
      store.remove('unknown')
      expect(store.getAll()).toHaveLength(1)
    })

    it('returns empty list after removing last account', () => {
      store.add(makeAccount({ id: 'acc1' }))
      store.remove('acc1')
      expect(store.getAll()).toEqual([])
    })
  })

  describe('reorder()', () => {
    it('reorders accounts by provided id array', () => {
      store.add(makeAccount({ id: 'acc1', order: 0 }))
      store.add(makeAccount({ id: 'acc2', order: 1 }))
      store.add(makeAccount({ id: 'acc3', order: 2 }))
      store.reorder(['acc3', 'acc1', 'acc2'])
      const accounts = store.getAll()
      expect(accounts[0].id).toBe('acc3')
      expect(accounts[1].id).toBe('acc1')
      expect(accounts[2].id).toBe('acc2')
    })

    it('persists new order — acc2 (originally order:1) gets order:0 after reorder', () => {
      store.add(makeAccount({ id: 'acc1', order: 0 }))
      store.add(makeAccount({ id: 'acc2', order: 1 }))
      store.reorder(['acc2', 'acc1'])
      const accounts = store.getAll()
      // acc2 was order:1, now should be order:0
      expect(accounts[0].id).toBe('acc2')
      expect(accounts[0].order).toBe(0)
      // acc1 was order:0, now should be order:1
      expect(accounts[1].id).toBe('acc1')
      expect(accounts[1].order).toBe(1)
    })

    it('ignores unknown ids in reorder input', () => {
      store.add(makeAccount({ id: 'acc1', order: 0 }))
      store.add(makeAccount({ id: 'acc2', order: 1 }))
      // 'unknown' is not in store — should not crash, acc1/acc2 unaffected
      store.reorder(['unknown', 'acc1'])
      const accounts = store.getAll()
      expect(accounts.find((a) => a.id === 'acc1')).toBeDefined()
      expect(accounts.find((a) => a.id === 'acc2')).toBeDefined()
    })
  })

  describe('persistence simulation', () => {
    it('restores accounts from store on construction (simulated via same mock instance)', () => {
      // Add accounts to first store instance
      store.add(makeAccount({ id: 'acc1', name: 'Alice', order: 0 }))
      store.add(makeAccount({ id: 'acc2', name: 'Bob', order: 1 }))
      // The mock shares state via module-level closure — a new instance reads same data
      const store2 = new AccountStore()
      const accounts = store2.getAll()
      expect(accounts).toHaveLength(2)
      expect(accounts[0].name).toBe('Alice')
      expect(accounts[1].name).toBe('Bob')
    })
  })

  describe('remove() — active account fallback', () => {
    it('after removing first account, remaining accounts are accessible in order', () => {
      store.add(makeAccount({ id: 'acc1', order: 0 }))
      store.add(makeAccount({ id: 'acc2', order: 1 }))
      store.add(makeAccount({ id: 'acc3', order: 2 }))
      store.remove('acc1')
      const remaining = store.getAll()
      expect(remaining).toHaveLength(2)
      expect(remaining[0].id).toBe('acc2')
    })
  })
})
