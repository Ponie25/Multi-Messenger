import { BrowserWindow, WebContentsView, session } from 'electron'
import path from 'path'
import { Account } from './store'
import { setNotificationPermission } from './permissions'

const CHROME_UA_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const CHROME_UA_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function getChromeUA(): string {
  return process.platform === 'win32' ? CHROME_UA_WIN : CHROME_UA_MAC
}

export class ViewManager {
  private win: BrowserWindow
  private sidebarWidth: number
  private rightSidebarWidth: number = 36 // collapsed strip width
  private views: Map<string, WebContentsView> = new Map()
  private activeAccountId: string | null = null

  constructor(win: BrowserWindow, sidebarWidth: number) {
    this.win = win
    this.sidebarWidth = sidebarWidth
  }

  setRightSidebarWidth(width: number): void {
    this.rightSidebarWidth = width
    this.updateActiveBounds()
  }

  // Task 4.2 — createView
  async createView(account: Account): Promise<WebContentsView> {
    const partition = `persist:account-${account.id}`
    const accountSession = session.fromPartition(partition)

    // Set Chrome user agent on session level
    accountSession.setUserAgent(getChromeUA())

    // Set notification permission based on account setting
    setNotificationPermission(partition, account.notificationsEnabled)

    const preloadPath = path.join(__dirname, '../preload/webview.js')

    const view = new WebContentsView({
      webPreferences: {
        session: accountSession,
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        additionalArguments: [`--account-id=${account.id}`],
      },
    })

    // Inject account-info script after page loads (account-info.ts handles this via preload)

    this.win.contentView.addChildView(view)
    view.webContents.loadURL('https://www.facebook.com/messages')

    this.views.set(account.id, view)

    // Hide by default — showView will make it visible
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })

    return view
  }

  // Task 4.3 — showView
  showView(accountId: string): void {
    // Hide current active view
    if (this.activeAccountId && this.activeAccountId !== accountId) {
      const current = this.views.get(this.activeAccountId)
      if (current) {
        current.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      }
    }

    const view = this.views.get(accountId)
    if (!view) return

    this.activeAccountId = accountId
    this.updateActiveBounds()
  }

  // Called by resize listener in index.ts
  updateActiveBounds(): void {
    if (!this.activeAccountId) return
    const view = this.views.get(this.activeAccountId)
    if (!view) return

    const [width, height] = this.win.getContentSize()
    view.setBounds({
      x: this.sidebarWidth,
      y: 0,
      width: Math.max(0, width - this.sidebarWidth - this.rightSidebarWidth),
      height,
    })
  }

  // Task 4.4 — destroyView
  async destroyView(accountId: string): Promise<void> {
    const view = this.views.get(accountId)
    if (!view) return

    // Hide first
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    this.win.contentView.removeChildView(view)

    // Clear session data
    const partition = `persist:account-${accountId}`
    const accountSession = session.fromPartition(partition)
    await accountSession.clearStorageData()
    await accountSession.clearCache()

    this.views.delete(accountId)

    if (this.activeAccountId === accountId) {
      this.activeAccountId = null
    }
  }

  getActiveAccountId(): string | null {
    return this.activeAccountId
  }

  getView(accountId: string): WebContentsView | undefined {
    return this.views.get(accountId)
  }
}
