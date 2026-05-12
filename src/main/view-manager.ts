import { BrowserWindow, WebContentsView, session } from 'electron'
import path from 'path'
import { Pane, Tab } from './store'
import { SIDEBAR_WIDTH, TOOLBAR_HEIGHT } from '../shared/constants'
import { SplitNode } from '../shared/types'
import { calculateBounds, getAllLeafPaneIds, Rect } from '../shared/split-tree'

const CHROME_UA_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const CHROME_UA_WIN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function getChromeUA(): string {
  return process.platform === 'win32' ? CHROME_UA_WIN : CHROME_UA_MAC
}

export class ViewManager {
  private win: BrowserWindow

  // profileId → (tabId → WebContentsView)
  private tabViews: Map<string, Map<string, WebContentsView>> = new Map()

  // paneId → active tabId
  private activeTabIds: Map<string, string> = new Map()

  // tabId → paneId
  private tabToPaneId: Map<string, string> = new Map()

  private activeProfileId: string | null = null
  private activeSplitTree: SplitNode | null = null

  private onUrlChanged:
    | ((profileId: string, paneId: string, tabId: string, url: string) => void)
    | null = null
  private onNavState:
    | ((profileId: string, paneId: string, tabId: string, canGoBack: boolean, canGoForward: boolean) => void)
    | null = null
  private onNotification:
    | ((profileId: string, paneId: string, title: string, body: string, icon?: string) => void)
    | null = null

  constructor(win: BrowserWindow) {
    this.win = win
  }

  setUrlChangedHandler(
    handler: (profileId: string, paneId: string, tabId: string, url: string) => void
  ): void {
    this.onUrlChanged = handler
  }

  setNavStateHandler(
    handler: (
      profileId: string,
      paneId: string,
      tabId: string,
      canGoBack: boolean,
      canGoForward: boolean
    ) => void
  ): void {
    this.onNavState = handler
  }

  setNotificationHandler(
    handler: (profileId: string, paneId: string, title: string, body: string, icon?: string) => void
  ): void {
    this.onNotification = handler
  }

  async createProfile(profile: { id: string; panes: Pane[] }): Promise<void> {
    const profileTabViews = new Map<string, WebContentsView>()
    this.tabViews.set(profile.id, profileTabViews)

    for (const pane of profile.panes) {
      // Track the active tab for this pane
      this.activeTabIds.set(pane.id, pane.activeTabId)

      for (const tab of pane.tabs) {
        const view = this.createTabView(profile.id, pane.id, tab)
        profileTabViews.set(tab.id, view)
        this.tabToPaneId.set(tab.id, pane.id)
      }
    }
  }

  private createTabView(profileId: string, paneId: string, tab: Tab): WebContentsView {
    const partition = `persist:profile-${profileId}`
    const profileSession = session.fromPartition(partition)
    profileSession.setUserAgent(getChromeUA())

    // Auto-grant notification permission so sites see "granted" immediately
    profileSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (permission === 'notifications') {
        callback(true)
      } else {
        callback(true)
      }
    })

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
    view.webContents.setMaxListeners(20)

    if (tab.url) {
      view.webContents.loadURL(tab.url).catch(() => {})
    }

    // Track navigation events
    view.webContents.on('did-navigate', () => {
      this.emitNavEvents(profileId, paneId, tab.id, view)
    })
    view.webContents.on('did-navigate-in-page', () => {
      this.emitNavEvents(profileId, paneId, tab.id, view)
    })

    // Inject notification override into the page's main world on dom-ready
    // (fires before page scripts, ensuring override is in place when sites check Notification.permission)
    const notificationScript = `
      (function() {
        if (window.__notificationIntercepted) return;
        window.__notificationIntercepted = true;

        function InterceptedNotification(title, options) {
          var opts = options || {};
          // Get favicon from the page
          var favicon = '';
          try {
            var links = document.querySelectorAll('link[rel*="icon"]');
            for (var i = 0; i < links.length; i++) {
              var l = links[i];
              if (l.href) { favicon = l.href; break; }
            }
            if (!favicon) {
              favicon = location.origin + '/favicon.ico';
            }
          } catch(e) {
            favicon = location.origin + '/favicon.ico';
          }
          var iconUrl = opts.icon || favicon;
          // Resolve relative URLs
          if (iconUrl && !iconUrl.startsWith('http') && !iconUrl.startsWith('data:')) {
            try { iconUrl = new URL(iconUrl, location.href).href; } catch(e) {}
          }
          window.postMessage({
            type: '__electron_notification__',
            title: title,
            body: opts.body || '',
            icon: iconUrl
          }, '*');
          this.title = title;
          this.body = opts.body || '';
          this.icon = opts.icon || '';
          this.onclick = null;
          this.onclose = null;
          this.onerror = null;
          this.onshow = null;
          this.close = function() {};
          this.addEventListener = function() {};
          this.removeEventListener = function() {};
          this.dispatchEvent = function() { return true; };
        }

        InterceptedNotification.requestPermission = function(callback) {
          var result = Promise.resolve('granted');
          if (callback) callback('granted');
          return result;
        };
        InterceptedNotification.maxActions = 2;

        Object.defineProperty(InterceptedNotification, 'permission', {
          get: function() { return 'granted'; },
          configurable: true
        });

        window.Notification = InterceptedNotification;

        if (navigator.serviceWorker && ServiceWorkerRegistration.prototype.showNotification) {
          ServiceWorkerRegistration.prototype.showNotification = function(title, options) {
            var opts = options || {};
            window.postMessage({
              type: '__electron_notification__',
              title: title,
              body: opts.body || '',
              icon: opts.icon || ''
            }, '*');
            return Promise.resolve();
          };
        }
      })();
    `

    view.webContents.on('dom-ready', () => {
      if (view.webContents.isDestroyed()) return
      view.webContents.executeJavaScript(notificationScript).catch(() => {})
    })

    // Inject element collapsing script — hides containers of blocked resources
    const collapseScript = `
      (function() {
        if (window.__collapseInjected) return;
        window.__collapseInjected = true;

        var COLLAPSE_STYLE = 'display:none!important;';

        function shouldCollapse(el) {
          if (!el || el === document.body || el === document.documentElement) return false;
          var tag = el.tagName;
          return tag === 'IMG' || tag === 'IFRAME' || tag === 'VIDEO' ||
                 tag === 'EMBED' || tag === 'OBJECT' || tag === 'SOURCE';
        }

        function collapseElement(el) {
          el.style.cssText = COLLAPSE_STYLE;
          // Collapse parent if it looks like an ad wrapper (small or single-child container)
          var parent = el.parentElement;
          if (!parent || parent === document.body) return;
          var rect = parent.getBoundingClientRect();
          var children = parent.children;
          var visibleChildren = 0;
          for (var i = 0; i < children.length; i++) {
            if (children[i].style.display !== 'none' && children[i].offsetHeight > 0) {
              visibleChildren++;
            }
          }
          if (visibleChildren === 0) {
            parent.style.cssText = COLLAPSE_STYLE;
          }
        }

        // Listen for error events on resource elements (blocked requests trigger error)
        document.addEventListener('error', function(e) {
          var el = e.target;
          if (shouldCollapse(el)) {
            collapseElement(el);
          }
        }, true);

        // Observe new elements and collapse empty iframes/imgs that fail to load
        var observer = new MutationObserver(function(mutations) {
          for (var i = 0; i < mutations.length; i++) {
            var nodes = mutations[i].addedNodes;
            for (var j = 0; j < nodes.length; j++) {
              var node = nodes[j];
              if (node.nodeType !== 1) continue;
              // Check iframes with ad-like src patterns
              if (node.tagName === 'IFRAME') {
                var src = node.src || '';
                if (src === 'about:blank' || !src) continue;
                node.addEventListener('error', function() { collapseElement(this); });
              }
            }
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
      })();
    `

    view.webContents.on('did-finish-load', () => {
      if (view.webContents.isDestroyed()) return
      view.webContents.executeJavaScript(collapseScript).catch(() => {})
    })

    // Inject minimal scrollbar CSS
    view.webContents.on('did-finish-load', () => {
      if (view.webContents.isDestroyed()) return
      view.webContents.insertCSS(`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.25); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(128,128,128,0.45); }
        ::-webkit-scrollbar-corner { background: transparent; }
      `).catch(() => {})
    })

    // Track loading state
    view.webContents.on('did-start-loading', () => {
      this.win.webContents.send('pane:loading', { profileId, paneId, tabId: tab.id, loading: true })
    })
    view.webContents.on('did-stop-loading', () => {
      this.win.webContents.send('pane:loading', { profileId, paneId, tabId: tab.id, loading: false })
    })

    // Handle window.open — load in same view
    view.webContents.setWindowOpenHandler(({ url }) => {
      view.webContents.loadURL(url).catch(() => {})
      return { action: 'deny' }
    })

    // Listen for notification IPC from pane preload
    view.webContents.ipc.on('pane:notification', (_event, data: { title: string; body: string; icon?: string }) => {
      if (this.onNotification) {
        this.onNotification(profileId, paneId, data.title, data.body, data.icon)
      }
    })

    return view
  }

  private emitNavEvents(
    profileId: string,
    paneId: string,
    tabId: string,
    view: WebContentsView
  ): void {
    const url = view.webContents.getURL()
    if (this.onUrlChanged) {
      this.onUrlChanged(profileId, paneId, tabId, url)
    }
    if (this.onNavState) {
      this.onNavState(
        profileId,
        paneId,
        tabId,
        view.webContents.navigationHistory.canGoBack(),
        view.webContents.navigationHistory.canGoForward()
      )
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
      const currentViews = this.tabViews.get(this.activeProfileId)
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
    const profileTabViews = this.tabViews.get(this.activeProfileId)
    if (!profileTabViews || profileTabViews.size === 0) return

    const rootRect = this.getRootRect()
    const bounds = calculateBounds(this.activeSplitTree, rootRect)

    // Collect all pane IDs in the active split tree
    const activePaneIds = new Set(getAllLeafPaneIds(this.activeSplitTree))

    // For each pane in the tree, position its active tab and hide all others
    for (const paneId of activePaneIds) {
      const rect = bounds.get(paneId)
      const activeTabId = this.activeTabIds.get(paneId)

      for (const [tabId, view] of profileTabViews) {
        if (this.tabToPaneId.get(tabId) !== paneId) continue

        if (rect && tabId === activeTabId) {
          view.setBounds({
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.max(0, Math.round(rect.width)),
            height: Math.max(0, Math.round(rect.height)),
          })
        } else {
          view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
        }
      }
    }

    // Hide views belonging to panes not in the active tree
    for (const [tabId, view] of profileTabViews) {
      const paneId = this.tabToPaneId.get(tabId)
      if (!paneId || !activePaneIds.has(paneId)) {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      }
    }
  }

  updateBoundsFromTree(profileId: string, splitTree: SplitNode): void {
    if (this.activeProfileId === profileId) {
      this.activeSplitTree = splitTree
      this.updateActiveBounds()
    }
  }

  async addPane(profileId: string, pane: Pane, splitTree?: SplitNode): Promise<WebContentsView | null> {
    let profileTabViews = this.tabViews.get(profileId)
    if (!profileTabViews) {
      profileTabViews = new Map()
      this.tabViews.set(profileId, profileTabViews)
    }

    this.activeTabIds.set(pane.id, pane.activeTabId)

    for (const tab of pane.tabs) {
      const view = this.createTabView(profileId, pane.id, tab)
      profileTabViews.set(tab.id, view)
      this.tabToPaneId.set(tab.id, pane.id)
    }

    if (this.activeProfileId === profileId && splitTree) {
      this.activeSplitTree = splitTree
      this.updateActiveBounds()
    }

    // Return the active tab's view for the new pane
    const activeView = profileTabViews.get(pane.activeTabId)
    return activeView ?? null
  }

  async removePane(profileId: string, paneId: string): Promise<void> {
    const profileTabViews = this.tabViews.get(profileId)
    if (!profileTabViews) return

    // Remove all tab views belonging to this pane
    for (const [tabId, view] of profileTabViews) {
      if (this.tabToPaneId.get(tabId) === paneId) {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
        this.win.contentView.removeChildView(view)
        profileTabViews.delete(tabId)
        this.tabToPaneId.delete(tabId)
      }
    }

    this.activeTabIds.delete(paneId)
  }

  addTab(profileId: string, paneId: string, tab: Tab): WebContentsView {
    let profileTabViews = this.tabViews.get(profileId)
    if (!profileTabViews) {
      profileTabViews = new Map()
      this.tabViews.set(profileId, profileTabViews)
    }

    const view = this.createTabView(profileId, paneId, tab)
    profileTabViews.set(tab.id, view)
    this.tabToPaneId.set(tab.id, paneId)

    return view
  }

  removeTab(profileId: string, paneId: string, tabId: string): void {
    const profileTabViews = this.tabViews.get(profileId)
    if (!profileTabViews) return

    const view = profileTabViews.get(tabId)
    if (!view) return

    view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    this.win.contentView.removeChildView(view)
    profileTabViews.delete(tabId)
    this.tabToPaneId.delete(tabId)

    // If this was the active tab, the caller is responsible for updating activeTabId
    // via setActiveTab before the next updateActiveBounds call
  }

  setActiveTab(profileId: string, paneId: string, tabId: string): void {
    this.activeTabIds.set(paneId, tabId)

    if (this.activeProfileId === profileId) {
      this.updateActiveBounds()
    }
  }

  moveTab(profileId: string, fromPaneId: string, tabId: string, toPaneId: string): void {
    // Update the pane ownership mapping
    this.tabToPaneId.set(tabId, toPaneId)

    // If this tab was the active tab in fromPaneId, the caller should update
    // activeTabId for fromPaneId via setActiveTab
    if (this.activeProfileId === profileId) {
      this.updateActiveBounds()
    }
  }

  hideAllViews(): void {
    if (!this.activeProfileId) return
    const profileTabViews = this.tabViews.get(this.activeProfileId)
    if (!profileTabViews) return
    for (const view of profileTabViews.values()) {
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
    }
  }

  showProfileViews(): void {
    this.updateActiveBounds()
  }

  navigateTab(profileId: string, paneId: string, tabId: string, url: string): void {
    const view = this.tabViews.get(profileId)?.get(tabId)
    if (!view) return
    view.webContents.loadURL(url).catch(() => {})
  }

  goBack(profileId: string, paneId: string, tabId: string): void {
    const view = this.tabViews.get(profileId)?.get(tabId)
    if (view && view.webContents.navigationHistory.canGoBack()) {
      view.webContents.goBack()
    }
  }

  goForward(profileId: string, paneId: string, tabId: string): void {
    const view = this.tabViews.get(profileId)?.get(tabId)
    if (view && view.webContents.navigationHistory.canGoForward()) {
      view.webContents.goForward()
    }
  }

  reloadTab(profileId: string, paneId: string, tabId: string): void {
    const view = this.tabViews.get(profileId)?.get(tabId)
    if (view) {
      view.webContents.reload()
    }
  }

  async destroyProfile(profileId: string): Promise<void> {
    const profileTabViews = this.tabViews.get(profileId)
    if (!profileTabViews) return

    for (const [tabId, view] of profileTabViews) {
      view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
      this.win.contentView.removeChildView(view)
      this.tabToPaneId.delete(tabId)
    }
    profileTabViews.clear()
    this.tabViews.delete(profileId)

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

  getActivePaneView(activePaneId?: string): WebContentsView | undefined {
    if (!this.activeProfileId) return undefined
    const profileTabViews = this.tabViews.get(this.activeProfileId)
    if (!profileTabViews) return undefined

    // If a specific pane is given, return its active tab's view
    if (activePaneId) {
      const activeTabId = this.activeTabIds.get(activePaneId)
      if (activeTabId) return profileTabViews.get(activeTabId)
    }

    // Fallback: return the first view found
    return profileTabViews.values().next().value
  }
}
