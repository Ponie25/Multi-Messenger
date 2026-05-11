import { BrowserWindow, WebContentsView, session } from 'electron'
import path from 'path'
import { Profile, Pane } from './store'
import { SIDEBAR_WIDTH, ADDRESS_BAR_HEIGHT } from '../shared/constants'

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
  private rightSidebarWidth: number = 36
  private onUrlChanged: ((profileId: string, paneId: string, url: string) => void) | null = null
  private onNavState: ((profileId: string, paneId: string, canGoBack: boolean, canGoForward: boolean) => void) | null = null

  constructor(win: BrowserWindow) {
    this.win = win
  }

  setRightSidebarWidth(width: number): void {
    this.rightSidebarWidth = width
    this.updateActiveBounds()
  }

  setUrlChangedHandler(handler: (profileId: string, paneId: string, url: string) => void): void {
    this.onUrlChanged = handler
  }

  setNavStateHandler(handler: (profileId: string, paneId: string, canGoBack: boolean, canGoForward: boolean) => void): void {
    this.onNavState = handler
  }

  async createProfile(profile: Profile): Promise<void> {
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

    // Handle window.open — load in same view
    view.webContents.setWindowOpenHandler(({ url }) => {
      view.webContents.loadURL(url)
      return { action: 'deny' }
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

  showProfile(profileId: string): void {
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
    this.updateActiveBounds()
  }

  updateActiveBounds(): void {
    if (!this.activeProfileId) return
    const views = this.paneViews.get(this.activeProfileId)
    if (!views || views.size === 0) return

    const [windowWidth, windowHeight] = this.win.getContentSize()
    const totalWidth = windowWidth - SIDEBAR_WIDTH - this.rightSidebarWidth
    const paneCount = views.size
    const paneWidth = Math.floor(totalWidth / paneCount)

    let index = 0
    for (const view of views.values()) {
      const isLast = index === paneCount - 1
      const width = isLast ? totalWidth - index * paneWidth : paneWidth
      view.setBounds({
        x: SIDEBAR_WIDTH + index * paneWidth,
        y: ADDRESS_BAR_HEIGHT,
        width: Math.max(0, width),
        height: Math.max(0, windowHeight - ADDRESS_BAR_HEIGHT),
      })
      index++
    }
  }

  async addPane(profileId: string, pane: Pane): Promise<WebContentsView> {
    let profileViews = this.paneViews.get(profileId)
    if (!profileViews) {
      profileViews = new Map()
      this.paneViews.set(profileId, profileViews)
    }

    const view = this.createPaneView(profileId, pane)
    profileViews.set(pane.id, view)

    if (this.activeProfileId === profileId) {
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

    if (this.activeProfileId === profileId) {
      this.updateActiveBounds()
    }
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
    }
  }

  getActiveProfileId(): string | null {
    return this.activeProfileId
  }

  getActivePaneView(): WebContentsView | undefined {
    if (!this.activeProfileId) return undefined
    const profileViews = this.paneViews.get(this.activeProfileId)
    if (!profileViews) return undefined
    // Return the first view (active pane concept is managed by store, here we just pick first)
    return profileViews.values().next().value
  }
}
