import Store from 'electron-store'

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

interface StoreSchema {
  accounts: Account[]
  quickTexts: QuickText[]
}

export class AccountStore {
  private store: Store<StoreSchema>

  constructor() {
    this.store = new Store<StoreSchema>({
      defaults: { accounts: [], quickTexts: [] },
    })
  }

  getAll(): Account[] {
    return [...this.store.get('accounts')].sort((a, b) => a.order - b.order)
  }

  add(account: Account): void {
    const accounts = this.store.get('accounts')
    accounts.push(account)
    this.store.set('accounts', accounts)
  }

  update(id: string, changes: Partial<Omit<Account, 'id'>>): void {
    const accounts = this.store.get('accounts')
    const idx = accounts.findIndex((a) => a.id === id)
    if (idx !== -1) {
      accounts[idx] = { ...accounts[idx], ...changes }
      this.store.set('accounts', accounts)
    }
  }

  remove(id: string): void {
    const accounts = this.store.get('accounts').filter((a) => a.id !== id)
    this.store.set('accounts', accounts)
  }

  reorder(orderedIds: string[]): void {
    const accounts = this.store.get('accounts')
    orderedIds.forEach((id, index) => {
      const account = accounts.find((a) => a.id === id)
      if (account) account.order = index
    })
    this.store.set('accounts', accounts)
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
