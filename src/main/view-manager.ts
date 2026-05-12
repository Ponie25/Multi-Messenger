import { BrowserWindow, WebContentsView, session } from 'electron'
import path from 'path'
import { Pane } from './store'
import { SIDEBAR_WIDTH, ADDRESS_BAR_HEIGHT, TOOLBAR_HEIGHT, PANE_GAP } from '../shared/constants'
import { SplitNode } from '../shared/types'
import { calculateBounds, Rect } from '../shared/split-tree'

const CHROME_UA_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const CHROME_UA_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function getChromeUA(): string {
  return process.platform === 'win32' ? CHROME_UA_WIN : CHROME_UA_MAC
}

export class ViewManager {
  private win: BrowserWindow
  private paneViews: Map<string, Map<string, WebContentsView>> = new Map()
  private activeProfileId: string | null = null
  private activeSplitTree: SplitNode | null = null
  private onUrlChanged: ((profileId: string, paneId: string, url: string) => void) | null = null
  private onNavState: ((profileId: string, paneId: string, canGoBack: boolean, canGoForward: boolean) => void) | null = null
  private onNotification: ((profileId: string, paneId: string, title: string, body: string, icon?: string) => void) | null = null

  constructor(win: BrowserWindow) {
    this.win = win
  }

  setUrlChangedHandler(handler: (profileId: string, paneId: string, url: string) => void): void {
    this.onUrlChanged = handler
  }

  setNavStateHandler(handler: (profileId: string, paneId: string, canGoBack: boolean, canGoForward: boolean) => void): void {
    this.onNavState = handler
  }

  setNotificationHandler(handler: (profileId: string, paneId: string, title: string, body: string, icon?: string) => void): void {
    this.onNotification = handler
  }

  async createProfile(profile: { id: string; panes: Pane[] }): Promise<void> {
    const profileViews = new Map<string, WebContentsView>()
    this.paneViews.set(profile.id, profileViews)

    for (const pane of profile.panes) {
      const view = this.createPaneView(profile.id, pane)
      profileViews.set(pane.id, view)
    }
  }

  private createPaneView(profileId: string, pane: Pane): WebContentsView {
    const partition = `persist:profile-${profileId}`
    const profileSession = session.fromPartition(partition)
    profileSession.setUserAgent(getChromeUA())

    const preloadPath = path.join(__dirname, '../preload/pane.js')

    const view = new WebContentsView({
      webPreferences: {
        session: profileSession,
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    })

    this.win.contentView.addChildView(view)
    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    view.setBorderRadius(7)

    if (pane.url) {
      view.webContents.loadURL(pane.url)
    }

    // Track navigation events
    view.webContents.on('did-navigate', () => {
      this.emitNavEvents(profileId, pane.id, view)
    })
    view.webContents.on('did-navigate-in-page', () => {
      this.emitNavEvents(profileId, pane.id, view)
    })

    // Inject minimal scrollbar CSS into every page
    view.webContents.on('did-finish-load', () => {
      view.webContents.insertCSS(`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.25); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.45); }
        ::-webkit-scrollbar-corner { background: transparent; }
      `)
    })

    // Track loading state
    view.webContents.on('did-start-loading', () => {
      this.win.webContents.send('pane:loading', { profileId, paneId: pane.id, loading: true })
    })
    view.webContents.on('did-stop-loading', () => {
      this.win.webContents.send('pane:loading', { profileId, paneId: pane.id, loading: false })
    })

    // Handle window.open — load in same view
    view.webContents.setWindowOpenHandler(({ url }) => {
      view.webContents.loadURL(url)
      return { action: 'deny' }
    })

    // Listen for notification IPC from pane preload
    view.webContents.ipc.on('pane:notification', (_event, data: { title: string; body: string; icon?: string }) => {
      if (this.onNotification) {
        this.onNotification(profileId, pane.id, data.title, data.body, data.icon)
      }
    })

    return view
  }

  private emitNavEvents(profileId: string, paneId: string, view: WebContentsView): void {
    const url = view.webContents.getURL()
    if (this.onUrlChanged) {
      this.onUrlChanged(profileId, paneId, url)
    }
    if (this.onNavState) {
      this.onNavState(profileId, paneId, view.webContents.canGoBack(), view.webContents.canGoForward())
    }
  }

  private getRootRect(): Rect {
    const [windowWidth, windowHeight] = this.win.getContentSize()
    return {
      x: SIDEBAR_WIDTH,
      y: TOOLBAR_HEIGHT,
      width: windowWidth - SIDEBAR_WIDTH,
      height: windowHeight - TOOLBAR_HEIGHT,
    }
  }

  showProfile(profileId: string, splitTree?: SplitNode): void {
    // Hide current active profile views
    if (this.activeProfileId && this.activeProfileId !== profileId) {
      const currentViews = this.paneViews.get(this.activeProfileId)
      if (currentViews) {
        for (const view of currentViews.values()) {
          view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
        }
      }
    }

    this.activeProfileId = profileId
    if (splitTree) {
      this.activeSplitTree = splitTree
    }
    this.updateActiveBounds()
  }

  updateActiveBounds(): void {
    if (!this.activeProfileId || !this.activeSplitTree) return
    const views = this.paneViews.get(this.activeProfileId)
    if (!views || views.size === 0) return

    const rootRect = this.getRootRect()
    const bounds = calculateBounds(this.activeSplitTree, rootRect)

    for (const [paneId, rect] of bounds) {
      const view = views.get(paneId)
      if (view) {
        view.setBounds({
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.max(0, Math.round(rect.width)),
          height: Math.max(0, Math.round(rect.height)),
        })
      }
    }
  }

  updateBoundsFromTree(profileId: string, splitTree: SplitNode): void {
    if (this.activeProfileId === profileId) {
      this.activeSplitTree = splitTree
      this.updateActiveBounds()
    }
  }

  async addPane(profileId: string, pane: Pane, splitTree?: SplitNode): Promise<WebContentsView> {
    let profileViews = this.paneViews.get(profileId)
    if (!profileViews) {
      profileViews = new Map()
      this.paneViews.set(profileId, profileViews)
    }

    const view = this.createPaneView(profileId, pane)
    profileViews.set(pane.id, view)

    if (this.activeProfileId === profileId && splitTree) {
      this.activeSplitTree = splitTree
      this.updateActiveBounds()
    }

    return view
  }

  async removePane(profileId: string, paneId: string): Promise<void> {
    const profileViews = this.paneViews.get(profileId)
    if (!profileViews) return

    const view = profileViews.get(paneId)
    if (!view) return

    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    this.win.contentView.removeChildView(view)
    profileViews.delete(paneId)
  }

  hideAllViews(): void {
    if (!this.activeProfileId) return
    const views = this.paneViews.get(this.activeProfileId)
    if (!views) return
    for (const view of views.values()) {
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    }
  }

  showProfileViews(): void {
    this.updateActiveBounds()
  }

  navigatePane(profileId: string, paneId: string, url: string): void {
    const view = this.paneViews.get(profileId)?.get(paneId)
    if (!view) return
    view.webContents.loadURL(url)
  }

  goBack(profileId: string, paneId: string): void {
    const view = this.paneViews.get(profileId)?.get(paneId)
    if (view && view.webContents.canGoBack()) {
      view.webContents.goBack()
    }
  }

  goForward(profileId: string, paneId: string): void {
    const view = this.paneViews.get(profileId)?.get(paneId)
    if (view && view.webContents.canGoForward()) {
      view.webContents.goForward()
    }
  }

  reloadPane(profileId: string, paneId: string): void {
    const view = this.paneViews.get(profileId)?.get(paneId)
    if (view) {
      view.webContents.reload()
    }
  }

  async destroyProfile(profileId: string): Promise<void> {
    const profileViews = this.paneViews.get(profileId)
    if (!profileViews) return

    for (const view of profileViews.values()) {
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      this.win.contentView.removeChildView(view)
    }
    profileViews.clear()
    this.paneViews.delete(profileId)

    // Clear session data
    const partition = `persist:profile-${profileId}`
    const profileSession = session.fromPartition(partition)
    await profileSession.clearStorageData()
    await profileSession.clearCache()

    if (this.activeProfileId === profileId) {
      this.activeProfileId = null
      this.activeSplitTree = null
    }
  }

  getActiveProfileId(): string | null {
    return this.activeProfileId
  }

  getActivePaneView(): WebContentsView | undefined {
    if (!this.activeProfileId) return undefined
    const profileViews = this.paneViews.get(this.activeProfileId)
    if (!profileViews) return undefined
    return profileViews.values().next().value
  }
}
